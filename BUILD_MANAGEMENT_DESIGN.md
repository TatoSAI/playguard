# Build Management + Suite Integration System

## 🎯 Overview

Complete system for managing app builds, device setup, and test suite execution.

---

## 📦 **1. Build Management System**

### Purpose
Store and manage multiple APK/IPA versions with metadata and automatic installation.

### Data Structure

```typescript
interface AppBuild {
  id: string
  name: string                    // "MyGame v1.2.3 - Production"
  version: string                 // "1.2.3"
  buildNumber: number            // 42
  platform: 'android' | 'ios'
  packageName: string            // "com.company.game"

  // Source
  sourceType: 'local' | 'unity_cloud' | 'testflight' | 'url'
  localPath?: string             // Local APK path
  downloadUrl?: string           // Unity/TestFlight download URL

  // Metadata
  releaseDate: number
  changelog?: string
  branch?: string                // "main", "develop", "release/1.2"
  commitHash?: string

  // File info
  fileSize?: number
  md5?: string                   // Verify integrity

  // Status
  isInstalled: boolean           // Currently installed on test device?
  lastUsed?: number              // Last time used in a test

  createdAt: number
  updatedAt: number
}
```

### Features

#### A) Local Build Storage
```typescript
class BuildManager {
  // Store builds in organized directory
  // e.g., AppData/playguard/builds/com.company.game/v1.2.3/app.apk

  async addLocalBuild(apkPath: string): Promise<AppBuild>
  async importBuild(source: string): Promise<AppBuild>
  async deleteBuild(id: string): Promise<void>
  async getBuild(id: string): Promise<AppBuild>
  async listBuilds(packageName?: string): Promise<AppBuild[]>
}
```

#### B) Unity Cloud Build Integration
```typescript
interface UnityCloudConfig {
  apiKey: string
  orgId: string
  projectId: string
}

class UnityCloudIntegration {
  // Download from Unity Cloud Build
  async listBuilds(config: UnityCloudConfig): Promise<UnityBuild[]>
  async downloadBuild(buildId: string, targetPath: string): Promise<string>
  async getLatestBuild(branch?: string): Promise<UnityBuild>
}

// Example Unity Cloud Build URL:
// https://api.unity3d.com/v1/orgs/{orgid}/projects/{projectid}/buildtargets/{buildtargetid}/builds
```

#### C) TestFlight Integration (iOS)
```typescript
interface TestFlightConfig {
  appId: string
  apiKey: string
}

class TestFlightIntegration {
  async listBuilds(config: TestFlightConfig): Promise<TestFlightBuild[]>
  async getDownloadUrl(buildId: string): Promise<string>
}
```

#### D) Generic URL Download
```typescript
// Support any direct download URL
async downloadFromUrl(url: string, targetPath: string): Promise<AppBuild>

// Examples:
// - Firebase App Distribution
// - AppCenter
// - Custom CDN
// - Direct APK links
```

---

## 🔧 **2. Enhanced Setup Profiles**

### Updated Structure

```typescript
interface SetupProfile {
  id: string
  name: string
  description: string

  // === NEW: Build Management ===
  build?: {
    enabled: boolean
    buildId?: string              // Reference to AppBuild
    alwaysUseLatest: boolean     // Use latest build of this package
    autoDownload: boolean        // Download if not cached
    forceReinstall: boolean      // Always reinstall even if same version
  }

  // === NEW: First-Time Setup ===
  firstTimeSetup?: {
    enabled: boolean
    steps: FirstTimeSetupStep[]  // Automated first-time game setup
  }

  // App Management
  clearAppData: boolean
  packageName: string

  // Device Settings
  brightness?: number
  volume?: number
  orientation?: 'portrait' | 'landscape' | 'auto'
  wifi: boolean
  mobileData: boolean
  airplane: boolean

  // Unity SDK Setup
  unitySetup?: {
    enabled: boolean
    skipTutorial?: boolean
    setPlayerCoins?: number
    unlockLevel?: number
    customActions?: UnitySetupAction[]
  }

  // Advanced
  clearCache: boolean
  timeout: number

  createdAt: number
  updatedAt: number
}
```

### First-Time Setup Steps

```typescript
type FirstTimeSetupStep =
  | { type: 'wait'; duration: number }
  | { type: 'tap'; element: string; description: string }
  | { type: 'input'; element: string; value: string }
  | { type: 'swipe'; direction: 'left' | 'right' | 'up' | 'down' }
  | { type: 'accept_permissions' }
  | { type: 'skip_tutorial'; method: 'tap' | 'unity_sdk' }
  | { type: 'select_language'; language: string }
  | { type: 'accept_terms' }
  | { type: 'unity_action'; action: string; args: string[] }

// Example: First-time setup for a game
{
  firstTimeSetup: {
    enabled: true,
    steps: [
      { type: 'wait', duration: 3000 },                    // Wait for splash
      { type: 'accept_permissions' },                      // Accept notifications
      { type: 'tap', element: 'AcceptButton', description: 'Accept terms' },
      { type: 'select_language', language: 'en' },
      { type: 'skip_tutorial', method: 'unity_sdk' },      // Use Unity SDK to skip
      { type: 'wait', duration: 2000 },                    // Wait for main menu
      { type: 'unity_action', action: 'completeOnboarding', args: [] }
    ]
  }
}
```

---

## 🎮 **3. Test Suite Integration**

### Updated Test Suite Structure

```typescript
interface TestSuite {
  id: string
  name: string
  description?: string

  // === NEW: Build + Setup Integration ===
  setupConfig: {
    enabled: boolean
    setupProfileId: string       // Required: which setup profile to use

    // Build selection (overrides profile's build if specified)
    buildId?: string             // Use specific build
    useLatestBuild?: boolean     // Always use latest available

    // Execution options
    runSetupBeforeEach: boolean  // Apply setup before each test or only once?
    continueOnSetupFailure: boolean
  }

  testCases: TestCase[]
  tags: string[]
  createdAt: number
  updatedAt: number
}
```

### Suite Execution Flow

```
┌─────────────────────────────────────────────┐
│ 1. User clicks "Run Test Suite"            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. Check setupConfig.enabled                │
│    If false → Skip to step 7                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3. Load Setup Profile                       │
│    Get profile by setupProfileId            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 4. Build Management                         │
│    - Check if build specified               │
│    - Download if needed                     │
│    - Verify integrity (MD5)                 │
│    - Install APK                            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 5. Apply Setup Profile                      │
│    - Clear data (if needed)                 │
│    - Set device settings                    │
│    - Run first-time setup steps             │
│    - Apply Unity SDK setup                  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 6. Verify Setup Success                     │
│    - Check app launched                     │
│    - Verify expected screen                 │
│    - Log setup duration                     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 7. Execute Test Cases                       │
│    For each test in suite:                  │
│    - Run test                               │
│    - If runSetupBeforeEach: Repeat step 5   │
│    - Record results                         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 8. Generate Report                          │
│    - Setup time                             │
│    - Test results                           │
│    - Build info                             │
└─────────────────────────────────────────────┘
```

---

## 📂 **4. Directory Structure**

```
AppData/Roaming/playguard/
├── builds/
│   ├── com.company.game/
│   │   ├── v1.2.3-build42/
│   │   │   ├── app.apk            (actual APK file)
│   │   │   └── metadata.json      (build info)
│   │   ├── v1.2.4-build45/
│   │   │   ├── app.apk
│   │   │   └── metadata.json
│   │   └── latest -> v1.2.4-build45/  (symlink to latest)
│   └── com.other.app/
│       └── v2.0.0/
│           ├── app.apk
│           └── metadata.json
├── setup-profiles.json            (setup profiles)
├── test-suites.json               (test suites)
└── builds-index.json              (build registry)
```

---

## 💻 **5. UI Components**

### A) Build Manager Tab (Settings)

```
┌─────────────────────────────────────────────────────────────┐
│  Build Manager                                    [+ Add Build]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📦 MyGame (com.company.game)                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ v1.2.4 (Build 45) - Latest                    ✓ Installed│
│  │ Production • main branch • 45.2 MB                       │
│  │ Released: 2026-02-06 • Last used: 2 hours ago           │
│  │ [📥 Download] [🗑️ Delete] [ℹ️ Details]                  │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ v1.2.3 (Build 42)                                        │
│  │ Staging • develop branch • 44.8 MB                       │
│  │ Released: 2026-02-05 • Last used: 1 day ago             │
│  │ [📥 Download] [🗑️ Delete] [ℹ️ Details]                  │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  📦 OtherGame (com.other.app)                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ v2.0.0 (Build 100)                           ✓ Installed│
│  │ Production • release/2.0 branch • 120.5 MB              │
│  │ Released: 2026-02-01 • Last used: 3 days ago            │
│  │ [📥 Download] [🗑️ Delete] [ℹ️ Details]                  │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### B) Add Build Dialog

```
┌─────────────────────────────────────────┐
│  Add Build                              │
├─────────────────────────────────────────┤
│                                         │
│  Source:                                │
│  ○ Local APK File                       │
│  ○ Unity Cloud Build                    │
│  ○ TestFlight                           │
│  ● Download URL                         │
│                                         │
│  Download URL:                          │
│  ┌─────────────────────────────────┐   │
│  │ https://builds.mycompany.com/.. │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Package Name:                          │
│  ┌─────────────────────────────────┐   │
│  │ com.company.game                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Version (optional):                    │
│  ┌─────────────────────────────────┐   │
│  │ 1.2.4                           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Build Number (optional):               │
│  ┌─────────────────────────────────┐   │
│  │ 45                              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Cancel]              [Add Build]      │
└─────────────────────────────────────────┘
```

### C) Enhanced Setup Profile Editor

```
┌─────────────────────────────────────────────────────┐
│  Setup Profile: Regression Test                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📦 Build Configuration                             │
│  ┌───────────────────────────────────────────────┐ │
│  │ ☑ Install build before setup                  │ │
│  │                                                │ │
│  │ Build Selection:                               │ │
│  │ ○ Use specific build                          │ │
│  │   [Select Build ▼] v1.2.4 (Build 45)         │ │
│  │                                                │ │
│  │ ● Always use latest build                     │ │
│  │   Package: com.company.game                   │ │
│  │                                                │ │
│  │ ☑ Auto-download if not cached                 │ │
│  │ ☑ Force reinstall (even if same version)      │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  🎮 First-Time Setup (after install)               │
│  ┌───────────────────────────────────────────────┐ │
│  │ ☑ Run first-time setup steps                  │ │
│  │                                                │ │
│  │ Steps:                                         │ │
│  │ 1. Wait 3s (splash screen)                    │ │
│  │ 2. Accept permissions                         │ │
│  │ 3. Tap "Accept" button                        │ │
│  │ 4. Skip tutorial (Unity SDK)                  │ │
│  │                                                │ │
│  │ [+ Add Step] [Edit] [Remove]                  │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ⚙️ Device Settings                                 │
│  ... (existing device settings) ...               │
│                                                     │
│  [Cancel]                      [Save Profile]      │
└─────────────────────────────────────────────────────┘
```

### D) Test Suite Setup Configuration

```
┌─────────────────────────────────────────────────────┐
│  Test Suite: Login Tests                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🔧 Setup Configuration                             │
│  ┌───────────────────────────────────────────────┐ │
│  │ ☑ Apply setup before execution                │ │
│  │                                                │ │
│  │ Setup Profile:                                 │ │
│  │ [Select Profile ▼] Regression Test            │ │
│  │                                                │ │
│  │ Build Override (optional):                     │ │
│  │ ○ Use profile's build                         │ │
│  │ ● Override with:                               │ │
│  │   [Select Build ▼] v1.2.3 (Build 42)         │ │
│  │                                                │ │
│  │ Execution Options:                             │ │
│  │ ○ Run setup once (before all tests)           │ │
│  │ ● Run setup before each test                  │ │
│  │                                                │ │
│  │ ☐ Continue on setup failure                   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  📝 Test Cases (5)                                  │
│  ... (test cases list) ...                         │
│                                                     │
│  [Cancel]                      [Save Suite]        │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 **6. Implementation Order**

### Phase 1: Build Management Core (Week 1)
1. **BuildManager backend**
   - File storage structure
   - Add/import local APK
   - List/delete builds
   - Extract APK metadata (version, package name, size)

2. **Basic UI**
   - Build Manager tab in Settings
   - Add local APK dialog
   - List builds with metadata

### Phase 2: Download Integration (Week 2)
1. **URL Download**
   - Generic URL downloader with progress
   - MD5 verification
   - Resume interrupted downloads

2. **Unity Cloud Build Integration**
   - API authentication
   - List available builds
   - Download specific build

3. **TestFlight Integration** (if needed)
   - API integration
   - Download URL extraction

### Phase 3: Enhanced Setup Profiles (Week 2-3)
1. **Update SetupProfile schema**
   - Add build configuration
   - Add first-time setup steps

2. **Setup Profile UI updates**
   - Build selection dropdown
   - First-time setup step editor
   - Visual step builder

3. **First-Time Setup Executor**
   - Execute automation steps
   - Handle common patterns (permissions, tutorials)
   - Integration with Unity SDK

### Phase 4: Test Suite Integration (Week 3-4)
1. **Update TestSuite schema**
   - Add setupConfig section

2. **Suite UI updates**
   - Setup configuration panel
   - Build override selector

3. **Enhanced TestRunner**
   - Pre-execution setup
   - Build installation
   - First-time setup execution
   - Setup result reporting

---

## 📊 **7. Benefits**

### Time Savings
- **Build Installation**: Automated (was 5+ min manual)
- **First-Time Setup**: Automated (was 2-5 min manual)
- **Device Configuration**: Automated (already done)
- **Total**: ~10-15 minutes saved per test suite setup

### Reliability
- ✅ Always test with correct build version
- ✅ Consistent first-time setup
- ✅ No human error in installation
- ✅ Reproducible test conditions

### Version Control
- ✅ Keep multiple build versions
- ✅ Test against specific builds
- ✅ Regression testing with old versions
- ✅ Compare results across versions

### Team Collaboration
- ✅ Share setup profiles (includes build + config)
- ✅ Centralized build storage
- ✅ Automatic latest build testing
- ✅ Build changelog tracking

---

## 🎯 **8. Example Workflows**

### Workflow 1: Daily Regression with Latest Build

```typescript
// Setup Profile: "Daily Regression"
{
  name: "Daily Regression",
  build: {
    enabled: true,
    alwaysUseLatest: true,      // Always get latest from Unity Cloud
    autoDownload: true,
    forceReinstall: true
  },
  firstTimeSetup: {
    enabled: true,
    steps: [
      { type: 'wait', duration: 3000 },
      { type: 'accept_permissions' },
      { type: 'skip_tutorial', method: 'unity_sdk' }
    ]
  },
  // ... device settings
}

// Test Suite: "Smoke Tests"
{
  name: "Smoke Tests",
  setupConfig: {
    enabled: true,
    setupProfileId: "daily_regression",
    runSetupBeforeEach: false    // Only once
  },
  testCases: [...]
}

// Execution:
// 1. Download latest Unity build (automatic)
// 2. Install APK
// 3. Run first-time setup
// 4. Set device to test conditions
// 5. Execute all smoke tests
// Total time: ~2 minutes (was 15+ minutes manual)
```

### Workflow 2: Version Comparison Testing

```typescript
// Test Suite: "v1.2.3 vs v1.2.4 Comparison"
{
  name: "Performance Comparison",
  setupConfig: {
    enabled: true,
    setupProfileId: "performance_profile",
    buildId: "build_v1.2.3"      // Test old version first
  }
}

// Then manually change buildId to "build_v1.2.4" and run again
// Compare reports to see performance regression/improvement
```

### Workflow 3: Multi-Game Testing

```typescript
// Build Manager stores:
// - GameA v1.0.0, v1.1.0, v1.2.0
// - GameB v2.0.0, v2.1.0
// - GameC v3.0.0

// Each game has its own setup profile:
// - GameA Profile (skipTutorial + setCoins:1000)
// - GameB Profile (acceptTerms + selectLanguage:en)
// - GameC Profile (completeOnboarding + unlockAllLevels)

// Test suites reference their game's profile + build
// QA can switch between games instantly with proper setup
```

---

## ✅ **Next Steps**

Ready to implement? Start with:

1. **BuildManager backend** (Core functionality)
2. **Build Manager UI** (Add/list/delete builds)
3. **Enhanced Setup Profiles** (Build + first-time setup)
4. **Suite Integration** (Link everything together)

Estimated total time: **3-4 weeks for complete system**

---

**Status**: Design Complete ✅
**Ready for Implementation**: Phase 1 - Build Management Core
