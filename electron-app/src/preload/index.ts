import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Device Management
  adb: {
    getDevices: () => ipcRenderer.invoke('adb:getDevices'),
    connect: (deviceId: string) => ipcRenderer.invoke('adb:connect', deviceId),
    disconnect: (deviceId: string) => ipcRenderer.invoke('adb:disconnect', deviceId),

    // App Lifecycle
    startApp: (deviceId: string, packageName: string, activityName?: string) =>
      ipcRenderer.invoke('adb:startApp', deviceId, packageName, activityName),
    stopApp: (deviceId: string, packageName: string) =>
      ipcRenderer.invoke('adb:stopApp', deviceId, packageName),
    clearAppData: (deviceId: string, packageName: string) =>
      ipcRenderer.invoke('adb:clearAppData', deviceId, packageName),
    isAppRunning: (deviceId: string, packageName: string) =>
      ipcRenderer.invoke('adb:isAppRunning', deviceId, packageName),
    isAppInstalled: (deviceId: string, packageName: string) =>
      ipcRenderer.invoke('adb:isAppInstalled', deviceId, packageName),

    // Crash Detection
    isAppCrashed: (deviceId: string, packageName: string) =>
      ipcRenderer.invoke('adb:isAppCrashed', deviceId, packageName),
    getCrashLog: (deviceId: string, packageName?: string) =>
      ipcRenderer.invoke('adb:getCrashLog', deviceId, packageName),
    clearLogcat: (deviceId: string) =>
      ipcRenderer.invoke('adb:clearLogcat', deviceId)
  },

  // Test Recording
  test: {
    startRecording: (deviceId: string) => ipcRenderer.invoke('test:startRecording', deviceId),
    stopRecording: () => ipcRenderer.invoke('test:stopRecording'),
    captureAction: (type: string, data: any) => ipcRenderer.invoke('test:captureAction', type, data),
    getRecordingState: () => ipcRenderer.invoke('test:getRecordingState'),
    run: (deviceId: string, testCase: any, suiteId?: string, suiteName?: string, testIndex?: number, totalTests?: number) =>
      ipcRenderer.invoke('test:run', deviceId, testCase, suiteId, suiteName, testIndex, totalTests),
    getExecutionState: () => ipcRenderer.invoke('test:getExecutionState')
  },

  // File Operations (Legacy - kept for backward compatibility)
  file: {
    saveTest: (testCase: any) => ipcRenderer.invoke('file:saveTest', testCase),
    loadTest: (filePath: string) => ipcRenderer.invoke('file:loadTest', filePath),
    listTests: () => ipcRenderer.invoke('file:listTests')
  },

  // Suite Management
  suite: {
    create: (suite: any) => ipcRenderer.invoke('suite:create', suite),
    get: (suiteId: string) => ipcRenderer.invoke('suite:get', suiteId),
    list: () => ipcRenderer.invoke('suite:list'),
    update: (suiteId: string, updates: any) => ipcRenderer.invoke('suite:update', suiteId, updates),
    delete: (suiteId: string, deleteTests: boolean) =>
      ipcRenderer.invoke('suite:delete', suiteId, deleteTests),
    duplicate: (suiteId: string) => ipcRenderer.invoke('suite:duplicate', suiteId),
    reorderTests: (suiteId: string, newOrder: string[]) =>
      ipcRenderer.invoke('suite:reorderTests', suiteId, newOrder),
    moveTest: (testId: string, fromSuite: string, toSuite: string, index?: number) =>
      ipcRenderer.invoke('suite:moveTest', testId, fromSuite, toSuite, index),
    run: (deviceId: string, suiteId: string, stopOnFirstFailure?: boolean) =>
      ipcRenderer.invoke('suite:run', deviceId, suiteId, stopOnFirstFailure)
  },

  // Test Case Management
  testCase: {
    create: (suiteId: string, testCase: any) =>
      ipcRenderer.invoke('testCase:create', suiteId, testCase),
    get: (suiteId: string, testId: string) =>
      ipcRenderer.invoke('testCase:get', suiteId, testId),
    list: (suiteId: string) => ipcRenderer.invoke('testCase:list', suiteId),
    update: (suiteId: string, testId: string, updates: any) =>
      ipcRenderer.invoke('testCase:update', suiteId, testId, updates),
    delete: (suiteId: string, testId: string) =>
      ipcRenderer.invoke('testCase:delete', suiteId, testId),
    move: (testId: string, fromSuite: string, toSuite: string) =>
      ipcRenderer.invoke('testCase:move', testId, fromSuite, toSuite),
    getExecutionHistory: (suiteId: string, testId: string, limit?: number) =>
      ipcRenderer.invoke('testCase:getExecutionHistory', suiteId, testId, limit)
  },

  // Tag Management
  tag: {
    create: (name: string, options?: any) => ipcRenderer.invoke('tag:create', name, options),
    list: () => ipcRenderer.invoke('tag:list'),
    update: (tagId: string, updates: any) => ipcRenderer.invoke('tag:update', tagId, updates),
    delete: (tagId: string) => ipcRenderer.invoke('tag:delete', tagId),
    search: (query: string) => ipcRenderer.invoke('tag:search', query),
    suggest: (context: string) => ipcRenderer.invoke('tag:suggest', context)
  },

  // Settings Management
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings),
    reset: () => ipcRenderer.invoke('settings:reset'),
    getSetting: (path: string) => ipcRenderer.invoke('settings:getSetting', path),
    setSetting: (path: string, value: any) => ipcRenderer.invoke('settings:setSetting', path, value),
    export: (filePath: string) => ipcRenderer.invoke('settings:export', filePath),
    import: (filePath: string) => ipcRenderer.invoke('settings:import', filePath)
  },

  // Secure Storage (API Keys)
  secure: {
    setAPIKey: (provider: string, key: string) =>
      ipcRenderer.invoke('secure:setAPIKey', provider, key),
    getAPIKey: (provider: string) => ipcRenderer.invoke('secure:getAPIKey', provider),
    hasAPIKey: (provider: string) => ipcRenderer.invoke('secure:hasAPIKey', provider),
    deleteAPIKey: (provider: string) => ipcRenderer.invoke('secure:deleteAPIKey', provider),
    listProviders: () => ipcRenderer.invoke('secure:listProviders')
  },

  // AI Integration
  ai: {
    generateDescription: (steps: any[]) =>
      ipcRenderer.invoke('ai:generateDescription', steps),
    generateStepDescription: (step: any, context: any[]) =>
      ipcRenderer.invoke('ai:generateStepDescription', step, context),
    suggestPrerequisites: (testCase: any) =>
      ipcRenderer.invoke('ai:suggestPrerequisites', testCase),
    suggestTags: (testCase: any, suite: any) =>
      ipcRenderer.invoke('ai:suggestTags', testCase, suite),
    analyzeFailure: (execution: any) => ipcRenderer.invoke('ai:analyzeFailure', execution)
  },

  // Script Parsing
  script: {
    parse: (content: string, format?: 'yaml' | 'typescript') =>
      ipcRenderer.invoke('script:parse', content, format),
    validate: (content: string, format?: 'yaml' | 'typescript') =>
      ipcRenderer.invoke('script:validate', content, format),
    toTestCase: (content: string, suiteId: string, metadata: any) =>
      ipcRenderer.invoke('script:toTestCase', content, suiteId, metadata),
    fromTestCase: (testCaseId: string, suiteId: string, format?: 'yaml' | 'typescript') =>
      ipcRenderer.invoke('script:fromTestCase', testCaseId, suiteId, format)
  },

  // Data Migration
  migration: {
    check: () => ipcRenderer.invoke('migration:check'),
    execute: () => ipcRenderer.invoke('migration:execute')
  },

  // Screenshot Management
  screenshot: {
    save: (suiteId: string, testId: string, stepId: string, base64Data: string) =>
      ipcRenderer.invoke('screenshot:save', suiteId, testId, stepId, base64Data),
    load: (relativePath: string) => ipcRenderer.invoke('screenshot:load', relativePath),
    delete: (suiteId: string, testId: string) =>
      ipcRenderer.invoke('screenshot:delete', suiteId, testId),
    getTotalSize: () => ipcRenderer.invoke('screenshot:getTotalSize')
  },

  // Report Management
  report: {
    getExecutions: (filters?: any) => ipcRenderer.invoke('report:getExecutions', filters),
    getStats: (filters?: any) => ipcRenderer.invoke('report:getStats', filters),
    getExecutionById: (id: string) => ipcRenderer.invoke('report:getExecutionById', id),
    exportToJSON: (outputPath: string, filters?: any) =>
      ipcRenderer.invoke('report:exportToJSON', outputPath, filters),
    clearHistory: () => ipcRenderer.invoke('report:clearHistory'),
    // Suite Session methods (NEW)
    recordSuiteSession: (session: any) => ipcRenderer.invoke('report:recordSuiteSession', session),
    getSessions: (filters?: any) => ipcRenderer.invoke('report:getSessions', filters),
    getSessionById: (id: string) => ipcRenderer.invoke('report:getSessionById', id),
    exportSessionToJSON: (sessionId: string, outputPath: string) =>
      ipcRenderer.invoke('report:exportSessionToJSON', sessionId, outputPath),
    clearSessions: () => ipcRenderer.invoke('report:clearSessions')
  },

  // Unity Custom Extensions (v2.0)
  unity: {
    listCustomProperties: () => ipcRenderer.invoke('unity:listCustomProperties'),
    listCustomActions: () => ipcRenderer.invoke('unity:listCustomActions'),
    listCustomCommands: () => ipcRenderer.invoke('unity:listCustomCommands'),
    getAvailableExtensions: () => ipcRenderer.invoke('unity:getAvailableExtensions'),
    getCustomProperty: (name: string) => ipcRenderer.invoke('unity:getCustomProperty', name),
    executeCustomAction: (name: string, args: string[]) =>
      ipcRenderer.invoke('unity:executeCustomAction', name, args),
    executeCustomCommand: (name: string, param: string) =>
      ipcRenderer.invoke('unity:executeCustomCommand', name, param)
  },

  // Device Setup Profiles
  setup: {
    getAllProfiles: () => ipcRenderer.invoke('setup:getAllProfiles'),
    getProfile: (id: string) => ipcRenderer.invoke('setup:getProfile', id),
    createProfile: (profile: any) => ipcRenderer.invoke('setup:createProfile', profile),
    updateProfile: (id: string, updates: any) =>
      ipcRenderer.invoke('setup:updateProfile', id, updates),
    deleteProfile: (id: string) => ipcRenderer.invoke('setup:deleteProfile', id),
    applyProfile: (deviceId: string, profileId: string) =>
      ipcRenderer.invoke('setup:applyProfile', deviceId, profileId),
    quickReset: (deviceId: string, packageName: string) =>
      ipcRenderer.invoke('setup:quickReset', deviceId, packageName)
  },

  // Prerequisites & Dependency Validation
  prerequisites: {
    validateTestCase: (testCaseId: string) =>
      ipcRenderer.invoke('prerequisites:validate:testCase', testCaseId),
    validateSuite: (suiteId: string) =>
      ipcRenderer.invoke('prerequisites:validate:suite', suiteId),
    generateExecutionOrder: (suiteId: string) =>
      ipcRenderer.invoke('prerequisites:generateExecutionOrder', suiteId),
    buildDependencyGraph: (suiteId: string) =>
      ipcRenderer.invoke('prerequisites:buildDependencyGraph', suiteId),
    generateSuiteExecutionPlan: (suiteId: string) =>
      ipcRenderer.invoke('prerequisites:generateSuiteExecutionPlan', suiteId),
    autoFixDependencies: (suiteId: string, fixType: 'add_missing' | 'reorder') =>
      ipcRenderer.invoke('prerequisites:autoFixDependencies', suiteId, fixType),
    clearCache: () =>
      ipcRenderer.invoke('prerequisites:clearCache'),
    getCacheStats: () =>
      ipcRenderer.invoke('prerequisites:getCacheStats')
  },

  // Event listeners
  on: {
    deviceAdded: (callback: (deviceInfo: any) => void) => {
      ipcRenderer.on('device:added', (_, deviceInfo) => callback(deviceInfo))
    },
    deviceRemoved: (callback: (deviceId: string) => void) => {
      ipcRenderer.on('device:removed', (_, deviceId) => callback(deviceId))
    },
    testProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('test:progress', (_, progress) => callback(progress))
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
