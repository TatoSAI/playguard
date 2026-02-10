// Core data models for PlayGuard test management system

import { Prerequisite } from './test-prerequisites'

// ============================================================================
// Test Suite Models
// ============================================================================

export type SuiteEnvironment = 'Development' | 'Staging' | 'Production' | 'Other'
export type TargetPlatform = 'Android' | 'iOS' | 'Web' | 'Cross-platform'

export interface TestSuite {
  id: string // Format: suite_timestamp
  name: string
  description?: string
  environment: SuiteEnvironment
  targetPlatform: TargetPlatform // Target platform for all tests in this suite
  tags: string[] // Tag IDs
  testCaseIds: string[] // Ordered list of test case IDs
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  metadata?: Record<string, any> // Extensible metadata
}

// ============================================================================
// Test Case Models
// ============================================================================

export type RecordingMode = 'coordinate' | 'element'

export interface TestCase {
  id: string // Format: test_001, test_002, etc.
  suiteId: string // MANDATORY: Parent suite ID
  name: string
  description: string
  tags: string[] // Tag IDs

  // Device Information
  recordingDevice: DeviceMetadata // Device used for recording
  recordingMode: RecordingMode // How test was recorded (coordinate or element-based)
  sdkVersion?: string // Unity SDK version if recorded with SDK

  // Prerequisites
  prerequisites?: Prerequisite[]

  // Test Steps
  steps: TestStep[]
  cleanup?: TestStep[]

  // Execution History
  executionHistory: TestExecution[]

  // Metadata
  version: string
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  variables?: Record<string, any> // Test variables for parameterization
}

export interface DeviceMetadata {
  id: string // Device ID
  model: string // Device model
  manufacturer: string // Device manufacturer
  androidVersion: string // Android OS version
  resolution: string // Screen resolution (e.g., "1080x2400")
  recordedAt: string // ISO timestamp when recorded
}

export type AssertType =
  | 'element_exists' // SDK: Check if element exists by path
  | 'element_active' // SDK: Check if element is active/interactable
  | 'text_equals' // SDK: Check if element text equals expected
  | 'text_contains' // SDK: Check if element text contains expected
  | 'screenshot_match' // No SDK: Visual comparison with reference screenshot

export interface AssertionConfig {
  type: AssertType
  target?: {
    elementPath?: string // For SDK assertions
    elementName?: string // For SDK assertions
    x?: number // For coordinate-based fallback
    y?: number // For coordinate-based fallback
  }
  expected?: any // Expected value (text, boolean, etc.)
  threshold?: number // For screenshot_match: similarity threshold (0-1), default 0.95
  timeout?: number // Max time to wait for assertion to pass (ms)
}

export type DeviceActionType =
  // Hardware buttons
  | 'press_back'
  | 'press_home'
  | 'press_volume_up'
  | 'press_volume_down'
  // Screen orientation
  | 'rotate_portrait'
  | 'rotate_landscape'
  | 'rotate_portrait_reverse'
  | 'rotate_landscape_reverse'
  | 'toggle_auto_rotate'
  // App lifecycle
  | 'background_app'
  | 'foreground_app'
  | 'force_stop_app'
  | 'clear_app_data'
  // Connectivity
  | 'toggle_wifi'
  | 'toggle_mobile_data'
  | 'toggle_airplane_mode'
  // Interruptions/Simulations
  | 'simulate_call'
  | 'simulate_notification'
  | 'simulate_low_battery'
  | 'simulate_memory_warning'

export interface TestStep {
  id: string
  type: 'tap' | 'swipe' | 'input' | 'wait' | 'assert' | 'screenshot' | DeviceActionType
  description: string // AI-fillable

  // Target specification (for tap, swipe, input, assert)
  target?: {
    method?: 'gameObject' | 'coordinate'
    value?: string // GameObject name or coordinate
    fallback?: {
      x: number
      y: number
    }
  }

  // Type-specific data
  data?: any
  value?: any

  // Assertion configuration (when type === 'assert')
  assertion?: AssertionConfig

  // Options
  options?: {
    waitBefore?: number // ms to wait before action
    waitAfter?: number // ms to wait after action
    screenshot?: boolean // Take screenshot after step
    clearFirst?: boolean // For input: clear field first
    timeout?: number // For wait/assert
  }

  // Test behavior controls
  expectedOutcome?: 'pass' | 'fail' // Expected outcome: 'pass' = positive test, 'fail' = negative test (default: 'pass')
  continueOnFailure?: boolean // If true, test continues even if this step fails (default: false)

  // Element metadata (when Unity SDK available)
  elementPath?: string
  elementName?: string
  elementType?: string

  // Screenshot storage (NEW: use screenshotPath for file-based storage)
  screenshotPath?: string // Relative path to screenshot file (e.g., "suite_xxx/test_001_step_1.png")
  screenshot?: string // DEPRECATED: base64 screenshot (kept for backward compatibility)

  // Additional properties
  [key: string]: any
}

// ============================================================================
// Test Execution Models
// ============================================================================

export type ExecutionStatus = 'passed' | 'failed' | 'error' | 'skipped'

export interface TestExecution {
  id: string // Format: exec_timestamp
  executedAt: string // ISO timestamp
  device: DeviceMetadata // Device used for execution
  status: ExecutionStatus
  duration: number // Execution time in milliseconds
  failureReason?: string // Reason if failed
  passageCriteria?: string // Why it passed (AI-generated or manual)
  steps: StepExecutionResult[]
  screenshots: string[] // Screenshot paths or base64 data
  logs?: string[] // Execution logs
}

export interface StepExecutionResult {
  stepId: string
  status: ExecutionStatus
  duration: number // milliseconds
  error?: string
  screenshot?: string
  timestamp: string // ISO timestamp
}

export interface TestResult {
  testId: string
  suiteId: string
  status: ExecutionStatus
  duration: number
  failureReason?: string
  passageCriteria?: string
  steps: StepExecutionResult[]
  screenshots: string[]
  logs?: string[]
  device: DeviceMetadata
  executedAt: string
}

export interface SuiteExecutionResult {
  suiteId: string
  suiteName: string
  executedAt: string
  device: DeviceMetadata
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  duration: number
  testResults: TestResult[]
}

// ============================================================================
// Tag Models
// ============================================================================

export type TagCategory = 'functional' | 'priority' | 'platform' | 'feature' | 'custom'

export interface Tag {
  id: string // Normalized tag name (e.g., "critical" → "critical")
  name: string // Display name
  color?: string // Hex color for UI (e.g., "#ef4444")
  description?: string // Tag purpose
  category?: TagCategory // Tag grouping
  usageCount: number // Number of suites/tests using this tag
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
}

// ============================================================================
// Settings Models
// ============================================================================

export interface AppSettings {
  version: string // Settings schema version
  ai: AISettings
  recording: RecordingSettings
  execution: ExecutionSettings
  ui: UISettings
}

export interface AISettings {
  enabled: boolean
  provider: 'anthropic' | 'openai' | 'custom'
  apiKey?: string // Encrypted storage
  apiKeySet: boolean // Whether key exists (for UI, don't expose actual key)
  model?: string // Model name (e.g., "claude-3-5-sonnet-20241022")
  autoFillFields: {
    testDescription: boolean
    stepDescription: boolean
    prerequisites: boolean
    tags: boolean
  }
  maxTokens?: number // Max tokens for AI responses
  temperature?: number // AI temperature (0-1)
}

export interface RecordingSettings {
  defaultEnvironment: SuiteEnvironment
  autoScreenshot: boolean // Auto-capture screenshots
  screenshotDelay: number // ms delay before screenshot
  coordinatePrecision: number // Decimal places for coordinates
}

export interface ExecutionSettings {
  defaultTimeout: number // ms timeout for actions
  retryOnFailure: boolean
  retryCount: number
  screenshotOnError: boolean
  verboseLogging: boolean
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto'
  defaultView: 'grid' | 'list'
  showThumbnails: boolean
}

// ============================================================================
// Recording Session Models (existing, for reference)
// ============================================================================

export interface RecordingSession {
  deviceId: string
  startTime: number
  actions: RecordedAction[]
  deviceInfo: {
    resolution: string
    model: string
  }
  mode: 'coordinate' | 'element'
  sdkConnected: boolean
}

export interface RecordedAction {
  type: 'tap' | 'swipe' | 'text' | 'wait' | 'screenshot'
  timestamp: number
  data: any
  screenshot?: Buffer | string // Buffer in backend, base64 string in frontend
  elementPath?: string
  elementName?: string
  elementType?: string
}

// ============================================================================
// Migration Models
// ============================================================================

export interface MigrationStatus {
  version: string // Current data version
  lastMigration?: string // ISO timestamp of last migration
  migrated: boolean
  backupPath?: string
}

// ============================================================================
// Type Guards
// ============================================================================

export function isTestSuite(obj: any): obj is TestSuite {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    ['Development', 'Staging', 'Production', 'Other'].includes(obj.environment) &&
    Array.isArray(obj.testCaseIds)
  )
}

export function isTestCase(obj: any): obj is TestCase {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.suiteId === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.steps)
  )
}

export function isTag(obj: any): obj is Tag {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.usageCount === 'number'
  )
}
