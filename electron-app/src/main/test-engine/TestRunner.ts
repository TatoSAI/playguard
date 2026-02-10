import { EventEmitter } from 'events'
import { TestCase, TestStep } from './FileManager'
import { ADBManager } from '../adb/ADBManager'
import { screenshotManager } from '../utils/ScreenshotManager'
import { reportManager, ExecutionRecord } from '../services/ReportManager'
import { executionStateManager } from '../services/ExecutionStateManager'
import { PrerequisiteVerifier } from '../managers/PrerequisiteVerifier'
import { TestCaseManager } from '../managers/TestCaseManager'
import { DependencyValidator } from '../managers/DependencyValidator'
import { TestSuite } from '../types/models'
import pixelmatch from 'pixelmatch'
import sharp from 'sharp'

export interface TestResult {
  testId: string
  status: 'passed' | 'failed' | 'error'
  startTime: number
  endTime: number
  duration: number
  steps: StepResult[]
  error?: string
  screenshots: string[]
}

export interface StepResult {
  stepId: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
  screenshot?: string
}

export interface SuiteResult {
  suiteId: string
  suiteName: string
  status: 'passed' | 'failed' | 'error' | 'stopped'
  startTime: number
  endTime: number
  duration: number
  testResults: TestResult[]
  totalTests: number
  passedTests: number
  failedTests: number
  errorTests: number
  stoppedByUser?: boolean
}

export class TestRunner extends EventEmitter {
  private adbManager: ADBManager
  private prerequisiteVerifier: PrerequisiteVerifier
  private testCaseManager: TestCaseManager
  private dependencyValidator: DependencyValidator
  private isRunning: boolean = false
  private currentTest: TestCase | null = null
  private shouldStop: boolean = false
  private currentPackageName: string = '' // Package name of the app being tested

  constructor(
    adbManager: ADBManager,
    prerequisiteVerifier: PrerequisiteVerifier,
    testCaseManager: TestCaseManager,
    dependencyValidator: DependencyValidator
  ) {
    super()
    this.adbManager = adbManager
    this.prerequisiteVerifier = prerequisiteVerifier
    this.testCaseManager = testCaseManager
    this.dependencyValidator = dependencyValidator
  }

  async runTest(
    deviceId: string,
    testCase: TestCase,
    suiteId?: string,
    suiteName?: string,
    testIndex?: number,
    totalTests?: number
  ): Promise<TestResult> {
    if (this.isRunning) {
      throw new Error('Test is already running')
    }

    this.isRunning = true
    this.currentTest = testCase
    this.shouldStop = false

    const startTime = Date.now()

    const result: TestResult = {
      testId: testCase.id,
      status: 'passed',
      startTime,
      endTime: 0,
      duration: 0,
      steps: [],
      screenshots: []
    }

    try {
      console.log(`[TestRunner] Starting test: ${testCase.name}`)

      // Set package name from test case variables or metadata
      this.currentPackageName = testCase.variables?.packageName || testCase.variables?.package || ''
      if (this.currentPackageName) {
        console.log(`[TestRunner] Using package name: ${this.currentPackageName}`)
      }

      this.emit('testStarted', { testId: testCase.id, name: testCase.name })

      // Update execution state - test started (if test index provided)
      if (testIndex !== undefined && totalTests !== undefined) {
        executionStateManager.startTest(testCase.id, testCase.name, testIndex, testCase.steps.length)
      }

      // ============================================================================
      // VERIFY AND EXECUTE PREREQUISITES
      // ============================================================================
      if (testCase.prerequisites && testCase.prerequisites.length > 0) {
        console.log(`[TestRunner] Verifying ${testCase.prerequisites.length} prerequisite(s)`)

        try {
          const prereqResults = await this.prerequisiteVerifier.verifyAndExecutePrerequisites(
            testCase,
            deviceId,
            () => this.testCaseManager.getAllTestCases()
          )

          console.log(`[TestRunner] All prerequisites verified successfully`)
          // Prerequisites passed, continue with test execution
        } catch (error) {
          // Prerequisite failed - stop test execution
          result.status = 'error'
          result.error = `Prerequisite failed: ${error instanceof Error ? error.message : String(error)}`
          result.endTime = Date.now()
          result.duration = result.endTime - result.startTime

          console.error(`[TestRunner] Prerequisite verification failed:`, error)

          this.emit('testError', {
            testId: testCase.id,
            error: result.error
          })

          executionStateManager.completeTest()
          await this.recordExecution(deviceId, testCase, result, suiteId, suiteName)

          return result
        }
      }

      // Execute each step
      for (let i = 0; i < testCase.steps.length; i++) {
        if (this.shouldStop) {
          console.log('[TestRunner] Test stopped by user')
          result.status = 'error'
          result.error = 'Stopped by user'
          break
        }

        const step = testCase.steps[i]

        // Update execution state - step started
        executionStateManager.startStep(i, step.description || step.type || 'Unknown step')

        this.emit('stepStarted', {
          testId: testCase.id,
          stepIndex: i,
          totalSteps: testCase.steps.length,
          step
        })

        const stepResult = await this.executeStep(deviceId, step, testCase.variables)
        result.steps.push(stepResult)

        // Update execution state - step completed
        executionStateManager.completeStep(stepResult.status === 'passed' ? 'passed' : stepResult.status === 'failed' ? 'failed' : 'error', stepResult.error)

        // Only add screenshot to result if step FAILED (for evidence)
        // Don't save screenshots from passed steps to reduce memory usage
        if (stepResult.screenshot && stepResult.status === 'failed') {
          result.screenshots.push(stepResult.screenshot)
        }

        this.emit('stepCompleted', {
          testId: testCase.id,
          stepIndex: i,
          stepResult
        })

        if (stepResult.status === 'failed') {
          // Check if step has continueOnFailure flag
          if (step.continueOnFailure) {
            console.log(`[TestRunner] Step ${i + 1} failed (non-blocking): ${step.description}`)
            console.log(`[TestRunner] Failure reason: ${stepResult.error}`)
            console.log(`[TestRunner] Continuing test execution (continueOnFailure: true)`)
            // Mark test as failed but continue execution
            result.status = 'failed'
            if (!result.error) {
              result.error = `Step ${i + 1} failed (non-blocking): ${stepResult.error}`
            }
            // Continue to next step instead of breaking
          } else {
            // Blocking failure - stop test execution
            result.status = 'failed'
            result.error = stepResult.error || `Step ${i + 1} failed`
            console.log(`[TestRunner] Test failed at step ${i + 1}: ${step.description}`)
            console.log(`[TestRunner] Failure reason: ${result.error}`)
            break
          }
        }
      }

      // ============================================================================
      // EXECUTE CLEANUP PREREQUISITES
      // ============================================================================
      if (testCase.prerequisites && testCase.prerequisites.length > 0) {
        try {
          console.log('[TestRunner] Executing cleanup prerequisites')
          const testFailed = result.status === 'failed' || result.status === 'error'
          await this.prerequisiteVerifier.executeCleanup(testCase, deviceId, testFailed)
          console.log('[TestRunner] Cleanup prerequisites completed')
        } catch (error) {
          console.error('[TestRunner] Cleanup failed (non-fatal):', error)
          // Cleanup failures are logged but don't fail the test
        }
      }

      // Run legacy cleanup steps if any (backward compatibility)
      if (testCase.cleanup && testCase.cleanup.length > 0) {
        console.log('[TestRunner] Running legacy cleanup steps')
        for (const cleanupStep of testCase.cleanup) {
          await this.executeStep(deviceId, cleanupStep, testCase.variables)
        }
      }

      result.endTime = Date.now()
      result.duration = result.endTime - result.startTime

      // Screenshots are already managed per-step (only failures saved)
      // result.screenshots contains evidence from failed steps only
      if (result.status === 'failed' || result.status === 'error') {
        console.log(`[TestRunner] Test failed - ${result.screenshots.length} screenshot(s) saved as evidence`)
      } else {
        console.log(`[TestRunner] Test passed - no screenshots needed`)
      }

      console.log(
        `[TestRunner] Test ${result.status}: ${testCase.name} (${result.duration}ms)`
      )

      this.emit('testCompleted', {
        testId: testCase.id,
        result
      })

      // Update execution state - test completed
      executionStateManager.completeTest()

      // Mark test as executed for dependency tracking
      this.prerequisiteVerifier.markTestExecuted(
        testCase.id,
        result.status === 'passed',
        result.duration
      )
      console.log(`[TestRunner] Marked test as executed (status: ${result.status})`)

      // Record execution in report history
      await this.recordExecution(deviceId, testCase, result, suiteId, suiteName)

      return result
    } catch (error) {
      result.status = 'error'
      result.error = error instanceof Error ? error.message : String(error)
      result.endTime = Date.now()
      result.duration = result.endTime - result.startTime

      // Keep screenshots as evidence of the error
      console.log(`[TestRunner] Test error - keeping execution screenshots as evidence`)

      console.error('[TestRunner] Test error:', error)

      this.emit('testError', {
        testId: testCase.id,
        error: result.error
      })

      // Update execution state - test completed (with error)
      executionStateManager.completeTest()

      // Execute cleanup prerequisites even on error
      if (testCase.prerequisites && testCase.prerequisites.length > 0) {
        try {
          console.log('[TestRunner] Executing cleanup prerequisites after error')
          await this.prerequisiteVerifier.executeCleanup(testCase, deviceId, true)
        } catch (cleanupError) {
          console.error('[TestRunner] Cleanup failed (non-fatal):', cleanupError)
        }
      }

      // Mark test as executed (failed) for dependency tracking
      this.prerequisiteVerifier.markTestExecuted(
        testCase.id,
        false, // Test failed
        result.duration
      )

      // Record execution in report history
      await this.recordExecution(deviceId, testCase, result, suiteId, suiteName)

      return result
    } finally {
      this.isRunning = false
      this.currentTest = null
    }
  }

  /**
   * Run an entire test suite with proper dependency ordering
   */
  async runSuite(
    deviceId: string,
    suite: TestSuite,
    stopOnFirstFailure: boolean = true
  ): Promise<SuiteResult> {
    if (this.isRunning) {
      throw new Error('Test execution is already running')
    }

    console.log(`[TestRunner] Starting suite execution: ${suite.name}`)
    const startTime = Date.now()

    const result: SuiteResult = {
      suiteId: suite.id,
      suiteName: suite.name,
      status: 'passed',
      startTime,
      endTime: 0,
      duration: 0,
      testResults: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errorTests: 0,
      stoppedByUser: false
    }

    try {
      // Get all test cases from all suites
      const allTestCases = await this.testCaseManager.getAllTestCases()

      // Generate execution plan with proper dependency ordering
      const executionPlan = this.dependencyValidator.generateSuiteExecutionPlan(suite, allTestCases)
      const orderedTests = executionPlan.testCases

      result.totalTests = orderedTests.length

      console.log(`[TestRunner] Execution order:`, orderedTests.map(t => t.name))

      // Execute tests in dependency order
      for (let i = 0; i < orderedTests.length; i++) {
        const testCase = orderedTests[i]

        // Check if user requested stop
        if (this.shouldStop) {
          console.log(`[TestRunner] Suite execution stopped by user`)
          result.status = 'stopped'
          result.stoppedByUser = true
          break
        }

        console.log(`[TestRunner] Running test ${i + 1}/${orderedTests.length}: ${testCase.name}`)

        // Emit progress event
        this.emit('suite-progress', {
          suiteId: suite.id,
          suiteName: suite.name,
          currentTest: i + 1,
          totalTests: orderedTests.length,
          testName: testCase.name
        })

        try {
          // Run the test
          const testResult = await this.runTest(
            deviceId,
            testCase,
            suite.id,
            suite.name,
            i + 1,
            orderedTests.length
          )

          result.testResults.push(testResult)

          // Update counters based on test status
          if (testResult.status === 'passed') {
            result.passedTests++
          } else if (testResult.status === 'failed') {
            result.failedTests++
            if (stopOnFirstFailure) {
              console.log(`[TestRunner] Stopping suite execution due to test failure`)
              result.status = 'failed'
              break
            }
          } else if (testResult.status === 'error') {
            result.errorTests++
            if (stopOnFirstFailure) {
              console.log(`[TestRunner] Stopping suite execution due to test error`)
              result.status = 'error'
              break
            }
          }

        } catch (error) {
          console.error(`[TestRunner] Test execution failed:`, error)

          // Create error result for this test
          const errorResult: TestResult = {
            testId: testCase.id,
            status: 'error',
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
            steps: [],
            error: error instanceof Error ? error.message : String(error),
            screenshots: []
          }

          result.testResults.push(errorResult)
          result.errorTests++

          if (stopOnFirstFailure) {
            console.log(`[TestRunner] Stopping suite execution due to exception`)
            result.status = 'error'
            break
          }
        }
      }

      // Determine final suite status if not already set
      if (result.status === 'passed') {
        if (result.errorTests > 0) {
          result.status = 'error'
        } else if (result.failedTests > 0) {
          result.status = 'failed'
        }
      }

      result.endTime = Date.now()
      result.duration = result.endTime - result.startTime

      console.log(`[TestRunner] Suite execution completed:`, {
        status: result.status,
        passed: result.passedTests,
        failed: result.failedTests,
        errors: result.errorTests,
        duration: result.duration
      })

      // Emit completion event
      this.emit('suite-complete', result)

      return result

    } catch (error) {
      console.error(`[TestRunner] Suite execution failed:`, error)

      result.status = 'error'
      result.endTime = Date.now()
      result.duration = result.endTime - result.startTime

      this.emit('suite-error', {
        suiteId: suite.id,
        suiteName: suite.name,
        error: error instanceof Error ? error.message : String(error)
      })

      throw error
    } finally {
      this.shouldStop = false
    }
  }

  private async executeStep(
    deviceId: string,
    step: TestStep,
    variables?: Record<string, any>
  ): Promise<StepResult> {
    const stepStartTime = Date.now()

    const result: StepResult = {
      stepId: step.id,
      status: 'passed',
      duration: 0
    }

    try {
      console.log(`[TestRunner] Executing step: ${step.type} - ${step.description}`)

      // Replace variables in step values
      const processedStep = this.replaceVariables(step, variables)

      switch (step.type) {
        case 'tap':
          await this.executeTap(deviceId, processedStep)
          // After tap, wait for UI animations/transitions to complete
          await this.sleep(1500)
          await this.validateStepScreenshot(deviceId, step, result)
          break

        case 'swipe':
          await this.executeSwipe(deviceId, processedStep)
          // After swipe, wait for UI animations/transitions to complete
          await this.sleep(1500)
          await this.validateStepScreenshot(deviceId, step, result)
          break

        case 'input':
          await this.executeInput(deviceId, processedStep)
          await this.sleep(1500)
          await this.validateStepScreenshot(deviceId, step, result)
          break

        case 'wait':
          await this.executeWait(deviceId, processedStep)
          break

        case 'assert':
          await this.executeAssert(deviceId, processedStep)
          break

        case 'screenshot':
          result.screenshot = await this.executeScreenshot(deviceId, processedStep)
          // Screenshots are validation points, compare with reference
          await this.validateStepScreenshot(deviceId, step, result)
          break

        // Hardware button actions
        case 'press_back':
          await this.adbManager.pressBack(deviceId)
          await this.sleep(1000)
          break

        case 'press_home':
          await this.adbManager.pressHome(deviceId)
          await this.sleep(1000)
          break

        case 'press_volume_up':
          await this.adbManager.pressVolumeUp(deviceId)
          await this.sleep(500)
          break

        case 'press_volume_down':
          await this.adbManager.pressVolumeDown(deviceId)
          await this.sleep(500)
          break

        // Screen orientation actions
        case 'rotate_portrait':
          await this.adbManager.rotatePortrait(deviceId)
          await this.sleep(2000) // Wait for rotation animation
          break

        case 'rotate_landscape':
          await this.adbManager.rotateLandscape(deviceId)
          await this.sleep(2000)
          break

        case 'rotate_portrait_reverse':
          await this.adbManager.rotatePortraitReverse(deviceId)
          await this.sleep(2000)
          break

        case 'rotate_landscape_reverse':
          await this.adbManager.rotateLandscapeReverse(deviceId)
          await this.sleep(2000)
          break

        case 'toggle_auto_rotate':
          await this.adbManager.toggleAutoRotate(deviceId, processedStep.data?.enable)
          await this.sleep(1000)
          break

        // App lifecycle actions
        case 'background_app':
          await this.adbManager.backgroundApp(deviceId)
          await this.sleep(1000)
          break

        case 'foreground_app':
          await this.adbManager.foregroundApp(deviceId, processedStep.data?.packageName || this.currentPackageName)
          await this.sleep(2000)
          break

        case 'force_stop_app':
          await this.adbManager.forceStopApp(deviceId, processedStep.data?.packageName || this.currentPackageName)
          await this.sleep(1000)
          break

        case 'clear_app_data':
          await this.adbManager.clearAppDataAction(deviceId, processedStep.data?.packageName || this.currentPackageName)
          await this.sleep(2000)
          break

        // Connectivity actions
        case 'toggle_wifi':
          await this.adbManager.toggleWiFi(deviceId, processedStep.data?.enable)
          await this.sleep(2000)
          break

        case 'toggle_mobile_data':
          await this.adbManager.toggleMobileData(deviceId, processedStep.data?.enable)
          await this.sleep(2000)
          break

        case 'toggle_airplane_mode':
          await this.adbManager.toggleAirplaneMode(deviceId, processedStep.data?.enable)
          await this.sleep(3000) // Airplane mode takes longer
          break

        // Interruptions/Simulations
        case 'simulate_call':
          await this.adbManager.simulateIncomingCall(deviceId, processedStep.data?.phoneNumber)
          await this.sleep(2000)
          break

        case 'simulate_notification':
          await this.adbManager.simulateNotification(
            deviceId,
            processedStep.data?.title,
            processedStep.data?.message
          )
          await this.sleep(1000)
          break

        case 'simulate_low_battery':
          await this.adbManager.simulateLowBattery(deviceId, processedStep.data?.level || 10)
          await this.sleep(1000)
          break

        case 'simulate_memory_warning':
          await this.adbManager.simulateMemoryWarning(
            deviceId,
            processedStep.data?.packageName || this.currentPackageName
          )
          await this.sleep(1000)
          break

        default:
          console.warn(`[TestRunner] Unknown step type: ${step.type}`)
      }

      // Capture screenshot if requested
      if (step.options?.screenshot && step.type !== 'screenshot') {
        result.screenshot = await this.captureScreenshot(deviceId)
      }

      // Evaluate expectedOutcome for positive tests
      // If expectedOutcome === 'fail', we expected this step to fail, but it passed
      // This means the test should fail
      if (step.expectedOutcome === 'fail') {
        result.status = 'failed'
        result.error = 'Expected step to fail (negative test), but it passed'
        console.warn(`[TestRunner] Negative test failed: step passed when it should have failed`)
      }

      result.duration = Date.now() - stepStartTime
      return result
    } catch (error) {
      // Evaluate expectedOutcome for negative tests
      // If expectedOutcome === 'fail', we expected this step to fail, and it did
      // This means the test should pass
      if (step.expectedOutcome === 'fail') {
        result.status = 'passed'
        result.error = undefined
        result.duration = Date.now() - stepStartTime
        console.log(`[TestRunner] Negative test passed: step failed as expected`)
        return result
      }

      // Normal failure (expectedOutcome === 'pass' or undefined)
      result.status = 'failed'
      result.error = error instanceof Error ? error.message : String(error)
      result.duration = Date.now() - stepStartTime

      console.error(`[TestRunner] Step failed:`, error)
      return result
    }
  }

  private async executeTap(deviceId: string, step: any): Promise<void> {
    const { options } = step

    // Wait before if specified
    if (options?.waitBefore) {
      await this.sleep(options.waitBefore * 1000)
    }

    // Try to extract coordinates from different possible locations
    const tapData = step.target || step.value || step

    // Get coordinates
    let x: number, y: number

    if (tapData.fallback) {
      // Format 1: Normalized coordinates with fallback
      const deviceInfo = await this.adbManager.getDeviceInfo(deviceId)
      const [width, height] = deviceInfo.resolution.split('x').map(Number)

      x = tapData.fallback.x * width
      y = tapData.fallback.y * height
    } else if (tapData.x !== undefined && tapData.y !== undefined) {
      // Format 2: Absolute coordinates (current format)
      x = tapData.x
      y = tapData.y
    } else {
      throw new Error('No coordinates specified for tap')
    }

    // Execute tap
    await this.adbManager.sendTap(deviceId, Math.round(x), Math.round(y))

    // Wait after if specified
    if (options?.waitAfter) {
      await this.sleep(options.waitAfter * 1000)
    }
  }

  private async executeSwipe(deviceId: string, step: any): Promise<void> {
    const deviceInfo = await this.adbManager.getDeviceInfo(deviceId)
    const [width, height] = deviceInfo.resolution.split('x').map(Number)

    let x1: number, y1: number, x2: number, y2: number, durationMs: number

    // Try to extract coordinates from different possible locations
    const swipeData = step.target || step.value || step

    // Handle multiple formats:
    // 1. Normalized coordinates: { from: {x, y}, to: {x, y}, duration }
    // 2. Absolute coordinates in target/value: { target: { x1, y1, x2, y2, duration } }
    // 3. Absolute coordinates direct: { x1, y1, x2, y2, duration }
    if (swipeData.from && swipeData.to) {
      // Format 1: Normalized coordinates (0-1 range)
      x1 = swipeData.from.x * width
      y1 = swipeData.from.y * height
      x2 = swipeData.to.x * width
      y2 = swipeData.to.y * height
      durationMs = (swipeData.duration || 0.3) * 1000
    } else if (swipeData.x1 !== undefined && swipeData.y1 !== undefined &&
               swipeData.x2 !== undefined && swipeData.y2 !== undefined) {
      // Format 2 & 3: Absolute pixel coordinates
      x1 = swipeData.x1
      y1 = swipeData.y1
      x2 = swipeData.x2
      y2 = swipeData.y2
      durationMs = swipeData.duration || 300
    } else {
      throw new Error('Invalid swipe step format: missing coordinates')
    }

    await this.adbManager.sendSwipe(
      deviceId,
      Math.round(x1),
      Math.round(y1),
      Math.round(x2),
      Math.round(y2),
      Math.round(durationMs)
    )
  }

  private async executeInput(deviceId: string, step: any): Promise<void> {
    const { target, value, options } = step

    // TODO: Focus input field first (need to implement)

    // Clear if specified
    if (options?.clearFirst) {
      // Send backspace multiple times or select all + delete
      // For now, skip
    }

    // Send text
    await this.adbManager.sendText(deviceId, value)
  }

  private async executeWait(deviceId: string, step: any): Promise<void> {
    const { waitType, value } = step

    if (waitType === 'duration') {
      await this.sleep(value * 1000)
    } else if (waitType === 'element') {
      // TODO: Wait for element to appear/disappear
      // For now, just wait fixed time
      await this.sleep(5000)
    }
  }

  private async executeAssert(deviceId: string, step: any): Promise<void> {
    const { assertion } = step

    if (!assertion) {
      throw new Error('Assertion configuration missing')
    }

    const { type, target, expected, threshold, timeout } = assertion
    const maxWait = timeout || 5000
    const startTime = Date.now()

    console.log(`[TestRunner] Executing assertion: ${type}`)

    switch (type) {
      case 'element_exists':
        await this.assertElementExists(deviceId, target, maxWait)
        break

      case 'element_active':
        await this.assertElementActive(deviceId, target, maxWait)
        break

      case 'text_equals':
        await this.assertTextEquals(deviceId, target, expected, maxWait)
        break

      case 'text_contains':
        await this.assertTextContains(deviceId, target, expected, maxWait)
        break

      case 'screenshot_match':
        await this.assertScreenshotMatch(deviceId, step, threshold || 0.95)
        break

      default:
        throw new Error(`Unknown assertion type: ${type}`)
    }

    const duration = Date.now() - startTime
    console.log(`[TestRunner] Assertion passed in ${duration}ms`)
  }

  // SDK-based assertions (require Unity SDK)
  private async assertElementExists(
    deviceId: string,
    target: any,
    timeout: number
  ): Promise<void> {
    const { elementPath, elementName } = target || {}

    if (!elementPath && !elementName) {
      throw new Error('Element path or name required for element_exists assertion')
    }

    // Check if Unity SDK is available
    const sdkAvailable = await this.unityBridge.detectSDK(deviceId)
    if (!sdkAvailable) {
      throw new Error('Unity SDK not available - cannot check element existence')
    }

    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      try {
        // Try to find element by path or name
        const command = elementPath
          ? { command: 'findElementByPath', path: elementPath }
          : { command: 'findElementByName', name: elementName }

        const response = await this.unityBridge.sendCommand(deviceId, command)

        if (response.success && response.element) {
          console.log(`[TestRunner] Element found: ${elementPath || elementName}`)
          return
        }
      } catch (error) {
        // Continue waiting
      }

      await this.sleep(500)
    }

    throw new Error(
      `Element not found after ${timeout}ms: ${elementPath || elementName}`
    )
  }

  private async assertElementActive(
    deviceId: string,
    target: any,
    timeout: number
  ): Promise<void> {
    const { elementPath, elementName } = target || {}

    if (!elementPath && !elementName) {
      throw new Error('Element path or name required for element_active assertion')
    }

    const sdkAvailable = await this.unityBridge.detectSDK(deviceId)
    if (!sdkAvailable) {
      throw new Error('Unity SDK not available - cannot check element state')
    }

    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      try {
        const command = elementPath
          ? { command: 'getElementProperties', path: elementPath }
          : { command: 'findElementByName', name: elementName }

        const response = await this.unityBridge.sendCommand(deviceId, command)

        if (response.success && response.element && response.element.active) {
          console.log(`[TestRunner] Element is active: ${elementPath || elementName}`)
          return
        }
      } catch (error) {
        // Continue waiting
      }

      await this.sleep(500)
    }

    throw new Error(
      `Element not active after ${timeout}ms: ${elementPath || elementName}`
    )
  }

  private async assertTextEquals(
    deviceId: string,
    target: any,
    expected: string,
    timeout: number
  ): Promise<void> {
    const { elementPath, elementName } = target || {}

    if (!elementPath && !elementName) {
      throw new Error('Element path or name required for text_equals assertion')
    }

    const sdkAvailable = await this.unityBridge.detectSDK(deviceId)
    if (!sdkAvailable) {
      throw new Error('Unity SDK not available - cannot check element text')
    }

    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      try {
        const command = elementPath
          ? { command: 'getElementProperties', path: elementPath }
          : { command: 'findElementByName', name: elementName }

        const response = await this.unityBridge.sendCommand(deviceId, command)

        if (response.success && response.element) {
          const actualText = response.element.text || ''
          if (actualText === expected) {
            console.log(`[TestRunner] Text matches: "${actualText}"`)
            return
          }
        }
      } catch (error) {
        // Continue waiting
      }

      await this.sleep(500)
    }

    throw new Error(
      `Text does not match after ${timeout}ms. Expected: "${expected}"`
    )
  }

  private async assertTextContains(
    deviceId: string,
    target: any,
    expected: string,
    timeout: number
  ): Promise<void> {
    const { elementPath, elementName } = target || {}

    if (!elementPath && !elementName) {
      throw new Error('Element path or name required for text_contains assertion')
    }

    const sdkAvailable = await this.unityBridge.detectSDK(deviceId)
    if (!sdkAvailable) {
      throw new Error('Unity SDK not available - cannot check element text')
    }

    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      try {
        const command = elementPath
          ? { command: 'getElementProperties', path: elementPath }
          : { command: 'findElementByName', name: elementName }

        const response = await this.unityBridge.sendCommand(deviceId, command)

        if (response.success && response.element) {
          const actualText = response.element.text || ''
          if (actualText.includes(expected)) {
            console.log(`[TestRunner] Text contains: "${expected}" in "${actualText}"`)
            return
          }
        }
      } catch (error) {
        // Continue waiting
      }

      await this.sleep(500)
    }

    throw new Error(
      `Text does not contain "${expected}" after ${timeout}ms`
    )
  }

  // Coordinate-based assertion (no SDK required)
  private async assertScreenshotMatch(
    deviceId: string,
    step: any,
    threshold: number
  ): Promise<void> {
    console.log(`[TestRunner] Screenshot match assertion (threshold: ${threshold})`)

    // Get reference screenshot from step
    const referenceScreenshot = step.screenshot
    if (!referenceScreenshot) {
      throw new Error('Reference screenshot missing for screenshot_match assertion')
    }

    // Capture current screenshot
    const currentScreenshot = await this.captureScreenshot(deviceId)
    if (!currentScreenshot) {
      throw new Error('Failed to capture screenshot for comparison')
    }

    try {
      // Remove data:image/png;base64, prefix if present
      const referenceBase64 = referenceScreenshot.replace(/^data:image\/\w+;base64,/, '')
      const currentBase64 = currentScreenshot.replace(/^data:image\/\w+;base64,/, '')

      // Decode base64 to buffers
      const referenceBuffer = Buffer.from(referenceBase64, 'base64')
      const currentBuffer = Buffer.from(currentBase64, 'base64')

      // Use sharp to convert to raw pixel data
      const referenceImage = await sharp(referenceBuffer)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true })

      const currentImage = await sharp(currentBuffer)
        .resize(referenceImage.info.width, referenceImage.info.height) // Ensure same size
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true })

      // Compare images using pixelmatch
      const { width, height } = referenceImage.info
      const diff = Buffer.alloc(width * height * 4)

      const mismatchedPixels = pixelmatch(
        referenceImage.data,
        currentImage.data,
        diff,
        width,
        height,
        { threshold: 0.1 } // Pixel comparison threshold (0-1)
      )

      // Calculate similarity percentage
      const totalPixels = width * height
      const similarity = 1 - mismatchedPixels / totalPixels

      console.log(
        `[TestRunner] Screenshot comparison: ${(similarity * 100).toFixed(2)}% similar (${mismatchedPixels}/${totalPixels} pixels differ)`
      )

      if (similarity < threshold) {
        throw new Error(
          `Screenshot similarity ${(similarity * 100).toFixed(2)}% below threshold ${(threshold * 100).toFixed(0)}%`
        )
      }

      console.log('[TestRunner] Screenshot match assertion passed')
    } catch (error) {
      if (error instanceof Error && error.message.includes('similarity')) {
        throw error // Re-throw similarity errors
      }
      console.error('[TestRunner] Screenshot comparison failed:', error)
      throw new Error(`Failed to compare screenshots: ${error}`)
    }
  }

  private async executeScreenshot(deviceId: string, step: any): Promise<string> {
    return await this.captureScreenshot(deviceId)
  }

  private async captureScreenshot(deviceId: string): Promise<string> {
    try {
      const buffer = await this.adbManager.captureScreenshot(deviceId)
      const base64 = buffer.toString('base64')
      return `data:image/png;base64,${base64}`
    } catch (error) {
      console.error('[TestRunner] Failed to capture screenshot:', error)
      return ''
    }
  }

  private async validateStepScreenshot(
    deviceId: string,
    step: TestStep,
    result: StepResult
  ): Promise<void> {
    // Only validate if step has a reference screenshot
    if (!step.screenshotPath && !step.screenshot) {
      return
    }

    try {
      // Capture current screenshot
      const currentScreenshot = await this.captureScreenshot(deviceId)
      if (!currentScreenshot) {
        console.warn('[TestRunner] Failed to capture screenshot for validation')
        return
      }

      // Store screenshot in result for evidence
      result.screenshot = currentScreenshot

      // Get reference screenshot (from recording)
      let referenceScreenshot: string | null = null

      if (step.screenshotPath) {
        // Load from file using ScreenshotManager
        try {
          console.log(`[TestRunner] Loading reference screenshot from: ${step.screenshotPath}`)
          referenceScreenshot = await screenshotManager.loadScreenshot(step.screenshotPath)
          console.log(`[TestRunner] Successfully loaded reference screenshot`)
        } catch (error) {
          console.error(`[TestRunner] Failed to load screenshot from file:`, error)
          // Fallback to base64 if available
          if (step.screenshot) {
            console.log(`[TestRunner] Falling back to base64 screenshot`)
            referenceScreenshot = step.screenshot
          }
        }
      } else if (step.screenshot) {
        // Use base64 screenshot (backward compatibility)
        referenceScreenshot = step.screenshot
      }

      if (!referenceScreenshot) {
        console.warn('[TestRunner] No reference screenshot available for comparison')
        return
      }

      // Compare screenshots
      const threshold = 0.1 // 10% difference allowed
      const similarity = await this.compareScreenshots(referenceScreenshot, currentScreenshot)

      console.log(`[TestRunner] Screenshot similarity: ${(similarity * 100).toFixed(2)}%`)

      if (similarity < (1 - threshold)) {
        result.status = 'failed'
        result.error = `Screenshot mismatch: ${(similarity * 100).toFixed(2)}% similarity (expected >${((1 - threshold) * 100).toFixed(0)}%)`
        console.error(`[TestRunner] ${result.error}`)
      } else {
        console.log('[TestRunner] Screenshot validation passed')
      }
    } catch (error) {
      console.error('[TestRunner] Screenshot validation error:', error)
      // Don't fail the test on validation errors, just log them
    }
  }

  private async compareScreenshots(
    referenceBase64: string,
    currentBase64: string
  ): Promise<number> {
    try {
      // Remove data URI prefix if present
      const referenceData = referenceBase64.replace(/^data:image\/\w+;base64,/, '')
      const currentData = currentBase64.replace(/^data:image\/\w+;base64,/, '')

      // Convert to buffers
      const referenceBuffer = Buffer.from(referenceData, 'base64')
      const currentBuffer = Buffer.from(currentData, 'base64')

      // Process images with sharp
      const referenceImage = await sharp(referenceBuffer)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true })

      const currentImage = await sharp(currentBuffer)
        .resize(referenceImage.info.width, referenceImage.info.height)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true })

      // Compare with pixelmatch
      const { width, height } = referenceImage.info
      const diff = Buffer.alloc(width * height * 4)

      const mismatchedPixels = pixelmatch(
        referenceImage.data,
        currentImage.data,
        diff,
        width,
        height,
        { threshold: 0.1 }
      )

      const totalPixels = width * height
      const similarity = 1 - (mismatchedPixels / totalPixels)

      return similarity
    } catch (error) {
      console.error('[TestRunner] Screenshot comparison error:', error)
      throw error
    }
  }

  private replaceVariables(step: any, variables?: Record<string, any>): any {
    if (!variables) return step

    const stepStr = JSON.stringify(step)
    let result = stepStr

    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(pattern, String(value))
    }

    return JSON.parse(result)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async recordExecution(
    deviceId: string,
    testCase: TestCase,
    result: TestResult,
    suiteId?: string,
    suiteName?: string
  ): Promise<void> {
    try {
      // Get device info
      const device = await this.adbManager.getDeviceInfo(deviceId)

      // Count step statistics
      const passedSteps = result.steps.filter(s => s.status === 'passed').length
      const failedSteps = result.steps.filter(s => s.status === 'failed').length

      // Create execution record
      const executionRecord: ExecutionRecord = {
        id: `exec_${Date.now()}`,
        timestamp: new Date().toISOString(),
        suiteId: suiteId || testCase.suiteId || 'unknown',
        suiteName: suiteName || 'Unknown Suite',
        testId: testCase.id,
        testName: testCase.name,
        deviceId: deviceId,
        deviceModel: device.model,
        status: result.status,
        duration: result.duration,
        totalSteps: result.steps.length,
        passedSteps,
        failedSteps,
        error: result.error
      }

      // Record in report manager
      await reportManager.recordExecution(executionRecord)
    } catch (error) {
      console.error('[TestRunner] Failed to record execution:', error)
      // Don't throw error - recording failure shouldn't break test execution
    }
  }

  stopTest(): void {
    if (this.isRunning) {
      this.shouldStop = true
      console.log('[TestRunner] Stop requested')
    }
  }

  isTestRunning(): boolean {
    return this.isRunning
  }

  getCurrentTest(): TestCase | null {
    return this.currentTest
  }
}
