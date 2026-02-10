# PlayGuard Unity SDK

> AI-powered automated testing SDK for Unity mobile games

[![Unity](https://img.shields.io/badge/Unity-2021.3%2B-blue)](https://unity.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md)
[![Version](https://img.shields.io/badge/version-0.1.0-orange)](package.json)

PlayGuard SDK enables QA teams and developers to create automated tests for Unity mobile games without writing code. Test your game directly on Android/iOS devices with zero performance impact in production builds.

## ✨ Features

- 🎯 **Zero Configuration** - Add script to GameObject and start testing
- 📱 **Device-Based Testing** - Tests run on real Android/iOS devices via USB
- ⚡ **Zero Performance Impact** - Only active in Development builds
- 🎮 **UI Canvas Inspection** - Full hierarchy access for element-based testing
- 🔌 **Extensibility System** - Expose game state and custom actions
- 🤖 **AI Integration** - Works with PlayGuard desktop app for intelligent testing
- 📊 **Element-Based** - Find UI elements by path with coordinate fallback

## 📋 Requirements

- Unity 2021.3 or later
- Android/iOS mobile device
- USB debugging enabled
- Development Build

## 📦 Installation

### Via Git URL (Recommended)

1. Open Unity Editor
2. Go to `Window` → `Package Manager`
3. Click `+` → `Add package from git URL...`
4. Paste: `https://github.com/TatoSAI/playguard--unity-sdk.git`
5. Click `Add`

### Via Package Manager Manifest

Add to `Packages/manifest.json`:

```json
{
  "dependencies": {
    "com.playguard.sdk": "https://github.com/TatoSAI/playguard--unity-sdk.git"
  }
}
```

### Specific Version

To install a specific version, add `#` with the version tag:

```
https://github.com/TatoSAI/playguard--unity-sdk.git#v0.1.0
```

## 🚀 Quick Start

### 1. Add SDK to Scene

1. Create empty GameObject: `GameObject` → `Create Empty`
2. Rename to "PlayGuard"
3. Add component: `Add Component` → `PlayGuard SDK`
4. Done! ✅

### 2. Build as Development

```
Build Settings → ✅ Development Build
```

The SDK automatically:
- Starts TCP server on port 12345
- Listens for commands from PlayGuard desktop app
- Inspects UI Canvas hierarchy
- Executes test commands

### 3. Connect Desktop App

1. Download [PlayGuard desktop app](https://github.com/TatoSAI/playguard)
2. Connect device via USB
3. Enable USB debugging
4. PlayGuard auto-connects to SDK

## 🎮 Basic Usage

### Minimal Setup

```csharp
// That's it! Just add PlayGuardSDK component to a GameObject
// No code required for basic testing
```

### Advanced: Custom Properties & Actions (v2.0)

Expose game-specific state and actions for testing:

```csharp
using PlayGuard;

public class GameIntegration : MonoBehaviour
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

## 📚 Documentation

- [Extensibility Guide](EXTENSIBILITY.md)
- [Examples](Samples~/BasicIntegration/)
- [Changelog](CHANGELOG.md)

## 🔌 API Reference

### PlayGuardSDK

Main SDK component that handles communication with PlayGuard desktop app.

#### Public Methods

```csharp
// Register custom property (read-only)
void RegisterCustomProperty(string name, Func<string> getter)

// Register custom action (executable)
void RegisterCustomAction(string name, Action<string[]> action)

// Register custom command (complex operations)
void RegisterCustomCommand(string name, Func<string, string> handler)

// Unregister
void UnregisterCustomProperty(string name)
void UnregisterCustomAction(string name)
void UnregisterCustomCommand(string name)

// Get registered names
string[] GetCustomPropertyNames()
string[] GetCustomActionNames()
string[] GetCustomCommandNames()
```

#### Properties

```csharp
// Singleton instance
static PlayGuardSDK Instance { get; }
```

## 🎯 Supported Platforms

- ✅ Android (via ADB)
- 🔜 iOS (coming soon)

## 🛠️ Development

### Project Structure

```
unity-sdk/
├── Runtime/
│   ├── PlayGuardSDK.cs          # Main SDK script
│   ├── Core/                     # Core components
│   ├── Recording/                # Input recording
│   └── Playback/                 # Test execution
├── Samples~/
│   └── BasicIntegration/         # Example integration
└── package.json                  # Package manifest
```

### Building from Source

```bash
git clone https://github.com/TatoSAI/playguard--unity-sdk.git
# Import as local package in Unity
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE.md](LICENSE.md) for details

## 🔗 Links

- [PlayGuard Desktop App](https://github.com/TatoSAI/playguard)
- [Documentation](https://playguard.dev/docs)
- [Report Bug](https://github.com/TatoSAI/playguard--unity-sdk/issues)
- [Request Feature](https://github.com/TatoSAI/playguard--unity-sdk/issues)

## 💬 Support

- 📧 Email: support@playguard.dev
- 🐛 Issues: [GitHub Issues](https://github.com/TatoSAI/playguard--unity-sdk/issues)

---

Made with ❤️ by the PlayGuard Team
