import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { ADBManager } from './adb/ADBManager'
import { TestRunner } from './test-engine/TestRunner'
import { TestRecorder } from './test-engine/TestRecorder'
import { SuiteManager } from './managers/SuiteManager'
import { TestCaseManager } from './managers/TestCaseManager'
import { TagManager } from './managers/TagManager'
import { ConfigManager } from './managers/ConfigManager'
import { DeviceSetupManager } from './managers/DeviceSetupManager'
import { PrerequisiteVerifier } from './managers/PrerequisiteVerifier'
import { DependencyValidator } from './managers/DependencyValidator'
import { AIService } from './services/AIService'
import { TestScriptParser } from './services/TestScriptParser'
import { DataMigration } from './migration/DataMigration'
import { screenshotManager } from './utils/ScreenshotManager'
import { getSettingsManager } from './managers/SettingsManager'
import { getSecureStorage } from './managers/SecureStorage'
import { reportManager } from './services/ReportManager'
import { executionStateManager } from './services/ExecutionStateManager'

// Initialize managers
let adbManager: ADBManager | null = null
let suiteManager: SuiteManager | null = null
let testCaseManager: TestCaseManager | null = null
let tagManager: TagManager | null = null
let configManager: ConfigManager | null = null
let deviceSetupManager: DeviceSetupManager | null = null
let prerequisiteVerifier: PrerequisiteVerifier | null = null
let dependencyValidator: DependencyValidator | null = null
let aiService: AIService | null = null
let testScriptParser: TestScriptParser | null = null
let testRunner: TestRunner | null = null
let testRecorder: TestRecorder | null = null
let dataMigration: DataMigration | null = null

function createWindow(): void {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'default',
    backgroundColor: '#0f172a'
  })

  // Set Content Security Policy to allow data: URIs for images
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
        ]
      }
    })
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()

    // Open DevTools in development mode
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli
  // Load the remote URL for development or the local html file for production
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Set app user model id for windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.playguard.app')
  }

  // Initialize managers in correct order
  const userDataPath = app.getPath('userData')

  // Core managers
  adbManager = new ADBManager()
  await adbManager.initialize()

  // Initialize Device Setup Manager (requires ADB)
  deviceSetupManager = new DeviceSetupManager(adbManager)

  // Initialize Prerequisite Verifier (requires DeviceSetupManager and ADB)
  prerequisiteVerifier = new PrerequisiteVerifier(deviceSetupManager, adbManager)

  // Initialize Dependency Validator
  dependencyValidator = new DependencyValidator()

  configManager = new ConfigManager(userDataPath)
  await configManager.initialize()

  // Initialize screenshot manager
  await screenshotManager.initialize()

  // Initialize report manager
  await reportManager.initialize()

  // Initialize settings manager
  const settingsManager = getSettingsManager()
  await settingsManager.initialize()

  // Initialize secure storage
  const secureStorage = getSecureStorage()
  await secureStorage.initialize()

  suiteManager = new SuiteManager(userDataPath)
  await suiteManager.initialize()

  testCaseManager = new TestCaseManager(userDataPath, suiteManager)
  await testCaseManager.initialize()

  tagManager = new TagManager(userDataPath)
  await tagManager.initialize()

  aiService = new AIService(configManager)
  await aiService.initialize()

  // Script parser
  testScriptParser = new TestScriptParser()

  // Test engine
  testRunner = new TestRunner(adbManager, prerequisiteVerifier, testCaseManager, dependencyValidator)
  testRecorder = new TestRecorder(adbManager)

  // Check for data migration
  dataMigration = new DataMigration(userDataPath, suiteManager, testCaseManager)
  const migrationNeeded = await dataMigration.checkMigrationNeeded()
  if (migrationNeeded) {
    console.log('[Main] Data migration needed - will prompt user')
    // Migration will be triggered from UI
  }

  // IPC handlers
  setupIPCHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    adbManager?.cleanup()
    app.quit()
  }
})

// Setup IPC Handlers
function setupIPCHandlers(): void {
  // Device Management
  ipcMain.handle('adb:getDevices', async () => {
    if (!adbManager) throw new Error('ADB Manager not initialized')
    return await adbManager.getDevices()
  })

  ipcMain.handle('adb:connect', async (_, deviceId: string) => {
    if (!adbManager) throw new Error('ADB Manager not initialized')
    return await adbManager.connectToDevice(deviceId)
  })

  ipcMain.handle('adb:disconnect', async (_, deviceId: string) => {
    if (!adbManager) throw new Error('ADB Manager not initialized')
    return await adbManager.disconnectDevice(deviceId)
  })

  // Test Recording
  ipcMain.handle('test:startRecording', async (_, deviceId: string) => {
    if (!testRecorder) throw new Error('Test Recorder not initialized')

    try {
      await testRecorder.startRecording(deviceId)
      return { success: true, message: 'Recording started' }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('test:stopRecording', async () => {
    if (!testRecorder) throw new Error('Test Recorder not initialized')

    try {
      const session = testRecorder.stopRecording()
      return {
        success: true,
        message: 'Recording stopped',
        session
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('test:captureAction', async (_, type: string, data: any) => {
    if (!testRecorder) throw new Error('Test Recorder not initialized')

    try {
      await testRecorder.captureAction(type as any, data, true)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('test:getRecordingState', async () => {
    if (!testRecorder) throw new Error('Test Recorder not initialized')

    try {
      const session = testRecorder.getCurrentSession()
      if (!session) {
        return {
          success: true,
          isRecording: false,
          session: null
        }
      }

      // Convert screenshot buffers to base64 for transfer to renderer
      const actionsWithBase64Screenshots = session.actions.map(action => ({
        ...action,
        screenshot: action.screenshot ? action.screenshot.toString('base64') : undefined
      }))

      // Get the most recent screenshot for live streaming (separate from actions)
      const lastScreenshot = testRecorder.getLastScreenshot()
      const liveScreenshot = lastScreenshot ? lastScreenshot.toString('base64') : null

      return {
        success: true,
        isRecording: testRecorder.isCurrentlyRecording(),
        liveScreenshot, // Live streaming screenshot (not saved as action)
        session: {
          ...session,
          actions: actionsWithBase64Screenshots
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Test Playback
  ipcMain.handle('test:run', async (_, deviceId: string, testCase: any) => {
    if (!adbManager || !testRunner || !suiteManager) throw new Error('Managers not initialized')

    try {
      // Get suite info for reporting
      let suiteName = 'Unknown Suite'
      if (testCase.suiteId) {
        const suite = await suiteManager.getSuite(testCase.suiteId)
        if (suite) {
          suiteName = suite.name
        }
      }

      const result = await testRunner.runTest(deviceId, testCase, testCase.suiteId, suiteName)
      return {
        success: result.status === 'passed',
        message: result.status === 'passed' ? 'Test passed' : `Test failed: ${result.error}`,
        result
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Suite Execution
  ipcMain.handle('suite:run', async (_, deviceId: string, suiteId: string, stopOnFirstFailure: boolean = true) => {
    if (!adbManager || !testRunner || !suiteManager) throw new Error('Managers not initialized')

    try {
      // Get suite
      const suite = await suiteManager.getSuite(suiteId)
      if (!suite) {
        return {
          success: false,
          message: `Suite not found: ${suiteId}`
        }
      }

      console.log(`[IPC] Starting suite execution: ${suite.name}`)

      // Run suite with dependency ordering
      const result = await testRunner.runSuite(deviceId, suite, stopOnFirstFailure)

      return {
        success: result.status === 'passed',
        message: result.status === 'passed'
          ? `Suite completed: ${result.passedTests}/${result.totalTests} tests passed`
          : `Suite ${result.status}: ${result.passedTests} passed, ${result.failedTests} failed, ${result.errorTests} errors`,
        result
      }
    } catch (error) {
      console.error('[IPC] Suite execution error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('test:stop', async () => {
    if (!testRunner) throw new Error('Test Runner not initialized')
    testRunner.stopTest()
    return { success: true, message: 'Test stopped' }
  })

  // Get real-time execution state (for polling)
  ipcMain.handle('test:getExecutionState', async () => {
    try {
      const state = executionStateManager.getState()
      return { success: true, state }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // File Operations (Legacy - Bridged to new Suite-based system for backward compatibility)
  ipcMain.handle('file:saveTest', async (_, testCase: any) => {
    if (!testCaseManager) throw new Error('Test Case Manager not initialized')

    try {
      // If testCase has suiteId, use it; otherwise find or create a default suite
      let suiteId = testCase.suiteId

      if (!suiteId) {
        // Try to find a "Default" or "Migrated Tests" suite
        const suites = await suiteManager!.listSuites()
        let defaultSuite = suites.find(s => s.name === 'Default' || s.name === 'Migrated Tests')

        if (!defaultSuite) {
          // Create a default suite
          defaultSuite = await suiteManager!.createSuite({
            name: 'Default',
            description: 'Default suite for legacy tests',
            environment: 'Development',
            tags: [],
            testCaseIds: []
          })
        }

        suiteId = defaultSuite.id
      }

      // Create or update test case
      if (testCase.id) {
        // Check if test exists first
        const existing = await testCaseManager.getTestCase(suiteId, testCase.id)
        if (existing) {
          // Update existing
          await testCaseManager.updateTestCase(suiteId, testCase.id, testCase)
          return { success: true, path: `${suiteId}/${testCase.id}` }
        } else {
          // ID provided but test doesn't exist - create new
          const created = await testCaseManager.createTestCase(suiteId, testCase)
          return { success: true, path: `${suiteId}/${created.id}` }
        }
      } else {
        // Create new
        const created = await testCaseManager.createTestCase(suiteId, testCase)
        return { success: true, path: `${suiteId}/${created.id}` }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('file:loadTest', async (_, filePath: string) => {
    if (!testCaseManager) throw new Error('Test Case Manager not initialized')

    try {
      // filePath might be "suiteId/testId" or just "testId"
      const parts = filePath.split('/')
      let suiteId: string, testId: string

      if (parts.length === 2) {
        [suiteId, testId] = parts
      } else {
        // Search through all suites for this test ID
        const suites = await suiteManager!.listSuites()
        let foundTest = null

        for (const suite of suites) {
          const test = await testCaseManager.getTestCase(suite.id, parts[0])
          if (test) {
            foundTest = test
            break
          }
        }

        if (!foundTest) {
          throw new Error(`Test case not found: ${filePath}`)
        }

        return { success: true, testCase: foundTest }
      }

      const testCase = await testCaseManager.getTestCase(suiteId, testId)

      if (!testCase) {
        throw new Error(`Test case not found: ${filePath}`)
      }

      return { success: true, testCase }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('file:listTests', async () => {
    if (!testCaseManager || !suiteManager) throw new Error('Managers not initialized')

    try {
      // Get all suites and aggregate their test cases
      const suites = await suiteManager.listSuites()
      const allTests = []

      for (const suite of suites) {
        const tests = await testCaseManager.listTestCases(suite.id)
        allTests.push(...tests)
      }

      return { success: true, tests: allTests }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('file:deleteTest', async (_, testId: string) => {
    if (!testCaseManager || !suiteManager) throw new Error('Managers not initialized')

    try {
      // Find which suite contains this test
      const suites = await suiteManager.listSuites()
      let deleted = false

      for (const suite of suites) {
        const test = await testCaseManager.getTestCase(suite.id, testId)
        if (test) {
          await testCaseManager.deleteTestCase(suite.id, testId)
          deleted = true
          break
        }
      }

      return { success: deleted }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('file:duplicateTest', async (_, testId: string) => {
    if (!testCaseManager || !suiteManager) throw new Error('Managers not initialized')

    try {
      // Find which suite contains this test
      const suites = await suiteManager.listSuites()
      let duplicated = null

      for (const suite of suites) {
        const test = await testCaseManager.getTestCase(suite.id, testId)
        if (test) {
          // Create a copy with modified name
          const copy = {
            ...test,
            name: `${test.name} (Copy)`,
            id: undefined, // Let manager generate new ID
            createdAt: undefined,
            updatedAt: undefined
          }

          duplicated = await testCaseManager.createTestCase(suite.id, copy)
          break
        }
      }

      return { success: duplicated !== null, testCase: duplicated }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // App Lifecycle Management
  ipcMain.handle('adb:startApp', async (_, deviceId: string, packageName: string, activityName?: string) => {
    if (!adbManager) throw new Error('ADB Manager not initialized')

    try {
      await adbManager.startApp(deviceId, packageName, activityName)
      return { success: true, message: `Started ${packageName}` }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('adb:stopApp', async (_, deviceId: string, packageName: string) => {
    if (!adbManager) throw new Error('ADB Manager not initialized')

    try {
      await adbManager.stopApp(deviceId, packageName)
      return { success: true, message: `Stopped ${packageName}` }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('adb:clearAppData', async (_, deviceId: string, packageName: string) => {
    if (!adbManager) throw new Error('ADB Manager not initialized')

    try {
      await adbManager.clearAppData(deviceId, packageName)
      return { success: true, message: `Cleared data for ${packageName}` }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('adb:isAppRunning', async (_, deviceId: string, packageName: string) => {
    if (!adbManager) throw new Error('ADB Manager not initialized')

    try {
      const isRunning = await adbManager.isAppRunning(deviceId, packageName)
      return { success: true, isRunning }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('adb:isAppInstalled', async (_, deviceId: string, packageName: string) => {
    if (!adbManager) throw new Error('ADB Manager not initialized')

    try {
      const isInstalled = await adbManager.isAppInstalled(deviceId, packageName)
      return { success: true, isInstalled }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Crash Detection
  ipcMain.handle('adb:isAppCrashed', async (_, deviceId: string, packageName: string) => {
    if (!adbManager) throw new Error('ADB Manager not initialized')

    try {
      const isCrashed = await adbManager.isAppCrashed(deviceId, packageName)
      return { success: true, isCrashed }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('adb:getCrashLog', async (_, deviceId: string, packageName?: string) => {
    if (!adbManager) throw new Error('ADB Manager not initialized')

    try {
      const crashLog = await adbManager.getCrashLog(deviceId, packageName)
      return { success: true, crashLog }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('adb:clearLogcat', async (_, deviceId: string) => {
    if (!adbManager) throw new Error('ADB Manager not initialized')

    try {
      await adbManager.clearLogcat(deviceId)
      return { success: true, message: 'Logcat cleared' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // ============================================================================
  // Suite Management Handlers
  // ============================================================================

  ipcMain.handle('suite:create', async (_, suite) => {
    if (!suiteManager) throw new Error('Suite Manager not initialized')
    try {
      const created = await suiteManager.createSuite(suite)
      return { success: true, suite: created }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('suite:get', async (_, suiteId: string) => {
    if (!suiteManager) throw new Error('Suite Manager not initialized')
    try {
      const suite = await suiteManager.getSuite(suiteId)
      return { success: true, suite }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('suite:list', async () => {
    if (!suiteManager) throw new Error('Suite Manager not initialized')
    try {
      const suites = await suiteManager.listSuites()
      return { success: true, suites }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('suite:update', async (_, suiteId: string, updates) => {
    if (!suiteManager) throw new Error('Suite Manager not initialized')
    try {
      const updated = await suiteManager.updateSuite(suiteId, updates)
      return { success: true, suite: updated }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('suite:delete', async (_, suiteId: string, deleteTests: boolean) => {
    if (!suiteManager || !testCaseManager) throw new Error('Managers not initialized')
    try {
      // Get suite to check for test cases
      const suite = await suiteManager.getSuite(suiteId)
      if (!suite) {
        return { success: false, error: 'Suite not found' }
      }

      // If deleteTests is true, delete all test cases first
      if (deleteTests && suite.testCaseIds && suite.testCaseIds.length > 0) {
        console.log(`[IPC] Deleting ${suite.testCaseIds.length} test cases from suite ${suiteId}`)
        for (const testId of suite.testCaseIds) {
          await testCaseManager.deleteTestCase(suiteId, testId)
        }
      }

      // Now delete the suite
      const deleted = await suiteManager.deleteSuite(suiteId, deleteTests)
      return { success: deleted }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('suite:reorderTests', async (_, suiteId: string, newOrder: string[]) => {
    if (!suiteManager) throw new Error('Suite Manager not initialized')
    try {
      await suiteManager.reorderTests(suiteId, newOrder)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('suite:moveTest', async (_, testId: string, fromSuite: string, toSuite: string, index?: number) => {
    if (!suiteManager) throw new Error('Suite Manager not initialized')
    try {
      await suiteManager.moveTestBetweenSuites(testId, fromSuite, toSuite, index)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('suite:duplicate', async (_, suiteId: string) => {
    if (!suiteManager || !testCaseManager) throw new Error('Managers not initialized')
    try {
      // Duplicate the suite (creates new suite with empty testCaseIds)
      const newSuite = await suiteManager.duplicateSuite(suiteId)

      // Duplicate all test cases from original suite to new suite
      await testCaseManager.duplicateTestCases(suiteId, newSuite.id)

      console.log(`[IPC] Duplicated suite ${suiteId} to ${newSuite.id}`)
      return { success: true, suite: newSuite }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // ============================================================================
  // Test Case Management Handlers
  // ============================================================================

  ipcMain.handle('testCase:create', async (_, suiteId: string, testCase) => {
    if (!testCaseManager) throw new Error('Test Case Manager not initialized')
    try {
      const created = await testCaseManager.createTestCase(suiteId, testCase)
      return { success: true, testCase: created }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('testCase:get', async (_, suiteId: string, testId: string) => {
    if (!testCaseManager) throw new Error('Test Case Manager not initialized')
    try {
      const testCase = await testCaseManager.getTestCase(suiteId, testId)
      return { success: true, testCase }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('testCase:list', async (_, suiteId: string) => {
    if (!testCaseManager) throw new Error('Test Case Manager not initialized')
    try {
      const testCases = await testCaseManager.listTestCases(suiteId)
      return { success: true, testCases }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('testCase:update', async (_, suiteId: string, testId: string, updates) => {
    if (!testCaseManager) throw new Error('Test Case Manager not initialized')
    try {
      const updated = await testCaseManager.updateTestCase(suiteId, testId, updates)
      return { success: true, testCase: updated }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('testCase:delete', async (_, suiteId: string, testId: string) => {
    if (!testCaseManager) throw new Error('Test Case Manager not initialized')
    try {
      const deleted = await testCaseManager.deleteTestCase(suiteId, testId)
      return { success: deleted }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('testCase:move', async (_, testId: string, fromSuite: string, toSuite: string) => {
    if (!testCaseManager) throw new Error('Test Case Manager not initialized')
    try {
      await testCaseManager.moveTestToSuite(testId, fromSuite, toSuite)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('testCase:getExecutionHistory', async (_, suiteId: string, testId: string, limit?: number) => {
    if (!testCaseManager) throw new Error('Test Case Manager not initialized')
    try {
      const history = await testCaseManager.getExecutionHistory(suiteId, testId, limit)
      return { success: true, history }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // ============================================================================
  // Tag Management Handlers
  // ============================================================================

  ipcMain.handle('tag:create', async (_, name: string, options?) => {
    if (!tagManager) throw new Error('Tag Manager not initialized')
    try {
      const tag = await tagManager.createTag(name, options)
      return { success: true, tag }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('tag:list', async () => {
    if (!tagManager) throw new Error('Tag Manager not initialized')
    try {
      const tags = await tagManager.listTags()
      return { success: true, tags }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('tag:update', async (_, tagId: string, updates) => {
    if (!tagManager) throw new Error('Tag Manager not initialized')
    try {
      const tag = await tagManager.updateTag(tagId, updates)
      return { success: true, tag }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('tag:delete', async (_, tagId: string) => {
    if (!tagManager) throw new Error('Tag Manager not initialized')
    try {
      const deleted = await tagManager.deleteTag(tagId)
      return { success: deleted }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('tag:search', async (_, query: string) => {
    if (!tagManager) throw new Error('Tag Manager not initialized')
    try {
      const tags = await tagManager.searchTags(query)
      return { success: true, tags }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('tag:suggest', async (_, context: string) => {
    if (!tagManager) throw new Error('Tag Manager not initialized')
    try {
      const tags = await tagManager.suggestTags(context)
      return { success: true, tags }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // ============================================================================
  // AI Integration Handlers
  // ============================================================================

  ipcMain.handle('ai:generateDescription', async (_, steps) => {
    if (!aiService) throw new Error('AI Service not initialized')
    try {
      const description = await aiService.generateTestDescription(steps)
      return { success: true, description }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('ai:generateStepDescription', async (_, step, context) => {
    if (!aiService) throw new Error('AI Service not initialized')
    try {
      const description = await aiService.generateStepDescription(step, context)
      return { success: true, description }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('ai:suggestPrerequisites', async (_, testCase) => {
    if (!aiService) throw new Error('AI Service not initialized')
    try {
      const prerequisites = await aiService.suggestPrerequisites(testCase)
      return { success: true, prerequisites }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('ai:suggestTags', async (_, testCase, suite) => {
    if (!aiService) throw new Error('AI Service not initialized')
    try {
      const tags = await aiService.suggestTags(testCase, suite)
      return { success: true, tags }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('ai:analyzeFailure', async (_, execution) => {
    if (!aiService) throw new Error('AI Service not initialized')
    try {
      const analysis = await aiService.analyzeFailure(execution)
      return { success: true, analysis }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // ============================================================================
  // Script Parsing Handlers
  // ============================================================================

  ipcMain.handle('script:parse', async (_, content: string, format: 'yaml' | 'typescript' = 'yaml') => {
    if (!testScriptParser) throw new Error('Test Script Parser not initialized')
    try {
      const parsed = testScriptParser.parse(content, format)
      return { success: true, parsed }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('script:validate', async (_, content: string, format: 'yaml' | 'typescript' = 'yaml') => {
    if (!testScriptParser) throw new Error('Test Script Parser not initialized')
    try {
      const parsed = testScriptParser.parse(content, format)
      const validation = testScriptParser.validate(parsed)
      return {
        success: validation.valid,
        validation,
        warnings: parsed.warnings
      }
    } catch (error) {
      return {
        success: false,
        validation: {
          valid: false,
          errors: [{
            field: 'script',
            message: error instanceof Error ? error.message : String(error)
          }]
        }
      }
    }
  })

  ipcMain.handle('script:toTestCase', async (_, content: string, suiteId: string, metadata: any) => {
    if (!testScriptParser) throw new Error('Test Script Parser not initialized')
    if (!testCaseManager) throw new Error('Test Case Manager not initialized')

    try {
      // Parse script
      const parsed = testScriptParser.parse(content, 'yaml')

      // Convert to TestCase
      const testCase = testScriptParser.toTestCase(parsed, suiteId, {
        tags: metadata.tags,
        recordingDevice: metadata.recordingDevice
      })

      // Override name, description, tags from metadata if provided
      if (metadata.name) testCase.name = metadata.name
      if (metadata.description) testCase.description = metadata.description
      if (metadata.tags) testCase.tags = metadata.tags

      // Save test case
      const saved = await testCaseManager.createTestCase(suiteId, testCase)

      return {
        success: true,
        testCase: saved,
        message: 'Test case created successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('script:fromTestCase', async (_, testCaseId: string, suiteId: string, format: 'yaml' | 'typescript' = 'yaml') => {
    if (!testScriptParser) throw new Error('Test Script Parser not initialized')
    if (!testCaseManager) throw new Error('Test Case Manager not initialized')

    try {
      const testCase = await testCaseManager.getTestCase(suiteId, testCaseId)
      if (!testCase) {
        throw new Error(`Test case not found: ${testCaseId}`)
      }

      const script = testScriptParser.fromTestCase(testCase, format)
      return { success: true, script }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // ============================================================================
  // Migration Handlers
  // ============================================================================

  ipcMain.handle('migration:check', async () => {
    if (!dataMigration) throw new Error('Data Migration not initialized')
    try {
      const needed = await dataMigration.checkMigrationNeeded()
      return { success: true, needed }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('migration:execute', async () => {
    if (!dataMigration) throw new Error('Data Migration not initialized')
    try {
      await dataMigration.migrateToV2()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Screenshot Management handlers
  ipcMain.handle('screenshot:save', async (_, suiteId: string, testId: string, stepId: string, base64Data: string) => {
    try {
      const path = await screenshotManager.saveScreenshot(suiteId, testId, stepId, base64Data)
      return { success: true, path }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('screenshot:load', async (_, relativePath: string) => {
    try {
      const base64Data = await screenshotManager.loadScreenshot(relativePath)
      return { success: true, data: base64Data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('screenshot:delete', async (_, suiteId: string, testId: string) => {
    try {
      await screenshotManager.deleteTestScreenshots(suiteId, testId)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('screenshot:getTotalSize', async () => {
    try {
      const size = await screenshotManager.getTotalSize()
      return { success: true, size }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Report Management handlers
  ipcMain.handle('report:getExecutions', async (_, filters?: any) => {
    try {
      const executions = await reportManager.getExecutions(filters)
      return { success: true, executions }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('report:getStats', async (_, filters?: any) => {
    try {
      const stats = await reportManager.getStats(filters)
      return { success: true, stats }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('report:getExecutionById', async (_, id: string) => {
    try {
      const execution = await reportManager.getExecutionById(id)
      return { success: true, execution }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('report:exportToJSON', async (_, outputPath: string, filters?: any) => {
    try {
      await reportManager.exportToJSON(outputPath, filters)
      return { success: true, message: 'Report exported successfully' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('report:clearHistory', async () => {
    try {
      await reportManager.clearHistory()
      return { success: true, message: 'History cleared successfully' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Suite Session handlers (NEW)
  ipcMain.handle('report:recordSuiteSession', async (_, session: any) => {
    try {
      await reportManager.recordSuiteSession(session)
      return { success: true, message: 'Suite session recorded successfully' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('report:getSessions', async (_, filters?: any) => {
    try {
      const sessions = await reportManager.getSessions(filters)
      return { success: true, sessions }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('report:getSessionById', async (_, id: string) => {
    try {
      const session = await reportManager.getSessionById(id)
      return { success: true, session }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('report:exportSessionToJSON', async (_, sessionId: string, outputPath: string) => {
    try {
      await reportManager.exportSessionToJSON(sessionId, outputPath)
      return { success: true, message: 'Session exported successfully' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('report:clearSessions', async () => {
    try {
      await reportManager.clearSessions()
      return { success: true, message: 'Sessions cleared successfully' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Settings Management handlers
  ipcMain.handle('settings:get', async () => {
    try {
      const settingsManager = getSettingsManager()
      const settings = settingsManager.getSettings()
      return { success: true, settings }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('settings:update', async (_, updates: any) => {
    try {
      const settingsManager = getSettingsManager()
      return await settingsManager.updateSettings(updates)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('settings:reset', async () => {
    try {
      const settingsManager = getSettingsManager()
      return await settingsManager.resetSettings()
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('settings:getSetting', async (_, path: string) => {
    try {
      const settingsManager = getSettingsManager()
      const value = settingsManager.getSetting(path)
      return { success: true, value }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('settings:setSetting', async (_, path: string, value: any) => {
    try {
      const settingsManager = getSettingsManager()
      return await settingsManager.setSetting(path, value)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('settings:export', async (_, filePath: string) => {
    try {
      const settingsManager = getSettingsManager()
      return await settingsManager.exportSettings(filePath)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('settings:import', async (_, filePath: string) => {
    try {
      const settingsManager = getSettingsManager()
      return await settingsManager.importSettings(filePath)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Secure Storage handlers (API Keys)
  ipcMain.handle('secure:setAPIKey', async (_, provider: string, key: string) => {
    try {
      const secureStorage = getSecureStorage()
      return await secureStorage.setAPIKey(provider, key)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('secure:getAPIKey', async (_, provider: string) => {
    try {
      const secureStorage = getSecureStorage()
      return await secureStorage.getAPIKey(provider)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('secure:hasAPIKey', async (_, provider: string) => {
    try {
      const secureStorage = getSecureStorage()
      const has = await secureStorage.hasAPIKey(provider)
      return { success: true, has }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('secure:deleteAPIKey', async (_, provider: string) => {
    try {
      const secureStorage = getSecureStorage()
      return await secureStorage.deleteAPIKey(provider)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('secure:listProviders', async () => {
    try {
      const secureStorage = getSecureStorage()
      const providers = await secureStorage.listProviders()
      return { success: true, providers }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // ===== v2.0 UNITY CUSTOM EXTENSIONS HANDLERS =====

  ipcMain.handle('unity:listCustomProperties', async () => {
    try {
      if (!testRecorder) {
        throw new Error('Test recorder not initialized')
      }

      const unityBridge = (testRecorder as any).unityBridge
      if (!unityBridge || !unityBridge.isSDKConnected()) {
        return {
          success: false,
          error: 'Unity SDK not connected'
        }
      }

      const properties = await unityBridge.listCustomProperties()
      return { success: true, properties }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('unity:listCustomActions', async () => {
    try {
      if (!testRecorder) {
        throw new Error('Test recorder not initialized')
      }

      const unityBridge = (testRecorder as any).unityBridge
      if (!unityBridge || !unityBridge.isSDKConnected()) {
        return {
          success: false,
          error: 'Unity SDK not connected'
        }
      }

      const actions = await unityBridge.listCustomActions()
      return { success: true, actions }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('unity:listCustomCommands', async () => {
    try {
      if (!testRecorder) {
        throw new Error('Test recorder not initialized')
      }

      const unityBridge = (testRecorder as any).unityBridge
      if (!unityBridge || !unityBridge.isSDKConnected()) {
        return {
          success: false,
          error: 'Unity SDK not connected'
        }
      }

      const commands = await unityBridge.listCustomCommands()
      return { success: true, commands }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('unity:getAvailableExtensions', async () => {
    try {
      if (!testRecorder) {
        throw new Error('Test recorder not initialized')
      }

      const unityBridge = (testRecorder as any).unityBridge
      if (!unityBridge || !unityBridge.isSDKConnected()) {
        return {
          success: false,
          error: 'Unity SDK not connected'
        }
      }

      const extensions = await unityBridge.getAvailableExtensions()
      return { success: true, extensions }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('unity:getCustomProperty', async (_, name: string) => {
    try {
      if (!testRecorder) {
        throw new Error('Test recorder not initialized')
      }

      const unityBridge = (testRecorder as any).unityBridge
      if (!unityBridge || !unityBridge.isSDKConnected()) {
        return {
          success: false,
          error: 'Unity SDK not connected'
        }
      }

      const value = await unityBridge.getCustomProperty(name)
      return { success: true, value }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('unity:executeCustomAction', async (_, name: string, args: string[]) => {
    try {
      if (!testRecorder) {
        throw new Error('Test recorder not initialized')
      }

      const unityBridge = (testRecorder as any).unityBridge
      if (!unityBridge || !unityBridge.isSDKConnected()) {
        return {
          success: false,
          error: 'Unity SDK not connected'
        }
      }

      const result = await unityBridge.executeCustomAction(name, args)
      return { success: result, message: result ? 'Action executed successfully' : 'Action failed' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('unity:executeCustomCommand', async (_, name: string, param: string) => {
    try {
      if (!testRecorder) {
        throw new Error('Test recorder not initialized')
      }

      const unityBridge = (testRecorder as any).unityBridge
      if (!unityBridge || !unityBridge.isSDKConnected()) {
        return {
          success: false,
          error: 'Unity SDK not connected'
        }
      }

      const result = await unityBridge.executeCustomCommand(name, param)
      return { success: true, result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Device Setup Manager IPC Handlers
  ipcMain.handle('setup:getAllProfiles', async () => {
    try {
      if (!deviceSetupManager) {
        throw new Error('Device setup manager not initialized')
      }
      return { success: true, profiles: deviceSetupManager.getAllProfiles() }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('setup:getProfile', async (_, id: string) => {
    try {
      if (!deviceSetupManager) {
        throw new Error('Device setup manager not initialized')
      }
      const profile = deviceSetupManager.getProfile(id)
      if (!profile) {
        return { success: false, error: 'Profile not found' }
      }
      return { success: true, profile }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('setup:createProfile', async (_, profile: any) => {
    try {
      if (!deviceSetupManager) {
        throw new Error('Device setup manager not initialized')
      }
      const newProfile = await deviceSetupManager.createProfile(profile)
      return { success: true, profile: newProfile }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('setup:updateProfile', async (_, id: string, updates: any) => {
    try {
      if (!deviceSetupManager) {
        throw new Error('Device setup manager not initialized')
      }
      const updated = await deviceSetupManager.updateProfile(id, updates)
      return { success: true, profile: updated }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('setup:deleteProfile', async (_, id: string) => {
    try {
      if (!deviceSetupManager) {
        throw new Error('Device setup manager not initialized')
      }
      await deviceSetupManager.deleteProfile(id)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('setup:applyProfile', async (_, deviceId: string, profileId: string) => {
    try {
      if (!deviceSetupManager) {
        throw new Error('Device setup manager not initialized')
      }
      const result = await deviceSetupManager.applyProfile(deviceId, profileId)
      return { success: true, result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('setup:quickReset', async (_, deviceId: string, packageName: string) => {
    try {
      if (!deviceSetupManager) {
        throw new Error('Device setup manager not initialized')
      }
      const result = await deviceSetupManager.quickReset(deviceId, packageName)
      return { success: true, result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // ============================================================================
  // Prerequisites & Dependency Validation
  // ============================================================================

  ipcMain.handle(
    'prerequisites:validate:testCase',
    async (_, testCaseId: string) => {
      try {
        if (!dependencyValidator || !testCaseManager) {
          throw new Error('Managers not initialized')
        }

        const testCase = await testCaseManager.getTestCase(testCaseId)
        if (!testCase) {
          throw new Error(`Test case not found: ${testCaseId}`)
        }

        const allTestCases = await testCaseManager.getAllTestCases()
        const result = dependencyValidator.validateTestCase(testCase, allTestCases)

        return { success: true, result }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  ipcMain.handle(
    'prerequisites:validate:suite',
    async (_, suiteId: string) => {
      try {
        if (!dependencyValidator || !suiteManager || !testCaseManager) {
          throw new Error('Managers not initialized')
        }

        const suite = await suiteManager.getSuite(suiteId)
        if (!suite) {
          throw new Error(`Suite not found: ${suiteId}`)
        }

        const allTestCases = await testCaseManager.getAllTestCases()
        const result = dependencyValidator.validateSuite(suite, allTestCases)

        return { success: true, result }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  ipcMain.handle(
    'prerequisites:generateExecutionOrder',
    async (_, suiteId: string) => {
      try {
        if (!dependencyValidator || !suiteManager || !testCaseManager) {
          throw new Error('Managers not initialized')
        }

        const suite = await suiteManager.getSuite(suiteId)
        if (!suite) {
          throw new Error(`Suite not found: ${suiteId}`)
        }

        const allTestCases = await testCaseManager.getAllTestCases()
        const suiteTestCases = allTestCases.filter((tc) => suite.testCaseIds.includes(tc.id))
        const executionOrder = dependencyValidator.generateExecutionOrder(suiteTestCases, allTestCases)

        return { success: true, executionOrder }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  ipcMain.handle(
    'prerequisites:buildDependencyGraph',
    async (_, suiteId: string) => {
      try {
        if (!dependencyValidator || !suiteManager || !testCaseManager) {
          throw new Error('Managers not initialized')
        }

        const suite = await suiteManager.getSuite(suiteId)
        if (!suite) {
          throw new Error(`Suite not found: ${suiteId}`)
        }

        const allTestCases = await testCaseManager.getAllTestCases()
        const suiteTestCases = allTestCases.filter((tc) => suite.testCaseIds.includes(tc.id))
        const graph = dependencyValidator.buildDependencyGraph(suiteTestCases, allTestCases)

        return { success: true, graph }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  ipcMain.handle(
    'prerequisites:generateSuiteExecutionPlan',
    async (_, suiteId: string) => {
      try {
        if (!dependencyValidator || !suiteManager || !testCaseManager) {
          throw new Error('Managers not initialized')
        }

        const suite = await suiteManager.getSuite(suiteId)
        if (!suite) {
          throw new Error(`Suite not found: ${suiteId}`)
        }

        const allTestCases = await testCaseManager.getAllTestCases()
        const plan = dependencyValidator.generateSuiteExecutionPlan(suite, allTestCases)

        return { success: true, plan }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  ipcMain.handle(
    'prerequisites:autoFixDependencies',
    async (_, suiteId: string, fixType: 'add_missing' | 'reorder') => {
      try {
        if (!dependencyValidator || !suiteManager || !testCaseManager) {
          throw new Error('Managers not initialized')
        }

        const suite = await suiteManager.getSuite(suiteId)
        if (!suite) {
          throw new Error(`Suite not found: ${suiteId}`)
        }

        const allTestCases = await testCaseManager.getAllTestCases()

        if (fixType === 'add_missing') {
          // Find missing prerequisites
          const validation = dependencyValidator.validateSuite(suite, allTestCases)
          const missingIssue = validation.issues.find((i) => i.type === 'missing_in_suite')

          if (missingIssue && missingIssue.suggestedFix?.data?.testCaseIds) {
            // Add missing test cases to suite
            const updatedTestCaseIds = [
              ...suite.testCaseIds,
              ...missingIssue.suggestedFix.data.testCaseIds
            ]
            await suiteManager.updateSuite(suiteId, { testCaseIds: updatedTestCaseIds })
          }
        } else if (fixType === 'reorder') {
          // Reorder suite test cases
          const suiteTestCases = allTestCases.filter((tc) => suite.testCaseIds.includes(tc.id))
          const executionOrder = dependencyValidator.generateExecutionOrder(suiteTestCases, allTestCases)
          await suiteManager.updateSuite(suiteId, { testCaseIds: executionOrder })
        }

        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  ipcMain.handle('prerequisites:clearCache', async () => {
    try {
      if (!prerequisiteVerifier) {
        throw new Error('Prerequisite verifier not initialized')
      }

      prerequisiteVerifier.clearAllCache()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('prerequisites:getCacheStats', async () => {
    try {
      if (!prerequisiteVerifier) {
        throw new Error('Prerequisite verifier not initialized')
      }

      const stats = prerequisiteVerifier.getCacheStats()
      return { success: true, stats }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
}
