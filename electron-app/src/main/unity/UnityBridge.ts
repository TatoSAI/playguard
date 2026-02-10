import { EventEmitter } from 'events'
import * as net from 'net'
import { ADBManager } from '../adb/ADBManager'

export interface UIElement {
  name: string
  path: string
  type: string
  active: boolean
  position: { x: number; y: number; z: number }
  text?: string
  interactable?: boolean
}

export interface GameObject {
  name: string
  path: string
  active: boolean
  tag: string
  layer: string
  position: { x: number; y: number; z: number }
}

export interface UnitySDKResponse {
  success: boolean
  data?: any
  error?: string
}

export class UnityBridge extends EventEmitter {
  private adbManager: ADBManager
  private deviceId: string | null = null
  private isConnected: boolean = false
  private client: net.Socket | null = null
  private readonly SDK_PORT = 12345
  private readonly CONNECTION_TIMEOUT = 5000

  constructor(adbManager: ADBManager) {
    super()
    this.adbManager = adbManager
  }

  /**
   * Detect if Unity SDK is available on the device
   */
  async detectSDK(deviceId: string): Promise<boolean> {
    console.log(`[UnityBridge] Detecting Unity SDK on device ${deviceId}...`)

    try {
      // Setup ADB port forwarding
      await this.setupPortForwarding(deviceId)

      // Try to ping the SDK
      const response = await this.sendCommand({ command: 'ping' })

      if (response.success && response.data === 'pong') {
        console.log('[UnityBridge] Unity SDK detected and responding')
        this.isConnected = true
        this.deviceId = deviceId
        this.emit('sdkDetected', deviceId)
        return true
      }

      return false
    } catch (error) {
      console.log('[UnityBridge] Unity SDK not detected:', error instanceof Error ? error.message : String(error))
      return false
    }
  }

  /**
   * Setup ADB port forwarding for Unity SDK communication
   */
  private async setupPortForwarding(deviceId: string): Promise<void> {
    try {
      await this.adbManager.executeShellCommand(
        deviceId,
        `exit` // Just verify connection
      )

      // Use ADB forward command
      const { spawn } = require('child_process')
      const adbPath = 'C:\\Users\\CLIENTE2022\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe'

      await new Promise<void>((resolve, reject) => {
        const forward = spawn(adbPath, ['-s', deviceId, 'forward', `tcp:${this.SDK_PORT}`, `tcp:${this.SDK_PORT}`])

        forward.on('close', (code: number) => {
          if (code === 0) {
            console.log(`[UnityBridge] Port forwarding setup: tcp:${this.SDK_PORT} -> tcp:${this.SDK_PORT}`)
            resolve()
          } else {
            reject(new Error(`Port forwarding failed with code ${code}`))
          }
        })

        forward.on('error', reject)
      })

      this.deviceId = deviceId
    } catch (error) {
      console.error('[UnityBridge] Failed to setup port forwarding:', error)
      throw error
    }
  }

  /**
   * Send command to Unity SDK and receive response
   */
  async sendCommand(command: any): Promise<UnitySDKResponse> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket()
      let responseData = ''

      const timeout = setTimeout(() => {
        client.destroy()
        reject(new Error('Connection timeout'))
      }, this.CONNECTION_TIMEOUT)

      client.connect(this.SDK_PORT, '127.0.0.1', () => {
        console.log('[UnityBridge] Connected to Unity SDK')

        // Send command as JSON
        const commandJson = JSON.stringify(command) + '\n'
        client.write(commandJson)
      })

      client.on('data', (data: Buffer) => {
        responseData += data.toString()

        // Check if we have a complete JSON response
        if (responseData.includes('\n')) {
          clearTimeout(timeout)
          client.destroy()

          try {
            const response = JSON.parse(responseData.trim())
            resolve(response)
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${responseData}`))
          }
        }
      })

      client.on('error', (error: Error) => {
        clearTimeout(timeout)
        reject(error)
      })

      client.on('close', () => {
        clearTimeout(timeout)
        if (responseData === '') {
          reject(new Error('Connection closed without response'))
        }
      })
    })
  }

  /**
   * Get all UI elements from Unity Canvas
   */
  async getUIElements(): Promise<UIElement[]> {
    if (!this.isConnected) {
      throw new Error('Unity SDK not connected')
    }

    try {
      const response = await this.sendCommand({ command: 'getUIElements' })

      if (response.success && response.data?.elements) {
        console.log(`[UnityBridge] Retrieved ${response.data.elements.length} UI elements`)
        return response.data.elements
      }

      return []
    } catch (error) {
      console.error('[UnityBridge] Failed to get UI elements:', error)
      throw error
    }
  }

  /**
   * Get all GameObjects (optionally including inactive)
   */
  async getGameObjects(includeInactive: boolean = false): Promise<GameObject[]> {
    if (!this.isConnected) {
      throw new Error('Unity SDK not connected')
    }

    try {
      const response = await this.sendCommand({
        command: 'getGameObjects',
        parameters: { includeInactive }
      })

      if (response.success && response.data?.objects) {
        console.log(`[UnityBridge] Retrieved ${response.data.objects.length} GameObjects`)
        return response.data.objects
      }

      return []
    } catch (error) {
      console.error('[UnityBridge] Failed to get GameObjects:', error)
      throw error
    }
  }

  /**
   * Find element by name
   */
  async findElement(name: string): Promise<UIElement | null> {
    if (!this.isConnected) {
      throw new Error('Unity SDK not connected')
    }

    try {
      const response = await this.sendCommand({
        command: 'findElement',
        parameters: { name }
      })

      if (response.success && response.data) {
        console.log(`[UnityBridge] Found element: ${name}`)
        return response.data
      }

      return null
    } catch (error) {
      console.error('[UnityBridge] Failed to find element:', error)
      return null
    }
  }

  /**
   * Tap element by path
   */
  async tapElement(path: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Unity SDK not connected')
    }

    try {
      const response = await this.sendCommand({
        command: 'tapElement',
        parameters: { path }
      })

      if (response.success) {
        console.log(`[UnityBridge] Tapped element: ${path}`)
        return true
      }

      console.warn(`[UnityBridge] Failed to tap element ${path}: ${response.error}`)
      return false
    } catch (error) {
      console.error('[UnityBridge] Failed to tap element:', error)
      return false
    }
  }

  /**
   * Get element property
   */
  async getElementProperty(path: string, property: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Unity SDK not connected')
    }

    try {
      const response = await this.sendCommand({
        command: 'getElementProperty',
        parameters: { path, property }
      })

      if (response.success && response.data) {
        return response.data.value
      }

      return null
    } catch (error) {
      console.error('[UnityBridge] Failed to get element property:', error)
      return null
    }
  }

  /**
   * Wait for element to appear (with timeout)
   */
  async waitForElement(name: string, timeout: number = 10000): Promise<UIElement | null> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const element = await this.findElement(name)
      if (element) {
        return element
      }

      // Wait before retrying
      await this.wait(500)
    }

    console.warn(`[UnityBridge] Element ${name} not found after ${timeout}ms`)
    return null
  }

  // ===== v2.0 CUSTOM EXTENSION METHODS =====

  /**
   * List all registered custom properties in the game
   */
  async listCustomProperties(): Promise<string[]> {
    if (!this.isConnected) {
      throw new Error('Unity SDK not connected')
    }

    try {
      const response = await this.sendCommand({ command: 'listCustomProperties' })

      if (response.success && response.data?.properties) {
        console.log(`[UnityBridge] Retrieved ${response.data.properties.length} custom properties`)
        return response.data.properties
      }

      return []
    } catch (error) {
      console.error('[UnityBridge] Failed to list custom properties:', error)
      throw error
    }
  }

  /**
   * List all registered custom actions in the game
   */
  async listCustomActions(): Promise<string[]> {
    if (!this.isConnected) {
      throw new Error('Unity SDK not connected')
    }

    try {
      const response = await this.sendCommand({ command: 'listCustomActions' })

      if (response.success && response.data?.actions) {
        console.log(`[UnityBridge] Retrieved ${response.data.actions.length} custom actions`)
        return response.data.actions
      }

      return []
    } catch (error) {
      console.error('[UnityBridge] Failed to list custom actions:', error)
      throw error
    }
  }

  /**
   * List all registered custom commands in the game
   */
  async listCustomCommands(): Promise<string[]> {
    if (!this.isConnected) {
      throw new Error('Unity SDK not connected')
    }

    try {
      const response = await this.sendCommand({ command: 'listCustomCommands' })

      if (response.success && response.data?.commands) {
        console.log(`[UnityBridge] Retrieved ${response.data.commands.length} custom commands`)
        return response.data.commands
      }

      return []
    } catch (error) {
      console.error('[UnityBridge] Failed to list custom commands:', error)
      throw error
    }
  }

  /**
   * Get value of a custom property from the game
   */
  async getCustomProperty(name: string): Promise<string | null> {
    if (!this.isConnected) {
      throw new Error('Unity SDK not connected')
    }

    try {
      const response = await this.sendCommand({
        command: 'getCustomProperty',
        parameters: { name }
      })

      if (response.success && response.data) {
        console.log(`[UnityBridge] Got custom property '${name}': ${response.data.value}`)
        return response.data.value
      }

      console.warn(`[UnityBridge] Failed to get custom property '${name}': ${response.error}`)
      return null
    } catch (error) {
      console.error('[UnityBridge] Failed to get custom property:', error)
      return null
    }
  }

  /**
   * Execute a custom action in the game
   */
  async executeCustomAction(name: string, args: string[] = []): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Unity SDK not connected')
    }

    try {
      const response = await this.sendCommand({
        command: 'executeCustomAction',
        parameters: { name, args }
      })

      if (response.success) {
        console.log(`[UnityBridge] Executed custom action '${name}' with args:`, args)
        return true
      }

      console.warn(`[UnityBridge] Failed to execute custom action '${name}': ${response.error}`)
      return false
    } catch (error) {
      console.error('[UnityBridge] Failed to execute custom action:', error)
      return false
    }
  }

  /**
   * Execute a custom command in the game
   */
  async executeCustomCommand(name: string, param: string = ''): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Unity SDK not connected')
    }

    try {
      const response = await this.sendCommand({
        command: 'executeCustomCommand',
        parameters: { name, param }
      })

      if (response.success) {
        console.log(`[UnityBridge] Executed custom command '${name}'`)
        return response.data
      }

      console.warn(`[UnityBridge] Failed to execute custom command '${name}': ${response.error}`)
      return null
    } catch (error) {
      console.error('[UnityBridge] Failed to execute custom command:', error)
      return null
    }
  }

  /**
   * Get all available custom extensions (properties + actions + commands)
   */
  async getAvailableExtensions(): Promise<{
    properties: string[]
    actions: string[]
    commands: string[]
  }> {
    try {
      const [properties, actions, commands] = await Promise.all([
        this.listCustomProperties(),
        this.listCustomActions(),
        this.listCustomCommands()
      ])

      return { properties, actions, commands }
    } catch (error) {
      console.error('[UnityBridge] Failed to get available extensions:', error)
      return { properties: [], actions: [], commands: [] }
    }
  }

  /**
   * Check if SDK is currently connected
   */
  isSDKConnected(): boolean {
    return this.isConnected
  }

  /**
   * Disconnect from Unity SDK
   */
  disconnect(): void {
    if (this.client) {
      this.client.destroy()
      this.client = null
    }

    this.isConnected = false
    this.deviceId = null
    console.log('[UnityBridge] Disconnected from Unity SDK')
    this.emit('sdkDisconnected')
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
