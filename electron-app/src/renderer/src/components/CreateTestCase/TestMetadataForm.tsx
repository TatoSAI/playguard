/**
 * TestMetadataForm Component
 * Shared form for test case metadata (name, description, tags, suite)
 * Used across all creation modes
 */

import { useState, useEffect } from 'react'
import { Sparkles, X, Plus } from 'lucide-react'

interface Props {
  testName: string
  testDescription: string
  testTags: string[]
  selectedSuiteId: string
  onTestNameChange: (name: string) => void
  onTestDescriptionChange: (description: string) => void
  onTestTagsChange: (tags: string[]) => void
  onSelectedSuiteIdChange: (suiteId: string) => void
  onSuitesLoaded?: (suites: any[]) => void
  showAIAssist?: boolean
}

export function TestMetadataForm({
  testName,
  testDescription,
  testTags,
  selectedSuiteId,
  onTestNameChange,
  onTestDescriptionChange,
  onTestTagsChange,
  onSelectedSuiteIdChange,
  onSuitesLoaded,
  showAIAssist = true
}: Props) {
  const [suites, setSuites] = useState<any[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showCreateSuite, setShowCreateSuite] = useState(false)
  const [newSuiteName, setNewSuiteName] = useState('')
  const [newSuiteDescription, setNewSuiteDescription] = useState('')
  const [newSuitePlatform, setNewSuitePlatform] = useState<'Android' | 'iOS' | 'Web' | 'Cross-platform'>('Android')
  const [isCreatingSuite, setIsCreatingSuite] = useState(false)

  useEffect(() => {
    loadSuites()
  }, [])

  // Refresh suites when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSuites()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const loadSuites = async () => {
    try {
      const result = await window.api.suite.list()

      // Extract suites from result object
      const suiteList = result?.suites || []

      // Ensure suiteList is an array
      const validSuiteList = Array.isArray(suiteList) ? suiteList : []
      setSuites(validSuiteList)

      // Notify parent component
      if (onSuitesLoaded) {
        onSuitesLoaded(validSuiteList)
      }

      // Auto-select first suite if none selected
      if (!selectedSuiteId && validSuiteList.length > 0) {
        onSelectedSuiteIdChange(validSuiteList[0].id)
      }
    } catch (error) {
      console.error('[TestMetadataForm] Failed to load suites:', error)
      setSuites([]) // Set empty array on error
    }
  }

  const handleCreateSuite = async () => {
    if (!newSuiteName.trim()) return

    setIsCreatingSuite(true)
    try {
      const result = await window.api.suite.create({
        name: newSuiteName,
        description: newSuiteDescription,
        targetPlatform: newSuitePlatform
      })

      if (result.success && result.suite) {
        // Reload suites
        await loadSuites()
        // Auto-select the new suite
        onSelectedSuiteIdChange(result.suite.id)
        // Close modal
        setShowCreateSuite(false)
        setNewSuiteName('')
        setNewSuiteDescription('')
        setNewSuitePlatform('Android')
      }
    } catch (error) {
      console.error('Failed to create suite:', error)
    } finally {
      setIsCreatingSuite(false)
    }
  }

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !testTags.includes(trimmed)) {
      onTestTagsChange([...testTags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    onTestTagsChange(testTags.filter((t) => t !== tag))
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleAISuggestDescription = async () => {
    // TODO: Implement AI description generation
    console.log('AI suggest description')
  }

  const handleAISuggestTags = async () => {
    // TODO: Implement AI tag suggestions
    console.log('AI suggest tags')
  }

  return (
    <div className="space-y-4">
      {/* Test Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Test Name <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={testName}
          onChange={(e) => onTestNameChange(e.target.value)}
          placeholder="e.g., Login Flow Test"
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>

      {/* Test Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-foreground">
            Description
          </label>
          {showAIAssist && (
            <button
              onClick={handleAISuggestDescription}
              className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
              title="AI suggest description"
            >
              <Sparkles className="w-3 h-3" />
              AI Suggest
            </button>
          )}
        </div>
        <textarea
          value={testDescription}
          onChange={(e) => onTestDescriptionChange(e.target.value)}
          placeholder="Describe what this test verifies..."
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-foreground">Tags</label>
          {showAIAssist && (
            <button
              onClick={handleAISuggestTags}
              className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
              title="AI suggest tags"
            >
              <Sparkles className="w-3 h-3" />
              AI Suggest
            </button>
          )}
        </div>

        {/* Tag chips */}
        {testTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {testTags.map((tag) => (
              <div
                key={tag}
                className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm"
              >
                <span>{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tag input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            placeholder="Add tags (e.g., smoke, critical, authentication)"
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleAddTag}
            disabled={!tagInput.trim()}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Target Suite */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-foreground">
            Target Suite <span className="text-destructive">*</span>
          </label>
          <button
            onClick={() => setShowCreateSuite(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
            title="Create new suite"
          >
            <Plus className="w-3 h-3" />
            New Suite
          </button>
        </div>
        <select
          value={selectedSuiteId}
          onChange={(e) => onSelectedSuiteIdChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
        >
          <option value="">Select a suite...</option>
          {suites.map((suite) => (
            <option key={suite.id} value={suite.id}>
              {suite.name}
            </option>
          ))}
        </select>
        {suites.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            No suites found. Click "New Suite" to create one.
          </p>
        )}
      </div>

      {/* Create Suite Modal */}
      {showCreateSuite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg shadow-lg w-[400px] p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Create New Suite</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Suite Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={newSuiteName}
                  onChange={(e) => setNewSuiteName(e.target.value)}
                  placeholder="e.g., Smoke Tests"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={newSuiteDescription}
                  onChange={(e) => setNewSuiteDescription(e.target.value)}
                  placeholder="Describe this test suite..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Target Platform <span className="text-destructive">*</span>
                </label>
                <select
                  value={newSuitePlatform}
                  onChange={(e) => setNewSuitePlatform(e.target.value as 'Android' | 'iOS' | 'Web' | 'Cross-platform')}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Android">Android</option>
                  <option value="iOS">iOS (Coming Soon)</option>
                  <option value="Web">Web (Coming Soon)</option>
                  <option value="Cross-platform">Cross-platform</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select the operating system this suite targets
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowCreateSuite(false)
                    setNewSuiteName('')
                    setNewSuiteDescription('')
                  }}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSuite}
                  disabled={!newSuiteName.trim() || isCreatingSuite}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingSuite ? 'Creating...' : 'Create Suite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
