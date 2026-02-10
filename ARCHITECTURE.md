# PlayGuard Architecture

> **Technical overview of PlayGuard's architecture, components, and communication protocols**

## 📋 Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Desktop Application](#desktop-application)
- [Unity SDK](#unity-sdk)
- [Communication Protocol](#communication-protocol)
- [Data Flow](#data-flow)
- [File Storage](#file-storage)
- [Key Design Decisions](#key-design-decisions)

## 🎯 System Overview

PlayGuard is a two-part system:
1. **Desktop Application** (Electron + React) - Test management and execution interface
2. **Unity SDK** (C#) - In-game test automation SDK

They communicate via **ADB + TCP/IP** for real-time device interaction.

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Desktop App | Electron 35.2.0 | Cross-platform desktop framework |
| Frontend | React 18 + TypeScript | UI components and state management |
| Styling | TailwindCSS + shadcn/ui | Responsive, modern UI |
| Build | Vite + electron-vite | Fast development and bundling |
| Unity SDK | C# (Unity 2021.3+) | In-game automation SDK |
| Device Communication | ADB (Android Debug Bridge) | Device connection and control |
| Unity Communication | TCP/IP (port 12345) | Desktop ↔ Unity SDK messaging |
| Data Format | JSON | Command and data serialization |
| Storage | Local file system | Test cases, suites, reports |

## 🏗️ High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      PlayGuard Desktop App                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Renderer Process (React)               │   │
│  │  ┌────────────┐  ┌───────────┐  ┌──────────────────┐    │   │
│  │  │   Test     │  │   Test    │  │   Test Suites    │    │   │
│  │  │   Runner   │  │  Recorder │  │   Management     │    │   │
│  │  └────────────┘  └───────────┘  └──────────────────┘    │   │
│  │  ┌────────────┐  ┌───────────┐  ┌──────────────────┐    │   │
│  │  │   Reports  │  │  Settings │  │  Device Manager  │    │   │
│  │  └────────────┘  └───────────┘  └──────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↕ IPC                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Main Process (Node.js)                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │  ADBManager  │  │ UnityBridge  │  │ FileManager  │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ TestRecorder │  │  TestRunner  │  │ReportManager │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │  ┌──────────────┐  ┌──────────────┐                      │   │
│  │  │SuiteManager  │  │ TagManager   │                      │   │
│  │  └──────────────┘  └──────────────┘                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ ADB Commands
                              ↓
                    ┌─────────────────────┐
                    │   Android Device     │
                    │                      │
                    │  ┌────────────────┐ │
                    │  │  Unity Game    │ │
                    │  │  ┌──────────┐  │ │
                    │  │  │PlayGuard │  │ │  ← TCP Server (port 12345)
                    │  │  │   SDK    │  │ │
                    │  │  └──────────┘  │ │
                    │  └────────────────┘ │
                    └─────────────────────┘
                              ↑
                              │ TCP/IP (JSON)
                              └─────────────────────┐
                                                     │
                           ADB Port Forwarding: tcp:12345 → tcp:12345
```

## 🖥️ Desktop Application

### Renderer Process (React)

The frontend is a single-page application built with React and TypeScript.

#### Component Structure

```
components/
├── DeviceManager/          # Device connection UI
│   └── DeviceManager.tsx   (267 lines)
│
├── TestRecorder/           # Test recording interface
│   ├── TestRecorder.tsx    (550 lines)
│   ├── DeviceActionsPanel.tsx  (507 lines)
│   └── CustomPropertyViewer.tsx (350 lines)
│
├── TestRunner/             # Test execution UI
│   └── TestRunner.tsx      (900+ lines)
│
├── TestSuites/             # Suite management
│   └── TestSuites.tsx      (1400+ lines)
│
├── ReportViewer/           # Test reports
│   └── ReportViewer.tsx    (600 lines)
│
└── Settings/               # App settings
    ├── Settings.tsx
    ├── RecorderSettings.tsx
    ├── TestExecutionSettings.tsx
    └── ReportingSettings.tsx
```

#### Key UI Libraries

- **shadcn/ui**: Pre-built accessible components (Button, Dialog, Input, etc.)
- **lucide-react**: Icon library
- **@dnd-kit**: Drag-and-drop functionality for test reordering
- **TailwindCSS**: Utility-first CSS framework

### Main Process (Node.js)

The backend runs in Electron's main process and handles all business logic.

#### Service Architecture

```
services/
├── ADBManager.ts          (500 lines)
│   ├── Device detection
│   ├── ADB command execution
│   ├── Screenshot capture
│   ├── Input simulation (tap, swipe)
│   └── Device actions (back, home, rotation, etc.)
│
├── UnityBridge.ts         (512 lines)
│   ├── TCP connection management
│   ├── Command serialization/deserialization
│   ├── UI element inspection
│   ├── Custom property/action management
│   └── Ping/health checks
│
├── TestRecorder.ts        (400 lines)
│   ├── Recording session management
│   ├── Action capture (tap, swipe, device actions)
│   ├── Screenshot handling
│   └── Test case generation
│
├── TestRunner.ts          (450 lines)
│   ├── Test execution engine
│   ├── Step-by-step playback
│   ├── Assertion validation
│   ├── Error handling and retries
│   └── Report generation
│
├── FileManager.ts         (350 lines)
│   ├── Test case CRUD operations
│   ├── File system management
│   ├── Data migration
│   └── Backup/restore
│
├── SuiteManager.ts        (308 lines)
│   ├── Test suite CRUD
│   ├── Environment management
│   └── Suite organization
│
├── ReportManager.ts       (268 lines)
│   ├── Execution history tracking
│   ├── Statistics aggregation
│   ├── Report export (JSON, HTML, PDF)
│   └── History cleanup
│
├── ScreenshotManager.ts   (220 lines)
│   ├── Screenshot file storage
│   ├── Path management
│   └── Cleanup operations
│
├── TagManager.ts          (150 lines)
│   └── Tag-based organization
│
└── SettingsManager.ts     (450 lines)
    ├── App settings persistence
    └── Secure storage (API keys)
```

#### IPC Communication

All communication between renderer and main processes happens via IPC (Inter-Process Communication).

**Pattern:**
```typescript
// Renderer (React)
const devices = await window.api.adb.getDevices()

// Main Process (IPC Handler)
ipcMain.handle('adb:getDevices', async () => {
  return adbManager.getDevices()
})
```

**Categories:**
- `adb:*` - ADB-related operations
- `unity:*` - Unity SDK communication
- `testCase:*` - Test case management
- `suite:*` - Suite management
- `report:*` - Report operations
- `settings:*` - Settings management
- `screenshot:*` - Screenshot operations

## 🎮 Unity SDK

### Component Structure

```
PlayGuardSDK.cs (718 lines)
├── Singleton pattern (Instance)
├── TCP server (port 12345)
├── Command processor
├── UI Canvas inspection
├── Input simulation
├── Custom property/action registry
└── Development build check (#if DEVELOPMENT_BUILD)

Core/
├── PlayGuardManager.cs      # Core SDK management
├── CommandProcessor.cs      # JSON command handling
├── InputSimulator.cs        # Touch/gesture simulation
└── CanvasInspector.cs       # UI element discovery

Recording/ (Future)
└── InputRecorder.cs         # Input capture

Playback/
└── TestExecutor.cs          # Test step execution
```

### SDK Lifecycle

```
Unity Start
    ↓
PlayGuardSDK.Awake()
    ↓
Check DEVELOPMENT_BUILD
    ↓ (if true)
Start TCP Server (port 12345)
    ↓
Listen for connections
    ↓
Accept connection from Desktop App
    ↓
Read JSON command
    ↓
Process command
    ↓
Send JSON response
    ↓
Loop (keep listening)
```

### Command Types

| Command | Description | Example |
|---------|-------------|---------|
| `ping` | Health check | `{"command": "ping"}` |
| `getCanvasHierarchy` | Get UI structure | `{"command": "getCanvasHierarchy"}` |
| `tap` | Tap at coordinates or element | `{"command": "tap", "x": 0.5, "y": 0.5}` |
| `swipe` | Swipe gesture | `{"command": "swipe", "from": {...}, "to": {...}}` |
| `getCustomProperties` | List custom properties | `{"command": "getCustomProperties"}` |
| `getCustomProperty` | Get property value | `{"command": "getCustomProperty", "name": "playerCoins"}` |
| `executeCustomAction` | Execute game action | `{"command": "executeCustomAction", "name": "giveCoins", "args": ["100"]}` |

### Extensibility System (v2.0)

Developers can expose game-specific state and actions:

```csharp
// Register custom property (read-only)
PlayGuardSDK.Instance.RegisterCustomProperty("playerCoins",
    () => PlayerManager.Instance.GetCoins().ToString());

// Register custom action (executable)
PlayGuardSDK.Instance.RegisterCustomAction("giveCoins", (args) => {
    int amount = int.Parse(args[0]);
    PlayerManager.Instance.AddCoins(amount);
});
```

**Benefits:**
- Verify game state during tests
- Manipulate game state for testing (skip tutorial, give resources)
- Faster test execution

## 🔌 Communication Protocol

### Desktop → Device (ADB)

1. **Device Detection**
   ```bash
   adb devices
   ```

2. **Screenshot Capture**
   ```bash
   adb exec-out screencap -p > screenshot.png
   ```

3. **Input Simulation**
   ```bash
   adb shell input tap <x> <y>
   adb shell input swipe <x1> <y1> <x2> <y2> <duration>
   ```

4. **Port Forwarding**
   ```bash
   adb forward tcp:12345 tcp:12345
   ```

### Desktop → Unity SDK (TCP/IP)

**Request Format:**
```json
{
  "command": "tap",
  "params": {
    "element": "/Canvas/LoginButton",
    "fallback": {"x": 0.5, "y": 0.5}
  },
  "timeout": 3000
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "Tap executed successfully",
  "data": {
    "element": "/Canvas/LoginButton",
    "coordinates": {"x": 540, "y": 960}
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Element not found: /Canvas/LoginButton",
  "code": "ELEMENT_NOT_FOUND"
}
```

### Connection Flow

```
1. Desktop App starts
   ↓
2. Detect connected Android devices (ADB)
   ↓
3. Establish ADB port forwarding (tcp:12345)
   ↓
4. Unity game starts (with PlayGuard SDK)
   ↓
5. SDK starts TCP server on port 12345
   ↓
6. Desktop App connects to SDK via forwarded port
   ↓
7. Send ping command to verify connection
   ↓
8. Connection established ✅
```

## 📊 Data Flow

### Test Recording Flow

```
1. User clicks "Start Recording"
   ↓
2. Frontend → IPC → TestRecorder.startRecording()
   ↓
3. TestRecorder initializes session
   ↓
4. User taps on device screen
   ↓
5. ADB captures tap coordinates
   ↓
6. Unity SDK provides element path (via TCP)
   ↓
7. Take screenshot (ADB)
   ↓
8. Create TestStep object:
   {
     action: 'tap',
     coordinates: {x: 0.5, y: 0.5},
     element: '/Canvas/LoginButton',
     screenshot: 'suite_001/test_001_step_1.png'
   }
   ↓
9. User clicks "Stop Recording"
   ↓
10. Save TestCase to JSON file
    └→ AppData/Roaming/playguard/test-data/test-cases/suite_001/test_001.json
```

### Test Execution Flow

```
1. User selects tests and clicks "Run"
   ↓
2. Frontend → IPC → TestRunner.runTests(testIds)
   ↓
3. For each test:
   │
   ├─ Load TestCase from file
   │  ↓
   ├─ For each step:
   │  │
   │  ├─ Execute action (tap/swipe/wait/assert)
   │  │  ↓
   │  ├─ If element path exists:
   │  │  └─ Send command to Unity SDK (TCP)
   │  │     └─ Find element and get coordinates
   │  │     └─ Execute tap via ADB
   │  │  Else:
   │  │  └─ Use fallback coordinates
   │  │     └─ Execute tap via ADB
   │  │  ↓
   │  ├─ Capture screenshot
   │  │  ↓
   │  ├─ Validate assertions (if any)
   │  │  ↓
   │  └─ Record result (passed/failed)
   │
   └─ Generate TestExecution report
      └→ AppData/Roaming/playguard/test-data/executions/exec_12345.json
```

## 💾 File Storage

### Directory Structure

```
AppData/Roaming/playguard/
├── test-data/
│   ├── suites/
│   │   ├── suite_001.json          (230 bytes)
│   │   ├── suite_002.json
│   │   └── ...
│   │
│   ├── test-cases/
│   │   ├── suite_001/
│   │   │   ├── test_001.json       (2-5 KB)
│   │   │   ├── test_002.json
│   │   │   └── ...
│   │   └── suite_002/
│   │       └── ...
│   │
│   ├── screenshots/
│   │   ├── suite_001/
│   │   │   ├── test_001_step_1.png (2 MB)
│   │   │   ├── test_001_step_2.png
│   │   │   └── ...
│   │   └── suite_002/
│   │       └── ...
│   │
│   └── executions/
│       ├── exec_20260210_123456.json
│       └── ...
│
├── settings.json              (App settings)
├── secure-storage.json        (Encrypted API keys)
└── tags.json                  (Tag metadata)
```

### File Formats

**Suite (suite_001.json):**
```json
{
  "id": "suite_001",
  "name": "Login Tests",
  "description": "Authentication flow tests",
  "environment": "Development",
  "tags": ["auth", "critical"],
  "testOrder": ["test_001", "test_002"],
  "createdAt": "2026-02-10T10:30:00Z",
  "updatedAt": "2026-02-10T10:30:00Z"
}
```

**Test Case (test_001.json):**
```json
{
  "id": "test_001",
  "suiteId": "suite_001",
  "name": "Successful Login",
  "description": "Verify user can login with valid credentials",
  "tags": ["smoke", "auth"],
  "steps": [
    {
      "id": "step_1",
      "action": "tap",
      "coordinates": {"x": 0.5, "y": 0.4},
      "element": "/Canvas/LoginPanel/UsernameField",
      "screenshotPath": "suite_001/test_001_step_1.png",
      "timestamp": 1234567890,
      "description": "Tap username field"
    }
  ],
  "device": {
    "model": "Xiaomi POCO X3 Pro",
    "resolution": {"width": 1080, "height": 2400}
  }
}
```

**Execution Report (exec_12345.json):**
```json
{
  "id": "exec_12345",
  "suiteId": "suite_001",
  "testId": "test_001",
  "status": "passed",
  "startedAt": "2026-02-10T10:35:00Z",
  "completedAt": "2026-02-10T10:35:45Z",
  "duration": 45000,
  "device": {...},
  "steps": [
    {
      "stepId": "step_1",
      "status": "passed",
      "duration": 1200,
      "screenshot": "...",
      "error": null
    }
  ]
}
```

## 🎯 Key Design Decisions

### 1. Electron + React Architecture

**Why:** Cross-platform desktop app with native system access (ADB, file system).

**Alternatives Considered:**
- Web app (no native access)
- Native apps per platform (more development time)

### 2. TCP/IP for Unity Communication

**Why:** Simple, cross-platform, works with ADB port forwarding.

**Alternatives Considered:**
- HTTP REST API (more overhead)
- WebSockets (unnecessary for request-response pattern)
- Custom protocol (reinventing the wheel)

### 3. File-Based Storage (No Database)

**Why:**
- Simple setup (no DB installation)
- Easy to backup/share (copy folder)
- Human-readable JSON
- Suitable for MVP scale

**Alternatives Considered:**
- SQLite (unnecessary complexity for MVP)
- Cloud storage (not MVP priority)

### 4. Screenshot File Storage (Not Base64 in JSON)

**Why:**
- Smaller JSON files (2 KB vs 23 MB)
- Faster loading (lazy load images)
- Easier debugging (can view PNG directly)

**Before:**
```json
{
  "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." (2-3 MB)
}
```

**After:**
```json
{
  "screenshotPath": "suite_001/test_001_step_1.png"
}
```

### 5. Element-Based + Coordinate Fallback

**Why:**
- Element paths are resilient to resolution changes
- Coordinates are fallback for dynamic UIs
- Best of both worlds

**Example:**
```typescript
// Try element path first
if (step.element) {
  const coords = await unityBridge.findElement(step.element)
  await adb.tap(coords.x, coords.y)
} else {
  // Fallback to coordinates
  await adb.tap(step.coordinates.x, step.coordinates.y)
}
```

### 6. Normalized Coordinates (0-1 Range)

**Why:** Resolution-independent testing.

**Example:**
```typescript
// Record at 1080x2400
tap(540, 960) → normalized to (0.5, 0.4)

// Playback at 1440x3200
(0.5, 0.4) → denormalized to (720, 1280)
```

### 7. Unity SDK Only in Development Builds

**Why:** Zero performance impact in production.

```csharp
#if DEVELOPMENT_BUILD
    // SDK code only compiled in development builds
#endif
```

### 8. IPC for Renderer ↔ Main Communication

**Why:** Electron's recommended pattern for security and process isolation.

**Pattern:**
```typescript
// Renderer
const result = await window.api.methodName(params)

// Main (IPC Handler)
ipcMain.handle('channel:method', async (event, params) => {
  return await service.method(params)
})
```

## 🔄 Future Architecture Considerations

### Phase 2: Scale & Performance

1. **Cloud Storage**
   - Centralized test repository
   - Team collaboration
   - CI/CD integration

2. **Parallel Execution**
   - Multiple devices simultaneously
   - Distributed test execution

3. **Video Recording**
   - Record test execution as video
   - Better debugging experience

4. **AI Integration**
   - Smart element detection (ML model)
   - Self-healing tests (adapt to UI changes)
   - Flaky test detection

### Phase 3: Enterprise

1. **Web Dashboard**
   - View reports from anywhere
   - Analytics and trends
   - Team management

2. **CI/CD Plugins**
   - Jenkins/GitHub Actions integration
   - Automated regression testing

3. **Multi-Platform**
   - iOS support (iproxy instead of ADB)
   - Web game testing (Puppeteer)

---

**Last Updated**: 2026-02-10
