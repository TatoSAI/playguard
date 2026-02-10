import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { SetupProfile, SetupResult, SetupStepResult, DEFAULT_SETUP_PROFILE } from '../types/device-setup'
import { ADBManager } from '../adb/ADBManager'
import { UnityBridge } from '../unity/UnityBridge'

/**
 * DeviceSetupManager
 * Manages device setup profiles and automated device configuration
 */
export class DeviceSetupManager {
  private adbManager: ADBManager
  private unityBridge: UnityBridge | null
  private profilesPath: string
  private profiles: Map<string, SetupProfile> = new Map()

  constructor(adbManager: ADBManager, unityBridge?: UnityBridge) {
    this.adbManager = adbManager
    this.unityBridge = unityBridge || null

    // Setup profiles storage path
    const userDataPath = app.getPath('userData')
    this.profilesPath = join(userDataPath, 'setup-profiles.json')

    this.loadProfiles()
  }

  /**
   * Load all setup profiles from disk
   */
  private async loadProfiles(): Promise<void> {
    try {
      const data = await fs.readFile(this.profilesPath, 'utf-8')
      const profilesArray: SetupProfile[] = JSON.parse(data)

      this.profiles.clear()
      profilesArray.forEach(profile => {
        this.profiles.set(profile.id, profile)
      })

      console.log(`[DeviceSetupManager] Loaded ${this.profiles.size} setup profiles`)
    } catch (error) {
      // File doesn't exist yet, start with empty profiles
      console.log('[DeviceSetupManager] No existing profiles, starting fresh')
      await this.createDefaultProfile()
    }
  }

  /**
   * Save all profiles to disk
   */
  private async saveProfiles(): Promise<void> {
    try {
      const profilesArray = Array.from(this.profiles.values())
      await fs.writeFile(this.profilesPath, JSON.stringify(profilesArray, null, 2), 'utf-8')
      console.log(`[DeviceSetupManager] Saved ${profilesArray.length} profiles`)
    } catch (error) {
      console.error('[DeviceSetupManager] Failed to save profiles:', error)
      throw error
    }
  }

  /**
   * Create default setup profile
   */
  private async createDefaultProfile(): Promise<void> {
    const defaultProfile: SetupProfile = {
      id: 'default',
      ...DEFAULT_SETUP_PROFILE,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    this.profiles.set('default', defaultProfile)
    await this.saveProfiles()
  }

  /**
   * Get all setup profiles
   */
  getAllProfiles(): SetupProfile[] {
    return Array.from(this.profiles.values())
  }

  /**
   * Get a specific profile by ID
   */
  getProfile(id: string): SetupProfile | undefined {
    return this.profiles.get(id)
  }

  /**
   * Create a new setup profile
   */
  async createProfile(profile: Omit<SetupProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<SetupProfile> {
    const id = `profile_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const newProfile: SetupProfile = {
      id,
      ...profile,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    this.profiles.set(id, newProfile)
    await this.saveProfiles()

    console.log(`[DeviceSetupManager] Created profile: ${newProfile.name} (${id})`)
    return newProfile
  }

  /**
   * Update an existing profile
   */
  async updateProfile(id: string, updates: Partial<SetupProfile>): Promise<SetupProfile> {
    const existing = this.profiles.get(id)
    if (!existing) {
      throw new Error(`Profile not found: ${id}`)
    }

    const updated: SetupProfile = {
      ...existing,
      ...updates,
      id: existing.id, // Don't allow ID changes
      createdAt: existing.createdAt, // Don't allow creation date changes
      updatedAt: Date.now()
    }

    this.profiles.set(id, updated)
    await this.saveProfiles()

    console.log(`[DeviceSetupManager] Updated profile: ${updated.name} (${id})`)
    return updated
  }

  /**
   * Delete a setup profile
   */
  async deleteProfile(id: string): Promise<void> {
    if (id === 'default') {
      throw new Error('Cannot delete default profile')
    }

    if (!this.profiles.has(id)) {
      throw new Error(`Profile not found: ${id}`)
    }

    this.profiles.delete(id)
    await this.saveProfiles()

    console.log(`[DeviceSetupManager] Deleted profile: ${id}`)
  }

  /**
   * Apply a setup profile to a device
   * This is the main function that resets device to initial conditions
   */
  async applyProfile(deviceId: string, profileId: string): Promise<SetupResult> {
    const profile = this.profiles.get(profileId)
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`)
    }

    console.log(`[DeviceSetupManager] Applying profile "${profile.name}" to device ${deviceId}`)

    const startTime = Date.now()
    const steps: SetupStepResult[] = []

    try {
      // Step 1: Clear app data
      if (profile.clearAppData && profile.packageName) {
        const stepStart = Date.now()
        try {
          await this.adbManager.clearAppData(deviceId, profile.packageName)
          steps.push({
            step: 'Clear app data',
            success: true,
            duration: Date.now() - stepStart
          })
        } catch (error) {
          steps.push({
            step: 'Clear app data',
            success: false,
            duration: Date.now() - stepStart,
            error: String(error)
          })
        }
      }

      // Step 2: Reinstall app if requested
      if (profile.reinstallApp && profile.apkPath && profile.packageName) {
        const stepStart = Date.now()
        try {
          await this.adbManager.uninstall(deviceId, profile.packageName)
          await this.adbManager.installAPK(deviceId, profile.apkPath)
          steps.push({
            step: 'Reinstall app',
            success: true,
            duration: Date.now() - stepStart
          })
        } catch (error) {
          steps.push({
            step: 'Reinstall app',
            success: false,
            duration: Date.now() - stepStart,
            error: String(error)
          })
        }
      }

      // Step 3: Set device settings
      await this.applyDeviceSettings(deviceId, profile, steps)

      // Step 4: Unity SDK setup (if enabled and available)
      if (profile.unitySetup?.enabled && this.unityBridge) {
        await this.applyUnitySetup(deviceId, profile, steps)
      }

      // Step 5: Clear cache if requested
      if (profile.clearCache && profile.packageName) {
        const stepStart = Date.now()
        try {
          await this.adbManager.clearCache(deviceId, profile.packageName)
          steps.push({
            step: 'Clear cache',
            success: true,
            duration: Date.now() - stepStart
          })
        } catch (error) {
          steps.push({
            step: 'Clear cache',
            success: false,
            duration: Date.now() - stepStart,
            error: String(error)
          })
        }
      }

      const duration = Date.now() - startTime
      const allSuccessful = steps.every(s => s.success)

      console.log(`[DeviceSetupManager] Profile applied in ${duration}ms (${allSuccessful ? 'SUCCESS' : 'PARTIAL'})`)

      return {
        success: allSuccessful,
        profileId,
        deviceId,
        duration,
        steps
      }

    } catch (error) {
      console.error('[DeviceSetupManager] Failed to apply profile:', error)

      return {
        success: false,
        profileId,
        deviceId,
        duration: Date.now() - startTime,
        steps,
        error: String(error)
      }
    }
  }

  /**
   * Apply device settings (brightness, wifi, orientation, etc.)
   */
  private async applyDeviceSettings(
    deviceId: string,
    profile: SetupProfile,
    steps: SetupStepResult[]
  ): Promise<void> {
    // Brightness
    if (profile.brightness !== undefined) {
      const stepStart = Date.now()
      try {
        await this.adbManager.executeShellCommand(
          deviceId,
          `settings put system screen_brightness ${profile.brightness}`
        )
        steps.push({
          step: `Set brightness to ${profile.brightness}`,
          success: true,
          duration: Date.now() - stepStart
        })
      } catch (error) {
        steps.push({
          step: 'Set brightness',
          success: false,
          duration: Date.now() - stepStart,
          error: String(error)
        })
      }
    }

    // Volume
    if (profile.volume !== undefined) {
      const stepStart = Date.now()
      try {
        // Set media volume (stream 3)
        const volumeLevel = Math.floor((profile.volume / 100) * 15) // Max volume is typically 15
        await this.adbManager.executeShellCommand(
          deviceId,
          `media volume --stream 3 --set ${volumeLevel}`
        )
        steps.push({
          step: `Set volume to ${profile.volume}%`,
          success: true,
          duration: Date.now() - stepStart
        })
      } catch (error) {
        steps.push({
          step: 'Set volume',
          success: false,
          duration: Date.now() - stepStart,
          error: String(error)
        })
      }
    }

    // Orientation
    if (profile.orientation) {
      const stepStart = Date.now()
      try {
        await this.adbManager.setOrientation(deviceId, profile.orientation)
        steps.push({
          step: `Set orientation to ${profile.orientation}`,
          success: true,
          duration: Date.now() - stepStart
        })
      } catch (error) {
        steps.push({
          step: 'Set orientation',
          success: false,
          duration: Date.now() - stepStart,
          error: String(error)
        })
      }
    }

    // WiFi
    const stepStart = Date.now()
    try {
      await this.adbManager.toggleWifi(deviceId, profile.wifi)
      steps.push({
        step: `WiFi ${profile.wifi ? 'ON' : 'OFF'}`,
        success: true,
        duration: Date.now() - stepStart
      })
    } catch (error) {
      steps.push({
        step: 'Toggle WiFi',
        success: false,
        duration: Date.now() - stepStart,
        error: String(error)
      })
    }

    // Mobile Data
    const mobileStepStart = Date.now()
    try {
      await this.adbManager.toggleMobileData(deviceId, profile.mobileData)
      steps.push({
        step: `Mobile Data ${profile.mobileData ? 'ON' : 'OFF'}`,
        success: true,
        duration: Date.now() - mobileStepStart
      })
    } catch (error) {
      steps.push({
        step: 'Toggle Mobile Data',
        success: false,
        duration: Date.now() - mobileStepStart,
        error: String(error)
      })
    }

    // Airplane mode
    const airplaneStepStart = Date.now()
    try {
      await this.adbManager.toggleAirplaneMode(deviceId, profile.airplane)
      steps.push({
        step: `Airplane Mode ${profile.airplane ? 'ON' : 'OFF'}`,
        success: true,
        duration: Date.now() - airplaneStepStart
      })
    } catch (error) {
      steps.push({
        step: 'Toggle Airplane Mode',
        success: false,
        duration: Date.now() - airplaneStepStart,
        error: String(error)
      })
    }
  }

  /**
   * Apply Unity SDK setup actions
   */
  private async applyUnitySetup(
    deviceId: string,
    profile: SetupProfile,
    steps: SetupStepResult[]
  ): Promise<void> {
    if (!this.unityBridge || !profile.unitySetup) return

    const unitySetup = profile.unitySetup

    // Check if Unity SDK is available
    const stepStart = Date.now()
    try {
      const isAvailable = await this.unityBridge.ping()
      if (!isAvailable) {
        steps.push({
          step: 'Unity SDK connection',
          success: false,
          duration: Date.now() - stepStart,
          error: 'Unity SDK not available'
        })
        return
      }
    } catch (error) {
      steps.push({
        step: 'Unity SDK connection',
        success: false,
        duration: Date.now() - stepStart,
        error: String(error)
      })
      return
    }

    // Skip tutorial
    if (unitySetup.skipTutorial) {
      const stepStart = Date.now()
      try {
        await this.unityBridge.executeCustomAction('skipTutorial', [])
        steps.push({
          step: 'Skip tutorial',
          success: true,
          duration: Date.now() - stepStart
        })
      } catch (error) {
        steps.push({
          step: 'Skip tutorial',
          success: false,
          duration: Date.now() - stepStart,
          error: String(error)
        })
      }
    }

    // Set player coins
    if (unitySetup.setPlayerCoins !== undefined) {
      const stepStart = Date.now()
      try {
        await this.unityBridge.executeCustomAction('setPlayerCoins', [String(unitySetup.setPlayerCoins)])
        steps.push({
          step: `Set player coins to ${unitySetup.setPlayerCoins}`,
          success: true,
          duration: Date.now() - stepStart
        })
      } catch (error) {
        steps.push({
          step: 'Set player coins',
          success: false,
          duration: Date.now() - stepStart,
          error: String(error)
        })
      }
    }

    // Unlock level
    if (unitySetup.unlockLevel !== undefined) {
      const stepStart = Date.now()
      try {
        await this.unityBridge.executeCustomAction('unlockLevel', [String(unitySetup.unlockLevel)])
        steps.push({
          step: `Unlock level ${unitySetup.unlockLevel}`,
          success: true,
          duration: Date.now() - stepStart
        })
      } catch (error) {
        steps.push({
          step: 'Unlock level',
          success: false,
          duration: Date.now() - stepStart,
          error: String(error)
        })
      }
    }

    // Custom actions
    if (unitySetup.customActions && unitySetup.customActions.length > 0) {
      for (const customAction of unitySetup.customActions) {
        const stepStart = Date.now()
        try {
          await this.unityBridge.executeCustomAction(customAction.action, customAction.args || [])
          steps.push({
            step: `Unity: ${customAction.action}`,
            success: true,
            duration: Date.now() - stepStart
          })
        } catch (error) {
          steps.push({
            step: `Unity: ${customAction.action}`,
            success: false,
            duration: Date.now() - stepStart,
            error: String(error)
          })
        }
      }
    }
  }

  /**
   * Quick reset - Clear app data and restart with default settings
   */
  async quickReset(deviceId: string, packageName: string): Promise<SetupResult> {
    const quickProfile: SetupProfile = {
      id: 'quick_reset',
      name: 'Quick Reset',
      description: 'Fast reset to clean state',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      clearAppData: true,
      reinstallApp: false,
      packageName,
      wifi: true,
      mobileData: false,
      airplane: false,
      clearCache: true,
      killBackgroundApps: false,
      timeout: 30000
    }

    return this.applyProfile(deviceId, 'quick_reset')
  }
}
