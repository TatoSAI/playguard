import { useState, useEffect } from 'react'
import { FolderKanban, Plus, ChevronRight, AlertCircle } from 'lucide-react'
import { useToast } from '../Common/ToastProvider'

interface TestSuite {
  id: string
  name: string
  description?: string
  environment: 'Development' | 'Staging' | 'Production' | 'Other'
  tags: string[]
  testCaseIds: string[]
}

interface SuiteSelectorProps {
  onSelect: (suiteId: string) => void
  onCancel?: () => void
}

export default function SuiteSelector({ onSelect, onCancel }: SuiteSelectorProps) {
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newSuite, setNewSuite] = useState({
    name: '',
    description: '',
    environment: 'Development' as const
  })
  const [creating, setCreating] = useState(false)
  const toast = useToast()

  useEffect(() => {
    loadSuites()
  }, [])

  const loadSuites = async () => {
    try {
      setLoading(true)
      const result = await window.api.suite.list()
      if (result.success) {
        const suitesList = result.suites || []
        setSuites(suitesList)

        // Auto-select first suite if available
        if (suitesList.length > 0 && !selectedSuiteId) {
          setSelectedSuiteId(suitesList[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load suites:', error)
    } finally {
      setLoading(false)
    }
  }

  const createAndSelectSuite = async () => {
    if (!newSuite.name.trim()) {
      toast.warning('Please enter a suite name')
      return
    }

    try {
      setCreating(true)
      const result = await window.api.suite.create({
        name: newSuite.name,
        description: newSuite.description,
        environment: newSuite.environment,
        tags: [],
        testCaseIds: []
      })

      if (result.success && result.suite) {
        // Immediately select the newly created suite
        onSelect(result.suite.id)
      }
    } catch (error) {
      console.error('Failed to create suite:', error)
      toast.error('Failed to create suite')
    } finally {
      setCreating(false)
    }
  }

  const handleConfirm = () => {
    if (!selectedSuiteId) {
      toast.warning('Please select a test suite')
      return
    }
    onSelect(selectedSuiteId)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading test suites...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Select Test Suite
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose which suite this test will belong to
              </p>
            </div>
          </div>

          {suites.length === 0 && !showCreateForm && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-500">
                No test suites found. Create your first suite to start recording.
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {!showCreateForm ? (
            <>
              {/* Suite List */}
              {suites.length > 0 && (
                <div className="space-y-2 mb-4">
                  {suites.map((suite) => (
                    <label
                      key={suite.id}
                      className={`
                        block p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${
                          selectedSuiteId === suite.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="suite"
                          value={suite.id}
                          checked={selectedSuiteId === suite.id}
                          onChange={(e) => setSelectedSuiteId(e.target.value)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground">
                              {suite.name}
                            </h3>
                            <span className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">
                              {suite.environment}
                            </span>
                          </div>
                          {suite.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {suite.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{suite.testCaseIds.length} tests</span>
                            {suite.tags.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{suite.tags.length} tags</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Create New Suite Button */}
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full p-4 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Create New Suite</span>
              </button>
            </>
          ) : (
            /* Create Suite Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Suite Name *
                </label>
                <input
                  type="text"
                  value={newSuite.name}
                  onChange={(e) => setNewSuite({ ...newSuite, name: e.target.value })}
                  placeholder="e.g., Login Flow Tests"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={newSuite.description}
                  onChange={(e) => setNewSuite({ ...newSuite, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
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
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Development">Development</option>
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={createAndSelectSuite}
                  disabled={creating || !newSuite.name.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create & Select
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewSuite({ name: '', description: '', environment: 'Development' })
                  }}
                  disabled={creating}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showCreateForm && (
          <div className="border-t border-border p-6 flex items-center justify-between gap-4">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleConfirm}
                disabled={!selectedSuiteId}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
