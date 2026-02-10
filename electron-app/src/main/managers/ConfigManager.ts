import { promises as fs } from 'fs'
import * as path from 'path'
import { safeStorage } from 'electron'
import { AppSettings, AISettings, RecordingSettings, ExecutionSettings, UISettings } from '../types/models'

export class ConfigManager {
  private configFile: string
  private settings: AppSettings | null = null

  constructor(userDataPath: string) {
    const configDir = path.join(userDataPath, 'config')
    this.configFile = path.join(configDir, 'settings.json')
  }

  async initialize(): Promise<void> {
    console.log('[ConfigManager] Initializing...')

    // Create config directory if it doesn't exist
    try {
      const configDir = path.dirname(this.configFile)
      await fs.mkdir(configDir, { recursive: true })
      console.log(`[ConfigManager] Config directory ready: ${configDir}`)
    } catch (error) {
      console.error('[ConfigManager] Failed to create config directory:', error)
      throw error
    }

    // Load settings
    await this.loadSettings()
  }

  async loadSettings(): Promise<AppSettings> {
    try {
      const content = await fs.readFile(this.configFile, 'utf-8')
      this.settings = JSON.parse(content)
      console.log('[ConfigManager] Settings loaded successfully')
    } catch (error) {
      // File doesn't exist, create default settings
      console.log('[ConfigManager] No settings file found, creating default settings')
      this.settings = this.getDefaultSettings()
      await this.saveSettings()
    }

    return this.settings!
  }

  async saveSettings(updates?: Partial<AppSettings>): Promise<void> {
    if (updates) {
      this.settings = {
        ...this.settings!,
        ...updates
      }
    }

    try {
      const content = JSON.stringify(this.settings, null, 2)
      await fs.writeFile(this.configFile, content, 'utf-8')
      console.log('[ConfigManager] Settings saved successfully')
    } catch (error) {
      console.error('[ConfigManager] Failed to save settings:', error)
      throw error
    }
  }

  // ============================================================================
  // AI Settings
  // ============================================================================

  async setAPIKey(provider: string, apiKey: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[ConfigManager] Encryption not available, storing API key in plain text')
      // Store plain text as fallback (not recommended for production)
      this.settings!.ai.apiKey = apiKey
      this.settings!.ai.apiKeySet = true
    } else {
      // Encrypt API key
      const encrypted = safeStorage.encryptString(apiKey)
      this.settings!.ai.apiKey = encrypted.toString('base64')
      this.settings!.ai.apiKeySet = true
    }

    await this.saveSettings()
    console.log(`[ConfigManager] API key set for provider: ${provider}`)
  }

  async getAPIKey(provider: string): Promise<string | null> {
    const encrypted = this.settings?.ai.apiKey
    if (!encrypted) {
      return null
    }

    try {
      if (!safeStorage.isEncryptionAvailable()) {
        // Return plain text (fallback)
        return encrypted
      }

      // Decrypt API key
      const buffer = Buffer.from(encrypted, 'base64')
      const decrypted = safeStorage.decryptString(buffer)
      return decrypted
    } catch (error) {
      console.error('[ConfigManager] Failed to decrypt API key:', error)
      return null
    }
  }

  async hasAPIKey(provider: string): Promise<boolean> {
    return this.settings?.ai.apiKeySet || false
  }

  async clearAPIKey(provider: string): Promise<void> {
    if (this.settings) {
      this.settings.ai.apiKey = undefined
      this.settings.ai.apiKeySet = false
      await this.saveSettings()
      console.log(`[ConfigManager] API key cleared for provider: ${provider}`)
    }
  }

  async updateAISettings(aiSettings: Partial<AISettings>): Promise<void> {
    if (this.settings) {
      this.settings.ai = {
        ...this.settings.ai,
        ...aiSettings
      }
      await this.saveSettings()
      console.log('[ConfigManager] AI settings updated')
    }
  }

  // ============================================================================
  // Recording Settings
  // ============================================================================

  async updateRecordingSettings(recordingSettings: Partial<RecordingSettings>): Promise<void> {
    if (this.settings) {
      this.settings.recording = {
        ...this.settings.recording,
        ...recordingSettings
      }
      await this.saveSettings()
      console.log('[ConfigManager] Recording settings updated')
    }
  }

  // ============================================================================
  // Execution Settings
  // ============================================================================

  async updateExecutionSettings(executionSettings: Partial<ExecutionSettings>): Promise<void> {
    if (this.settings) {
      this.settings.execution = {
        ...this.settings.execution,
        ...executionSettings
      }
      await this.saveSettings()
      console.log('[ConfigManager] Execution settings updated')
    }
  }

  // ============================================================================
  // UI Settings
  // ============================================================================

  async updateUISettings(uiSettings: Partial<UISettings>): Promise<void> {
    if (this.settings) {
      this.settings.ui = {
        ...this.settings.ui,
        ...uiSettings
      }
      await this.saveSettings()
      console.log('[ConfigManager] UI settings updated')
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private getDefaultSettings(): AppSettings {
    return {
      version: '2.0',
      ai: {
        enabled: false,
        provider: 'anthropic',
        apiKeySet: false,
        model: 'claude-3-5-sonnet-20241022',
        autoFillFields: {
          testDescription: true,
          stepDescription: true,
          prerequisites: true,
          tags: true
        },
        maxTokens: 1000,
        temperature: 0.7
      },
      recording: {
        defaultEnvironment: 'Development',
        autoScreenshot: true,
        screenshotDelay: 1000,
        coordinatePrecision: 0
      },
      execution: {
        defaultTimeout: 30000,
        retryOnFailure: false,
        retryCount: 2,
        screenshotOnError: true,
        verboseLogging: false
      },
      ui: {
        theme: 'auto',
        defaultView: 'grid',
        showThumbnails: true
      }
    }
  }

  getSettings(): AppSettings | null {
    return this.settings
  }

  async resetToDefaults(): Promise<void> {
    this.settings = this.getDefaultSettings()
    await this.saveSettings()
    console.log('[ConfigManager] Settings reset to defaults')
  }

  // ============================================================================
  // Validation
  // ============================================================================

  private validateSettings(settings: AppSettings): boolean {
    return !!(
      settings.version &&
      settings.ai &&
      settings.recording &&
      settings.execution &&
      settings.ui
    )
  }
}
