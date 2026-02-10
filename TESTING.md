# PlayGuard MVP - Testing Guide

## Overview

This guide walks through testing the complete PlayGuard MVP, from installation to recording and executing tests on a Unity mobile game.

---

## Prerequisites

### Software Requirements

- **Node.js** 18+ and **pnpm** installed
- **Unity** 2020.3+ (for creating test project)
- **Android Studio** (for ADB tools)
- **Android device** with USB debugging enabled
- **Windows/macOS/Linux** development machine

### Hardware Requirements

- Android device connected via USB
- USB cable with data transfer capability

---

## Part 1: Setting Up the Electron App

### 1.1 Install Dependencies

```bash
cd electron-app
pnpm install
```

This installs all required dependencies:
- Electron, React, TypeScript
- TailwindCSS, Shadcn/ui components
- adbkit (for device communication)
- Anthropic SDK, TensorFlow.js (for AI features)

### 1.2 Run the Electron App

```bash
pnpm dev
```

The PlayGuard application should launch with 5 tabs:
- **Devices**: Device connection management
- **Recorder**: Test recording interface
- **Test Runner**: Test execution interface
- **Test Editor**: Test editing (placeholder)
- **Reports**: Test reports (placeholder)

### 1.3 Verify ADB Connection

1. Connect your Android device via USB
2. Enable USB debugging on device (Settings → Developer Options)
3. Navigate to the **Devices** tab
4. You should see your device listed with:
   - Device name
   - Status (Connected/Disconnected)
   - Android version
   - Screen resolution

**Troubleshooting**:
- If no device appears, verify ADB is installed: `adb devices` in terminal
- Check USB cable supports data transfer
- Accept USB debugging prompt on device

---

## Part 2: Setting Up a Unity Test Project

### 2.1 Create a Simple Unity Test Project

1. Open Unity Hub
2. Create new project:
   - Template: **2D** or **3D** (your choice)
   - Name: `PlayGuard-Demo`
   - Unity version: 2020.3+ recommended

### 2.2 Create a Simple UI Scene

Create a test scene with basic UI elements:

**Canvas Setup**:
1. Right-click Hierarchy → UI → Canvas
2. Canvas Scaler: Scale with Screen Size (1080x1920)

**Add Test UI Elements**:
1. Button: `Button_Login` at position (0, 200)
2. InputField: `InputField_Email` at position (0, 50)
3. InputField: `InputField_Password` at position (0, -50)
4. Button: `Button_Submit` at position (0, -200)
5. Panel: `Panel_Welcome` (initially disabled)

### 2.3 Integrate PlayGuard Unity SDK

1. Copy the `unity-sdk` folder to your Unity project:
   ```
   PlayGuard-Demo/Packages/com.playguard.sdk/
   ```

2. Or install as local package:
   - Window → Package Manager
   - Add package from disk
   - Select `unity-sdk/package.json`

3. Create empty GameObject: `PlayGuard`

4. Add components:
   - Add `PlayGuardManager` component
   - Add `ADBBridge` component
   - Add `InputRecorder` component
   - Add `TestExecutor` component

5. The manager will auto-initialize all components on Start()

### 2.4 Build for Android

1. File → Build Settings
2. Switch platform to **Android**
3. Player Settings:
   - Company Name: YourCompany
   - Product Name: PlayGuardDemo
   - Package Name: com.yourcompany.playguarddemo
   - Minimum API Level: 24 (Android 7.0)

4. Build Settings:
   - Development Build: ✓ (enabled)
   - Script Debugging: ✓ (enabled)

5. Click **Build and Run**
6. Save APK as `PlayGuardDemo.apk`
7. App should install and run on connected device

---

## Part 3: Recording Your First Test

### 3.1 Start Recording

1. In PlayGuard app, go to **Recorder** tab
2. Select your connected device
3. Configure test:
   - Name: "Login Flow Test"
   - Description: "Test user login with valid credentials"
   - Tags: authentication, smoke, critical

4. Click **Start Recording** (red circle button)

### 3.2 Interact with the App

On your device, perform these actions:
1. Tap on `InputField_Email`
2. Enter "test@example.com" (use device keyboard)
3. Tap on `InputField_Password`
4. Enter "password123"
5. Tap on `Button_Submit`
6. Wait for welcome panel to appear (~2 seconds)

### 3.3 Review Recorded Actions

In the PlayGuard Recorder:
- You should see 5+ actions captured in real-time
- Each action shows:
  - Type (tap, input, swipe)
  - Description
  - Timestamp
  - Target element

### 3.4 Add Manual Actions (Optional)

Use the **Add Action** button to insert:
- **Wait**: Add 2-second wait after submit
- **Assert**: Verify "Panel_Welcome" exists

### 3.5 Save the Test

1. Review all recorded actions
2. Click **Save Test**
3. Test is saved to: `AppData/playguard/test-cases/test_<timestamp>.json`

---

## Part 4: Executing Tests

### 4.1 Navigate to Test Runner

1. Go to **Test Runner** tab
2. You should see your saved test in the list:
   - Name: "Login Flow Test"
   - Steps: 7
   - Tags: authentication, smoke, critical
   - Status: Not Run

### 4.2 Run a Single Test

1. Select your test from the list
2. Ensure correct device is selected
3. Click **Run Test** button

### 4.3 Monitor Execution

Watch the live execution view:
- Progress bar shows completion percentage
- Current step highlights in yellow
- Completed steps show green checkmarks
- Failed steps show red X marks
- Console logs show detailed execution info

**Expected behavior**:
- Test takes ~10-15 seconds to complete
- Each step executes with visual feedback on device
- All assertions should pass (green)
- Final status: **Passed**

### 4.4 Review Results

After execution:
- Status badge changes to "Passed" (green) or "Failed" (red)
- Duration shows total execution time
- Step details show individual timings
- Screenshots captured at key moments

### 4.5 Run Multiple Tests

1. Select multiple tests using checkboxes
2. Click **Run Selected Tests**
3. Tests execute sequentially
4. Progress bar shows overall completion

---

## Part 5: Verification Checklist

### Core Functionality

- [ ] **Device Detection**: Device appears in Devices tab
- [ ] **Device Connection**: Status shows "Connected"
- [ ] **Recording Start**: Can start recording session
- [ ] **Input Capture**: Taps are captured with correct coordinates
- [ ] **UI Detection**: GameObject names are detected correctly
- [ ] **Recording Stop**: Session stops and generates JSON
- [ ] **Test Save**: Test saves to file system
- [ ] **Test Load**: Saved test appears in Test Runner
- [ ] **Test Execution**: Test runs on device
- [ ] **Tap Simulation**: Taps trigger button clicks
- [ ] **Input Simulation**: Text appears in InputFields
- [ ] **Assertions**: GameObject existence checks work
- [ ] **Screenshots**: Images captured during execution
- [ ] **Test Completion**: Test reaches 100% and shows final status

### Expected Test JSON Structure

Your recorded test should look like:

```json
{
  "id": "test_1738712345678",
  "name": "Login Flow Test",
  "description": "Test user login with valid credentials",
  "version": "1.0",
  "tags": ["authentication", "smoke", "critical"],
  "createdAt": "2026-02-05T10:30:00.000Z",
  "updatedAt": "2026-02-05T10:30:00.000Z",
  "steps": [
    {
      "id": "step_1",
      "type": "tap",
      "description": "Tap on InputField_Email",
      "target": {
        "method": "gameObject",
        "value": "InputField_Email",
        "fallback": {
          "x": 0.5,
          "y": 0.52
        }
      },
      "options": {
        "screenshot": true,
        "waitBefore": 0.5,
        "waitAfter": 0.5
      }
    }
  ]
}
```

---

## Part 6: Testing Advanced Features

### 6.1 Test Variables

Create a test with variables:

```json
{
  "variables": {
    "email": "test@example.com",
    "password": "pass123"
  },
  "steps": [
    {
      "type": "input",
      "target": { "method": "gameObject", "value": "InputField_Email" },
      "value": "{{email}}"
    },
    {
      "type": "input",
      "target": { "method": "gameObject", "value": "InputField_Password" },
      "value": "{{password}}"
    }
  ]
}
```

Variables should be replaced at execution time.

### 6.2 Test Coordinate Fallbacks

If GameObject detection fails:
1. Rename a button in Unity to something random
2. Record a tap on that button
3. The fallback coordinates should still work
4. Test should pass using normalized coordinates

### 6.3 Test Swipe Gestures

1. Add a scrollable list to Unity scene
2. Record a swipe gesture
3. Verify swipe JSON includes:
   - Start position (normalized)
   - End position (normalized)
   - Duration

### 6.4 Test Assertions

Create tests with different assertion types:

**Element Exists**:
```json
{
  "type": "assert",
  "assertType": "elementExists",
  "target": "Panel_Welcome",
  "timeout": 5.0
}
```

**Element Active**:
```json
{
  "type": "assert",
  "assertType": "elementActive",
  "target": "Button_Login"
}
```

**Text Equals**:
```json
{
  "type": "assert",
  "assertType": "textEquals",
  "target": "Text_Welcome",
  "value": "Welcome, User!"
}
```

---

## Part 7: Troubleshooting

### Device Not Detected

**Symptoms**: No device in Devices tab

**Solutions**:
1. Verify ADB installed: `adb devices` in terminal
2. Check USB debugging enabled on device
3. Accept USB debugging authorization prompt
4. Try different USB cable
5. Restart ADB server: `adb kill-server && adb start-server`

### Recording Not Capturing Input

**Symptoms**: No actions appear during recording

**Solutions**:
1. Verify PlayGuardManager is active in Unity scene
2. Check InputRecorder component is enabled
3. Verify ADBBridge is running (check Unity logs)
4. Ensure development build with debugging enabled
5. Check device logs: `adb logcat -s Unity`

### Test Execution Fails

**Symptoms**: Test runs but steps fail

**Solutions**:
1. Verify GameObject names match exactly
2. Check normalized coordinates are within 0-1 range
3. Ensure UI elements are interactable
4. Add wait times between steps
5. Check Unity logs for assertion errors

### Taps Not Working

**Symptoms**: Taps execute but don't trigger UI

**Solutions**:
1. Verify EventSystem exists in scene
2. Check Canvas has GraphicRaycaster component
3. Ensure buttons are interactable
4. Verify normalized coordinates convert correctly
5. Test manually: `TestExecutor.SimulateTap(0.5f, 0.5f)`

### JSON Parsing Errors

**Symptoms**: Test won't load or execute

**Solutions**:
1. Validate JSON syntax with online validator
2. Check all required fields present
3. Verify coordinate values are 0-1 range
4. Ensure no trailing commas in JSON
5. Check UTF-8 encoding

---

## Part 8: Performance Testing

### 8.1 Measure Recording Overhead

1. Run game without PlayGuard SDK
2. Measure FPS (target: 60 FPS)
3. Enable PlayGuard recording
4. Measure FPS (should be: 58-60 FPS)
5. Recording overhead should be < 5%

### 8.2 Measure Execution Speed

1. Create test with 20 steps
2. Manual execution time: X seconds
3. Automated execution time: should be < X + 10 seconds
4. Per-step overhead should be < 0.5 seconds

### 8.3 Test Long Sessions

1. Record session with 50+ actions
2. Verify all actions captured
3. JSON file size should be < 50KB
4. Playback should complete without errors

---

## Part 9: Example Test Scenarios

### Scenario 1: Login Flow

**Steps**:
1. Tap login button
2. Enter email
3. Enter password
4. Tap submit
5. Wait for welcome panel
6. Assert welcome panel exists

**Expected Duration**: 8-12 seconds

### Scenario 2: Shop Purchase

**Steps**:
1. Tap shop button
2. Wait for shop to load
3. Tap item
4. Tap purchase button
5. Wait for purchase animation
6. Assert success popup
7. Close popup
8. Open inventory
9. Assert item in inventory

**Expected Duration**: 15-20 seconds

### Scenario 3: Settings Change

**Steps**:
1. Open settings
2. Toggle sound switch
3. Toggle music switch
4. Adjust volume slider
5. Save settings
6. Close settings
7. Reopen settings
8. Assert settings persisted

**Expected Duration**: 10-15 seconds

---

## Part 10: Next Steps

### MVP Complete ✅

Congratulations! You've successfully tested:
- Device connectivity
- Test recording with input capture
- Test execution with action simulation
- Assertions and validations
- Complete QA workflow

### Future Enhancements (Post-MVP)

1. **AI Visual Element Detection**: Use TensorFlow.js + Claude API for element recognition
2. **Web Dashboard**: Migrate from Electron to web app with authentication
3. **iOS Support**: Add iproxy communication for iOS devices
4. **Real Device Farm**: Cloud-based device testing
5. **Advanced Assertions**: Visual regression, performance metrics
6. **CI/CD Integration**: GitHub Actions, Jenkins plugins
7. **Test Scheduling**: Cron-based automated execution
8. **Multi-device Testing**: Parallel execution on device farm

---

## Support and Feedback

### Logs Location

- **Electron App Logs**: Check DevTools console (View → Toggle Developer Tools)
- **Unity Logs**: `adb logcat -s Unity` or Unity Editor console
- **Test Results**: `AppData/playguard/test-results/`

### Common Log Messages

**Success**:
```
[PlayGuard] Test Executor initialized
[PlayGuard] Started recording input
[PlayGuard] Recorded tap: Tap on Button_Login
[PlayGuard] ✓ Assertion passed: 'Panel_Welcome' exists
[PlayGuard] Test execution completed
```

**Errors**:
```
[PlayGuard] ✗ Assertion failed: 'Panel_Welcome' not found
[PlayGuard] GameObject 'Button_Login' not found
[PlayGuard] ADB connection lost
```

---

## Summary

This MVP demonstrates:
- ✅ Complete QA workflow from recording to execution
- ✅ USB/ADB device communication
- ✅ Multi-strategy element detection
- ✅ Normalized coordinates for resolution independence
- ✅ JSON-based test case format
- ✅ Real-time execution monitoring
- ✅ Comprehensive assertion system
- ✅ Zero-code test creation

**Ready for production QA teams!** 🚀
