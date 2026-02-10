/**
 * Execution State Manager
 * Manages real-time test execution state for UI polling
 */

export interface ExecutionStep {
  stepIndex: number
  description: string
  status: 'running' | 'passed' | 'failed' | 'error'
  startTime: number
  duration?: number
  error?: string
}

export interface ExecutionState {
  isRunning: boolean
  currentTestId: string | null
  currentTestName: string | null
  currentTestIndex: number
  totalTests: number
  currentStepIndex: number
  totalSteps: number
  completedSteps: ExecutionStep[]
  currentStep: ExecutionStep | null
  startTime: number
  suiteName: string | null
}

class ExecutionStateManager {
  private state: ExecutionState = {
    isRunning: false,
    currentTestId: null,
    currentTestName: null,
    currentTestIndex: 0,
    totalTests: 0,
    currentStepIndex: 0,
    totalSteps: 0,
    completedSteps: [],
    currentStep: null,
    startTime: 0,
    suiteName: null
  }

  /**
   * Start a new test suite execution
   */
  startSuiteExecution(suiteName: string, totalTests: number): void {
    this.state = {
      isRunning: true,
      currentTestId: null,
      currentTestName: null,
      currentTestIndex: 0,
      totalTests,
      currentStepIndex: 0,
      totalSteps: 0,
      completedSteps: [],
      currentStep: null,
      startTime: Date.now(),
      suiteName
    }
    console.log(`[ExecutionStateManager] Started suite: ${suiteName} (${totalTests} tests)`)
  }

  /**
   * Start executing a specific test
   */
  startTest(testId: string, testName: string, testIndex: number, totalSteps: number): void {
    this.state.currentTestId = testId
    this.state.currentTestName = testName
    this.state.currentTestIndex = testIndex
    this.state.totalSteps = totalSteps
    this.state.currentStepIndex = 0
    this.state.completedSteps = []
    this.state.currentStep = null
    console.log(`[ExecutionStateManager] Started test ${testIndex + 1}/${this.state.totalTests}: ${testName} (${totalSteps} steps)`)
  }

  /**
   * Start executing a specific step
   */
  startStep(stepIndex: number, description: string): void {
    this.state.currentStepIndex = stepIndex
    this.state.currentStep = {
      stepIndex,
      description,
      status: 'running',
      startTime: Date.now()
    }
    console.log(`[ExecutionStateManager] Started step ${stepIndex + 1}/${this.state.totalSteps}: ${description}`)
  }

  /**
   * Complete the current step
   */
  completeStep(status: 'passed' | 'failed' | 'error', error?: string): void {
    if (!this.state.currentStep) {
      console.warn('[ExecutionStateManager] No current step to complete')
      return
    }

    const completedStep: ExecutionStep = {
      ...this.state.currentStep,
      status,
      duration: Date.now() - this.state.currentStep.startTime,
      error
    }

    this.state.completedSteps.push(completedStep)
    this.state.currentStep = null
    console.log(`[ExecutionStateManager] Completed step ${completedStep.stepIndex + 1}: ${status}`)
  }

  /**
   * Complete the current test
   */
  completeTest(): void {
    console.log(`[ExecutionStateManager] Completed test: ${this.state.currentTestName}`)
    // Reset test-specific state but keep suite info
    this.state.currentTestId = null
    this.state.currentTestName = null
    this.state.totalSteps = 0
    this.state.currentStepIndex = 0
    this.state.completedSteps = []
    this.state.currentStep = null
  }

  /**
   * Complete the suite execution
   */
  completeSuiteExecution(): void {
    console.log(`[ExecutionStateManager] Completed suite: ${this.state.suiteName}`)
    this.state.isRunning = false
  }

  /**
   * Get the current execution state (for polling)
   */
  getState(): ExecutionState {
    return { ...this.state }
  }

  /**
   * Reset state (for cleanup/error scenarios)
   */
  reset(): void {
    console.log('[ExecutionStateManager] Resetting state')
    this.state = {
      isRunning: false,
      currentTestId: null,
      currentTestName: null,
      currentTestIndex: 0,
      totalTests: 0,
      currentStepIndex: 0,
      totalSteps: 0,
      completedSteps: [],
      currentStep: null,
      startTime: 0,
      suiteName: null
    }
  }
}

// Singleton instance
export const executionStateManager = new ExecutionStateManager()
