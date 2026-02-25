/**
 * Ad-Hoc Monitor Service
 * Lightweight exploratory testing with selective screenshot capture
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import * as crypto from 'crypto'
import { ADBManager } from '../adb/ADBManager'
import { TouchEventMonitor } from '../test-engine/TouchEventMonitor'

export interface AdHocEvent {
  id: string
  timestamp: number
  type: 'screen_change' | 'manual_capture' | 'issue_marked' | 'success_marked' | 'session_start' | 'session_stop' | 'tap' | 'swipe' | 'double_tap' | 'navigate'
  screenHash: string
  screenName?: string
  duration?: number // Time spent on previous screen (ms)
  screenshot?: string // Only for manual captures, issues, or successes
  description?: string // For issues/successes
  metadata?: Record<string, any>
  // Touch event data
  x?: number
  y?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

export interface AdHocSession {
  id: string
  startTime: number
  endTime?: number
  deviceId: string
  deviceModel?: string
  events: AdHocEvent[]
  totalScreens: number
  totalCaptures: number
  totalIssues: number
  duration?: number // milliseconds
}

export interface NavigationPattern {
  screen: string
  visitCount: number
  totalDuration: number
  avgDuration: number
  transitions: Record<string, number> // screen -> count
}

export interface AIInsight {
  id: string
  type: 'suggestion' | 'warning' | 'success' | 'info'
  message: string
  timestamp: number
  confidence?: number
  relatedEvents?: string[]
}

export class AdHocMonitor {
  private currentSession: AdHocSession | null = null
  private monitoringInterval: NodeJS.Timeout | null = null
  private lastScreenHash: string | null = null
  private lastScreenTime: number | null = null
  private currentScreenHash: string | null = null
  private dataDir: string | null = null
  private adbManager: ADBManager
  private touchMonitor: TouchEventMonitor | null = null

  constructor(adbManager: ADBManager) {
    this.adbManager = adbManager
  }

  /**
   * Get data directory (lazy initialization)
   */
  private getDataDir(): string {
    if (!this.dataDir) {
      this.dataDir = path.join(app.getPath('userData'), 'adhoc-sessions')
    }
    return this.dataDir
  }

  /**
   * Start ad-hoc monitoring session
   */
  async startSession(deviceId: string): Promise<AdHocSession> {
    if (this.currentSession) {
      throw new Error('Session already active. Stop current session first.')
    }

    // Get device info
    const devices = await this.adbManager.getDevices()
    const device = devices.find(d => d.id === deviceId)

    const sessionId = `adhoc_${Date.now()}`
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      deviceId: deviceId,
      deviceModel: device?.model,
      events: [],
      totalScreens: 0,
      totalCaptures: 0,
      totalIssues: 0
    }

    // Add session start event
    this.addEvent({
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      type: 'session_start',
      screenHash: '',
      description: 'Ad-hoc session started'
    })

    // Start lightweight monitoring (every 2 seconds) — Android only
    const isBrowser = deviceId.startsWith('browser_')
    if (!isBrowser) {
      this.startMonitoring()
      await this.startTouchMonitoring(deviceId)
    }

    console.log(`[AdHocMonitor] Session started: ${sessionId}`)
    return this.currentSession
  }

  /**
   * Stop current session
   */
  async stopSession(): Promise<AdHocSession> {
    if (!this.currentSession) {
      throw new Error('No active session')
    }

    this.stopMonitoring()
    this.stopTouchMonitoring()

    const endTime = Date.now()
    this.currentSession.endTime = endTime
    this.currentSession.duration = endTime - this.currentSession.startTime

    // Add session stop event
    this.addEvent({
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      type: 'session_stop',
      screenHash: this.currentScreenHash || '',
      description: `Session completed. Duration: ${this.formatDuration(this.currentSession.duration)}`
    })

    // Save session to disk
    await this.saveSession(this.currentSession)

    const session = this.currentSession
    this.currentSession = null
    this.lastScreenHash = null
    this.lastScreenTime = null
    this.currentScreenHash = null

    console.log(`[AdHocMonitor] Session stopped: ${session.id}`)
    return session
  }

  /**
   * Get current active session
   */
  getCurrentSession(): AdHocSession | null {
    return this.currentSession
  }

  /**
   * Manually capture screenshot with description
   */
  async captureScreenshot(description?: string): Promise<AdHocEvent> {
    if (!this.currentSession) {
      throw new Error('No active session')
    }

    const isBrowser = this.currentSession.deviceId.startsWith('browser_')
    const screenshotBuf = isBrowser ? undefined : await this.adbManager.captureScreenshot(this.currentSession.deviceId)
    const screenshot = screenshotBuf ? `data:image/png;base64,${screenshotBuf.toString('base64')}` : undefined
    const screenHash = screenshot ? this.hashImage(screenshot) : `manual_${Date.now()}`

    const event: AdHocEvent = {
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      type: 'manual_capture',
      screenHash,
      screenshot,
      description: description || 'Manual capture'
    }

    this.addEvent(event)
    this.currentSession.totalCaptures++

    console.log(`[AdHocMonitor] Screenshot captured manually`)
    return event
  }

  /**
   * Mark an issue with screenshot
   */
  async markIssue(description: string, severity: 'low' | 'medium' | 'high' = 'medium'): Promise<AdHocEvent> {
    if (!this.currentSession) {
      throw new Error('No active session')
    }

    const isBrowser = this.currentSession.deviceId.startsWith('browser_')
    const screenshotBuf = isBrowser ? undefined : await this.adbManager.captureScreenshot(this.currentSession.deviceId)
    const screenshot = screenshotBuf ? `data:image/png;base64,${screenshotBuf.toString('base64')}` : undefined
    const screenHash = screenshot ? this.hashImage(screenshot) : `issue_${Date.now()}`

    const event: AdHocEvent = {
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      type: 'issue_marked',
      screenHash,
      screenshot,
      description: `⚠️ [${severity.toUpperCase()}] ${description}`,
      metadata: { severity }
    }

    this.addEvent(event)
    this.currentSession.totalIssues++
    this.currentSession.totalCaptures++

    console.log(`[AdHocMonitor] Issue marked: ${description}`)
    return event
  }

  /**
   * Mark a success point with screenshot
   */
  async markSuccess(description: string): Promise<AdHocEvent> {
    if (!this.currentSession) {
      throw new Error('No active session')
    }

    const isBrowser = this.currentSession.deviceId.startsWith('browser_')
    const screenshotBuf = isBrowser ? undefined : await this.adbManager.captureScreenshot(this.currentSession.deviceId)
    const screenshot = screenshotBuf ? `data:image/png;base64,${screenshotBuf.toString('base64')}` : undefined
    const screenHash = screenshot ? this.hashImage(screenshot) : `success_${Date.now()}`

    const event: AdHocEvent = {
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      type: 'success_marked',
      screenHash,
      screenshot,
      description: `✅ ${description}`
    }

    this.addEvent(event)
    this.currentSession.totalCaptures++

    console.log(`[AdHocMonitor] Success marked: ${description}`)
    return event
  }

  /**
   * Generate AI insights based on navigation patterns
   */
  async generateInsights(): Promise<AIInsight[]> {
    if (!this.currentSession) {
      return []
    }

    const insights: AIInsight[] = []
    const patterns = this.analyzeNavigationPatterns()

    // Insight 1: Most visited screens
    const topScreens = Object.values(patterns)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 3)

    if (topScreens.length > 0) {
      insights.push({
        id: `insight_${Date.now()}_1`,
        type: 'info',
        message: `📊 Most visited: ${topScreens.map(s => `"${s.screen}" (${s.visitCount}x)`).join(', ')}`,
        timestamp: Date.now(),
        confidence: 0.9
      })
    }

    // Insight 2: Screens with long duration
    const slowScreens = Object.values(patterns)
      .filter(p => p.avgDuration > 10000) // > 10 seconds
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 2)

    if (slowScreens.length > 0) {
      insights.push({
        id: `insight_${Date.now()}_2`,
        type: 'warning',
        message: `⏱️ Users spend longest on: ${slowScreens.map(s => `"${s.screen}" (${this.formatDuration(s.avgDuration)})`).join(', ')}`,
        timestamp: Date.now(),
        confidence: 0.85
      })
    }

    // Insight 3: Common navigation flows
    const commonFlows = this.findCommonFlows(patterns)
    if (commonFlows.length > 0) {
      const flow = commonFlows[0]
      insights.push({
        id: `insight_${Date.now()}_3`,
        type: 'suggestion',
        message: `🔄 Common flow detected: ${flow.path.join(' → ')} (${flow.count}x)`,
        timestamp: Date.now(),
        confidence: 0.8
      })
    }

    // Insight 4: Issues detected
    const issueCount = this.currentSession.totalIssues
    if (issueCount > 0) {
      insights.push({
        id: `insight_${Date.now()}_4`,
        type: 'warning',
        message: `⚠️ ${issueCount} issue${issueCount > 1 ? 's' : ''} marked during this session. Review recommended.`,
        timestamp: Date.now(),
        confidence: 1.0
      })
    }

    // Insight 5: Session progress
    const duration = Date.now() - this.currentSession.startTime
    if (duration > 300000) { // > 5 minutes
      insights.push({
        id: `insight_${Date.now()}_5`,
        type: 'success',
        message: `🎯 Good coverage! Session running for ${this.formatDuration(duration)} with ${this.currentSession.totalScreens} screens explored.`,
        timestamp: Date.now(),
        confidence: 0.75
      })
    }

    return insights
  }

  /**
   * Save session to disk
   */
  private async saveSession(session: AdHocSession): Promise<void> {
    await fs.mkdir(this.getDataDir(), { recursive: true })

    const filename = `${session.id}.json`
    const filepath = path.join(this.getDataDir(), filename)

    await fs.writeFile(filepath, JSON.stringify(session, null, 2))
    console.log(`[AdHocMonitor] Session saved: ${filepath}`)
  }

  /**
   * Load saved sessions
   */
  async loadSessions(): Promise<AdHocSession[]> {
    try {
      await fs.mkdir(this.getDataDir(), { recursive: true })
      const files = await fs.readdir(this.getDataDir())

      const sessions: AdHocSession[] = []
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(path.join(this.getDataDir(), file), 'utf-8')
          sessions.push(JSON.parse(data))
        }
      }

      return sessions.sort((a, b) => b.startTime - a.startTime)
    } catch (error) {
      console.error('[AdHocMonitor] Failed to load sessions:', error)
      return []
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const filepath = path.join(this.getDataDir(), `${sessionId}.json`)
    await fs.unlink(filepath)
    console.log(`[AdHocMonitor] Session deleted: ${sessionId}`)
  }

  /**
   * Start lightweight monitoring (screen change detection only)
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      return
    }

    // Check every 2 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkScreenChange()
      } catch (error) {
        console.error('[AdHocMonitor] Monitoring error:', error)
      }
    }, 2000)

    console.log('[AdHocMonitor] Monitoring started')
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      console.log('[AdHocMonitor] Monitoring stopped')
    }
  }

  /**
   * Start touch event monitoring
   */
  private async startTouchMonitoring(deviceId: string): Promise<void> {
    try {
      console.log(`[AdHocMonitor] Initializing touch monitor for device: ${deviceId}`)
      this.touchMonitor = new TouchEventMonitor(this.adbManager, deviceId)
      console.log('[AdHocMonitor] TouchEventMonitor created successfully')

      // Listen for detected gestures
      this.touchMonitor.on('gesture', (gesture: any) => {
        console.log(`[AdHocMonitor] Gesture detected: ${gesture.type}`, gesture)
        if (!this.currentSession) return

        let event: AdHocEvent
        const now = Date.now()

        if (gesture.type === 'tap') {
          event = {
            id: `event_${now}`,
            timestamp: now,
            type: 'tap',
            screenHash: this.currentScreenHash || '',
            description: `Tap at (${Math.round(gesture.x)}, ${Math.round(gesture.y)})`,
            x: gesture.x,
            y: gesture.y
          }
        } else if (gesture.type === 'double-tap') {
          event = {
            id: `event_${now}`,
            timestamp: now,
            type: 'double_tap',
            screenHash: this.currentScreenHash || '',
            description: `Double tap at (${Math.round(gesture.x)}, ${Math.round(gesture.y)})`,
            x: gesture.x,
            y: gesture.y
          }
        } else if (gesture.type === 'swipe') {
          const direction = this.getSwipeDirection(gesture.x1, gesture.y1, gesture.x2, gesture.y2)
          event = {
            id: `event_${now}`,
            timestamp: now,
            type: 'swipe',
            screenHash: this.currentScreenHash || '',
            description: `Swipe ${direction} from (${Math.round(gesture.x1)}, ${Math.round(gesture.y1)}) to (${Math.round(gesture.x2)}, ${Math.round(gesture.y2)})`,
            x1: gesture.x1,
            y1: gesture.y1,
            x2: gesture.x2,
            y2: gesture.y2
          }
        } else {
          return
        }

        console.log('[AdHocMonitor] Adding touch event:', event.type)
        this.addEvent(event)
      })

      console.log('[AdHocMonitor] Starting TouchEventMonitor...')
      await this.touchMonitor.start()
      console.log('[AdHocMonitor] Touch monitoring started successfully')
    } catch (error) {
      console.error('[AdHocMonitor] Failed to start touch monitoring:', error)
      // Don't throw - allow session to continue without touch monitoring
    }
  }

  /**
   * Stop touch event monitoring
   */
  private stopTouchMonitoring(): void {
    if (this.touchMonitor) {
      this.touchMonitor.stop()
      this.touchMonitor = null
      console.log('[AdHocMonitor] Touch monitoring stopped')
    }
  }

  /**
   * Get swipe direction from coordinates
   */
  private getSwipeDirection(x1: number, y1: number, x2: number, y2: number): string {
    const dx = x2 - x1
    const dy = y2 - y1

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left'
    } else {
      return dy > 0 ? 'down' : 'up'
    }
  }

  /**
   * Check for screen changes (without saving screenshot)
   */
  private async checkScreenChange(): Promise<void> {
    if (!this.currentSession) {
      return
    }

    const screenshotBuf = await this.adbManager.captureScreenshot(this.currentSession.deviceId)
    const screenHash = this.hashImage(screenshotBuf.toString('base64'))

    // First screenshot
    if (!this.lastScreenHash) {
      this.lastScreenHash = screenHash
      this.currentScreenHash = screenHash
      this.lastScreenTime = Date.now()
      return
    }

    // Screen changed
    if (screenHash !== this.lastScreenHash) {
      const now = Date.now()
      const duration = this.lastScreenTime ? now - this.lastScreenTime : 0

      const event: AdHocEvent = {
        id: `event_${now}`,
        timestamp: now,
        type: 'screen_change',
        screenHash: screenHash,
        screenName: `Screen_${screenHash.substring(0, 8)}`,
        duration,
        description: `Screen changed (${this.formatDuration(duration)} on previous screen)`
        // Note: No screenshot saved, only hash
      }

      this.addEvent(event)
      this.currentSession.totalScreens++

      this.lastScreenHash = screenHash
      this.currentScreenHash = screenHash
      this.lastScreenTime = now

      console.log(`[AdHocMonitor] Screen changed detected (hash: ${screenHash.substring(0, 8)})`)
    }
  }

  /**
   * Add event to current session (public for external callers e.g. web renderer)
   */
  addEvent(event: AdHocEvent): void {
    if (!this.currentSession) {
      return
    }
    this.currentSession.events.push(event)
  }

  /**
   * Hash image data for comparison (SHA256)
   */
  private hashImage(imageData: string): string {
    return crypto.createHash('sha256').update(imageData).digest('hex')
  }

  /**
   * Analyze navigation patterns
   */
  private analyzeNavigationPatterns(): Record<string, NavigationPattern> {
    if (!this.currentSession) {
      return {}
    }

    const patterns: Record<string, NavigationPattern> = {}
    let lastScreen: string | null = null

    for (const event of this.currentSession.events) {
      if (event.type !== 'screen_change') {
        continue
      }

      const screenId = event.screenName || event.screenHash.substring(0, 8)

      if (!patterns[screenId]) {
        patterns[screenId] = {
          screen: screenId,
          visitCount: 0,
          totalDuration: 0,
          avgDuration: 0,
          transitions: {}
        }
      }

      patterns[screenId].visitCount++
      patterns[screenId].totalDuration += event.duration || 0

      if (lastScreen && lastScreen !== screenId) {
        if (!patterns[lastScreen].transitions[screenId]) {
          patterns[lastScreen].transitions[screenId] = 0
        }
        patterns[lastScreen].transitions[screenId]++
      }

      lastScreen = screenId
    }

    // Calculate averages
    for (const pattern of Object.values(patterns)) {
      pattern.avgDuration = pattern.totalDuration / pattern.visitCount
    }

    return patterns
  }

  /**
   * Find common navigation flows
   */
  private findCommonFlows(patterns: Record<string, NavigationPattern>): Array<{ path: string[], count: number }> {
    const flows: Record<string, number> = {}

    for (const [screen, pattern] of Object.entries(patterns)) {
      for (const [nextScreen, count] of Object.entries(pattern.transitions)) {
        const flowKey = `${screen}→${nextScreen}`
        flows[flowKey] = count
      }
    }

    return Object.entries(flows)
      .map(([path, count]) => ({ path: path.split('→'), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  /**
   * Format duration (ms to human readable)
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`

    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }
}
