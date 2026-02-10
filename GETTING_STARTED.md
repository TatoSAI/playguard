# Getting Started with PlayGuard

Quick guide to get PlayGuard up and running on your machine.

---

## 🎯 What You're Building

PlayGuard is an AI-powered automated testing tool for Unity mobile games. By the end of this guide, you'll have:

1. ✅ Desktop app running and detecting your Android device
2. ✅ Unity SDK integrated in a test project
3. ✅ Ready to start implementing recording/playback features

---

## 📋 Prerequisites

### Required

- [x] **Node.js 20+** - [Download](https://nodejs.org/)
- [x] **pnpm** - Package manager
  ```bash
  npm install -g pnpm
  ```
- [x] **Android SDK Platform Tools** (for ADB)
  - Windows: [Download from Android Developer](https://developer.android.com/tools/releases/platform-tools)
  - Mac: `brew install android-platform-tools`
  - Linux: `sudo apt-get install android-tools-adb`
- [x] **Unity 2021.3 LTS or higher** - [Download](https://unity.com/download)
- [x] **Android device** with USB debugging enabled

### Optional (for AI features)

- [ ] **Anthropic API Key** - [Get one here](https://console.anthropic.com/)

---

## 🚀 Step 1: Setup Android Device

### Enable USB Debugging

1. **Enable Developer Options**
   - Settings → About Phone
   - Tap "Build Number" **7 times**
   - You'll see "You are now a developer!"

2. **Enable USB Debugging**
   - Settings → System → Developer Options
   - Enable "USB debugging"

3. **Connect Device**
   - Connect phone to computer via USB
   - On phone, tap "Allow" when asked to authorize computer

4. **Verify Connection**
   ```bash
   adb devices
   ```

   You should see your device listed:
   ```
   List of devices attached
   ABC123456789    device
   ```

---

## 🚀 Step 2: Setup Electron App

### Install Dependencies

```bash
cd PlayGuard/electron-app
pnpm install
```

This will install ~200 packages (may take 2-3 minutes).

### Configure Environment (Optional)

For AI features, create `.env` file:

```bash
# In electron-app folder
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env
```

### Run Development Server

```bash
pnpm dev
```

The app should launch! You'll see:
- PlayGuard window opens
- DevTools opens automatically (in dev mode)
- "Devices" tab showing your connected Android device

**If device doesn't appear:**
1. Check `adb devices` in terminal
2. Click the refresh button in the app
3. Check console for error messages

---

## 🚀 Step 3: Setup Unity SDK

### Create Test Unity Project

1. Open Unity Hub
2. Create new project:
   - Template: **3D Core** or **Mobile 2D**
   - Name: **PlayGuard-Demo**
   - Location: Anywhere you like

### Import PlayGuard SDK

**Option A: Package Manager (Recommended)**

1. In Unity, go to `Window` → `Package Manager`
2. Click `+` → `Add package from disk...`
3. Navigate to `PlayGuard/unity-sdk`
4. Select `package.json`
5. Click `Open`

**Option B: Manual Copy**

1. Create `Packages` folder in your project (if it doesn't exist)
2. Copy entire `PlayGuard/unity-sdk` folder into `Packages`
3. Rename to `com.playguard.sdk`

### Verify Installation

In Unity:
1. Check console for: `[PlayGuard] Initialized successfully`
2. You should see a `PlayGuard Manager` GameObject in your scene

---

## 🚀 Step 4: Build & Test Connection

### Configure Unity Project for Android

1. **Switch Platform**
   - File → Build Settings
   - Select "Android"
   - Click "Switch Platform"

2. **Player Settings**
   - In Build Settings, click "Player Settings"
   - **Other Settings:**
     - Package Name: `com.yourcompany.playguarddemo`
     - Minimum API Level: 24 (Android 7.0) or higher
   - **Publishing Settings:**
     - Check "Development Build"

3. **Build APK**
   - File → Build Settings
   - Click "Build"
   - Save as `PlayGuardDemo.apk`

### Install & Test

```bash
# Install APK on device
adb install PlayGuardDemo.apk

# Launch game
adb shell am start -n com.yourcompany.playguarddemo/com.unity3d.player.UnityPlayerActivity
```

Game should launch on your device!

### Test ADB Bridge

```bash
# Forward port
adb forward tcp:5555 tcp:5555

# Send test command
echo '{"action":"ping"}' | adb shell "nc localhost 5555"
```

Check Unity console for log message.

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] `adb devices` shows your Android device
- [ ] PlayGuard desktop app launches successfully
- [ ] Desktop app shows your device in "Devices" tab
- [ ] Can click on device and see details
- [ ] Unity SDK imported without errors
- [ ] Unity game builds for Android
- [ ] Game installs and runs on device
- [ ] Unity console shows `[PlayGuard] Initialized successfully`

---

## 🎉 You're Ready!

### What You Can Do Now

**In Desktop App:**
- ✅ View connected devices
- ✅ See device details (model, Android version, resolution)

**In Unity:**
- ✅ SDK is running in your game
- ✅ ADB bridge is listening for commands

### What's Next

Now you can start implementing features:

1. **Record a Test**
   - Implement `InputRecorder` to capture taps
   - Send captured data to desktop app
   - Display in test editor

2. **Play a Test**
   - Send test JSON from desktop app
   - Unity SDK receives and executes
   - Report results back

3. **Add AI Features**
   - Smart wait detection
   - Element visual signatures
   - Auto-generated test descriptions

---

## 🐛 Troubleshooting

### Device Not Detected

**Problem:** `adb devices` shows no devices

**Solutions:**
1. Check USB cable (try different cable/port)
2. Enable USB debugging on device
3. Authorize computer on device prompt
4. Restart ADB: `adb kill-server && adb start-server`
5. Try `adb usb` to reset USB connection

---

### Electron App Won't Start

**Problem:** `pnpm dev` fails or app doesn't launch

**Solutions:**
1. Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules
   pnpm install
   ```

2. Check Node.js version:
   ```bash
   node --version  # Should be 20+
   ```

3. Check error messages in terminal

---

### Unity SDK Not Working

**Problem:** No `[PlayGuard]` logs in Unity console

**Solutions:**
1. Check SDK is imported (Package Manager)
2. Verify `PlayGuardManager` GameObject exists
3. Check "Development Build" is enabled
4. Look for error messages in console
5. Try restarting Unity

---

### ADB Bridge Connection Failed

**Problem:** Can't communicate between app and game

**Solutions:**
1. Check port forwarding:
   ```bash
   adb forward --list
   ```

2. Re-forward port:
   ```bash
   adb forward tcp:5555 tcp:5555
   ```

3. Check game is running on device
4. Check Unity console for connection logs
5. Try sending ping command to test

---

## 📚 Next Steps

1. **Read the Docs**
   - [PROJECT_PLAN.md](PROJECT_PLAN.md) - Full specification
   - [STATUS.md](STATUS.md) - Current progress
   - [electron-app/README.md](electron-app/README.md) - Desktop app details
   - [unity-sdk/README.md](unity-sdk/README.md) - SDK details

2. **Start Coding**
   - Pick a component from [STATUS.md](STATUS.md)
   - Check implementation details in [PROJECT_PLAN.md](PROJECT_PLAN.md)
   - Start with `InputRecorder` or Test Editor UI

3. **Join the Community**
   - (Coming soon: Discord, GitHub, etc.)

---

## 💬 Need Help?

- 📖 Check documentation in `docs/` folder
- 🐛 Report issues (Coming soon: GitHub Issues)
- 💬 Ask questions (Coming soon: Discord)

---

**Happy Testing! 🎮✈️**
