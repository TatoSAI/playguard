# Build Reference System - Zero Local Storage

## ✅ Principio: NO Almacenar APKs Localmente

### ❌ Problemas del almacenamiento local:
- Ocupa mucho espacio (50-500MB por build)
- Riesgo de seguridad (archivos ejecutables)
- Requiere mantenimiento/limpieza
- Puede quedar desactualizado

### ✅ Solución: Build Reference System
- Almacenar SOLO metadata y URLs (unos KB)
- Descargar on-demand cuando se necesita
- Instalar directamente sin guardar
- Limpiar automáticamente después

---

## 📦 **1. Build Metadata (Solo Referencias)**

### Data Structure

```typescript
interface BuildReference {
  id: string
  name: string                    // "MyGame v1.2.3 - Production"
  version: string                 // "1.2.3"
  buildNumber: number            // 42
  platform: 'android' | 'ios'
  packageName: string            // "com.company.game"

  // Source (NO local path!)
  sourceType: 'unity_cloud' | 'testflight' | 'url'
  downloadUrl: string            // ¡Solo la URL!

  // Unity Cloud Build (si aplica)
  unityConfig?: {
    orgId: string
    projectId: string
    buildTargetId: string
    buildId: string
  }

  // TestFlight (si aplica)
  testFlightConfig?: {
    appId: string
    buildId: string
  }

  // Metadata
  releaseDate: number
  changelog?: string
  branch?: string
  commitHash?: string
  fileSize?: number              // Solo info, no archivo

  // Authentication (si necesita)
  requiresAuth: boolean
  authType?: 'api_key' | 'bearer' | 'basic'

  // Status
  lastDownloaded?: number        // Última vez que se descargó
  downloadCount: number          // Cuántas veces se usó

  createdAt: number
  updatedAt: number
}
```

### Storage

```typescript
// Solo guardar JSON (archivo pequeño: ~50KB para 100 builds)
AppData/Roaming/playguard/
├── build-references.json      // ¡Solo metadata! No APKs
├── setup-profiles.json
└── test-suites.json

// NO existe carpeta builds/ ❌
```

---

## 🔄 **2. On-Demand Download & Install**

### Workflow

```typescript
class BuildManager {
  // NO store locally
  async downloadAndInstall(
    deviceId: string,
    buildRef: BuildReference
  ): Promise<InstallResult> {
    // 1. Download to temp location
    const tempPath = await this.downloadToTemp(buildRef)

    try {
      // 2. Verify integrity (if md5 provided)
      if (buildRef.md5) {
        await this.verifyIntegrity(tempPath, buildRef.md5)
      }

      // 3. Install directly
      await this.adb.installAPK(deviceId, tempPath)

      // 4. Clean up immediately
      await this.cleanupTemp(tempPath)

      return { success: true, buildRef }

    } catch (error) {
      // Clean up on error too
      await this.cleanupTemp(tempPath)
      throw error
    }
  }

  private async downloadToTemp(buildRef: BuildReference): Promise<string> {
    // Download to system temp folder
    const tempDir = os.tmpdir()
    const tempFile = path.join(
      tempDir,
      `playguard_${buildRef.id}_${Date.now()}.apk`
    )

    // Download with progress
    await this.downloadFile(buildRef.downloadUrl, tempFile, {
      onProgress: (percent) => {
        this.emit('download:progress', { buildRef, percent })
      }
    })

    return tempFile
  }

  private async cleanupTemp(tempPath: string): Promise<void> {
    try {
      await fs.unlink(tempPath)
      console.log(`[BuildManager] Cleaned up temp file: ${tempPath}`)
    } catch (error) {
      console.warn(`[BuildManager] Failed to cleanup: ${error}`)
    }
  }
}
```

---

## 🔗 **3. URL Sources**

### A) Unity Cloud Build

```typescript
interface UnityCloudConfig {
  apiKey: string        // Stored in SecureStorage
  orgId: string
  projectId: string
}

class UnityCloudIntegration {
  // Get list of available builds (just metadata)
  async listBuilds(config: UnityCloudConfig): Promise<BuildReference[]> {
    const response = await fetch(
      `https://build-api.cloud.unity3d.com/api/v1/orgs/${config.orgId}/projects/${config.projectId}/buildtargets`,
      {
        headers: { 'Authorization': `Basic ${config.apiKey}` }
      }
    )

    const builds = await response.json()

    // Return only references, NO download yet
    return builds.map(b => ({
      id: b.build,
      name: `${b.projectName} ${b.buildNumber}`,
      version: b.buildNumber,
      platform: 'android',
      packageName: b.bundleId,
      sourceType: 'unity_cloud',
      downloadUrl: b.links.download_primary.href,  // ¡Solo URL!
      unityConfig: { orgId, projectId, buildId: b.build },
      releaseDate: new Date(b.created).getTime(),
      changelog: b.scmCommitId,
      requiresAuth: true,
      authType: 'api_key'
    }))
  }

  // Download ONLY when needed
  async getDownloadUrl(buildRef: BuildReference): Promise<string> {
    // Return fresh URL (in case it expires)
    return buildRef.downloadUrl
  }
}
```

### B) TestFlight

```typescript
class TestFlightIntegration {
  async listBuilds(appId: string, apiKey: string): Promise<BuildReference[]> {
    // Similar: return only metadata
    const response = await fetch(
      `https://api.appstoreconnect.apple.com/v1/builds?filter[app]=${appId}`,
      {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }
    )

    const builds = await response.json()

    return builds.data.map(b => ({
      id: b.id,
      name: `${b.attributes.version} (${b.attributes.buildNumber})`,
      version: b.attributes.version,
      buildNumber: parseInt(b.attributes.buildNumber),
      platform: 'ios',
      sourceType: 'testflight',
      downloadUrl: b.relationships.download.links.related,  // URL only
      testFlightConfig: { appId, buildId: b.id },
      releaseDate: new Date(b.attributes.uploadedDate).getTime(),
      requiresAuth: true,
      authType: 'bearer'
    }))
  }
}
```

### C) Generic URL

```typescript
// Firebase App Distribution, AppCenter, CDN, etc.
async addGenericBuild(url: string, metadata: Partial<BuildReference>): Promise<BuildReference> {
  // Validate URL is accessible
  const response = await fetch(url, { method: 'HEAD' })
  if (!response.ok) {
    throw new Error('URL not accessible')
  }

  const fileSize = parseInt(response.headers.get('content-length') || '0')

  return {
    id: `build_${Date.now()}`,
    sourceType: 'url',
    downloadUrl: url,  // ¡Solo URL!
    fileSize,
    requiresAuth: url.includes('?') || url.includes('token'),  // Auto-detect
    ...metadata
  }
}
```

---

## 🎮 **4. Setup Profile Integration**

### Updated Structure

```typescript
interface SetupProfile {
  id: string
  name: string

  // Build reference (NO local path)
  build?: {
    enabled: boolean
    buildReferenceId?: string    // Reference to BuildReference (NOT file!)
    alwaysUseLatest: boolean     // Use latest from source
    forceReinstall: boolean      // Uninstall first
  }

  // ... rest of config
}
```

### Execution Flow

```
1. User clicks "Run Test Suite"
    ↓
2. Load Setup Profile
    ↓
3. Get BuildReference by ID
    ↓
4. Download APK to temp folder
   └─ Show progress: "Downloading MyGame v1.2.3... 45%"
    ↓
5. Install APK directly from temp
   └─ Show: "Installing..."
    ↓
6. Delete temp file immediately
   └─ Cleanup: "Cleaning up..."
    ↓
7. Run first-time setup
    ↓
8. Execute tests
```

**Disk usage**: 0 MB (solo metadata JSON) ✅

---

## 💾 **5. Temp File Management**

### System Temp Folder

```typescript
// Use OS temp folder (cleaned automatically by OS)
const tempDir = os.tmpdir()

// Windows: C:\Users\User\AppData\Local\Temp\
// macOS: /var/folders/...
// Linux: /tmp/

// Files named: playguard_buildId_timestamp.apk
// Example: playguard_abc123_1738872000000.apk
```

### Auto-Cleanup

```typescript
class TempFileManager {
  private activeTempFiles: Set<string> = new Set()

  async createTempFile(buildId: string): Promise<string> {
    const tempPath = path.join(
      os.tmpdir(),
      `playguard_${buildId}_${Date.now()}.apk`
    )

    this.activeTempFiles.add(tempPath)
    return tempPath
  }

  async cleanup(tempPath: string): Promise<void> {
    try {
      await fs.unlink(tempPath)
      this.activeTempFiles.delete(tempPath)
    } catch (error) {
      console.warn('Cleanup failed:', error)
    }
  }

  // Cleanup all temp files on app exit
  async cleanupAll(): Promise<void> {
    for (const tempPath of this.activeTempFiles) {
      await this.cleanup(tempPath)
    }
  }

  // Cleanup old temp files (> 24 hours)
  async cleanupOldFiles(): Promise<void> {
    const tempDir = os.tmpdir()
    const files = await fs.readdir(tempDir)

    for (const file of files) {
      if (file.startsWith('playguard_')) {
        const filePath = path.join(tempDir, file)
        const stats = await fs.stat(filePath)
        const age = Date.now() - stats.mtimeMs

        if (age > 24 * 60 * 60 * 1000) {  // > 24 hours
          await fs.unlink(filePath)
          console.log(`[TempFileManager] Cleaned old file: ${file}`)
        }
      }
    }
  }
}
```

---

## 🔐 **6. Security Improvements**

### Authentication Storage

```typescript
// Store auth tokens in SecureStorage (encrypted)
interface BuildAuth {
  buildReferenceId: string
  authType: 'api_key' | 'bearer' | 'basic'
  credentials: string  // Encrypted
}

// Example: Unity Cloud API Key
await secureStorage.set('build_auth_unity_cloud', apiKey)

// Example: TestFlight Bearer Token
await secureStorage.set('build_auth_testflight', bearerToken)
```

### Download Verification

```typescript
// Verify downloads with MD5/SHA256
async verifyIntegrity(filePath: string, expectedHash: string): Promise<boolean> {
  const hash = await calculateMD5(filePath)

  if (hash !== expectedHash) {
    throw new Error('File integrity check failed!')
  }

  return true
}
```

### No Persistent Storage

- ❌ NO guardar APKs
- ❌ NO crear carpeta builds/
- ✅ Solo temp files durante instalación
- ✅ Cleanup automático

---

## 📊 **7. Benefits vs Local Storage**

| Aspecto | Local Storage ❌ | Reference System ✅ |
|---------|-----------------|-------------------|
| Disk Space | 50-500 MB per build | ~0.5 KB per build |
| Security | Stores executables | Only URLs/metadata |
| Updates | Manual refresh | Always fresh from source |
| Cleanup | Manual/periodic | Automatic |
| Corruption Risk | Yes (cached files) | No (download fresh) |
| Offline Support | Yes | No (needs internet) |

**Trade-off**: Requires internet connection, but MUCH safer and leaner.

---

## 💻 **8. UI Updates**

### Build Manager UI (Metadata Only)

```
┌─────────────────────────────────────────────────────────────┐
│  Build References                             [+ Add Build]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📦 MyGame (com.company.game)                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ v1.2.4 (Build 45) - Latest                              │
│  │ 🔗 Unity Cloud Build • 45.2 MB                          │
│  │ Released: 2026-02-06 • Used: 2 times                    │
│  │ [🔄 Refresh] [🗑️ Remove Reference] [ℹ️ Details]        │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ v1.2.3 (Build 42)                                        │
│  │ 🔗 Direct URL • 44.8 MB                                  │
│  │ Released: 2026-02-05 • Used: 5 times                    │
│  │ [🔄 Refresh] [🗑️ Remove Reference] [ℹ️ Details]        │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ℹ️ Builds are NOT stored locally. Downloaded on-demand.    │
└─────────────────────────────────────────────────────────────┘
```

### During Test Execution

```
┌─────────────────────────────────────────────┐
│  Running Test Suite: Smoke Tests           │
├─────────────────────────────────────────────┤
│                                             │
│  Setup Progress:                            │
│  ✓ Loading build reference                 │
│  ⏳ Downloading MyGame v1.2.3... 67%        │
│     (30.5 MB / 45.2 MB)                     │
│  ⏸ Installing...                            │
│  ⏸ Running first-time setup...             │
│  ⏸ Applying device settings...             │
│                                             │
│  [Cancel]                                   │
└─────────────────────────────────────────────┘
```

---

## 🎯 **9. Implementation Plan**

### Phase 1: Build Reference Core (Week 1)
```typescript
✅ BuildReference type definition
✅ BuildManager (add/list/delete references)
✅ Temp file management
✅ Download & install workflow
✅ Auto-cleanup
```

### Phase 2: Source Integrations (Week 2)
```typescript
✅ Unity Cloud Build API
✅ Generic URL support
✅ TestFlight API (optional)
✅ Authentication storage (SecureStorage)
```

### Phase 3: UI & Integration (Week 2-3)
```typescript
✅ Build Manager UI (references only)
✅ Download progress indicator
✅ Setup Profile integration
✅ Test Suite integration
```

---

## ✅ **Summary**

### What Changed:
- ❌ NO local APK storage
- ✅ Only metadata & URLs stored (JSON, ~50KB total)
- ✅ Download on-demand to temp folder
- ✅ Install & cleanup immediately
- ✅ Always fresh from source

### Benefits:
- ✅ Minimal disk space (~50KB vs ~500MB per build)
- ✅ More secure (no executables stored)
- ✅ No maintenance/cleanup needed
- ✅ Always up-to-date builds
- ✅ Simpler architecture

### Trade-off:
- ⚠️ Requires internet connection during setup
- ⚠️ Download time before each test (mitigated by fast downloads)

---

**Status**: Design Complete ✅
**Ready for Implementation**: Phase 1 - Build Reference System
