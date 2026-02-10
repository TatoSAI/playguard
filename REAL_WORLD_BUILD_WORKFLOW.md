# Real-World Build Workflow

## 📱 Realidad del Testing

### Workflow Real:
```
Build distribution (Google Drive/Slack/Unity Cloud)
    ↓
QA descarga APK
    ↓
APK siempre termina en: /sdcard/Download/
    ↓
PlayGuard detecta y usa APK
    ↓
QA borra builds viejos cuando necesita espacio
```

### Principios:
- ✅ **Build siempre en Downloads** - Fuente no importa
- ✅ **QA maneja espacio** - Borra builds viejos manualmente
- ✅ **Builds son efímeros** - Vienen y van
- ✅ **No tracking complejo** - Solo usar lo que está disponible

---

## 🔄 **Sistema Simplificado**

### NO Necesitamos:
- ❌ URLs de Unity Cloud Build
- ❌ TestFlight integration
- ❌ Download management
- ❌ Build references persistentes
- ❌ Version tracking complejo

### SÍ Necesitamos:
- ✅ Scan `/sdcard/Download/`
- ✅ Detectar APKs disponibles
- ✅ Instalar el APK que QA elija
- ✅ Setup profiles simples

---

## 📦 **Simplified Data Model**

### AvailableAPK (Temporal, no persistir)

```typescript
interface AvailableAPK {
  // Solo info del APK que está en el device AHORA
  filename: string              // "MyGame_v1.2.3.apk"
  path: string                  // "/sdcard/Download/MyGame_v1.2.3.apk"
  size: number                  // 45200000
  modifiedDate: number          // File timestamp

  // Metadata extraída
  packageName: string           // "com.company.game"
  versionName: string           // "1.2.3"
  versionCode: number           // 42
  appName: string               // "MyGame"

  // Estado
  isCurrentlyInstalled: boolean // ¿Ya está instalado en device?
}
```

**NO se persiste** - Se genera cada vez que se escanea el device

---

## 🔧 **Simplified Setup Profile**

```typescript
interface SetupProfile {
  id: string
  name: string
  description: string

  // === Build - SIMPLIFICADO ===
  build: {
    enabled: boolean

    // Opciones simples
    mode: 'current_installed' | 'select_from_device' | 'auto_latest'

    // Si mode = 'select_from_device'
    lastUsedPackage?: string    // "com.company.game"
    lastUsedPath?: string       // Hint, no garantía que exista

    forceReinstall: boolean
  }

  // First-time setup (after install)
  firstTimeSetup?: {
    enabled: boolean
    steps: FirstTimeSetupStep[]
  }

  // Device settings
  brightness?: number
  volume?: number
  orientation?: 'portrait' | 'landscape' | 'auto'
  wifi: boolean
  mobileData: boolean
  airplane: boolean

  // Unity SDK setup
  unitySetup?: {
    enabled: boolean
    skipTutorial?: boolean
    setPlayerCoins?: number
    unlockLevel?: number
    customActions?: UnitySetupAction[]
  }

  clearCache: boolean
  timeout: number

  createdAt: number
  updatedAt: number
}
```

### Build Modes Explicados

#### 1. **current_installed** (Default)
```
"Usar la app que ya está instalada"

Workflow:
1. NO instala nada
2. Solo aplica device settings
3. Ejecuta first-time setup si es nueva instalación
4. Listo

Caso de uso:
- QA ya instaló manualmente
- Testing rápido sin reinstalar
```

#### 2. **select_from_device**
```
"Escanear device y dejar que QA elija"

Workflow:
1. Scan /sdcard/Download/
2. Mostrar lista de APKs encontrados
3. QA selecciona cuál instalar
4. Instalar y continuar

Caso de uso:
- Múltiples APKs en Downloads
- QA decide versión a probar
```

#### 3. **auto_latest**
```
"Usar el APK más reciente en Downloads"

Workflow:
1. Scan /sdcard/Download/
2. Encontrar APK más reciente (por date modified)
3. Instalar automáticamente
4. Continuar

Caso de uso:
- Automation/CI
- Siempre probar último build
```

---

## 💻 **UI Simplificada**

### Setup Profile Editor

```
┌─────────────────────────────────────────────────────┐
│  Setup Profile: Daily Tests                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📦 Build                                           │
│  ┌───────────────────────────────────────────────┐ │
│  │ Build Mode:                                    │ │
│  │                                                │ │
│  │ ○ Use currently installed app                 │ │
│  │   └─ Fast, no installation needed             │ │
│  │                                                │ │
│  │ ● Scan device and let me choose               │ │
│  │   └─ Shows APKs in Downloads folder           │ │
│  │   Package hint: com.company.game              │ │
│  │                                                │ │
│  │ ○ Auto-install latest from Downloads          │ │
│  │   └─ Uses newest APK automatically            │ │
│  │                                                │ │
│  │ ☑ Force reinstall (uninstall first)           │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  🎮 First-Time Setup                                │
│  ... (unchanged) ...                                │
│                                                     │
│  ⚙️ Device Settings                                 │
│  ... (unchanged) ...                                │
└─────────────────────────────────────────────────────┘
```

### Execution Flow - Mode: select_from_device

```
User: "Run Test Suite: Smoke Tests"
    ↓
Setup Profile mode: select_from_device
    ↓
┌─────────────────────────────────────────┐
│  Select APK to Install                  │
├─────────────────────────────────────────┤
│  Scanning /sdcard/Download/...          │
│                                         │
│  Found 2 APKs:                          │
│                                         │
│  ● MyGame_v1.2.4_Feb07.apk             │
│    v1.2.4 (Build 45) • 46.1 MB         │
│    Modified: 2 hours ago                │
│                                         │
│  ○ MyGame_v1.2.3_Feb06.apk             │
│    v1.2.3 (Build 42) • 45.2 MB         │
│    Modified: 1 day ago                  │
│                                         │
│  [Cancel]              [Install Selected]│
└─────────────────────────────────────────┘
    ↓
Installing...
    ↓
Done! Continuing with tests
```

### Execution Flow - Mode: auto_latest

```
User: "Run Test Suite: Regression"
    ↓
Setup Profile mode: auto_latest
    ↓
Scanning /sdcard/Download/... Found: MyGame_v1.2.4_Feb07.apk
    ↓
Installing automatically... (3 seconds)
    ↓
Done! Running first-time setup...
    ↓
Executing tests...
```

---

## 🎮 **Test Suite Integration**

### Simplified Suite Config

```typescript
interface TestSuite {
  id: string
  name: string
  description?: string

  // Setup
  setupProfileId?: string       // Optional: which setup profile to use

  // If no setup profile, just run tests on currently installed app
  requiresSetup: boolean        // false = just run tests

  testCases: TestCase[]
  tags: string[]
  createdAt: number
  updatedAt: number
}
```

### Suite Execution Logic

```typescript
async runTestSuite(suiteId: string, deviceId: string): Promise<void> {
  const suite = await this.getSuite(suiteId)

  // 1. Setup (if configured)
  if (suite.requiresSetup && suite.setupProfileId) {
    const profile = await this.getSetupProfile(suite.setupProfileId)

    switch (profile.build.mode) {
      case 'current_installed':
        // Do nothing, use what's installed
        break

      case 'select_from_device':
        // Show APK selection dialog
        const selectedAPK = await this.showAPKSelectionDialog(deviceId)
        if (selectedAPK) {
          await this.installFromDevice(deviceId, selectedAPK.path)
        }
        break

      case 'auto_latest':
        // Auto-install latest
        const latestAPK = await this.findLatestAPK(deviceId)
        if (latestAPK) {
          await this.installFromDevice(deviceId, latestAPK.path)
        }
        break
    }

    // Apply device settings
    await this.applyDeviceSettings(deviceId, profile)

    // Run first-time setup
    if (profile.firstTimeSetup?.enabled) {
      await this.runFirstTimeSetup(deviceId, profile.firstTimeSetup)
    }

    // Apply Unity SDK setup
    if (profile.unitySetup?.enabled) {
      await this.applyUnitySetup(deviceId, profile.unitySetup)
    }
  }

  // 2. Execute test cases
  for (const testCase of suite.testCases) {
    await this.executeTestCase(deviceId, testCase)
  }

  // 3. Generate report
  await this.generateReport(suite)
}
```

---

## 📂 **Storage - Minimal**

```
AppData/Roaming/playguard/
├── setup-profiles.json        (Setup profiles)
├── test-suites.json           (Test suites)
├── test-cases.json            (Test cases)
└── settings.json              (App settings)

// NO build-references.json - No lo necesitamos!
```

**Total storage**: < 1 MB (solo metadata)

---

## 🔄 **Manual Build Management by QA**

### QA Workflow:

```
1. Recibe link de build (Google Drive/Slack)
    ↓
2. Descarga en celular → /sdcard/Download/
    ↓
3. PlayGuard escanea y detecta automáticamente
    ↓
4. Ejecuta tests
    ↓
5. Cuando Download/ se llena:
   - QA borra builds viejos manualmente
   - Libera espacio para nuevos
    ↓
6. Ciclo continua
```

### PlayGuard NO gestiona:
- ❌ Cleanup automático de APKs en device
- ❌ Tracking de qué builds ya se usaron
- ❌ Sugerencias de qué borrar
- ❌ Descarga de builds

### PlayGuard SÍ hace:
- ✅ Detecta APKs disponibles
- ✅ Extrae metadata (version, package)
- ✅ Instala el que QA elija
- ✅ Ejecuta tests

**Separación de responsabilidades clara** ✅

---

## 🎯 **Simplified Implementation Plan**

### Phase 1: Core (Week 1)

```typescript
✅ DeviceAPKScanner
   - Scan /sdcard/Download/
   - Extract metadata with aapt
   - List available APKs

✅ DeviceAPKInstaller
   - Install from device path
   - Verify installation success

✅ Setup Profile - Build modes
   - current_installed
   - select_from_device
   - auto_latest

✅ Basic UI
   - APK selection dialog
   - Installation progress
```

### Phase 2: Integration (Week 1-2)

```typescript
✅ TestRunner integration
   - Check setup profile
   - Execute build mode logic
   - Continue with tests

✅ Setup Profile UI
   - Build mode selector
   - First-time setup editor

✅ Suite execution flow
   - Pre-test setup
   - Test execution
   - Reporting
```

### Phase 3: Polish (Week 2)

```typescript
✅ Error handling
   - APK not found
   - Installation failed
   - Permission issues

✅ Progress indicators
   - Scanning
   - Installing
   - Setup running

✅ Quick actions
   - "Scan device now" button
   - "Install last used" shortcut
```

---

## 💡 **Key Benefits**

### For QA:
- ✅ **No URL management** - Just download and it works
- ✅ **No cleanup by PlayGuard** - QA controls device storage
- ✅ **Fast** - Scan and install in seconds
- ✅ **Flexible** - Any distribution method works (Drive, Slack, etc.)

### For System:
- ✅ **Simple architecture** - No complex build tracking
- ✅ **Minimal storage** - No builds stored by PlayGuard
- ✅ **No internet dependency** - Works offline
- ✅ **Less code to maintain** - Simpler = fewer bugs

### For Team:
- ✅ **Distribution agnostic** - Use Google Drive, Slack, whatever
- ✅ **QA owns their workflow** - Manual control over builds
- ✅ **PlayGuard does testing** - Not build distribution

---

## 📊 **Comparison: Complex vs Simple**

| Feature | Complex System ❌ | Simple System ✅ |
|---------|------------------|------------------|
| Build Storage | PlayGuard manages | QA manages on device |
| Distribution | Unity/TestFlight API | Any method → Downloads |
| URL Tracking | Yes, persistent | No, not needed |
| Cleanup | PlayGuard auto | QA manual |
| Internet | Required | Not required |
| Complexity | High | Low |
| Storage | ~1GB | ~1MB |
| Maintenance | High | Low |

---

## ✅ **Final Architecture**

### Components:

```
PlayGuard
├─ DeviceAPKScanner (scan Downloads folder)
├─ DeviceAPKInstaller (install from device)
├─ SetupProfile (with 3 build modes)
└─ TestRunner (orchestrate everything)

Storage:
└─ setup-profiles.json (< 100 KB)

Device:
└─ /sdcard/Download/ (managed by QA)
```

### Workflow:

```
QA downloads build (any method) → /sdcard/Download/
    ↓
PlayGuard scans device
    ↓
QA selects APK (or auto-latest)
    ↓
Install (3-5 seconds)
    ↓
Run tests
    ↓
QA cleans Downloads when needed
```

---

## 🎯 **Summary**

### What Changed:
- ❌ Removed: Unity Cloud, TestFlight, URL tracking, build references
- ✅ Kept: Device scanning, installation, setup profiles
- ✅ Added: 3 simple build modes

### Why Simpler is Better:
- Matches **real QA workflow**
- No over-engineering
- Less code = fewer bugs
- QA controls their storage
- Distribution method agnostic

### Result:
**Lean, focused system that does exactly what's needed** ✅

---

**Status**: Final Design Complete ✅
**Ready for Implementation**: Phase 1 - Device APK Scanner + Installer
