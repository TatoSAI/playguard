/**
 * Test Prerequisites System - Type Definitions
 *
 * Defines types for test case prerequisites and dependency management
 */

// ============================================================================
// Prerequisite Types
// ============================================================================

/**
 * Base prerequisite interface
 */
export interface BasePrerequisite {
  id: string
  type: PrerequisiteType
  name: string
  description?: string
  enabled: boolean
  timeout?: number
}

/**
 * Prerequisite type enumeration
 */
export type PrerequisiteType = 'setup_profile' | 'test_dependency' | 'state_setup' | 'cleanup'

/**
 * Setup Profile prerequisite - Apply device setup before test
 */
export interface SetupProfilePrerequisite extends BasePrerequisite {
  type: 'setup_profile'
  setupProfileId: string
}

/**
 * Test Dependency prerequisite - Run another test case first
 */
export interface TestDependencyPrerequisite extends BasePrerequisite {
  type: 'test_dependency'
  testCaseId: string
  useCache: boolean // If true, skip if already executed successfully
  cacheExpiry?: number // Cache validity in milliseconds (default: session)
}

/**
 * State Setup prerequisite - Custom actions to prepare device state
 */
export interface StateSetupPrerequisite extends BasePrerequisite {
  type: 'state_setup'
  actions: StateSetupAction[]
}

/**
 * Cleanup prerequisite - Actions to run after test (always executes)
 */
export interface CleanupPrerequisite extends BasePrerequisite {
  type: 'cleanup'
  actions: CleanupAction[]
}

/**
 * Union type for all prerequisite types
 */
export type Prerequisite =
  | SetupProfilePrerequisite
  | TestDependencyPrerequisite
  | StateSetupPrerequisite
  | CleanupPrerequisite

// ============================================================================
// Action Types
// ============================================================================

/**
 * State setup action - can be device action or Unity SDK call
 */
export interface StateSetupAction {
  id: string
  type: 'device_action' | 'unity_action' | 'adb_command'
  description?: string

  // For device_action
  deviceAction?: {
    action: string // e.g., 'airplane_mode_on', 'rotate_landscape'
    params?: Record<string, any>
  }

  // For unity_action
  unityAction?: {
    actionName: string
    args?: string[]
  }

  // For adb_command
  adbCommand?: {
    command: string
  }
}

/**
 * Cleanup action - similar to state setup but runs after test
 */
export interface CleanupAction {
  id: string
  type: 'device_action' | 'unity_action' | 'adb_command'
  description?: string
  alwaysRun: boolean // Run even if test fails

  deviceAction?: {
    action: string
    params?: Record<string, any>
  }

  unityAction?: {
    actionName: string
    args?: string[]
  }

  adbCommand?: {
    command: string
  }
}

// ============================================================================
// Execution Results
// ============================================================================

/**
 * Result of prerequisite execution
 */
export interface PrerequisiteExecutionResult {
  prerequisiteId: string
  success: boolean
  duration: number // milliseconds
  timestamp: number
  fromCache: boolean
  error?: string
  details?: string
}

/**
 * Cached prerequisite result
 */
export interface CachedPrerequisiteResult {
  prerequisiteId: string
  testCaseId: string
  result: PrerequisiteExecutionResult
  cachedAt: number
  expiresAt: number | null // null = session only
}

// ============================================================================
// Dependency Validation
// ============================================================================

/**
 * Dependency validation issue types
 */
export type DependencyIssueType =
  | 'missing_prerequisite_test'
  | 'circular_dependency'
  | 'wrong_execution_order'
  | 'missing_in_suite'
  | 'disabled_prerequisite'

/**
 * Dependency validation issue
 */
export interface DependencyIssue {
  type: DependencyIssueType
  severity: 'error' | 'warning'
  message: string
  affectedTestCaseIds: string[]
  suggestedFix?: DependencyIssueFix
}

/**
 * Suggested fix for dependency issue
 */
export interface DependencyIssueFix {
  type: 'add_to_suite' | 'reorder_suite' | 'remove_dependency' | 'enable_prerequisite'
  description: string
  autoApplicable: boolean
  data?: any // Additional data for applying the fix
}

/**
 * Validation result for a test case or suite
 */
export interface DependencyValidationResult {
  valid: boolean
  issues: DependencyIssue[]
  executionOrder?: string[] // Correct order if reordering needed
}

// ============================================================================
// Execution Plan
// ============================================================================

/**
 * Execution plan for a test case with prerequisites
 */
export interface PrerequisiteExecutionPlan {
  testCaseId: string
  prerequisites: Prerequisite[]
  executionOrder: string[] // Order of prerequisite IDs to execute
  estimatedDuration: number // milliseconds
  cacheablePrerequisites: string[] // Which ones can be cached
}

/**
 * Execution plan for a test suite
 */
export interface SuiteExecutionPlan {
  suiteId: string
  testCases: string[] // Ordered list of test case IDs
  totalPrerequisites: number
  estimatedDuration: number
  dependencyGraph: DependencyGraph
}

/**
 * Dependency graph node
 */
export interface DependencyGraphNode {
  testCaseId: string
  name: string
  prerequisites: string[] // Test case IDs this depends on
  dependents: string[] // Test cases that depend on this one
  depth: number // Depth in dependency tree
}

/**
 * Dependency graph
 */
export interface DependencyGraph {
  nodes: Record<string, DependencyGraphNode>
  edges: Array<{ from: string; to: string }>
  hasCycles: boolean
  cycles?: string[][] // List of cycles if any
}
