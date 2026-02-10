import { useState, useEffect } from 'react'
import { FolderKanban, Plus, Trash2, Edit2, PlayCircle, X, Download, GripVertical, Copy, CheckCircle2, Smartphone, Monitor, Globe } from 'lucide-react'
import { useToast } from '../Common/ToastProvider'
import { ScreenshotViewer } from '../Common/ScreenshotViewer'
import { useScreenshot } from '../../hooks/useScreenshot'
import { PrerequisitesEditor } from './PrerequisitesEditor'
import { SuiteValidationDialog } from './SuiteValidationDialog'
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  DragOverlay
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
  environment: 'Development' | 'Staging' | 'Production' | 'Other'
  targetPlatform: 'Android' | 'iOS' | 'Web' | 'Cross-platform'
  tags: string[]
  testCaseIds: string[]
  createdAt: string
  updatedAt: string
}

// Step Item Component - uses useScreenshot hook
function StepItem({
  step,
  index,
  onDelete,
  onUpdateDescription,
  onViewDetail
}: {
  step: any
  index: number
  onDelete: () => void
  onUpdateDescription: (desc: string) => void
  onViewDetail: (screenshot: string) => void
}) {
  const { screenshot, loading } = useScreenshot(step.screenshotPath, step.screenshot)

  return (
    <div className="border border-border rounded-lg p-3 bg-background">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
          {index + 1}
        </div>

        {/* Step Screenshot Thumbnail */}
        {screenshot && !loading && (
          <div
            className="flex-shrink-0 w-12 h-20 rounded border border-border overflow-hidden cursor-pointer hover:border-primary transition-colors bg-muted/20"
            onClick={() => onViewDetail(screenshot)}
            title="Click to view step details"
          >
            <img
              src={screenshot}
              alt={`Step ${index + 1} screenshot`}
              className="w-full h-full object-contain"
            />
          </div>
        )}
        {loading && (
          <div className="flex-shrink-0 w-12 h-20 rounded border border-border bg-muted animate-pulse" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="text-sm font-medium text-foreground">
              {step.type === 'tap' && '👆 Tap'}
              {step.type === 'swipe' && '👉 Swipe'}
              {step.type === 'wait' && '⏱️ Wait'}
              {step.type === 'screenshot' && '📸 Screenshot'}
              {!['tap', 'swipe', 'wait', 'screenshot'].includes(step.type) && step.type}
            </div>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-destructive/10 transition-colors"
              title="Delete step"
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </button>
          </div>

          {step.type === 'tap' && step.target && (
            <div className="text-xs text-muted-foreground mb-2">
              Position: ({step.target.x}, {step.target.y})
            </div>
          )}

          {step.type === 'swipe' && step.target && (
            <div className="text-xs text-muted-foreground mb-2">
              From ({step.target.x1}, {step.target.y1}) to ({step.target.x2}, {step.target.y2})
            </div>
          )}

          {step.type === 'wait' && step.value && (
            <div className="text-xs text-muted-foreground mb-2">
              Duration: {step.value}ms
            </div>
          )}

          <textarea
            value={step.description || ''}
            onChange={(e) => onUpdateDescription(e.target.value)}
            placeholder="Add step description..."
            rows={2}
            className="w-full px-2 py-1 text-xs bg-card border border-border rounded text-foreground resize-none"
          />
        </div>
      </div>
    </div>
  )
}

// Sortable Test Item Component for drag-and-drop
function SortableTestItem({ test, uniqueId, children }: { test: any; uniqueId: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: uniqueId })

  // Allow free movement (X and Y) to enable dragging to other suites
  // verticalListSortingStrategy handles vertical sorting within the list
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-muted rounded transition-colors flex-shrink-0"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}

// Droppable Suite Item Component
function DroppableSuiteItem({
  suite,
  isActive,
  onClick,
  onEdit,
  onDuplicate,
  onDelete,
  onValidate,
  onRun
}: {
  suite: TestSuite
  isActive: boolean
  onClick: () => void
  onEdit: (e: React.MouseEvent) => void
  onDuplicate: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  onValidate: (e: React.MouseEvent) => void
  onRun: (e: React.MouseEvent) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `suite-${suite.id}`,
    data: { type: 'suite', suite }
  })

  // Log when hovering over this suite
  if (isOver) {
    console.log('[DroppableSuiteItem] isOver:', suite.name, suite.id)
  }

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`border border-border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors cursor-pointer ${
        isActive ? 'border-primary bg-primary/5' : ''
      } ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-primary" />
          <h3 className="font-medium text-foreground">{suite.name}</h3>
          {/* Platform Badge */}
          {suite.targetPlatform === 'Android' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-600" title="Android">
              <Smartphone className="w-3 h-3" />
              Android
            </span>
          )}
          {suite.targetPlatform === 'iOS' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-600" title="iOS">
              <Smartphone className="w-3 h-3" />
              iOS
            </span>
          )}
          {suite.targetPlatform === 'Web' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-600" title="Web">
              <Monitor className="w-3 h-3" />
              Web
            </span>
          )}
          {suite.targetPlatform === 'Cross-platform' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-orange-500/10 text-orange-600" title="Cross-platform">
              <Globe className="w-3 h-3" />
              Cross-platform
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRun}
            className="p-1 rounded hover:bg-blue-500/10 transition-colors"
            title="Run suite"
          >
            <PlayCircle className="w-4 h-4 text-blue-500" />
          </button>
          <button
            onClick={onValidate}
            className="p-1 rounded hover:bg-green-500/10 transition-colors"
            title="Validate dependencies"
          >
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </button>
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Edit suite"
          >
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={onDuplicate}
            className="p-1 rounded hover:bg-primary/10 transition-colors"
            title="Duplicate suite"
          >
            <Copy className="w-4 h-4 text-primary" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-destructive/10 transition-colors"
            title="Delete suite"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </div>

      {suite.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {suite.description}
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded text-xs bg-primary/10 text-primary">
            {suite.environment}
          </span>
          <span className="text-muted-foreground">
            {suite.testCaseIds.length} tests
          </span>
        </div>
      </div>

      {suite.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {suite.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {suite.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">
              +{suite.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function TestSuites() {
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null)
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null)
  const [suiteTests, setSuiteTests] = useState<any[]>([])
  const [loadingTests, setLoadingTests] = useState(false)
  const [newSuite, setNewSuite] = useState({
    name: '',
    description: '',
    environment: 'Development' as const
  })
  const [editSuite, setEditSuite] = useState({
    name: '',
    description: '',
    environment: 'Development' as const
  })
  const [showEditTestDialog, setShowEditTestDialog] = useState(false)
  const [editingTest, setEditingTest] = useState<any | null>(null)
  const [editTestTab, setEditTestTab] = useState<'steps' | 'prerequisites' | 'yaml'>('steps')
  const [yamlContent, setYamlContent] = useState('')
  const [yamlValidation, setYamlValidation] = useState<{ valid: boolean; errors: string[] } | null>(null)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [validatingSuite, setValidatingSuite] = useState<TestSuite | null>(null)
  const [editTest, setEditTest] = useState({
    name: '',
    description: '',
    tags: [] as string[],
    steps: [] as any[],
    screenshots: [] as string[],
    prerequisites: [] as any[]
  })
  const [showScreenshotViewer, setShowScreenshotViewer] = useState(false)
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedStepForView, setSelectedStepForView] = useState<any | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })
  const [showMoveTestDialog, setShowMoveTestDialog] = useState(false)
  const [testToMove, setTestToMove] = useState<any | null>(null)
  const [targetSuiteId, setTargetSuiteId] = useState<string>('')
  const toast = useToast()

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // 8px of movement before activating drag
      }
    })
  )

  useEffect(() => {
    loadSuites()
  }, [])

  // Handle ESC key to close step detail modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedStepForView) {
        setSelectedStepForView(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedStepForView])

  const loadSuites = async () => {
    try {
      setLoading(true)
      const result = await window.api.suite.list()
      if (result.success) {
        setSuites(result.suites || [])
      }
    } catch (error) {
      console.error('Failed to load suites:', error)
    } finally {
      setLoading(false)
    }
  }

  const createSuite = async () => {
    if (!newSuite.name.trim()) {
      toast.warning('Please enter a suite name')
      return
    }

    try {
      const result = await window.api.suite.create({
        name: newSuite.name,
        description: newSuite.description,
        environment: newSuite.environment,
        tags: [],
        testCaseIds: []
      })

      if (result.success) {
        await loadSuites()
        setShowCreateDialog(false)
        setNewSuite({ name: '', description: '', environment: 'Development' })
        toast.success('Suite created successfully!', 'Suite Created')
      }
    } catch (error) {
      console.error('Failed to create suite:', error)
      toast.error('Failed to create suite')
    }
  }

  const openEditDialog = (suite: TestSuite) => {
    setEditingSuite(suite)
    setEditSuite({
      name: suite.name,
      description: suite.description || '',
      environment: suite.environment
    })
    setShowEditDialog(true)
  }

  const updateSuite = async () => {
    if (!editingSuite || !editSuite.name.trim()) {
      toast.warning('Please enter a suite name')
      return
    }

    try {
      const result = await window.api.suite.update(editingSuite.id, {
        name: editSuite.name,
        description: editSuite.description,
        environment: editSuite.environment
      })

      if (result.success) {
        await loadSuites()
        setShowEditDialog(false)
        setEditingSuite(null)
        setEditSuite({ name: '', description: '', environment: 'Development' })
        toast.success('Suite updated successfully!', 'Suite Updated')
      }
    } catch (error) {
      console.error('Failed to update suite:', error)
      toast.error('Failed to update suite')
    }
  }

  const loadSuiteTests = async (suite: TestSuite) => {
    setSelectedSuite(suite)
    setLoadingTests(true)
    try {
      const result = await window.api.testCase.list(suite.id)
      if (result.success) {
        setSuiteTests(result.testCases || [])
      }
    } catch (error) {
      console.error('Failed to load suite tests:', error)
      setSuiteTests([])
    } finally {
      setLoadingTests(false)
    }
  }

  // Handle drag start - track which item is being dragged
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  // Handle drag and drop reordering and moving between suites
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null) // Clear active item
    const { active, over } = event

    console.log('[TestSuites] handleDragEnd:', { activeId: active.id, overId: over?.id })

    if (!over || !selectedSuite) {
      console.log('[TestSuites] No over or no selectedSuite, aborting')
      return
    }

    const uniqueId = active.id as string
    const overId = over.id as string

    // Extract real test ID by removing the suiteId prefix
    // Format: suite_1770360286288_test_002 → test_002
    const testId = uniqueId.replace(`${selectedSuite.id}_`, '')
    console.log('[TestSuites] Extracted testId:', testId)

    // Check if dropping on another suite (move between suites)
    if (overId.startsWith('suite-')) {
      console.log('[TestSuites] Dropping on suite:', overId)
      const targetSuiteId = overId.replace('suite-', '')

      // Don't move if it's the same suite
      if (targetSuiteId === selectedSuite.id) {
        return
      }

      const targetSuite = suites.find(s => s.id === targetSuiteId)
      if (!targetSuite) {
        return
      }

      try {
        toast.info(`Moving test to ${targetSuite.name}...`)

        const result = await window.api.testCase.move(
          testId,
          selectedSuite.id,
          targetSuiteId
        )

        if (result.success) {
          // Reload both suites
          await loadSuites()
          await loadSuiteTests(selectedSuite)
          toast.success(`Test moved to ${targetSuite.name}`)
        } else {
          throw new Error(result.error || 'Failed to move test')
        }
      } catch (error) {
        console.error('Failed to move test:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to move test'
        toast.error(errorMessage)
      }
      return
    }

    // Handle reordering within the same suite
    if (active.id === over.id) {
      return
    }

    // Extract real test ID from over unique ID by removing suiteId prefix
    const overTestId = overId.replace(`${selectedSuite.id}_`, '')

    const oldIndex = suiteTests.findIndex((t) => t.id === testId)
    const newIndex = suiteTests.findIndex((t) => t.id === overTestId)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const newTests = arrayMove(suiteTests, oldIndex, newIndex)
    setSuiteTests(newTests)

    // Persist to backend
    try {
      const result = await window.api.suite.reorderTests(
        selectedSuite.id,
        newTests.map(t => t.id)
      )

      if (result.success) {
        toast.success('Test order updated')
      } else {
        throw new Error(result.error || 'Failed to update test order')
      }
    } catch (error) {
      console.error('Failed to reorder tests:', error)
      toast.error('Failed to update test order')
      // Revert on error
      setSuiteTests(suiteTests)
    }
  }

  const deleteSuite = async (suiteId: string) => {
    // Get suite to check if it has test cases
    const suite = suites.find(s => s.id === suiteId)
    const hasTests = suite && suite.testCaseIds && suite.testCaseIds.length > 0

    setConfirmDialog({
      show: true,
      title: 'Delete Test Suite',
      message: hasTests
        ? `This suite contains ${suite.testCaseIds.length} test case(s). Do you want to delete the suite and all its test cases? This action cannot be undone.`
        : 'Are you sure you want to delete this empty test suite?',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, show: false })
        try {
          // Always delete test cases along with suite
          const result = await window.api.suite.delete(suiteId, true)

          if (result.success) {
            await loadSuites()
            if (selectedSuite?.id === suiteId) {
              setSelectedSuite(null)
              setSuiteTests([])
            }
            toast.success(
              hasTests
                ? `Suite and ${suite.testCaseIds.length} test case(s) deleted`
                : 'Suite deleted successfully'
            )
          } else {
            throw new Error(result.error || 'Failed to delete suite')
          }
        } catch (error) {
          console.error('Failed to delete suite:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete suite'
          toast.error(errorMessage)
        }
      }
    })
  }

  const duplicateSuite = async (suiteId: string) => {
    try {
      toast.info('Duplicating suite...')
      const result = await window.api.suite.duplicate(suiteId)

      if (result.success && result.suite) {
        await loadSuites()
        // Select the newly created suite
        setSelectedSuite(result.suite)
        await loadSuiteTests(result.suite)
        toast.success(`Suite duplicated as "${result.suite.name}"`, 'Success')
      } else {
        throw new Error(result.error || 'Failed to duplicate suite')
      }
    } catch (error) {
      console.error('Failed to duplicate suite:', error)
      toast.error('Failed to duplicate suite')
    }
  }

  const runSuite = async (suite: TestSuite) => {
    try {
      // Get connected device
      const devices = await window.api.adb.getDevices()
      if (!devices || devices.length === 0) {
        toast.error('No Android device connected. Please connect a device first.')
        return
      }

      const deviceId = devices[0].id

      toast.info(`Running suite "${suite.name}"...`, 'Starting')

      const result = await window.api.suite.run(deviceId, suite.id, true)

      if (result.success && result.result) {
        const { passedTests, failedTests, errorTests, totalTests } = result.result

        if (failedTests === 0 && errorTests === 0) {
          toast.success(
            `Suite completed successfully!\n${passedTests}/${totalTests} tests passed`,
            'Success'
          )
        } else {
          toast.warning(
            `Suite completed with issues:\n${passedTests} passed, ${failedTests} failed, ${errorTests} errors`,
            'Completed with Issues'
          )
        }
      } else {
        throw new Error(result.message || result.error || 'Failed to run suite')
      }
    } catch (error) {
      console.error('Failed to run suite:', error)
      toast.error(`Failed to run suite: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const openEditTestDialog = async (test: any) => {
    setEditingTest(test)

    // Load screenshots from files or use base64 fallback
    const screenshots: string[] = []
    if (test.steps && test.steps.length > 0) {
      for (const step of test.steps) {
        try {
          // Try loading from file path first (NEW format)
          if (step.screenshotPath) {
            const result = await window.api.screenshot.load(step.screenshotPath)
            if (result.success) {
              screenshots.push(result.data)
              continue
            }
          }

          // Fallback to base64 (OLD format)
          if (step.screenshot) {
            const screenshot = step.screenshot.startsWith('data:')
              ? step.screenshot
              : `data:image/png;base64,${step.screenshot}`
            screenshots.push(screenshot)
          }
        } catch (error) {
          console.error('[TestSuites] Failed to load screenshot:', error)
          // Continue without this screenshot
        }
      }
    }

    setEditTest({
      name: test.name,
      description: test.description || '',
      tags: test.tags || [],
      steps: test.steps || [],
      screenshots,
      prerequisites: test.prerequisites || []
    })

    // Convert test case to YAML
    try {
      const yamlResult = await window.api.script.fromTestCase(test.id, selectedSuite?.id || '', 'yaml')
      if (yamlResult.success && yamlResult.script) {
        setYamlContent(yamlResult.script)
        setYamlValidation({ valid: true, errors: [] })
      }
    } catch (error) {
      console.error('[TestSuites] Failed to convert test to YAML:', error)
      setYamlContent('# Failed to convert test case to YAML')
      setYamlValidation({ valid: false, errors: ['Failed to convert test case to YAML'] })
    }

    setEditTestTab('steps')
    setShowEditTestDialog(true)
  }

  const updateTestCase = async () => {
    if (!editingTest || !selectedSuite) {
      return
    }

    try {
      let updateData: any

      // If editing in YAML tab, parse YAML and use that
      if (editTestTab === 'yaml') {
        if (!yamlValidation?.valid) {
          toast.warning('Please fix YAML validation errors before saving')
          return
        }

        // Parse YAML to TestCase
        const parseResult = await window.api.script.toTestCase(yamlContent, selectedSuite.id, {
          name: editTest.name,
          description: editTest.description,
          tags: editTest.tags
        })

        if (!parseResult.success || !parseResult.testCase) {
          toast.error('Failed to parse YAML: ' + (parseResult.error || 'Unknown error'))
          return
        }

        updateData = {
          name: parseResult.testCase.name,
          description: parseResult.testCase.description,
          tags: parseResult.testCase.tags,
          steps: parseResult.testCase.steps,
          prerequisites: parseResult.testCase.prerequisites
        }
      } else {
        // Use form data
        if (!editTest.name.trim()) {
          toast.warning('Please enter a test name')
          return
        }

        updateData = {
          name: editTest.name,
          description: editTest.description,
          tags: editTest.tags,
          steps: editTest.steps,
          prerequisites: editTest.prerequisites
        }
      }

      const result = await window.api.testCase.update(selectedSuite.id, editingTest.id, updateData)

      if (result.success) {
        await loadSuiteTests(selectedSuite)
        setShowEditTestDialog(false)
        setEditingTest(null)
        setEditTest({ name: '', description: '', tags: [], steps: [], screenshots: [], prerequisites: [] })
        setYamlContent('')
        setYamlValidation(null)
        toast.success('Test case updated successfully!', 'Test Updated')
      }
    } catch (error) {
      console.error('Failed to update test case:', error)
      toast.error('Failed to update test case')
    }
  }

  const updateStepDescription = (stepIndex: number, newDescription: string) => {
    const updatedSteps = [...editTest.steps]
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      description: newDescription
    }
    setEditTest({ ...editTest, steps: updatedSteps })
  }

  const deleteStep = (stepIndex: number) => {
    setConfirmDialog({
      show: true,
      title: 'Delete Step',
      message: 'Are you sure you want to delete this step?',
      onConfirm: () => {
        setConfirmDialog({ ...confirmDialog, show: false })
        const updatedSteps = editTest.steps.filter((_, index) => index !== stepIndex)
        setEditTest({ ...editTest, steps: updatedSteps })
      }
    })
  }

  const deleteTestCase = async (testId: string) => {
    if (!selectedSuite) return

    setConfirmDialog({
      show: true,
      title: 'Delete Test Case',
      message: 'Are you sure you want to delete this test case? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, show: false })
        try {
          const result = await window.api.testCase.delete(selectedSuite.id, testId)
          if (result.success) {
            await loadSuiteTests(selectedSuite)
            toast.success('Test case deleted', 'Deleted')
          }
        } catch (error) {
          console.error('Failed to delete test case:', error)
          toast.error('Failed to delete test case')
        }
      }
    })
  }

  const downloadScreenshotWithIndicator = async (step: any): Promise<void> => {
    if (!step.screenshot) return

    // Create a canvas to draw the screenshot with indicator
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Create image from base64 (handle both formats)
    const img = new Image()
    const screenshot = step.screenshot.startsWith('data:')
      ? step.screenshot
      : `data:image/png;base64,${step.screenshot}`
    img.src = screenshot

    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width
      canvas.height = img.height

      // Draw the screenshot
      ctx.drawImage(img, 0, 0)

      // Draw indicator based on action type
      if (step.type === 'tap' && step.target && typeof step.target.x === 'number' && typeof step.target.y === 'number') {
        const x = step.target.x
        const y = step.target.y

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
      } else if (step.type === 'swipe' && step.target) {
        // Draw swipe indicator with three circles showing movement
        const x1 = step.target.x1
        const y1 = step.target.y1
        const x2 = step.target.x2
        const y2 = step.target.y2

        if (typeof x1 === 'number' && typeof y1 === 'number' && typeof x2 === 'number' && typeof y2 === 'number') {
          // Calculate direction
          const dx = x2 - x1
          const dy = y2 - y1
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
        a.download = `step_${step.type}_${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading suites...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Test Suites</h2>
            <p className="text-sm text-muted-foreground">
              Organize your test cases into suites
            </p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Suite
          </button>
        </div>
      </div>

      {/* Two-panel layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex overflow-hidden">
          {/* Suites Panel */}
          <div className="w-1/3 border-r border-border overflow-auto p-6">
        {suites.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <FolderKanban className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No test suites yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first test suite to organize your test cases
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Suite
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {suites.map((suite) => (
              <DroppableSuiteItem
                key={suite.id}
                suite={suite}
                isActive={selectedSuite?.id === suite.id}
                onClick={() => loadSuiteTests(suite)}
                onEdit={(e) => {
                  e.stopPropagation()
                  openEditDialog(suite)
                }}
                onDuplicate={(e) => {
                  e.stopPropagation()
                  duplicateSuite(suite.id)
                }}
                onDelete={(e) => {
                  e.stopPropagation()
                  deleteSuite(suite.id)
                }}
                onValidate={(e) => {
                  e.stopPropagation()
                  setValidatingSuite(suite)
                  setShowValidationDialog(true)
                }}
                onRun={(e) => {
                  e.stopPropagation()
                  runSuite(suite)
                }}
              />
            ))}
          </div>
        )}
        </div>

        {/* Tests Panel */}
        <div className="flex-1 overflow-auto p-6">
          {!selectedSuite ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <FolderKanban className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No suite selected
              </h3>
              <p className="text-sm text-muted-foreground">
                Click on a suite to view its test cases
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {selectedSuite.name} - Test Cases
              </h3>
              {loadingTests ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : suiteTests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">No test cases in this suite yet</p>
                </div>
              ) : (
                <SortableContext
                  items={suiteTests.map(t => `${selectedSuite.id}_${t.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2">
                      {suiteTests.map((test) => (
                        <SortableTestItem key={`${selectedSuite.id}_${test.id}`} test={test} uniqueId={`${selectedSuite.id}_${test.id}`}>
                          <div className="border border-border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground mb-1">{test.name}</h4>
                                {test.description && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {test.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{test.steps?.length || 0} steps</span>
                                  {test.tags && test.tags.length > 0 && (
                                    <>
                                      <span>•</span>
                                      <div className="flex gap-1">
                                        {test.tags.slice(0, 3).map((tag: string) => (
                                          <span
                                            key={tag}
                                            className="px-2 py-0.5 rounded bg-muted text-muted-foreground"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-4">
                                <button
                                  onClick={() => openEditTestDialog(test)}
                                  className="p-2 rounded hover:bg-muted transition-colors"
                                  title="Edit test case"
                                >
                                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => deleteTestCase(test.id)}
                                  className="p-2 rounded hover:bg-destructive/10 transition-colors"
                                  title="Delete test case"
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </SortableTestItem>
                      ))}
                    </div>
                  </SortableContext>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DragOverlay renders the dragged item in a portal with high z-index */}
      <DragOverlay>
        {activeId ? (
          <div className="bg-card border-2 border-primary rounded-lg p-4 shadow-2xl opacity-90">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div className="font-medium">
                {(() => {
                  const testId = activeId.replace(`${selectedSuite?.id}_`, '')
                  const test = suiteTests.find(t => t.id === testId)
                  return test?.name || 'Test'
                })()}
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>

      {/* Create Suite Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Create New Test Suite
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Suite Name *
                </label>
                <input
                  type="text"
                  value={newSuite.name}
                  onChange={(e) => setNewSuite({ ...newSuite, name: e.target.value })}
                  placeholder="e.g., Login Flow Tests"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={newSuite.description}
                  onChange={(e) => setNewSuite({ ...newSuite, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Environment
                </label>
                <select
                  value={newSuite.environment}
                  onChange={(e) =>
                    setNewSuite({
                      ...newSuite,
                      environment: e.target.value as 'Development' | 'Staging' | 'Production' | 'Other'
                    })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                >
                  <option value="Development">Development</option>
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={createSuite}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Create Suite
              </button>
              <button
                onClick={() => {
                  setShowCreateDialog(false)
                  setNewSuite({ name: '', description: '', environment: 'Development' })
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Suite Dialog */}
      {showEditDialog && editingSuite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Edit Test Suite
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Suite Name *
                </label>
                <input
                  type="text"
                  value={editSuite.name}
                  onChange={(e) => setEditSuite({ ...editSuite, name: e.target.value })}
                  placeholder="e.g., Login Flow Tests"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={editSuite.description}
                  onChange={(e) => setEditSuite({ ...editSuite, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Environment
                </label>
                <select
                  value={editSuite.environment}
                  onChange={(e) =>
                    setEditSuite({
                      ...editSuite,
                      environment: e.target.value as 'Development' | 'Staging' | 'Production' | 'Other'
                    })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                >
                  <option value="Development">Development</option>
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={updateSuite}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditDialog(false)
                  setEditingSuite(null)
                  setEditSuite({ name: '', description: '', environment: 'Development' })
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Test Case Dialog */}
      {showEditTestDialog && editingTest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Edit Test Case
              </h3>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Basic Info - Hidden when in Script tab */}
              {editTestTab !== 'yaml' && (
                <div className="p-6 border-b border-border space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Test Name *
                    </label>
                    <input
                      type="text"
                      value={editTest.name}
                      onChange={(e) => setEditTest({ ...editTest, name: e.target.value })}
                      placeholder="e.g., User Login"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description
                    </label>
                    <textarea
                      value={editTest.description}
                      onChange={(e) => setEditTest({ ...editTest, description: e.target.value })}
                      placeholder="Optional description..."
                      rows={2}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={editTest.tags.join(', ')}
                      onChange={(e) => setEditTest({
                        ...editTest,
                        tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                      })}
                      placeholder="smoke, regression, login"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Separate tags with commas
                    </p>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Tab Headers */}
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setEditTestTab('steps')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                      editTestTab === 'steps'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Steps ({editTest.steps.length})
                  </button>
                  <button
                    onClick={() => setEditTestTab('prerequisites')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 relative ${
                      editTestTab === 'prerequisites'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Prerequisites ({editTest.prerequisites.length})
                    {editTest.prerequisites.length > 0 && (
                      <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                        {editTest.prerequisites.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setEditTestTab('yaml')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                      editTestTab === 'yaml'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Script
                  </button>
                </div>

                {/* Tab Content */}
                <div className={`flex-1 p-6 ${editTestTab === 'yaml' ? 'overflow-hidden' : 'overflow-auto'}`}>
                  {editTestTab === 'steps' && (
                    <div>
                      {editTest.steps.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                          No steps recorded
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {editTest.steps.map((step: any, index: number) => (
                            <StepItem
                              key={index}
                              step={step}
                              index={index}
                              onDelete={() => deleteStep(index)}
                              onUpdateDescription={(desc) => updateStepDescription(index, desc)}
                              onViewDetail={(screenshot) => {
                                setSelectedStepForView({ ...step, stepIndex: index, screenshot })
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {editTestTab === 'prerequisites' && (
                    <PrerequisitesEditor
                      testCaseId={editingTest?.id || ''}
                      prerequisites={editTest.prerequisites}
                      onUpdate={(prerequisites) => setEditTest({ ...editTest, prerequisites })}
                    />
                  )}

                  {editTestTab === 'yaml' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Edit your test case in YAML format. Changes will be applied when you save.
                        </p>
                        {yamlValidation && (
                          yamlValidation.valid ? (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 className="w-3 h-3" />
                              Valid YAML
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-destructive">
                              <X className="w-3 h-3" />
                              {yamlValidation.errors.length} error(s)
                            </div>
                          )
                        )}
                      </div>

                      <textarea
                        value={yamlContent}
                        onChange={async (e) => {
                          const newContent = e.target.value
                          setYamlContent(newContent)

                          // Validate YAML in real-time (debounced)
                          try {
                            const result = await window.api.script.validate(newContent, 'yaml')
                            if (result.success && result.validation) {
                              setYamlValidation({
                                valid: result.validation.valid,
                                errors: result.validation.errors.map((e: any) => e.message)
                              })
                            }
                          } catch (error) {
                            setYamlValidation({
                              valid: false,
                              errors: ['Failed to validate YAML']
                            })
                          }
                        }}
                        className="w-full h-[650px] p-4 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm resize-none focus:outline-none rounded-lg border border-border"
                        style={{
                          fontFamily: 'Consolas, "Courier New", monospace',
                          fontSize: '13px',
                          lineHeight: '1.5',
                          tabSize: 2
                        }}
                        spellCheck={false}
                      />

                      {/* Validation Errors */}
                      {yamlValidation && !yamlValidation.valid && yamlValidation.errors.length > 0 && (
                        <div className="border border-destructive/20 bg-destructive/10 rounded-lg p-3">
                          <p className="text-sm font-medium text-destructive mb-2">Validation Errors:</p>
                          <ul className="list-disc list-inside text-xs text-destructive/80 space-y-0.5">
                            {yamlValidation.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex items-center gap-2">
              <button
                onClick={updateTestCase}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditTestDialog(false)
                  setEditingTest(null)
                  setEditTest({ name: '', description: '', tags: [], steps: [], screenshots: [], prerequisites: [] })
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Viewer Modal */}
      {showScreenshotViewer && editTest.screenshots && editTest.screenshots.length > 0 && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center"
          onClick={() => {
            setShowScreenshotViewer(false)
            setSelectedScreenshotIndex(0)
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ScreenshotViewer
              screenshots={editTest.screenshots}
              title={`${editingTest?.name} - Screenshots`}
              initialIndex={selectedScreenshotIndex}
              onClose={() => {
                setShowScreenshotViewer(false)
                setSelectedScreenshotIndex(0) // Reset to first screenshot when closing
              }}
            />
          </div>
        </div>
      )}

      {/* Step Detail Modal (like recording view) */}
      {selectedStepForView && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-4"
          onClick={() => setSelectedStepForView(null)}
        >
          <button
            onClick={() => setSelectedStepForView(null)}
            className="absolute top-4 right-4 p-3 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg z-10"
            title="Close (ESC)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Help hint */}
          <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-3 py-2 rounded-lg z-10">
            Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded">ESC</kbd> to close
          </div>

          <div className="max-w-6xl w-full h-full flex gap-4 items-center justify-center p-8" onClick={(e) => e.stopPropagation()}>
            {/* Screenshot with indicators */}
            {selectedStepForView.screenshot && (
              <div className="flex-shrink-0" style={{ maxHeight: '90vh', maxWidth: '50vw' }}>
                <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl h-full">
                  <img
                    src={selectedStepForView.screenshot}
                    alt="Step screenshot"
                    className="max-h-[90vh] max-w-full object-contain"
                  />

                  {/* Visual indicator for tap actions */}
                  {selectedStepForView.type === 'tap' && selectedStepForView.target &&
                   typeof selectedStepForView.target.x === 'number' && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: `${(selectedStepForView.target.x / 1080) * 100}%`,
                        top: `${(selectedStepForView.target.y / 2400) * 100}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <div className="w-16 h-16 rounded-full border-4 border-red-500 bg-red-500/20 flex items-center justify-center animate-pulse">
                        <span className="text-3xl">👆</span>
                      </div>
                    </div>
                  )}

                  {/* Visual indicator for swipe actions */}
                  {selectedStepForView.type === 'swipe' && selectedStepForView.target &&
                   typeof selectedStepForView.target.x1 === 'number' &&
                   typeof selectedStepForView.target.y1 === 'number' &&
                   typeof selectedStepForView.target.x2 === 'number' &&
                   typeof selectedStepForView.target.y2 === 'number' && (
                    <>
                      {/* Three circles showing swipe movement */}
                      {[0, 0.5, 1].map((t, i) => {
                        const x = selectedStepForView.target.x1 + (selectedStepForView.target.x2 - selectedStepForView.target.x1) * t
                        const y = selectedStepForView.target.y1 + (selectedStepForView.target.y2 - selectedStepForView.target.y1) * t
                        const size = 12 + i * 2
                        const opacity = 30 + i * 35

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
                              className="rounded-full border-3 border-red-500"
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
                          left: `${(selectedStepForView.target.x2 / 1080) * 100}%`,
                          top: `${(selectedStepForView.target.y2 / 2400) * 100}%`,
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

            {/* Step Details Panel */}
            <div className="w-80 bg-card border border-border rounded-lg p-4 max-h-[75vh] overflow-y-auto">
              <div className="flex items-start gap-2 mb-3">
                <div className="text-2xl">
                  {selectedStepForView.type === 'tap' && '👆'}
                  {selectedStepForView.type === 'swipe' && '👉'}
                  {selectedStepForView.type === 'wait' && '⏱️'}
                  {selectedStepForView.type === 'screenshot' && '📸'}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Step {(selectedStepForView.stepIndex || 0) + 1}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedStepForView.description || 'No description'}
                  </p>
                </div>
              </div>

              {/* Download button */}
              {selectedStepForView.screenshot && (
                <button
                  onClick={() => downloadScreenshotWithIndicator(selectedStepForView)}
                  className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Download Screenshot</span>
                </button>
              )}

              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Type</p>
                  <p className="text-sm text-foreground capitalize">{selectedStepForView.type}</p>
                </div>

                {selectedStepForView.elementPath && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Element</p>
                    <p className="text-sm text-foreground font-mono text-xs break-all">
                      {selectedStepForView.elementPath}
                    </p>
                    {selectedStepForView.elementType && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                        {selectedStepForView.elementType}
                      </span>
                    )}
                  </div>
                )}

                {selectedStepForView.target && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Target Data</p>
                    <pre className="text-xs text-foreground font-mono overflow-x-auto">
                      {JSON.stringify(selectedStepForView.target, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
          onClick={() => setConfirmDialog({ ...confirmDialog, show: false })}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">{confirmDialog.title}</h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-muted-foreground">{confirmDialog.message}</p>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, show: false })}
                className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent text-foreground font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suite Validation Dialog */}
      {showValidationDialog && validatingSuite && (
        <SuiteValidationDialog
          suiteId={validatingSuite.id}
          suiteName={validatingSuite.name}
          onClose={() => {
            setShowValidationDialog(false)
            setValidatingSuite(null)
          }}
          onFixApplied={() => {
            loadSuites()
            if (selectedSuite) {
              loadSuiteTests(selectedSuite)
            }
          }}
        />
      )}
    </div>
  )
}
