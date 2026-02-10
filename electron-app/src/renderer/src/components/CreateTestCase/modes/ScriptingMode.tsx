/**
 * ScriptingMode Component
 * Write test cases using YAML scripting language
 */

import { useState, useEffect } from 'react'
import { Save, FileText, AlertCircle, CheckCircle2, Sparkles, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { TestMetadataForm } from '../TestMetadataForm'
import { useToast } from '../../Common/ToastProvider'
import { TemplateLibrary } from './TemplateLibrary'

// GuideItem Component
interface GuideItemProps {
  name: string
  description: string
  example: string
  expanded: boolean
  onToggle: () => void
}

function GuideItem({ name, description, example, expanded, onToggle }: GuideItemProps) {
  return (
    <div className="border border-border rounded overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted transition-colors text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <code className="text-xs font-semibold text-primary">{name}</code>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-muted-foreground flex-shrink-0 ml-2" />
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0 ml-2" />
        )}
      </button>
      {expanded && (
        <div className="px-3 py-2 bg-muted/50 border-t border-border">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {example}
          </pre>
        </div>
      )}
    </div>
  )
}

// Example YAML template (matches TemplateLibrary format)
const DEFAULT_TEMPLATE = `testCase:
  name: "Example Test"
  description: "Describe what this test verifies"
  tags: [smoke, example]
  suite: "Default"

  steps:
    - id: step_1
      action: tap
      target:
        element: "/Canvas/MainMenu/PlayButton"
        fallback: {x: 540, y: 960}
      description: "Tap the Play button"
      validation:
        type: element_exists
        timeout: 3000
      expectedResult: "Play button is tapped successfully"

    - id: step_2
      action: wait
      duration: 2000
      description: "Wait for screen transition"
      expectedResult: "New screen loads"
`

interface Props {
  onSave?: (testCase: any) => void
  onCancel?: () => void
}

export function ScriptingMode({ onSave, onCancel }: Props) {
  const [scriptContent, setScriptContent] = useState(DEFAULT_TEMPLATE)
  const [testName, setTestName] = useState('')
  const [testDescription, setTestDescription] = useState('')
  const [testTags, setTestTags] = useState<string[]>([])
  const [selectedSuiteId, setSelectedSuiteId] = useState('')
  const [suites, setSuites] = useState<any[]>([])
  const [validationStatus, setValidationStatus] = useState<{
    valid: boolean
    errors: string[]
  } | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false)
  const [isUpdatingFromYAML, setIsUpdatingFromYAML] = useState(false)
  const [isUpdatingFromMetadata, setIsUpdatingFromMetadata] = useState(false)

  // Guide state
  const [isGuideExpanded, setIsGuideExpanded] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const toast = useToast()

  const toggleGuide = () => {
    setIsGuideExpanded(prev => !prev)
  }

  const toggleItem = (item: string) => {
    setExpandedItems(prev => ({ ...prev, [item]: !prev[item] }))
  }

  // Suites are loaded via TestMetadataForm's onSuitesLoaded callback

  // Parse metadata from YAML content
  const parseMetadataFromYAML = (yamlContent: string) => {
    try {
      const lines = yamlContent.split('\n')
      let name = ''
      let description = ''
      let tags: string[] = []
      let suiteName = ''
      let inTestCase = false
      let inSteps = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()

        // Track if we're inside testCase or steps
        if (trimmed.startsWith('testCase:')) {
          inTestCase = true
          continue
        }
        if (trimmed.startsWith('steps:')) {
          inSteps = true
          continue
        }

        // Only parse metadata inside testCase and before steps
        if (!inTestCase || inSteps) continue

        // Parse name (must be at root level, 2 spaces indentation)
        if (line.startsWith('  name:') && !line.startsWith('    ')) {
          const match = trimmed.match(/name:\s*["'](.+?)["']/)
          if (match) name = match[1]
        }

        // Parse description (must be at root level, 2 spaces indentation)
        if (line.startsWith('  description:') && !line.startsWith('    ')) {
          const match = trimmed.match(/description:\s*["'](.+?)["']/)
          if (match) description = match[1]
        }

        // Parse tags (must be at root level, 2 spaces indentation)
        if (line.startsWith('  tags:') && !line.startsWith('    ')) {
          const match = trimmed.match(/tags:\s*\[(.+?)\]/)
          if (match) {
            tags = match[1].split(',').map(t => t.trim().replace(/["']/g, ''))
          }
        }

        // Parse suite (must be at root level, 2 spaces indentation)
        if (line.startsWith('  suite:') && !line.startsWith('    ')) {
          const match = trimmed.match(/suite:\s*["'](.+?)["']/)
          if (match) suiteName = match[1]
        }
      }

      return { name, description, tags, suiteName }
    } catch (error) {
      console.error('Failed to parse metadata from YAML:', error)
      return null
    }
  }

  // Update YAML content with new metadata
  const updateYAMLMetadata = (name: string, description: string, tags: string[], suiteName: string) => {
    try {
      let updated = scriptContent

      // Update name
      updated = updated.replace(
        /name:\s*["'].+?["']/,
        `name: "${name}"`
      )

      // Update description
      updated = updated.replace(
        /description:\s*["'].+?["']/,
        `description: "${description}"`
      )

      // Update tags
      const tagsStr = tags.map(t => t).join(', ')
      updated = updated.replace(
        /tags:\s*\[.+?\]/,
        `tags: [${tagsStr}]`
      )

      // Update suite
      updated = updated.replace(
        /suite:\s*["'].*?["']/,
        `suite: "${suiteName}"`
      )

      return updated
    } catch (error) {
      console.error('Failed to update YAML metadata:', error)
      return scriptContent
    }
  }

  // Sync YAML → Metadata (when YAML changes)
  useEffect(() => {
    if (isUpdatingFromMetadata) return
    if (suites.length === 0) return

    const metadata = parseMetadataFromYAML(scriptContent)
    if (metadata) {
      setIsUpdatingFromYAML(true)

      if (metadata.name && metadata.name !== testName) {
        setTestName(metadata.name)
      }
      if (metadata.description && metadata.description !== testDescription) {
        setTestDescription(metadata.description)
      }
      if (metadata.tags.length > 0 && JSON.stringify(metadata.tags) !== JSON.stringify(testTags)) {
        setTestTags(metadata.tags)
      }

      // Convert suite name to suite ID
      if (metadata.suiteName) {
        const suite = suites.find(s => s.name === metadata.suiteName)
        if (suite && suite.id !== selectedSuiteId) {
          setSelectedSuiteId(suite.id)
        }
      }

      setTimeout(() => {
        setIsUpdatingFromYAML(false)
      }, 100)
    }
  }, [scriptContent, suites])

  // Sync Metadata → YAML (when metadata changes)
  useEffect(() => {
    if (isUpdatingFromYAML) return
    if (suites.length === 0) return

    // Don't run on initial mount - wait until testName has a value
    // This prevents overwriting DEFAULT_TEMPLATE with empty values
    if (!testName) {
      return
    }

    setIsUpdatingFromMetadata(true)

    // Convert suite ID to suite name
    const suite = suites.find(s => s.id === selectedSuiteId)
    const suiteName = suite ? suite.name : ''

    const updated = updateYAMLMetadata(testName, testDescription, testTags, suiteName)
    if (updated !== scriptContent) {
      setScriptContent(updated)
    }

    setTimeout(() => {
      setIsUpdatingFromMetadata(false)
    }, 100)
  }, [testName, testDescription, testTags, selectedSuiteId, suites])

  // Auto-validate script on change (debounced)
  useEffect(() => {
    // Check if API is available
    if (!window.api?.script?.validate) {
      console.error('Script API not available')
      return
    }

    const timer = setTimeout(() => {
      validateScript()
    }, 500)

    return () => clearTimeout(timer)
  }, [scriptContent])

  const validateScript = async () => {
    // Safety check
    if (!window.api?.script?.validate) {
      setValidationStatus({
        valid: false,
        errors: ['Script validation API not available']
      })
      return
    }

    setIsValidating(true)

    try {
      const result = await window.api.script.validate(scriptContent, 'yaml')

      if (result.success && result.validation) {
        setValidationStatus({
          valid: result.validation.valid,
          errors: result.validation.errors.map((e: any) => e.message)
        })
      } else {
        setValidationStatus({
          valid: false,
          errors: [result.error || 'Validation failed']
        })
      }
    } catch (error) {
      setValidationStatus({
        valid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed']
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    // Safety check
    if (!window.api?.script?.toTestCase) {
      toast.error('Script API not available')
      return
    }

    if (!validationStatus?.valid) {
      toast.error('Please fix validation errors before saving')
      return
    }

    if (!testName.trim()) {
      toast.error('Please enter a test name')
      return
    }

    if (!selectedSuiteId) {
      toast.error('Please select a target suite')
      return
    }

    setIsSaving(true)

    try {
      // Create test case from script
      const result = await window.api.script.toTestCase(scriptContent, selectedSuiteId, {
        name: testName,
        description: testDescription,
        tags: testTags
      })

      if (result.success) {
        toast.success(result.message || 'Test case created successfully!')

        if (onSave) {
          onSave(result.testCase)
        }

        // Reset form
        setTestName('')
        setTestDescription('')
        setTestTags([])
        setScriptContent(DEFAULT_TEMPLATE)
      } else {
        toast.error(result.error || 'Failed to create test case')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create test case')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAISuggestSteps = async () => {
    // TODO: Implement AI step suggestions
    toast.info('AI suggestions coming soon!')
  }

  const handleLoadTemplate = (template: string) => {
    setScriptContent(template)
    toast.success('Template loaded successfully!')
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Metadata */}
      <div className="w-[300px] border-r border-border bg-card p-4 overflow-auto">
        <h3 className="text-lg font-semibold text-foreground mb-4">Test Metadata</h3>
        <TestMetadataForm
          testName={testName}
          testDescription={testDescription}
          testTags={testTags}
          selectedSuiteId={selectedSuiteId}
          onTestNameChange={setTestName}
          onTestDescriptionChange={setTestDescription}
          onTestTagsChange={setTestTags}
          onSelectedSuiteIdChange={setSelectedSuiteId}
          onSuitesLoaded={setSuites}
          showAIAssist={false}
        />
      </div>

      {/* Center Panel - YAML Editor */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Test Script (YAML)</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Validation Status */}
            {isValidating ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Validating...
              </div>
            ) : validationStatus?.valid ? (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                Valid
              </div>
            ) : validationStatus?.errors && validationStatus.errors.length > 0 ? (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="w-3 h-3" />
                {validationStatus.errors.length} error(s)
              </div>
            ) : null}

            {/* Load Template Button */}
            <button
              onClick={() => setShowTemplateLibrary(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
              title="Load template"
            >
              <BookOpen className="w-3 h-3" />
              Templates
            </button>

            {/* AI Suggest Button */}
            <button
              onClick={handleAISuggestSteps}
              className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
              title="AI suggest steps"
            >
              <Sparkles className="w-3 h-3" />
              AI Suggest
            </button>

            {/* Show Guide Button (when guide is hidden) */}
            {!isGuideExpanded && (
              <button
                onClick={toggleGuide}
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
                title="Show YAML guide"
              >
                <BookOpen className="w-3 h-3" />
                Guide
              </button>
            )}
          </div>
        </div>

        {/* YAML Editor */}
        <div className="flex-1">
          <textarea
            value={scriptContent}
            onChange={(e) => setScriptContent(e.target.value)}
            className="w-full h-full p-4 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm resize-none focus:outline-none"
            style={{
              fontFamily: 'Consolas, "Courier New", monospace',
              fontSize: '13px',
              lineHeight: '1.5',
              tabSize: 2
            }}
            spellCheck={false}
            placeholder="Write your YAML test script here or load a template..."
          />
        </div>

        {/* Validation Errors */}
        {validationStatus && !validationStatus.valid && validationStatus.errors.length > 0 && (
          <div className="border-t border-border bg-destructive/10 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive mb-1">Validation Errors:</p>
                <ul className="list-disc list-inside text-xs text-destructive/80 space-y-0.5">
                  {validationStatus.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Editor Footer - Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-card">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!validationStatus?.valid || isSaving || !testName.trim() || !selectedSuiteId}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Test Case'}
          </button>
        </div>
      </div>

      {/* Right Panel - YAML Guide (Conditionally Rendered) */}
      {isGuideExpanded && (
        <div className="w-[320px] border-l border-border bg-card flex flex-col">
          {/* Guide Header */}
          <button
            onClick={toggleGuide}
            className="flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted transition-colors"
          >
            <h3 className="text-lg font-semibold text-foreground">YAML Guide</h3>
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Guide Content */}
          <div className="flex-1 overflow-auto p-4 space-y-2">
            {/* Test Metadata */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Test Metadata</p>

              <GuideItem
                name="name"
                description="Test case name"
                example='name: "Example Test"'
                expanded={expandedItems['name']}
                onToggle={() => toggleItem('name')}
              />

              <GuideItem
                name="description"
                description="What this test verifies"
                example='description: "Verify login functionality"'
                expanded={expandedItems['description']}
                onToggle={() => toggleItem('description')}
              />

              <GuideItem
                name="tags"
                description="Test categories"
                example='tags: [smoke, critical, authentication]'
                expanded={expandedItems['tags']}
                onToggle={() => toggleItem('tags')}
              />

              <GuideItem
                name="suite"
                description="Target test suite"
                example='suite: "Default"'
                expanded={expandedItems['suite']}
                onToggle={() => toggleItem('suite')}
              />
            </div>

            {/* Actions */}
            <div className="space-y-1 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Actions</p>

              <GuideItem
                name="tap"
                description="Tap element or coordinates"
                example={`action: tap\ntarget:\n  element: "/Canvas/UI/Button"\n  fallback: {x: 540, y: 960}`}
                expanded={expandedItems['tap']}
                onToggle={() => toggleItem('tap')}
              />

              <GuideItem
                name="swipe"
                description="Swipe gesture"
                example={`action: swipe\ntarget:\n  fallback: {x: 540, y: 960}\ndata:\n  direction: "left"\n  distance: 500\n  duration: 300`}
                expanded={expandedItems['swipe']}
                onToggle={() => toggleItem('swipe')}
              />

              <GuideItem
                name="input"
                description="Enter text in field"
                example={`action: input\ntarget:\n  element: "/Canvas/LoginPanel/UsernameField"\n  fallback: {x: 540, y: 700}\nvalue: "testuser"`}
                expanded={expandedItems['input']}
                onToggle={() => toggleItem('input')}
              />

              <GuideItem
                name="wait"
                description="Wait for duration (ms)"
                example='action: wait\nduration: 2000'
                expanded={expandedItems['wait']}
                onToggle={() => toggleItem('wait')}
              />
            </div>

            {/* Validation */}
            <div className="space-y-1 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Validation</p>

              <GuideItem
                name="element_exists"
                description="Element is present"
                example={`validation:\n  type: element_exists\n  target: "/Canvas/UI/Button"\n  timeout: 3000`}
                expanded={expandedItems['element_exists']}
                onToggle={() => toggleItem('element_exists')}
              />

              <GuideItem
                name="element_active"
                description="Element is active/enabled"
                example={`validation:\n  type: element_active\n  target: "/Canvas/UI/Button"\n  timeout: 2000`}
                expanded={expandedItems['element_active']}
                onToggle={() => toggleItem('element_active')}
              />

              <GuideItem
                name="text_contains"
                description="Text contains string"
                example={`validation:\n  type: text_contains\n  target: "/Canvas/UI/Label"\n  expected: "Welcome"\n  timeout: 2000`}
                expanded={expandedItems['text_contains']}
                onToggle={() => toggleItem('text_contains')}
              />

              <GuideItem
                name="screenshot_match"
                description="Visual comparison"
                example={`validation:\n  type: screenshot_match\n  threshold: 0.85\n  timeout: 2000`}
                expanded={expandedItems['screenshot_match']}
                onToggle={() => toggleItem('screenshot_match')}
              />
            </div>

            {/* Test Behavior */}
            <div className="space-y-1 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Test Behavior</p>

              <GuideItem
                name="expectedOutcome"
                description="Expected result (pass/fail)"
                example='expectedOutcome: fail\n# Use "fail" for negative tests'
                expanded={expandedItems['expectedOutcome']}
                onToggle={() => toggleItem('expectedOutcome')}
              />

              <GuideItem
                name="continueOnFailure"
                description="Continue test on failure"
                example='continueOnFailure: true\n# true = non-blocking step'
                expanded={expandedItems['continueOnFailure']}
                onToggle={() => toggleItem('continueOnFailure')}
              />
            </div>

            {/* Unity SDK */}
            <div className="space-y-1 pt-3 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Unity SDK</p>
                <span className="text-xs px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded">Required</span>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 mb-2">
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠️ Element-based testing only works with PlayGuard SDK integrated in your Unity project.
                </p>
              </div>

              <GuideItem
                name="element"
                description="Unity GameObject path"
                example={`target:\n  element: "/Canvas/MainMenu/PlayButton"\n  fallback: {x: 540, y: 960}\n# Follows GameObject hierarchy`}
                expanded={expandedItems['element']}
                onToggle={() => toggleItem('element')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Template Library Modal */}
      {showTemplateLibrary && (
        <TemplateLibrary
          onSelectTemplate={handleLoadTemplate}
          onClose={() => setShowTemplateLibrary(false)}
        />
      )}
    </div>
  )
}
