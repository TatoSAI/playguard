import { useState, useEffect, useRef } from 'react'
import { Zap, Play, Square, Clock, Lightbulb, AlertCircle, CheckCircle2, Camera, FileText, Sparkles, Smartphone, Globe } from 'lucide-react'
import { Button } from '../ui/button'
import { useToast } from '../Common/ToastProvider'

interface AdHocEvent {
  id: string
  timestamp: number
  type: 'screen_change' | 'manual_capture' | 'issue_marked' | 'success_marked' | 'session_start' | 'session_stop' | 'tap' | 'swipe' | 'double_tap' | 'navigate'
  screenHash: string
  screenName?: string
  duration?: number
  screenshot?: string
  description?: string
  metadata?: Record<string, any>
  // SDK enrichment
  elementName?: string
  elementPath?: string
  elementType?: string
  gameState?: Record<string, string | null>
  // Touch event data
  x?: number
  y?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

interface AdHocSession {
  id: string
  startTime: number
  endTime?: number
  deviceId: string
  deviceModel?: string
  events: AdHocEvent[]
  totalScreens: number
  totalCaptures: number
  totalIssues: number
  duration?: number
}

interface AIInsight {
  id: string
  type: 'suggestion' | 'warning' | 'success' | 'info'
  message: string
  timestamp: number
  confidence?: number
}

export default function AdHocTesting(): JSX.Element {
  const [isActive, setIsActive] = useState(false)
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null)
  const [availableDevices, setAvailableDevices] = useState<any[]>([])
  const [gameLinks, setGameLinks] = useState<any[]>([])
  const [selectedGameLinkId, setSelectedGameLinkId] = useState<string>('')
  const [webEnvironment, setWebEnvironment] = useState<'Development' | 'Staging' | 'Production'>('Development')
  const [currentSession, setCurrentSession] = useState<AdHocSession | null>(null)
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([])
  const [showIssueDialog, setShowIssueDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showCaptureDialog, setShowCaptureDialog] = useState(false)
  const [dialogInput, setDialogInput] = useState('')
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null)

  const toastContext = useToast()
  const toast = toastContext || {
    success: (msg: string, title?: string) => console.log('[Toast Success]', title, msg),
    error: (msg: string, title?: string) => console.error('[Toast Error]', title, msg),
    warning: (msg: string, title?: string) => console.warn('[Toast Warning]', title, msg),
    info: (msg: string, title?: string) => console.info('[Toast Info]', title, msg)
  }

  useEffect(() => {
    loadConnectedDevice()
    window.api.gameLink.getAll().catch(() => []).then((links: any[]) => {
      setGameLinks(links)
      if (links.length > 0) setSelectedGameLinkId(links[0].id)
    })
  }, [])

  // Update timer every second when session is active
  useEffect(() => {
    if (isActive) {
      const timer = setInterval(() => {
        setCurrentTime(Date.now())
      }, 1000)
      return () => clearInterval(timer)
    }
    return undefined
  }, [isActive])

  // Poll for session updates every 2 seconds
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(async () => {
        await refreshSession()
      }, 2000)
      return () => clearInterval(interval)
    }
    return undefined
  }, [isActive])

  // Update screenshot preview every 3 seconds — Android only (browser devices use inline webview)
  useEffect(() => {
    const isBrowser = connectedDevice?.startsWith('browser_')
    if (isActive && connectedDevice && !isBrowser) {
      const updateScreenshot = async () => {
        try {
          const screenshot = await window.api.adb.captureScreenshot(connectedDevice)
          console.log('[AdHocTesting] Screenshot received, length:', screenshot?.length || 0)
          setCurrentScreenshot(screenshot)
        } catch (error) {
          console.error('[AdHocTesting] Failed to update screenshot:', error)
        }
      }

      updateScreenshot()
      const interval = setInterval(updateScreenshot, 3000)
      return () => clearInterval(interval)
    } else {
      setCurrentScreenshot(null)
      return undefined
    }
  }, [isActive, connectedDevice])

  const loadConnectedDevice = async () => {
    const BROWSER_LABELS: Record<string, string> = {
      chromium: 'Chromium (Built-in)',
      chrome: 'Google Chrome',
      edge: 'Microsoft Edge',
      firefox: 'Mozilla Firefox'
    }
    try {
      const [adbList, detectedTypes] = await Promise.all([
        window.api.adb.getDevices().catch(() => []),
        window.api.browserDevice.detectBrowsers().catch(() => [] as string[])
      ])
      const allBrowserTypes = ['chromium', ...(detectedTypes as string[]).filter((t) => t !== 'chromium')]
      const browserDevices = allBrowserTypes.map((t) => ({
        id: `browser_${t}`,
        model: BROWSER_LABELS[t] ?? t,
        type: 'browser'
      }))
      const combined = [...adbList, ...browserDevices]
      setAvailableDevices(combined)
      if (combined.length > 0 && !connectedDevice) {
        setConnectedDevice(combined[0].id)
      }
    } catch (error) {
      console.error('Failed to load device:', error)
    }
  }

  const refreshSession = async () => {
    try {
      const response = await window.api.adhoc.getCurrentSession()
      if (response.success && response.session) {
        setCurrentSession(response.session)
      }
    } catch (error) {
      console.error('Failed to refresh session:', error)
    }
  }

  const startSession = async () => {
    if (!connectedDevice) {
      toast.error('Please connect a device first', 'No device connected')
      return
    }

    try {
      const response = await window.api.adhoc.startSession(connectedDevice)
      if (response.success && response.session) {
        setCurrentSession(response.session)
        setIsActive(true)
        setAIInsights([])

        toast.success('Ad-hoc testing session is now active', 'Session started')

        // Generate initial insights after 5 seconds
        setTimeout(generateInsights, 5000)
      } else {
        toast.error(response.error || 'Unknown error', 'Failed to start session')
      }
    } catch (error) {
      console.error('Failed to start session:', error)
      toast.error('Failed to start ad-hoc session', 'Error')
    }
  }

  const stopSession = async () => {
    try {
      const response = await window.api.adhoc.stopSession()
      if (response.success && response.session) {
        setCurrentSession(response.session)
        setIsActive(false)

        toast.success(`Duration: ${formatDuration(response.session.duration)}`, 'Session completed')

        // Generate final insights
        await generateInsights()
      } else {
        toast.error(response.error || 'Unknown error', 'Failed to stop session')
      }
    } catch (error) {
      console.error('Failed to stop session:', error)
      toast.error('Failed to stop ad-hoc session', 'Error')
    }
  }

  const captureScreenshot = async (description?: string) => {
    try {
      const response = await window.api.adhoc.captureScreenshot(description)
      if (response.success) {
        await refreshSession()
        toast.success(description || 'Manual screenshot saved', 'Screenshot captured')
      } else {
        toast.error(response.error || 'Unknown error', 'Failed to capture')
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      toast.error('Failed to capture screenshot', 'Error')
    }
  }

  const markIssue = async (description: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
    try {
      const response = await window.api.adhoc.markIssue(description, severity)
      if (response.success) {
        await refreshSession()
        toast.success(description, 'Issue marked')
        setShowIssueDialog(false)
        setDialogInput('')
      } else {
        toast.error(response.error || 'Unknown error', 'Failed to mark issue')
      }
    } catch (error) {
      console.error('Failed to mark issue:', error)
      toast.error('Failed to mark issue', 'Error')
    }
  }

  const markSuccess = async (description: string) => {
    try {
      const response = await window.api.adhoc.markSuccess(description)
      if (response.success) {
        await refreshSession()
        toast.success(description, 'Success marked')
        setShowSuccessDialog(false)
        setDialogInput('')
      } else {
        toast.error(response.error || 'Unknown error', 'Failed to mark success')
      }
    } catch (error) {
      console.error('Failed to mark success:', error)
      toast.error('Failed to mark success', 'Error')
    }
  }

  const generateInsights = async () => {
    try {
      const response = await window.api.adhoc.generateInsights()
      if (response.success && response.insights) {
        setAIInsights(response.insights)
      }
    } catch (error) {
      console.error('Failed to generate insights:', error)
    }
  }

  const saveSessionLog = async () => {
    toast.success('Session log has been saved', 'Session saved')
  }

  const getSessionDuration = (): string => {
    if (!currentSession) return '0s'
    const duration = currentTime - currentSession.startTime
    return formatDuration(duration)
  }

  const resolvedWebUrl = (): string => {
    const gl = gameLinks.find((g) => g.id === selectedGameLinkId)
    if (!gl) return ''
    return webEnvironment === 'Development' ? gl.devUrl
      : webEnvironment === 'Staging' ? gl.stagingUrl
      : gl.productionUrl
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'suggestion': return <Lightbulb className="w-4 h-4 text-yellow-500" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-orange-500" />
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'info': return <Sparkles className="w-4 h-4 text-blue-500" />
      default: return <Lightbulb className="w-4 h-4" />
    }
  }

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Configuration or Session Controls */}
      {!isActive && (
        <div className="w-96 border-r border-border bg-card p-6 space-y-6 overflow-auto">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">New Ad-Hoc Session</h2>
            <p className="text-sm text-muted-foreground">
              Start exploratory testing with AI-powered insights
            </p>
          </div>

          {/* Device Selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Device
            </label>
            {availableDevices.length > 0 ? (
              <select
                value={connectedDevice || ''}
                onChange={(e) => setConnectedDevice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
              >
                {availableDevices.filter(d => !d.id.startsWith('browser_')).length > 0 && (
                  <optgroup label="Android Devices">
                    {availableDevices.filter(d => !d.id.startsWith('browser_')).map(d => (
                      <option key={d.id} value={d.id}>{d.model} ({d.id})</option>
                    ))}
                  </optgroup>
                )}
                {availableDevices.filter(d => d.id.startsWith('browser_')).length > 0 && (
                  <optgroup label="Web Browsers">
                    {availableDevices.filter(d => d.id.startsWith('browser_')).map(d => (
                      <option key={d.id} value={d.id}>{d.model}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            ) : (
              <div className="p-4 rounded-lg bg-muted border border-border">
                <p className="text-sm text-muted-foreground">
                  No devices found. Connect an Android device via ADB or use a web browser.
                </p>
              </div>
            )}
          </div>

          {/* Game Link + Environment (web only) */}
          {connectedDevice?.startsWith('browser_') && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Game
                </label>
                {gameLinks.length > 0 ? (
                  <select
                    value={selectedGameLinkId}
                    onChange={(e) => setSelectedGameLinkId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
                  >
                    {gameLinks.map((gl) => (
                      <option key={gl.id} value={gl.id}>{gl.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-lg bg-muted border border-border text-xs text-muted-foreground">
                    No game links configured. Add one in the Devices tab.
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Environment
                </label>
                <div className="flex gap-2">
                  {(['Development', 'Staging', 'Production'] as const).map((env) => (
                    <button
                      key={env}
                      onClick={() => setWebEnvironment(env)}
                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                        webEnvironment === env
                          ? env === 'Development' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                            : env === 'Staging' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                            : 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-background border-border text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {env === 'Development' ? 'Dev' : env === 'Production' ? 'Prod' : env}
                    </button>
                  ))}
                </div>
                {resolvedWebUrl() && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono truncate" title={resolvedWebUrl()}>
                    {resolvedWebUrl()}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Start Button */}
          <button
            onClick={startSession}
            disabled={!connectedDevice || (connectedDevice.startsWith('browser_') && (!selectedGameLinkId || !resolvedWebUrl()))}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Ad-Hoc Session
          </button>
        </div>
      )}

      {/* Left Sidebar - Session Controls & Event Log */}
      {isActive && (
        <div className="w-96 border-r border-border bg-card flex flex-col">
          {/* Session Controls Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="font-semibold text-foreground">Active Session</span>
              </div>
              <span className="text-sm text-muted-foreground font-mono">
                {getSessionDuration()}
              </span>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={stopSession}
                title="Stop Session"
                className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
              >
                <Square className="w-5 h-5" />
              </button>
              <button
                onClick={saveSessionLog}
                title="Save Session Log"
                className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <FileText className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-500">{currentSession?.totalScreens || 0}</div>
                <div className="text-[10px] text-muted-foreground">Screens</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-500">{currentSession?.totalCaptures || 0}</div>
                <div className="text-[10px] text-muted-foreground">Captures</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-500">{currentSession?.totalIssues || 0}</div>
                <div className="text-[10px] text-muted-foreground">Issues</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-500">{currentSession?.events.length || 0}</div>
                <div className="text-[10px] text-muted-foreground">Events</div>
              </div>
            </div>
          </div>

          {/* Event Log - Similar to Action Steps */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Event Log</span>
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {currentSession?.events.length || 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Captured events during this session
              </p>
            </div>

            {!currentSession || currentSession.events.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No events yet</p>
                <p className="text-xs text-muted-foreground">
                  Events will appear here as you explore
                </p>
              </div>
            ) : (
              currentSession.events.slice().reverse().map((event, index) => (
                <EventItem key={event.id} event={event} index={currentSession.events.length - index - 1} />
              ))
            )}
          </div>
        </div>
      )}

      {/* Center Area - Device Preview */}
      <div className={`flex-1 flex bg-muted/20 ${isActive && connectedDevice?.startsWith('browser_') ? 'overflow-hidden' : 'items-center justify-center p-8'}`}>
        {isActive ? (
          connectedDevice?.startsWith('browser_') ? (
            /* Web session — embedded webview fills the center */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, width: '100%' }}>
              {/* env badge */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate">{resolvedWebUrl()}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded font-medium ${
                  webEnvironment === 'Development' ? 'bg-yellow-500/20 text-yellow-400'
                  : webEnvironment === 'Staging' ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-green-500/20 text-green-400'
                }`}>
                  {webEnvironment === 'Development' ? 'Dev' : webEnvironment === 'Production' ? 'Prod' : webEnvironment}
                </span>
              </div>
              <AdHocWebviewPanel url={resolvedWebUrl()} isActive={isActive} />
            </div>
          ) : (
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Device Preview</h3>
              <span className="text-xs px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="relative aspect-[9/16] bg-card rounded-lg border-2 border-border flex items-center justify-center shadow-xl overflow-hidden">
              {currentScreenshot ? (
                <img
                  src={currentScreenshot}
                  alt="Device screen"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-8">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                    <Smartphone className="w-6 h-6 text-muted-foreground animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Loading screen</p>
                  <p className="text-xs text-muted-foreground">
                    Please wait...
                  </p>
                </div>
              )}
            </div>
          </div>
          )
        ) : (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Explore</h3>
            <p className="text-sm text-muted-foreground">
              Configure your session and start testing to monitor device interactions and capture insights
            </p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Quick Actions & AI Insights */}
      {isActive && (
        <div className="w-80 border-l border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" />
              Quick Actions
            </h3>
            <p className="text-xs text-muted-foreground">
              Capture moments and insights
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => setShowCaptureDialog(true)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left"
              >
                <Camera className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Capture Screenshot</div>
                  <div className="text-xs text-muted-foreground">Save current screen</div>
                </div>
              </button>
              <button
                onClick={() => setShowIssueDialog(true)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left"
              >
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Mark Issue</div>
                  <div className="text-xs text-muted-foreground">Report a problem</div>
                </div>
              </button>
              <button
                onClick={() => setShowSuccessDialog(true)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left"
              >
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Mark Success</div>
                  <div className="text-xs text-muted-foreground">Note success point</div>
                </div>
              </button>
              <button
                onClick={generateInsights}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left"
              >
                <Sparkles className="w-5 h-5 text-blue-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Generate Insights</div>
                  <div className="text-xs text-muted-foreground">AI analysis</div>
                </div>
              </button>
            </div>

            {/* AI Insights Section */}
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                AI Insights
              </h4>
              <div className="space-y-2">
                {aiInsights.length === 0 ? (
                  <div className="text-center py-6">
                    <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-30 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Click "Generate Insights" for AI analysis
                    </p>
                  </div>
                ) : (
                  aiInsights.map(insight => (
                    <div
                      key={insight.id}
                      className="p-3 rounded-lg border border-border bg-card/50 text-sm"
                    >
                      <div className="flex items-start gap-2">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <p className="text-foreground text-xs">{insight.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(insight.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {showCaptureDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Capture Screenshot</h3>
            <input
              type="text"
              placeholder="Optional description..."
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md mb-4"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  captureScreenshot(dialogInput || undefined)
                  setShowCaptureDialog(false)
                  setDialogInput('')
                }}
                className="flex-1"
              >
                Capture
              </Button>
              <Button
                onClick={() => {
                  setShowCaptureDialog(false)
                  setDialogInput('')
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {showIssueDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Mark Issue</h3>
            <input
              type="text"
              placeholder="Describe the issue..."
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md mb-4"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => markIssue(dialogInput, 'medium')}
                disabled={!dialogInput}
                className="flex-1"
                variant="destructive"
              >
                Mark Issue
              </Button>
              <Button
                onClick={() => {
                  setShowIssueDialog(false)
                  setDialogInput('')
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Mark Success</h3>
            <input
              type="text"
              placeholder="Describe the success point..."
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md mb-4"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => markSuccess(dialogInput)}
                disabled={!dialogInput}
                className="flex-1"
              >
                Mark Success
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessDialog(false)
                  setDialogInput('')
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AdHocWebviewPanel ───────────────────────────────────────────────────────
// Separate component so useEffect([]) runs on mount — webviewRef is always set.
function AdHocWebviewPanel({ url, isActive }: { url: string; isActive: boolean }): JSX.Element {
  const webviewRef = useRef<any>(null)
  const attachedWcIdRef = useRef<number | null>(null)

  // Attach browser capture & navigation listeners once on mount
  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return

    const onDomReady = async () => {
      const wcId: number = wv.getWebContentsId()
      if (wcId > 0 && wcId !== attachedWcIdRef.current) {
        attachedWcIdRef.current = wcId
        await window.api.recorder.attachBrowserCapture(wcId).catch(() => {})
      }
    }

    const onNavigate = (e: any) => {
      const navUrl: string = e.url || ''
      if (!navUrl || navUrl === 'about:blank') return
      window.api.adhoc.addEvent({
        type: 'navigate',
        screenHash: `url_${navUrl}`,
        screenName: navUrl.replace(/^https?:\/\//, '').split('?')[0].slice(0, 60),
        description: `Navigated to ${navUrl}`
      }).catch(() => {})
    }

    const onNewWindow = (e: any) => { try { wv.loadURL(e.url) } catch {} }

    wv.addEventListener('dom-ready', onDomReady)
    wv.addEventListener('did-navigate', onNavigate)
    wv.addEventListener('did-navigate-in-page', onNavigate)
    wv.addEventListener('new-window', onNewWindow)

    return () => {
      wv.removeEventListener('dom-ready', onDomReady)
      wv.removeEventListener('did-navigate', onNavigate)
      wv.removeEventListener('did-navigate-in-page', onNavigate)
      wv.removeEventListener('new-window', onNewWindow)
      if (attachedWcIdRef.current) {
        window.api.recorder.detachBrowserCapture(attachedWcIdRef.current).catch(() => {})
        attachedWcIdRef.current = null
      }
    }
  }, [])

  // Poll __pgQueue every 150ms while session is active — same pattern as TestRecorder
  useEffect(() => {
    if (!isActive) return
    const poll = setInterval(async () => {
      const wv = webviewRef.current
      if (!wv) return
      try {
        const items: any[] = await wv.executeJavaScript(
          'var q = window.__pgQueue || []; window.__pgQueue = []; q'
        )
        for (const item of items) {
          if (item.__pg === 'tap') {
            window.api.adhoc.addEvent({
              type: 'tap',
              description: `Click at (${Math.round(item.x)}, ${Math.round(item.y)})`,
              x: item.x,
              y: item.y
            }).catch(() => {})
          }
        }
      } catch { /* webview may not be ready */ }
    }, 150)
    return () => clearInterval(poll)
  }, [isActive])

  return (
    <webview
      ref={webviewRef}
      src={url}
      partition="persist:games"
      allowpopups={"true" as any}
      style={{ flex: 1, width: '100%', minHeight: 0 }}
    />
  )
}

interface EventItemProps {
  event: AdHocEvent
  index: number
}

function EventItem({ event, index }: EventItemProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{getEventIcon(event.type)}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
            <span className="text-sm font-medium text-foreground truncate capitalize">
              {event.type.replace('_', ' ')}
            </span>
            {event.type === 'issue_marked' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20">
                ISSUE
              </span>
            )}
            {event.type === 'success_marked' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                SUCCESS
              </span>
            )}
            {event.elementName && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                SDK
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Clock className="w-3 h-3" />
            <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
            {event.duration && (
              <>
                <span>•</span>
                <span>{formatDuration(event.duration)}</span>
              </>
            )}
          </div>
          {event.description && (
            <p className="text-xs text-muted-foreground">{event.description}</p>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {/* SDK Element */}
          {(event.elementName || event.elementPath) && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Element</p>
              <div className="flex items-center gap-2">
                {event.elementType && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {event.elementType}
                  </span>
                )}
                <span className="text-xs font-mono text-foreground">{event.elementName || event.elementPath}</span>
              </div>
              {event.elementPath && event.elementName && (
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">{event.elementPath}</p>
              )}
            </div>
          )}

          {/* Game State */}
          {event.gameState && Object.keys(event.gameState).length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Game State</p>
              <div className="space-y-0.5">
                {Object.entries(event.gameState).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground">{key}</span>
                    <span className="font-mono text-foreground ml-2 max-w-[140px] truncate">{value ?? 'null'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw metadata */}
          {event.metadata && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Metadata</p>
              <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">{JSON.stringify(event.metadata, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getEventIcon(type: string): string {
  switch (type) {
    case 'screen_change': return '🔄'
    case 'manual_capture': return '📸'
    case 'issue_marked': return '⚠️'
    case 'success_marked': return '✅'
    case 'session_start': return '▶️'
    case 'session_stop': return '⏹️'
    case 'tap': return '👆'
    case 'double_tap': return '👆👆'
    case 'swipe': return '👉'
    case 'navigate': return '🌐'
    default: return '•'
  }
}

function formatDuration(ms?: number): string {
  if (!ms || ms < 1000) return `${ms || 0}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`

  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}
