# PlayGuard - Project Planning Document

> **AI-Powered Auto-Testing Tool for Unity Mobile Games**

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Vision & Goals](#vision--goals)
3. [Target Users](#target-users)
4. [Technical Decisions](#technical-decisions)
5. [Architecture](#architecture)
6. [AI Features](#ai-features)
7. [Test Case Format](#test-case-format)
8. [Workflow](#workflow)
9. [Project Structure](#project-structure)
10. [Development Phases](#development-phases)
11. [Tech Stack](#tech-stack)
12. [Future Roadmap](#future-roadmap)

---

## 🎯 Project Overview

**PlayGuard** is an automated testing tool for Unity mobile games that enables QA teams to create, execute, and manage tests without writing code or accessing the Unity Editor. It leverages AI to make tests more intelligent, self-healing, and easier to maintain.

### Key Differentiators
- **AI-First Approach**: Smart element detection, auto-healing tests, intelligent suggestions
- **QA-Friendly**: No Unity Editor access required, no coding needed
- **Device-Based**: Tests run directly on mobile devices (Android/iOS)
- **Visual Interface**: Intuitive Electron app for test management

---

## 🎯 Vision & Goals

### Primary Goals
1. **Zero Code Testing**: QA can create comprehensive tests without programming
2. **Self-Healing Tests**: AI-powered tests adapt to UI changes automatically
3. **Fast Feedback**: Quick test execution with detailed visual reports
4. **Easy Adoption**: Minimal developer integration, maximum QA productivity
5. **AI Value**: Leverage AI for test generation, maintenance, and analysis

### Success Metrics
- QA can create a full test in < 5 minutes
- 80% reduction in test maintenance time
- 95%+ test reliability (low flakiness)
- 50%+ faster bug detection

---

## 👥 Target Users

### Primary: QA Testers
- Create tests by recording gameplay
- Execute test suites on real devices
- Review reports and identify bugs
- **No Unity Editor access**
- **No coding required**

### Secondary: QA Leads
- Manage test suites
- Review analytics and trends
- Schedule automated runs
- Track team productivity

### Tertiary: Developers
- One-time SDK integration
- Build game with PlayGuard enabled
- Minimal maintenance

---

## ✅ Technical Decisions

### Communication
- **Method**: USB/ADB (Android Debug Bridge)
- **Why**: More stable than WiFi, no network setup required
- **iOS**: USB with iproxy (future phase)

### Element Detection Strategy
**Multi-layered approach with fallbacks:**
1. **GameObject Name** (most reliable)
2. **UI Tag/Layer** (developer can tag elements)
3. **Normalized Coordinates** (resolution-independent)
4. **AI Visual Recognition** (when element moves)

### Technology Stack

#### Dashboard (QA Interface)
- **Type**: Electron App (MVP) → Web App (Future)
- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Backend**: Node.js + Express
- **UI Components**: Shadcn/ui

#### Unity SDK
- **Language**: C#
- **Communication**: ADB Bridge
- **Input**: Unity Input System (new)

#### AI Stack
- **Computer Vision**: TensorFlow.js / OpenCV.js
- **Visual Regression**: pixelmatch + sharp
- **LLM**: Claude API (Anthropic) + local fallback
- **Pattern Recognition**: ml.js

### Security
- **MVP**: No authentication (local use)
- **Future (Web App)**: Full auth + encryption

### Platform Priority
- **Phase 1**: Android only (ADB mature and stable)
- **Phase 2**: iOS support (USB + Xcode tools)

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│         ELECTRON APP (QA's Computer)                 │
│  ┌────────────────────────────────────────────────┐│
│  │  Frontend (React + Vite)                       ││
│  │  ├─ Device Manager                             ││
│  │  ├─ Test Recorder UI                           ││
│  │  ├─ Test Editor (Visual)                       ││
│  │  ├─ Test Runner UI                             ││
│  │  ├─ AI Suggestions Panel                       ││
│  │  └─ Report Viewer                              ││
│  └────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────┐│
│  │  Backend (Node.js + Express)                   ││
│  │  ├─ ADB Bridge (device communication)         ││
│  │  ├─ Test Engine                                ││
│  │  ├─ File System (test storage)                ││
│  │  └─ AI Processors:                             ││
│  │     ├─ Element Detector (TensorFlow.js)       ││
│  │     ├─ Visual Regression (pixelmatch)         ││
│  │     ├─ LLM Integration (Claude API)           ││
│  │     ├─ Smart Wait Detector                    ││
│  │     └─ Flaky Test Analyzer                    ││
│  └────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
                    ↕ USB Cable (ADB)
┌─────────────────────────────────────────────────────┐
│              ANDROID DEVICE                          │
│  ┌────────────────────────────────────────────────┐│
│  │  Unity Game + PlayGuard SDK                    ││
│  │  ├─ ADB Server (receives commands)            ││
│  │  ├─ Input Recorder                             ││
│  │  ├─ Input Simulator                            ││
│  │  ├─ Screenshot Capture                         ││
│  │  ├─ UI Hierarchy Inspector                     ││
│  │  └─ Test Executor                              ││
│  └────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### Communication Flow

```
Recording Flow:
QA taps on device → Unity captures input → Sends to Electron via ADB
→ AI processes action → Stores in test case JSON

Playback Flow:
Electron sends test case → Device receives via ADB → Unity executes actions
→ Captures results → Sends back to Electron → AI analyzes results
→ Generates report
```

---

## 🤖 AI Features (MVP)

### 1. Smart Element Detection 🎯

**Problem**: UI elements move, tests break

**AI Solution**:
- Captures visual signature of tapped elements
- Uses computer vision to find elements by appearance
- Falls back to visual search if GameObject name changes

**Tech**: TensorFlow.js + OpenCV.js

**Value**: Tests auto-heal when UI changes position

---

### 2. Intelligent Wait Detection ⏱️

**Problem**: QA doesn't know how long to wait

**AI Solution**:
- Detects loading spinners, animations, transitions
- Analyzes frame changes to determine idle state
- Auto-generates smart wait conditions

**Tech**: Frame differencing + pattern recognition

**Value**: Tests run faster and more reliably

---

### 3. Auto-Generate Test Descriptions 📝

**Problem**: Tests lack proper documentation

**AI Solution**:
- Analyzes test steps
- Generates clear name, description, and tags
- Uses LLM to create human-readable summaries

**Tech**: Claude API (Anthropic)

**Value**: Better test organization and documentation

---

### 4. Visual Regression AI 👁️

**Problem**: Visual bugs go unnoticed

**AI Solution**:
- Compares screenshots between runs
- Ignores dynamic content (timestamps, avatars)
- Highlights actual visual changes

**Tech**: SSIM + Perceptual Hashing + pixelmatch

**Value**: Automatic visual bug detection

---

### 5. Smart Assertion Suggestions 💡

**Problem**: QA doesn't know what to assert

**AI Solution**:
- Analyzes game state before/after actions
- Suggests relevant assertions in real-time
- Rates suggestions by importance

**Tech**: State diffing + LLM reasoning

**Value**: More comprehensive tests with less effort

---

### 6. Flaky Test Detector 🔍

**Problem**: Tests fail randomly, hard to debug

**AI Solution**:
- Analyzes test execution history
- Detects patterns in failures
- Suggests fixes automatically

**Tech**: Statistical analysis + ML clustering

**Value**: Identifies and fixes unreliable tests

---

### 7. Natural Language Test Creation 🗣️ (Bonus)

**Problem**: QA wants to describe tests, not record them

**AI Solution**:
- QA writes test description in plain English
- AI generates test steps automatically
- QA reviews and adjusts

**Tech**: LLM (Claude API)

**Value**: Create tests without recording

---

## 📄 Test Case Format

### Complete JSON Schema

```json
{
  "testCase": {
    "id": "test_001",
    "name": "Login Flow Test",
    "description": "Verifies user can log in with valid credentials",
    "version": "1.0",
    "tags": ["authentication", "login", "smoke", "critical"],
    "createdAt": "2026-02-05T10:30:00Z",
    "updatedAt": "2026-02-05T14:20:00Z",
    "createdBy": "qa_user@company.com",
    "device": {
      "model": "Samsung Galaxy S21",
      "os": "Android 13",
      "resolution": "1080x2400"
    },
    "variables": {
      "email": "test@example.com",
      "password": "pass123",
      "expectedUsername": "TestUser"
    },
    "steps": [
      {
        "id": "step_1",
        "type": "tap",
        "description": "Tap login button",
        "target": {
          "method": "gameObject",
          "value": "Button_Login",
          "fallback": {"x": 0.5, "y": 0.7},
          "visualSignature": {
            "template": "base64_image_data",
            "features": {
              "dominantColor": "#4CAF50",
              "hasText": true,
              "textContent": "LOGIN",
              "confidence": 0.95
            }
          }
        },
        "options": {
          "waitBefore": 1.0,
          "waitAfter": 0.5,
          "screenshot": true,
          "retryOnFail": 3
        }
      },
      {
        "id": "step_2",
        "type": "input",
        "description": "Enter email",
        "target": {
          "method": "gameObject",
          "value": "InputField_Email"
        },
        "value": "{{email}}",
        "options": {
          "clearFirst": true
        }
      },
      {
        "id": "step_3",
        "type": "swipe",
        "description": "Swipe down to scroll",
        "from": {"x": 0.5, "y": 0.7},
        "to": {"x": 0.5, "y": 0.3},
        "duration": 0.5
      },
      {
        "id": "step_4",
        "type": "wait",
        "waitType": "duration",
        "value": 3.0,
        "aiGenerated": true
      },
      {
        "id": "step_5",
        "type": "wait",
        "waitType": "element",
        "condition": "disappears",
        "target": "Loading_Spinner",
        "timeout": 10.0,
        "aiGenerated": true,
        "aiReason": "Detected loading animation"
      },
      {
        "id": "step_6",
        "type": "assert",
        "assertType": "elementExists",
        "target": "Panel_Welcome",
        "timeout": 5.0,
        "failBehavior": "stop",
        "aiSuggested": true
      },
      {
        "id": "step_7",
        "type": "assert",
        "assertType": "textEquals",
        "target": "Text_Username",
        "expected": "{{expectedUsername}}",
        "caseSensitive": false
      },
      {
        "id": "step_8",
        "type": "screenshot",
        "name": "welcome_screen_final",
        "fullscreen": true,
        "useForVisualRegression": true
      }
    ],
    "cleanup": [
      {
        "type": "tap",
        "target": {"method": "gameObject", "value": "Button_Logout"}
      }
    ],
    "aiMetadata": {
      "generatedDescription": true,
      "generatedTags": ["authentication", "smoke"],
      "confidence": 0.92
    }
  }
}
```

### Supported Action Types

| Action | Description | MVP | Future |
|--------|-------------|-----|--------|
| `tap` | Simple tap | ✅ | - |
| `longPress` | Hold tap (1-3s) | ✅ | - |
| `doubleTap` | Double tap | ✅ | - |
| `swipe` | Swipe gesture | ✅ | - |
| `pinch` | Pinch zoom | ❌ | ✅ |
| `input` | Text input | ✅ | - |
| `wait` | Wait (duration or condition) | ✅ | - |
| `screenshot` | Capture screen | ✅ | - |
| `assert` | Validation | ✅ | - |
| `drag` | Drag and drop | ❌ | ✅ |
| `rotate` | Rotation gesture | ❌ | ✅ |
| `deviceAction` | Shake, rotate device | ❌ | ✅ |

### Supported Assertions

| Assertion | Description | MVP | Future |
|-----------|-------------|-----|--------|
| `elementExists` | Element present | ✅ | - |
| `elementVisible` | Element visible | ✅ | - |
| `elementNotVisible` | Element hidden | ✅ | - |
| `textEquals` | Text matches | ✅ | - |
| `textContains` | Text contains | ✅ | - |
| `screenshotMatches` | Visual regression | ✅ | - |
| `valueEquals` | Game variable equals | ❌ | ✅ |
| `valueGreaterThan` | Game variable > | ❌ | ✅ |
| `fpsAbove` | FPS check | ❌ | ✅ |

---

## 🔄 QA Workflow

### Daily Workflow: Creating a Test

```
1. QA opens PlayGuard Electron app
   ↓
2. Connects Android device via USB
   ↓
3. Clicks "Record New Test"
   ↓
4. Plays the game normally on device
   (AI captures everything in real-time)
   ↓
5. Stops recording
   ↓
6. Reviews test in visual editor
   - AI suggests assertions
   - AI generates description
   - QA can add/edit/remove steps
   ↓
7. Saves test
   ↓
8. Runs test to verify
   ↓
9. Test runs automatically on device
   ↓
10. Reviews report with screenshots
```

### Running Test Suite

```
1. QA opens Test Runner
   ↓
2. Selects multiple tests
   ↓
3. Clicks "Run Selected"
   ↓
4. Tests execute sequentially
   ↓
5. Live progress shown in dashboard
   ↓
6. Report generated automatically
   - Pass/Fail summary
   - Screenshots of each step
   - AI insights on failures
   - Flaky test warnings
```

---

## 📁 Project Structure

```
PlayGuard/
├── README.md
├── PROJECT_PLAN.md (this file)
├── LICENSE
├── .gitignore
│
├── unity-sdk/                      # Unity Package (C#)
│   ├── Runtime/
│   │   ├── Core/
│   │   │   ├── PlayGuardManager.cs
│   │   │   ├── ADBBridge.cs
│   │   │   └── TestExecutor.cs
│   │   ├── Recording/
│   │   │   ├── InputRecorder.cs
│   │   │   ├── ScreenshotCapture.cs
│   │   │   └── UIHierarchyInspector.cs
│   │   ├── Playback/
│   │   │   ├── InputSimulator.cs
│   │   │   └── ActionExecutor.cs
│   │   └── Utils/
│   │       ├── CoordinateHelper.cs
│   │       └── DeviceInfo.cs
│   ├── Editor/
│   │   └── PlayGuardSetup.cs
│   ├── Tests/
│   ├── package.json
│   └── README.md
│
├── electron-app/                   # Electron Dashboard
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── electron.vite.config.ts
│   │
│   ├── src/
│   │   ├── main/                   # Electron Main Process
│   │   │   ├── index.ts
│   │   │   ├── adb/
│   │   │   │   ├── ADBManager.ts
│   │   │   │   └── DeviceDiscovery.ts
│   │   │   ├── test-engine/
│   │   │   │   ├── TestRunner.ts
│   │   │   │   └── TestRecorder.ts
│   │   │   └── ai/
│   │   │       ├── ElementDetector.ts
│   │   │       ├── SmartWaitDetector.ts
│   │   │       ├── VisualRegression.ts
│   │   │       ├── LLMIntegration.ts
│   │   │       └── FlakyDetector.ts
│   │   │
│   │   ├── renderer/               # React Frontend
│   │   │   ├── src/
│   │   │   │   ├── App.tsx
│   │   │   │   ├── main.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── DeviceManager/
│   │   │   │   │   ├── TestRecorder/
│   │   │   │   │   ├── TestEditor/
│   │   │   │   │   ├── TestRunner/
│   │   │   │   │   ├── ReportViewer/
│   │   │   │   │   └── AISuggestions/
│   │   │   │   ├── hooks/
│   │   │   │   ├── services/
│   │   │   │   ├── types/
│   │   │   │   └── utils/
│   │   │   ├── index.html
│   │   │   └── styles/
│   │   │
│   │   └── preload/
│   │       └── index.ts
│   │
│   ├── resources/                  # App icons, etc.
│   ├── out/                        # Build output
│   └── README.md
│
├── test-cases/                     # Example Test Cases
│   ├── examples/
│   │   ├── login_flow.json
│   │   ├── gameplay_tutorial.json
│   │   └── shop_purchase.json
│   └── templates/
│       └── test_template.json
│
├── docs/                           # Documentation
│   ├── getting-started/
│   │   ├── installation.md
│   │   ├── quick-start.md
│   │   └── first-test.md
│   ├── guides/
│   │   ├── recording-tests.md
│   │   ├── editing-tests.md
│   │   ├── running-tests.md
│   │   ├── ai-features.md
│   │   └── best-practices.md
│   ├── api/
│   │   ├── unity-sdk.md
│   │   └── test-format.md
│   └── developer/
│       ├── architecture.md
│       ├── contributing.md
│       └── building.md
│
└── scripts/                        # Build & utility scripts
    ├── build-unity-package.sh
    ├── build-electron.sh
    └── setup-dev.sh
```

---

## 🚀 Development Phases

### Phase 1: MVP - Core + Basic AI (6-8 weeks)

#### Week 1-2: Foundation
**Unity SDK**
- ✅ ADB Bridge communication
- ✅ Input capture (tap, swipe, input)
- ✅ Screenshot capture
- ✅ Basic UI hierarchy inspector

**Electron App**
- ✅ Project setup (Electron + React + Vite)
- ✅ Basic UI layout (TailwindCSS)
- ✅ Device connection via ADB
- ✅ Device discovery and listing

**Deliverable**: Can connect to device and detect taps

---

#### Week 3-4: Recording & Playback
**Unity SDK**
- ✅ Save recorded actions to JSON
- ✅ Input simulator for playback
- ✅ Action executor engine

**Electron App**
- ✅ Test recorder UI
- ✅ Live action feed
- ✅ Test storage (file system)
- ✅ Basic test editor

**AI Integration**
- ✅ Smart Wait Detection
- ✅ Element visual signature capture

**Deliverable**: Can record and replay simple tap sequence

---

#### Week 5-6: AI Features
**AI Modules**
- ✅ Smart Element Detection (TensorFlow.js)
- ✅ Auto-generate test descriptions (Claude API)
- ✅ Visual regression basic (pixelmatch)
- ✅ Assertion suggestions

**Electron App**
- ✅ AI suggestions panel
- ✅ Visual test editor improvements
- ✅ Test runner UI

**Deliverable**: Tests with AI features working

---

#### Week 7-8: Reports & Polish
**Features**
- ✅ HTML report generation
- ✅ Screenshot gallery in reports
- ✅ Test suite management
- ✅ Basic analytics

**Polish**
- ✅ Error handling
- ✅ Loading states
- ✅ User feedback
- ✅ Documentation
- ✅ Example tests

**Deliverable**: Full MVP ready for testing

---

### Phase 2: Advanced Features (4-6 weeks)

- ✅ iOS support (USB + iproxy)
- ✅ Variables and data-driven testing
- ✅ Video recording
- ✅ Advanced visual regression
- ✅ Flaky test detection
- ✅ Test suites and organization
- ✅ Advanced AI suggestions
- ✅ Performance metrics

---

### Phase 3: Scale & Web (6-8 weeks)

- ✅ Web dashboard (migrate from Electron)
- ✅ Cloud storage for tests
- ✅ Multi-device parallel execution
- ✅ CI/CD integration
- ✅ Team collaboration features
- ✅ Authentication & security
- ✅ Advanced analytics
- ✅ Natural language test creation

---

## 🛠️ Tech Stack Summary

### Unity SDK
```
Language:      C#
Unity Version: 2021.3 LTS or higher
Communication: ADB (Android Debug Bridge)
Input:         Unity Input System (new)
Networking:    System.Net.Sockets
Serialization: Newtonsoft.Json
```

### Electron App

#### Frontend
```
Framework:     React 18
Build Tool:    Vite
Language:      TypeScript
Styling:       TailwindCSS
UI Library:    Shadcn/ui
State:         Zustand or Jotai
Routing:       React Router
```

#### Backend (Main Process)
```
Runtime:       Node.js 20+
Framework:     Express
Language:      TypeScript
ADB:           adbkit or custom wrapper
File System:   fs/promises
```

#### AI Stack
```
Computer Vision:    TensorFlow.js / OpenCV.js
Image Processing:   sharp
Visual Diff:        pixelmatch
LLM:               Claude API (Anthropic)
ML Utils:          ml.js
OCR (optional):    Tesseract.js
```

### Development Tools
```
Package Manager:   pnpm
Bundler:          Vite + electron-vite
Linting:          ESLint + Prettier
Testing:          Vitest + Testing Library
Build:            electron-builder
```

---

## 📊 Success Metrics

### Technical Metrics
- **Test Execution Speed**: < 30 seconds for typical test
- **AI Accuracy**: > 90% element detection accuracy
- **Self-Healing Rate**: > 70% tests auto-fix when UI changes
- **Flakiness**: < 5% flaky test rate

### User Metrics
- **Time to First Test**: < 10 minutes (including setup)
- **Test Creation Time**: < 5 minutes per test
- **Learning Curve**: QA productive within 1 hour
- **Maintenance Time**: 80% reduction vs manual testing

### Business Metrics
- **Bug Detection Rate**: 50% faster than manual testing
- **Test Coverage**: 3x more test cases created
- **QA Productivity**: 2x more tests per QA per day
- **ROI**: Positive within 3 months

---

## 🔮 Future Roadmap

### Q2 2026
- ✅ MVP Release (Android only)
- ✅ First 5 beta customers
- ✅ Documentation complete

### Q3 2026
- ✅ iOS Support
- ✅ Advanced AI features
- ✅ Video recording
- ✅ Performance profiling

### Q4 2026
- ✅ Web Dashboard
- ✅ Cloud infrastructure
- ✅ Team collaboration
- ✅ CI/CD integration

### 2027
- ✅ Enterprise features
- ✅ Advanced analytics
- ✅ API for custom integrations
- ✅ Marketplace for test templates
- ✅ Multi-game support
- ✅ Auto-test generation from gameplay

---

## 🎯 Next Steps

### Immediate Actions
1. ✅ Create project structure
2. ✅ Setup Unity SDK basic structure
3. ✅ Setup Electron app with React + Vite
4. ✅ Implement ADB connection
5. ✅ Build first feature: Device detection

### Week 1 Goals
- Device discovery working
- Can send/receive commands via ADB
- Basic React UI showing device info
- Unity SDK receives commands

---

## 📝 Notes & Considerations

### Technical Challenges
- **ADB Reliability**: Need robust error handling and reconnection
- **Coordinate Mapping**: Different resolutions/aspect ratios
- **AI Model Size**: Keep models small for fast loading
- **Performance**: Don't impact game performance during recording

### Business Considerations
- **Licensing**: Decide on open source vs commercial
- **Pricing**: Free tier vs paid features
- **Support**: Documentation vs direct support
- **Competition**: Differentiate with AI features

### Risk Mitigation
- **MVP First**: Validate with users early
- **Modular Design**: Easy to swap AI models
- **Fallbacks**: Always have non-AI fallback
- **Testing**: Dogfood our own tool

---

## 🤝 Contributing

(To be defined when open sourcing)

---

## 📄 License

(To be defined)

---

**Document Version**: 1.0
**Last Updated**: 2026-02-05
**Status**: Planning → Implementation
**Next Review**: After MVP completion

---

*This is a living document and will be updated as the project evolves.*
