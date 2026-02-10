# Dependency Validation & Resolution System

## 🎯 Principle: Smart Dependency Enforcement

### Rules:
1. **Prerequisites are OPTIONAL** - Not all tests need them
2. **Prerequisites are ENFORCED** - If defined, MUST be satisfied before execution
3. **Software DETECTS issues** - Flag dependency problems automatically
4. **Software PROPOSES solutions** - Auto-fix or suggest order

---

## ⚠️ **Problemas a Detectar**

### 1. Missing Prerequisite Test

```typescript
// Test Case A references Test B as prerequisite
// But Test B doesn't exist!

TestCase "Purchase Flow" {
  prerequisites: {
    testCases: ["test_login"]  // ← test_login doesn't exist!
  }
}

// ERROR: Prerequisite test not found
```

### 2. Circular Dependency

```typescript
// Test A depends on Test B
TestCase "Login Flow" {
  prerequisites: {
    testCases: ["navigate_home"]
  }
}

// Test B depends on Test A
TestCase "Navigate Home" {
  prerequisites: {
    testCases: ["login_flow"]  // ← Circular!
  }
}

// ERROR: Circular dependency detected
```

### 3. Wrong Execution Order

```typescript
// User tries to run Purchase Flow first
// But it requires Login Flow to run first

User: "Run Test: Purchase Flow"

Prerequisites: ["login_flow"]
Status: login_flow NOT executed yet

// WARNING: Prerequisites not satisfied
```

### 4. Missing Prerequisite in Suite

```typescript
// Test Suite has Purchase Flow
// But doesn't include Login Flow (prerequisite)

TestSuite "Shopping Tests" {
  tests: [
    "purchase_flow",      // Requires login_flow
    "apply_coupon",       // Requires login_flow
    "view_cart"           // Requires login_flow
  ]
}

// ERROR: Missing prerequisite tests in suite
```

### 5. Disabled/Archived Prerequisite

```typescript
TestCase "Purchase Flow" {
  prerequisites: {
    testCases: ["login_flow"]
  }
}

TestCase "Login Flow" {
  status: "archived"  // ← Can't use archived test!
}

// ERROR: Prerequisite test is disabled/archived
```

---

## 🔧 **Dependency Validator**

### Implementation

```typescript
class DependencyValidator {
  /**
   * Validate test case dependencies
   */
  async validateTestCase(testCase: TestCase): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (!testCase.prerequisites?.testCases?.enabled) {
      return { valid: true, errors: [], warnings: [] }
    }

    for (const prereq of testCase.prerequisites.testCases.cases) {
      // 1. Check if prerequisite exists
      const prereqTest = await this.getTestCase(prereq.testCaseId)
      if (!prereqTest) {
        errors.push({
          type: 'missing_prerequisite',
          testCaseId: testCase.id,
          prereqId: prereq.testCaseId,
          message: `Prerequisite test not found: ${prereq.testCaseId}`,
          severity: 'error'
        })
        continue
      }

      // 2. Check if prerequisite is active
      if (prereqTest.status === 'archived' || prereqTest.status === 'disabled') {
        errors.push({
          type: 'inactive_prerequisite',
          testCaseId: testCase.id,
          prereqId: prereq.testCaseId,
          message: `Prerequisite test is ${prereqTest.status}: ${prereqTest.name}`,
          severity: 'error'
        })
      }

      // 3. Check for circular dependencies
      const circular = await this.detectCircularDependency(
        testCase.id,
        prereq.testCaseId,
        new Set()
      )
      if (circular) {
        errors.push({
          type: 'circular_dependency',
          testCaseId: testCase.id,
          prereqId: prereq.testCaseId,
          chain: circular,
          message: `Circular dependency detected: ${circular.join(' → ')}`,
          severity: 'error'
        })
      }

      // 4. Check nested dependencies
      if (prereqTest.prerequisites?.testCases?.enabled) {
        const nestedValidation = await this.validateTestCase(prereqTest)
        if (!nestedValidation.valid) {
          warnings.push({
            type: 'nested_dependency_issue',
            testCaseId: testCase.id,
            prereqId: prereq.testCaseId,
            message: `Prerequisite has its own dependency issues: ${prereqTest.name}`,
            severity: 'warning'
          })
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Detect circular dependencies (recursive)
   */
  private async detectCircularDependency(
    startId: string,
    currentId: string,
    visited: Set<string>
  ): Promise<string[] | null> {
    if (visited.has(currentId)) {
      if (currentId === startId) {
        return [currentId]  // Circular!
      }
      return null
    }

    visited.add(currentId)

    const currentTest = await this.getTestCase(currentId)
    if (!currentTest?.prerequisites?.testCases?.enabled) {
      return null
    }

    for (const prereq of currentTest.prerequisites.testCases.cases) {
      const circular = await this.detectCircularDependency(
        startId,
        prereq.testCaseId,
        new Set(visited)
      )
      if (circular) {
        return [currentId, ...circular]
      }
    }

    return null
  }

  /**
   * Validate test suite dependencies
   */
  async validateTestSuite(suite: TestSuite): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    const suiteTestIds = new Set(suite.testCases.map(tc => tc.id))

    for (const testCase of suite.testCases) {
      if (!testCase.prerequisites?.testCases?.enabled) continue

      for (const prereq of testCase.prerequisites.testCases.cases) {
        // Check if prerequisite is in suite
        if (!suiteTestIds.has(prereq.testCaseId)) {
          errors.push({
            type: 'missing_prerequisite_in_suite',
            testCaseId: testCase.id,
            prereqId: prereq.testCaseId,
            message: `Prerequisite not in suite: ${prereq.testCaseId}`,
            severity: prereq.required ? 'error' : 'warning',
            solution: {
              type: 'add_to_suite',
              prereqId: prereq.testCaseId
            }
          })
        }
      }
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate execution order
   */
  async validateExecutionOrder(
    testCasesToRun: string[],
    executionContext: ExecutionContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const executedTests = new Set(executionContext.completedTests)

    for (let i = 0; i < testCasesToRun.length; i++) {
      const testId = testCasesToRun[i]
      const testCase = await this.getTestCase(testId)

      if (!testCase?.prerequisites?.testCases?.enabled) continue

      for (const prereq of testCase.prerequisites.testCases.cases) {
        // Check if prerequisite was already executed
        if (!executedTests.has(prereq.testCaseId)) {
          // Check if prerequisite is later in the list
          const prereqIndex = testCasesToRun.indexOf(prereq.testCaseId)

          if (prereqIndex === -1) {
            // Not in list at all
            errors.push({
              type: 'prerequisite_not_executed',
              testCaseId: testId,
              prereqId: prereq.testCaseId,
              message: `Prerequisite not executed: ${prereq.testCaseId}`,
              severity: 'error',
              solution: {
                type: 'run_prerequisite_first',
                prereqId: prereq.testCaseId
              }
            })
          } else if (prereqIndex > i) {
            // In list but after this test (wrong order)
            errors.push({
              type: 'wrong_execution_order',
              testCaseId: testId,
              prereqId: prereq.testCaseId,
              message: `Wrong order: ${prereq.testCaseId} should run before ${testId}`,
              severity: 'error',
              solution: {
                type: 'reorder',
                moveFrom: prereqIndex,
                moveTo: i
              }
            })
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    }
  }
}
```

---

## 🛠️ **Dependency Resolver**

### Auto-Fix Solutions

```typescript
class DependencyResolver {
  /**
   * Resolve test suite dependencies (auto-fix)
   */
  async resolveSuiteDependencies(
    suite: TestSuite
  ): Promise<ResolvedSuite> {
    const testMap = new Map<string, TestCase>()
    const allNeededTests = new Set<string>()

    // Load all test cases in suite
    for (const testCase of suite.testCases) {
      testMap.set(testCase.id, testCase)
      allNeededTests.add(testCase.id)
    }

    // Find all prerequisites (recursive)
    for (const testCase of suite.testCases) {
      await this.findAllPrerequisites(testCase.id, allNeededTests)
    }

    // Load missing prerequisites
    const missingTests: TestCase[] = []
    for (const testId of allNeededTests) {
      if (!testMap.has(testId)) {
        const testCase = await this.getTestCase(testId)
        if (testCase) {
          testMap.set(testId, testCase)
          missingTests.push(testCase)
        }
      }
    }

    // Topological sort (correct execution order)
    const orderedTests = this.topologicalSort(Array.from(testMap.values()))

    return {
      originalSuite: suite,
      resolvedTests: orderedTests,
      addedTests: missingTests,
      executionOrder: orderedTests.map(t => t.id)
    }
  }

  /**
   * Find all prerequisites recursively
   */
  private async findAllPrerequisites(
    testId: string,
    collected: Set<string>
  ): Promise<void> {
    const testCase = await this.getTestCase(testId)
    if (!testCase?.prerequisites?.testCases?.enabled) return

    for (const prereq of testCase.prerequisites.testCases.cases) {
      if (!collected.has(prereq.testCaseId)) {
        collected.add(prereq.testCaseId)
        // Recursive
        await this.findAllPrerequisites(prereq.testCaseId, collected)
      }
    }
  }

  /**
   * Topological sort - correct execution order
   */
  private topologicalSort(tests: TestCase[]): TestCase[] {
    const graph = new Map<string, string[]>()
    const inDegree = new Map<string, number>()

    // Build dependency graph
    for (const test of tests) {
      if (!graph.has(test.id)) {
        graph.set(test.id, [])
      }
      if (!inDegree.has(test.id)) {
        inDegree.set(test.id, 0)
      }

      if (test.prerequisites?.testCases?.enabled) {
        for (const prereq of test.prerequisites.testCases.cases) {
          if (!graph.has(prereq.testCaseId)) {
            graph.set(prereq.testCaseId, [])
          }
          graph.get(prereq.testCaseId)!.push(test.id)
          inDegree.set(test.id, (inDegree.get(test.id) || 0) + 1)
        }
      }
    }

    // Kahn's algorithm
    const queue: string[] = []
    const sorted: TestCase[] = []
    const testMap = new Map(tests.map(t => [t.id, t]))

    // Find all nodes with no incoming edges
    for (const [testId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(testId)
      }
    }

    while (queue.length > 0) {
      const testId = queue.shift()!
      const test = testMap.get(testId)
      if (test) {
        sorted.push(test)
      }

      for (const dependentId of graph.get(testId) || []) {
        inDegree.set(dependentId, inDegree.get(dependentId)! - 1)
        if (inDegree.get(dependentId) === 0) {
          queue.push(dependentId)
        }
      }
    }

    return sorted
  }

  /**
   * Quick fix for single test execution
   */
  async resolveTestExecution(
    testId: string,
    context: ExecutionContext
  ): Promise<ExecutionPlan> {
    const testCase = await this.getTestCase(testId)
    const testsToRun: string[] = []

    // Collect all prerequisites (in order)
    await this.collectPrerequisites(testId, testsToRun, new Set(), context)

    // Add main test
    testsToRun.push(testId)

    return {
      testId,
      executionOrder: testsToRun,
      prerequisites: testsToRun.slice(0, -1),
      mainTest: testId
    }
  }

  private async collectPrerequisites(
    testId: string,
    collected: string[],
    visited: Set<string>,
    context: ExecutionContext
  ): Promise<void> {
    if (visited.has(testId)) return
    visited.add(testId)

    const testCase = await this.getTestCase(testId)
    if (!testCase?.prerequisites?.testCases?.enabled) return

    for (const prereq of testCase.prerequisites.testCases.cases) {
      // Skip if already executed (cached)
      if (prereq.cache && context.completedTests.has(prereq.testCaseId)) {
        continue
      }

      // Recursive
      await this.collectPrerequisites(
        prereq.testCaseId,
        collected,
        visited,
        context
      )

      // Add to list
      if (!collected.includes(prereq.testCaseId)) {
        collected.push(prereq.testCaseId)
      }
    }
  }
}
```

---

## 🎨 **UI: Validation & Resolution**

### 1. Test Case Editor - Validation Warnings

```
┌─────────────────────────────────────────────────────┐
│  Test Case: Purchase Flow                          │
│  [General] [Actions] [Prerequisites] [Assertions]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⚠️ Dependency Issues Detected                      │
│  ┌───────────────────────────────────────────────┐ │
│  │ ❌ Missing Prerequisite                        │ │
│  │ Prerequisite "login_flow" not found            │ │
│  │                                                │ │
│  │ [Remove Prerequisite] [Create "login_flow"]   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ ⚠️ Nested Dependency Issue                     │ │
│  │ "navigate_shop" has unresolved dependencies    │ │
│  │                                                │ │
│  │ [View Details] [Fix Dependencies]             │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Prerequisites:                                     │
│  ... (rest of form) ...                             │
└─────────────────────────────────────────────────────┘
```

### 2. Before Test Execution - Dependency Check

```
User clicks "Run Test: Purchase Flow"
    ↓
┌─────────────────────────────────────────┐
│  ⚠️ Cannot Run Test                     │
├─────────────────────────────────────────┤
│  Prerequisites not satisfied:           │
│                                         │
│  Missing:                               │
│  • Login Flow (required)                │
│  • Navigate to Shop (required)          │
│                                         │
│  These tests have not been executed yet.│
│                                         │
│  Proposed Solution:                     │
│  Run tests in this order:               │
│  1. Login Flow                          │
│  2. Navigate to Shop                    │
│  3. Purchase Flow ⭐ (your test)        │
│                                         │
│  [Cancel] [Run All (Recommended)]       │
└─────────────────────────────────────────┘
```

### 3. Test Suite Validation

```
User creates/edits test suite
    ↓
┌─────────────────────────────────────────────────────┐
│  Test Suite: Shopping Tests                        │
├─────────────────────────────────────────────────────┤
│  ⚠️ Dependency Issues (3)                           │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ ❌ Missing Prerequisites in Suite              │ │
│  │                                                │ │
│  │ "Purchase Flow" requires:                      │ │
│  │ • Login Flow (not in suite)                    │ │
│  │                                                │ │
│  │ "Apply Coupon" requires:                       │ │
│  │ • Login Flow (not in suite)                    │ │
│  │ • Navigate to Shop (not in suite)              │ │
│  │                                                │ │
│  │ [Auto-Fix: Add Missing Tests]                  │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ ⚠️ Execution Order Issue                       │ │
│  │                                                │ │
│  │ Current order:                                 │ │
│  │ 1. Purchase Flow (requires Login)             │ │
│  │ 2. Login Flow                                  │ │
│  │ 3. View Cart                                   │ │
│  │                                                │ │
│  │ Suggested order:                               │ │
│  │ 1. Login Flow                                  │ │
│  │ 2. Purchase Flow                               │ │
│  │ 3. View Cart                                   │ │
│  │                                                │ │
│  │ [Auto-Reorder]                                 │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [Fix All Issues]                      [Save Suite]│
└─────────────────────────────────────────────────────┘
```

### 4. Auto-Fix Dialog

```
┌─────────────────────────────────────────┐
│  Fix Suite Dependencies                 │
├─────────────────────────────────────────┤
│  Proposed Changes:                      │
│                                         │
│  Add Missing Tests:                     │
│  ✓ Login Flow                           │
│  ✓ Navigate to Shop                     │
│  ✓ Setup Test Account                   │
│                                         │
│  Reorder Tests:                         │
│  1. Setup Test Account (new)            │
│  2. Login Flow (moved up)               │
│  3. Navigate to Shop (new)              │
│  4. Purchase Flow                       │
│  5. Apply Coupon                        │
│  6. View Cart                           │
│                                         │
│  Total tests: 3 → 6                     │
│  Estimated duration: +15 seconds        │
│                                         │
│  [Cancel]              [Apply Changes]  │
└─────────────────────────────────────────┘
```

### 5. Dependency Graph Visualization

```
┌─────────────────────────────────────────────────────┐
│  Dependency Graph: Shopping Tests                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│       ┌─────────────────┐                           │
│       │ Setup Account   │                           │
│       └────────┬────────┘                           │
│                │                                     │
│                ↓                                     │
│       ┌─────────────────┐                           │
│       │  Login Flow     │                           │
│       └────────┬────────┘                           │
│                │                                     │
│         ┌──────┴──────┐                             │
│         ↓             ↓                             │
│  ┌─────────────┐  ┌─────────────┐                  │
│  │ Navigate    │  │ View Cart   │                  │
│  │ to Shop     │  │             │                  │
│  └──────┬──────┘  └─────────────┘                  │
│         │                                           │
│    ┌────┴────┐                                      │
│    ↓         ↓                                      │
│ ┌────────┐ ┌────────┐                              │
│ │Purchase│ │ Coupon │                              │
│ │  Flow  │ │  Flow  │                              │
│ └────────┘ └────────┘                              │
│                                                     │
│  ✓ No circular dependencies                         │
│  ✓ Valid execution order                            │
│  6 tests total                                      │
│                                                     │
│  [Export Graph] [View Details]                     │
└─────────────────────────────────────────────────────┘
```

---

## 🚨 **Error Messages & Solutions**

### Error 1: Missing Prerequisite

```
❌ Cannot execute "Purchase Flow"

Prerequisite not found: "login_flow"

Solutions:
1. Create "login_flow" test case
2. Remove prerequisite from "Purchase Flow"
3. Use a different prerequisite

[Create Test] [Remove Prerequisite] [Change]
```

### Error 2: Circular Dependency

```
❌ Circular dependency detected

Dependency chain:
Login Flow → Navigate Home → Check Login → Login Flow

This creates an infinite loop and cannot be executed.

Solutions:
1. Remove one of the dependencies
2. Refactor tests to break the cycle

[View Chain] [Fix Dependencies]
```

### Error 3: Wrong Order

```
⚠️ Prerequisites not satisfied

Test: "Purchase Flow"
Requires: "Login Flow" (not executed yet)

Proposed Execution Order:
1. Login Flow (prerequisite)
2. Purchase Flow (your test)

[Run in Correct Order] [Cancel]
```

### Error 4: Missing in Suite

```
❌ Suite is incomplete

Test Suite: "Shopping Tests"

Missing Prerequisites:
• "Login Flow" - required by 3 tests
• "Navigate Shop" - required by 2 tests

Add these tests to complete the suite?

[Add Missing Tests] [Continue Anyway] [Cancel]
```

---

## 🔄 **Execution Flow with Validation**

### Complete Flow

```typescript
async runTest(testId: string): Promise<void> {
  // 1. Validate dependencies
  const validation = await this.validator.validateTestCase(testId)

  if (!validation.valid) {
    // Show errors to user
    const userChoice = await this.showValidationDialog(validation)

    if (userChoice === 'cancel') {
      return
    }

    if (userChoice === 'auto_fix') {
      // Resolve dependencies
      const plan = await this.resolver.resolveTestExecution(testId, this.context)

      // Show execution plan
      const confirmed = await this.showExecutionPlan(plan)
      if (!confirmed) return

      // Execute in correct order
      for (const prereqId of plan.prerequisites) {
        await this.executeTest(prereqId)
      }
    }
  }

  // 2. Execute test
  await this.executeTest(testId)
}
```

---

## ✅ **Benefits**

### For Users:
- ✅ **No manual tracking** - Software handles dependencies
- ✅ **Clear errors** - Understand what's wrong
- ✅ **Auto-fix** - One-click solutions
- ✅ **Prevents errors** - Can't run test without prerequisites

### For Test Suites:
- ✅ **Valid suites** - All prerequisites included
- ✅ **Correct order** - Auto-reorder for correct execution
- ✅ **Complete** - No missing tests

### For Maintenance:
- ✅ **Detect broken tests** - Find missing/archived prerequisites
- ✅ **Refactoring safe** - Update dependencies automatically
- ✅ **Circular detection** - Prevent infinite loops

---

## 🚀 **Implementation Plan**

### Phase 1: Validation (Week 1)
```typescript
✅ DependencyValidator
✅ Detect missing prerequisites
✅ Detect circular dependencies
✅ Detect wrong order
✅ Detect missing in suite
```

### Phase 2: Resolution (Week 1-2)
```typescript
✅ DependencyResolver
✅ Auto-fix missing prerequisites
✅ Topological sort (correct order)
✅ Execution plan generation
```

### Phase 3: UI Integration (Week 2)
```typescript
✅ Validation warnings in editor
✅ Error dialogs before execution
✅ Auto-fix dialogs
✅ Dependency graph visualization
```

---

## 📊 **Example Scenarios**

### Scenario 1: User Creates Test with Invalid Prerequisite

```
User: Creates "Purchase Flow"
User: Adds prerequisite "login_flow"
    ↓
System: Validates
System: ❌ "login_flow" not found
    ↓
UI: Shows warning in editor
UI: "Prerequisite not found. Create it?"
    ↓
User: Clicks "Create"
    ↓
System: Opens test creator with name "login_flow"
```

### Scenario 2: User Tries to Run Test Without Prerequisites

```
User: Clicks "Run: Purchase Flow"
    ↓
System: Checks prerequisites
System: Login Flow not executed
    ↓
UI: Shows dialog
    "Cannot run without Login Flow.
     Run Login Flow first?"
    ↓
User: Clicks "Run All"
    ↓
System: Executes Login Flow → Purchase Flow
```

### Scenario 3: User Creates Suite with Missing Tests

```
User: Creates suite with [Purchase, Coupon, Cart]
User: Clicks "Save Suite"
    ↓
System: Validates
System: ❌ Missing "Login Flow" (required by all 3)
    ↓
UI: Shows dialog
    "Suite incomplete. Add Login Flow?"
    ↓
User: Clicks "Auto-Fix"
    ↓
System: Adds Login Flow to suite
System: Reorders: [Login, Purchase, Coupon, Cart]
```

---

## 🎯 **Summary**

### Key Features:
1. **Validation** - Detect all dependency issues
2. **Resolution** - Auto-fix with user confirmation
3. **Prevention** - Can't run invalid tests
4. **Visualization** - See dependency graph
5. **Smart ordering** - Topological sort

### User Experience:
- **Clear errors** - Know what's wrong
- **Easy fixes** - One-click solutions
- **No confusion** - Software guides you
- **Fail-safe** - Can't break dependencies

---

**Status**: Design Complete ✅
**Integration with**: Prerequisites System
**Ready for Implementation**: Dependency Validation
