export interface DeviceInfo {
  id: string
  model: string
  manufacturer: string
  androidVersion: string
  resolution: string
  isConnected: boolean
}

export interface TestCase {
  id: string
  name: string
  description: string
  steps: TestStep[]
}

export interface TestStep {
  id: string
  type: string
  [key: string]: any
}

declare global {
  interface Window {
    api: {
      adb: {
        getDevices: () => Promise<DeviceInfo[]>
        connect: (deviceId: string) => Promise<boolean>
        disconnect: (deviceId: string) => Promise<boolean>
      }
      test: {
        startRecording: (deviceId: string) => Promise<{ success: boolean; message: string }>
        stopRecording: (deviceId: string) => Promise<{ success: boolean; message: string }>
        run: (deviceId: string, testCase: TestCase, suiteId?: string, suiteName?: string, testIndex?: number, totalTests?: number) => Promise<{ success: boolean; message: string; result?: any }>
        getExecutionState: () => Promise<{
          success: boolean
          state?: {
            isRunning: boolean
            currentTestId: string | null
            currentTestName: string | null
            currentTestIndex: number
            totalTests: number
            currentStepIndex: number
            totalSteps: number
            completedSteps: Array<{
              stepIndex: number
              description: string
              status: 'running' | 'passed' | 'failed' | 'error'
              startTime: number
              duration?: number
              error?: string
            }>
            currentStep: {
              stepIndex: number
              description: string
              status: 'running' | 'passed' | 'failed' | 'error'
              startTime: number
              duration?: number
              error?: string
            } | null
            startTime: number
            suiteName: string | null
          }
        }>
      }
      file: {
        saveTest: (testCase: TestCase) => Promise<{ success: boolean; path: string }>
        loadTest: (filePath: string) => Promise<{ success: boolean; testCase: TestCase }>
        listTests: () => Promise<{ success: boolean; tests: any[] }>
      }
      suite: {
        create: (suite: any) => Promise<{ success: boolean; suite?: any; error?: string }>
        get: (suiteId: string) => Promise<{ success: boolean; suite?: any; error?: string }>
        list: () => Promise<{ success: boolean; suites?: any[]; error?: string }>
        update: (suiteId: string, updates: any) => Promise<{ success: boolean; error?: string }>
        delete: (suiteId: string, deleteTests: boolean) => Promise<{ success: boolean; error?: string }>
        duplicate: (suiteId: string) => Promise<{ success: boolean; suite?: any; error?: string }>
        reorderTests: (suiteId: string, newOrder: string[]) => Promise<{ success: boolean; error?: string }>
        moveTest: (testId: string, fromSuite: string, toSuite: string, index?: number) => Promise<{ success: boolean; error?: string }>
        run: (deviceId: string, suiteId: string, stopOnFirstFailure?: boolean) => Promise<{ success: boolean; message?: string; result?: any; error?: string }>
      }
      testCase: {
        create: (suiteId: string, testCase: any) => Promise<{ success: boolean; testCase?: any; error?: string }>
        get: (suiteId: string, testId: string) => Promise<{ success: boolean; testCase?: any; error?: string }>
        list: (suiteId: string) => Promise<{ success: boolean; testCases?: any[]; error?: string }>
        update: (suiteId: string, testId: string, updates: any) => Promise<{ success: boolean; error?: string }>
        delete: (suiteId: string, testId: string) => Promise<{ success: boolean; error?: string }>
        move: (testId: string, fromSuite: string, toSuite: string) => Promise<{ success: boolean; error?: string }>
      }
      runner: {
        runTest: (deviceId: string, suiteId: string, testId: string) => Promise<{ success: boolean; result?: any; error?: string }>
        runSuite: (deviceId: string, suiteId: string, testIds: string[]) => Promise<{ success: boolean; results?: any; error?: string }>
        stopTest: () => Promise<{ success: boolean; error?: string }>
      }
      ai: {
        generateDescription: (testCase: any) => Promise<{ success: boolean; description?: string; error?: string }>
        suggestTags: (testCase: any, suite: any) => Promise<{ success: boolean; tags?: string[]; error?: string }>
        analyzeFailure: (execution: any) => Promise<{ success: boolean; analysis?: string; error?: string }>
      }
      script: {
        parse: (content: string, format?: 'yaml' | 'typescript') => Promise<{ success: boolean; parsed?: any; error?: string }>
        validate: (content: string, format?: 'yaml' | 'typescript') => Promise<{ success: boolean; validation?: any; warnings?: string[]; error?: string }>
        toTestCase: (content: string, suiteId: string, metadata: any) => Promise<{ success: boolean; testCase?: any; message?: string; error?: string }>
        fromTestCase: (testCaseId: string, suiteId: string, format?: 'yaml' | 'typescript') => Promise<{ success: boolean; script?: string; error?: string }>
      }
      screenshot: {
        save: (suiteId: string, testId: string, stepId: string, base64Data: string) => Promise<{ success: boolean; path?: string; error?: string }>
        load: (relativePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
        delete: (suiteId: string, testId: string) => Promise<{ success: boolean; error?: string }>
        getTotalSize: () => Promise<{ success: boolean; size?: number; error?: string }>
      }
      settings: {
        get: () => Promise<{ success: boolean; settings?: any; error?: string }>
        update: (settings: any) => Promise<{ success: boolean; error?: string }>
        reset: () => Promise<{ success: boolean; error?: string }>
        getSetting: (path: string) => Promise<{ success: boolean; value?: any; error?: string }>
        setSetting: (path: string, value: any) => Promise<{ success: boolean; error?: string }>
        export: (filePath: string) => Promise<{ success: boolean; error?: string }>
        import: (filePath: string) => Promise<{ success: boolean; error?: string }>
      }
      secure: {
        setAPIKey: (provider: string, key: string) => Promise<{ success: boolean; error?: string }>
        getAPIKey: (provider: string) => Promise<{ success: boolean; key?: string; error?: string }>
        hasAPIKey: (provider: string) => Promise<{ success: boolean; has?: boolean; error?: string }>
        deleteAPIKey: (provider: string) => Promise<{ success: boolean; error?: string }>
        listProviders: () => Promise<{ success: boolean; providers?: string[]; error?: string }>
      }
      report: {
        getExecutions: (filters?: any) => Promise<{ success: boolean; executions?: any[]; error?: string }>
        getStats: (filters?: any) => Promise<{ success: boolean; stats?: any; error?: string }>
        getExecutionById: (id: string) => Promise<{ success: boolean; execution?: any; error?: string }>
        exportToJSON: (outputPath: string, filters?: any) => Promise<{ success: boolean; message?: string; error?: string }>
        clearHistory: () => Promise<{ success: boolean; message?: string; error?: string }>
        // Suite Session methods (NEW)
        recordSuiteSession: (session: any) => Promise<{ success: boolean; message?: string; error?: string }>
        getSessions: (filters?: any) => Promise<{ success: boolean; sessions?: any[]; error?: string }>
        getSessionById: (id: string) => Promise<{ success: boolean; session?: any; error?: string }>
        exportSessionToJSON: (sessionId: string, outputPath: string) => Promise<{ success: boolean; message?: string; error?: string }>
        clearSessions: () => Promise<{ success: boolean; message?: string; error?: string }>
      }
      unity: {
        listCustomProperties: () => Promise<{ success: boolean; properties?: string[]; error?: string }>
        listCustomActions: () => Promise<{ success: boolean; actions?: string[]; error?: string }>
        listCustomCommands: () => Promise<{ success: boolean; commands?: string[]; error?: string }>
        getAvailableExtensions: () => Promise<{ success: boolean; extensions?: { properties: string[]; actions: string[]; commands: string[] }; error?: string }>
        getCustomProperty: (name: string) => Promise<{ success: boolean; value?: string; error?: string }>
        executeCustomAction: (name: string, args: string[]) => Promise<{ success: boolean; message?: string; error?: string }>
        executeCustomCommand: (name: string, param: string) => Promise<{ success: boolean; result?: any; error?: string }>
      }
      setup: {
        getAllProfiles: () => Promise<{ success: boolean; profiles?: any[]; error?: string }>
        getProfile: (id: string) => Promise<{ success: boolean; profile?: any; error?: string }>
        createProfile: (profile: any) => Promise<{ success: boolean; profile?: any; error?: string }>
        updateProfile: (id: string, updates: any) => Promise<{ success: boolean; profile?: any; error?: string }>
        deleteProfile: (id: string) => Promise<{ success: boolean; error?: string }>
        applyProfile: (deviceId: string, profileId: string) => Promise<{ success: boolean; result?: any; error?: string }>
        quickReset: (deviceId: string, packageName: string) => Promise<{ success: boolean; result?: any; error?: string }>
      }
      prerequisites: {
        validateTestCase: (testCaseId: string) => Promise<{ success: boolean; result?: any; error?: string }>
        validateSuite: (suiteId: string) => Promise<{ success: boolean; result?: any; error?: string }>
        generateExecutionOrder: (suiteId: string) => Promise<{ success: boolean; executionOrder?: string[]; error?: string }>
        buildDependencyGraph: (suiteId: string) => Promise<{ success: boolean; graph?: any; error?: string }>
        generateSuiteExecutionPlan: (suiteId: string) => Promise<{ success: boolean; plan?: any; error?: string }>
        autoFixDependencies: (suiteId: string, fixType: 'add_missing' | 'reorder') => Promise<{ success: boolean; error?: string }>
        clearCache: () => Promise<{ success: boolean; error?: string }>
        getCacheStats: () => Promise<{ success: boolean; stats?: any; error?: string }>
      }
      on: {
        deviceAdded: (callback: (deviceInfo: DeviceInfo) => void) => void
        deviceRemoved: (callback: (deviceId: string) => void) => void
        testProgress: (callback: (progress: any) => void) => void
      }
    }
    electron: any
  }
}
