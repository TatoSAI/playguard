# PlayGuard 🎮🛡️

> **AI-Powered Automated Testing for Unity Mobile Games**

PlayGuard enables QA teams and developers to create automated tests for Unity mobile games without writing code. Test your game directly on Android/iOS devices with zero performance impact in production builds.

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Unity](https://img.shields.io/badge/Unity-2021.3%2B-blue)](https://unity.com/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/TatoSAI/playguard)

## ✨ Key Features

- **🎯 Zero Configuration** - Add SDK to GameObject and start testing
- **📱 Device-Based Testing** - Tests run on real Android/iOS devices via USB
- **⚡ Zero Performance Impact** - Only active in Development builds
- **🎮 UI Canvas Inspection** - Full hierarchy access for element-based testing
- **🔌 Extensibility System** - Expose game state and custom actions
- **🤖 AI Integration** - Intelligent test generation and maintenance
- **📊 Visual Reports** - Detailed test execution history with screenshots

## 🚀 Quick Start

### For QA Teams

1. **Download PlayGuard Desktop App**
   - Download the latest release from [Releases](https://github.com/TatoSAI/playguard/releases)
   - Install and launch the application

2. **Connect Your Device**
   ```bash
   # Enable USB debugging on your Android device
   # Connect via USB - PlayGuard will auto-detect
   ```

3. **Start Testing**
   - Navigate to "Test Runner" tab
   - Select test suite and tests to run
   - Click "Run Tests" and watch live execution

### For Developers

1. **Install Unity SDK**

   Open Unity Package Manager and add via Git URL:
   ```
   https://github.com/TatoSAI/playguard--unity-sdk.git
   ```

2. **Add SDK to Scene**
   ```
   GameObject → Create Empty → Add Component → PlayGuard SDK
   ```

3. **Build for Development**
   ```
   Build Settings → ✅ Development Build → Build
   ```

4. **Deploy to QA**
   - Share the development build with your QA team
   - SDK automatically connects to PlayGuard desktop app

## 📦 Repository Structure

```
PlayGuard/
├── electron-app/              # Desktop Application
│   ├── src/
│   │   ├── main/             # Electron main process
│   │   │   ├── services/     # Backend services (ADB, Unity, Test execution)
│   │   │   └── index.ts      # IPC handlers
│   │   └── renderer/         # React frontend
│   │       ├── src/
│   │       │   ├── components/   # UI components
│   │       │   ├── hooks/        # React hooks
│   │       │   └── App.tsx       # Main app
│   │       └── index.html
│   ├── resources/            # App icons and assets
│   └── package.json
│
├── unity-sdk/                # Unity SDK (separate repository)
│   ├── Runtime/              # SDK scripts
│   │   ├── PlayGuardSDK.cs  # Main SDK component
│   │   ├── Core/            # Core functionality
│   │   ├── Recording/       # Input recording
│   │   └── Playback/        # Test execution
│   ├── Samples~/            # Example integration
│   └── package.json         # UPM manifest
│
├── Launch-PlayGuard.cmd     # Windows launcher (CMD)
├── Launch-PlayGuard.ps1     # Windows launcher (PowerShell)
├── test-screenshots.bat     # Screenshot testing utility
└── README.md               # This file
```

## 🛠️ Technology Stack

### Desktop Application
- **Framework**: Electron 35.2.0
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + shadcn/ui
- **State Management**: React hooks
- **Build Tool**: electron-builder

### Unity SDK
- **Language**: C# (Unity 2021.3+)
- **Communication**: TCP/IP + ADB
- **Platform**: Android (iOS coming soon)

### Device Communication
- **Android**: ADB (Android Debug Bridge)
- **Protocol**: TCP on port 12345
- **Format**: JSON commands/responses

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  PlayGuard Desktop App                   │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Test Runner│  │ Test Recorder │  │  Test Suites   │ │
│  └────────────┘  └──────────────┘  └─────────────────┘ │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Backend Services                      │  │
│  │  • ADBManager     • UnityBridge                   │  │
│  │  • TestRunner     • FileManager                   │  │
│  │  • TestRecorder   • ReportManager                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           │ ADB + TCP/IP
                           ↓
                 ┌─────────────────────┐
                 │   Android Device     │
                 │                      │
                 │  ┌────────────────┐ │
                 │  │  Unity Game    │ │
                 │  │  ┌──────────┐  │ │
                 │  │  │ PlayGuard│  │ │
                 │  │  │   SDK    │  │ │
                 │  │  └──────────┘  │ │
                 │  └────────────────┘ │
                 └─────────────────────┘
```

**Key Communication Flow:**
1. Desktop app connects to device via ADB
2. Establishes TCP port forwarding (12345)
3. Unity SDK listens on TCP port
4. JSON commands sent/received over TCP
5. SDK executes commands and returns results

## 🔧 Development Setup

### Prerequisites
- Node.js 18+ (tested with v24.13.0)
- npm or pnpm
- Android SDK Platform Tools (for ADB)
- Unity 2021.3+ (for SDK development)

### Desktop App Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/TatoSAI/playguard.git
   cd playguard/electron-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   # Windows (CMD)
   Launch-PlayGuard.cmd

   # Windows (PowerShell)
   .\Launch-PlayGuard.ps1

   # Or directly
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build              # Build app
   npm run build:win          # Build Windows installer
   npm run build:mac          # Build macOS app
   npm run build:linux        # Build Linux AppImage
   ```

   > **Note**: Pre-built binaries are NOT included in the repository. You must build from source.
   > Built files (`.exe`, `.dmg`, `.AppImage`) are listed in `.gitignore`.
   > Download official releases from [GitHub Releases](https://github.com/TatoSAI/playguard/releases).

### Unity SDK Development

1. **Clone SDK repository**
   ```bash
   git clone https://github.com/TatoSAI/playguard--unity-sdk.git
   ```

2. **Open in Unity**
   - Add as local package via Package Manager
   - Or import directly into Assets folder

3. **Test changes**
   - Make modifications to Runtime/ scripts
   - Build development APK with SDK included
   - Test with desktop app

## 📝 Creating Tests

### 1. Recording Mode (Automated)
1. Connect device and launch game
2. Click "Create" → "Record" tab
3. Fill in test metadata (name, description, tags)
4. Click "Start Recording"
5. Interact with your game
6. Click "Stop Recording"
7. Review and save test

### 2. Scripting Mode (YAML DSL)
```yaml
testCase:
  name: "Login Flow Test"
  description: "Verify user can login successfully"
  tags: [auth, critical]
  steps:
    - id: step_1
      action: tap
      target:
        element: "/Canvas/LoginPanel/UsernameField"
        fallback: {x: 0.5, y: 0.4}
      validation:
        type: element_exists
        timeout: 3000
      expectedResult: "Username field is tapped"

    - id: step_2
      action: input
      target:
        element: "/Canvas/LoginPanel/UsernameField"
      params:
        text: "testuser@example.com"
      expectedResult: "Username entered"
```

### 3. Import Mode (Coming Soon)
- Import from JUnit XML
- Import from JSON
- Convert existing test formats

## 🧪 Running Tests

### Via Desktop App
1. Navigate to "Test Runner" tab
2. Select suite from sidebar
3. Check tests to run
4. Click "Run Selected Tests"
5. Monitor live execution
6. View reports in "Reports" tab

### Programmatically (Future)
```bash
playguard run --suite "Smoke Tests" --device 4b141bc2
```

## 📊 Test Reports

Reports include:
- ✅ Test execution status (passed/failed/error)
- 📸 Screenshots for each step
- ⏱️ Execution duration per step
- 📱 Device information
- 📋 Detailed error messages
- 📈 Historical trends

Access reports: Desktop App → "Reports" tab

## 🔌 Unity SDK Extensibility

Expose custom game state and actions for testing:

```csharp
using PlayGuard;

public class GameTestExtensions : MonoBehaviour
{
    void Start()
    {
        var sdk = PlayGuardSDK.Instance;

        // Expose game state
        sdk.RegisterCustomProperty("playerCoins",
            () => PlayerManager.Instance.GetCoins().ToString());

        sdk.RegisterCustomProperty("currentLevel",
            () => LevelManager.Instance.CurrentLevel.ToString());

        // Register test actions
        sdk.RegisterCustomAction("giveCoins", (args) => {
            int amount = int.Parse(args[0]);
            PlayerManager.Instance.AddCoins(amount);
        });

        sdk.RegisterCustomAction("skipTutorial", (args) => {
            TutorialManager.Instance.SkipTutorial();
        });
    }
}
```

**Benefits:**
- Verify game state during tests
- Execute test-specific actions (skip tutorial, give resources)
- Faster test execution (no need to grind for coins)

## 🎯 Best Practices

1. **Use Element Paths**: Prefer `/Canvas/Path/To/Element` over coordinates
2. **Add Assertions**: Verify game state after important actions
3. **Tag Your Tests**: Organize with tags (smoke, regression, critical)
4. **Use Test Suites**: Group related tests together
5. **Leverage Custom Actions**: Expose game state for better testing
6. **Review Screenshots**: Visual verification catches UI bugs

## 🐛 Troubleshooting

### Device Not Detected
```bash
# Verify ADB connection
adb devices

# If no devices, check:
# 1. USB debugging enabled
# 2. USB cable connected
# 3. Device authorized (check device screen)
```

### Unity SDK Not Connecting
```bash
# Verify TCP port forwarding
adb forward tcp:12345 tcp:12345

# Restart PlayGuard app
# Rebuild game with Development Build enabled
```

### Electron App Won't Start
```bash
# Clear environment variable
unset ELECTRON_RUN_AS_NODE  # Linux/Mac
set ELECTRON_RUN_AS_NODE=   # Windows

# Then run
npm run dev
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Development Workflow:**
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🔗 Links

- **Unity SDK**: [github.com/playguard/unity-sdk](https://github.com/TatoSAI/playguard--unity-sdk)
- **Documentation**: [playguard.dev/docs](https://playguard.dev/docs)
- **Website**: [playguard.dev](https://playguard.dev)
- **Discord**: [discord.gg/playguard](https://discord.gg/playguard)
- **Issues**: [github.com/playguard/playguard/issues](https://github.com/TatoSAI/playguard/issues)

## 💬 Support

- 📧 Email: support@playguard.dev
- 💬 Discord: [Join our community](https://discord.gg/playguard)
- 🐛 Bug Reports: [GitHub Issues](https://github.com/TatoSAI/playguard/issues)
- 📖 Documentation: [playguard.dev/docs](https://playguard.dev/docs)

## 🙏 Acknowledgments

Built with ❤️ using:
- [Electron](https://www.electronjs.org/) - Desktop app framework
- [React](https://react.dev/) - UI library
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Unity](https://unity.com/) - Game engine
- [Anthropic Claude](https://www.anthropic.com/) - AI features

---

**Status**: 🚧 Active Development - MVP Complete
**Version**: 0.1.0
**Last Updated**: 2026-02-10
