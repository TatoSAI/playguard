import { EventEmitter } from 'events'
import { ADBManager } from '../adb/ADBManager'
import { UnityBridge, UIElement } from '../unity/UnityBridge'
import { TouchEventMonitor } from './TouchEventMonitor'

import { DeviceActionType } from '../types/models'

export interface RecordedAction {
  type: 'tap' | 'swipe' | 'text' | 'wait' | 'screenshot' | DeviceActionType
  timestamp: number
  data: any
  screenshot?: Buffer
  // Element-based data (when Unity SDK is available)
  elementPath?: string
  elementName?: string
  elementType?: string
}

export interface RecordingSession {
  deviceId: string
  startTime: number
  actions: RecordedAction[]
  deviceInfo: {
    resolution: string
    model: string
  }
  // Recording mode
  mode: 'coordinate' | 'element' // coordinate = fallback, element = SDK detected
  sdkConnected: boolean
}

export class TestRecorder extends EventEmitter {
  private adbManager: ADBManager
  private unityBridge: UnityBridge
  private touchMonitor: TouchEventMonitor | null = null
  private isRecording: boolean = false
  private currentSession: RecordingSession | null = null
  private lastScreenshot: Buffer | null = null
  private recordingInterval: NodeJS.Timeout | null = null
  private uiElementsCache: UIElement[] = []
  private lastGestureTime: number = 0 // Track when last gesture was detected

  constructor(adbManager: ADBManager) {
    super()
    this.adbManager = adbManager
    this.unityBridge = new UnityBridge(adbManager)

    // Listen for SDK events
    this.unityBridge.on('sdkDetected', (deviceId) => {
      console.log(`[TestRecorder] Unity SDK detected, switching to element mode`)
      if (this.currentSession && this.currentSession.deviceId === deviceId) {
        this.currentSession.mode = 'element'
        this.currentSession.sdkConnected = true
        this.emit('modeChanged', 'element')
      }
    })

    this.unityBridge.on('sdkDisconnected', () => {
      console.log(`[TestRecorder] Unity SDK disconnected, falling back to coordinate mode`)
      if (this.currentSession) {
        this.currentSession.mode = 'coordinate'
        this.currentSession.sdkConnected = false
        this.emit('modeChanged', 'coordinate')
      }
    })
  }

  async startRecording(deviceId: string): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording')
    }

    console.log(`[TestRecorder] Starting recording for device ${deviceId}`)

    // Get device info
    const deviceInfo = await this.adbManager.getDeviceInfo(deviceId)

    // Try to detect Unity SDK
    let sdkDetected = false
    let mode: 'coordinate' | 'element' = 'coordinate'

    try {
      console.log('[TestRecorder] Attempting to detect Unity SDK...')
      sdkDetected = await this.unityBridge.detectSDK(deviceId)

      if (sdkDetected) {
        mode = 'element'
        console.log('[TestRecorder] Unity SDK detected - using element-based recording')

        // Cache UI elements for faster lookups
        await this.refreshUIElementsCache()
      } else {
        console.log('[TestRecorder] Unity SDK not detected - using coordinate-based recording')
      }
    } catch (error) {
      console.log('[TestRecorder] SDK detection failed, falling back to coordinate mode:', error)
    }

    this.currentSession = {
      deviceId,
      startTime: Date.now(),
      actions: [],
      deviceInfo: {
        resolution: deviceInfo.resolution,
        model: deviceInfo.model
      },
      mode,
      sdkConnected: sdkDetected
    }

    this.isRecording = true

    // Take initial screenshot
    try {
      const screenshot = await this.adbManager.captureScreenshot(deviceId)
      this.lastScreenshot = screenshot
      this.addAction({
        type: 'screenshot',
        timestamp: Date.now(),
        data: { description: 'Initial state' },
        screenshot
      })
    } catch (error) {
      console.error('[TestRecorder] Failed to capture initial screenshot:', error)
    }

    // Start monitoring for user interactions
    this.startEventMonitoring(deviceId)

    // Start touch event monitoring for automatic gesture detection
    this.startTouchMonitoring(deviceId)

    this.emit('recordingStarted', { deviceId, mode, sdkConnected: sdkDetected })
  }

  private async startTouchMonitoring(deviceId: string): Promise<void> {
    try {
      console.log('[TestRecorder] Starting touch event monitoring...')
      this.touchMonitor = new TouchEventMonitor(this.adbManager, deviceId)

      // Listen for detected gestures
      this.touchMonitor.on('gesture', async (gesture) => {
        console.log('[TestRecorder] Gesture detected from device:', gesture)

        // Mark gesture time to prevent screen change detection during/after gestures
        this.lastGestureTime = Date.now()

        // Convert gesture to action (skipExecution = true because user already executed it on device)
        if (gesture.type === 'tap') {
          await this.captureAction('tap', { x: gesture.x, y: gesture.y }, true, true)
        } else if (gesture.type === 'double-tap') {
          // For now, treat double-tap as two taps
          await this.captureAction('tap', { x: gesture.x, y: gesture.y }, true, true)
          await this.wait(100)
          await this.captureAction('tap', { x: gesture.x, y: gesture.y }, true, true)
        } else if (gesture.type === 'swipe') {
          await this.captureAction('swipe', {
            x1: gesture.x1,
            y1: gesture.y1,
            x2: gesture.x2,
            y2: gesture.y2,
            duration: 300
          }, true, true)
        }
      })

      this.touchMonitor.on('error', (error) => {
        console.error('[TestRecorder] Touch monitor error:', error)
      })

      // Start monitoring
      await this.touchMonitor.start()
      console.log('[TestRecorder] Touch event monitoring started')
    } catch (error) {
      console.error('[TestRecorder] Failed to start touch monitoring:', error)
      // Continue without touch monitoring
    }
  }

  stopRecording(): RecordingSession {
    if (!this.isRecording || !this.currentSession) {
      throw new Error('Not currently recording')
    }

    console.log(`[TestRecorder] Stopping recording with ${this.currentSession.actions.length} actions`)

    this.isRecording = false

    if (this.recordingInterval) {
      clearInterval(this.recordingInterval)
      this.recordingInterval = null
    }

    // Disconnect Unity Bridge if connected
    if (this.unityBridge.isSDKConnected()) {
      this.unityBridge.disconnect()
    }

    // Stop touch event monitoring
    if (this.touchMonitor) {
      this.touchMonitor.stop()
      this.touchMonitor.removeAllListeners()
      this.touchMonitor = null
    }

    this.uiElementsCache = []

    const session = this.currentSession
    this.currentSession = null
    this.lastScreenshot = null

    this.emit('recordingStopped', session)

    return session
  }

  async captureAction(
    type: 'tap' | 'swipe' | 'text' | DeviceActionType,
    data: any,
    captureScreenshot: boolean = true,
    skipExecution: boolean = false // Set to true when action already executed on device
  ): Promise<void> {
    if (!this.isRecording || !this.currentSession) {
      return
    }

    console.log(`[TestRecorder] Capturing ${type} action:`, data, skipExecution ? '(already executed)' : '')

    // Try to identify element if SDK is connected and it's a tap action
    let elementData: { elementPath?: string; elementName?: string; elementType?: string } = {}

    if (this.currentSession.sdkConnected && type === 'tap') {
      try {
        await this.refreshUIElementsCache()
        const element = this.findElementAtPosition(data.x, data.y)

        if (element) {
          elementData = {
            elementPath: element.path,
            elementName: element.name,
            elementType: element.type
          }
          console.log(`[TestRecorder] Identified element: ${element.path} (${element.type})`)
        }
      } catch (error) {
        console.warn('[TestRecorder] Failed to identify element:', error)
      }
    }

    // Execute the action on the device (unless it was already executed)
    if (!skipExecution) {
      try {
        switch (type) {
        case 'tap':
          // If we have element data, try element-based tap first
          if (elementData.elementPath && this.currentSession.sdkConnected) {
            try {
              const success = await this.unityBridge.tapElement(elementData.elementPath)
              if (success) {
                console.log(`[TestRecorder] Tapped element via SDK: ${elementData.elementPath}`)
                break
              }
            } catch (error) {
              console.warn('[TestRecorder] Element tap failed, falling back to coordinates')
            }
          }

          // Fallback to coordinate-based tap
          await this.adbManager.sendTap(this.currentSession.deviceId, data.x, data.y)
          console.log(`[TestRecorder] Sent tap to device at (${data.x}, ${data.y})`)
          break

        case 'swipe':
          await this.adbManager.sendSwipe(
            this.currentSession.deviceId,
            data.x1,
            data.y1,
            data.x2,
            data.y2,
            data.duration || 300
          )
          console.log(`[TestRecorder] Sent swipe to device`)
          break

        case 'text':
          await this.adbManager.sendText(this.currentSession.deviceId, data.text)
          console.log(`[TestRecorder] Sent text to device: ${data.text}`)
          break

        // Hardware actions
        case 'press_back':
          await this.adbManager.pressBack(this.currentSession.deviceId)
          break
        case 'press_home':
          await this.adbManager.pressHome(this.currentSession.deviceId)
          break
        case 'press_volume_up':
          await this.adbManager.pressVolumeUp(this.currentSession.deviceId)
          break
        case 'press_volume_down':
          await this.adbManager.pressVolumeDown(this.currentSession.deviceId)
          break

        // Orientation actions
        case 'rotate_portrait':
          await this.adbManager.rotatePortrait(this.currentSession.deviceId)
          break
        case 'rotate_landscape':
          await this.adbManager.rotateLandscape(this.currentSession.deviceId)
          break
        case 'rotate_portrait_reverse':
          await this.adbManager.rotatePortraitReverse(this.currentSession.deviceId)
          break
        case 'rotate_landscape_reverse':
          await this.adbManager.rotateLandscapeReverse(this.currentSession.deviceId)
          break
        case 'toggle_auto_rotate':
          await this.adbManager.toggleAutoRotate(this.currentSession.deviceId, data?.enable)
          break

        // Lifecycle actions
        case 'background_app':
          await this.adbManager.backgroundApp(this.currentSession.deviceId)
          break
        case 'foreground_app':
          await this.adbManager.foregroundApp(this.currentSession.deviceId, data?.packageName)
          break
        case 'force_stop_app':
          await this.adbManager.forceStopApp(this.currentSession.deviceId, data?.packageName)
          break
        case 'clear_app_data':
          await this.adbManager.clearAppData(this.currentSession.deviceId, data?.packageName)
          break

        // Connectivity actions
        case 'toggle_wifi':
          await this.adbManager.toggleWiFi(this.currentSession.deviceId, data?.enable)
          break
        case 'toggle_mobile_data':
          await this.adbManager.toggleMobileData(this.currentSession.deviceId, data?.enable)
          break
        case 'toggle_airplane_mode':
          await this.adbManager.toggleAirplaneMode(this.currentSession.deviceId, data?.enable)
          break

        // Interruptions
        case 'simulate_call':
          await this.adbManager.simulateCall(this.currentSession.deviceId, data?.phoneNumber)
          break
        case 'simulate_notification':
          await this.adbManager.simulateNotification(this.currentSession.deviceId, data?.title, data?.message)
          break
        case 'simulate_low_battery':
          await this.adbManager.simulateLowBattery(this.currentSession.deviceId, data?.level)
          break
        case 'simulate_memory_warning':
          await this.adbManager.simulateMemoryWarning(this.currentSession.deviceId, data?.packageName)
          break
        }
      } catch (error) {
        console.error(`[TestRecorder] Failed to execute ${type} action on device:`, error)
      }
    }

    let screenshot: Buffer | undefined

    if (captureScreenshot) {
      try {
        // Wait for UI animations and transitions to complete
        await this.wait(1000)
        screenshot = await this.adbManager.captureScreenshot(this.currentSession.deviceId)
        this.lastScreenshot = screenshot

        // Refresh UI cache after action (UI may have changed)
        if (this.currentSession.sdkConnected) {
          await this.refreshUIElementsCache()
        }
      } catch (error) {
        console.error('[TestRecorder] Failed to capture screenshot:', error)
      }
    }

    this.addAction({
      type,
      timestamp: Date.now(),
      data,
      screenshot,
      ...elementData
    })
  }

  private addAction(action: RecordedAction): void {
    if (!this.currentSession) return

    console.log(`[TestRecorder] Adding action:`, {
      type: action.type,
      hasScreenshot: !!action.screenshot,
      screenshotSize: action.screenshot?.length || 0,
      totalActions: this.currentSession.actions.length + 1
    })

    this.currentSession.actions.push(action)
    this.emit('actionRecorded', action)
  }

  private startEventMonitoring(deviceId: string): void {
    // For now, we rely on manual action capture
    // In a full implementation, we would use 'adb shell getevent' to monitor touch events
    // and automatically detect taps/swipes

    // Monitor for screen changes and auto-capture when significant changes detected
    this.recordingInterval = setInterval(async () => {
      if (!this.isRecording) return

      try {
        const screenshot = await this.adbManager.captureScreenshot(deviceId)

        // Check for significant changes BEFORE updating lastScreenshot
        const previousScreenshot = this.lastScreenshot
        const now = Date.now()
        const timeSinceLastGesture = now - this.lastGestureTime

        // Auto-capture only on significant changes (like screen transitions)
        // BUT skip if a gesture was detected recently (within 3 seconds) to avoid
        // capturing intermediate states during swipes/gestures
        if (previousScreenshot &&
            timeSinceLastGesture > 3000 &&
            this.hasSignificantChangeCompare(previousScreenshot, screenshot)) {
          this.addAction({
            type: 'screenshot',
            timestamp: now,
            data: { description: 'Screen changed' },
            screenshot
          })
          console.log('[TestRecorder] Auto-captured screenshot due to screen change')
        }

        // Update screenshot for display (always update lastScreenshot AFTER comparison)
        this.lastScreenshot = screenshot
      } catch (error) {
        // Ignore screenshot errors during monitoring
      }
    }, 2000) // Check every 2 seconds for screen changes
  }

  private hasSignificantChangeCompare(oldScreenshot: Buffer, newScreenshot: Buffer): boolean {
    // Simple size comparison - more sensitive threshold for better screen change detection
    // Even subtle UI changes can result in different PNG compression sizes
    return Math.abs(newScreenshot.length - oldScreenshot.length) > 5000
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording
  }

  getCurrentSession(): RecordingSession | null {
    return this.currentSession
  }

  /**
   * Get the most recent screenshot for live streaming
   */
  getLastScreenshot(): Buffer | null {
    return this.lastScreenshot
  }

  /**
   * Refresh the cache of UI elements from Unity SDK
   */
  private async refreshUIElementsCache(): Promise<void> {
    if (!this.unityBridge.isSDKConnected()) {
      return
    }

    try {
      this.uiElementsCache = await this.unityBridge.getUIElements()
      console.log(`[TestRecorder] Refreshed UI elements cache: ${this.uiElementsCache.length} elements`)
    } catch (error) {
      console.warn('[TestRecorder] Failed to refresh UI elements cache:', error)
      this.uiElementsCache = []
    }
  }

  /**
   * Find UI element at a given screen position
   * Uses simple bounds checking - in production, would use proper hit testing
   */
  private findElementAtPosition(x: number, y: number): UIElement | null {
    if (this.uiElementsCache.length === 0) {
      return null
    }

    // Find elements that could contain this position
    // Note: This is a simplified version - Unity positions need conversion to screen coordinates
    // For now, we'll match by name/type heuristics and position proximity

    let closestElement: UIElement | null = null
    let closestDistance = Infinity

    for (const element of this.uiElementsCache) {
      // Skip inactive or non-interactable elements
      if (!element.active) continue

      // Calculate distance from tap to element center (simplified)
      const distance = Math.sqrt(
        Math.pow(element.position.x - x, 2) + Math.pow(element.position.y - y, 2)
      )

      // If this is closer and it's an interactable type, consider it
      if (distance < closestDistance && this.isInteractableType(element.type)) {
        closestDistance = distance
        closestElement = element
      }
    }

    // Only return if reasonably close (within 200 pixels)
    if (closestDistance < 200) {
      return closestElement
    }

    return null
  }

  /**
   * Check if element type is typically interactable
   */
  private isInteractableType(type: string): boolean {
    const interactableTypes = ['Button', 'Toggle', 'Slider', 'Dropdown', 'InputField']
    return interactableTypes.includes(type)
  }

  /**
   * Get current recording mode
   */
  getRecordingMode(): 'coordinate' | 'element' | null {
    return this.currentSession?.mode || null
  }

  /**
   * Check if Unity SDK is currently connected
   */
  isSDKConnected(): boolean {
    return this.unityBridge.isSDKConnected()
  }
}
