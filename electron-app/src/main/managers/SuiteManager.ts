import { promises as fs } from 'fs'
import * as path from 'path'
import { TestSuite, SuiteEnvironment } from '../types/models'

export class SuiteManager {
  private suitesDir: string
  private suites: Map<string, TestSuite> = new Map()

  constructor(userDataPath: string) {
    this.suitesDir = path.join(userDataPath, 'test-data', 'suites')
  }

  async initialize(): Promise<void> {
    console.log('[SuiteManager] Initializing...')

    // Create suites directory if it doesn't exist
    try {
      await fs.mkdir(this.suitesDir, { recursive: true })
      console.log(`[SuiteManager] Suites directory ready: ${this.suitesDir}`)
    } catch (error) {
      console.error('[SuiteManager] Failed to create suites directory:', error)
      throw error
    }

    // Load all existing suites into memory
    await this.loadAllSuites()

    // Ensure "Default" suite exists
    await this.ensureDefaultSuite()
  }

  private async ensureDefaultSuite(): Promise<void> {
    // Check if "Default" suite already exists
    const existingSuites = Array.from(this.suites.values())
    const defaultSuite = existingSuites.find(s => s.name === 'Default')

    if (!defaultSuite) {
      console.log('[SuiteManager] Creating default suite...')
      await this.createSuite({
        name: 'Default',
        description: 'Default test suite for general purpose testing',
        targetPlatform: 'Android',
        environment: 'Development',
        testCaseIds: [],
        tags: ['default']
      })
      console.log('[SuiteManager] Default suite created')
    } else {
      console.log('[SuiteManager] Default suite already exists')
    }
  }

  private async loadAllSuites(): Promise<void> {
    try {
      const files = await fs.readdir(this.suitesDir)
      const suiteFiles = files.filter(f => f.endsWith('.json'))

      for (const file of suiteFiles) {
        try {
          const filePath = path.join(this.suitesDir, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const suite: TestSuite = JSON.parse(content)
          this.suites.set(suite.id, suite)
        } catch (error) {
          console.warn(`[SuiteManager] Failed to load suite from ${file}:`, error)
        }
      }

      console.log(`[SuiteManager] Loaded ${this.suites.size} suites`)
    } catch (error) {
      console.error('[SuiteManager] Failed to load suites:', error)
    }
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async createSuite(
    suite: Omit<TestSuite, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TestSuite> {
    const now = new Date().toISOString()
    const newSuite: TestSuite = {
      ...suite,
      id: this.generateSuiteId(),
      testCaseIds: suite.testCaseIds || [],
      tags: suite.tags || [],
      createdAt: now,
      updatedAt: now
    }

    // Validate suite
    if (!this.validateSuite(newSuite)) {
      throw new Error('Invalid suite data')
    }

    // Save to file
    await this.saveSuiteToFile(newSuite)

    // Add to cache
    this.suites.set(newSuite.id, newSuite)

    console.log(`[SuiteManager] Created suite: ${newSuite.id} - ${newSuite.name}`)
    return newSuite
  }

  async getSuite(suiteId: string): Promise<TestSuite | null> {
    // Try cache first
    const cached = this.suites.get(suiteId)
    if (cached) {
      return cached
    }

    // Try loading from file
    try {
      const filePath = this.getSuiteFilePath(suiteId)
      const content = await fs.readFile(filePath, 'utf-8')
      const suite: TestSuite = JSON.parse(content)
      this.suites.set(suite.id, suite)
      return suite
    } catch (error) {
      return null
    }
  }

  async listSuites(): Promise<TestSuite[]> {
    // Return sorted by updatedAt (most recent first)
    return Array.from(this.suites.values()).sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }

  async updateSuite(suiteId: string, updates: Partial<TestSuite>): Promise<TestSuite> {
    const existingSuite = await this.getSuite(suiteId)
    if (!existingSuite) {
      throw new Error(`Suite not found: ${suiteId}`)
    }

    const updatedSuite: TestSuite = {
      ...existingSuite,
      ...updates,
      id: existingSuite.id, // ID cannot be changed
      createdAt: existingSuite.createdAt, // Created date cannot be changed
      updatedAt: new Date().toISOString()
    }

    // Validate updated suite
    if (!this.validateSuite(updatedSuite)) {
      throw new Error('Invalid suite update data')
    }

    // Save to file
    await this.saveSuiteToFile(updatedSuite)

    // Update cache
    this.suites.set(updatedSuite.id, updatedSuite)

    console.log(`[SuiteManager] Updated suite: ${suiteId}`)
    return updatedSuite
  }

  async deleteSuite(suiteId: string, deleteTests: boolean = false): Promise<boolean> {
    const suite = await this.getSuite(suiteId)
    if (!suite) {
      return false
    }

    // Prevent deletion of "Default" suite
    if (suite.name === 'Default') {
      throw new Error('Cannot delete the Default suite. This suite is required for the application.')
    }

    // If suite has test cases and not deleting them, prevent deletion
    if (suite.testCaseIds.length > 0 && !deleteTests) {
      throw new Error(
        `Suite ${suiteId} contains ${suite.testCaseIds.length} test cases. Either move them to another suite or delete them first.`
      )
    }

    try {
      // Delete file
      const filePath = this.getSuiteFilePath(suiteId)
      await fs.unlink(filePath)

      // Remove from cache
      this.suites.delete(suiteId)

      console.log(`[SuiteManager] Deleted suite: ${suiteId}`)
      return true
    } catch (error) {
      console.error(`[SuiteManager] Failed to delete suite ${suiteId}:`, error)
      return false
    }
  }

  async duplicateSuite(suiteId: string): Promise<TestSuite> {
    const originalSuite = await this.getSuite(suiteId)
    if (!originalSuite) {
      throw new Error(`Suite not found: ${suiteId}`)
    }

    // Generate unique name for the copy
    let copyName = `${originalSuite.name} Copy`
    let copyNumber = 1
    const existingNames = new Set(Array.from(this.suites.values()).map(s => s.name))

    while (existingNames.has(copyName)) {
      copyNumber++
      copyName = `${originalSuite.name} Copy ${copyNumber}`
    }

    // Create new suite with unique ID and name
    const newSuite = await this.createSuite({
      name: copyName,
      description: originalSuite.description,
      environment: originalSuite.environment,
      tags: [...originalSuite.tags]
    })

    console.log(`[SuiteManager] Duplicated suite ${suiteId} to ${newSuite.id}`)
    return newSuite
  }

  // ============================================================================
  // Test Case Management
  // ============================================================================

  async addTestToSuite(suiteId: string, testCaseId: string, index?: number): Promise<void> {
    const suite = await this.getSuite(suiteId)
    if (!suite) {
      throw new Error(`Suite not found: ${suiteId}`)
    }

    // Avoid duplicates
    if (suite.testCaseIds.includes(testCaseId)) {
      console.warn(`[SuiteManager] Test ${testCaseId} already in suite ${suiteId}`)
      return
    }

    // Add at specified index or at the end
    if (index !== undefined && index >= 0 && index <= suite.testCaseIds.length) {
      suite.testCaseIds.splice(index, 0, testCaseId)
    } else {
      suite.testCaseIds.push(testCaseId)
    }

    await this.updateSuite(suiteId, { testCaseIds: suite.testCaseIds })
    console.log(`[SuiteManager] Added test ${testCaseId} to suite ${suiteId}`)
  }

  async removeTestFromSuite(suiteId: string, testCaseId: string): Promise<void> {
    const suite = await this.getSuite(suiteId)
    if (!suite) {
      throw new Error(`Suite not found: ${suiteId}`)
    }

    const index = suite.testCaseIds.indexOf(testCaseId)
    if (index === -1) {
      console.warn(`[SuiteManager] Test ${testCaseId} not found in suite ${suiteId}`)
      return
    }

    suite.testCaseIds.splice(index, 1)
    await this.updateSuite(suiteId, { testCaseIds: suite.testCaseIds })
    console.log(`[SuiteManager] Removed test ${testCaseId} from suite ${suiteId}`)
  }

  async reorderTests(suiteId: string, newOrder: string[]): Promise<void> {
    const suite = await this.getSuite(suiteId)
    if (!suite) {
      throw new Error(`Suite not found: ${suiteId}`)
    }

    // Validate that newOrder contains the same tests
    const currentSet = new Set(suite.testCaseIds)
    const newSet = new Set(newOrder)

    if (currentSet.size !== newSet.size || ![...currentSet].every(id => newSet.has(id))) {
      throw new Error('New order must contain exactly the same test IDs')
    }

    await this.updateSuite(suiteId, { testCaseIds: newOrder })
    console.log(`[SuiteManager] Reordered tests in suite ${suiteId}`)
  }

  async moveTestBetweenSuites(
    testId: string,
    fromSuiteId: string,
    toSuiteId: string,
    index?: number
  ): Promise<void> {
    // Remove from old suite
    await this.removeTestFromSuite(fromSuiteId, testId)

    // Add to new suite
    await this.addTestToSuite(toSuiteId, testId, index)

    console.log(`[SuiteManager] Moved test ${testId} from ${fromSuiteId} to ${toSuiteId}`)
  }

  // ============================================================================
  // Queries
  // ============================================================================

  async getSuitesByEnvironment(environment: SuiteEnvironment): Promise<TestSuite[]> {
    const allSuites = await this.listSuites()
    return allSuites.filter(suite => suite.environment === environment)
  }

  async getSuitesByTag(tag: string): Promise<TestSuite[]> {
    const allSuites = await this.listSuites()
    return allSuites.filter(suite => suite.tags.includes(tag))
  }

  async searchSuites(query: string): Promise<TestSuite[]> {
    const allSuites = await this.listSuites()
    const lowerQuery = query.toLowerCase()

    return allSuites.filter(suite => {
      return (
        suite.name.toLowerCase().includes(lowerQuery) ||
        suite.description?.toLowerCase().includes(lowerQuery) ||
        suite.id.toLowerCase().includes(lowerQuery)
      )
    })
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private generateSuiteId(): string {
    return `suite_${Date.now()}`
  }

  private getSuiteFilePath(suiteId: string): string {
    return path.join(this.suitesDir, `${suiteId}.json`)
  }

  private async saveSuiteToFile(suite: TestSuite): Promise<void> {
    const filePath = this.getSuiteFilePath(suite.id)
    const content = JSON.stringify(suite, null, 2)

    try {
      await fs.writeFile(filePath, content, 'utf-8')
    } catch (error) {
      console.error(`[SuiteManager] Failed to save suite ${suite.id}:`, error)
      throw error
    }
  }

  private validateSuite(suite: TestSuite): boolean {
    return !!(
      suite.id &&
      suite.name &&
      suite.environment &&
      ['Development', 'Staging', 'Production', 'Other'].includes(suite.environment) &&
      Array.isArray(suite.testCaseIds) &&
      Array.isArray(suite.tags) &&
      suite.createdAt &&
      suite.updatedAt
    )
  }
}
