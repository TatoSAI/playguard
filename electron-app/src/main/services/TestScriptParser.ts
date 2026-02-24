/**
 * TestScriptParser Service
 * Parses YAML/TypeScript test scripts into TestCase models.
 * Supports both Android (Unity) and Web HTML5 (RUN.studio / custom SDK) platforms.
 */

import * as yaml from 'yaml'
import { TestCase, TestStep } from '../types/models'

export interface ParseResult {
  testCase: Partial<TestCase>
  warnings: string[]
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  line?: number
}

// Actions that are valid for web/HTML5 tests
const WEB_ACTIONS = new Set([
  'navigate', 'click', 'type', 'scroll',
  'wait_for_element', 'execute_js',
  'sdk_property', 'sdk_action', 'sdk_command'
])

// Actions valid for Android/Unity tests
const ANDROID_ACTIONS = new Set([
  'tap', 'swipe', 'input', 'wait', 'assert'
])

export class TestScriptParser {
  /**
   * Parse YAML script content into a ParseResult
   */
  parse(content: string, format: 'yaml' | 'typescript' = 'yaml'): ParseResult {
    if (format === 'yaml') {
      return this.parseYAML(content)
    }
    throw new Error('TypeScript format not yet supported')
  }

  /**
   * Parse YAML content
   */
  private parseYAML(content: string): ParseResult {
    const warnings: string[] = []

    try {
      const parsed = yaml.parse(content)

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid YAML: root must be an object')
      }

      if (!parsed.testCase) {
        throw new Error('Invalid YAML: missing "testCase" root element')
      }

      const testCase = parsed.testCase

      // Detect platform from testCase.platform field
      const isWeb = testCase.platform === 'web'

      const partialTestCase: Partial<TestCase> = {
        name: testCase.name || '',
        description: testCase.description || '',
        tags: Array.isArray(testCase.tags) ? testCase.tags : [],
        steps: [],
        recordingMode: isWeb ? 'html5' : 'element',
        ...(isWeb ? { gameSDKType: 'html5' } : {})
      }

      // Parse steps
      if (Array.isArray(testCase.steps)) {
        partialTestCase.steps = testCase.steps.map((step: any, index: number) =>
          this.parseStep(step, index, warnings)
        )
      } else {
        warnings.push('No steps defined in test case')
      }

      // Parse prerequisites (optional)
      if (testCase.prerequisites) {
        warnings.push('Prerequisites parsing not yet implemented')
      }

      // Parse cleanup steps (optional)
      if (Array.isArray(testCase.cleanup)) {
        partialTestCase.cleanup = testCase.cleanup.map((step: any, index: number) =>
          this.parseStep(step, index, warnings, 'cleanup')
        )
      }

      return { testCase: partialTestCase, warnings }
    } catch (error) {
      throw new Error(`YAML parsing error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Parse a single step from YAML
   */
  private parseStep(step: any, index: number, warnings: string[], context = 'step'): TestStep {
    const stepId = step.id || `${context}_${index + 1}`

    if (!step.action) {
      warnings.push(`Step ${index + 1}: Missing "action" field`)
    }

    // ── Target / selector resolution ────────────────────────────────────────
    let target: any = undefined
    if (step.target) {
      if (typeof step.target === 'string') {
        target = { method: 'gameObject', value: step.target }
      } else if (typeof step.target === 'object') {
        if (step.target.selector) {
          // Web CSS selector
          target = {
            method: 'cssSelector',
            value: step.target.selector,
            fallback: step.target.fallback
          }
        } else {
          // Unity / coordinate fallback
          target = {
            method: step.target.element ? 'gameObject' : 'coordinate',
            value: step.target.element,
            fallback: step.target.fallback
          }
        }
      }
    }

    // ── Build TestStep ───────────────────────────────────────────────────────
    const testStep: TestStep = {
      id: stepId,
      type: step.action,
      description: step.description || ''
    }

    if (target) testStep.target = target

    if (step.value !== undefined) testStep.value = step.value
    if (step.data !== undefined) testStep.data = step.data

    // ── Android-specific ────────────────────────────────────────────────────
    if (step.action === 'wait' && step.duration !== undefined) {
      testStep.data = { ...testStep.data, duration: step.duration }
    }

    // ── Web-specific data fields ─────────────────────────────────────────────
    if (step.action === 'navigate' && step.url) {
      testStep.data = { ...testStep.data, url: step.url }
    }
    if (step.action === 'execute_js' && step.script) {
      testStep.data = { ...testStep.data, script: step.script }
    }
    if (step.action === 'wait_for_element' && step.timeout !== undefined) {
      testStep.data = { ...testStep.data, timeout: step.timeout }
    }
    if (step.action === 'scroll') {
      testStep.data = {
        ...testStep.data,
        deltaX: step.data?.deltaX ?? 0,
        deltaY: step.data?.deltaY ?? 0
      }
    }

    // ── RUN.studio / HTML5 SDK steps ─────────────────────────────────────────
    if (step.action === 'sdk_property' && step.name) {
      testStep.data = { ...testStep.data, propertyName: step.name }
    }
    if (step.action === 'sdk_action' && step.name) {
      testStep.data = { ...testStep.data, actionName: step.name, args: step.args ?? [] }
    }
    if (step.action === 'sdk_command' && step.name) {
      testStep.data = { ...testStep.data, commandName: step.name, param: step.param ?? '' }
    }

    // ── Shared options ───────────────────────────────────────────────────────
    if (step.options || step.waitBefore || step.waitAfter || step.screenshot) {
      testStep.options = {
        ...step.options,
        waitBefore: step.waitBefore,
        waitAfter: step.waitAfter,
        screenshot: step.screenshot
      }
    }

    // ── Validation / assertion ───────────────────────────────────────────────
    if (step.validation) {
      testStep.assertion = {
        type: step.validation.type,
        // Support both `target` (element path) and `selector` (CSS)
        target: step.validation.target ?? step.validation.selector,
        expected: step.validation.expected,
        threshold: step.validation.threshold,
        timeout: step.validation.timeout
      }
      // Store CSS selector separately if used
      if (step.validation.selector) {
        testStep.assertion.data = { selector: step.validation.selector }
      }
    }

    // ── Metadata ─────────────────────────────────────────────────────────────
    if (step.elementPath) testStep.elementPath = step.elementPath
    if (step.elementName) testStep.elementName = step.elementName
    if (step.elementType) testStep.elementType = step.elementType
    if (step.expectedOutcome) testStep.expectedOutcome = step.expectedOutcome
    if (step.continueOnFailure !== undefined) testStep.continueOnFailure = step.continueOnFailure
    if (step.expectedResult) {
      testStep.data = { ...testStep.data, expectedResult: step.expectedResult }
    }

    return testStep
  }

  /**
   * Validate parsed test case
   */
  validate(parsed: ParseResult): ValidationResult {
    const errors: ValidationError[] = []
    const testCase = parsed.testCase

    if (!testCase.name || testCase.name.trim() === '') {
      errors.push({ field: 'testCase.name', message: 'Test name is required' })
    }

    if (!testCase.steps || testCase.steps.length === 0) {
      errors.push({ field: 'testCase.steps', message: 'At least one step is required' })
    }

    testCase.steps?.forEach((step, index) => {
      const n = index + 1
      const allActions = new Set([...WEB_ACTIONS, ...ANDROID_ACTIONS])

      if (!step.type) {
        errors.push({ field: `steps[${index}].type`, message: `Step ${n}: Action type is required` })
        return
      }

      if (!allActions.has(step.type)) {
        errors.push({
          field: `steps[${index}].type`,
          message: `Step ${n}: Unknown action "${step.type}". Valid: ${[...ANDROID_ACTIONS, ...WEB_ACTIONS].join(', ')}`
        })
      }

      if (!step.description || step.description.trim() === '') {
        errors.push({ field: `steps[${index}].description`, message: `Step ${n}: Description is required` })
      }

      // ── Android validations ──────────────────────────────────────────────
      if (step.type === 'input' && !step.value) {
        errors.push({ field: `steps[${index}].value`, message: `Step ${n}: "input" requires a "value" field` })
      }
      if (step.type === 'wait' && !step.data?.duration) {
        errors.push({ field: `steps[${index}].data.duration`, message: `Step ${n}: "wait" requires a "duration" field` })
      }

      // ── Web validations ──────────────────────────────────────────────────
      if (step.type === 'type' && !step.value) {
        errors.push({ field: `steps[${index}].value`, message: `Step ${n}: "type" requires a "value" field` })
      }
      if (step.type === 'navigate' && !step.data?.url) {
        errors.push({ field: `steps[${index}].data.url`, message: `Step ${n}: "navigate" requires a "url" field` })
      }
      if (step.type === 'execute_js' && !step.data?.script) {
        errors.push({ field: `steps[${index}].data.script`, message: `Step ${n}: "execute_js" requires a "script" field` })
      }
      if (step.type === 'sdk_property' && !step.data?.propertyName) {
        errors.push({ field: `steps[${index}].data.propertyName`, message: `Step ${n}: "sdk_property" requires a "name" field` })
      }
      if (step.type === 'sdk_action' && !step.data?.actionName) {
        errors.push({ field: `steps[${index}].data.actionName`, message: `Step ${n}: "sdk_action" requires a "name" field` })
      }
    })

    return { valid: errors.length === 0, errors }
  }

  /**
   * Convert parsed result to complete TestCase
   */
  toTestCase(
    parsed: ParseResult,
    suiteId: string,
    additionalMetadata: { tags?: string[]; recordingDevice?: any } = {}
  ): TestCase {
    const validation = this.validate(parsed)
    if (!validation.valid) {
      throw new Error(
        `Cannot convert to TestCase: validation failed\n${validation.errors.map((e) => `- ${e.message}`).join('\n')}`
      )
    }

    const testCase = parsed.testCase
    const timestamp = Date.now()
    const id = `test_${timestamp}`
    const now = new Date().toISOString()

    const isWeb = testCase.recordingMode === 'html5'

    return {
      id,
      suiteId,
      name: testCase.name!,
      description: testCase.description || '',
      tags: additionalMetadata.tags || testCase.tags || [],
      recordingMode: testCase.recordingMode || 'element',
      ...(isWeb ? { gameSDKType: 'html5' } : {}),
      recordingDevice: additionalMetadata.recordingDevice || {
        id: isWeb ? 'web-scripted' : 'scripted',
        model: isWeb ? 'Web HTML5' : 'Scripted Test',
        manufacturer: 'PlayGuard',
        androidVersion: '',
        resolution: '',
        recordedAt: now
      },
      steps: testCase.steps!,
      cleanup: testCase.cleanup,
      prerequisites: testCase.prerequisites,
      executionHistory: [],
      version: '1.0',
      createdAt: now,
      updatedAt: now,
      variables: {}
    }
  }

  /**
   * Convert TestCase back to YAML script format (for export)
   */
  fromTestCase(testCase: TestCase, format: 'yaml' | 'typescript' = 'yaml'): string {
    if (format === 'typescript') {
      throw new Error('TypeScript format not yet supported')
    }

    const isWeb = (testCase as any).gameSDKType === 'html5' || testCase.recordingMode === 'html5'

    const scriptObject = {
      testCase: {
        name: testCase.name,
        description: testCase.description,
        ...(isWeb ? { platform: 'web' } : {}),
        tags: testCase.tags,
        steps: testCase.steps.map((step) => this.stepToYAML(step)),
        ...(testCase.cleanup && testCase.cleanup.length > 0
          ? { cleanup: testCase.cleanup.map((step) => this.stepToYAML(step)) }
          : {})
      }
    }

    return yaml.stringify(scriptObject, { indent: 2, lineWidth: 0 })
  }

  /**
   * Convert TestStep to YAML-friendly object
   */
  private stepToYAML(step: TestStep): any {
    const yamlStep: any = {
      id: step.id,
      action: step.type,
      description: step.description
    }

    // ── Target ───────────────────────────────────────────────────────────────
    if (step.target) {
      if (step.target.method === 'cssSelector') {
        yamlStep.target = {
          selector: step.target.value,
          ...(step.target.fallback ? { fallback: step.target.fallback } : {})
        }
      } else if (step.target.method === 'gameObject' && step.target.value) {
        yamlStep.target = {
          element: step.target.value,
          ...(step.target.fallback ? { fallback: step.target.fallback } : {})
        }
      } else if (step.target.method === 'coordinate' && step.target.fallback) {
        yamlStep.target = step.target.fallback
      }
    }

    // ── Value ─────────────────────────────────────────────────────────────────
    if (step.value !== undefined) yamlStep.value = step.value

    // ── Web-specific inline fields ───────────────────────────────────────────
    if (step.data?.url) yamlStep.url = step.data.url
    if (step.data?.script) yamlStep.script = step.data.script
    if (step.data?.propertyName) yamlStep.name = step.data.propertyName
    if (step.data?.actionName) {
      yamlStep.name = step.data.actionName
      if (step.data.args?.length) yamlStep.args = step.data.args
    }
    if (step.data?.commandName) {
      yamlStep.name = step.data.commandName
      if (step.data.param) yamlStep.param = step.data.param
    }
    if (step.data?.timeout && step.type === 'wait_for_element') yamlStep.timeout = step.data.timeout
    if (step.data?.duration) yamlStep.duration = step.data.duration

    // ── Options ───────────────────────────────────────────────────────────────
    if (step.options) {
      if (step.options.waitBefore) yamlStep.waitBefore = step.options.waitBefore
      if (step.options.waitAfter) yamlStep.waitAfter = step.options.waitAfter
      if (step.options.screenshot) yamlStep.screenshot = step.options.screenshot
    }

    // ── Validation ────────────────────────────────────────────────────────────
    if (step.assertion) {
      const isCssTarget = step.assertion.data?.selector
      yamlStep.validation = {
        type: step.assertion.type,
        ...(isCssTarget ? { selector: step.assertion.data!.selector } : {}),
        ...(!isCssTarget && step.assertion.target ? { target: step.assertion.target } : {}),
        ...(step.assertion.expected !== undefined ? { expected: step.assertion.expected } : {}),
        ...(step.assertion.threshold !== undefined ? { threshold: step.assertion.threshold } : {}),
        ...(step.assertion.timeout !== undefined ? { timeout: step.assertion.timeout } : {})
      }
    }

    if (step.expectedOutcome) yamlStep.expectedOutcome = step.expectedOutcome
    if (step.continueOnFailure !== undefined) yamlStep.continueOnFailure = step.continueOnFailure
    if (step.data?.expectedResult) yamlStep.expectedResult = step.data.expectedResult

    return yamlStep
  }
}
