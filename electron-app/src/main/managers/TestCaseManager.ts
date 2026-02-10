import { promises as fs } from 'fs'
import * as path from 'path'
import { TestCase, TestExecution, DeviceMetadata } from '../types/models'
import { SuiteManager } from './SuiteManager'

export class TestCaseManager {
  private testCasesDir: string
  private suiteManager: SuiteManager

  constructor(userDataPath: string, suiteManager: SuiteManager) {
    this.testCasesDir = path.join(userDataPath, 'test-data', 'test-cases')
    this.suiteManager = suiteManager
  }

  async initialize(): Promise<void> {
    console.log('[TestCaseManager] Initializing...')

    // Create test-cases directory if it doesn't exist
    try {
      await fs.mkdir(this.testCasesDir, { recursive: true })
      console.log(`[TestCaseManager] Test cases directory ready: ${this.testCasesDir}`)
    } catch (error) {
      console.error('[TestCaseManager] Failed to create test-cases directory:', error)
      throw error
    }
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async createTestCase(
    suiteId: string,
    testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TestCase> {
    // Verify suite exists
    const suite = await this.suiteManager.getSuite(suiteId)
    if (!suite) {
      throw new Error(`Suite not found: ${suiteId}`)
    }

    // Ensure suite directory exists
    await this.ensureSuiteDirectory(suiteId)

    // Generate sequential test ID
    const testId = await this.generateTestId(suiteId)

    const now = new Date().toISOString()
    const newTestCase: TestCase = {
      ...testCase,
      id: testId,
      suiteId,
      executionHistory: testCase.executionHistory || [],
      tags: testCase.tags || [],
      version: testCase.version || '1.0',
      createdAt: now,
      updatedAt: now
    }

    // Save to file
    await this.saveTestCaseToFile(suiteId, newTestCase)

    // Add to suite
    await this.suiteManager.addTestToSuite(suiteId, testId)

    console.log(`[TestCaseManager] Created test case: ${testId} in suite ${suiteId}`)
    return newTestCase
  }

  async getTestCase(suiteId: string, testId: string): Promise<TestCase | null> {
    try {
      const filePath = this.getTestPath(suiteId, testId)
      const content = await fs.readFile(filePath, 'utf-8')
      const testCase: TestCase = JSON.parse(content)
      return testCase
    } catch (error) {
      console.warn(`[TestCaseManager] Failed to load test ${testId} from suite ${suiteId}:`, error)
      return null
    }
  }

  async listTestCases(suiteId: string): Promise<TestCase[]> {
    try {
      const suiteDir = path.join(this.testCasesDir, suiteId)

      // Check if suite directory exists
      try {
        await fs.access(suiteDir)
      } catch {
        return [] // Suite directory doesn't exist yet
      }

      const files = await fs.readdir(suiteDir)
      const testFiles = files.filter(f => f.endsWith('.json'))

      const tests: TestCase[] = []
      for (const file of testFiles) {
        try {
          const filePath = path.join(suiteDir, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const testCase: TestCase = JSON.parse(content)
          tests.push(testCase)
        } catch (error) {
          console.warn(`[TestCaseManager] Failed to load test from ${file}:`, error)
        }
      }

      // Get suite to check for custom ordering
      const suite = await this.suiteManager.getSuite(suiteId)

      if (suite && suite.testCaseIds && suite.testCaseIds.length > 0) {
        // Sort by custom order from suite.testCaseIds
        const orderMap = new Map(suite.testCaseIds.map((id, index) => [id, index]))
        tests.sort((a, b) => {
          const orderA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER
          const orderB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER
          return orderA - orderB
        })
        console.log(`[TestCaseManager] Loaded ${tests.length} tests in custom order for suite ${suiteId}`)
      } else {
        // Fallback: Sort by ID (test_001, test_002, etc.)
        tests.sort((a, b) => a.id.localeCompare(b.id))
        console.log(`[TestCaseManager] Loaded ${tests.length} tests in default order for suite ${suiteId}`)
      }

      return tests
    } catch (error) {
      console.error(`[TestCaseManager] Failed to list tests for suite ${suiteId}:`, error)
      return []
    }
  }

  /**
   * Get all test cases across all suites
   */
  async getAllTestCases(): Promise<TestCase[]> {
    try {
      const suites = await this.suiteManager.listSuites()
      const allTests: TestCase[] = []

      for (const suite of suites) {
        const tests = await this.listTestCases(suite.id)
        allTests.push(...tests)
      }

      console.log(`[TestCaseManager] Loaded ${allTests.length} tests across ${suites.length} suites`)
      return allTests
    } catch (error) {
      console.error('[TestCaseManager] Failed to get all test cases:', error)
      return []
    }
  }

  async updateTestCase(
    suiteId: string,
    testId: string,
    updates: Partial<TestCase>
  ): Promise<TestCase> {
    const existingTest = await this.getTestCase(suiteId, testId)
    if (!existingTest) {
      throw new Error(`Test case not found: ${testId} in suite ${suiteId}`)
    }

    const updatedTest: TestCase = {
      ...existingTest,
      ...updates,
      id: existingTest.id, // ID cannot be changed
      suiteId: existingTest.suiteId, // Suite ID cannot be changed via update
      createdAt: existingTest.createdAt, // Created date cannot be changed
      updatedAt: new Date().toISOString()
    }

    await this.saveTestCaseToFile(suiteId, updatedTest)

    console.log(`[TestCaseManager] Updated test case: ${testId} in suite ${suiteId}`)
    return updatedTest
  }

  async deleteTestCase(suiteId: string, testId: string): Promise<boolean> {
    try {
      // Delete file
      const filePath = this.getTestPath(suiteId, testId)
      await fs.unlink(filePath)

      // Remove from suite
      await this.suiteManager.removeTestFromSuite(suiteId, testId)

      console.log(`[TestCaseManager] Deleted test case: ${testId} from suite ${suiteId}`)
      return true
    } catch (error) {
      console.error(`[TestCaseManager] Failed to delete test ${testId}:`, error)
      return false
    }
  }

  // ============================================================================
  // Suite Operations
  // ============================================================================

  async getTestsForSuite(suiteId: string): Promise<TestCase[]> {
    return this.listTestCases(suiteId)
  }

  async moveTestToSuite(testId: string, fromSuiteId: string, toSuiteId: string): Promise<void> {
    // Load existing test
    const testCase = await this.getTestCase(fromSuiteId, testId)
    if (!testCase) {
      throw new Error(`Test case not found: ${testId} in suite ${fromSuiteId}`)
    }

    // Ensure destination suite exists
    const destSuite = await this.suiteManager.getSuite(toSuiteId)
    if (!destSuite) {
      throw new Error(`Destination suite not found: ${toSuiteId}`)
    }

    // Check if test ID already exists in destination suite
    const destTestPath = this.getTestPath(toSuiteId, testId)
    let finalTestId = testId
    let testExists = false

    try {
      await fs.access(destTestPath)
      testExists = true
    } catch {
      testExists = false
    }

    // Only generate new ID if there's a conflict
    if (testExists) {
      finalTestId = await this.generateTestId(toSuiteId)
      console.log(`[TestCaseManager] Test ID ${testId} already exists in destination, using ${finalTestId}`)
    }

    // Update test with final ID and suite
    const movedTest: TestCase = {
      ...testCase,
      id: finalTestId,
      suiteId: toSuiteId,
      updatedAt: new Date().toISOString()
    }

    // Ensure destination suite directory exists
    await this.ensureSuiteDirectory(toSuiteId)

    // Save to new location
    await this.saveTestCaseToFile(toSuiteId, movedTest)

    // Delete from old location
    const oldFilePath = this.getTestPath(fromSuiteId, testId)
    await fs.unlink(oldFilePath)

    // Update suites (remove from source, add to destination)
    await this.suiteManager.removeTestFromSuite(fromSuiteId, testId)
    await this.suiteManager.addTestToSuite(toSuiteId, finalTestId)

    console.log(`[TestCaseManager] Moved test ${testId} from suite ${fromSuiteId} to ${toSuiteId} as ${finalTestId}`)
  }

  async duplicateTestCases(fromSuiteId: string, toSuiteId: string): Promise<string[]> {
    // Get all test cases from source suite
    const testCases = await this.listTestCases(fromSuiteId)

    // Ensure destination suite exists
    const destSuite = await this.suiteManager.getSuite(toSuiteId)
    if (!destSuite) {
      throw new Error(`Destination suite not found: ${toSuiteId}`)
    }

    // Ensure destination suite directory exists
    await this.ensureSuiteDirectory(toSuiteId)

    const newTestIds: string[] = []

    // Duplicate each test case
    for (const testCase of testCases) {
      // Generate new ID in destination suite
      const newTestId = await this.generateTestId(toSuiteId)

      // Create copy with new ID and suite
      const copiedTest: TestCase = {
        ...testCase,
        id: newTestId,
        suiteId: toSuiteId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        executionHistory: [] // Don't copy execution history
      }

      // Save to new location
      await this.saveTestCaseToFile(toSuiteId, copiedTest)

      // Add to suite's test case list
      await this.suiteManager.addTestToSuite(toSuiteId, newTestId)

      newTestIds.push(newTestId)

      console.log(`[TestCaseManager] Duplicated test ${testCase.id} to ${newTestId} in suite ${toSuiteId}`)
    }

    console.log(`[TestCaseManager] Duplicated ${newTestIds.length} test cases from suite ${fromSuiteId} to ${toSuiteId}`)
    return newTestIds
  }

  // ============================================================================
  // Execution History
  // ============================================================================

  async addExecutionResult(
    suiteId: string,
    testId: string,
    execution: TestExecution
  ): Promise<void> {
    const testCase = await this.getTestCase(suiteId, testId)
    if (!testCase) {
      throw new Error(`Test case not found: ${testId} in suite ${suiteId}`)
    }

    // Add execution to history
    testCase.executionHistory.push(execution)

    // Limit history to last 100 executions (configurable)
    const MAX_HISTORY = 100
    if (testCase.executionHistory.length > MAX_HISTORY) {
      testCase.executionHistory = testCase.executionHistory.slice(-MAX_HISTORY)
    }

    await this.saveTestCaseToFile(suiteId, testCase)

    console.log(`[TestCaseManager] Added execution result to test ${testId}`)
  }

  async getExecutionHistory(
    suiteId: string,
    testId: string,
    limit?: number
  ): Promise<TestExecution[]> {
    const testCase = await this.getTestCase(suiteId, testId)
    if (!testCase) {
      return []
    }

    const history = testCase.executionHistory || []

    // Return most recent executions first, limited if specified
    const sorted = history.sort((a, b) => {
      return new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    })

    return limit ? sorted.slice(0, limit) : sorted
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private async generateTestId(suiteId: string): Promise<string> {
    try {
      // Get existing tests in suite
      const tests = await this.listTestCases(suiteId)

      // Extract numeric IDs
      const numericIds = tests
        .map(t => {
          const match = t.id.match(/test_(\d+)/)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter(n => !isNaN(n))

      // Get next ID
      const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1

      // Format as test_001, test_002, etc.
      return `test_${nextId.toString().padStart(3, '0')}`
    } catch (error) {
      // If something goes wrong, use timestamp as fallback
      console.warn('[TestCaseManager] Failed to generate sequential ID, using timestamp')
      return `test_${Date.now()}`
    }
  }

  private getTestPath(suiteId: string, testId: string): string {
    return path.join(this.testCasesDir, suiteId, `${testId}.json`)
  }

  private async ensureSuiteDirectory(suiteId: string): Promise<void> {
    const suiteDir = path.join(this.testCasesDir, suiteId)
    await fs.mkdir(suiteDir, { recursive: true })
  }

  private async saveTestCaseToFile(suiteId: string, testCase: TestCase): Promise<void> {
    const filePath = this.getTestPath(suiteId, testCase.id)
    const content = JSON.stringify(testCase, null, 2)

    try {
      await fs.writeFile(filePath, content, 'utf-8')
    } catch (error) {
      console.error(`[TestCaseManager] Failed to save test ${testCase.id}:`, error)
      throw error
    }
  }

  // ============================================================================
  // Legacy Support (for migration)
  // ============================================================================

  async getAllTestsFromLegacyDirectory(legacyDir: string): Promise<any[]> {
    try {
      const files = await fs.readdir(legacyDir)
      const jsonFiles = files.filter(f => f.endsWith('.json'))

      const tests: any[] = []
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(legacyDir, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const testCase = JSON.parse(content)
          tests.push(testCase)
        } catch (error) {
          console.warn(`[TestCaseManager] Failed to load legacy test ${file}:`, error)
        }
      }

      return tests
    } catch (error) {
      console.error('[TestCaseManager] Failed to read legacy directory:', error)
      return []
    }
  }
}
