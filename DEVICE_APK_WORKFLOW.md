# Device APK Installation Workflow

## 📱 Escenario: APK ya está en el dispositivo

### Casos comunes:
- ✅ Desarrollador descargó APK directo al celular
- ✅ QA recibió APK por WhatsApp/Telegram
- ✅ Build descargado desde navegador móvil
- ✅ APK en carpeta Downloads del dispositivo

**Problema**: Re-descargar es ineficiente
**Solución**: Instalar directo desde device storage

---

## 🔄 **Workflow Completo**

### Opción 1: Scan & Install (Recomendado)

```
User conecta device → PlayGuard detecta
    ↓
User: "Scan Device for APKs"
    ↓
PlayGuard escanea:
  - /sdcard/Download/
  - /sdcard/Downloads/
  - /sdcard/DCIM/
  - /storage/emulated/0/Download/
    ↓
Muestra lista de APKs encontrados:
  ┌─────────────────────────────────────┐
  │ 📦 MyGame_v1.2.3.apk               │
  │ com.company.game • 45.2 MB         │
  │ /sdcard/Download/                  │
  │ [Install] [Create Reference]       │
  └─────────────────────────────────────┘
    ↓
User click "Install"
    ↓
PlayGuard:
  1. Instala APK desde device
  2. Extrae metadata (version, package)
  3. (Opcional) Crea BuildReference
  4. Listo para testing!
```

---

## 💻 **Implementation**

### A) Scan Device Storage

```typescript
class DeviceAPKScanner {
  // Common APK locations on Android
  private scanPaths = [
    '/sdcard/Download/',
    '/sdcard/Downloads/',
    '/storage/emulated/0/Download/',
    '/storage/emulated/0/Downloads/',
    '/sdcard/DCIM/Downloads/',
    '/mnt/sdcard/Download/'
  ]

  async scanForAPKs(deviceId: string): Promise<DeviceAPK[]> {
    const foundAPKs: DeviceAPK[] = []

    for (const path of this.scanPaths) {
      try {
        // List files in directory
        const files = await this.adb.executeShellCommand(
          deviceId,
          `ls -la "${path}" | grep -i ".apk$"`
        )

        // Parse output
        const apkFiles = this.parseAPKList(files, path)
        foundAPKs.push(...apkFiles)

      } catch (error) {
        // Path doesn't exist or no permission, skip
        continue
      }
    }

    // Extract metadata for each APK
    for (const apk of foundAPKs) {
      apk.metadata = await this.extractAPKMetadata(deviceId, apk.path)
    }

    return foundAPKs
  }

  private async extractAPKMetadata(
    deviceId: string,
    apkPath: string
  ): Promise<APKMetadata> {
    // Use aapt to extract info
    const output = await this.adb.executeShellCommand(
      deviceId,
      `aapt dump badging "${apkPath}"`
    )

    return this.parseAAPTOutput(output)
  }

  private parseAAPTOutput(output: string): APKMetadata {
    // Extract: package name, version, version code
    const packageMatch = output.match(/package: name='([^']+)'/)
    const versionMatch = output.match(/versionName='([^']+)'/)
    const versionCodeMatch = output.match(/versionCode='([^']+)'/)
    const labelMatch = output.match(/application-label:'([^']+)'/)

    return {
      packageName: packageMatch?.[1] || 'unknown',
      versionName: versionMatch?.[1] || 'unknown',
      versionCode: parseInt(versionCodeMatch?.[1] || '0'),
      appName: labelMatch?.[1] || 'Unknown App'
    }
  }
}
```

### B) Data Structures

```typescript
interface DeviceAPK {
  filename: string              // "MyGame_v1.2.3.apk"
  path: string                  // "/sdcard/Download/MyGame_v1.2.3.apk"
  size: number                  // 45200000 bytes
  modifiedDate: number          // timestamp
  metadata?: APKMetadata        // Extracted from APK
}

interface APKMetadata {
  packageName: string           // "com.company.game"
  versionName: string           // "1.2.3"
  versionCode: number           // 42
  appName: string               // "MyGame"
}
```

### C) Install from Device

```typescript
class DeviceAPKInstaller {
  async installFromDevice(
    deviceId: string,
    apkPath: string
  ): Promise<InstallResult> {
    console.log(`[DeviceAPKInstaller] Installing ${apkPath} on ${deviceId}`)

    try {
      // Install using pm install
      // Using -r flag to reinstall if exists
      // Using -d flag to allow downgrade
      await this.adb.executeShellCommand(
        deviceId,
        `pm install -r -d "${apkPath}"`
      )

      // Extract metadata after installation
      const metadata = await this.extractAPKMetadata(deviceId, apkPath)

      return {
        success: true,
        packageName: metadata.packageName,
        version: metadata.versionName,
        installedFrom: 'device_storage'
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // Optional: Pull APK from device to create local reference
  async pullAPKFromDevice(
    deviceId: string,
    apkPath: string,
    destPath: string
  ): Promise<string> {
    console.log(`[DeviceAPKInstaller] Pulling ${apkPath} to ${destPath}`)

    await this.adb.pull(deviceId, apkPath, destPath)

    return destPath
  }
}
```

### D) Create BuildReference from Device APK

```typescript
async createBuildReferenceFromDevice(
  deviceId: string,
  deviceAPK: DeviceAPK
): Promise<BuildReference> {
  const metadata = deviceAPK.metadata!

  // Create reference without download URL
  // Mark as "installed from device"
  const buildRef: BuildReference = {
    id: `build_device_${Date.now()}`,
    name: `${metadata.appName} ${metadata.versionName}`,
    version: metadata.versionName,
    buildNumber: metadata.versionCode,
    platform: 'android',
    packageName: metadata.packageName,

    sourceType: 'device_storage',  // New type!
    downloadUrl: '',  // No URL

    devicePath: deviceAPK.path,  // Store original path
    deviceId: deviceId,           // Which device it came from

    releaseDate: deviceAPK.modifiedDate,
    fileSize: deviceAPK.size,

    requiresAuth: false,
    lastDownloaded: Date.now(),
    downloadCount: 1,

    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  // Save reference
  await this.buildManager.saveBuildReference(buildRef)

  return buildRef
}
```

---

## 🎨 **UI Components**

### A) Device APK Scanner Dialog

```
┌─────────────────────────────────────────────────────┐
│  Scan Device for APKs                      [Refresh]│
├─────────────────────────────────────────────────────┤
│  Device: Xiaomi POCO X3 Pro (4b141bc2)             │
│                                                     │
│  📂 /sdcard/Download/                               │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📦 MyGame_v1.2.3_production.apk              │  │
│  │ com.company.game • v1.2.3 (Build 42)         │  │
│  │ 45.2 MB • Modified: 2026-02-07 10:30 AM      │  │
│  │ [Install & Test] [Create Reference] [Info]   │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📦 OtherGame_v2.0.0.apk                      │  │
│  │ com.other.app • v2.0.0 (Build 100)           │  │
│  │ 120.5 MB • Modified: 2026-02-06 3:15 PM      │  │
│  │ [Install & Test] [Create Reference] [Info]   │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  📂 /sdcard/Downloads/                              │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📦 TestApp_debug.apk                         │  │
│  │ com.test.debug • v1.0.0-debug (Build 1)      │  │
│  │ 12.8 MB • Modified: 2026-02-05 11:45 AM      │  │
│  │ [Install & Test] [Create Reference] [Info]   │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ℹ️ Found 3 APKs • Total: 178.5 MB                 │
│                                                     │
│  [Close]                                            │
└─────────────────────────────────────────────────────┘
```

### B) Quick Install Flow

```
User clicks "Install & Test"
    ↓
┌─────────────────────────────────────────┐
│  Installing MyGame v1.2.3               │
├─────────────────────────────────────────┤
│  ✓ Scanning device                      │
│  ✓ Found APK (45.2 MB)                  │
│  ⏳ Installing from device storage...   │
│  ⏸ Extracting metadata...               │
│  ⏸ Creating build reference...          │
│                                         │
│  [Cancel]                               │
└─────────────────────────────────────────┘
    ↓
Success!
┌─────────────────────────────────────────┐
│  ✓ MyGame v1.2.3 Installed              │
├─────────────────────────────────────────┤
│  Package: com.company.game              │
│  Build: 42                              │
│  Installed in: 3 seconds                │
│                                         │
│  Build reference created and saved.     │
│                                         │
│  [Start Testing] [Apply Setup Profile]  │
└─────────────────────────────────────────┘
```

### C) Build Manager - Device APKs Section

```
┌─────────────────────────────────────────────────────┐
│  Build Manager                    [Scan Device APKs]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  📱 From Device Storage                             │
│  ┌──────────────────────────────────────────────┐  │
│  │ MyGame v1.2.3 (Build 42)            ✓ Installed│
│  │ Installed from: Xiaomi POCO X3 Pro            │
│  │ Device path: /sdcard/Download/MyGame_v1.2.3.apk│
│  │ Used: 3 times • Last: 1 hour ago              │
│  │ [Reinstall] [Remove Reference] [Info]         │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  🔗 From Unity Cloud Build                          │
│  ┌──────────────────────────────────────────────┐  │
│  │ MyGame v1.2.4 (Build 45)                       │
│  │ Unity Cloud • 46.1 MB                          │
│  │ ... (rest of builds)                           │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🔗 **Integration with Setup Profiles**

### Updated Build Configuration

```typescript
interface SetupProfile {
  // ... existing fields

  build?: {
    enabled: boolean

    // Source selection
    sourceType: 'reference' | 'device_storage' | 'url'

    // If using build reference
    buildReferenceId?: string

    // If using device storage
    devicePath?: string          // "/sdcard/Download/app.apk"

    // If using URL
    downloadUrl?: string

    alwaysUseLatest: boolean
    forceReinstall: boolean
  }
}
```

### Setup Profile Editor - Device APK Option

```
┌─────────────────────────────────────────────────────┐
│  Setup Profile: Regression Test                    │
├─────────────────────────────────────────────────────┤
│  📦 Build Configuration                             │
│  ┌───────────────────────────────────────────────┐ │
│  │ ☑ Install build before setup                  │ │
│  │                                                │ │
│  │ Build Source:                                  │ │
│  │ ○ Build Reference (saved build)               │ │
│  │ ● Device Storage (APK on phone)               │ │
│  │ ○ Download URL                                │ │
│  │                                                │ │
│  │ Device APK Path:                               │ │
│  │ ┌──────────────────────────────────────────┐  │ │
│  │ │ /sdcard/Download/MyGame_v1.2.3.apk       │  │ │
│  │ └──────────────────────────────────────────┘  │ │
│  │ [Browse Device APKs]                           │ │
│  │                                                │ │
│  │ ☑ Force reinstall                              │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## ⚡ **Advantages of Device APK Installation**

### Comparison

| Method | Download from URL | Device Storage |
|--------|------------------|----------------|
| **Speed** | 30-60s (download) | 3-5s (instant) |
| **Internet** | Required | Not required |
| **Disk Usage** | Temp file needed | Already on device |
| **Reliability** | Network dependent | 100% reliable |
| **Common Use** | CI/CD, automation | Manual testing, dev |

### When to Use Each

**Device Storage** (Faster ✅):
- Developer testing
- QA received APK via chat
- Offline testing
- Quick iteration
- APK already downloaded

**Download URL** (Automated ✅):
- CI/CD pipelines
- Scheduled regression tests
- Always use latest build
- Team collaboration
- Remote execution

---

## 🔄 **Complete Workflow Options**

### Option 1: Scan & Install Immediately

```typescript
// Quick testing flow
1. User: "Scan Device for APKs"
2. PlayGuard: Lists APKs found
3. User: Clicks "Install & Test"
4. PlayGuard: Installs from device
5. Done! Ready to test

Time: ~5 seconds
```

### Option 2: Create Reference for Reuse

```typescript
// Create reference for future use
1. User: "Scan Device for APKs"
2. PlayGuard: Lists APKs found
3. User: Clicks "Create Reference"
4. PlayGuard:
   - Installs APK
   - Creates BuildReference
   - Saves for future use
5. Can now use in Setup Profiles

Time: ~10 seconds
Benefits: Reusable in test suites
```

### Option 3: Setup Profile with Device Path

```typescript
// Most flexible
1. Create Setup Profile
2. Build source: "Device Storage"
3. Path: "/sdcard/Download/app.apk"
4. Save profile
5. Use in multiple test suites

Benefits:
- No re-scanning needed
- Direct path reference
- Fast execution
```

---

## 💡 **Advanced Features**

### A) Auto-Detect New APKs

```typescript
// Monitor device for new APKs
class DeviceAPKMonitor {
  private watchPaths = ['/sdcard/Download/']

  async startMonitoring(deviceId: string): Promise<void> {
    // Check for new APKs every 10 seconds
    setInterval(async () => {
      const newAPKs = await this.scanForNewAPKs(deviceId)

      if (newAPKs.length > 0) {
        // Notify user
        this.emit('new-apks-found', {
          deviceId,
          apks: newAPKs
        })
      }
    }, 10000)
  }
}

// UI notification:
"🔔 New APK detected: MyGame_v1.2.4.apk
[Install Now] [Ignore]"
```

### B) Smart Path Detection

```typescript
// Remember commonly used paths per package
class APKPathCache {
  // Cache: com.company.game → /sdcard/Download/
  private pathCache = new Map<string, string>()

  async getLastKnownPath(packageName: string): Promise<string | null> {
    return this.pathCache.get(packageName) || null
  }

  async updatePath(packageName: string, path: string): Promise<void> {
    this.pathCache.set(packageName, path)
    await this.save()
  }
}

// Usage:
"Last APK for com.company.game found at:
/sdcard/Download/MyGame_v1.2.3.apk

[Use This Path] [Scan Again]"
```

### C) Bulk Install

```typescript
// Install multiple APKs at once
async installMultipleFromDevice(
  deviceId: string,
  apkPaths: string[]
): Promise<BulkInstallResult> {
  const results = []

  for (const path of apkPaths) {
    const result = await this.installFromDevice(deviceId, path)
    results.push(result)
  }

  return {
    total: apkPaths.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  }
}

// UI:
"Install 3 APKs from device?
✓ MyGame_v1.2.3.apk
✓ OtherApp_v2.0.apk
✓ TestApp_debug.apk

[Install All] [Cancel]"
```

---

## 🎯 **Implementation Priority**

### Phase 1: Basic Scanning (Week 1)
```typescript
✅ DeviceAPKScanner
✅ Scan common paths
✅ Extract APK metadata with aapt
✅ List APKs in UI
✅ Install from device
```

### Phase 2: Build Reference Integration (Week 1-2)
```typescript
✅ Create BuildReference from device APK
✅ Setup Profile device path option
✅ Test Suite integration
```

### Phase 3: Advanced Features (Week 2-3)
```typescript
✅ Auto-detect new APKs
✅ Path caching
✅ Bulk install
✅ Smart suggestions
```

---

## ✅ **Summary**

### What We Gain:
- ✅ **Faster installation** (3-5s vs 30-60s download)
- ✅ **No internet needed** (offline testing)
- ✅ **Supports common workflow** (APK in Downloads)
- ✅ **Developer friendly** (quick iteration)
- ✅ **QA friendly** (APK from WhatsApp/Telegram)

### How It Works:
1. **Scan** device storage for APKs
2. **Extract** metadata (version, package, size)
3. **Install** directly from device
4. **(Optional)** Create BuildReference for reuse
5. **Test** immediately!

### Best of Both Worlds:
- **Device Storage**: Fast, offline, immediate
- **Download URL**: Automated, CI/CD, always latest
- **Both options** available in Setup Profiles

---

**Status**: Design Complete ✅
**Ready to Implement**: Device APK Scanner + Installer
