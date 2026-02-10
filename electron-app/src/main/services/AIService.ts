import Anthropic from '@anthropic-ai/sdk'
import { TestStep, TestCase, TestExecution, TestPrerequisite, TestSuite } from '../types/models'
import { ConfigManager } from '../managers/ConfigManager'

export class AIService {
  private configManager: ConfigManager
  private anthropicClient: Anthropic | null = null

  constructor(configManager: ConfigManager) {
    this.configManager = configManager
  }

  async initialize(): Promise<void> {
    console.log('[AIService] Initializing...')

    const settings = this.configManager.getSettings()
    if (!settings || !settings.ai.enabled) {
      console.log('[AIService] AI features disabled in settings')
      return
    }

    // Initialize AI client based on provider
    if (settings.ai.provider === 'anthropic') {
      const apiKey = await this.configManager.getAPIKey('anthropic')
      if (apiKey) {
        this.anthropicClient = new Anthropic({ apiKey })
        console.log('[AIService] Anthropic client initialized')
      } else {
        console.warn('[AIService] Anthropic API key not set')
      }
    }
  }

  // ============================================================================
  // Field Auto-completion
  // ============================================================================

  async generateTestDescription(steps: TestStep[]): Promise<string> {
    if (!this.isConfigured()) {
      return 'Test automation scenario'
    }

    const stepsDescription = steps
      .map((step, i) => `${i + 1}. ${step.type}: ${step.description || 'action'}`)
      .join('\n')

    const prompt = `Given these test steps, generate a concise test description (1-2 sentences) explaining what this test verifies:

${stepsDescription}

Provide only the description, no extra text.`

    return await this.callAnthropicAPI(prompt)
  }

  async generateStepDescription(step: TestStep, context: TestStep[]): Promise<string> {
    if (!this.isConfigured()) {
      return `${step.type} action`
    }

    const contextDesc = context.slice(-3).map(s => `- ${s.type}: ${s.description}`).join('\n')

    const prompt = `Given this test step and preceding context, generate a clear one-line description:

Previous steps:
${contextDesc}

Current step:
Type: ${step.type}
${step.target ? `Target: ${JSON.stringify(step.target)}` : ''}
${step.data ? `Data: ${JSON.stringify(step.data)}` : ''}

Provide only the description in imperative form (e.g., "Tap login button"), no extra text.`

    return await this.callAnthropicAPI(prompt)
  }

  async suggestPrerequisites(testCase: Partial<TestCase>): Promise<TestPrerequisite[]> {
    if (!this.isConfigured()) {
      return []
    }

    const prompt = `Given this test case, suggest 2-3 prerequisites needed before running it:

Test Name: ${testCase.name}
Description: ${testCase.description}
Steps: ${testCase.steps?.length || 0} actions

Provide prerequisites as JSON array with format:
[{"type": "app_state|data_setup|permission|custom", "description": "...", "details": {}}]

Only return the JSON array, no markdown or extra text.`

    const response = await this.callAnthropicAPI(prompt)

    try {
      const prerequisites = JSON.parse(response)
      return prerequisites.map((prereq: any, i: number) => ({
        id: `prereq_${i + 1}`,
        type: prereq.type || 'custom',
        description: prereq.description,
        details: prereq.details || {}
      }))
    } catch (error) {
      console.error('[AIService] Failed to parse prerequisites:', error)
      return []
    }
  }

  async suggestTags(testCase: Partial<TestCase>, suite: TestSuite): Promise<string[]> {
    if (!this.isConfigured()) {
      return []
    }

    const prompt = `Given this test case in a ${suite.environment} environment, suggest 3-5 relevant tags:

Test Name: ${testCase.name}
Description: ${testCase.description}
Suite Environment: ${suite.environment}
Suite Tags: ${suite.tags.join(', ')}

Suggest tags from these categories:
- Functional: authentication, ui, api, database, navigation
- Priority: critical, high, medium, low, smoke
- Feature: login, signup, profile, settings, shop, payment

Provide only tag names as comma-separated list, no extra text.`

    const response = await this.callAnthropicAPI(prompt)

    // Parse response
    return response
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
  }

  // ============================================================================
  // Analysis
  // ============================================================================

  async analyzeFailure(execution: TestExecution): Promise<string> {
    if (!this.isConfigured()) {
      return execution.failureReason || 'Test failed'
    }

    const failedSteps = execution.steps.filter(s => s.status === 'failed')
    const failedStep = failedSteps[0]

    const prompt = `Analyze this test failure and provide a concise explanation:

Failed Step: ${failedStep?.stepId}
Error: ${failedStep?.error}
Test Duration: ${execution.duration}ms
Total Steps: ${execution.steps.length}
Failed At: Step ${execution.steps.indexOf(failedStep) + 1}

Provide a 1-2 sentence analysis of why the test might have failed and potential solutions.`

    return await this.callAnthropicAPI(prompt)
  }

  async suggestFixes(execution: TestExecution): Promise<string[]> {
    if (!this.isConfigured()) {
      return ['Review test steps', 'Check device state', 'Verify app is running']
    }

    const failedSteps = execution.steps.filter(s => s.status === 'failed')

    const prompt = `Given this test failure, suggest 3-5 specific fixes:

Failed Steps:
${failedSteps.map(s => `- ${s.stepId}: ${s.error}`).join('\n')}

Device: ${execution.device.model} (${execution.device.androidVersion})

Provide fixes as numbered list without markdown, just plain text lines.`

    const response = await this.callAnthropicAPI(prompt)

    // Parse numbered list
    return response
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
  }

  // ============================================================================
  // API Calls
  // ============================================================================

  private async callAnthropicAPI(prompt: string): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized')
    }

    try {
      const settings = this.configManager.getSettings()
      const model = settings?.ai.model || 'claude-3-5-sonnet-20241022'
      const maxTokens = settings?.ai.maxTokens || 1000
      const temperature = settings?.ai.temperature || 0.7

      const message = await this.anthropicClient.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const textContent = message.content.find(block => block.type === 'text')
      if (textContent && 'text' in textContent) {
        return textContent.text.trim()
      }

      return ''
    } catch (error) {
      console.error('[AIService] API call failed:', error)
      throw error
    }
  }

  // For OpenAI provider (future implementation)
  private async callOpenAIAPI(prompt: string): Promise<string> {
    // TODO: Implement OpenAI integration
    throw new Error('OpenAI provider not yet implemented')
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private isConfigured(): boolean {
    const settings = this.configManager.getSettings()
    return !!(
      settings &&
      settings.ai.enabled &&
      settings.ai.apiKeySet &&
      this.anthropicClient
    )
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false
    }

    try {
      await this.callAnthropicAPI('Say "OK" if you can read this.')
      return true
    } catch (error) {
      console.error('[AIService] Connection test failed:', error)
      return false
    }
  }

  isEnabled(): boolean {
    const settings = this.configManager.getSettings()
    return settings?.ai.enabled || false
  }
}
