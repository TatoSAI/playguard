/**
 * PrerequisiteVerifier - Verifies and manages test case prerequisites
 *
 * IMPORTANT: This system VERIFIES prerequisites, not executes them automatically.
 * - Setup Profile: Executes (applies device configuration)
 * - Test Dependency: VERIFIES (checks if test was already executed in cache)
 * - State Setup: Executes (runs device/unity actions)
 * - Cleanup: Executes (runs cleanup actions after test)
 */

import {
  Prerequisite,
  SetupProfilePrerequisite,
  TestDependencyPrerequisite,
  StateSetupPrerequisite,
  CleanupPrerequisite,
  PrerequisiteExecutionResult,
  CachedPrerequisiteResult,
  PrerequisiteExecutionPlan,
  StateSetupAction,
  CleanupAction
} from '../types/test-prerequisites'
import { TestCase } from '../types/models'
import { DeviceSetupManager } from './DeviceSetupManager'
import { ADBManager } from '../adb/ADBManager'

export class PrerequisiteVerifier {
  private cache: Map<string, CachedPrerequisiteResult> = new Map()
  private setupManager: DeviceSetupManager
  private adbManager: ADBManager

  constructor(setupManager: DeviceSetupManager, adbManager: ADBManager) {
    this.setupManager = setupManager
    this.adbManager = adbManager
  }

  /**
   * Verify and execute prerequisites for a test case
   *
   * BEHAVIOR:
   * - Setup Profile: EXECUTES (applies configuration)
   * - Test Dependency: VERIFIES (checks cache, fails if not executed)
   * - State Setup: EXECUTES (runs actions)
   * - Cleanup: N/A (executed after test via executeCleanup)
   */
  async verifyAndExecutePrerequisites(
    testCase: TestCase,
    deviceId: string,
    getAllTestCases: () => Promise<TestCase[]>
  ): Promise<PrerequisiteExecutionResult[]> {
    const results: PrerequisiteExecutionResult[] = []

    if (!testCase.prerequisites || testCase.prerequisites.length === 0) {
      return results
    }

    // Sort prerequisites by type (setup_profile first, then others)
    const sortedPrereqs = this.sortPrerequisites(testCase.prerequisites)

    for (const prereq of sortedPrereqs) {
      if (!prereq.enabled) {
        continue
      }

      const result = await this.executePrerequisite(
        prereq,
        testCase.id,
        deviceId,
        getAllTestCases
      )
      results.push(result)

      // Stop if prerequisite failed
      if (!result.success) {
        throw new Error(
          `Prerequisite "${prereq.name}" failed: ${result.error || 'Unknown error'}`
        )
      }
    }

    return results
  }

  /**
   * Execute cleanup prerequisites after test execution
   */
  async executeCleanup(
    testCase: TestCase,
    deviceId: string,
    testFailed: boolean
  ): Promise<PrerequisiteExecutionResult[]> {
    const results: PrerequisiteExecutionResult[] = []

    if (!testCase.prerequisites) {
      return results
    }

    const cleanupPrereqs = testCase.prerequisites.filter(
      (p) => p.type === 'cleanup' && p.enabled
    ) as CleanupPrerequisite[]

    for (const prereq of cleanupPrereqs) {
      try {
        const result = await this.executeCleanupPrerequisite(prereq, deviceId, testFailed)
        results.push(result)
      } catch (error) {
        // Log but don't fail - cleanup should be best-effort
        console.error(`Cleanup prerequisite "${prereq.name}" failed:`, error)
      }
    }

    return results
  }

  /**
   * Execute a single prerequisite
   */
  private async executePrerequisite(
    prereq: Prerequisite,
    testCaseId: string,
    deviceId: string,
    getAllTestCases: () => Promise<TestCase[]>
  ): Promise<PrerequisiteExecutionResult> {
    const startTime = Date.now()

    try {
      // Check cache for test dependencies
      if (prereq.type === 'test_dependency' && prereq.useCache) {
        const cached = this.getCachedResult(prereq.id)
        if (cached && cached.result.success) {
          return {
            ...cached.result,
            fromCache: true,
            timestamp: Date.now()
          }
        }
      }

      let success = false
      let details = ''

      switch (prereq.type) {
        case 'setup_profile':
          ({ success, details } = await this.executeSetupProfile(
            prereq as SetupProfilePrerequisite,
            deviceId
          ))
          break

        case 'test_dependency':
          ({ success, details } = await this.executeTestDependency(
            prereq as TestDependencyPrerequisite,
            deviceId,
            getAllTestCases
          ))
          break

        case 'state_setup':
          ({ success, details } = await this.executeStateSetup(
            prereq as StateSetupPrerequisite,
            deviceId
          ))
          break

        default:
          throw new Error(`Unknown prerequisite type: ${prereq.type}`)
      }

      const duration = Date.now() - startTime

      const result: PrerequisiteExecutionResult = {
        prerequisiteId: prereq.id,
        success,
        duration,
        timestamp: Date.now(),
        fromCache: false,
        details
      }

      // Cache test dependency results if caching is enabled
      if (prereq.type === 'test_dependency' && (prereq as TestDependencyPrerequisite).useCache) {
        this.cacheResult(prereq.id, testCaseId, result, prereq.timeout)
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        prerequisiteId: prereq.id,
        success: false,
        duration,
        timestamp: Date.now(),
        fromCache: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Execute setup profile prerequisite
   */
  private async executeSetupProfile(
    prereq: SetupProfilePrerequisite,
    deviceId: string
  ): Promise<{ success: boolean; details: string }> {
    try {
      const result = await this.setupManager.applyProfile(deviceId, prereq.setupProfileId)

      return {
        success: result.success,
        details: result.message || 'Setup profile applied successfully'
      }
    } catch (error) {
      throw new Error(
        `Failed to apply setup profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * VERIFY test dependency prerequisite (check if test was already executed)
   *
   * IMPORTANT: This does NOT execute the dependency test.
   * It only VERIFIES that the test was already executed successfully.
   * The test must have been executed before and be in the cache.
   *
   * If useCache is true and the test is in cache with success=true, verification passes.
   * If useCache is false or test not in cache, verification FAILS.
   */
  private async executeTestDependency(
    prereq: TestDependencyPrerequisite,
    deviceId: string,
    getAllTestCases: () => Promise<TestCase[]>
  ): Promise<{ success: boolean; details: string }> {
    try {
      const allTests = await getAllTestCases()
      const dependencyTest = allTests.find((t) => t.id === prereq.testCaseId)

      if (!dependencyTest) {
        throw new Error(`Dependency test case not found: ${prereq.testCaseId}`)
      }

      // Check if test was executed (in cache)
      if (prereq.useCache) {
        const cached = this.getCachedResult(prereq.id)

        if (cached && cached.result.success) {
          return {
            success: true,
            details: `Dependency test "${dependencyTest.name}" was already executed successfully (from cache)`
          }
        }
      }

      // Test dependency was NOT executed or not in cache
      // This is an error - the test must be executed first
      throw new Error(
        `Prerequisite test "${dependencyTest.name}" (${prereq.testCaseId}) has not been executed yet. ` +
        `Please run this test first, or ensure the suite is ordered correctly.`
      )
    } catch (error) {
      throw new Error(
        `Failed to verify dependency test: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Mark a test as executed (call this after successful test execution)
   * This populates the cache so that other tests can depend on it
   */
  markTestExecuted(testCaseId: string, success: boolean, duration: number): void {
    const result: PrerequisiteExecutionResult = {
      prerequisiteId: testCaseId,
      success,
      duration,
      timestamp: Date.now(),
      fromCache: false,
      details: success ? 'Test executed successfully' : 'Test failed'
    }

    // Cache with no expiry (session-based)
    this.cacheResult(testCaseId, testCaseId, result, undefined)
  }

  /**
   * Execute state setup prerequisite
   */
  private async executeStateSetup(
    prereq: StateSetupPrerequisite,
    deviceId: string
  ): Promise<{ success: boolean; details: string }> {
    const results: string[] = []

    for (const action of prereq.actions) {
      const result = await this.executeStateSetupAction(action, deviceId)
      results.push(result)
    }

    return {
      success: true,
      details: results.join('; ')
    }
  }

  /**
   * Execute a single state setup action
   */
  private async executeStateSetupAction(
    action: StateSetupAction,
    deviceId: string
  ): Promise<string> {
    switch (action.type) {
      case 'device_action':
        if (!action.deviceAction) {
          throw new Error('Device action data missing')
        }
        await this.executeDeviceAction(deviceId, action.deviceAction.action)
        return `Device action: ${action.deviceAction.action}`

      case 'unity_action':
        if (!action.unityAction) {
          throw new Error('Unity action data missing')
        }
        // TODO: Integrate with UnityBridge
        return `Unity action: ${action.unityAction.actionName}`

      case 'adb_command':
        if (!action.adbCommand) {
          throw new Error('ADB command data missing')
        }
        await this.adbManager.executeShellCommand(deviceId, action.adbCommand.command)
        return `ADB command: ${action.adbCommand.command}`

      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  /**
   * Execute cleanup prerequisite
   */
  private async executeCleanupPrerequisite(
    prereq: CleanupPrerequisite,
    deviceId: string,
    testFailed: boolean
  ): Promise<PrerequisiteExecutionResult> {
    const startTime = Date.now()

    try {
      const results: string[] = []

      for (const action of prereq.actions) {
        // Skip if test passed and action should only run on failure
        if (!testFailed && !action.alwaysRun) {
          continue
        }

        const result = await this.executeCleanupAction(action, deviceId)
        results.push(result)
      }

      const duration = Date.now() - startTime

      return {
        prerequisiteId: prereq.id,
        success: true,
        duration,
        timestamp: Date.now(),
        fromCache: false,
        details: results.join('; ')
      }
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        prerequisiteId: prereq.id,
        success: false,
        duration,
        timestamp: Date.now(),
        fromCache: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Execute a single cleanup action
   */
  private async executeCleanupAction(action: CleanupAction, deviceId: string): Promise<string> {
    switch (action.type) {
      case 'device_action':
        if (!action.deviceAction) {
          throw new Error('Device action data missing')
        }
        await this.executeDeviceAction(deviceId, action.deviceAction.action)
        return `Device action: ${action.deviceAction.action}`

      case 'unity_action':
        if (!action.unityAction) {
          throw new Error('Unity action data missing')
        }
        // TODO: Integrate with UnityBridge
        return `Unity action: ${action.unityAction.actionName}`

      case 'adb_command':
        if (!action.adbCommand) {
          throw new Error('ADB command data missing')
        }
        await this.adbManager.executeShellCommand(deviceId, action.adbCommand.command)
        return `ADB command: ${action.adbCommand.command}`

      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  /**
   * Execute a device action
   */
  private async executeDeviceAction(deviceId: string, action: string): Promise<void> {
    // Map action string to ADBManager method
    // This should match the DeviceActionType from models.ts
    switch (action) {
      case 'press_back':
        await this.adbManager.pressBack(deviceId)
        break
      case 'press_home':
        await this.adbManager.pressHome(deviceId)
        break
      case 'press_volume_up':
        await this.adbManager.pressVolumeUp(deviceId)
        break
      case 'press_volume_down':
        await this.adbManager.pressVolumeDown(deviceId)
        break
      case 'rotate_portrait':
        await this.adbManager.setOrientation(deviceId, 'portrait')
        break
      case 'rotate_landscape':
        await this.adbManager.setOrientation(deviceId, 'landscape')
        break
      case 'toggle_wifi':
        await this.adbManager.toggleWifi(deviceId)
        break
      case 'toggle_airplane_mode':
        await this.adbManager.toggleAirplaneMode(deviceId)
        break
      // Add more mappings as needed
      default:
        throw new Error(`Unknown device action: ${action}`)
    }
  }

  /**
   * Sort prerequisites by execution order
   * setup_profile should run first, then state_setup, then test_dependency
   */
  private sortPrerequisites(prerequisites: Prerequisite[]): Prerequisite[] {
    const order: Record<string, number> = {
      setup_profile: 1,
      state_setup: 2,
      test_dependency: 3,
      cleanup: 4 // cleanup is handled separately
    }

    return [...prerequisites].sort((a, b) => {
      return (order[a.type] || 999) - (order[b.type] || 999)
    })
  }

  /**
   * Cache a prerequisite execution result
   */
  private cacheResult(
    prerequisiteId: string,
    testCaseId: string,
    result: PrerequisiteExecutionResult,
    expiry?: number
  ): void {
    const expiresAt = expiry ? Date.now() + expiry : null

    this.cache.set(prerequisiteId, {
      prerequisiteId,
      testCaseId,
      result,
      cachedAt: Date.now(),
      expiresAt
    })
  }

  /**
   * Get cached prerequisite result
   */
  private getCachedResult(prerequisiteId: string): CachedPrerequisiteResult | null {
    const cached = this.cache.get(prerequisiteId)

    if (!cached) {
      return null
    }

    // Check expiry
    if (cached.expiresAt && Date.now() > cached.expiresAt) {
      this.cache.delete(prerequisiteId)
      return null
    }

    return cached
  }

  /**
   * Clear cache for a specific test case
   */
  clearTestCaseCache(testCaseId: string): void {
    for (const [key, value] of this.cache.entries()) {
      if (value.testCaseId === testCaseId) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cached results
   */
  clearAllCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalCached: number
    expired: number
    valid: number
  } {
    const now = Date.now()
    let expired = 0
    let valid = 0

    for (const cached of this.cache.values()) {
      if (cached.expiresAt && now > cached.expiresAt) {
        expired++
      } else {
        valid++
      }
    }

    return {
      totalCached: this.cache.size,
      expired,
      valid
    }
  }
}
