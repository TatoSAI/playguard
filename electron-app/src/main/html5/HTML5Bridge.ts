import { EventEmitter } from 'events'
import { WebSocketServer, WebSocket } from 'ws'
import { ADBManager } from '../adb/ADBManager'
import { spawn } from 'child_process'

const ADB_PATH = 'C:\\Users\\CLIENTE2022\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe'

export interface HTML5UIElement {
  name: string
  path: string
  type: string
  active: boolean
  position: { x: number; y: number; z: number }
  text?: string
  interactable?: boolean
}

export interface HTML5SDKResponse {
  success: boolean
  data?: any
  error?: string
}

interface PendingRequest {
  resolve: (value: HTML5SDKResponse) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class HTML5Bridge extends EventEmitter {
  private wss: WebSocketServer | null = null
  private activeClient: WebSocket | null = null
  private pendingRequests = new Map<string, PendingRequest>()
  private sdkConnected = false
  private readonly SDK_PORT = 9876
  private readonly COMMAND_TIMEOUT = 5000
  private messageBuffer = ''

  constructor(_adbManager: ADBManager) {
    super()
  }

  /**
   * Start the WebSocket server. Call once at app startup.
   */
  startServer(): void {
    if (this.wss) return

    try {
      this.wss = new WebSocketServer({ port: this.SDK_PORT })
      console.log(`[HTML5Bridge] WebSocket server listening on port ${this.SDK_PORT}`)

      this.wss.on('connection', async (ws: WebSocket) => {
        console.log('[HTML5Bridge] Game client connected')
        this.activeClient = ws
        this.messageBuffer = ''

        ws.on('message', (raw: Buffer) => {
          const chunk = raw.toString()
          this.messageBuffer += chunk

          // Messages are newline-delimited (same as Unity TCP protocol)
          const lines = this.messageBuffer.split('\n')
          this.messageBuffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const msg = JSON.parse(line)
              this.handleIncoming(msg)
            } catch {
              console.warn('[HTML5Bridge] Failed to parse message:', line)
            }
          }
        })

        ws.on('close', () => {
          console.log('[HTML5Bridge] Game client disconnected')
          if (this.activeClient === ws) {
            this.activeClient = null
            this.sdkConnected = false
            this.emit('sdkDisconnected')
            // Reject all pending requests
            this.pendingRequests.forEach(({ reject, timer }) => {
              clearTimeout(timer)
              reject(new Error('WebSocket connection closed'))
            })
            this.pendingRequests.clear()
          }
        })

        ws.on('error', (err) => {
          console.error('[HTML5Bridge] Client error:', err.message)
        })

        // Auto-detect SDK: all event handlers are registered, now ping the client
        // Small delay to let the game-side SDK finish its own onopen initialization
        await new Promise((r) => setTimeout(r, 300))
        try {
          const response = await this.sendCommand({ command: 'ping' }).catch(() => ({
            success: false
          }))
          if (response.success) {
            this.sdkConnected = true
            this.emit('sdkDetected')
            console.log('[HTML5Bridge] PlayGuard SDK handshake complete — ready')
          } else {
            console.warn('[HTML5Bridge] Client connected but ping failed — not a PlayGuard SDK client')
          }
        } catch {
          // Non-SDK client connected, leave sdkConnected = false
        }
      })

      this.wss.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`[HTML5Bridge] Port ${this.SDK_PORT} already in use. HTML5 bridge unavailable.`)
          this.emit('serverError', err)
        } else {
          console.error('[HTML5Bridge] Server error:', err)
        }
      })
    } catch (error) {
      console.error('[HTML5Bridge] Failed to start server:', error)
    }
  }

  stopServer(): void {
    this.wss?.close()
    this.wss = null
    this.activeClient = null
    this.sdkConnected = false
  }

  private handleIncoming(msg: any): void {
    if (msg.type === 'response' && msg.id) {
      const pending = this.pendingRequests.get(msg.id)
      if (pending) {
        clearTimeout(pending.timer)
        this.pendingRequests.delete(msg.id)
        pending.resolve({ success: msg.success, data: msg.data, error: msg.error })
      }
    }
  }

  /**
   * Detect if HTML5 SDK is available.
   * For browser mode: waits up to 5s for a client to connect.
   * For device mode: sets up ADB port forwarding first.
   */
  async detectSDK(deviceId?: string): Promise<boolean> {
    console.log('[HTML5Bridge] Detecting HTML5 SDK...')
    try {
      if (deviceId) {
        await this.setupPortForwarding(deviceId)
      }

      // If a client is already connected, ping it
      if (this.activeClient && this.activeClient.readyState === WebSocket.OPEN) {
        const response = await this.sendCommand({ command: 'ping' })
        if (response.success && response.data === 'pong') {
          this.sdkConnected = true
          this.emit('sdkDetected', deviceId)
          return true
        }
      }

      // Wait up to 5s for a client to connect (browser mode: game loads in iframe)
      return await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          this.wss?.removeListener('connection', onConnect)
          resolve(false)
        }, 5000)

        const onConnect = async (_ws: WebSocket) => {
          clearTimeout(timeout)
          // Small delay to let SDK send its first message
          await new Promise((r) => setTimeout(r, 200))
          const response = await this.sendCommand({ command: 'ping' }).catch(() => ({
            success: false
          }))
          if (response.success) {
            this.sdkConnected = true
            this.emit('sdkDetected', deviceId)
            resolve(true)
          } else {
            resolve(false)
          }
        }
        this.wss?.once('connection', onConnect)
      })
    } catch (error) {
      console.log(
        '[HTML5Bridge] SDK not detected:',
        error instanceof Error ? error.message : String(error)
      )
      return false
    }
  }

  private async setupPortForwarding(deviceId: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const forward = spawn(ADB_PATH, [
        '-s',
        deviceId,
        'forward',
        `tcp:${this.SDK_PORT}`,
        `tcp:${this.SDK_PORT}`
      ])

      forward.on('close', (code: number) => {
        if (code === 0) {
          console.log(`[HTML5Bridge] ADB port forwarding set up: tcp:${this.SDK_PORT}`)
          resolve()
        } else {
          reject(new Error(`ADB forward failed with code ${code}`))
        }
      })

      forward.on('error', reject)
    })
  }

  /**
   * Send a command to the connected game client and await response.
   * Uses timestamp+random correlation IDs (same pattern as Unity TCP sendCommand).
   */
  async sendCommand(command: any): Promise<HTML5SDKResponse> {
    return new Promise((resolve, reject) => {
      if (!this.activeClient || this.activeClient.readyState !== WebSocket.OPEN) {
        return reject(new Error('No HTML5 game client connected'))
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const payload = JSON.stringify({ type: 'command', id, ...command }) + '\n'

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('HTML5Bridge command timeout'))
      }, this.COMMAND_TIMEOUT)

      this.pendingRequests.set(id, { resolve, reject, timer })
      this.activeClient.send(payload)
    })
  }

  // ===== PUBLIC API — mirrors UnityBridge exactly =====

  async getUIElements(): Promise<HTML5UIElement[]> {
    if (!this.sdkConnected) return []
    try {
      const response = await this.sendCommand({ command: 'getUIElements' })
      return response.success ? (response.data?.elements ?? []) : []
    } catch {
      return []
    }
  }

  async tapElement(path: string): Promise<boolean> {
    if (!this.sdkConnected) return false
    try {
      const response = await this.sendCommand({ command: 'tapElement', parameters: { path } })
      return response.success
    } catch {
      return false
    }
  }

  async listCustomProperties(): Promise<string[]> {
    if (!this.sdkConnected) return []
    try {
      const response = await this.sendCommand({ command: 'listCustomProperties' })
      return response.success ? (response.data?.properties ?? []) : []
    } catch {
      return []
    }
  }

  async listCustomActions(): Promise<string[]> {
    if (!this.sdkConnected) return []
    try {
      const response = await this.sendCommand({ command: 'listCustomActions' })
      return response.success ? (response.data?.actions ?? []) : []
    } catch {
      return []
    }
  }

  async listCustomCommands(): Promise<string[]> {
    if (!this.sdkConnected) return []
    try {
      const response = await this.sendCommand({ command: 'listCustomCommands' })
      return response.success ? (response.data?.commands ?? []) : []
    } catch {
      return []
    }
  }

  async getCustomProperty(name: string): Promise<string | null> {
    if (!this.sdkConnected) return null
    try {
      const response = await this.sendCommand({
        command: 'getCustomProperty',
        parameters: { name }
      })
      return response.success ? (response.data?.value ?? null) : null
    } catch {
      return null
    }
  }

  async executeCustomAction(name: string, args: string[] = []): Promise<boolean> {
    if (!this.sdkConnected) return false
    try {
      const response = await this.sendCommand({
        command: 'executeCustomAction',
        parameters: { name, args }
      })
      return response.success
    } catch {
      return false
    }
  }

  async executeCustomCommand(name: string, param = ''): Promise<any> {
    if (!this.sdkConnected) return null
    try {
      // Try as user-registered command first
      const response = await this.sendCommand({
        command: 'executeCustomCommand',
        parameters: { name, param }
      })
      if (response.success) return response.data

      // Not a user command — retry as a built-in command (e.g. getUIElements)
      const builtin = await this.sendCommand({ command: name, parameters: { param } })
      return builtin.success ? builtin.data : null
    } catch {
      return null
    }
  }

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
    } catch {
      return { properties: [], actions: [], commands: [] }
    }
  }

  isSDKConnected(): boolean {
    return this.sdkConnected && this.activeClient?.readyState === WebSocket.OPEN
  }

  /**
   * Wait until the SDK is connected (handshake complete) or timeout expires.
   * Used by TestRunner before executing sdk_* steps so we don't fail on slow page loads.
   */
  waitForSDK(timeoutMs = 15000): Promise<boolean> {
    if (this.isSDKConnected()) return Promise.resolve(true)

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.removeListener('sdkDetected', onDetected)
        resolve(false)
      }, timeoutMs)

      const onDetected = () => {
        clearTimeout(timer)
        resolve(true)
      }

      this.once('sdkDetected', onDetected)
    })
  }

  disconnect(): void {
    this.activeClient?.close()
    this.activeClient = null
    this.sdkConnected = false
    this.emit('sdkDisconnected')
  }
}
