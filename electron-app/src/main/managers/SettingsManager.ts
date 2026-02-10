/**
 * Settings Manager
 * Handles persistent storage and management of PlayGuard settings
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

// Import types (will be available at runtime)
type PlayGuardSettings = any
type SettingsUpdate = any
type SettingsValidationResult = any
type SettingsValidationError = any

export class SettingsManager {
  private settingsPath: string
  private settings: PlayGuardSettings | null = null
  private watchers: Set<(settings: PlayGuardSettings) => void> = new Set()

  constructor() {
    const userDataPath = app.getPath('userData')
    this.settingsPath = path.join(userDataPath, 'settings.json')
    console.log('[SettingsManager] Initialized with path:', this.settingsPath)
  }

  /**
   * Initialize settings manager and load settings
   */
  async initialize(): Promise<void> {
    console.log('[SettingsManager] Initializing...')
    await this.loadSettings()
  }

  /**
   * Get current settings
   */
  getSettings(): PlayGuardSettings {
    if (!this.settings) {
      // Return default settings if not loaded
      return this.getDefaultSettings()
    }
    return { ...this.settings }
  }

  /**
   * Update settings (partial update)
   */
  async updateSettings(updates: SettingsUpdate): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[SettingsManager] Updating settings:', Object.keys(updates))

      // Merge with current settings
      const newSettings = this.deepMerge(this.getSettings(), updates)

      // Validate new settings
      const validation = this.validateSettings(newSettings)
      if (!validation.valid) {
        const errorMsg = validation.errors.map((e) => `${e.path}: ${e.message}`).join('; ')
        console.error('[SettingsManager] Validation failed:', errorMsg)
        return { success: false, error: errorMsg }
      }

      // Save to file
      await this.saveSettings(newSettings)

      // Update in-memory settings
      this.settings = newSettings

      // Notify watchers
      this.notifyWatchers()

      console.log('[SettingsManager] Settings updated successfully')
      return { success: true }
    } catch (error) {
      console.error('[SettingsManager] Error updating settings:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[SettingsManager] Resetting settings to defaults')

      const defaultSettings = this.getDefaultSettings()
      await this.saveSettings(defaultSettings)

      this.settings = defaultSettings
      this.notifyWatchers()

      return { success: true }
    } catch (error) {
      console.error('[SettingsManager] Error resetting settings:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Get a specific setting value by path
   * @example getSetting('recorder.autoScreenChange.enabled')
   */
  getSetting<T = any>(path: string): T | undefined {
    const settings = this.getSettings()
    return this.getNestedValue(settings, path)
  }

  /**
   * Set a specific setting value by path
   * @example setSetting('recorder.autoScreenChange.enabled', false)
   */
  async setSetting(path: string, value: any): Promise<{ success: boolean; error?: string }> {
    const update = this.createNestedObject(path, value)
    return await this.updateSettings(update)
  }

  /**
   * Watch for settings changes
   */
  watch(callback: (settings: PlayGuardSettings) => void): () => void {
    this.watchers.add(callback)
    return () => this.watchers.delete(callback)
  }

  /**
   * Export settings to file
   */
  async exportSettings(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = this.getSettings()
      await fs.promises.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8')
      console.log('[SettingsManager] Settings exported to:', filePath)
      return { success: true }
    } catch (error) {
      console.error('[SettingsManager] Error exporting settings:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Import settings from file
   */
  async importSettings(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = await fs.promises.readFile(filePath, 'utf-8')
      const importedSettings = JSON.parse(data)

      // Validate imported settings
      const validation = this.validateSettings(importedSettings)
      if (!validation.valid) {
        return {
          success: false,
          error: 'Invalid settings file: ' + validation.errors.map((e) => e.message).join('; ')
        }
      }

      // Save and apply imported settings
      await this.saveSettings(importedSettings)
      this.settings = importedSettings
      this.notifyWatchers()

      console.log('[SettingsManager] Settings imported from:', filePath)
      return { success: true }
    } catch (error) {
      console.error('[SettingsManager] Error importing settings:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  // ==================== Private Methods ====================

  /**
   * Load settings from file
   */
  private async loadSettings(): Promise<void> {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = await fs.promises.readFile(this.settingsPath, 'utf-8')
        const loadedSettings = JSON.parse(data)

        // Merge with defaults to add any new fields from updates
        this.settings = this.deepMerge(this.getDefaultSettings(), loadedSettings)

        console.log('[SettingsManager] Settings loaded from file')
      } else {
        // First run - use defaults
        this.settings = this.getDefaultSettings()
        await this.saveSettings(this.settings)
        console.log('[SettingsManager] Created default settings file')
      }
    } catch (error) {
      console.error('[SettingsManager] Error loading settings, using defaults:', error)
      this.settings = this.getDefaultSettings()
    }
  }

  /**
   * Save settings to file
   */
  private async saveSettings(settings: PlayGuardSettings): Promise<void> {
    const dir = path.dirname(this.settingsPath)
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true })
    }
    await fs.promises.writeFile(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): PlayGuardSettings {
    // This matches DEFAULT_SETTINGS from settings.ts
    return {
      version: '1.0.0',

      recorder: {
        autoScreenChange: {
          enabled: true,
          sensitivity: 75,
          debounceMs: 500
        },
        screenshotQuality: 90,
        captureInterval: 100,
        inputDetection: {
          tapDelay: 300,
          swipeMinDistance: 50,
          longPressThreshold: 500
        }
      },

      visualTesting: {
        screenshotSimilarity: {
          threshold: 0.95,
          algorithm: 'pixelmatch',
          ignoreAntialiasing: true,
          ignoreColors: false
        },
        visualRegression: {
          enabled: false,
          baselineUpdateMode: 'manual',
          storageLocation: 'local'
        }
      },

      ai: {
        provider: 'anthropic',
        features: {
          autoDescriptions: true,
          stepDescriptions: true,
          tagSuggestions: true,
          failureAnalysis: true,
          testGeneration: false
        },
        models: {
          descriptionModel: 'claude-sonnet-4-5-20250929',
          analysisModel: 'claude-opus-4-5-20251101',
          temperature: 0.7,
          maxTokens: 2000
        },
        costControls: {
          maxRequestsPerDay: 1000,
          maxCostPerMonth: 100,
          alertThreshold: 80
        }
      },

      testExecution: {
        retry: {
          enabled: true,
          maxAttempts: 3,
          retryDelay: 2000,
          retryOnErrors: ['timeout', 'element_not_found', 'network_error']
        },
        timeouts: {
          actionTimeout: 5000,
          elementTimeout: 10000,
          screenTimeout: 15000,
          testTimeout: 300000
        },
        errorHandling: {
          continueOnFailure: false,
          captureScreenshotOnError: true,
          captureLogcatOnError: true,
          saveCrashReports: true
        },
        performance: {
          parallelExecution: false,
          maxParallelTests: 3,
          warmupDelay: 1000
        }
      },

      reporting: {
        generation: {
          autoGenerate: true,
          formats: ['html', 'json'],
          includeScreenshots: true,
          includeVideos: false,
          includeLogs: true
        },
        storage: {
          location: '',
          retentionDays: 30,
          maxReports: 100,
          autoCleanup: true
        },
        content: {
          includeSystemInfo: true,
          includeDeviceInfo: true,
          includeEnvironmentVariables: false,
          includeTimings: true,
          includeMetrics: true
        }
      },

      integrations: {
        jira: {
          enabled: false,
          baseUrl: '',
          projectKey: '',
          issueType: 'Bug',
          defaultPriority: 'Medium',
          defaultComponents: [],
          autoCreateIssues: false,
          attachScreenshots: true,
          attachLogs: true
        },
        slack: {
          enabled: false,
          webhookUrl: '',
          channel: '#playguard',
          notifications: {
            testStart: false,
            testComplete: false,
            testFailure: true,
            suiteComplete: true
          },
          mentionOnFailure: [],
          includeScreenshots: true
        },
        github: {
          enabled: false,
          repository: '',
          autoCreateIssues: false,
          labels: ['bug', 'playguard']
        },
        webhooks: {
          enabled: false,
          endpoints: []
        }
      },

      unitySDK: {
        connection: {
          port: 12345,
          timeout: 5000,
          autoConnect: true,
          autoPortForward: true
        },
        customEvents: {
          enabled: true,
          definitions: []
        },
        elementDetection: {
          searchDepth: 10,
          includeInactive: false,
          cacheElements: true,
          cacheTimeout: 5000
        }
      },

      customSteps: {
        enabled: true,
        definitions: [],
        allowUserSteps: true
      },

      developer: {
        debug: {
          enabled: false,
          verboseLogging: false,
          logToFile: false,
          logFilePath: '',
          showDevTools: false
        },
        advanced: {
          enableExperimentalFeatures: false,
          allowUnsafeOperations: false
        },
        data: {
          autoBackup: true,
          backupInterval: 24,
          backupLocation: '',
          maxBackups: 10
        }
      },

      ui: {
        theme: 'system',
        language: 'en',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h'
      }
    }
  }

  /**
   * Validate settings structure
   */
  private validateSettings(settings: any): SettingsValidationResult {
    const errors: SettingsValidationError[] = []

    // Basic structure validation
    if (!settings || typeof settings !== 'object') {
      errors.push({ path: 'root', message: 'Settings must be an object' })
      return { valid: false, errors }
    }

    // Validate version
    if (!settings.version || typeof settings.version !== 'string') {
      errors.push({ path: 'version', message: 'Version is required and must be a string' })
    }

    // Validate required sections exist
    const requiredSections = [
      'recorder',
      'visualTesting',
      'ai',
      'testExecution',
      'reporting',
      'integrations',
      'unitySDK',
      'customSteps',
      'developer',
      'ui'
    ]

    for (const section of requiredSections) {
      if (!settings[section] || typeof settings[section] !== 'object') {
        errors.push({ path: section, message: `${section} section is required` })
      }
    }

    // Validate specific values
    if (settings.recorder?.screenshotQuality !== undefined) {
      const quality = settings.recorder.screenshotQuality
      if (typeof quality !== 'number' || quality < 0 || quality > 100) {
        errors.push({ path: 'recorder.screenshotQuality', message: 'Must be a number between 0 and 100' })
      }
    }

    if (settings.visualTesting?.screenshotSimilarity?.threshold !== undefined) {
      const threshold = settings.visualTesting.screenshotSimilarity.threshold
      if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
        errors.push({
          path: 'visualTesting.screenshotSimilarity.threshold',
          message: 'Must be a number between 0 and 1'
        })
      }
    }

    if (settings.unitySDK?.connection?.port !== undefined) {
      const port = settings.unitySDK.connection.port
      if (typeof port !== 'number' || port < 1 || port > 65535) {
        errors.push({ path: 'unitySDK.connection.port', message: 'Must be a valid port number (1-65535)' })
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target }

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key]
          } else {
            output[key] = this.deepMerge(target[key], source[key])
          }
        } else {
          output[key] = source[key]
        }
      })
    }

    return output
  }

  /**
   * Check if value is a plain object
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item)
  }

  /**
   * Get nested value from object using dot notation path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Create nested object from dot notation path and value
   */
  private createNestedObject(path: string, value: any): any {
    const keys = path.split('.')
    const result: any = {}
    let current = result

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = {}
      current = current[keys[i]]
    }

    current[keys[keys.length - 1]] = value
    return result
  }

  /**
   * Notify all watchers of settings changes
   */
  private notifyWatchers(): void {
    const settings = this.getSettings()
    this.watchers.forEach((callback) => {
      try {
        callback(settings)
      } catch (error) {
        console.error('[SettingsManager] Error in watcher callback:', error)
      }
    })
  }
}

// Singleton instance
let instance: SettingsManager | null = null

export function getSettingsManager(): SettingsManager {
  if (!instance) {
    instance = new SettingsManager()
  }
  return instance
}
