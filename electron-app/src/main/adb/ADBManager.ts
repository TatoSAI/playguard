import { EventEmitter } from 'events'
const Adb = require('@devicefarmer/adbkit').default || require('@devicefarmer/adbkit')

export interface Device {
  id: string
  type: string
  model?: string
  product?: string
  device?: string
  transportId?: string
  state?: string
}

export interface DeviceInfo {
  id: string
  model: string
  manufacturer: string
  androidVersion: string
  resolution: string
  isConnected: boolean
}

export class ADBManager extends EventEmitter {
  private client: any
  private connectedDevices: Map<string, DeviceInfo>
  private tracker: any

  constructor() {
    super()
    this.connectedDevices = new Map()
  }

  async initialize(): Promise<void> {
    try {
      // Set ADB path in environment if not already set
      const adbPath = 'C:\\Users\\CLIENTE2022\\AppData\\Local\\Android\\Sdk\\platform-tools'
      if (!process.env.PATH?.includes(adbPath)) {
        process.env.PATH = `${process.env.PATH};${adbPath}`
      }

      // Create ADB client (will use ADB from PATH)
      console.log('[ADBManager] Creating ADB client...')
      console.log('[ADBManager] Adb type:', typeof Adb)
      console.log('[ADBManager] Adb.createClient type:', typeof Adb.createClient)
      console.log('[ADBManager] Adb.util type:', typeof Adb.util)

      this.client = Adb.createClient()

      if (!this.client) {
        throw new Error('Failed to create ADB client')
      }

      console.log('[ADBManager] Client created:', !!this.client)
      console.log('[ADBManager] Client type:', typeof this.client)
      console.log('[ADBManager] Client methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.client)))
      console.log('[ADBManager] Has listDevices:', typeof this.client.listDevices)
      console.log('[ADBManager] Has shell:', typeof this.client.shell)
      console.log('[ADBManager] Initialized successfully')

      // Start tracking devices
      await this.startTracking()

      // Get initial device list
      await this.refreshDevices()
    } catch (error) {
      console.error('[ADBManager] Failed to initialize:', error)
      throw error
    }
  }

  async startTracking(): Promise<void> {
    try {
      this.tracker = await this.client.trackDevices()

      this.tracker.on('add', async (device: Device) => {
        console.log('[ADBManager] Device connected:', device.id)
        await this.onDeviceConnected(device)
      })

      this.tracker.on('remove', (device: Device) => {
        console.log('[ADBManager] Device disconnected:', device.id)
        this.onDeviceDisconnected(device)
      })

      this.tracker.on('change', async (device: Device) => {
        console.log('[ADBManager] Device changed:', device.id)
        await this.onDeviceConnected(device)
      })

      this.tracker.on('error', (error: Error) => {
        console.error('[ADBManager] Tracker error:', error)
      })
    } catch (error) {
      console.error('[ADBManager] Failed to start tracking:', error)
    }
  }

  async getDevices(): Promise<DeviceInfo[]> {
    try {
      const devices = await this.client.listDevices()

      const deviceInfos: DeviceInfo[] = []

      for (const device of devices) {
        try {
          const info = await this.getDeviceInfo(device.id)
          deviceInfos.push(info)
        } catch (error) {
          console.error(`[ADBManager] Failed to get info for device ${device.id}:`, error)
          // Add basic info even if detailed info fails
          deviceInfos.push({
            id: device.id,
            model: 'Unknown',
            manufacturer: 'Unknown',
            androidVersion: 'Unknown',
            resolution: 'Unknown',
            isConnected: true
          })
        }
      }

      return deviceInfos
    } catch (error) {
      console.error('[ADBManager] Failed to get devices:', error)
      return []
    }
  }

  async getDeviceInfo(deviceId: string): Promise<DeviceInfo> {
    try {
      console.log(`[ADBManager] Getting properties for device ${deviceId}...`)

      // Get device properties using shell getprop command
      const model = await this.getProperty(deviceId, 'ro.product.model')
      const manufacturer = await this.getProperty(deviceId, 'ro.product.manufacturer')
      const androidVersion = await this.getProperty(deviceId, 'ro.build.version.release')

      console.log(`[ADBManager] Device info: ${manufacturer} ${model}, Android ${androidVersion}`)

      // Get screen resolution
      const resolution = await this.getDeviceResolution(deviceId)

      const deviceInfo: DeviceInfo = {
        id: deviceId,
        model,
        manufacturer,
        androidVersion,
        resolution,
        isConnected: true
      }

      this.connectedDevices.set(deviceId, deviceInfo)

      return deviceInfo
    } catch (error) {
      console.error(`[ADBManager] Failed to get device info for ${deviceId}:`, error)
      throw error
    }
  }

  private async getProperty(deviceId: string, property: string): Promise<string> {
    try {
      const device = this.client.getDevice(deviceId)
      const output = await device.shell(`getprop ${property}`)
      const stream = await Adb.util.readAll(output)
      const value = stream.toString().trim()
      return value || 'Unknown'
    } catch (error) {
      console.error(`[ADBManager] Failed to get property ${property}:`, error)
      return 'Unknown'
    }
  }

  async getDeviceResolution(deviceId: string): Promise<string> {
    try {
      const device = this.client.getDevice(deviceId)
      const output = await device.shell('wm size')
      const stream = await Adb.util.readAll(output)
      const result = stream.toString().trim()

      // Parse output like "Physical size: 1080x2400"
      const match = result.match(/(\d+)x(\d+)/)
      if (match) {
        return `${match[1]}x${match[2]}`
      }

      return 'Unknown'
    } catch (error) {
      console.error(`[ADBManager] Failed to get resolution for ${deviceId}:`, error)
      return 'Unknown'
    }
  }

  async connectToDevice(deviceId: string): Promise<boolean> {
    try {
      // Verify device exists and is accessible
      const devices = await this.client.listDevices()
      const device = devices.find((d: Device) => d.id === deviceId)

      if (!device) {
        throw new Error(`Device ${deviceId} not found`)
      }

      // Get full device info
      await this.getDeviceInfo(deviceId)

      console.log(`[ADBManager] Successfully connected to device ${deviceId}`)

      // Emit event for UI
      this.emit('deviceConnected', deviceId)

      return true
    } catch (error) {
      console.error(`[ADBManager] Failed to connect to device ${deviceId}:`, error)
      return false
    }
  }

  async disconnectDevice(deviceId: string): Promise<boolean> {
    try {
      this.connectedDevices.delete(deviceId)

      console.log(`[ADBManager] Disconnected from device ${deviceId}`)

      // Emit event for UI
      this.emit('deviceDisconnected', deviceId)

      return true
    } catch (error) {
      console.error(`[ADBManager] Failed to disconnect device ${deviceId}:`, error)
      return false
    }
  }

  async executeShellCommand(deviceId: string, command: string): Promise<string> {
    try {
      const device = this.client.getDevice(deviceId)
      const output = await device.shell(command)
      const stream = await Adb.util.readAll(output)
      return stream.toString().trim()
    } catch (error) {
      console.error(`[ADBManager] Failed to execute command on ${deviceId}:`, error)
      throw error
    }
  }

  async sendTap(deviceId: string, x: number, y: number): Promise<void> {
    try {
      await this.executeShellCommand(deviceId, `input tap ${x} ${y}`)
      console.log(`[ADBManager] Sent tap to ${deviceId}: (${x}, ${y})`)
    } catch (error) {
      console.error(`[ADBManager] Failed to send tap:`, error)
      throw error
    }
  }

  async sendSwipe(
    deviceId: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    duration: number
  ): Promise<void> {
    try {
      await this.executeShellCommand(
        deviceId,
        `input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`
      )
      console.log(`[ADBManager] Sent swipe to ${deviceId}`)
    } catch (error) {
      console.error(`[ADBManager] Failed to send swipe:`, error)
      throw error
    }
  }

  async sendText(deviceId: string, text: string): Promise<void> {
    try {
      // Escape special characters
      const escapedText = text.replace(/[\s]/g, '%s')
      await this.executeShellCommand(deviceId, `input text "${escapedText}"`)
      console.log(`[ADBManager] Sent text to ${deviceId}`)
    } catch (error) {
      console.error(`[ADBManager] Failed to send text:`, error)
      throw error
    }
  }

  async captureScreenshot(deviceId: string): Promise<Buffer> {
    try {
      const device = this.client.getDevice(deviceId)
      const stream = await device.screencap()
      const buffer = await Adb.util.readAll(stream)
      console.log(`[ADBManager] Captured screenshot from ${deviceId}`)
      return buffer
    } catch (error) {
      console.error(`[ADBManager] Failed to capture screenshot:`, error)
      throw error
    }
  }

  // ============= App Lifecycle Methods =============

  async startApp(deviceId: string, packageName: string, activityName?: string): Promise<void> {
    try {
      // If no activity specified, use the main launcher activity
      if (!activityName) {
        activityName = await this.getMainActivity(deviceId, packageName)
      }

      const fullActivity = activityName.startsWith(packageName)
        ? activityName
        : `${packageName}/${activityName}`

      await this.executeShellCommand(
        deviceId,
        `am start -n ${fullActivity} -a android.intent.action.MAIN -c android.intent.category.LAUNCHER`
      )
      console.log(`[ADBManager] Started app ${packageName} on ${deviceId}`)

      // Wait for app to start
      await this.wait(1000)
    } catch (error) {
      console.error(`[ADBManager] Failed to start app ${packageName}:`, error)
      throw error
    }
  }

  async stopApp(deviceId: string, packageName: string): Promise<void> {
    try {
      await this.executeShellCommand(deviceId, `am force-stop ${packageName}`)
      console.log(`[ADBManager] Stopped app ${packageName} on ${deviceId}`)
    } catch (error) {
      console.error(`[ADBManager] Failed to stop app ${packageName}:`, error)
      throw error
    }
  }

  async clearAppData(deviceId: string, packageName: string): Promise<void> {
    try {
      await this.executeShellCommand(deviceId, `pm clear ${packageName}`)
      console.log(`[ADBManager] Cleared data for ${packageName} on ${deviceId}`)
    } catch (error) {
      console.error(`[ADBManager] Failed to clear app data ${packageName}:`, error)
      throw error
    }
  }

  async isAppRunning(deviceId: string, packageName: string): Promise<boolean> {
    try {
      const output = await this.executeShellCommand(deviceId, `pidof ${packageName}`)
      // pidof returns PID if running, empty string if not
      const isRunning = output.length > 0 && !output.includes('not found')
      console.log(`[ADBManager] App ${packageName} running: ${isRunning}`)
      return isRunning
    } catch (error) {
      // If command fails, app is not running
      console.log(`[ADBManager] App ${packageName} is not running`)
      return false
    }
  }

  async isAppInstalled(deviceId: string, packageName: string): Promise<boolean> {
    try {
      const output = await this.executeShellCommand(deviceId, `pm list packages ${packageName}`)
      const isInstalled = output.includes(packageName)
      console.log(`[ADBManager] App ${packageName} installed: ${isInstalled}`)
      return isInstalled
    } catch (error) {
      console.error(`[ADBManager] Failed to check if app ${packageName} is installed:`, error)
      return false
    }
  }

  private async getMainActivity(deviceId: string, packageName: string): Promise<string> {
    try {
      // Use dumpsys to get the main launcher activity
      const output = await this.executeShellCommand(
        deviceId,
        `cmd package resolve-activity --brief ${packageName} | tail -n 1`
      )

      if (output && output.includes('/')) {
        return output.trim()
      }

      // Fallback: try to parse from package info
      const pkgOutput = await this.executeShellCommand(
        deviceId,
        `dumpsys package ${packageName} | grep -A 1 "android.intent.action.MAIN"`
      )

      const match = pkgOutput.match(/([^\s]+)\s+filter/)
      if (match && match[1]) {
        return match[1]
      }

      // If all else fails, return package with .MainActivity
      return `${packageName}/.MainActivity`
    } catch (error) {
      console.error(`[ADBManager] Failed to get main activity for ${packageName}:`, error)
      // Default fallback
      return `${packageName}/.MainActivity`
    }
  }

  // ============= Crash Detection Methods =============

  async isAppCrashed(deviceId: string, packageName: string): Promise<boolean> {
    try {
      // Check if app was running and now is not (potential crash)
      const isRunning = await this.isAppRunning(deviceId, packageName)

      if (isRunning) {
        return false // App is still running, no crash
      }

      // Check logcat for crash indicators
      const recentLogs = await this.executeShellCommand(
        deviceId,
        `logcat -d -t 100 | grep -i "${packageName}"`
      )

      // Look for crash indicators in logs
      const crashIndicators = [
        'FATAL EXCEPTION',
        'AndroidRuntime: FATAL',
        'Process.*died',
        'fatal signal',
        'Native crash',
        'beginning of crash'
      ]

      for (const indicator of crashIndicators) {
        if (recentLogs.toLowerCase().includes(indicator.toLowerCase())) {
          console.log(`[ADBManager] Crash detected for ${packageName}: found "${indicator}"`)
          return true
        }
      }

      return false
    } catch (error) {
      console.error(`[ADBManager] Failed to check crash status for ${packageName}:`, error)
      return false
    }
  }

  async getCrashLog(deviceId: string, packageName?: string): Promise<string> {
    try {
      let command = 'logcat -d -t 500'

      if (packageName) {
        // Filter logs for specific package
        command += ` | grep -i "${packageName}"`
      }

      const logs = await this.executeShellCommand(deviceId, command)

      // Look for crash-related logs
      const lines = logs.split('\n')
      const crashLines: string[] = []
      let inCrashSection = false

      for (const line of lines) {
        if (
          line.includes('FATAL EXCEPTION') ||
          line.includes('AndroidRuntime: FATAL') ||
          line.includes('beginning of crash')
        ) {
          inCrashSection = true
        }

        if (inCrashSection) {
          crashLines.push(line)

          // Stop collecting after stack trace ends
          if (line.trim() === '' && crashLines.length > 10) {
            inCrashSection = false
          }
        }
      }

      if (crashLines.length > 0) {
        console.log(`[ADBManager] Retrieved ${crashLines.length} lines of crash logs`)
        return crashLines.join('\n')
      }

      return logs // Return all logs if no specific crash found
    } catch (error) {
      console.error(`[ADBManager] Failed to get crash logs:`, error)
      throw error
    }
  }

  async clearLogcat(deviceId: string): Promise<void> {
    try {
      await this.executeShellCommand(deviceId, 'logcat -c')
      console.log(`[ADBManager] Cleared logcat for ${deviceId}`)
    } catch (error) {
      console.error(`[ADBManager] Failed to clear logcat:`, error)
      throw error
    }
  }

  // ============================================================================
  // Device Action Methods - Hardware Buttons
  // ============================================================================

  async pressBack(deviceId: string): Promise<void> {
    console.log(`[ADBManager] Pressing BACK button on ${deviceId}`)
    await this.executeShellCommand(deviceId, 'input keyevent KEYCODE_BACK')
  }

  async pressHome(deviceId: string): Promise<void> {
    console.log(`[ADBManager] Pressing HOME button on ${deviceId}`)
    await this.executeShellCommand(deviceId, 'input keyevent KEYCODE_HOME')
  }

  async pressVolumeUp(deviceId: string): Promise<void> {
    console.log(`[ADBManager] Pressing VOLUME UP on ${deviceId}`)
    await this.executeShellCommand(deviceId, 'input keyevent KEYCODE_VOLUME_UP')
  }

  async pressVolumeDown(deviceId: string): Promise<void> {
    console.log(`[ADBManager] Pressing VOLUME DOWN on ${deviceId}`)
    await this.executeShellCommand(deviceId, 'input keyevent KEYCODE_VOLUME_DOWN')
  }

  // ============================================================================
  // Device Action Methods - Screen Orientation
  // ============================================================================

  async rotatePortrait(deviceId: string): Promise<void> {
    console.log(`[ADBManager] Rotating to PORTRAIT on ${deviceId}`)
    // Disable auto-rotate first, then set orientation
    await this.executeShellCommand(deviceId, 'settings put system accelerometer_rotation 0')
    await this.executeShellCommand(deviceId, 'settings put system user_rotation 0')
  }

  async rotateLandscape(deviceId: string): Promise<void> {
    console.log(`[ADBManager] Rotating to LANDSCAPE on ${deviceId}`)
    await this.executeShellCommand(deviceId, 'settings put system accelerometer_rotation 0')
    await this.executeShellCommand(deviceId, 'settings put system user_rotation 1')
  }

  async rotatePortraitReverse(deviceId: string): Promise<void> {
    console.log(`[ADBManager] Rotating to PORTRAIT REVERSE on ${deviceId}`)
    await this.executeShellCommand(deviceId, 'settings put system accelerometer_rotation 0')
    await this.executeShellCommand(deviceId, 'settings put system user_rotation 2')
  }

  async rotateLandscapeReverse(deviceId: string): Promise<void> {
    console.log(`[ADBManager] Rotating to LANDSCAPE REVERSE on ${deviceId}`)
    await this.executeShellCommand(deviceId, 'settings put system accelerometer_rotation 0')
    await this.executeShellCommand(deviceId, 'settings put system user_rotation 3')
  }

  async toggleAutoRotate(deviceId: string, enable?: boolean): Promise<void> {
    if (enable === undefined) {
      // Get current state and toggle
      const current = await this.executeShellCommand(deviceId, 'settings get system accelerometer_rotation')
      enable = current.trim() === '0'
    }
    console.log(`[ADBManager] ${enable ? 'Enabling' : 'Disabling'} auto-rotate on ${deviceId}`)
    await this.executeShellCommand(deviceId, `settings put system accelerometer_rotation ${enable ? '1' : '0'}`)
  }

  // ============================================================================
  // Device Action Methods - App Lifecycle
  // ============================================================================

  async backgroundApp(deviceId: string): Promise<void> {
    console.log(`[ADBManager] Sending app to background on ${deviceId}`)
    await this.pressHome(deviceId)
  }

  async foregroundApp(deviceId: string, packageName: string): Promise<void> {
    console.log(`[ADBManager] Bringing ${packageName} to foreground on ${deviceId}`)
    // Get the main activity and restart it
    await this.executeShellCommand(deviceId, `monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`)
  }

  async forceStopApp(deviceId: string, packageName: string): Promise<void> {
    console.log(`[ADBManager] Force stopping ${packageName} on ${deviceId}`)
    await this.executeShellCommand(deviceId, `am force-stop ${packageName}`)
  }

  async clearAppDataAction(deviceId: string, packageName: string): Promise<void> {
    console.log(`[ADBManager] Clearing data for ${packageName} on ${deviceId}`)
    await this.executeShellCommand(deviceId, `pm clear ${packageName}`)
  }

  // ============================================================================
  // Device Action Methods - Connectivity
  // ============================================================================

  async toggleWiFi(deviceId: string, enable?: boolean): Promise<void> {
    if (enable === undefined) {
      // Get current state and toggle
      const current = await this.executeShellCommand(deviceId, 'settings get global wifi_on')
      enable = current.trim() === '0'
    }
    console.log(`[ADBManager] ${enable ? 'Enabling' : 'Disabling'} WiFi on ${deviceId}`)
    await this.executeShellCommand(deviceId, `svc wifi ${enable ? 'enable' : 'disable'}`)
  }

  async toggleMobileData(deviceId: string, enable?: boolean): Promise<void> {
    if (enable === undefined) {
      // Get current state and toggle
      const current = await this.executeShellCommand(deviceId, 'settings get global mobile_data')
      enable = current.trim() === '0'
    }
    console.log(`[ADBManager] ${enable ? 'Enabling' : 'Disabling'} Mobile Data on ${deviceId}`)
    await this.executeShellCommand(deviceId, `svc data ${enable ? 'enable' : 'disable'}`)
  }

  async toggleAirplaneMode(deviceId: string, enable?: boolean): Promise<void> {
    if (enable === undefined) {
      // Get current state and toggle
      const current = await this.executeShellCommand(deviceId, 'settings get global airplane_mode_on')
      enable = current.trim() === '0'
    }
    console.log(`[ADBManager] ${enable ? 'Enabling' : 'Disabling'} Airplane Mode on ${deviceId}`)
    const value = enable ? '1' : '0'
    await this.executeShellCommand(deviceId, `settings put global airplane_mode_on ${value}`)
    await this.executeShellCommand(deviceId, `am broadcast -a android.intent.action.AIRPLANE_MODE --ez state ${enable}`)
  }

  // ============================================================================
  // Device Action Methods - Interruptions/Simulations
  // ============================================================================

  async simulateIncomingCall(deviceId: string, phoneNumber: string = '1234567890'): Promise<void> {
    console.log(`[ADBManager] Simulating incoming call from ${phoneNumber} on ${deviceId}`)
    // This works on emulator, limited on physical devices
    await this.executeShellCommand(deviceId, `am start -a android.intent.action.CALL -d tel:${phoneNumber}`)
  }

  async simulateNotification(deviceId: string, title: string = 'Test', message: string = 'Test Notification'): Promise<void> {
    console.log(`[ADBManager] Simulating notification on ${deviceId}`)
    // Post a notification using am command
    const escapedTitle = title.replace(/"/g, '\\"')
    const escapedMessage = message.replace(/"/g, '\\"')
    await this.executeShellCommand(
      deviceId,
      `am broadcast -a android.intent.action.SHOW_TEXT -e text "${escapedMessage}" -e title "${escapedTitle}"`
    )
  }

  async simulateLowBattery(deviceId: string, level: number = 10): Promise<void> {
    console.log(`[ADBManager] Simulating low battery (${level}%) on ${deviceId}`)
    // This requires specific device setup or emulator
    await this.executeShellCommand(deviceId, `dumpsys battery set level ${level}`)
    await this.executeShellCommand(deviceId, 'dumpsys battery set status 3') // 3 = discharging
  }

  async resetBatterySimulation(deviceId: string): Promise<void> {
    console.log(`[ADBManager] Resetting battery simulation on ${deviceId}`)
    await this.executeShellCommand(deviceId, 'dumpsys battery reset')
  }

  async simulateMemoryWarning(deviceId: string, packageName: string): Promise<void> {
    console.log(`[ADBManager] Simulating memory warning for ${packageName} on ${deviceId}`)
    // Send a low memory broadcast to the app
    await this.executeShellCommand(deviceId, `am send-trim-memory ${packageName} RUNNING_CRITICAL`)
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async onDeviceConnected(device: Device): Promise<void> {
    try {
      const info = await this.getDeviceInfo(device.id)
      this.emit('deviceAdded', info)
    } catch (error) {
      console.error(`[ADBManager] Error handling device connection:`, error)
    }
  }

  private onDeviceDisconnected(device: Device): void {
    this.connectedDevices.delete(device.id)
    this.emit('deviceRemoved', device.id)
  }

  private async refreshDevices(): Promise<void> {
    try {
      const devices = await this.getDevices()
      console.log(`[ADBManager] Found ${devices.length} device(s)`)

      for (const device of devices) {
        this.emit('deviceAdded', device)
      }
    } catch (error) {
      console.error('[ADBManager] Failed to refresh devices:', error)
    }
  }

  /**
   * Install APK on device
   */
  async installAPK(deviceId: string, apkPath: string): Promise<void> {
    console.log(`[ADBManager] Installing APK: ${apkPath} on ${deviceId}`)
    try {
      await this.client.install(deviceId, apkPath)
      console.log('[ADBManager] APK installed successfully')
    } catch (error) {
      console.error('[ADBManager] Failed to install APK:', error)
      throw error
    }
  }

  /**
   * Uninstall app from device
   */
  async uninstall(deviceId: string, packageName: string): Promise<void> {
    console.log(`[ADBManager] Uninstalling ${packageName} from ${deviceId}`)
    try {
      await this.executeShellCommand(deviceId, `pm uninstall ${packageName}`)
      console.log('[ADBManager] App uninstalled successfully')
    } catch (error) {
      console.error('[ADBManager] Failed to uninstall app:', error)
      throw error
    }
  }

  /**
   * Clear app cache
   */
  async clearCache(deviceId: string, packageName: string): Promise<void> {
    console.log(`[ADBManager] Clearing cache for ${packageName} on ${deviceId}`)
    try {
      // Clear cache directory
      await this.executeShellCommand(deviceId, `rm -rf /data/data/${packageName}/cache/*`)
      console.log('[ADBManager] Cache cleared successfully')
    } catch (error) {
      console.error('[ADBManager] Failed to clear cache:', error)
      throw error
    }
  }

  cleanup(): void {
    if (this.tracker) {
      this.tracker.end()
    }
    this.connectedDevices.clear()
    console.log('[ADBManager] Cleaned up')
  }
}
