/**
 * ScriptingMode Component
 * Write test cases using YAML scripting language.
 * Supports Android (Unity SDK) and Web HTML5 (RUN.studio / custom SDK) platforms.
 */

import { useState, useEffect } from 'react'
import {
  Save, FileText, AlertCircle, CheckCircle2, Sparkles,
  BookOpen, ChevronDown, ChevronUp, Smartphone, Globe
} from 'lucide-react'
import { TestMetadataForm } from '../TestMetadataForm'
import { useToast } from '../../Common/ToastProvider'
import { TemplateLibrary } from './TemplateLibrary'

type Platform = 'android' | 'web'

// ─── Guide item ───────────────────────────────────────────────────────────────

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
          <code className="text-xs font-semibold text-primary">{name}</code>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {expanded
          ? <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0 ml-2" />
          : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 ml-2" />}
      </button>
      {expanded && (
        <div className="px-3 py-2 bg-muted/50 border-t border-border">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">{example}</pre>
        </div>
      )}
    </div>
  )
}

// ─── Default templates ────────────────────────────────────────────────────────

const ANDROID_DEFAULT = `testCase:
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

const WEB_DEFAULT = `testCase:
  name: "Web HTML5 Test"
  description: "Describe what this web test verifies"
  platform: web
  tags: [web, smoke]
  suite: "Default"

  steps:
    - id: step_1
      action: navigate
      url: "https://game.example.com"
      description: "Open game URL"
      expectedResult: "Game page loads"

    - id: step_2
      action: wait_for_element
      target:
        selector: ".game-canvas"
      timeout: 10000
      description: "Wait for game canvas to be ready"
      expectedResult: "Canvas is visible"

    - id: step_3
      action: click
      target:
        selector: "#start-button"
        fallback: {x: 540, y: 400}
      description: "Click the start button"
      validation:
        type: element_visible
        selector: ".game-screen"
        timeout: 3000
      expectedResult: "Game starts"

    - id: step_4
      action: wait
      duration: 2000
      description: "Wait for game to initialize"
      expectedResult: "Game is running"
`

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onSave?: (testCase: any) => void
  onCancel?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScriptingMode({ onSave, onCancel }: Props) {
  const [platform, setPlatform] = useState<Platform>('android')
  const [scriptContent, setScriptContent] = useState(ANDROID_DEFAULT)
  const [testName, setTestName] = useState('')
  const [testDescription, setTestDescription] = useState('')
  const [testTags, setTestTags] = useState<string[]>([])
  const [selectedSuiteId, setSelectedSuiteId] = useState('')
  const [suites, setSuites] = useState<any[]>([])
  const [validationStatus, setValidationStatus] = useState<{ valid: boolean; errors: string[] } | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false)
  const [isUpdatingFromYAML, setIsUpdatingFromYAML] = useState(false)
  const [isUpdatingFromMetadata, setIsUpdatingFromMetadata] = useState(false)
  const [isGuideExpanded, setIsGuideExpanded] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const toast = useToast()

  const toggleItem = (item: string) =>
    setExpandedItems(prev => ({ ...prev, [item]: !prev[item] }))

  // Switch platform: auto-swap default template if user hasn't edited it
  const handlePlatformSwitch = (next: Platform) => {
    const currentDefault = platform === 'android' ? ANDROID_DEFAULT : WEB_DEFAULT
    const nextDefault = next === 'android' ? ANDROID_DEFAULT : WEB_DEFAULT
    if (scriptContent === currentDefault) {
      setScriptContent(nextDefault)
    }
    setPlatform(next)
  }

  // ── YAML ↔ Metadata sync ──────────────────────────────────────────────────

  const parseMetadataFromYAML = (yamlContent: string) => {
    try {
      const lines = yamlContent.split('\n')
      let name = '', description = '', tags: string[] = [], suiteName = ''
      let inTestCase = false, inSteps = false

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('testCase:')) { inTestCase = true; continue }
        if (trimmed.startsWith('steps:')) { inSteps = true; continue }
        if (!inTestCase || inSteps) continue

        if (line.startsWith('  name:') && !line.startsWith('    ')) {
          const m = trimmed.match(/name:\s*["'](.+?)["']/)
          if (m) name = m[1]
        }
        if (line.startsWith('  description:') && !line.startsWith('    ')) {
          const m = trimmed.match(/description:\s*["'](.+?)["']/)
          if (m) description = m[1]
        }
        if (line.startsWith('  tags:') && !line.startsWith('    ')) {
          const m = trimmed.match(/tags:\s*\[(.+?)\]/)
          if (m) tags = m[1].split(',').map(t => t.trim().replace(/["']/g, ''))
        }
        if (line.startsWith('  suite:') && !line.startsWith('    ')) {
          const m = trimmed.match(/suite:\s*["'](.+?)["']/)
          if (m) suiteName = m[1]
        }
      }
      return { name, description, tags, suiteName }
    } catch {
      return null
    }
  }

  const updateYAMLMetadata = (name: string, description: string, tags: string[], suiteName: string) => {
    let updated = scriptContent
    updated = updated.replace(/name:\s*["'].+?["']/, `name: "${name}"`)
    updated = updated.replace(/description:\s*["'].+?["']/, `description: "${description}"`)
    updated = updated.replace(/tags:\s*\[.+?\]/, `tags: [${tags.join(', ')}]`)
    updated = updated.replace(/suite:\s*["'].*?["']/, `suite: "${suiteName}"`)
    return updated
  }

  useEffect(() => {
    if (isUpdatingFromMetadata || suites.length === 0) return
    const metadata = parseMetadataFromYAML(scriptContent)
    if (!metadata) return
    setIsUpdatingFromYAML(true)
    if (metadata.name && metadata.name !== testName) setTestName(metadata.name)
    if (metadata.description && metadata.description !== testDescription) setTestDescription(metadata.description)
    if (metadata.tags.length > 0 && JSON.stringify(metadata.tags) !== JSON.stringify(testTags)) setTestTags(metadata.tags)
    if (metadata.suiteName) {
      const suite = suites.find(s => s.name === metadata.suiteName)
      if (suite && suite.id !== selectedSuiteId) setSelectedSuiteId(suite.id)
    }
    setTimeout(() => setIsUpdatingFromYAML(false), 100)
  }, [scriptContent, suites])

  useEffect(() => {
    if (isUpdatingFromYAML || suites.length === 0 || !testName) return
    setIsUpdatingFromMetadata(true)
    const suite = suites.find(s => s.id === selectedSuiteId)
    const suiteName = suite ? suite.name : ''
    const updated = updateYAMLMetadata(testName, testDescription, testTags, suiteName)
    if (updated !== scriptContent) setScriptContent(updated)
    setTimeout(() => setIsUpdatingFromMetadata(false), 100)
  }, [testName, testDescription, testTags, selectedSuiteId, suites])

  // Auto-validate on change (debounced)
  useEffect(() => {
    if (!window.api?.script?.validate) return
    const timer = setTimeout(validateScript, 500)
    return () => clearTimeout(timer)
  }, [scriptContent])

  const validateScript = async () => {
    if (!window.api?.script?.validate) {
      setValidationStatus({ valid: false, errors: ['Script validation API not available'] })
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
        setValidationStatus({ valid: false, errors: [result.error || 'Validation failed'] })
      }
    } catch (error) {
      setValidationStatus({ valid: false, errors: [error instanceof Error ? error.message : 'Validation failed'] })
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    if (!window.api?.script?.toTestCase) { toast.error('Script API not available'); return }
    if (!validationStatus?.valid) { toast.error('Please fix validation errors before saving'); return }
    if (!testName.trim()) { toast.error('Please enter a test name'); return }
    if (!selectedSuiteId) { toast.error('Please select a target suite'); return }

    setIsSaving(true)
    try {
      const result = await window.api.script.toTestCase(scriptContent, selectedSuiteId, {
        name: testName, description: testDescription, tags: testTags
      })
      if (result.success) {
        toast.success(result.message || 'Test case created successfully!')
        if (onSave) onSave(result.testCase)
        setTestName(''); setTestDescription(''); setTestTags([])
        setScriptContent(platform === 'web' ? WEB_DEFAULT : ANDROID_DEFAULT)
      } else {
        toast.error(result.error || 'Failed to create test case')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create test case')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoadTemplate = (template: string) => {
    setScriptContent(template)
    // Detect platform from loaded template
    if (template.includes('platform: web')) setPlatform('web')
    else if (template.includes('action: tap') || template.includes('action: swipe')) setPlatform('android')
    toast.success('Template loaded!')
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full">
      {/* Left Panel — Metadata */}
      <div className="w-[300px] border-r border-border bg-card p-4 overflow-auto flex flex-col gap-4">
        {/* Platform toggle */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Platform</p>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => handlePlatformSwitch('android')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-all ${
                platform === 'android'
                  ? 'bg-card text-foreground shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              Android
            </button>
            <button
              onClick={() => handlePlatformSwitch('web')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-all ${
                platform === 'web'
                  ? 'bg-card text-foreground shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe className="w-3 h-3" />
              Web HTML5
            </button>
          </div>
        </div>

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

      {/* Center Panel — YAML Editor */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Test Script (YAML)</span>
            {platform === 'web' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium">Web HTML5</span>
            )}
          </div>

          <div className="flex items-center gap-2">
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
            ) : validationStatus?.errors?.length ? (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="w-3 h-3" />
                {validationStatus.errors.length} error(s)
              </div>
            ) : null}

            <button
              onClick={() => setShowTemplateLibrary(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              Templates
            </button>

            <button
              onClick={() => toast.info('AI suggestions coming soon!')}
              className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              AI Suggest
            </button>

            {!isGuideExpanded && (
              <button
                onClick={() => setIsGuideExpanded(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
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
            style={{ fontFamily: 'Consolas, "Courier New", monospace', fontSize: '13px', lineHeight: '1.5', tabSize: 2 }}
            spellCheck={false}
            placeholder="Write your YAML test script here or load a template..."
          />
        </div>

        {/* Validation Errors */}
        {validationStatus && !validationStatus.valid && validationStatus.errors.length > 0 && (
          <div className="border-t border-border bg-destructive/10 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive mb-1">Validation Errors:</p>
                <ul className="list-disc list-inside text-xs text-destructive/80 space-y-0.5">
                  {validationStatus.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-card">
          {onCancel && (
            <button onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
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

      {/* Right Panel — Guide (platform-aware) */}
      {isGuideExpanded && (
        <div className="w-[320px] border-l border-border bg-card flex flex-col">
          <button
            onClick={() => setIsGuideExpanded(false)}
            className="flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted transition-colors"
          >
            <h3 className="text-sm font-semibold text-foreground">
              YAML Guide
              {platform === 'web' && <span className="ml-2 text-[10px] text-blue-400 font-normal">Web HTML5</span>}
            </h3>
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="flex-1 overflow-auto p-3 space-y-0.5 text-xs">

            {/* ── Shared: Test Metadata ─────────────────────────────────── */}
            <GuideSection label="Test Metadata">
              <GuideItem name="name" description="Test case name" example='name: "Login Test"' expanded={expandedItems['name']} onToggle={() => toggleItem('name')} />
              <GuideItem name="description" description="What this test verifies" example='description: "Verify login works"' expanded={expandedItems['desc']} onToggle={() => toggleItem('desc')} />
              <GuideItem name="tags" description="Test categories" example='tags: [smoke, critical]' expanded={expandedItems['tags']} onToggle={() => toggleItem('tags')} />
              <GuideItem name="suite" description="Target suite name" example='suite: "Default"' expanded={expandedItems['suite']} onToggle={() => toggleItem('suite')} />
              {platform === 'web' && (
                <GuideItem name="platform" description="Must be 'web' for HTML5 tests" example='platform: web' expanded={expandedItems['platform']} onToggle={() => toggleItem('platform')} />
              )}
            </GuideSection>

            {/* ── Android Actions ─────────────────────────────────────────── */}
            {platform === 'android' && (
              <GuideSection label="Actions">
                <GuideItem name="tap" description="Tap element or coordinates" example={`action: tap\ntarget:\n  element: "/Canvas/UI/Button"\n  fallback: {x: 540, y: 960}`} expanded={expandedItems['tap']} onToggle={() => toggleItem('tap')} />
                <GuideItem name="swipe" description="Swipe gesture" example={`action: swipe\ntarget:\n  fallback: {x: 540, y: 960}\ndata:\n  direction: "left"\n  distance: 500\n  duration: 300`} expanded={expandedItems['swipe']} onToggle={() => toggleItem('swipe')} />
                <GuideItem name="input" description="Enter text in field" example={`action: input\ntarget:\n  element: "/Canvas/LoginPanel/UsernameField"\nvalue: "testuser"`} expanded={expandedItems['input']} onToggle={() => toggleItem('input')} />
                <GuideItem name="wait" description="Wait for duration (ms)" example={`action: wait\nduration: 2000`} expanded={expandedItems['wait']} onToggle={() => toggleItem('wait')} />
              </GuideSection>
            )}

            {/* ── Web Actions ──────────────────────────────────────────────── */}
            {platform === 'web' && (
              <GuideSection label="Web Actions">
                <GuideItem name="navigate" description="Go to a URL" example={`action: navigate\nurl: "https://game.example.com"\ndescription: "Open game"`} expanded={expandedItems['navigate']} onToggle={() => toggleItem('navigate')} />
                <GuideItem name="click" description="Click CSS selector or coordinates" example={`action: click\ntarget:\n  selector: "#start-btn"\n  fallback: {x: 540, y: 400}`} expanded={expandedItems['click']} onToggle={() => toggleItem('click')} />
                <GuideItem name="type" description="Type text into a field" example={`action: type\ntarget:\n  selector: "input#username"\nvalue: "testuser"`} expanded={expandedItems['type']} onToggle={() => toggleItem('type')} />
                <GuideItem name="scroll" description="Scroll the page" example={`action: scroll\ndata:\n  deltaX: 0\n  deltaY: 300`} expanded={expandedItems['scroll']} onToggle={() => toggleItem('scroll')} />
                <GuideItem name="wait_for_element" description="Wait until a CSS element appears" example={`action: wait_for_element\ntarget:\n  selector: ".game-canvas"\ntimeout: 10000`} expanded={expandedItems['wfe']} onToggle={() => toggleItem('wfe')} />
                <GuideItem name="execute_js" description="Run arbitrary JavaScript" example={`action: execute_js\nscript: "window.game.addCoins(100)"\ndescription: "Add coins via JS"`} expanded={expandedItems['execjs']} onToggle={() => toggleItem('execjs')} />
                <GuideItem name="wait" description="Wait fixed duration (ms)" example={`action: wait\nduration: 2000`} expanded={expandedItems['wait']} onToggle={() => toggleItem('wait')} />
              </GuideSection>
            )}

            {/* ── Validation ───────────────────────────────────────────────── */}
            <GuideSection label="Validation">
              {platform === 'android' && <>
                <GuideItem name="element_exists" description="Element is present in hierarchy" example={`validation:\n  type: element_exists\n  target: "/Canvas/UI/Button"\n  timeout: 3000`} expanded={expandedItems['ee']} onToggle={() => toggleItem('ee')} />
                <GuideItem name="element_active" description="Element is active/enabled" example={`validation:\n  type: element_active\n  target: "/Canvas/UI/Button"\n  timeout: 2000`} expanded={expandedItems['ea']} onToggle={() => toggleItem('ea')} />
                <GuideItem name="text_contains" description="Element text contains string" example={`validation:\n  type: text_contains\n  target: "/Canvas/UI/Label"\n  expected: "Welcome"\n  timeout: 2000`} expanded={expandedItems['tc']} onToggle={() => toggleItem('tc')} />
                <GuideItem name="screenshot_match" description="Visual comparison" example={`validation:\n  type: screenshot_match\n  threshold: 0.85\n  timeout: 2000`} expanded={expandedItems['ss']} onToggle={() => toggleItem('ss')} />
              </>}
              {platform === 'web' && <>
                <GuideItem name="element_visible" description="CSS element is visible in DOM" example={`validation:\n  type: element_visible\n  selector: ".game-screen"\n  timeout: 3000`} expanded={expandedItems['ev']} onToggle={() => toggleItem('ev')} />
                <GuideItem name="element_not_visible" description="CSS element is hidden/removed" example={`validation:\n  type: element_not_visible\n  selector: ".loading-spinner"\n  timeout: 5000`} expanded={expandedItems['env']} onToggle={() => toggleItem('env')} />
                <GuideItem name="text_contains" description="Element text contains string" example={`validation:\n  type: text_contains\n  selector: ".score"\n  expected: "100"\n  timeout: 2000`} expanded={expandedItems['tc']} onToggle={() => toggleItem('tc')} />
                <GuideItem name="url_contains" description="Current URL contains string" example={`validation:\n  type: url_contains\n  expected: "/game/level-2"\n  timeout: 2000`} expanded={expandedItems['uc']} onToggle={() => toggleItem('uc')} />
                <GuideItem name="value_equals" description="SDK property equals expected" example={`validation:\n  type: value_equals\n  expected: "0"`} expanded={expandedItems['ve']} onToggle={() => toggleItem('ve')} />
              </>}
            </GuideSection>

            {/* ── Test Behavior ─────────────────────────────────────────────── */}
            <GuideSection label="Test Behavior">
              <GuideItem name="expectedOutcome" description="Expected result (pass/fail)" example={`expectedOutcome: fail\n# Use "fail" for negative tests`} expanded={expandedItems['eo']} onToggle={() => toggleItem('eo')} />
              <GuideItem name="continueOnFailure" description="Continue test on failure" example={`continueOnFailure: true\n# true = non-blocking step`} expanded={expandedItems['cof']} onToggle={() => toggleItem('cof')} />
            </GuideSection>

            {/* ── Android: Unity SDK ─────────────────────────────────────── */}
            {platform === 'android' && (
              <GuideSection label="Unity SDK" badge={{ text: 'Required', color: 'yellow' }}>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 mb-1">
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400">
                    Element-based testing requires PlayGuard SDK integrated in your Unity project.
                  </p>
                </div>
                <GuideItem name="element" description="Unity GameObject path" example={`target:\n  element: "/Canvas/MainMenu/PlayButton"\n  fallback: {x: 540, y: 960}`} expanded={expandedItems['el']} onToggle={() => toggleItem('el')} />
              </GuideSection>
            )}

            {/* ── Web: RUN.studio / HTML5 SDK ──────────────────────────────── */}
            {platform === 'web' && (
              <GuideSection label="RUN.studio SDK" badge={{ text: 'Optional', color: 'blue' }}>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 mb-1">
                  <p className="text-[10px] text-blue-400">
                    Integrate the PlayGuard HTML5 SDK in your game to expose custom properties and actions for deeper testing.
                  </p>
                </div>
                <GuideItem name="sdk_property" description="Read a named game property" example={`action: sdk_property\nname: "playerScore"\ndescription: "Read player score"\nvalidation:\n  type: value_equals\n  expected: "0"`} expanded={expandedItems['sdkp']} onToggle={() => toggleItem('sdkp')} />
                <GuideItem name="sdk_action" description="Execute a registered game action" example={`action: sdk_action\nname: "addCoins"\nargs: ["100"]\ndescription: "Give player 100 coins"`} expanded={expandedItems['sdka']} onToggle={() => toggleItem('sdka')} />
                <GuideItem name="sdk_command" description="Execute a custom SDK command" example={`action: sdk_command\nname: "setLevel"\nparam: "5"\ndescription: "Jump to level 5"`} expanded={expandedItems['sdkc']} onToggle={() => toggleItem('sdkc')} />
              </GuideSection>
            )}
          </div>
        </div>
      )}

      {/* Template Library Modal */}
      {showTemplateLibrary && (
        <TemplateLibrary
          onSelectTemplate={handleLoadTemplate}
          onClose={() => setShowTemplateLibrary(false)}
          platform={platform}
        />
      )}
    </div>
  )
}

// ─── Guide section wrapper ────────────────────────────────────────────────────

function GuideSection({
  label,
  badge,
  children
}: {
  label: string
  badge?: { text: string; color: 'yellow' | 'blue' | 'green' }
  children: React.ReactNode
}) {
  const badgeClasses = {
    yellow: 'bg-yellow-500/10 text-yellow-500',
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400'
  }
  return (
    <div className="pt-3 first:pt-0">
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        {badge && (
          <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${badgeClasses[badge.color]}`}>{badge.text}</span>
        )}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}
