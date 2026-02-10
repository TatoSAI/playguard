/**
 * Secure Storage Manager
 * Handles encrypted storage of sensitive data like API keys
 * Uses Electron's safeStorage for platform-native encryption
 */

import { safeStorage, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export interface SecureStorageItem {
  key: string
  encrypted: string
  timestamp: number
}

export class SecureStorage {
  private storagePath: string
  private cache: Map<string, string> = new Map()

  constructor() {
    const userDataPath = app.getPath('userData')
    this.storagePath = path.join(userDataPath, 'secure-storage.json')
    console.log('[SecureStorage] Initialized with path:', this.storagePath)
  }

  /**
   * Initialize secure storage
   */
  async initialize(): Promise<void> {
    console.log('[SecureStorage] Initializing...')

    // Check if encryption is available
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[SecureStorage] Encryption not available on this platform!')
    }

    // Load existing secure storage
    await this.loadStorage()
  }

  /**
   * Store an API key securely
   */
  async setAPIKey(
    provider: string,
    key: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[SecureStorage] Storing API key for provider:', provider)

      if (!key || key.trim().length === 0) {
        return { success: false, error: 'API key cannot be empty' }
      }

      // Encrypt the key
      const encrypted = this.encrypt(key)

      // Store in cache
      this.cache.set(`apikey_${provider}`, key)

      // Save to disk
      await this.saveItem(`apikey_${provider}`, encrypted)

      console.log('[SecureStorage] API key stored successfully')
      return { success: true }
    } catch (error) {
      console.error('[SecureStorage] Error storing API key:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Retrieve an API key
   */
  async getAPIKey(provider: string): Promise<{ success: boolean; key?: string; error?: string }> {
    try {
      const storageKey = `apikey_${provider}`

      // Check cache first
      if (this.cache.has(storageKey)) {
        return { success: true, key: this.cache.get(storageKey) }
      }

      // Load from disk
      const item = await this.loadItem(storageKey)
      if (!item) {
        return { success: false, error: 'API key not found' }
      }

      // Decrypt
      const decrypted = this.decrypt(item.encrypted)

      // Cache the result
      this.cache.set(storageKey, decrypted)

      return { success: true, key: decrypted }
    } catch (error) {
      console.error('[SecureStorage] Error retrieving API key:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Check if an API key exists
   */
  async hasAPIKey(provider: string): Promise<boolean> {
    const storageKey = `apikey_${provider}`

    // Check cache
    if (this.cache.has(storageKey)) {
      return true
    }

    // Check disk
    const item = await this.loadItem(storageKey)
    return item !== null
  }

  /**
   * Delete an API key
   */
  async deleteAPIKey(
    provider: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[SecureStorage] Deleting API key for provider:', provider)

      const storageKey = `apikey_${provider}`

      // Remove from cache
      this.cache.delete(storageKey)

      // Remove from disk
      await this.deleteItem(storageKey)

      console.log('[SecureStorage] API key deleted successfully')
      return { success: true }
    } catch (error) {
      console.error('[SecureStorage] Error deleting API key:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * List all stored providers
   */
  async listProviders(): Promise<string[]> {
    const storage = await this.loadStorage()
    const providers: string[] = []

    for (const key of Object.keys(storage)) {
      if (key.startsWith('apikey_')) {
        providers.push(key.replace('apikey_', ''))
      }
    }

    return providers
  }

  /**
   * Clear all secure storage
   */
  async clearAll(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[SecureStorage] Clearing all secure storage')

      // Clear cache
      this.cache.clear()

      // Delete storage file
      if (fs.existsSync(this.storagePath)) {
        await fs.promises.unlink(this.storagePath)
      }

      console.log('[SecureStorage] All secure storage cleared')
      return { success: true }
    } catch (error) {
      console.error('[SecureStorage] Error clearing storage:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Store a generic secure value
   */
  async setValue(
    key: string,
    value: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const encrypted = this.encrypt(value)
      this.cache.set(key, value)
      await this.saveItem(key, encrypted)
      return { success: true }
    } catch (error) {
      console.error('[SecureStorage] Error storing value:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Retrieve a generic secure value
   */
  async getValue(key: string): Promise<{ success: boolean; value?: string; error?: string }> {
    try {
      // Check cache
      if (this.cache.has(key)) {
        return { success: true, value: this.cache.get(key) }
      }

      // Load from disk
      const item = await this.loadItem(key)
      if (!item) {
        return { success: false, error: 'Value not found' }
      }

      // Decrypt
      const decrypted = this.decrypt(item.encrypted)
      this.cache.set(key, decrypted)

      return { success: true, value: decrypted }
    } catch (error) {
      console.error('[SecureStorage] Error retrieving value:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // ==================== Private Methods ====================

  /**
   * Encrypt a string
   */
  private encrypt(plainText: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = safeStorage.encryptString(plainText)
      return buffer.toString('base64')
    } else {
      // Fallback: Base64 encoding (NOT SECURE - for development only)
      console.warn('[SecureStorage] Using insecure fallback encryption!')
      return Buffer.from(plainText).toString('base64')
    }
  }

  /**
   * Decrypt a string
   */
  private decrypt(encrypted: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(encrypted, 'base64')
      return safeStorage.decryptString(buffer)
    } else {
      // Fallback: Base64 decoding
      return Buffer.from(encrypted, 'base64').toString('utf-8')
    }
  }

  /**
   * Load storage from disk
   */
  private async loadStorage(): Promise<Record<string, SecureStorageItem>> {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = await fs.promises.readFile(this.storagePath, 'utf-8')
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('[SecureStorage] Error loading storage:', error)
    }
    return {}
  }

  /**
   * Save storage to disk
   */
  private async saveStorage(storage: Record<string, SecureStorageItem>): Promise<void> {
    const dir = path.dirname(this.storagePath)
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true })
    }
    await fs.promises.writeFile(this.storagePath, JSON.stringify(storage, null, 2), 'utf-8')
  }

  /**
   * Load a single item from storage
   */
  private async loadItem(key: string): Promise<SecureStorageItem | null> {
    const storage = await this.loadStorage()
    return storage[key] || null
  }

  /**
   * Save a single item to storage
   */
  private async saveItem(key: string, encrypted: string): Promise<void> {
    const storage = await this.loadStorage()
    storage[key] = {
      key,
      encrypted,
      timestamp: Date.now()
    }
    await this.saveStorage(storage)
  }

  /**
   * Delete a single item from storage
   */
  private async deleteItem(key: string): Promise<void> {
    const storage = await this.loadStorage()
    delete storage[key]
    await this.saveStorage(storage)
  }
}

// Singleton instance
let instance: SecureStorage | null = null

export function getSecureStorage(): SecureStorage {
  if (!instance) {
    instance = new SecureStorage()
  }
  return instance
}
