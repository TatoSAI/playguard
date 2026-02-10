import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import { ADBManager } from '../adb/ADBManager'

interface TouchEvent {
  type: 'down' | 'move' | 'up'
  x: number
  y: number
  timestamp: number
}

interface DetectedGesture {
  type: 'tap' | 'double-tap' | 'swipe'
  x?: number
  y?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  timestamp: number
}

interface RawInputEvent {
  device: string
  type: number
  code: number
  value: number
}

export class TouchEventMonitor extends EventEmitter {
  private adbManager: ADBManager
  private deviceId: string
  private geteventProcess: ChildProcess | null = null
  private isMonitoring: boolean = false

  // Touch event tracking
  private touchEvents: TouchEvent[] = []
  private lastTouchDown: TouchEvent | null = null
  private lastTapTime: number = 0
  private lastTapPosition: { x: number; y: number } | null = null

  // Current touch state (updated as events come in)
  private currentX: number = 0
  private currentY: number = 0
  private isTouching: boolean = false
  private touchStartX: number = 0
  private touchStartY: number = 0
  private touchStartTime: number = 0
  private currentTrackingId: number = -1 // Track current touch session
  private pendingTouchDown: boolean = false // Flag for pending touch down (wait for SYN_REPORT)
  private pendingTouchUp: boolean = false // Flag for pending touch up (wait for SYN_REPORT)

  // Device screen dimensions (will be set dynamically)
  private screenWidth: number = 1080
  private screenHeight: number = 2400

  // Touch hardware max values (will be detected from getevent)
  private maxX: number = 32767
  private maxY: number = 32767

  // Thresholds
  private readonly TAP_THRESHOLD = 400 // ms (increased to 400ms to be more lenient)
  private readonly DOUBLE_TAP_THRESHOLD = 500 // ms between taps
  private readonly SWIPE_THRESHOLD = 250 // minimum distance for swipe (increased to 250px to avoid false swipes)
  private readonly TAP_MOVEMENT_THRESHOLD = 100 // max movement for tap (increased to 100px to tolerate natural finger movement)
  private readonly SWIPE_MIN_DURATION = 30 // minimum duration for swipe (ms) - swipes should be intentional gestures
  private readonly SWIPE_MAX_DURATION = 2000 // maximum duration for swipe (ms) - too slow is not a swipe

  // getevent event codes
  private readonly EV_SYN = 0x00
  private readonly EV_KEY = 0x01
  private readonly EV_ABS = 0x03
  private readonly ABS_MT_SLOT = 0x2f
  private readonly ABS_MT_TRACKING_ID = 0x39
  private readonly ABS_MT_POSITION_X = 0x35
  private readonly ABS_MT_POSITION_Y = 0x36
  private readonly ABS_X = 0x00
  private readonly ABS_Y = 0x01
  private readonly BTN_TOUCH = 0x14a
  private readonly SYN_REPORT = 0x00

  constructor(adbManager: ADBManager, deviceId: string) {
    super()
    this.adbManager = adbManager
    this.deviceId = deviceId
  }

  async start(): Promise<void> {
    if (this.isMonitoring) {
      console.log('[TouchEventMonitor] Already monitoring')
      return
    }

    console.log('[TouchEventMonitor] Starting touch event monitoring for device', this.deviceId)

    // Get device screen dimensions
    try {
      const deviceInfo = await this.adbManager.getDeviceInfo(this.deviceId)
      const resolution = deviceInfo.resolution.split('x')
      this.screenWidth = parseInt(resolution[0])
      this.screenHeight = parseInt(resolution[1])
      console.log(`[TouchEventMonitor] Screen resolution: ${this.screenWidth}x${this.screenHeight}`)
    } catch (error) {
      console.warn('[TouchEventMonitor] Failed to get device resolution, using defaults')
    }

    // Detect touch hardware max values
    await this.detectTouchMaxValues()

    this.isMonitoring = true
    this.startGeteventMonitoring()
  }

  stop(): void {
    console.log('[TouchEventMonitor] Stopping touch event monitoring')
    this.isMonitoring = false

    if (this.geteventProcess) {
      this.geteventProcess.kill()
      this.geteventProcess = null
    }

    this.touchEvents = []
    this.lastTouchDown = null
  }

  private async detectTouchMaxValues(): Promise<void> {
    return new Promise((resolve) => {
      console.log('[TouchEventMonitor] Detecting touch hardware max values...')

      const adbPath = process.env.ADB_PATH || 'adb'
      const proc = spawn(adbPath, ['-s', this.deviceId, 'shell', 'getevent', '-p'])

      let output = ''

      proc.stdout.on('data', (data: Buffer) => {
        output += data.toString()
      })

      proc.on('close', () => {
        // Parse output to find touch device and its max values
        // Example output:
        // add device 1: /dev/input/event3
        //   name:     "touchscreen"
        //   events:
        //     ABS (0003): 0035  : value 0, min 0, max 1079, fuzz 0, flat 0, resolution 0
        //                 0036  : value 0, min 0, max 2399, fuzz 0, flat 0, resolution 0

        const lines = output.split('\n')
        let inTouchDevice = false

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]

          // Detect touch device (touchscreen, touch, etc.)
          if (line.includes('name:') && (
            line.toLowerCase().includes('touch') ||
            line.toLowerCase().includes('fts') ||
            line.toLowerCase().includes('synaptics') ||
            line.toLowerCase().includes('atmel')
          )) {
            inTouchDevice = true
            console.log('[TouchEventMonitor] Found touch device:', line.trim())
            continue
          }

          // Reset if we hit a new device
          if (line.includes('add device')) {
            inTouchDevice = false
          }

          // Parse ABS_MT_POSITION_X (0035 = 0x35)
          if (inTouchDevice && line.includes('0035')) {
            const match = line.match(/max\s+(\d+)/)
            if (match) {
              this.maxX = parseInt(match[1])
              console.log(`[TouchEventMonitor] Detected maxX: ${this.maxX}`)
            }
          }

          // Parse ABS_MT_POSITION_Y (0036 = 0x36)
          if (inTouchDevice && line.includes('0036')) {
            const match = line.match(/max\s+(\d+)/)
            if (match) {
              this.maxY = parseInt(match[1])
              console.log(`[TouchEventMonitor] Detected maxY: ${this.maxY}`)
            }
          }
        }

        // If detection failed, log warning
        if (this.maxX === 32767 || this.maxY === 32767) {
          console.warn('[TouchEventMonitor] Failed to detect touch max values, using defaults')
          console.warn('[TouchEventMonitor] Coordinates may be incorrect!')
        }

        resolve()
      })

      // Timeout after 2 seconds
      setTimeout(() => {
        proc.kill()
        console.warn('[TouchEventMonitor] Detection timeout, using default values')
        resolve()
      }, 2000)
    })
  }

  private startGeteventMonitoring(): void {
    console.log('[TouchEventMonitor] Starting getevent process')

    // Spawn adb shell getevent process
    const adbPath = process.env.ADB_PATH || 'adb'

    this.geteventProcess = spawn(adbPath, [
      '-s',
      this.deviceId,
      'shell',
      'getevent' // Use raw format without labels/timestamps for better compatibility
    ])

    let buffer = ''

    this.geteventProcess.stdout?.on('data', (data) => {
      buffer += data.toString()
      const lines = buffer.split('\n')

      // Keep the last incomplete line in buffer
      buffer = lines.pop() || ''

      // Process complete lines
      for (const line of lines) {
        this.parseGeteventLine(line)
      }
    })

    this.geteventProcess.stderr?.on('data', (data) => {
      console.error('[TouchEventMonitor] getevent error:', data.toString())
    })

    this.geteventProcess.on('close', (code) => {
      console.log(`[TouchEventMonitor] getevent process closed with code ${code}`)
      if (this.isMonitoring) {
        // Restart if it was unexpected
        console.log('[TouchEventMonitor] Restarting getevent...')
        setTimeout(() => this.startGeteventMonitoring(), 1000)
      }
    })

    this.geteventProcess.on('error', (error) => {
      console.error('[TouchEventMonitor] getevent process error:', error)
      this.emit('error', error)
    })

    this.emit('monitoringStarted')
  }

  private parseGeteventLine(line: string): void {
    // Parse getevent output format (raw format without flags)
    // Example: /dev/input/event4: 0003 0035 000001a4
    // Format: device: type code value

    const trimmed = line.trim()
    if (!trimmed || trimmed.length === 0) return

    try {
      // Match pattern: device: type code value (raw format)
      const match = trimmed.match(/(\/dev\/input\/event\d+):\s+([0-9a-fA-F]{4})\s+([0-9a-fA-F]{4})\s+([0-9a-fA-F]{8})/)

      if (!match) {
        return
      }

      const [, device, typeHex, codeHex, valueHex] = match
      const type = parseInt(typeHex, 16)
      const code = parseInt(codeHex, 16)
      const value = parseInt(valueHex, 16)

      // Log raw events for debugging (only for touchscreen device)
      if (device.includes('event4') || device.includes('event2')) {
        // console.log(`[TouchEventMonitor] Raw event: device=${device}, type=0x${typeHex}, code=0x${codeHex}, value=0x${valueHex}`)
      }

      this.processInputEvent({ device, type, code, value })
    } catch (error) {
      // Ignore parse errors
    }
  }

  private processInputEvent(event: RawInputEvent): void {
    // Process touch events - support multiple formats for different devices
    if (event.type === this.EV_ABS) {
      // Multitouch position (most common)
      if (event.code === this.ABS_MT_POSITION_X) {
        this.currentX = this.normalizeX(event.value)
      } else if (event.code === this.ABS_MT_POSITION_Y) {
        this.currentY = this.normalizeY(event.value)
      }
      // Single touch position (fallback for older devices)
      else if (event.code === this.ABS_X) {
        this.currentX = this.normalizeX(event.value)
      } else if (event.code === this.ABS_Y) {
        this.currentY = this.normalizeY(event.value)
      }
      // Multitouch tracking ID (used by many modern touchscreens)
      else if (event.code === this.ABS_MT_TRACKING_ID) {
        if (event.value !== 0xffffffff && event.value !== this.currentTrackingId) {
          // Touch down with NEW tracking ID (prevent duplicate registrations)
          this.currentTrackingId = event.value
          this.pendingTouchDown = true // Mark as pending, wait for SYN_REPORT
        } else if (event.value === 0xffffffff) {
          // Touch up (tracking ID released)
          this.currentTrackingId = -1
          this.pendingTouchUp = true // Mark as pending, wait for SYN_REPORT
        }
      }
    }
    // Legacy button-based touch detection
    else if (event.type === this.EV_KEY && event.code === this.BTN_TOUCH) {
      if (event.value === 1) {
        this.pendingTouchDown = true
      } else if (event.value === 0) {
        this.pendingTouchUp = true
      }
    }
    // Sync report - end of event batch (all coordinates are now updated)
    else if (event.type === this.EV_SYN && event.code === this.SYN_REPORT) {
      // Process pending touch events with updated coordinates
      if (this.pendingTouchDown) {
        this.pendingTouchDown = false
        this.handleTouchDown()
      } else if (this.pendingTouchUp) {
        this.pendingTouchUp = false
        this.handleTouchUp()
      } else if (this.isTouching) {
        this.handleTouchMove()
      }
    }
  }

  private normalizeX(rawX: number): number {
    // Convert from touch hardware coordinates to screen coordinates
    return Math.round((rawX / this.maxX) * this.screenWidth)
  }

  private normalizeY(rawY: number): number {
    // Convert from touch hardware coordinates to screen coordinates
    return Math.round((rawY / this.maxY) * this.screenHeight)
  }

  private handleTouchDown(): void {
    if (!this.isTouching) {
      this.isTouching = true
      this.touchStartX = this.currentX
      this.touchStartY = this.currentY
      this.touchStartTime = Date.now()

      const event: TouchEvent = {
        type: 'down',
        x: this.currentX,
        y: this.currentY,
        timestamp: this.touchStartTime
      }

      this.processTouch(event)
      console.log('[TouchEventMonitor] Touch DOWN:', { x: this.currentX, y: this.currentY })
    }
  }

  private handleTouchMove(): void {
    if (this.isTouching) {
      const event: TouchEvent = {
        type: 'move',
        x: this.currentX,
        y: this.currentY,
        timestamp: Date.now()
      }

      this.processTouch(event)
    }
  }

  private handleTouchUp(): void {
    if (this.isTouching) {
      this.isTouching = false

      const event: TouchEvent = {
        type: 'up',
        x: this.currentX,
        y: this.currentY,
        timestamp: Date.now()
      }

      this.processTouch(event) // This already calls detectGesture() for 'up' events
      console.log('[TouchEventMonitor] Touch UP:', { x: this.currentX, y: this.currentY })
    }
  }

  private processTouch(event: TouchEvent): void {
    this.touchEvents.push(event)

    if (event.type === 'down') {
      this.lastTouchDown = event
    } else if (event.type === 'up' && this.lastTouchDown) {
      this.detectGesture()
    }

    // Clean up old events (keep last 10 seconds)
    const cutoff = Date.now() - 10000
    this.touchEvents = this.touchEvents.filter(e => e.timestamp > cutoff)
  }

  private detectGesture(): void {
    const now = Date.now()
    const duration = now - this.touchStartTime
    const dx = Math.abs(this.currentX - this.touchStartX)
    const dy = Math.abs(this.currentY - this.touchStartY)
    const distance = Math.sqrt(dx * dx + dy * dy)

    console.log('[TouchEventMonitor] Gesture detection:', { duration, distance, dx, dy })

    // Detect gesture type
    if (duration < this.TAP_THRESHOLD && distance < this.TAP_MOVEMENT_THRESHOLD) {
      // Possible tap or double tap
      const timeSinceLastTap = this.touchStartTime - this.lastTapTime

      if (
        timeSinceLastTap > 0 &&
        timeSinceLastTap < this.DOUBLE_TAP_THRESHOLD &&
        this.lastTapPosition &&
        Math.abs(this.touchStartX - this.lastTapPosition.x) < this.TAP_MOVEMENT_THRESHOLD &&
        Math.abs(this.touchStartY - this.lastTapPosition.y) < this.TAP_MOVEMENT_THRESHOLD
      ) {
        // Double tap detected
        const gesture: DetectedGesture = {
          type: 'double-tap',
          x: this.touchStartX,
          y: this.touchStartY,
          timestamp: now
        }
        console.log('[TouchEventMonitor] ✓ Double tap detected:', gesture)
        this.emit('gesture', gesture)

        // Reset to prevent triple tap
        this.lastTapTime = 0
        this.lastTapPosition = null
      } else {
        // Single tap
        const gesture: DetectedGesture = {
          type: 'tap',
          x: this.touchStartX,
          y: this.touchStartY,
          timestamp: now
        }
        console.log('[TouchEventMonitor] ✓ Tap detected:', gesture)
        this.emit('gesture', gesture)

        // Store for potential double tap
        this.lastTapTime = this.touchStartTime
        this.lastTapPosition = { x: this.touchStartX, y: this.touchStartY }
      }
    } else if (
      distance >= this.SWIPE_THRESHOLD &&
      duration >= this.SWIPE_MIN_DURATION &&
      duration <= this.SWIPE_MAX_DURATION
    ) {
      // Swipe detected
      const gesture: DetectedGesture = {
        type: 'swipe',
        x1: this.touchStartX,
        y1: this.touchStartY,
        x2: this.currentX,
        y2: this.currentY,
        timestamp: now
      }
      console.log('[TouchEventMonitor] ✓ Swipe detected:', gesture)
      this.emit('gesture', gesture)

      // Reset tap tracking after swipe
      this.lastTapTime = 0
      this.lastTapPosition = null
    }
  }

  isActive(): boolean {
    return this.isMonitoring
  }
}
