# Build Installation in Test Cases

## 🎯 Requirement: Build Management as Test Steps

### User Workflow:
```
1. Install build
2. Open the build
3. Begin testing with validation
```

This should be **part of the test case**, not just pre-setup.

---

## 📝 **Test Script Language: Build Commands**

### New Commands

```javascript
// .pgtest script format

test("Fresh Install - Login Flow") {
  type: MUST_PASS
  tags: ["installation", "login", "smoke"]

  steps: {
    // === NEW: Build Management Commands ===
    installBuild("/sdcard/Download/MyGame_v1.2.3.apk")
    wait(2000)  // Wait for installation
    launchApp("com.company.game")
    wait(3000)  // Wait for app launch

    // Validation after install
    assert.appIsRunning("com.company.game")
    assert.screenVisible("SplashScreen")

    // Continue with test
    tap("StartButton")
    input("EmailField", "test@example.com")
    tap("LoginButton")

    // Assertions
    assert.screenVisible("HomeScreen")
  }
}
```

### Command Set

```typescript
// Build Management Commands
installBuild(path: string)                    // Install APK from device path
installBuildFromDevice(packageName?: string)  // Scan & install (interactive)
uninstallApp(packageName: string)             // Uninstall app
clearAppData(packageName: string)             // Clear data
launchApp(packageName: string)                // Launch app
closeApp(packageName: string)                 // Force stop app
restartApp(packageName: string)               // Close + Launch

// Validation Commands
assert.appInstalled(packageName: string)      // Verify installed
assert.appVersion(packageName, version)       // Verify version
assert.appIsRunning(packageName: string)      // Verify running
assert.screenVisible(screenName: string)      // Verify screen (Unity SDK)
```

---

## 🎨 **Test Recorder Integration**

### Before Recording: Install Build

```
┌─────────────────────────────────────────────────────┐
│  Test Recorder                                      │
├─────────────────────────────────────────────────────┤
│  Device: Xiaomi POCO X3 Pro                         │
│                                                     │
│  📦 Build Setup                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ ○ Use currently installed app                 │ │
│  │ ● Install build before recording              │ │
│  │                                                │ │
│  │   [Scan Device for APKs]                      │ │
│  │                                                │ │
│  │   Selected: MyGame_v1.2.3.apk                 │ │
│  │   /sdcard/Download/MyGame_v1.2.3.apk          │ │
│  │   com.company.game • v1.2.3 • 45.2 MB         │ │
│  │                                                │ │
│  │   ☑ Record installation steps                 │ │
│  │   ☑ Record app launch                         │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [Start Recording]                                  │
└─────────────────────────────────────────────────────┘
```

### Recording Flow

```
User clicks "Start Recording"
    ↓
If "Install build" selected:
  1. ✓ Record: installBuild("/sdcard/Download/MyGame_v1.2.3.apk")
  2. Install APK (3-5 seconds)
  3. ✓ Record: wait(2000)
  4. ✓ Record: launchApp("com.company.game")
  5. Launch app
  6. ✓ Record: wait(3000)
    ↓
Now recording user interactions
  7. User taps button → Record: tap("ButtonName")
  8. User inputs text → Record: input("Field", "text")
  9. ...
    ↓
User clicks "Stop Recording"
    ↓
Generated test case includes installation steps!
```

---

## 📦 **Test Case Model Updates**

### Enhanced TestAction

```typescript
type TestAction =
  // Existing actions
  | { type: 'tap'; element: string; x?: number; y?: number }
  | { type: 'swipe'; direction: string; distance?: number }
  | { type: 'input'; element: string; value: string }
  | { type: 'wait'; duration: number }

  // === NEW: Build Management Actions ===
  | { type: 'install_build'; apkPath: string; packageName?: string }
  | { type: 'uninstall_app'; packageName: string }
  | { type: 'clear_app_data'; packageName: string }
  | { type: 'launch_app'; packageName: string }
  | { type: 'close_app'; packageName: string }
  | { type: 'restart_app'; packageName: string }

  // === NEW: Validation Actions ===
  | { type: 'assert_installed'; packageName: string }
  | { type: 'assert_version'; packageName: string; version: string }
  | { type: 'assert_running'; packageName: string }
  | { type: 'assert_screen'; screenName: string }

  // Existing...
  | { type: 'device_action'; action: DeviceActionType }
  | { type: 'unity_action'; action: string; args: string[] }
```

### Example Test Case

```typescript
{
  id: "test_123",
  name: "Fresh Install - Complete Onboarding",
  description: "Install app, complete onboarding, verify home screen",
  type: "MUST_PASS",

  actions: [
    // Install
    { type: 'install_build', apkPath: '/sdcard/Download/MyGame_v1.2.3.apk' },
    { type: 'wait', duration: 2000 },

    // Launch
    { type: 'launch_app', packageName: 'com.company.game' },
    { type: 'wait', duration: 3000 },

    // Validate
    { type: 'assert_running', packageName: 'com.company.game' },
    { type: 'assert_screen', screenName: 'SplashScreen' },

    // Onboarding
    { type: 'tap', element: 'AcceptButton' },
    { type: 'wait', duration: 1000 },
    { type: 'tap', element: 'NextButton' },
    { type: 'wait', duration: 1000 },
    { type: 'tap', element: 'StartButton' },
    { type: 'wait', duration: 2000 },

    // Final validation
    { type: 'assert_screen', screenName: 'HomeScreen' }
  ]
}
```

---

## 🔧 **TestRunner Execution**

### Enhanced Action Executor

```typescript
class TestRunner {
  async executeAction(
    deviceId: string,
    action: TestAction
  ): Promise<ActionResult> {

    switch (action.type) {
      // === NEW: Build Management ===

      case 'install_build':
        console.log(`Installing APK: ${action.apkPath}`)
        try {
          await this.adb.executeShellCommand(
            deviceId,
            `pm install -r -d "${action.apkPath}"`
          )

          // Extract package name if not provided
          if (!action.packageName) {
            const metadata = await this.extractAPKMetadata(deviceId, action.apkPath)
            action.packageName = metadata.packageName
          }

          return {
            success: true,
            message: `Installed ${action.packageName}`,
            duration: Date.now() - startTime
          }
        } catch (error) {
          return {
            success: false,
            error: `Installation failed: ${error}`,
            duration: Date.now() - startTime
          }
        }

      case 'uninstall_app':
        console.log(`Uninstalling: ${action.packageName}`)
        await this.adb.executeShellCommand(
          deviceId,
          `pm uninstall ${action.packageName}`
        )
        return { success: true, message: 'Uninstalled' }

      case 'launch_app':
        console.log(`Launching: ${action.packageName}`)
        await this.adb.executeShellCommand(
          deviceId,
          `monkey -p ${action.packageName} -c android.intent.category.LAUNCHER 1`
        )
        return { success: true, message: 'App launched' }

      case 'close_app':
        console.log(`Closing: ${action.packageName}`)
        await this.adb.executeShellCommand(
          deviceId,
          `am force-stop ${action.packageName}`
        )
        return { success: true, message: 'App closed' }

      case 'clear_app_data':
        console.log(`Clearing data: ${action.packageName}`)
        await this.adb.executeShellCommand(
          deviceId,
          `pm clear ${action.packageName}`
        )
        return { success: true, message: 'Data cleared' }

      case 'restart_app':
        console.log(`Restarting: ${action.packageName}`)
        // Close
        await this.adb.executeShellCommand(
          deviceId,
          `am force-stop ${action.packageName}`
        )
        await this.delay(1000)
        // Launch
        await this.adb.executeShellCommand(
          deviceId,
          `monkey -p ${action.packageName} -c android.intent.category.LAUNCHER 1`
        )
        return { success: true, message: 'App restarted' }

      // === NEW: Validation Assertions ===

      case 'assert_installed':
        const isInstalled = await this.isAppInstalled(deviceId, action.packageName)
        if (!isInstalled) {
          throw new Error(`App not installed: ${action.packageName}`)
        }
        return { success: true, message: 'App is installed' }

      case 'assert_version':
        const installedVersion = await this.getAppVersion(deviceId, action.packageName)
        if (installedVersion !== action.version) {
          throw new Error(`Version mismatch: expected ${action.version}, got ${installedVersion}`)
        }
        return { success: true, message: `Version ${action.version} confirmed` }

      case 'assert_running':
        const isRunning = await this.isAppRunning(deviceId, action.packageName)
        if (!isRunning) {
          throw new Error(`App not running: ${action.packageName}`)
        }
        return { success: true, message: 'App is running' }

      case 'assert_screen':
        // Requires Unity SDK
        if (!this.unityBridge) {
          throw new Error('Unity SDK required for screen assertions')
        }

        const currentScreen = await this.unityBridge.getCustomProperty('currentScreen')
        if (currentScreen !== action.screenName) {
          throw new Error(`Screen mismatch: expected ${action.screenName}, got ${currentScreen}`)
        }
        return { success: true, message: `On ${action.screenName}` }

      // ... existing actions (tap, swipe, etc.)
    }
  }

  // Helper methods
  private async isAppInstalled(deviceId: string, packageName: string): Promise<boolean> {
    const output = await this.adb.executeShellCommand(
      deviceId,
      `pm list packages | grep ${packageName}`
    )
    return output.includes(packageName)
  }

  private async getAppVersion(deviceId: string, packageName: string): Promise<string> {
    const output = await this.adb.executeShellCommand(
      deviceId,
      `dumpsys package ${packageName} | grep versionName`
    )
    const match = output.match(/versionName=([^\s]+)/)
    return match ? match[1] : 'unknown'
  }

  private async isAppRunning(deviceId: string, packageName: string): Promise<boolean> {
    const output = await this.adb.executeShellCommand(
      deviceId,
      `ps | grep ${packageName}`
    )
    return output.includes(packageName)
  }
}
```

---

## 🎨 **UI: Test Case Editor with Build Steps**

### Visual Test Case Editor

```
┌─────────────────────────────────────────────────────┐
│  Test Case: Fresh Install Login                    │
├─────────────────────────────────────────────────────┤
│  Actions:                               [+ Add Step]│
│                                                     │
│  1. 📦 Install Build                                │
│     Path: /sdcard/Download/MyGame_v1.2.3.apk       │
│     [Edit] [Remove] [↑] [↓]                        │
│                                                     │
│  2. ⏱️ Wait                                          │
│     Duration: 2000ms                                │
│     [Edit] [Remove] [↑] [↓]                        │
│                                                     │
│  3. 🚀 Launch App                                   │
│     Package: com.company.game                       │
│     [Edit] [Remove] [↑] [↓]                        │
│                                                     │
│  4. ⏱️ Wait                                          │
│     Duration: 3000ms                                │
│     [Edit] [Remove] [↑] [↓]                        │
│                                                     │
│  5. ✓ Assert App Running                           │
│     Package: com.company.game                       │
│     [Edit] [Remove] [↑] [↓]                        │
│                                                     │
│  6. 👆 Tap                                          │
│     Element: LoginButton                            │
│     [Edit] [Remove] [↑] [↓]                        │
│                                                     │
│  7. ⌨️ Input                                         │
│     Field: EmailField                               │
│     Value: test@example.com                         │
│     [Edit] [Remove] [↑] [↓]                        │
│                                                     │
│  ... (more steps)                                   │
│                                                     │
│  [Save Test Case]                     [Run Test]    │
└─────────────────────────────────────────────────────┘
```

### Add Step Dialog - Build Management

```
┌─────────────────────────────────────────┐
│  Add Step                               │
├─────────────────────────────────────────┤
│  Category:                              │
│  ● Build Management                     │
│  ○ Device Actions                       │
│  ○ Interactions                         │
│  ○ Assertions                           │
│  ○ Unity Actions                        │
│                                         │
│  Step Type:                             │
│  ● Install Build                        │
│  ○ Uninstall App                        │
│  ○ Launch App                           │
│  ○ Close App                            │
│  ○ Restart App                          │
│  ○ Clear App Data                       │
│                                         │
│  APK Path:                              │
│  ┌─────────────────────────────────┐   │
│  │ /sdcard/Download/MyGame.apk     │   │
│  └─────────────────────────────────┘   │
│  [Browse Device]                        │
│                                         │
│  [Cancel]              [Add Step]       │
└─────────────────────────────────────────┘
```

---

## 🔄 **Common Test Patterns**

### Pattern 1: Fresh Install Test

```javascript
test("Fresh Install - First Launch") {
  steps: {
    // Clean slate
    uninstallApp("com.company.game")
    wait(1000)

    // Install
    installBuild("/sdcard/Download/MyGame_v1.2.3.apk")
    wait(2000)

    // Launch
    launchApp("com.company.game")
    wait(3000)

    // Verify fresh install
    assert.appVersion("com.company.game", "1.2.3")
    assert.screenVisible("WelcomeScreen")

    // First-time onboarding
    tap("GetStartedButton")
    // ... rest of onboarding
  }
}
```

### Pattern 2: Update Test

```javascript
test("Update from v1.2.2 to v1.2.3") {
  steps: {
    // Install old version
    installBuild("/sdcard/Download/MyGame_v1.2.2.apk")
    wait(2000)
    launchApp("com.company.game")
    wait(3000)

    // Create some user data
    unity.executeAction("setPlayerCoins", ["1000"])
    unity.executeAction("setPlayerLevel", ["5"])
    closeApp("com.company.game")
    wait(1000)

    // Update to new version (without uninstall = data preserved)
    installBuild("/sdcard/Download/MyGame_v1.2.3.apk")
    wait(2000)
    launchApp("com.company.game")
    wait(3000)

    // Verify data preserved
    assert.appVersion("com.company.game", "1.2.3")
    unity.assertProperty("playerCoins", "1000")
    unity.assertProperty("playerLevel", "5")
  }
}
```

### Pattern 3: Clean Reinstall

```javascript
test("Reinstall - Data Migration") {
  steps: {
    // Uninstall completely
    uninstallApp("com.company.game")
    wait(1000)

    // Fresh install
    installBuild("/sdcard/Download/MyGame_v1.2.3.apk")
    wait(2000)
    launchApp("com.company.game")
    wait(3000)

    // Should show onboarding again
    assert.screenVisible("WelcomeScreen")
  }
}
```

### Pattern 4: Restart App Test

```javascript
test("Persistence After App Restart") {
  steps: {
    // Assuming app already installed
    launchApp("com.company.game")
    wait(3000)

    // Do something
    tap("SettingsButton")
    tap("EnableNotifications")
    closeApp("com.company.game")
    wait(2000)

    // Restart
    launchApp("com.company.game")
    wait(3000)

    // Verify settings persisted
    tap("SettingsButton")
    assert.toggleEnabled("EnableNotifications")
  }
}
```

---

## 📊 **Execution Report with Build Info**

### Enhanced Test Report

```typescript
interface TestExecutionReport {
  testCaseId: string
  testCaseName: string
  executedAt: number
  duration: number
  result: 'passed' | 'failed' | 'error'

  // === NEW: Build Info ===
  buildInfo?: {
    apkPath: string
    packageName: string
    version: string
    buildNumber: number
    installedAt: number
    installDuration: number
  }

  deviceInfo: DeviceInfo
  actions: ActionResult[]
  screenshots: Screenshot[]
  error?: string
}
```

### Report Display

```
┌─────────────────────────────────────────────────────┐
│  Test Report: Fresh Install Login                  │
├─────────────────────────────────────────────────────┤
│  Status: ✓ PASSED                                   │
│  Duration: 45 seconds                               │
│  Executed: 2026-02-07 14:30:00                      │
│                                                     │
│  📦 Build Information                               │
│  ┌───────────────────────────────────────────────┐ │
│  │ APK: MyGame_v1.2.3.apk                         │ │
│  │ Package: com.company.game                       │ │
│  │ Version: 1.2.3 (Build 42)                       │ │
│  │ Installed in: 3.2 seconds                       │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  📱 Device: Xiaomi POCO X3 Pro                      │
│                                                     │
│  ✓ Install Build (3.2s)                            │
│  ✓ Wait (2.0s)                                      │
│  ✓ Launch App (1.8s)                               │
│  ✓ Wait (3.0s)                                      │
│  ✓ Assert App Running (0.5s)                       │
│  ✓ Tap LoginButton (0.3s)                          │
│  ✓ Input EmailField (0.8s)                         │
│  ✓ Tap SubmitButton (0.3s)                         │
│  ✓ Assert Screen: HomeScreen (0.5s)               │
│                                                     │
│  [View Screenshots] [Export Report]                 │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 **Integration Summary**

### Three Levels of Build Management

| Level | Where | Purpose |
|-------|-------|---------|
| **1. Setup Profile** | Pre-suite setup | Configure device + install build once |
| **2. Test Case** | In test steps | Test installation, updates, fresh installs |
| **3. Manual** | Recorder UI | Quick install before recording |

### When to Use Each

**Setup Profile**:
```
Use when: Same build for entire suite
Example: Regression testing with specific version
```

**Test Case Steps**:
```
Use when: Testing installation itself
Example: Fresh install, update, reinstall scenarios
```

**Manual (Recorder)**:
```
Use when: Quick iteration during test creation
Example: Developer testing new features
```

---

## 🚀 **Implementation Plan**

### Phase 1: Build Commands (Week 1)
```typescript
✅ TestAction types (install, launch, etc.)
✅ TestRunner execution
✅ ADB command wrappers
✅ Validation assertions
```

### Phase 2: Recorder Integration (Week 1-2)
```typescript
✅ "Install build before recording" option
✅ Record installation steps
✅ Device APK scanner in recorder
✅ Auto-record launch
```

### Phase 3: Test Editor (Week 2)
```typescript
✅ Visual step editor
✅ Build management category
✅ Step reordering
✅ Validation step UI
```

### Phase 4: Reporting (Week 2-3)
```typescript
✅ Build info in reports
✅ Installation step results
✅ Enhanced error messages
```

---

## ✅ **Benefits**

### For Test Creation:
- ✅ **Complete test coverage** - Test installation itself
- ✅ **Fresh install testing** - Start from clean state
- ✅ **Update testing** - Test version migrations
- ✅ **Realistic scenarios** - Match real user experience

### For Automation:
- ✅ **Self-contained tests** - Each test manages its build
- ✅ **Version-specific testing** - Lock test to specific build
- ✅ **Reproducible** - Same build, same test, same result
- ✅ **CI/CD ready** - Fully automated from install to validation

### For QA Workflow:
- ✅ **Flexible** - Use at any level (setup, test, manual)
- ✅ **Fast** - Install in 3-5 seconds
- ✅ **Validated** - Assert installation success
- ✅ **Documented** - Build info in reports

---

**Status**: Design Complete ✅
**Ready for Implementation**: Build Commands + Test Case Integration
