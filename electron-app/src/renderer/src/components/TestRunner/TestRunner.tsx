import { useState, useEffect } from 'react'
import {
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Smartphone,
  ChevronRight,
  FolderKanban,
  X,
  GripVertical,
  BarChart3
} from 'lucide-react'
import { useToast } from '../Common/ToastProvider'
import { ScreenshotThumbnail } from '../Common/ScreenshotViewer'
import { useTestExecutionPolling } from '../../hooks/useTestExecutionPolling'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface TestSuite {
  id: string
  name: string
  description?: string
  environment: string
  tags: string[]
  testCaseIds: string[]
}

interface TestCase {
  id: string
  suiteId: string
  name: string
  description: string
  tags: string[]
  steps: TestStep[]
  executionHistory?: any[]
}

interface TestStep {
  id: string
  type: string
  description: string
  [key: string]: any
}

interface TestRun {
  testId: string
  status: 'running' | 'passed' | 'failed' | 'stopped'
  currentStep: number
  totalSteps: number
  startTime: number
  error?: string
}

interface TestExecutionResult {
  testId: string
  testName: string
  status: 'passed' | 'failed' | 'error'
  duration: number
  error?: string
  steps: any[]
  testSteps?: any[] // Original test steps with action details
  screenshots: string[]
  timestamp: string
}

interface SuiteExecutionResult {
  suiteName: string
  totalTests: number
  passed: number
  failed: number
  errors: number
  duration: number
  results: TestExecutionResult[]
  timestamp: string
  executionId?: string
}

interface TestRunnerProps {
  onNavigateToReports?: (executionId?: string) => void
}

export default function TestRunner({ onNavigateToReports }: TestRunnerProps): JSX.Element {
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null)
  const [tests, setTests] = useState<TestCase[]>([])
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [currentRun, setCurrentRun] = useState<TestRun | null>(null)
  const [lastResult, setLastResult] = useState<TestExecutionResult | null>(null)
  const [suiteResult, setSuiteResult] = useState<SuiteExecutionResult | null>(null)
  const [filterTag, setFilterTag] = useState<string>('all')
  const [devices, setDevices] = useState<any[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [isRunningTests, setIsRunningTests] = useState(false)
  const toast = useToast()

  // Poll execution state in real-time during test execution (100ms for instant feedback)
  const { state: executionState } = useTestExecutionPolling(isRunningTests, 100)

  useEffect(() => {
    loadSuites()
    loadDevices()
  }, [])

  useEffect(() => {
    if (selectedSuite) {
      loadTestsFromSuite(selectedSuite.id)
    } else {
      setTests([])
    }
  }, [selectedSuite])

  const loadSuites = async (): Promise<void> => {
    try {
      const result = await window.api.suite.list()
      if (result.success) {
        setSuites(result.suites || [])
        // Auto-select first suite if available
        if (result.suites && result.suites.length > 0 && !selectedSuite) {
          setSelectedSuite(result.suites[0])
        }
      }
    } catch (error) {
      console.error('Failed to load suites:', error)
    }
  }

  const loadTestsFromSuite = async (suiteId: string): Promise<void> => {
    setIsLoading(true)
    try {
      const result = await window.api.testCase.list(suiteId)
      if (result.success) {
        setTests(result.testCases || [])
      }
    } catch (error) {
      console.error('Failed to load tests:', error)
      setTests([])
    } finally {
      setIsLoading(false)
    }
  }

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

  const toggleTestSelection = (testId: string): void => {
    const newSelection = new Set(selectedTests)
    if (newSelection.has(testId)) {
      newSelection.delete(testId)
    } else {
      newSelection.add(testId)
    }
    setSelectedTests(newSelection)
  }

  const selectAll = (): void => {
    setSelectedTests(new Set(filteredTests.map((t) => t.id)))
  }

  const deselectAll = (): void => {
    setSelectedTests(new Set())
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // 8px movement before activating drag
      }
    })
  )

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = tests.findIndex((t) => t.id === active.id)
      const newIndex = tests.findIndex((t) => t.id === over.id)

      const newTests = arrayMove(tests, oldIndex, newIndex)
      setTests(newTests)

      // Persist order to backend
      if (selectedSuite) {
        try {
          const result = await window.api.suite.reorderTests(
            selectedSuite.id,
            newTests.map((t) => t.id)
          )

          if (result.success) {
            toast.success('Test order saved')
          } else {
            throw new Error(result.error || 'Failed to save test order')
          }
        } catch (error) {
          console.error('Failed to reorder tests:', error)
          toast.error('Failed to save test order')
          // Revert on error
          setTests(tests)
        }
      }
    }
  }

  const runSelectedTests = async (): Promise<void> => {
    if (selectedTests.size === 0 || !selectedDevice) {
      toast.warning('Please select tests and a device first')
      return
    }

    const testsToRun = tests.filter((t) => selectedTests.has(t.id))
    const suiteStartTime = Date.now()
    const results: TestExecutionResult[] = []

    // Clear previous results
    setLastResult(null)
    setSuiteResult(null)

    // Show immediate feedback - set initial state before polling starts
    setCurrentRun({
      testId: testsToRun[0]?.id || '',
      status: 'running',
      currentStep: 0,
      totalSteps: testsToRun.length,
      startTime: suiteStartTime
    })

    // Enable real-time polling
    setIsRunningTests(true)

    // Execute tests sequentially
    for (let i = 0; i < testsToRun.length; i++) {
      const test = testsToRun[i]

      // Update progress in toast
      toast.info(`Running test ${i + 1} of ${testsToRun.length}`, test.name)

      const testStartTime = Date.now()

      try {
        // Pass suite info and test index for real-time tracking
        const result = await window.api.test.run(
          selectedDevice,
          test,
          selectedSuite?.id,
          selectedSuite?.name,
          i,
          testsToRun.length
        )
        const duration = Date.now() - testStartTime

        const executionResult: TestExecutionResult = {
          testId: test.id,
          testName: test.name,
          status: result.success ? 'passed' : 'failed',
          duration,
          error: result.success ? undefined : result.message,
          steps: result.result?.steps || [],
          testSteps: test.steps,
          screenshots: result.result?.screenshots || [],
          timestamp: new Date().toISOString()
        }

        results.push(executionResult)

        // Show progress
        setCurrentRun({
          testId: test.id,
          status: executionResult.status,
          currentStep: i + 1,
          totalSteps: testsToRun.length,
          startTime: testStartTime
        })

      } catch (error) {
        const duration = Date.now() - testStartTime

        const executionResult: TestExecutionResult = {
          testId: test.id,
          testName: test.name,
          status: 'error',
          duration,
          error: String(error),
          steps: [],
          testSteps: test.steps,
          screenshots: [],
          timestamp: new Date().toISOString()
        }

        results.push(executionResult)
      }

      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // Disable polling after all tests complete
    setIsRunningTests(false)

    // Create suite execution summary
    const totalDuration = Date.now() - suiteStartTime
    const passed = results.filter((r) => r.status === 'passed').length
    const failed = results.filter((r) => r.status === 'failed').length
    const errors = results.filter((r) => r.status === 'error').length

    // Generate execution ID that will be used for both suite result and session
    const executionId = `session_${Date.now()}`

    const suiteExecution: SuiteExecutionResult = {
      suiteName: selectedSuite?.name || 'Selected Tests',
      totalTests: testsToRun.length,
      passed,
      failed,
      errors,
      duration: totalDuration,
      results,
      timestamp: new Date().toISOString(),
      executionId
    }

    setSuiteResult(suiteExecution)
    setCurrentRun(null)

    // Record suite session to backend (NEW)
    try {
      // Get device info from already loaded devices state
      const deviceInfo = devices.find((d: any) => d.id === selectedDevice)

      // Convert TestExecutionResult[] to TestCaseExecution[]
      const testCases = results.map((result) => ({
        testId: result.testId,
        testName: result.testName,
        status: result.status,
        duration: result.duration,
        totalSteps: result.steps.length,
        passedSteps: result.steps.filter((s: any) => s.status === 'passed').length,
        failedSteps: result.steps.filter((s: any) => s.status === 'failed').length,
        error: result.error,
        screenshots: result.screenshots || [],
        steps: result.steps.map((step: any, idx: number) => {
          // Get original test step for description (backend steps don't have description)
          const originalStep = result.testSteps?.[idx]
          return {
            description: originalStep?.description || originalStep?.type || 'Unknown step',
            status: step.status,
            duration: step.duration,
            screenshot: step.screenshot,
            error: step.error
          }
        })
      }))

      // Determine overall session status
      let sessionStatus: 'passed' | 'failed' | 'partial'
      if (failed === 0 && errors === 0) {
        sessionStatus = 'passed'
      } else if (passed === 0) {
        sessionStatus = 'failed'
      } else {
        sessionStatus = 'partial'
      }

      // Create suite execution session
      const session = {
        id: executionId,
        timestamp: suiteExecution.timestamp,
        suiteId: selectedSuite?.id || 'unknown',
        suiteName: selectedSuite?.name || 'Selected Tests',
        deviceId: selectedDevice,
        deviceModel: deviceInfo?.model || 'Unknown Device',
        testCases,
        status: sessionStatus,
        duration: totalDuration,
        totalTests: testsToRun.length,
        passedTests: passed,
        failedTests: failed,
        errorTests: errors,
        successRate: testsToRun.length > 0 ? Math.round((passed / testsToRun.length) * 100) : 0
      }

      // Record session to backend
      await window.api.report.recordSuiteSession(session)
      console.log('[TestRunner] Suite session recorded successfully')
    } catch (error) {
      console.error('[TestRunner] Failed to record suite session:', error)
      // Don't show error to user - this is not critical
    }

    // Show final summary
    if (failed === 0 && errors === 0) {
      toast.success(`All ${passed} tests passed!`, `${formatDuration(totalDuration)}`)
    } else {
      toast.error(`${failed + errors} test(s) failed`, `${passed} passed, ${failed + errors} failed`)
    }
  }

  const runSingleTest = async (test: TestCase): Promise<void> => {
    const startTime = Date.now()

    setCurrentRun({
      testId: test.id,
      status: 'running',
      currentStep: 0,
      totalSteps: test.steps.length,
      startTime
    })

    try {
      const result = await window.api.test.run(selectedDevice, test)
      const duration = Date.now() - startTime

      // Create execution result
      const executionResult: TestExecutionResult = {
        testId: test.id,
        testName: test.name,
        status: result.success ? 'passed' : 'failed',
        duration,
        error: result.success ? undefined : result.message,
        steps: result.result?.steps || [],
        testSteps: test.steps, // Include original test steps for detailed failure info
        screenshots: result.result?.screenshots || [],
        timestamp: new Date().toISOString()
      }

      // Save result
      setLastResult(executionResult)

      // Show final status briefly
      if (result.success) {
        setCurrentRun({
          testId: test.id,
          status: 'passed',
          currentStep: test.steps.length,
          totalSteps: test.steps.length,
          startTime
        })
        toast.success(`Test passed in ${formatDuration(duration)}`, test.name)
      } else {
        setCurrentRun({
          testId: test.id,
          status: 'failed',
          currentStep: 0,
          totalSteps: test.steps.length,
          startTime,
          error: result.message
        })
        toast.error(`Test failed: ${result.message}`, test.name)
      }

      // Update test last run
      const updatedTests = tests.map((t) =>
        t.id === test.id
          ? {
              ...t,
              lastRun: {
                timestamp: executionResult.timestamp,
                status: executionResult.status,
                duration: executionResult.duration
              }
            }
          : t
      )
      setTests(updatedTests)

      // Wait to show final status before clearing
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (error) {
      console.error('Test execution failed:', error)
      const duration = Date.now() - startTime

      const executionResult: TestExecutionResult = {
        testId: test.id,
        testName: test.name,
        status: 'error',
        duration,
        error: String(error),
        steps: [],
        testSteps: test.steps,
        screenshots: [],
        timestamp: new Date().toISOString()
      }

      setLastResult(executionResult)
      toast.error(`Test error: ${String(error)}`, test.name)

      setCurrentRun({
        testId: test.id,
        status: 'failed',
        currentStep: 0,
        totalSteps: test.steps.length,
        startTime,
        error: String(error)
      })

      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    setCurrentRun(null)
  }

  const stopTest = (): void => {
    if (currentRun) {
      setCurrentRun({ ...currentRun, status: 'stopped' })
      setTimeout(() => setCurrentRun(null), 1000)
    }
  }

  const allTags = ['all', ...new Set(tests.flatMap((t) => t.tags || []))]
  const filteredTests =
    filterTag === 'all' ? tests : tests.filter((t) => t.tags && t.tags.includes(filterTag))

  const selectedCount = selectedTests.size
  const estimatedTime = filteredTests
    .filter((t) => selectedTests.has(t.id))
    .reduce((sum, t) => sum + (t.executionHistory?.[0]?.duration || 30000), 0)

  return (
    <div className="h-full flex">
      {/* Sidebar - Test List */}
      <div className="w-96 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Test Runner</h2>
            <button
              onClick={loadSuites}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Suite Selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Test Suite</label>
            <select
              value={selectedSuite?.id || ''}
              onChange={(e) => {
                const suite = suites.find(s => s.id === e.target.value)
                setSelectedSuite(suite || null)
                setSelectedTests(new Set())
              }}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
            >
              {suites.length === 0 ? (
                <option>No test suites found</option>
              ) : (
                suites.map((suite) => (
                  <option key={suite.id} value={suite.id}>
                    {suite.name} ({suite.testCaseIds.length} tests)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Device Selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target Device</label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
            >
              {devices.length === 0 ? (
                <option>No devices connected</option>
              ) : (
                devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.model} ({device.id})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Filter Tags */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Filter by Tag</label>
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(tag)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    filterTag === tag
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {selectedCount} of {filteredTests.length} selected
            </span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-primary hover:underline">
                Select All
              </button>
              <button onClick={deselectAll} className="text-primary hover:underline">
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Test List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="font-medium text-foreground mb-2">No Tests Found</h3>
              <p className="text-sm text-muted-foreground">
                {!selectedSuite
                  ? 'Select a test suite to view tests'
                  : 'This suite has no test cases yet'}
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredTests.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredTests.map((test) => (
                  <SortableTestListItem
                    key={test.id}
                    test={test}
                    isSelected={selectedTests.has(test.id)}
                    isRunning={currentRun?.testId === test.id}
                    onToggle={() => toggleTestSelection(test.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Run Controls */}
        <div className="p-4 border-t border-border space-y-3">
          {selectedCount > 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Selected tests:</span>
                <span className="font-medium text-foreground">{selectedCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated time:</span>
                <span className="font-medium text-foreground">
                  {formatDuration(estimatedTime)}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={currentRun ? stopTest : runSelectedTests}
            disabled={selectedCount === 0 || !selectedDevice || isLoading}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
              currentRun
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {currentRun ? (
              <>
                <Square className="w-4 h-4" />
                Stop Test
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Selected Tests
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Area - Test Execution View */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-center min-h-full p-8">
          {currentRun ? (
            <TestExecutionView
              run={currentRun}
              test={tests.find((t) => t.id === currentRun.testId)!}
              executionState={executionState}
            />
          ) : suiteResult ? (
            <SuiteResultView
              result={suiteResult}
              onClose={() => setSuiteResult(null)}
              onNavigateToReports={onNavigateToReports}
            />
          ) : lastResult ? (
            <TestResultView result={lastResult} onClose={() => setLastResult(null)} />
          ) : (
            <div className="text-center">
              <Play className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Ready to Run Tests</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Select tests from the sidebar and click "Run Selected Tests" to begin execution
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface TestListItemProps {
  test: TestCase
  isSelected: boolean
  isRunning: boolean
  onToggle: () => void
}

function SortableTestListItem({ test, isSelected, isRunning, onToggle }: TestListItemProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: test.id
  })

  // Restrict movement to vertical axis only
  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1 group">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <TestListItem test={test} isSelected={isSelected} isRunning={isRunning} onToggle={onToggle} />
      </div>
    </div>
  )
}

function TestListItem({ test, isSelected, isRunning, onToggle }: TestListItemProps): JSX.Element {
  // Get last execution from executionHistory
  const lastExecution = test.executionHistory && test.executionHistory.length > 0
    ? test.executionHistory[0]
    : null

  const statusIcon = lastExecution ? (
    lastExecution.status === 'passed' ? (
      <CheckCircle2 className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    )
  ) : null

  return (
    <button
      onClick={onToggle}
      className={`w-full p-4 rounded-lg border text-left transition-all ${
        isSelected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/50'
      } ${isRunning ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="mt-[5px] flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground mb-1">{test.name}</h4>
            {test.description && (
              <p className="text-sm text-muted-foreground mb-2">{test.description}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{test.steps?.length || 0} steps</span>
              {test.tags && test.tags.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex gap-1 flex-wrap">
                    {test.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
            {lastExecution && (
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(lastExecution.duration)}
                </span>
                <span>{new Date(lastExecution.executedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
        {statusIcon && (
          <div className="flex-shrink-0 ml-2">
            {statusIcon}
          </div>
        )}
      </div>
      {isRunning && (
        <div className="mt-3">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-pulse" style={{ width: '50%' }} />
          </div>
        </div>
      )}
    </button>
  )
}

interface TestExecutionViewProps {
  run: TestRun
  test: TestCase
  executionState: any // ExecutionState from polling
}

function TestExecutionView({ run, test, executionState }: TestExecutionViewProps): JSX.Element {
  // Use real-time execution state if available, otherwise fall back to run prop
  const currentStepIndex = executionState?.currentStepIndex ?? run.currentStep
  const totalSteps = executionState?.totalSteps ?? run.totalSteps
  const completedSteps = executionState?.completedSteps ?? []
  const currentStep = executionState?.currentStep ?? null
  const testStartTime = executionState?.startTime ?? run.startTime

  const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0
  const elapsed = Date.now() - testStartTime

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Status Card */}
      <div className="p-6 rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {executionState?.currentTestName || test.name}
          </h3>
          <StatusBadge status={run.status} />
        </div>

        {/* Progress Bar - Step Level */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Elapsed Time</p>
            <p className="text-sm font-medium text-foreground">{formatDuration(elapsed)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <p className="text-sm font-medium text-foreground capitalize">{run.status}</p>
          </div>
        </div>

        {run.error && (
          <div className="mt-4 p-3 rounded bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{run.error}</p>
          </div>
        )}
      </div>

      {/* Live Device View Placeholder */}
      <div className="p-6 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-primary" />
          <h4 className="font-medium text-foreground">Live Device View</h4>
        </div>
        <div className="aspect-[9/16] bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-spin" />
            <p className="text-sm text-muted-foreground">Streaming from device...</p>
          </div>
        </div>
      </div>

      {/* Real-Time Step Progress */}
      <div className="p-6 rounded-lg border border-border bg-card">
        <h4 className="font-medium text-foreground mb-4">
          Step Execution Progress
        </h4>

        {/* Show completed steps */}
        {completedSteps.length > 0 && (
          <div className="space-y-2 mb-4">
            {completedSteps.map((step: any) => (
              <div
                key={step.stepIndex}
                className={`p-3 rounded-lg border ${
                  step.status === 'passed'
                    ? 'bg-green-500/5 border-green-500/20'
                    : step.status === 'failed'
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-yellow-500/5 border-yellow-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {step.status === 'passed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : step.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Step {step.stepIndex + 1}: {step.description}
                      </p>
                      {step.error && (
                        <p className="text-xs text-red-500 mt-1">{step.error}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {step.duration ? formatDuration(step.duration) : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show current running step with animation */}
        {currentStep && (
          <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary animate-pulse">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Step {currentStep.stepIndex + 1}: {currentStep.description}
                </p>
                <p className="text-xs text-primary mt-1">
                  Executing... {formatDuration(Date.now() - currentStep.startTime)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show upcoming steps preview */}
        {!currentStep && completedSteps.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-primary" />
            <p>Starting test execution...</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface TestResultViewProps {
  result: TestExecutionResult
  onClose: () => void
}

function TestResultView({ result, onClose }: TestResultViewProps): JSX.Element {
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null)

  const statusConfig = {
    passed: {
      icon: <CheckCircle2 className="w-16 h-16 text-green-500" />,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20'
    },
    failed: {
      icon: <XCircle className="w-16 h-16 text-red-500" />,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20'
    },
    error: {
      icon: <AlertCircle className="w-16 h-16 text-yellow-500" />,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20'
    }
  }

  const config = statusConfig[result.status]

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Header Card */}
      <div className={`p-8 rounded-lg border ${config.border} ${config.bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {config.icon}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">{result.testName}</h2>
              <p className={`text-sm font-medium ${config.color} uppercase tracking-wider`}>
                {result.status}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title="Close results"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Duration</p>
            <p className="text-lg font-semibold text-foreground">{formatDuration(result.duration)}</p>
          </div>
          <div className="p-4 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Steps</p>
            <p className="text-lg font-semibold text-foreground">{result.steps.length}</p>
          </div>
          <div className="p-4 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Executed At</p>
            <p className="text-lg font-semibold text-foreground">
              {new Date(result.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {result.error && (
          <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-medium text-destructive mb-1">Error Details:</p>
            <p className="text-sm text-destructive/80">{result.error}</p>
          </div>
        )}
      </div>

      {/* Steps Details */}
      <div className="p-6 rounded-lg border border-border bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Step Results ({result.steps.filter(s => s.status === 'passed').length} passed, {result.steps.filter(s => s.status === 'failed').length} failed)
        </h3>
        <div className="space-y-3">
          {result.steps.map((step, idx) => {
            // Get test step details from the original test
            const testStep = result.testSteps?.[idx]

            return (
              <div
                key={step.stepId || idx}
                className={`p-4 rounded-lg border ${
                  step.status === 'passed'
                    ? 'bg-green-500/5 border-green-500/20'
                    : step.status === 'failed'
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-muted border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {step.status === 'passed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : step.status === 'failed' ? (
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">Step {idx + 1}</p>
                        {testStep && (
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            {testStep.type}
                          </span>
                        )}
                      </div>
                      {testStep?.description && (
                        <p className="text-sm text-foreground mb-2">{testStep.description}</p>
                      )}

                      {/* Show action details for failed steps */}
                      {step.status === 'failed' && testStep && (
                        <div className="mt-2 p-2 rounded bg-background/50 text-xs space-y-1">
                          {testStep.type === 'tap' && testStep.target && (
                            <p className="text-muted-foreground">
                              <span className="font-medium">Tap at:</span> ({Math.round(testStep.target.x)}, {Math.round(testStep.target.y)})
                            </p>
                          )}
                          {testStep.type === 'swipe' && testStep.target && (
                            <p className="text-muted-foreground">
                              <span className="font-medium">Swipe:</span> ({Math.round(testStep.target.x1)}, {Math.round(testStep.target.y1)}) → ({Math.round(testStep.target.x2)}, {Math.round(testStep.target.y2)})
                            </p>
                          )}
                          {step.error && (
                            <p className="text-red-500 font-medium mt-2">
                              <span className="font-semibold">Reason:</span> {step.error}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Failure Evidence Screenshot - Show inline with failed step */}
                      {step.status === 'failed' && step.screenshot && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Failure Evidence:</p>
                          <div className="max-w-[200px]">
                            <ScreenshotThumbnail
                              screenshot={step.screenshot}
                              alt={`Failure screenshot - Step ${idx + 1}`}
                              onClick={() => setSelectedScreenshot(step.screenshot)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatDuration(step.duration)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>


      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <button
            onClick={() => setSelectedScreenshot(null)}
            className="absolute top-4 right-4 p-3 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedScreenshot}
            alt="Full screenshot"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

interface SuiteResultViewProps {
  result: SuiteExecutionResult
  onClose: () => void
  onNavigateToReports?: (executionId?: string) => void
}

function SuiteResultView({ result, onClose, onNavigateToReports }: SuiteResultViewProps): JSX.Element {
  const [selectedTest, setSelectedTest] = useState<TestExecutionResult | null>(null)

  const passRate = ((result.passed / result.totalTests) * 100).toFixed(1)
  const isSuccess = result.failed === 0 && result.errors === 0

  return (
    <>
      {selectedTest ? (
        <TestResultView result={selectedTest} onClose={() => setSelectedTest(null)} />
      ) : (
        <div className="w-full max-w-4xl space-y-6">
          {/* Header Card */}
          <div className={`p-8 rounded-lg border ${isSuccess ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isSuccess ? (
                  <CheckCircle2 className="w-16 h-16 text-green-500" />
                ) : (
                  <XCircle className="w-16 h-16 text-red-500" />
                )}
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">{result.suiteName}</h2>
                  <p className={`text-sm font-medium ${isSuccess ? 'text-green-500' : 'text-red-500'} uppercase tracking-wider`}>
                    {isSuccess ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onNavigateToReports && (
                  <button
                    onClick={() => onNavigateToReports(result.executionId)}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors flex items-center gap-2"
                    title="View full report"
                  >
                    <BarChart3 className="w-4 h-4" />
                    View Report
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                  title="Close results"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Total Duration</p>
                <p className="text-lg font-semibold text-foreground">{formatDuration(result.duration)}</p>
              </div>
              <div className="p-4 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Pass Rate</p>
                <p className={`text-lg font-semibold ${isSuccess ? 'text-green-500' : 'text-foreground'}`}>{passRate}%</p>
              </div>
              <div className="p-4 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Total Tests</p>
                <p className="text-lg font-semibold text-foreground">{result.totalTests}</p>
              </div>
              <div className="p-4 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Results</p>
                <p className="text-lg font-semibold text-foreground">
                  <span className="text-green-500">{result.passed}</span>
                  {' / '}
                  <span className="text-red-500">{result.failed + result.errors}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Test Results List */}
          <div className="p-6 rounded-lg border border-border bg-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Test Results</h3>
            <div className="space-y-2">
              {result.results.map((testResult, idx) => (
                <button
                  key={testResult.testId || idx}
                  onClick={() => setSelectedTest(testResult)}
                  className={`w-full p-4 rounded-lg border text-left transition-all hover:border-primary ${
                    testResult.status === 'passed'
                      ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10'
                      : testResult.status === 'failed'
                        ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                        : 'bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {testResult.status === 'passed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : testResult.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{testResult.testName}</p>
                        {testResult.error && (
                          <p className="text-xs text-red-500 mt-1 truncate">{testResult.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-medium text-foreground">{formatDuration(testResult.duration)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {testResult.steps.filter((s) => s.status === 'passed').length}/{testResult.steps.length} steps
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const styles = {
    running: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    passed: 'bg-green-500/10 text-green-500 border-green-500/20',
    failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    stopped: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
  }

  const icons = {
    running: <RefreshCw className="w-4 h-4 animate-spin" />,
    passed: <CheckCircle2 className="w-4 h-4" />,
    failed: <XCircle className="w-4 h-4" />,
    stopped: <AlertCircle className="w-4 h-4" />
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${styles[status]}`}>
      {icons[status]}
      <span className="text-sm font-medium capitalize">{status}</span>
    </div>
  )
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${remainingSeconds}s`
}
