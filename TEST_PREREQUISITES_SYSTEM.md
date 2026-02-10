# Test Prerequisites System

## 🎯 Concepto: Dependencies & Reusable Setup

### Problem:
```
Muchos tests necesitan:
- Login previo
- Device setup (instalación, configuración)
- Estado específico (monedas, nivel, etc.)
- Navegación a pantalla específica

Sin prerequisites → Duplicación de código en cada test
```

### Solution:
```
Test Case Prerequisites:
1. Setup prerequisites (device + build)
2. Test case prerequisites (ejecutar otros tests primero)
3. State prerequisites (setup de estado de juego)
```

---

## 📦 **Data Model**

### Enhanced Test Case with Prerequisites

```typescript
interface TestCase {
  id: string
  name: string
  description: string
  type: TestResultType

  // === NEW: Prerequisites ===
  prerequisites?: {
    // 1. Setup Profile (device + build setup)
    setupProfile?: {
      enabled: boolean
      profileId: string              // Which setup profile to apply
      runBefore: 'this_test' | 'suite'  // When to run
    }

    // 2. Test Case Dependencies (run other tests first)
    testCases?: {
      enabled: boolean
      cases: PrerequisiteTestCase[]  // List of tests to run first
      mode: 'sequential' | 'any'     // All must pass OR any must pass
      cache: boolean                 // Cache results (don't re-run)
    }

    // 3. State Setup (custom setup steps)
    stateSetup?: {
      enabled: boolean
      steps: TestAction[]            // Custom setup actions
      cache: boolean
    }

    // 4. Cleanup After (optional)
    cleanupAfter?: {
      enabled: boolean
      steps: TestAction[]            // Run after test completes
    }
  }

  // Test actions
  actions: TestAction[]

  // ... existing fields
  tags: string[]
  createdAt: number
  updatedAt: number
}
```

### Prerequisite Test Case Reference

```typescript
interface PrerequisiteTestCase {
  testCaseId: string                 // Which test to run
  required: boolean                  // If fails, fail this test too?
  cache: boolean                     // Cache result for session?
  timeout?: number                   // Max time to wait
  retryOnFailure?: number            // Retry N times if fails
}
```

---

## 🔄 **Execution Flow with Prerequisites**

### Complete Flow

```
User: "Run Test Case: Purchase Flow"
    ↓
1. Check Prerequisites
    ↓
2. Setup Profile Prerequisite?
   YES → Apply setup profile (device + build)
    ↓
3. Test Case Prerequisites?
   YES → Execute prerequisite tests first
         ├─ Check if cached (skip if yes)
         ├─ Execute "Login Test" → ✓ Pass
         ├─ Execute "Navigate to Shop" → ✓ Pass
         └─ Cache results
    ↓
4. State Setup Prerequisite?
   YES → Execute state setup steps
         └─ unity.setPlayerCoins(1000)
    ↓
5. Execute Main Test
   → "Purchase Flow" actions
    ↓
6. Cleanup After?
   YES → Execute cleanup steps
    ↓
7. Report Results
   - Prerequisites: ✓ All passed
   - Main test: ✓ Passed
   - Total duration: 45s
```

---

## 🎨 **UI Design**

### Test Case Editor - Prerequisites Tab

```
┌─────────────────────────────────────────────────────┐
│  Test Case: Purchase 100 Coins                     │
│  [General] [Actions] [Prerequisites] [Assertions]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🔧 Prerequisites                                   │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 1. Setup Profile                               │ │
│  │    ☑ Apply setup profile before test          │ │
│  │                                                │ │
│  │    Profile: [Select ▼] Regression Setup       │ │
│  │    Run: ○ Before this test                    │ │
│  │         ● Once per suite                       │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 2. Test Case Dependencies                      │ │
│  │    ☑ Run other tests first                     │ │
│  │                                                │ │
│  │    Required Tests:                             │ │
│  │    ┌────────────────────────────────────────┐ │ │
│  │    │ ✓ Login Flow                            │ │ │
│  │    │   Required: Yes • Cache: Yes            │ │ │
│  │    │   [Edit] [Remove]                       │ │ │
│  │    └────────────────────────────────────────┘ │ │
│  │                                                │ │
│  │    ┌────────────────────────────────────────┐ │ │
│  │    │ ✓ Navigate to Shop Screen              │ │ │
│  │    │   Required: Yes • Cache: Yes            │ │ │
│  │    │   [Edit] [Remove]                       │ │ │
│  │    └────────────────────────────────────────┘ │ │
│  │                                                │ │
│  │    [+ Add Prerequisite Test]                   │ │
│  │                                                │ │
│  │    Mode: ● All must pass                       │ │
│  │          ○ Any must pass                       │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 3. State Setup                                 │ │
│  │    ☑ Run setup steps before test              │ │
│  │                                                │ │
│  │    Steps:                                      │ │
│  │    1. Unity: setPlayerCoins(1000)             │ │
│  │    2. Unity: unlockShop()                      │ │
│  │    3. Unity: setPlayerLevel(5)                 │ │
│  │                                                │ │
│  │    [+ Add Setup Step] [Edit]                   │ │
│  │    ☑ Cache state setup (don't re-run)         │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 4. Cleanup After Test                          │ │
│  │    ☑ Run cleanup steps after test             │ │
│  │                                                │ │
│  │    Steps:                                      │ │
│  │    1. Unity: resetPlayerCoins()                │ │
│  │    2. closeApp("com.company.game")             │ │
│  │                                                │ │
│  │    [+ Add Cleanup Step] [Edit]                 │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [Save]                              [Run Test]    │
└─────────────────────────────────────────────────────┘
```

### Add Prerequisite Test Dialog

```
┌─────────────────────────────────────────┐
│  Add Prerequisite Test                  │
├─────────────────────────────────────────┤
│  Select Test Case:                      │
│  ┌─────────────────────────────────┐   │
│  │ 🔍 Search tests...              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Available Tests:                       │
│  ┌─────────────────────────────────┐   │
│  │ ● Login Flow                    │   │
│  │   Tags: auth, smoke             │   │
│  │   Duration: ~5s                 │   │
│  │                                 │   │
│  │ ○ Navigate to Shop Screen       │   │
│  │   Tags: navigation              │   │
│  │   Duration: ~3s                 │   │
│  │                                 │   │
│  │ ○ Create Test Account           │   │
│  │   Tags: setup, data             │   │
│  │   Duration: ~8s                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Options:                               │
│  ☑ Required (fail if prerequisite fails)│
│  ☑ Cache result (run once per session) │
│  ☐ Retry on failure (3 times)          │
│                                         │
│  [Cancel]              [Add]            │
└─────────────────────────────────────────┘
```

---

## 🔧 **Implementation**

### Prerequisite Executor

```typescript
class PrerequisiteExecutor {
  private cache: Map<string, PrerequisiteResult> = new Map()

  async executePrerequisites(
    testCase: TestCase,
    deviceId: string,
    context: ExecutionContext
  ): Promise<PrerequisiteResult> {

    const results: PrerequisiteResult[] = []

    // 1. Setup Profile
    if (testCase.prerequisites?.setupProfile?.enabled) {
      const setupResult = await this.executeSetupProfile(
        testCase.prerequisites.setupProfile,
        deviceId,
        context
      )
      results.push(setupResult)

      if (!setupResult.success) {
        return this.failPrerequisites('Setup profile failed', results)
      }
    }

    // 2. Test Case Dependencies
    if (testCase.prerequisites?.testCases?.enabled) {
      const testCaseResults = await this.executePrerequisiteTests(
        testCase.prerequisites.testCases,
        deviceId,
        context
      )
      results.push(...testCaseResults)

      // Check if required prerequisites passed
      const requiredFailed = testCaseResults.some(
        r => r.required && !r.success
      )
      if (requiredFailed) {
        return this.failPrerequisites('Required prerequisite test failed', results)
      }

      // Check mode (all vs any)
      if (testCase.prerequisites.testCases.mode === 'sequential') {
        const allPassed = testCaseResults.every(r => r.success)
        if (!allPassed) {
          return this.failPrerequisites('Not all prerequisites passed', results)
        }
      }
    }

    // 3. State Setup
    if (testCase.prerequisites?.stateSetup?.enabled) {
      const stateResult = await this.executeStateSetup(
        testCase.prerequisites.stateSetup,
        deviceId,
        context
      )
      results.push(stateResult)

      if (!stateResult.success) {
        return this.failPrerequisites('State setup failed', results)
      }
    }

    return {
      success: true,
      message: 'All prerequisites passed',
      results,
      duration: results.reduce((sum, r) => sum + r.duration, 0)
    }
  }

  private async executeSetupProfile(
    config: SetupProfilePrerequisite,
    deviceId: string,
    context: ExecutionContext
  ): Promise<PrerequisiteResult> {

    const cacheKey = `setup_${config.profileId}_${deviceId}`

    // Check cache if run once per suite
    if (config.runBefore === 'suite' && this.cache.has(cacheKey)) {
      return {
        ...this.cache.get(cacheKey)!,
        cached: true
      }
    }

    const startTime = Date.now()

    try {
      const profile = await this.getSetupProfile(config.profileId)
      await this.deviceSetupManager.applyProfile(deviceId, profile.id)

      const result = {
        type: 'setup_profile',
        success: true,
        message: `Setup profile applied: ${profile.name}`,
        duration: Date.now() - startTime,
        cached: false
      }

      // Cache if needed
      if (config.runBefore === 'suite') {
        this.cache.set(cacheKey, result)
      }

      return result

    } catch (error) {
      return {
        type: 'setup_profile',
        success: false,
        error: String(error),
        duration: Date.now() - startTime,
        cached: false
      }
    }
  }

  private async executePrerequisiteTests(
    config: TestCasesPrerequisite,
    deviceId: string,
    context: ExecutionContext
  ): Promise<PrerequisiteResult[]> {

    const results: PrerequisiteResult[] = []

    for (const prereqTest of config.cases) {
      const cacheKey = `test_${prereqTest.testCaseId}_${deviceId}`

      // Check cache
      if (prereqTest.cache && this.cache.has(cacheKey)) {
        results.push({
          ...this.cache.get(cacheKey)!,
          cached: true
        })
        continue
      }

      // Execute test
      const startTime = Date.now()
      try {
        const testCase = await this.getTestCase(prereqTest.testCaseId)

        // Recursive: Execute prerequisites of prerequisites!
        if (testCase.prerequisites) {
          const nestedPrereqs = await this.executePrerequisites(
            testCase,
            deviceId,
            context
          )
          if (!nestedPrereqs.success) {
            throw new Error('Nested prerequisite failed')
          }
        }

        // Execute the prerequisite test
        const testResult = await this.testRunner.executeTestCase(
          deviceId,
          testCase
        )

        const result = {
          type: 'test_case',
          testCaseId: prereqTest.testCaseId,
          testCaseName: testCase.name,
          success: testResult.result === 'passed',
          required: prereqTest.required,
          duration: Date.now() - startTime,
          cached: false
        }

        // Cache if needed
        if (prereqTest.cache) {
          this.cache.set(cacheKey, result)
        }

        results.push(result)

      } catch (error) {
        results.push({
          type: 'test_case',
          testCaseId: prereqTest.testCaseId,
          success: false,
          required: prereqTest.required,
          error: String(error),
          duration: Date.now() - startTime,
          cached: false
        })
      }
    }

    return results
  }

  private async executeStateSetup(
    config: StateSetupPrerequisite,
    deviceId: string,
    context: ExecutionContext
  ): Promise<PrerequisiteResult> {

    const cacheKey = `state_${JSON.stringify(config.steps)}_${deviceId}`

    // Check cache
    if (config.cache && this.cache.has(cacheKey)) {
      return {
        ...this.cache.get(cacheKey)!,
        cached: true
      }
    }

    const startTime = Date.now()

    try {
      // Execute state setup steps
      for (const step of config.steps) {
        await this.testRunner.executeAction(deviceId, step)
      }

      const result = {
        type: 'state_setup',
        success: true,
        message: `State setup completed (${config.steps.length} steps)`,
        duration: Date.now() - startTime,
        cached: false
      }

      // Cache if needed
      if (config.cache) {
        this.cache.set(cacheKey, result)
      }

      return result

    } catch (error) {
      return {
        type: 'state_setup',
        success: false,
        error: String(error),
        duration: Date.now() - startTime,
        cached: false
      }
    }
  }

  // Clear cache (call between test suites)
  clearCache(): void {
    this.cache.clear()
  }
}
```

---

## 📊 **Execution Report with Prerequisites**

### Enhanced Report

```typescript
interface TestExecutionReport {
  testCaseId: string
  testCaseName: string

  // === NEW: Prerequisites Results ===
  prerequisites?: {
    executed: boolean
    success: boolean
    duration: number
    results: PrerequisiteResult[]
  }

  // Main test results
  result: 'passed' | 'failed' | 'error' | 'skipped'
  duration: number
  actions: ActionResult[]

  // ... existing fields
}
```

### Report Display

```
┌─────────────────────────────────────────────────────┐
│  Test Report: Purchase 100 Coins                   │
├─────────────────────────────────────────────────────┤
│  Status: ✓ PASSED                                   │
│  Total Duration: 23 seconds                         │
│                                                     │
│  🔧 Prerequisites (15 seconds)                      │
│  ┌───────────────────────────────────────────────┐ │
│  │ ✓ Setup Profile: Regression Setup (3s)        │ │
│  │   Cached from previous test                    │ │
│  │                                                │ │
│  │ ✓ Test: Login Flow (5s)                       │ │
│  │   Required • Executed fresh                    │ │
│  │                                                │ │
│  │ ✓ Test: Navigate to Shop (3s)                 │ │
│  │   Required • Executed fresh                    │ │
│  │                                                │ │
│  │ ✓ State Setup (4s)                            │ │
│  │   - setPlayerCoins(1000)                       │ │
│  │   - unlockShop()                               │ │
│  │   - setPlayerLevel(5)                          │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ⚡ Main Test (8 seconds)                          │
│  ✓ Tap "100 Coins Package" (0.3s)                 │
│  ✓ Tap "Purchase Button" (0.3s)                    │
│  ✓ Wait for confirmation (2.0s)                    │
│  ✓ Assert coins increased (0.5s)                   │
│  ✓ Assert purchase success message (0.5s)         │
│                                                     │
│  [View Details] [Export Report]                    │
└─────────────────────────────────────────────────────┘
```

### Failed Prerequisite Report

```
┌─────────────────────────────────────────────────────┐
│  Test Report: Purchase 100 Coins                   │
├─────────────────────────────────────────────────────┤
│  Status: ✗ SKIPPED (Prerequisite Failed)           │
│  Duration: 8 seconds                                │
│                                                     │
│  🔧 Prerequisites (8 seconds)                       │
│  ┌───────────────────────────────────────────────┐ │
│  │ ✓ Setup Profile: Regression Setup (3s)        │ │
│  │                                                │ │
│  │ ✗ Test: Login Flow (5s)                       │ │
│  │   Required • FAILED                            │ │
│  │   Error: Invalid credentials                   │ │
│  │   [View Details]                               │ │
│  │                                                │ │
│  │ ⊘ Test: Navigate to Shop                      │ │
│  │   Skipped due to previous failure              │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ⊘ Main Test - NOT EXECUTED                        │
│  Prerequisites must pass before running main test. │
│                                                     │
│  [Fix Prerequisites] [View Details]                │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 **Common Patterns**

### Pattern 1: Login Prerequisite (Most Common)

```typescript
// Reusable "Login" test case
{
  id: "test_login",
  name: "Login Flow",
  actions: [
    { type: 'tap', element: 'LoginButton' },
    { type: 'input', element: 'EmailField', value: 'test@test.com' },
    { type: 'input', element: 'PasswordField', value: 'Pass123!' },
    { type: 'tap', element: 'SubmitButton' },
    { type: 'assert_screen', screenName: 'HomeScreen' }
  ]
}

// Any test that needs login
{
  id: "test_purchase",
  name: "Purchase Flow",
  prerequisites: {
    testCases: {
      enabled: true,
      cases: [
        {
          testCaseId: "test_login",
          required: true,
          cache: true  // Don't re-login for every test!
        }
      ]
    }
  },
  actions: [
    // Purchase steps...
  ]
}
```

### Pattern 2: Fresh Install + Login

```typescript
{
  id: "test_first_purchase",
  name: "First Purchase After Install",
  prerequisites: {
    // Setup profile handles installation
    setupProfile: {
      enabled: true,
      profileId: "fresh_install_profile",
      runBefore: 'this_test'
    },
    // Then login
    testCases: {
      enabled: true,
      cases: [
        { testCaseId: "test_login", required: true, cache: false }
      ]
    },
    // Then give some coins to start
    stateSetup: {
      enabled: true,
      steps: [
        { type: 'unity_action', action: 'setPlayerCoins', args: ['100'] }
      ]
    }
  },
  actions: [
    // Purchase flow...
  ]
}
```

### Pattern 3: Navigation Prerequisites

```typescript
// Reusable navigation tests
const navigateToShop = {
  id: "nav_shop",
  name: "Navigate to Shop",
  actions: [
    { type: 'tap', element: 'MenuButton' },
    { type: 'tap', element: 'ShopButton' },
    { type: 'assert_screen', screenName: 'ShopScreen' }
  ]
}

const navigateToSettings = {
  id: "nav_settings",
  name: "Navigate to Settings",
  actions: [
    { type: 'tap', element: 'MenuButton' },
    { type: 'tap', element: 'SettingsButton' },
    { type: 'assert_screen', screenName: 'SettingsScreen' }
  ]
}

// Test that uses navigation
{
  id: "test_shop_filters",
  name: "Test Shop Filters",
  prerequisites: {
    testCases: {
      enabled: true,
      cases: [
        { testCaseId: "test_login", required: true, cache: true },
        { testCaseId: "nav_shop", required: true, cache: false }
      ]
    }
  },
  actions: [
    // Now we're at shop screen, test filters...
  ]
}
```

### Pattern 4: Data Setup Prerequisites

```typescript
{
  id: "test_level_up",
  name: "Level Up Flow",
  prerequisites: {
    testCases: {
      enabled: true,
      cases: [
        { testCaseId: "test_login", required: true, cache: true }
      ]
    },
    stateSetup: {
      enabled: true,
      cache: false,  // Don't cache, need fresh state each time
      steps: [
        // Setup player near level up
        { type: 'unity_action', action: 'setPlayerLevel', args: ['4'] },
        { type: 'unity_action', action: 'setPlayerXP', args: ['95'] },  // 5 XP to level up
        { type: 'unity_action', action: 'setPlayerCoins', args: ['1000'] }
      ]
    }
  },
  actions: [
    // Complete a task to gain 5 XP and level up...
  ]
}
```

### Pattern 5: Cleanup After Test

```typescript
{
  id: "test_payment_flow",
  name: "Payment Flow - Test Mode",
  prerequisites: {
    testCases: {
      enabled: true,
      cases: [
        { testCaseId: "test_login", required: true, cache: true }
      ]
    },
    stateSetup: {
      enabled: true,
      steps: [
        // Enable test payment mode
        { type: 'unity_action', action: 'enableTestPayments', args: [] }
      ]
    },
    // === CLEANUP ===
    cleanupAfter: {
      enabled: true,
      steps: [
        // Disable test payments after test
        { type: 'unity_action', action: 'disableTestPayments', args: [] },
        // Reset any test data
        { type: 'unity_action', action: 'resetTestTransactions', args: [] }
      ]
    }
  },
  actions: [
    // Test payment flow in test mode...
  ]
}
```

---

## 🔄 **Dependency Graph Visualization**

### UI: Show Test Dependencies

```
┌─────────────────────────────────────────────────────┐
│  Test Dependencies: Purchase Flow                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Execution Order:                                   │
│                                                     │
│  1. Setup Profile: Fresh Install                    │
│     ↓                                               │
│  2. Login Flow (prerequisite)                       │
│     ├─ Setup Profile: Device Config (nested)        │
│     └─ Actions: tap, input, submit                  │
│     ↓                                               │
│  3. Navigate to Shop (prerequisite)                 │
│     └─ Actions: tap menu, tap shop                  │
│     ↓                                               │
│  4. State Setup                                     │
│     └─ setPlayerCoins(1000)                         │
│     ↓                                               │
│  5. ⭐ Purchase Flow (main test)                    │
│     └─ Actions: select package, purchase, verify    │
│     ↓                                               │
│  6. Cleanup                                         │
│     └─ resetPlayerCoins()                           │
│                                                     │
│  Total Estimated Duration: ~25 seconds              │
│  - Prerequisites: ~15s                              │
│  - Main test: ~8s                                   │
│  - Cleanup: ~2s                                     │
│                                                     │
│  [Run Test] [Edit] [View Graph]                    │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 **Benefits**

### For Test Creation:
- ✅ **DRY Principle** - Write once, reuse everywhere
- ✅ **Modular tests** - Small, focused test cases
- ✅ **Realistic scenarios** - Match real user flows
- ✅ **Maintainability** - Change login once, affects all tests

### For Execution:
- ✅ **Caching** - Don't re-run expensive setup
- ✅ **Smart dependencies** - Only run what's needed
- ✅ **Clear failures** - Know which prerequisite failed
- ✅ **Performance** - Cached prerequisites save time

### For Organization:
- ✅ **Reusable components** - Build test library
- ✅ **Dependency tracking** - See what depends on what
- ✅ **Consistent setup** - All tests use same login
- ✅ **Easy refactoring** - Update prerequisite, all tests update

---

## 📊 **Performance Impact**

### Without Prerequisites (Duplicate Code)

```
Test 1: Purchase Flow
- Install build (3s)
- Login (5s)
- Navigate to shop (3s)
- Purchase (8s)
Total: 19s

Test 2: Apply Coupon
- Install build (3s)
- Login (5s)
- Navigate to shop (3s)
- Apply coupon (6s)
Total: 17s

Test 3: View Cart
- Install build (3s)
- Login (5s)
- Navigate to shop (3s)
- View cart (4s)
Total: 15s

TOTAL FOR 3 TESTS: 51 seconds
```

### With Prerequisites (Cached)

```
Test 1: Purchase Flow
- Setup profile (3s) ✓ Executed, cached
- Login prerequisite (5s) ✓ Executed, cached
- Navigate to shop (3s) ✓ Executed, cached
- Purchase (8s)
Total: 19s

Test 2: Apply Coupon
- Setup profile (0s) ✓ Cached
- Login prerequisite (0s) ✓ Cached
- Navigate to shop (0s) ✓ Cached
- Apply coupon (6s)
Total: 6s

Test 3: View Cart
- Setup profile (0s) ✓ Cached
- Login prerequisite (0s) ✓ Cached
- Navigate to shop (0s) ✓ Cached
- View cart (4s)
Total: 4s

TOTAL FOR 3 TESTS: 29 seconds (43% faster!)
```

---

## 🎯 **Implementation Plan**

### Phase 1: Core Prerequisites (Week 1)
```typescript
✅ Prerequisite data model
✅ PrerequisiteExecutor
✅ Caching system
✅ Setup profile prerequisites
✅ Test case prerequisites
```

### Phase 2: UI Integration (Week 2)
```typescript
✅ Prerequisites tab in test editor
✅ Add prerequisite dialog
✅ Dependency graph visualization
✅ Execution reports with prerequisites
```

### Phase 3: Advanced Features (Week 2-3)
```typescript
✅ Nested prerequisites (recursive)
✅ Cleanup after test
✅ State setup prerequisites
✅ Smart caching strategies
✅ Dependency validation
```

---

## ✅ **Summary**

### What This Enables:

**1. Reusable Test Components**
```
Login → Used by 20+ tests
Navigate to Shop → Used by 10+ tests
Setup Test Account → Used by 5+ tests
```

**2. Realistic Test Flows**
```
Install → Login → Navigate → Test Feature
(Matches real user experience)
```

**3. Maintainability**
```
Update "Login" once → All dependent tests updated
Change device setup → All tests use new setup
```

**4. Performance**
```
Cached prerequisites = 40-60% faster suite execution
```

---

**Status**: Design Complete ✅
**Ready for Implementation**: Prerequisites System
