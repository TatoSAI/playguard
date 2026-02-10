# PlayGuard - Electron App

Desktop application for PlayGuard - AI-powered automated testing for Unity mobile games.

## Tech Stack

- **Electron** - Cross-platform desktop app
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Shadcn/ui** - UI components
- **ADBKit** - Android Debug Bridge communication
- **TensorFlow.js** - AI/ML features
- **Anthropic Claude API** - LLM integration

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 20+ installed
- **pnpm** package manager (recommended) or npm
- **Android SDK Platform Tools** (for ADB)
  - Windows: Download from [Android Developer](https://developer.android.com/tools/releases/platform-tools)
  - Mac: `brew install android-platform-tools`
  - Linux: `sudo apt-get install android-tools-adb`
- **USB Debugging** enabled on your Android device

## Installation

1. **Install dependencies**

```bash
cd electron-app
pnpm install
```

2. **Setup environment variables** (optional for AI features)

Create a `.env` file:

```bash
# Anthropic Claude API (for AI features)
ANTHROPIC_API_KEY=your_api_key_here
```

## Development

### Run in development mode

```bash
pnpm dev
```

This will:
- Start the Electron app in development mode
- Enable hot module replacement (HMR)
- Open DevTools automatically

### Build for production

```bash
pnpm build
```

### Create distributable packages

```bash
# Windows
pnpm dist:win

# macOS
pnpm dist:mac

# Linux
pnpm dist:linux

# All platforms
pnpm dist
```

## Project Structure

```
electron-app/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts          # Main entry point
│   │   ├── adb/              # ADB communication
│   │   │   ├── ADBManager.ts # Device management
│   │   │   └── ...
│   │   ├── test-engine/      # Test execution engine
│   │   └── ai/               # AI processors
│   │       ├── ElementDetector.ts
│   │       ├── VisualRegression.ts
│   │       └── LLMIntegration.ts
│   │
│   ├── preload/              # Electron preload script
│   │   └── index.ts          # IPC bridge
│   │
│   └── renderer/             # React frontend
│       ├── src/
│       │   ├── App.tsx       # Main app component
│       │   ├── main.tsx      # React entry point
│       │   ├── components/   # React components
│       │   │   ├── DeviceManager/
│       │   │   ├── TestRecorder/
│       │   │   ├── TestEditor/
│       │   │   ├── TestRunner/
│       │   │   └── ReportViewer/
│       │   ├── hooks/        # Custom React hooks
│       │   ├── services/     # Business logic
│       │   ├── types/        # TypeScript types
│       │   └── styles/       # Global styles
│       └── index.html
│
├── resources/                # App icons and assets
├── out/                      # Build output
└── dist/                     # Distribution packages
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm pack` | Create unpacked build |
| `pnpm dist` | Create distributable packages |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |

## ADB Setup

### Windows

1. Download Android SDK Platform Tools
2. Extract to `C:\platform-tools`
3. Add to PATH:
   - Search "Environment Variables"
   - Edit "Path"
   - Add `C:\platform-tools`
4. Verify: Open cmd and run `adb version`

### macOS

```bash
# Install via Homebrew
brew install android-platform-tools

# Verify
adb version
```

### Linux

```bash
# Ubuntu/Debian
sudo apt-get install android-tools-adb android-tools-fastboot

# Verify
adb version
```

## Connecting Android Device

1. **Enable Developer Options** on your device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times

2. **Enable USB Debugging**:
   - Settings → Developer Options
   - Enable "USB Debugging"

3. **Connect via USB** and authorize the computer

4. **Verify connection**:
   ```bash
   adb devices
   ```

   You should see your device listed.

## Features

### Current (MVP)

- ✅ Device discovery via ADB
- ✅ Device connection management
- ✅ Basic UI with device list
- ✅ Dark theme
- ✅ Responsive layout

### In Progress

- 🔄 Test recording
- 🔄 Test playback
- 🔄 Visual test editor
- 🔄 AI element detection
- 🔄 Screenshot capture

### Planned

- 📋 Test runner
- 📋 Report generation
- 📋 AI-powered features
- 📋 Video recording
- 📋 Visual regression testing

## Troubleshooting

### ADB not found

Make sure Android SDK Platform Tools are installed and added to PATH.

```bash
# Test ADB
adb version
```

### Device not detected

1. Check USB cable (use data cable, not charge-only)
2. Enable USB Debugging on device
3. Authorize computer on device
4. Try different USB port
5. Restart ADB server:
   ```bash
   adb kill-server
   adb start-server
   ```

### Build errors

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules
   pnpm install
   ```

2. Clear build cache:
   ```bash
   rm -rf out dist
   pnpm build
   ```

## Development Tips

### Hot Reload

The app supports hot module replacement. Changes to React components will update instantly without restarting.

### DevTools

Press `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Opt+I` (Mac) to open Chrome DevTools.

### Debugging Main Process

Add breakpoints in VSCode or use:
```typescript
console.log('[DEBUG]', data)
```

Logs appear in the terminal where you ran `pnpm dev`.

### Debugging Renderer Process

Use Chrome DevTools. Logs appear in the DevTools console.

## Contributing

See the main [PROJECT_PLAN.md](../PROJECT_PLAN.md) for architecture and development guidelines.

## License

(To be defined)
