import { useState, useEffect, useRef } from 'react'
import {
  Circle,
  Square,
  Play,
  Pause,
  Save,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Clock,
  Smartphone,
  ChevronDown,
  Settings,
  Camera,
  MousePointer,
  Image,
  Maximize2,
  X,
  Download
} from 'lucide-react'
import DeviceActionsPanel from './DeviceActionsPanel'
import CustomPropertyViewer from '../CustomPropertyViewer'
import { TestMetadataForm } from '../CreateTestCase/TestMetadataForm'
import { useToast } from '../Common/ToastProvider'

interface RecordedAction {
  id: string
  type: string
  description: string
  timestamp: number
  target?: any
  value?: any
  options?: any
  elementPath?: string
  elementName?: string
  elementType?: string
  screenshot?: string // Base64 screenshot
}

interface RecordingSession {
  isRecording: boolean
  isPaused: boolean
  startTime: number
  actions: RecordedAction[]
  deviceId: string
  mode?: 'coordinate' | 'element'
  sdkConnected?: boolean
}

export default function TestRecorder(): JSX.Element {
  const [session, setSession] = useState<RecordingSession | null>(null)
  const [devices, setDevices] = useState<any[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [testName, setTestName] = useState('')
  const [testDescription, setTestDescription] = useState('')
  const [testTags, setTestTags] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [selectedAction, setSelectedAction] = useState<RecordedAction | null>(null)
  const [tapCoords, setTapCoords] = useState<{ x: number; y: number } | null>(null)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [isViewingPreviousCapture, setIsViewingPreviousCapture] = useState(false)
  const [liveScreenshot, setLiveScreenshot] = useState<string | null>(null) // Store live screenshot separately
  const imageRef = useRef<HTMLImageElement>(null)
  const toast = useToast()

  // Suite selection
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('')

  useEffect(() => {
    loadDevices()
  }, [])

  // No continuous polling - update only when actions are captured
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (session?.isRecording && !session.isPaused) {
      // Poll every 1 second just to check for new actions, not for streaming
      interval = setInterval(async () => {
        await updateRecordingState()
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [session?.isRecording, session?.isPaused])

  const loadDevices = async (): Promise<void> => {
    try {
      const deviceList = await window.api.adb.getDevices()
      setDevices(deviceList)
      if (deviceList.length > 0 && !selectedDevice) {
        setSelectedDevice(deviceList[0].id)
      }
    } catch (error) {
      console.error('Failed to load devices:', error)
    }
  }

  const updateRecordingState = async (): Promise<void> => {
    try {
      const result = await window.api.test.getRecordingState()

      console.log('[UI] Recording state result:', {
        success: result.success,
        hasSession: !!result.session,
        actionsCount: result.session?.actions?.length || 0
      })

      if (result.success && result.session) {
        // Update session with backend state
        const backendSession = result.session

        console.log('[UI] Backend session:', {
          actionsCount: backendSession.actions.length,
          deviceId: backendSession.deviceId
        })

        // Convert actions from backend format to UI format
        const uiActions: RecordedAction[] = backendSession.actions.map((action: any, index: number) => {
          const hasScreenshot = !!action.screenshot
          console.log(`[UI] Action ${index}:`, {
            type: action.type,
            hasScreenshot,
            screenshotLength: action.screenshot?.length || 0,
            data: action.data,
            elementPath: action.elementPath,
            elementName: action.elementName
          })

          // Build description based on element or coordinates
          let description = ''
          if (action.type === 'tap') {
            if (action.elementPath) {
              description = `Tap element: ${action.elementName || action.elementPath}`
            } else {
              description = `Tap at (${action.data.x}, ${action.data.y})`
            }
          } else if (action.type === 'swipe') {
            description = `Swipe from (${action.data.x1}, ${action.data.y1}) to (${action.data.x2}, ${action.data.y2})`
          } else if (action.type === 'screenshot') {
            description = action.data.description || 'Screenshot'
          } else {
            description = action.type
          }

          return {
            id: `action_${index}`,
            type: action.type,
            description,
            timestamp: action.timestamp,
            target: action.data,
            value: action.data,
            elementPath: action.elementPath,
            elementName: action.elementName,
            elementType: action.elementType,
            screenshot: action.screenshot // Include screenshot from backend
          }
        })

        // Use live screenshot for device preview (not saved as action)
        if (result.liveScreenshot) {
          const base64Screenshot = `data:image/png;base64,${result.liveScreenshot}`
          console.log('[UI] Setting live screenshot, base64 length:', base64Screenshot.length)
          setLiveScreenshot(base64Screenshot)

          // Only update screenshot if not viewing a previous capture
          if (!isViewingPreviousCapture) {
            setScreenshot(base64Screenshot)
          }
        }

        // Update session with actions from backend
        if (session) {
          setSession({
            ...session,
            actions: uiActions,
            mode: backendSession.mode || 'coordinate',
            sdkConnected: backendSession.sdkConnected || false
          })
        }
      } else {
        console.log('[UI] No session or failed:', result)
      }
    } catch (error) {
      console.error('[UI] Failed to get recording state:', error)
    }
  }

  const captureScreenshot = async (): Promise<void> => {
    // Screenshot capture is handled automatically by the backend
    // This function just triggers an update of the state
    await updateRecordingState()
  }

  const startRecording = async (): Promise<void> => {
    if (!selectedDevice) {
      toast.warning('Please select a device first')
      return
    }

    if (!testName.trim()) {
      toast.warning('Please enter a test name')
      return
    }

    if (!selectedSuiteId) {
      toast.warning('Please select a target suite')
      return
    }

    try {
      const result = await window.api.test.startRecording(selectedDevice)

      if (result.success) {
        setSession({
          isRecording: true,
          isPaused: false,
          startTime: Date.now(),
          actions: [],
          deviceId: selectedDevice
        })

        console.log('Recording started')

        // Wait a moment for backend to capture initial screenshot
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Fetch initial state
        await updateRecordingState()
      }
    } catch (error) {
      console.error('Failed to start recording:', error)
      toast.error('Failed to start recording')
    }
  }

  const stopRecording = async (): Promise<void> => {
    if (!session) return

    try {
      const result = await window.api.test.stopRecording()

      if (result.success) {
        setSession({
          ...session,
          isRecording: false
        })

        console.log('Recording stopped. Session:', result.session)
      }
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }

  const pauseRecording = (): void => {
    if (session) {
      setSession({
        ...session,
        isPaused: true
      })
    }
  }

  const resumeRecording = (): void => {
    if (session) {
      setSession({
        ...session,
        isPaused: false
      })
    }
  }

  const viewPreviousCapture = (action: RecordedAction): void => {
    if (!session || !session.isRecording) return

    // Pause recording automatically
    if (!session.isPaused) {
      setSession({
        ...session,
        isPaused: true
      })
    }

    // Show the action's screenshot
    setIsViewingPreviousCapture(true)
    setSelectedAction(action)

    if (action.screenshot) {
      setScreenshot(`data:image/png;base64,${action.screenshot}`)
    }
  }

  const closePreviousCapture = async (): Promise<void> => {
    if (!session) return

    // Close modal
    setSelectedAction(null)
    setIsViewingPreviousCapture(false)

    // Resume recording first
    if (session.isPaused && session.isRecording) {
      setSession({
        ...session,
        isPaused: false
      })
    }

    // Update to get the latest screenshot from the device
    await updateRecordingState()
  }

  const downloadScreenshotWithIndicator = async (action: RecordedAction): Promise<void> => {
    if (!action.screenshot) return

    // Create a canvas to draw the screenshot with indicator
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Create image from base64
    const img = new Image()
    img.src = `data:image/png;base64,${action.screenshot}`

    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width
      canvas.height = img.height

      // Draw the screenshot
      ctx.drawImage(img, 0, 0)

      // Draw indicator based on action type
      if (action.type === 'tap' && action.target && typeof action.target.x === 'number' && typeof action.target.y === 'number') {
        const x = action.target.x
        const y = action.target.y

        // Check if it's a double tap (for now, simple tap indicator)
        // Outer circle
        ctx.beginPath()
        ctx.arc(x, y, 40, 0, 2 * Math.PI)
        ctx.strokeStyle = '#ef4444' // Red color
        ctx.lineWidth = 6
        ctx.stroke()

        // Inner circle (filled)
        ctx.beginPath()
        ctx.arc(x, y, 35, 0, 2 * Math.PI)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)' // Semi-transparent red
        ctx.fill()

        // Tap icon (finger emoji as text)
        ctx.font = 'bold 40px Arial'
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('👆', x, y)
      } else if (action.type === 'swipe' && action.target) {
        // Draw swipe indicator with three circles showing movement
        const x1 = action.target.x1
        const y1 = action.target.y1
        const x2 = action.target.x2
        const y2 = action.target.y2

        if (typeof x1 === 'number' && typeof y1 === 'number' && typeof x2 === 'number' && typeof y2 === 'number') {
          // Calculate direction
          const dx = x2 - x1
          const dy = y2 - y1
          const distance = Math.sqrt(dx * dx + dy * dy)
          const steps = 3

          // Draw three circles along the swipe path
          for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1) // 0, 0.5, 1
            const x = x1 + dx * t
            const y = y1 + dy * t
            const alpha = 0.3 + (i * 0.35) // Increasing opacity
            const radius = 30 + (i * 5) // Increasing size

            // Circle
            ctx.beginPath()
            ctx.arc(x, y, radius, 0, 2 * Math.PI)
            ctx.strokeStyle = `rgba(239, 68, 68, ${alpha + 0.5})`
            ctx.lineWidth = 4
            ctx.stroke()

            // Fill
            ctx.beginPath()
            ctx.arc(x, y, radius - 2, 0, 2 * Math.PI)
            ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`
            ctx.fill()
          }

          // Draw arrow at the end
          const angle = Math.atan2(dy, dx)
          const arrowLength = 30

          ctx.beginPath()
          ctx.moveTo(x2, y2)
          ctx.lineTo(
            x2 - arrowLength * Math.cos(angle - Math.PI / 6),
            y2 - arrowLength * Math.sin(angle - Math.PI / 6)
          )
          ctx.moveTo(x2, y2)
          ctx.lineTo(
            x2 - arrowLength * Math.cos(angle + Math.PI / 6),
            y2 - arrowLength * Math.sin(angle + Math.PI / 6)
          )
          ctx.strokeStyle = '#ef4444'
          ctx.lineWidth = 6
          ctx.stroke()
        }
      }

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `action_${action.type}_${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
  }

  const handleScreenshotClick = async (e: React.MouseEvent<HTMLImageElement>): Promise<void> => {
    // Don't allow interaction when viewing previous capture
    if (!session || !session.isRecording || session.isPaused || isViewingPreviousCapture || !imageRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1080) // Assuming 1080 width
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 2400) // Assuming 2400 height

    setTapCoords({ x, y })

    try {
      // Send tap to device and capture in recording
      await window.api.test.captureAction('tap', { x, y })

      // Visual feedback
      setTimeout(() => setTapCoords(null), 500)

      // Wait a bit for backend to process the action
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Update state from backend
      await updateRecordingState()
    } catch (error) {
      console.error('Failed to send tap:', error)
    }
  }

  const sendManualTap = async (x: number, y: number): Promise<void> => {
    if (!session) return

    try {
      await window.api.test.captureAction('tap', { x, y })

      // Wait a bit for backend to process the action
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Update state from backend
      await updateRecordingState()
    } catch (error) {
      console.error('Failed to send tap:', error)
    }
  }

  const addManualAction = (type: string): void => {
    if (!session) return

    const action: RecordedAction = {
      id: `action_${Date.now()}`,
      type,
      description: `${type} action`,
      timestamp: Date.now() - session.startTime
    }

    setSession({
      ...session,
      actions: [...session.actions, action]
    })
  }

  const addDeviceAction = async (action: { type: string; description: string; data?: any }): Promise<void> => {
    if (!session || !session.isRecording) {
      toast.warning('Please start recording first')
      return
    }

    try {
      // Execute device action on device
      const result = await window.api.test.captureAction(action.type, action.data)

      if (result.success) {
        toast.success(`Added: ${action.description}`)

        // Wait a bit for backend to process
        await new Promise(resolve => setTimeout(resolve, 500))

        // Update state to reflect new action
        await updateRecordingState()
      } else {
        toast.error(`Failed to add device action: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to add device action:', error)
      toast.error('Failed to add device action')
    }
  }

  const removeAction = (actionId: string): void => {
    if (!session) return

    setSession({
      ...session,
      actions: session.actions.filter((a) => a.id !== actionId)
    })
  }

  const saveTest = async (): Promise<void> => {
    if (!session || !selectedSuiteId) return

    const testId = `test_${Date.now()}`

    try {
      // First, save all screenshots as files and get their paths
      const stepsWithPaths = await Promise.all(
        session.actions.map(async (action, index) => {
          const stepId = `step_${index + 1}`
          let screenshotPath: string | undefined

          // Save screenshot as file if present
          if (action.screenshot) {
            try {
              const result = await window.api.screenshot.save(
                selectedSuiteId,
                testId,
                stepId,
                action.screenshot
              )
              if (result.success) {
                screenshotPath = result.path
                console.log(`[TestRecorder] Saved screenshot: ${screenshotPath}`)
              }
            } catch (error) {
              console.error('[TestRecorder] Failed to save screenshot:', error)
              // Continue without screenshot path
            }
          }

          return {
            id: stepId,
            type: action.type,
            description: action.description,
            target: action.target,
            value: action.value,
            options: action.options || {},
            // Use screenshotPath instead of base64
            screenshotPath,
            // Keep base64 as fallback for now (will be removed in future)
            screenshot: undefined, // Don't save base64 anymore
            elementPath: action.elementPath,
            elementName: action.elementName,
            elementType: action.elementType
          }
        })
      )

      const testCase = {
        id: testId,
        name: testName,
        description: testDescription,
        version: '1.0',
        tags: testTags,
        recordingMode: session.mode || 'coordinate',
        sdkVersion: session.sdkConnected ? 'unknown' : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: stepsWithPaths
      }

      const result = await window.api.file.saveTest(testCase)
      if (result.success) {
        toast.success('Test saved successfully!', 'Recording Saved')
        // Reset
        setSession(null)
        setTestName('')
        setTestDescription('')
        setTestTags([])
        setScreenshot(null)
        setSelectedAction(null)
      } else {
        toast.error('Failed to save test: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to save test:', error)
      toast.error('Failed to save test')
    }
  }

  const discardTest = (): void => {
    setShowDiscardModal(false)
    setSession(null)
    setTestName('')
    setTestDescription('')
    setTestTags([])
    setScreenshot(null)
    setSelectedAction(null)
  }

  const elapsed = session ? Date.now() - session.startTime : 0

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Configuration or Recording Controls */}
      {!session && (
        <div className="w-96 border-r border-border bg-card p-6 space-y-6 overflow-auto">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">New Test Recording</h2>
            <p className="text-sm text-muted-foreground">
              Configure your test and start recording interactions
            </p>
          </div>

          {/* Test Metadata Form */}
          <TestMetadataForm
            testName={testName}
            testDescription={testDescription}
            testTags={testTags}
            selectedSuiteId={selectedSuiteId}
            onTestNameChange={setTestName}
            onTestDescriptionChange={setTestDescription}
            onTestTagsChange={setTestTags}
            onSelectedSuiteIdChange={setSelectedSuiteId}
            showAIAssist={false}
          />

          {/* Target Device */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Target Device <span className="text-destructive">*</span>
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {devices.length === 0 ? (
                <option value="">No devices connected</option>
              ) : (
                <>
                  <option value="">Select a device...</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.model} ({device.id})
                    </option>
                  ))}
                </>
              )}
            </select>
            {devices.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No devices found. Connect a device via ADB.
              </p>
            )}
          </div>

          {/* Start Button */}
          <button
            onClick={startRecording}
            disabled={!testName || !selectedDevice || !selectedSuiteId || devices.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Circle className="w-5 h-5 fill-current" />
            Start Recording
          </button>
        </div>
      )}

      {/* Left Sidebar - Recording Controls & Action Steps */}
      {session && (
        <div className="w-96 border-r border-border bg-card flex flex-col">
          {/* Recording Controls Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {session.isRecording && !session.isPaused && (
                  <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
                )}
                <span className="font-semibold text-foreground">
                  {session.isRecording && !session.isPaused
                    ? 'Recording...'
                    : session.isPaused
                      ? 'Paused'
                      : 'Stopped'}
                </span>
              </div>
              <span className="text-sm text-muted-foreground font-mono">
                {formatDuration(elapsed)}
              </span>
            </div>

            {/* SDK Status Indicator */}
            <div className="mb-3">
              <div
                title={
                  session.sdkConnected
                    ? 'Element Mode: SDK Connected - Recording element-based actions'
                    : 'Coordinate Mode: SDK Not Detected - Recording coordinate-based actions'
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-help ${
                  session.sdkConnected
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                    : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    session.sdkConnected ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                />
                {session.sdkConnected ? <span>SDK</span> : <span>ADB</span>}
              </div>
            </div>

            <div className="flex gap-2">
              {session.isRecording && !session.isPaused && (
                <>
                  <button
                    onClick={pauseRecording}
                    title="Pause Recording"
                    className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors"
                  >
                    <Pause className="w-5 h-5" />
                  </button>
                  <button
                    onClick={stopRecording}
                    title="Stop Recording"
                    className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                  >
                    <Square className="w-5 h-5" />
                  </button>
                </>
              )}

              {session.isPaused && (
                <>
                  <button
                    onClick={resumeRecording}
                    title="Resume Recording"
                    className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                  <button
                    onClick={stopRecording}
                    title="Stop Recording"
                    className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                  >
                    <Square className="w-5 h-5" />
                  </button>
                </>
              )}

              {!session.isRecording && (
                <>
                  <button
                    onClick={() => setShowDiscardModal(true)}
                    title="Discard Test"
                    className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={saveTest}
                    title="Save Test"
                    className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Action Steps List - Recorded Actions */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <MousePointer className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Action Steps</span>
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {session.actions.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Recorded actions during this session
              </p>
            </div>

            {session.actions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                  <MousePointer className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {session.isRecording ? 'No actions yet' : 'No actions recorded'}
                </p>
                {session.isRecording && (
                  <p className="text-xs text-muted-foreground">
                    Click on device preview to start
                  </p>
                )}
              </div>
            ) : (
              session.actions.map((action, index) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  index={index}
                  onRemove={() => removeAction(action.id)}
                  onView={() => viewPreviousCapture(action)}
                />
              ))
            )}
          </div>

        </div>
      )}

      {/* Center Area - Device Preview */}
      <div className="flex-1 flex items-center justify-center p-8 bg-muted/20">
        {session ? (
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Device Preview</h3>
              {isViewingPreviousCapture ? (
                <span className="text-xs px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-500 border border-orange-500/20">
                  📸 Viewing Previous Capture
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  Click to tap
                </span>
              )}
            </div>
            <div className="relative aspect-[9/16] bg-card rounded-lg border-2 border-border flex items-center justify-center shadow-xl overflow-hidden">
              {screenshot ? (
                <>
                  <img
                    ref={imageRef}
                    src={screenshot}
                    alt="Device screen"
                    className="w-full h-full object-contain cursor-crosshair"
                    onClick={handleScreenshotClick}
                  />
                  {tapCoords && (
                    <div
                      className="absolute w-12 h-12 rounded-full border-4 border-red-500 animate-ping pointer-events-none"
                      style={{
                        left: `${(tapCoords.x / 1080) * 100}%`,
                        top: `${(tapCoords.y / 2400) * 100}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="text-center p-8">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                    <Smartphone className="w-6 h-6 text-muted-foreground animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Waiting for screen</p>
                  <p className="text-xs text-muted-foreground">
                    Click on your device to capture
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 flex items-center justify-center mx-auto mb-4">
              <Circle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Record</h3>
            <p className="text-sm text-muted-foreground">
              Configure your test and start recording to capture device interactions
            </p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Device Actions Panel */}
      {session && session.isRecording && (
        <div className="w-80 border-l border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-1">
              <Smartphone className="w-4 h-4" />
              Device Actions
            </h3>
            <p className="text-xs text-muted-foreground">
              Add device actions to your test
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <DeviceActionsPanel onActionAdd={addDeviceAction} />

            {/* Custom Property Viewer (SDK v2.0) */}
            <CustomPropertyViewer
              isSDKConnected={session?.sdkConnected || false}
              onRefresh={() => {
                // Optionally refresh screenshot or other data
                console.log('[TestRecorder] Custom property viewer refreshed')
              }}
            />
          </div>
        </div>
      )}

      {/* Discard Confirmation Modal */}
      {showDiscardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">Discard Test Recording?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Are you sure you want to discard this test? All {session?.actions.length || 0} recorded actions will be permanently lost. This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDiscardModal(false)}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={discardTest}
                    className="px-4 py-2 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors font-medium"
                  >
                    Discard Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Detail Modal */}
      {selectedAction && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={closePreviousCapture}
        >
          <button
            onClick={closePreviousCapture}
            className="absolute top-4 right-4 p-3 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg z-10"
            title="Close (ESC)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Help hint */}
          <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-3 py-2 rounded-lg z-10">
            Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded">ESC</kbd> to close
          </div>
          <div className="max-w-4xl w-full flex gap-4" onClick={(e) => e.stopPropagation()}>
            {/* Screenshot */}
            {selectedAction.screenshot && (
              <div className="flex-1">
                <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden shadow-2xl">
                  <img
                    src={`data:image/png;base64,${selectedAction.screenshot}`}
                    alt="Action screenshot"
                    className="w-full h-full object-contain"
                  />
                  {/* Visual indicator for tap actions */}
                  {selectedAction.type === 'tap' && selectedAction.target && typeof selectedAction.target.x === 'number' && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: `${(selectedAction.target.x / 1080) * 100}%`,
                        top: `${(selectedAction.target.y / 2400) * 100}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <div className="w-16 h-16 rounded-full border-4 border-red-500 bg-red-500/20 flex items-center justify-center">
                        <span className="text-3xl">👆</span>
                      </div>
                    </div>
                  )}
                  {/* Visual indicator for swipe actions */}
                  {selectedAction.type === 'swipe' && selectedAction.target &&
                   typeof selectedAction.target.x1 === 'number' &&
                   typeof selectedAction.target.y1 === 'number' &&
                   typeof selectedAction.target.x2 === 'number' &&
                   typeof selectedAction.target.y2 === 'number' && (
                    <>
                      {/* Three circles showing swipe movement */}
                      {[0, 0.5, 1].map((t, i) => {
                        const x = selectedAction.target.x1 + (selectedAction.target.x2 - selectedAction.target.x1) * t
                        const y = selectedAction.target.y1 + (selectedAction.target.y2 - selectedAction.target.y1) * t
                        const size = 12 + i * 2 // Increasing size
                        const opacity = 30 + i * 35 // Increasing opacity

                        return (
                          <div
                            key={i}
                            className="absolute pointer-events-none"
                            style={{
                              left: `${(x / 1080) * 100}%`,
                              top: `${(y / 2400) * 100}%`,
                              transform: 'translate(-50%, -50%)'
                            }}
                          >
                            <div
                              className={`rounded-full border-3 border-red-500`}
                              style={{
                                width: `${size * 4}px`,
                                height: `${size * 4}px`,
                                backgroundColor: `rgba(239, 68, 68, ${opacity / 100})`
                              }}
                            />
                          </div>
                        )
                      })}
                      {/* Arrow at the end */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: `${(selectedAction.target.x2 / 1080) * 100}%`,
                          top: `${(selectedAction.target.y2 / 2400) * 100}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <div className="text-4xl text-red-500">➜</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Action Details */}
            <div className="w-96 bg-card border border-border rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="text-2xl">{getActionIcon(selectedAction.type)}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {selectedAction.description}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(selectedAction.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* Download button */}
              {selectedAction.screenshot && (
                <button
                  onClick={() => downloadScreenshotWithIndicator(selectedAction)}
                  className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Download Screenshot</span>
                </button>
              )}

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Type</p>
                  <p className="text-sm text-foreground capitalize">{selectedAction.type}</p>
                </div>

                {selectedAction.elementPath && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Element</p>
                    <p className="text-sm text-foreground font-mono text-xs break-all">
                      {selectedAction.elementPath}
                    </p>
                    {selectedAction.elementType && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                        {selectedAction.elementType}
                      </span>
                    )}
                  </div>
                )}

                {selectedAction.target && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Target Data</p>
                    <pre className="text-xs text-foreground font-mono overflow-x-auto">
                      {JSON.stringify(selectedAction.target, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getActionIcon(type: string): string {
  switch (type) {
    case 'tap':
      return '👆'
    case 'swipe':
      return '👉'
    case 'input':
      return '⌨️'
    case 'wait':
      return '⏱️'
    case 'assert':
      return '✓'
    case 'screenshot':
      return '📸'
    default:
      return '•'
  }
}

interface ActionItemProps {
  action: RecordedAction
  index: number
  onRemove: () => void
  onView: () => void
}

function ActionItem({ action, index, onRemove, onView }: ActionItemProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)

  // Check if action has a screenshot
  const hasScreenshot = !!action.screenshot

  return (
    <div className="p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-lg">{getActionIcon(action.type)}</span>

        {/* Screenshot thumbnail if available */}
        {hasScreenshot && (
          <div
            onClick={onView}
            className="w-12 h-16 rounded border border-border overflow-hidden cursor-pointer hover:border-primary transition-colors flex-shrink-0"
          >
            <img
              src={`data:image/png;base64,${action.screenshot}`}
              alt="Screenshot"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
            <span className="text-sm font-medium text-foreground truncate">
              {action.description}
            </span>
            {action.elementPath && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                SDK
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(action.timestamp)}</span>
            <span>•</span>
            <span className="capitalize">{action.type}</span>
            {action.elementType && (
              <>
                <span>•</span>
                <span>{action.elementType}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {hasScreenshot && (
            <button
              onClick={onView}
              title="View details"
              className="p-1 rounded hover:bg-background transition-colors"
            >
              <Eye className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title="View JSON"
            className="p-1 rounded hover:bg-background transition-colors"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={onRemove}
            title="Remove action"
            className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border text-xs font-mono text-muted-foreground">
          <pre className="overflow-x-auto">{JSON.stringify(action, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return `0:${remainingSeconds.toString().padStart(2, '0')}`
}
