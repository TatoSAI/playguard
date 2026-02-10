/**
 * PlayGuard Settings Type Definitions
 * Comprehensive configuration system for maximum customization
 */

// ==================== Recorder Settings ====================
export interface RecorderSettings {
  // Auto Screen Change Detection
  autoScreenChange: {
    enabled: boolean
    sensitivity: number // 0-100, threshold for detecting screen changes
    debounceMs: number // milliseconds to wait before capturing screen change
  }

  // Screenshot Capture
  screenshotQuality: number // 0-100, JPEG quality
  captureInterval: number // milliseconds between captures

  // Input Detection
  inputDetection: {
    tapDelay: number // ms to wait after tap before next action
    swipeMinDistance: number // pixels minimum for swipe detection
    longPressThreshold: number // ms for long press detection
  }
}

// ==================== Visual Testing Settings ====================
export interface VisualTestingSettings {
  // Screenshot Comparison
  screenshotSimilarity: {
    threshold: number // 0-1, percentage similarity required (e.g., 0.95 = 95%)
    algorithm: 'pixelmatch' | 'ssim' | 'mse'
    ignoreAntialiasing: boolean
    ignoreColors: boolean
  }

  // Visual Regression
  visualRegression: {
    enabled: boolean
    baselineUpdateMode: 'manual' | 'auto' | 'prompt'
    storageLocation: 'local' | 'cloud'
  }
}

// ==================== AI Features Settings ====================
export interface AISettings {
  // Provider Configuration
  provider: 'anthropic' | 'openai' | 'local'

  // Feature Toggles
  features: {
    autoDescriptions: boolean // Auto-generate test descriptions
    stepDescriptions: boolean // Auto-generate step descriptions
    tagSuggestions: boolean // AI-powered tag suggestions
    failureAnalysis: boolean // Analyze test failures
    testGeneration: boolean // Generate test cases from specs
  }

  // Model Configuration
  models: {
    descriptionModel: string // e.g., 'claude-sonnet-4-5'
    analysisModel: string // e.g., 'claude-opus-4-5'
    temperature: number // 0-1
    maxTokens: number
  }

  // Cost Controls
  costControls: {
    maxRequestsPerDay: number
    maxCostPerMonth: number // USD
    alertThreshold: number // % of monthly budget
  }
}

// ==================== Test Execution Settings ====================
export interface TestExecutionSettings {
  // Retry Logic
  retry: {
    enabled: boolean
    maxAttempts: number
    retryDelay: number // ms between retries
    retryOnErrors: string[] // error types to retry on
  }

  // Timeouts
  timeouts: {
    actionTimeout: number // ms to wait for actions
    elementTimeout: number // ms to wait for elements
    screenTimeout: number // ms to wait for screens
    testTimeout: number // ms max per test
  }

  // Error Handling
  errorHandling: {
    continueOnFailure: boolean
    captureScreenshotOnError: boolean
    captureLogcatOnError: boolean
    saveCrashReports: boolean
  }

  // Performance
  performance: {
    parallelExecution: boolean
    maxParallelTests: number
    warmupDelay: number // ms delay before first test
  }
}

// ==================== Reporting Settings ====================
export interface ReportingSettings {
  // Report Generation
  generation: {
    autoGenerate: boolean // Generate after each test run
    formats: ('html' | 'pdf' | 'json' | 'junit')[]
    includeScreenshots: boolean
    includeVideos: boolean
    includeLogs: boolean
  }

  // Report Storage
  storage: {
    location: string // path to save reports
    retentionDays: number // days to keep reports
    maxReports: number // max reports to keep
    autoCleanup: boolean
  }

  // Report Content
  content: {
    includeSystemInfo: boolean
    includeDeviceInfo: boolean
    includeEnvironmentVariables: boolean
    includeTimings: boolean
    includeMetrics: boolean
  }
}

// ==================== Integration Settings ====================
export interface IntegrationSettings {
  // Jira Integration
  jira: {
    enabled: boolean
    baseUrl: string
    projectKey: string
    issueType: string // e.g., 'Bug'
    defaultPriority: string
    defaultComponents: string[]
    autoCreateIssues: boolean // Auto-create on test failure
    attachScreenshots: boolean
    attachLogs: boolean
  }

  // Slack Integration
  slack: {
    enabled: boolean
    webhookUrl: string
    channel: string
    notifications: {
      testStart: boolean
      testComplete: boolean
      testFailure: boolean
      suiteComplete: boolean
    }
    mentionOnFailure: string[] // user IDs to mention
    includeScreenshots: boolean
  }

  // GitHub Integration
  github: {
    enabled: boolean
    repository: string // owner/repo
    autoCreateIssues: boolean
    labels: string[]
  }

  // Custom Webhooks
  webhooks: {
    enabled: boolean
    endpoints: WebhookEndpoint[]
  }
}

export interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: ('test_start' | 'test_end' | 'test_failure' | 'suite_complete')[]
  headers: Record<string, string>
  enabled: boolean
}

// ==================== Unity SDK Settings ====================
export interface UnitySDKSettings {
  // Connection
  connection: {
    port: number // TCP port for Unity SDK (default: 12345)
    timeout: number // ms connection timeout
    autoConnect: boolean
    autoPortForward: boolean // Auto setup ADB port forwarding
  }

  // Custom Events
  customEvents: {
    enabled: boolean
    definitions: CustomEventDefinition[]
  }

  // Element Detection
  elementDetection: {
    searchDepth: number // max hierarchy depth to search
    includeInactive: boolean // include inactive GameObjects
    cacheElements: boolean // cache element tree
    cacheTimeout: number // ms before refreshing cache
  }
}

export interface CustomEventDefinition {
  id: string
  name: string
  description: string
  category: string
  icon?: string
  parameters: CustomEventParameter[]
  color?: string // hex color for UI
}

export interface CustomEventParameter {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'select'
  required: boolean
  defaultValue?: any
  options?: string[] // for select type
  validation?: string // regex pattern
  description?: string
}

// ==================== Custom Steps Settings ====================
export interface CustomStepsSettings {
  enabled: boolean
  definitions: CustomStepDefinition[]
  allowUserSteps: boolean // Allow users to define custom steps
}

export interface CustomStepDefinition {
  id: string
  name: string
  description: string
  category: 'action' | 'assertion' | 'wait' | 'utility'
  icon?: string
  parameters: CustomStepParameter[]
  implementation?: string // JavaScript code for execution
  sdkCommand?: string // Unity SDK command to execute
  color?: string
}

export interface CustomStepParameter {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'element' | 'coordinate'
  required: boolean
  defaultValue?: any
  options?: string[] // for select type
  validation?: string
  description?: string
  placeholder?: string
}

// ==================== Developer Settings ====================
export interface DeveloperSettings {
  // Debug Mode
  debug: {
    enabled: boolean
    verboseLogging: boolean
    logToFile: boolean
    logFilePath: string
    showDevTools: boolean
  }

  // Advanced Features
  advanced: {
    enableExperimentalFeatures: boolean
    allowUnsafeOperations: boolean
    customADBPath?: string
    customSDKPath?: string
  }

  // Data Management
  data: {
    autoBackup: boolean
    backupInterval: number // hours
    backupLocation: string
    maxBackups: number
  }
}

// ==================== Main Settings Interface ====================
export interface PlayGuardSettings {
  // Version for migration support
  version: string

  // Core Settings
  recorder: RecorderSettings
  visualTesting: VisualTestingSettings
  ai: AISettings
  testExecution: TestExecutionSettings
  reporting: ReportingSettings
  integrations: IntegrationSettings
  unitySDK: UnitySDKSettings
  customSteps: CustomStepsSettings
  developer: DeveloperSettings

  // UI Preferences
  ui: {
    theme: 'light' | 'dark' | 'system'
    language: string
    dateFormat: string
    timeFormat: '12h' | '24h'
  }
}

// ==================== Default Settings ====================
export const DEFAULT_SETTINGS: PlayGuardSettings = {
  version: '1.0.0',

  recorder: {
    autoScreenChange: {
      enabled: true,
      sensitivity: 75,
      debounceMs: 500
    },
    screenshotQuality: 90,
    captureInterval: 100,
    inputDetection: {
      tapDelay: 300,
      swipeMinDistance: 50,
      longPressThreshold: 500
    }
  },

  visualTesting: {
    screenshotSimilarity: {
      threshold: 0.95,
      algorithm: 'pixelmatch',
      ignoreAntialiasing: true,
      ignoreColors: false
    },
    visualRegression: {
      enabled: false,
      baselineUpdateMode: 'manual',
      storageLocation: 'local'
    }
  },

  ai: {
    provider: 'anthropic',
    features: {
      autoDescriptions: true,
      stepDescriptions: true,
      tagSuggestions: true,
      failureAnalysis: true,
      testGeneration: false
    },
    models: {
      descriptionModel: 'claude-sonnet-4-5-20250929',
      analysisModel: 'claude-opus-4-5-20251101',
      temperature: 0.7,
      maxTokens: 2000
    },
    costControls: {
      maxRequestsPerDay: 1000,
      maxCostPerMonth: 100,
      alertThreshold: 80
    }
  },

  testExecution: {
    retry: {
      enabled: true,
      maxAttempts: 3,
      retryDelay: 2000,
      retryOnErrors: ['timeout', 'element_not_found', 'network_error']
    },
    timeouts: {
      actionTimeout: 5000,
      elementTimeout: 10000,
      screenTimeout: 15000,
      testTimeout: 300000
    },
    errorHandling: {
      continueOnFailure: false,
      captureScreenshotOnError: true,
      captureLogcatOnError: true,
      saveCrashReports: true
    },
    performance: {
      parallelExecution: false,
      maxParallelTests: 3,
      warmupDelay: 1000
    }
  },

  reporting: {
    generation: {
      autoGenerate: true,
      formats: ['html', 'json'],
      includeScreenshots: true,
      includeVideos: false,
      includeLogs: true
    },
    storage: {
      location: '',
      retentionDays: 30,
      maxReports: 100,
      autoCleanup: true
    },
    content: {
      includeSystemInfo: true,
      includeDeviceInfo: true,
      includeEnvironmentVariables: false,
      includeTimings: true,
      includeMetrics: true
    }
  },

  integrations: {
    jira: {
      enabled: false,
      baseUrl: '',
      projectKey: '',
      issueType: 'Bug',
      defaultPriority: 'Medium',
      defaultComponents: [],
      autoCreateIssues: false,
      attachScreenshots: true,
      attachLogs: true
    },
    slack: {
      enabled: false,
      webhookUrl: '',
      channel: '#playguard',
      notifications: {
        testStart: false,
        testComplete: false,
        testFailure: true,
        suiteComplete: true
      },
      mentionOnFailure: [],
      includeScreenshots: true
    },
    github: {
      enabled: false,
      repository: '',
      autoCreateIssues: false,
      labels: ['bug', 'playguard']
    },
    webhooks: {
      enabled: false,
      endpoints: []
    }
  },

  unitySDK: {
    connection: {
      port: 12345,
      timeout: 5000,
      autoConnect: true,
      autoPortForward: true
    },
    customEvents: {
      enabled: true,
      definitions: []
    },
    elementDetection: {
      searchDepth: 10,
      includeInactive: false,
      cacheElements: true,
      cacheTimeout: 5000
    }
  },

  customSteps: {
    enabled: true,
    definitions: [],
    allowUserSteps: true
  },

  developer: {
    debug: {
      enabled: false,
      verboseLogging: false,
      logToFile: false,
      logFilePath: '',
      showDevTools: false
    },
    advanced: {
      enableExperimentalFeatures: false,
      allowUnsafeOperations: false
    },
    data: {
      autoBackup: true,
      backupInterval: 24,
      backupLocation: '',
      maxBackups: 10
    }
  },

  ui: {
    theme: 'system',
    language: 'en',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h'
  }
}

// ==================== Settings Update Types ====================
export type SettingsUpdate = Partial<PlayGuardSettings>

export interface SettingsValidationError {
  path: string
  message: string
}

export interface SettingsValidationResult {
  valid: boolean
  errors: SettingsValidationError[]
}
