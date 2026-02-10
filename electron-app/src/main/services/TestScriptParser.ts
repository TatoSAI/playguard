/**
 * TestScriptParser Service
 * Parses YAML/TypeScript test scripts into TestCase models
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

export class TestScriptParser {
  /**
   * Parse YAML script content into a ParseResult
   */
  parse(content: string, format: 'yaml' | 'typescript' = 'yaml'): ParseResult {
    if (format === 'yaml') {
      return this.parseYAML(content)
    }
    // TypeScript parsing not implemented yet
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

      // Extract basic metadata
      const partialTestCase: Partial<TestCase> = {
        name: testCase.name || '',
        description: testCase.description || '',
        tags: Array.isArray(testCase.tags) ? testCase.tags : [],
        steps: [],
        recordingMode: 'element' // Default for scripted tests
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
        // TODO: Parse prerequisites
        warnings.push('Prerequisites parsing not yet implemented')
      }

      // Parse cleanup steps (optional)
      if (Array.isArray(testCase.cleanup)) {
        partialTestCase.cleanup = testCase.cleanup.map((step: any, index: number) =>
          this.parseStep(step, index, warnings, 'cleanup')
        )
      }

      return {
        testCase: partialTestCase,
        warnings
      }
    } catch (error) {
      throw new Error(`YAML parsing error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Parse a single step from YAML
   */
  private parseStep(step: any, index: number, warnings: string[], context = 'step'): TestStep {
    const stepId = step.id || `${context}_${index + 1}`

    // Validate required fields
    if (!step.action) {
      warnings.push(`Step ${index + 1}: Missing "action" field`)
    }

    // Parse target
    let target: any = undefined
    if (step.target) {
      if (typeof step.target === 'string') {
        // Element path string
        target = {
          method: 'gameObject',
          value: step.target
        }
      } else if (typeof step.target === 'object') {
        // Object with element and/or fallback
        target = {
          method: step.target.element ? 'gameObject' : 'coordinate',
          value: step.target.element,
          fallback: step.target.fallback
        }
      }
    }

    // Build TestStep
    const testStep: TestStep = {
      id: stepId,
      type: step.action,
      description: step.description || ''
    }

    // Add target if present
    if (target) {
      testStep.target = target
    }

    // Add value if present (for input actions)
    if (step.value !== undefined) {
      testStep.value = step.value
    }

    // Add data if present
    if (step.data !== undefined) {
      testStep.data = step.data
    }

    // Handle duration for wait actions (convert to data.duration)
    if (step.action === 'wait' && step.duration !== undefined) {
      testStep.data = {
        ...testStep.data,
        duration: step.duration
      }
    }

    // Parse options
    if (step.options || step.waitBefore || step.waitAfter || step.screenshot) {
      testStep.options = {
        ...step.options,
        waitBefore: step.waitBefore,
        waitAfter: step.waitAfter,
        screenshot: step.screenshot
      }
    }

    // Parse validation
    if (step.validation) {
      testStep.assertion = {
        type: step.validation.type,
        target: step.validation.target,
        expected: step.validation.expected,
        threshold: step.validation.threshold,
        timeout: step.validation.timeout
      }
    }

    // Add element metadata if present
    if (step.elementPath) testStep.elementPath = step.elementPath
    if (step.elementName) testStep.elementName = step.elementName
    if (step.elementType) testStep.elementType = step.elementType

    // Test behavior controls
    if (step.expectedOutcome) {
      testStep.expectedOutcome = step.expectedOutcome
    }
    if (step.continueOnFailure !== undefined) {
      testStep.continueOnFailure = step.continueOnFailure
    }

    // Store expected result (custom field)
    if (step.expectedResult) {
      testStep.data = {
        ...testStep.data,
        expectedResult: step.expectedResult
      }
    }

    return testStep
  }

  /**
   * Validate parsed test case
   */
  validate(parsed: ParseResult): ValidationResult {
    const errors: ValidationError[] = []

    const testCase = parsed.testCase

    // Validate required fields
    if (!testCase.name || testCase.name.trim() === '') {
      errors.push({
        field: 'testCase.name',
        message: 'Test name is required'
      })
    }

    if (!testCase.steps || testCase.steps.length === 0) {
      errors.push({
        field: 'testCase.steps',
        message: 'At least one step is required'
      })
    }

    // Validate each step
    testCase.steps?.forEach((step, index) => {
      if (!step.type) {
        errors.push({
          field: `steps[${index}].type`,
          message: `Step ${index + 1}: Action type is required`
        })
      }

      if (!step.description || step.description.trim() === '') {
        errors.push({
          field: `steps[${index}].description`,
          message: `Step ${index + 1}: Description is required`
        })
      }

      // Validate specific action types
      if (step.type === 'input' && !step.value) {
        errors.push({
          field: `steps[${index}].value`,
          message: `Step ${index + 1}: Input action requires a "value" field`
        })
      }

      if (step.type === 'wait' && !step.data?.duration) {
        errors.push({
          field: `steps[${index}].data.duration`,
          message: `Step ${index + 1}: Wait action requires a "duration" field`
        })
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Convert parsed result to complete TestCase
   */
  toTestCase(
    parsed: ParseResult,
    suiteId: string,
    additionalMetadata: {
      tags?: string[]
      recordingDevice?: any
    } = {}
  ): TestCase {
    const validation = this.validate(parsed)
    if (!validation.valid) {
      throw new Error(
        `Cannot convert to TestCase: validation failed\n${validation.errors.map((e) => `- ${e.message}`).join('\n')}`
      )
    }

    const testCase = parsed.testCase

    // Generate ID (will be overridden by TestCaseManager)
    const timestamp = Date.now()
    const id = `test_${timestamp}`

    const now = new Date().toISOString()

    return {
      id,
      suiteId,
      name: testCase.name!,
      description: testCase.description || '',
      tags: additionalMetadata.tags || testCase.tags || [],
      recordingMode: testCase.recordingMode || 'element',
      recordingDevice: additionalMetadata.recordingDevice || {
        id: 'scripted',
        model: 'Scripted Test',
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

    const scriptObject = {
      testCase: {
        name: testCase.name,
        description: testCase.description,
        tags: testCase.tags,
        steps: testCase.steps.map((step) => this.stepToYAML(step)),
        ...(testCase.cleanup && testCase.cleanup.length > 0
          ? { cleanup: testCase.cleanup.map((step) => this.stepToYAML(step)) }
          : {})
      }
    }

    return yaml.stringify(scriptObject, {
      indent: 2,
      lineWidth: 0 // Don't wrap long lines
    })
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

    // Add target
    if (step.target) {
      if (step.target.method === 'gameObject' && step.target.value) {
        yamlStep.target = {
          element: step.target.value,
          ...(step.target.fallback ? { fallback: step.target.fallback } : {})
        }
      } else if (step.target.method === 'coordinate' && step.target.fallback) {
        yamlStep.target = step.target.fallback
      }
    }

    // Add value for input actions
    if (step.value !== undefined) {
      yamlStep.value = step.value
    }

    // Add options
    if (step.options) {
      if (step.options.waitBefore) yamlStep.waitBefore = step.options.waitBefore
      if (step.options.waitAfter) yamlStep.waitAfter = step.options.waitAfter
      if (step.options.screenshot) yamlStep.screenshot = step.options.screenshot
    }

    // Add validation
    if (step.assertion) {
      yamlStep.validation = {
        type: step.assertion.type,
        ...(step.assertion.target ? { target: step.assertion.target } : {}),
        ...(step.assertion.expected !== undefined ? { expected: step.assertion.expected } : {}),
        ...(step.assertion.threshold !== undefined ? { threshold: step.assertion.threshold } : {}),
        ...(step.assertion.timeout !== undefined ? { timeout: step.assertion.timeout } : {})
      }
    }

    // Add test behavior controls
    if (step.expectedOutcome) {
      yamlStep.expectedOutcome = step.expectedOutcome
    }
    if (step.continueOnFailure !== undefined) {
      yamlStep.continueOnFailure = step.continueOnFailure
    }

    // Add expected result if present in data
    if (step.data?.expectedResult) {
      yamlStep.expectedResult = step.data.expectedResult
    }

    return yamlStep
  }
}
