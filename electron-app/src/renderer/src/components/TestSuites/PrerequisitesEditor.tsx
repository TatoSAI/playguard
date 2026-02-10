/**
 * Prerequisites Editor Component
 *
 * Allows users to add, edit, and remove prerequisites from test cases
 */

import { useState, useEffect } from 'react'
import { Plus, Trash2, AlertTriangle, CheckCircle2, XCircle, Settings } from 'lucide-react'
import { useToast } from '../Common/ToastProvider'
import { StateSetupActionEditor } from './StateSetupActionEditor'
import { CleanupActionEditor } from './CleanupActionEditor'

// Prerequisite types
type PrerequisiteType = 'setup_profile' | 'test_dependency' | 'state_setup' | 'cleanup'

interface BasePrerequisite {
  id: string
  type: PrerequisiteType
  name: string
  description?: string
  enabled: boolean
  timeout?: number
}

interface SetupProfilePrerequisite extends BasePrerequisite {
  type: 'setup_profile'
  setupProfileId: string
}

interface TestDependencyPrerequisite extends BasePrerequisite {
  type: 'test_dependency'
  testCaseId: string
  useCache: boolean
  cacheExpiry?: number
}

interface StateSetupPrerequisite extends BasePrerequisite {
  type: 'state_setup'
  actions: any[]
}

interface CleanupPrerequisite extends BasePrerequisite {
  type: 'cleanup'
  actions: any[]
}

type Prerequisite = SetupProfilePrerequisite | TestDependencyPrerequisite | StateSetupPrerequisite | CleanupPrerequisite

interface ValidationIssue {
  type: string
  severity: 'error' | 'warning'
  message: string
  suggestedFix?: {
    description: string
    autoApplicable: boolean
  }
}

interface Props {
  testCaseId: string
  prerequisites: Prerequisite[]
  onUpdate: (prerequisites: Prerequisite[]) => void
}

export function PrerequisitesEditor({ testCaseId, prerequisites = [], onUpdate }: Props) {
  const { toast } = useToast()
  const [localPrereqs, setLocalPrereqs] = useState<Prerequisite[]>(prerequisites)
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [setupProfiles, setSetupProfiles] = useState<any[]>([])
  const [availableTests, setAvailableTests] = useState<any[]>([])
  const [isValidating, setIsValidating] = useState(false)

  // Load setup profiles and available tests
  useEffect(() => {
    loadSetupProfiles()
    loadAvailableTests()
  }, [])

  // Validate when prerequisites change
  useEffect(() => {
    validatePrerequisites()
  }, [localPrereqs])

  // Update parent when local changes
  useEffect(() => {
    setLocalPrereqs(prerequisites)
  }, [prerequisites])

  const loadSetupProfiles = async () => {
    try {
      const result = await window.api.setup.getAllProfiles()
      if (result.success && result.profiles) {
        setSetupProfiles(result.profiles)
      }
    } catch (error) {
      console.error('Failed to load setup profiles:', error)
    }
  }

  const loadAvailableTests = async () => {
    try {
      const result = await window.api.suite.list()
      if (result.success && result.suites) {
        // Get all test cases from all suites
        const allTests: any[] = []
        for (const suite of result.suites) {
          const testsResult = await window.api.testCase.list(suite.id)
          if (testsResult.success && testsResult.testCases) {
            allTests.push(...testsResult.testCases.filter((tc: any) => tc.id !== testCaseId))
          }
        }
        setAvailableTests(allTests)
      }
    } catch (error) {
      console.error('Failed to load available tests:', error)
    }
  }

  const validatePrerequisites = async () => {
    if (!testCaseId || localPrereqs.length === 0) {
      setValidationIssues([])
      return
    }

    setIsValidating(true)
    try {
      const result = await window.api.prerequisites.validateTestCase(testCaseId)
      if (result.success && result.result) {
        setValidationIssues(result.result.issues || [])
      }
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const addPrerequisite = (prerequisite: Prerequisite) => {
    const updated = [...localPrereqs, prerequisite]
    setLocalPrereqs(updated)
    onUpdate(updated)
    setShowAddDialog(false)
    toast.success(`Prerequisite "${prerequisite.name}" added`)
  }

  const removePrerequisite = (id: string) => {
    const updated = localPrereqs.filter((p) => p.id !== id)
    setLocalPrereqs(updated)
    onUpdate(updated)
    toast.success('Prerequisite removed')
  }

  const toggleEnabled = (id: string) => {
    const updated = localPrereqs.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    )
    setLocalPrereqs(updated)
    onUpdate(updated)
  }

  const updatePrerequisite = (id: string, updates: Partial<Prerequisite>) => {
    const updated = localPrereqs.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    )
    setLocalPrereqs(updated)
    onUpdate(updated)
  }

  const getPrerequisiteIcon = (type: PrerequisiteType) => {
    switch (type) {
      case 'setup_profile':
        return '⚙️'
      case 'test_dependency':
        return '🔗'
      case 'state_setup':
        return '🎬'
      case 'cleanup':
        return '🧹'
      default:
        return '📋'
    }
  }

  const getPrerequisiteTypeLabel = (type: PrerequisiteType) => {
    switch (type) {
      case 'setup_profile':
        return 'Setup Profile'
      case 'test_dependency':
        return 'Test Dependency'
      case 'state_setup':
        return 'State Setup'
      case 'cleanup':
        return 'Cleanup'
      default:
        return type
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground">
            Prerequisites ({localPrereqs.length})
          </h4>
          {isValidating && (
            <div className="text-xs text-muted-foreground">Validating...</div>
          )}
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Prerequisite
        </button>
      </div>

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <div className="space-y-2">
          {validationIssues.map((issue, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${
                issue.severity === 'error'
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-yellow-500/10 border-yellow-500/30'
              }`}
            >
              <div className="flex items-start gap-2">
                {issue.severity === 'error' ? (
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{issue.message}</p>
                  {issue.suggestedFix && issue.suggestedFix.autoApplicable && (
                    <button
                      className="text-xs text-primary hover:underline mt-1"
                      onClick={() => {
                        // TODO: Implement auto-fix
                        toast.info('Auto-fix coming soon!')
                      }}
                    >
                      {issue.suggestedFix.description}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Prerequisites List */}
      {localPrereqs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm">No prerequisites added</p>
          <p className="text-xs mt-1">Prerequisites are optional but will be enforced when added</p>
        </div>
      ) : (
        <div className="space-y-2">
          {localPrereqs.map((prereq, index) => (
            <PrerequisiteItem
              key={prereq.id}
              prerequisite={prereq}
              index={index}
              setupProfiles={setupProfiles}
              availableTests={availableTests}
              onToggleEnabled={() => toggleEnabled(prereq.id)}
              onRemove={() => removePrerequisite(prereq.id)}
              onUpdate={(updates) => updatePrerequisite(prereq.id, updates)}
              getIcon={getPrerequisiteIcon}
              getTypeLabel={getPrerequisiteTypeLabel}
            />
          ))}
        </div>
      )}

      {/* Add Prerequisite Dialog */}
      {showAddDialog && (
        <AddPrerequisiteDialog
          setupProfiles={setupProfiles}
          availableTests={availableTests}
          onAdd={addPrerequisite}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  )
}

// Prerequisite Item Component
function PrerequisiteItem({
  prerequisite,
  index,
  setupProfiles,
  availableTests,
  onToggleEnabled,
  onRemove,
  onUpdate,
  getIcon,
  getTypeLabel
}: {
  prerequisite: Prerequisite
  index: number
  setupProfiles: any[]
  availableTests: any[]
  onToggleEnabled: () => void
  onRemove: () => void
  onUpdate: (updates: Partial<Prerequisite>) => void
  getIcon: (type: PrerequisiteType) => string
  getTypeLabel: (type: PrerequisiteType) => string
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getDetailText = () => {
    switch (prerequisite.type) {
      case 'setup_profile':
        const profile = setupProfiles.find((p) => p.id === prerequisite.setupProfileId)
        return profile ? profile.name : 'Unknown profile'
      case 'test_dependency':
        const test = availableTests.find((t) => t.id === prerequisite.testCaseId)
        return test ? test.name : 'Unknown test'
      case 'state_setup':
        return `${prerequisite.actions.length} action(s)`
      case 'cleanup':
        return `${prerequisite.actions.length} action(s)`
      default:
        return ''
    }
  }

  return (
    <div
      className={`border rounded-lg p-3 ${
        prerequisite.enabled
          ? 'border-border bg-background'
          : 'border-muted bg-muted/20 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">{getIcon(prerequisite.type)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {getTypeLabel(prerequisite.type)}
                </span>
                {prerequisite.type === 'test_dependency' && prerequisite.useCache && (
                  <span className="text-xs bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">
                    Cached
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-foreground">{prerequisite.name}</div>
              <div className="text-xs text-muted-foreground">{getDetailText()}</div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onToggleEnabled}
                className={`p-1.5 rounded transition-colors ${
                  prerequisite.enabled
                    ? 'hover:bg-background text-green-500'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
                title={prerequisite.enabled ? 'Disable' : 'Enable'}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button
                onClick={onRemove}
                className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {prerequisite.description && (
            <p className="text-xs text-muted-foreground mt-2">{prerequisite.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Add Prerequisite Dialog Component
function AddPrerequisiteDialog({
  setupProfiles,
  availableTests,
  onAdd,
  onClose
}: {
  setupProfiles: any[]
  availableTests: any[]
  onAdd: (prerequisite: Prerequisite) => void
  onClose: () => void
}) {
  const [selectedType, setSelectedType] = useState<PrerequisiteType>('setup_profile')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [setupProfileId, setSetupProfileId] = useState('')
  const [testCaseId, setTestCaseId] = useState('')
  const [useCache, setUseCache] = useState(true)
  const [stateSetupActions, setStateSetupActions] = useState<any[]>([])
  const [cleanupActions, setCleanupActions] = useState<any[]>([])

  const handleAdd = () => {
    if (!name.trim()) {
      return
    }

    let prerequisite: Prerequisite

    switch (selectedType) {
      case 'setup_profile':
        if (!setupProfileId) return
        prerequisite = {
          id: `prereq_${Date.now()}`,
          type: 'setup_profile',
          name: name.trim(),
          description: description.trim() || undefined,
          enabled: true,
          setupProfileId
        }
        break

      case 'test_dependency':
        if (!testCaseId) return
        prerequisite = {
          id: `prereq_${Date.now()}`,
          type: 'test_dependency',
          name: name.trim(),
          description: description.trim() || undefined,
          enabled: true,
          testCaseId,
          useCache
        }
        break

      case 'state_setup':
        prerequisite = {
          id: `prereq_${Date.now()}`,
          type: 'state_setup',
          name: name.trim(),
          description: description.trim() || undefined,
          enabled: true,
          actions: stateSetupActions
        }
        break

      case 'cleanup':
        prerequisite = {
          id: `prereq_${Date.now()}`,
          type: 'cleanup',
          name: name.trim(),
          description: description.trim() || undefined,
          enabled: true,
          actions: cleanupActions
        }
        break

      default:
        return
    }

    onAdd(prerequisite)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-lg">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Add Prerequisite</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <XCircle className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Prerequisite Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'setup_profile' as PrerequisiteType, label: 'Setup Profile', icon: '⚙️' },
                { type: 'test_dependency' as PrerequisiteType, label: 'Test Dependency', icon: '🔗' },
                { type: 'state_setup' as PrerequisiteType, label: 'State Setup', icon: '🎬' },
                { type: 'cleanup' as PrerequisiteType, label: 'Cleanup', icon: '🧹' }
              ].map((option) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedType(option.type)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedType === option.type
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="text-sm font-medium text-foreground">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Reset Device"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground resize-none"
            />
          </div>

          {/* Type-specific fields */}
          {selectedType === 'setup_profile' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Setup Profile *
              </label>
              <select
                value={setupProfileId}
                onChange={(e) => setSetupProfileId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Select a profile</option>
                {setupProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedType === 'test_dependency' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Test Case *
                </label>
                <select
                  value={testCaseId}
                  onChange={(e) => setTestCaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                >
                  <option value="">Select a test case</option>
                  {availableTests.map((test) => (
                    <option key={test.id} value={test.id}>
                      {test.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCache"
                  checked={useCache}
                  onChange={(e) => setUseCache(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="useCache" className="text-sm text-foreground">
                  Use cache (skip if already executed successfully)
                </label>
              </div>
            </>
          )}

          {/* State Setup Actions */}
          {selectedType === 'state_setup' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                State Setup Actions
              </label>
              <StateSetupActionEditor
                actions={stateSetupActions}
                onChange={setStateSetupActions}
              />
            </div>
          )}

          {/* Cleanup Actions */}
          {selectedType === 'cleanup' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Cleanup Actions
              </label>
              <CleanupActionEditor
                actions={cleanupActions}
                onChange={setCleanupActions}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={
              !name.trim() ||
              (selectedType === 'setup_profile' && !setupProfileId) ||
              (selectedType === 'test_dependency' && !testCaseId) ||
              (selectedType === 'state_setup' && stateSetupActions.length === 0) ||
              (selectedType === 'cleanup' && cleanupActions.length === 0)
            }
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Add Prerequisite
          </button>
        </div>
      </div>
    </div>
  )
}
