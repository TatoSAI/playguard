import { app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface TestCase {
  id: string
  name: string
  description: string
  version: string
  tags: string[]
  createdAt: string
  updatedAt: string
  variables?: Record<string, any>
  steps: TestStep[]
  cleanup?: TestStep[]
}

export interface TestStep {
  id: string
  type: string
  description: string
  [key: string]: any
}

export class FileManager {
  private testsDir: string

  constructor() {
    // Store tests in user data directory
    const userDataPath = app.getPath('userData')
    this.testsDir = path.join(userDataPath, 'test-cases')
  }

  async initialize(): Promise<void> {
    try {
      // Create test-cases directory if it doesn't exist
      await fs.mkdir(this.testsDir, { recursive: true })

      // Create subdirectories
      await fs.mkdir(path.join(this.testsDir, 'examples'), { recursive: true })
      await fs.mkdir(path.join(this.testsDir, 'recordings'), { recursive: true })

      console.log(`[FileManager] Initialized with directory: ${this.testsDir}`)

      // Create example tests if directory is empty
      const files = await fs.readdir(this.testsDir)
      if (files.length === 0) {
        await this.createExampleTests()
      }
    } catch (error) {
      console.error('[FileManager] Failed to initialize:', error)
      throw error
    }
  }

  async saveTest(testCase: TestCase): Promise<string> {
    try {
      const fileName = `${testCase.id}.json`
      const filePath = path.join(this.testsDir, fileName)

      // Update timestamp
      testCase.updatedAt = new Date().toISOString()

      // Write to file
      await fs.writeFile(filePath, JSON.stringify(testCase, null, 2), 'utf-8')

      console.log(`[FileManager] Saved test: ${fileName}`)
      return filePath
    } catch (error) {
      console.error('[FileManager] Failed to save test:', error)
      throw error
    }
  }

  async loadTest(filePath: string): Promise<TestCase> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const testCase = JSON.parse(content) as TestCase

      console.log(`[FileManager] Loaded test: ${path.basename(filePath)}`)
      return testCase
    } catch (error) {
      console.error('[FileManager] Failed to load test:', error)
      throw error
    }
  }

  async listTests(): Promise<TestCase[]> {
    try {
      const files = await fs.readdir(this.testsDir)
      const jsonFiles = files.filter((f) => f.endsWith('.json'))

      const tests: TestCase[] = []

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.testsDir, file)
          const test = await this.loadTest(filePath)
          tests.push(test)
        } catch (error) {
          console.error(`[FileManager] Failed to load test ${file}:`, error)
        }
      }

      // Sort by updated date (most recent first)
      tests.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })

      console.log(`[FileManager] Listed ${tests.length} tests`)
      return tests
    } catch (error) {
      console.error('[FileManager] Failed to list tests:', error)
      return []
    }
  }

  async deleteTest(testId: string): Promise<boolean> {
    try {
      const fileName = `${testId}.json`
      const filePath = path.join(this.testsDir, fileName)

      await fs.unlink(filePath)

      console.log(`[FileManager] Deleted test: ${fileName}`)
      return true
    } catch (error) {
      console.error('[FileManager] Failed to delete test:', error)
      return false
    }
  }

  async duplicateTest(testId: string): Promise<TestCase | null> {
    try {
      const fileName = `${testId}.json`
      const filePath = path.join(this.testsDir, fileName)

      const originalTest = await this.loadTest(filePath)

      // Create duplicate with new ID
      const duplicateTest: TestCase = {
        ...originalTest,
        id: `${testId}_copy_${Date.now()}`,
        name: `${originalTest.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await this.saveTest(duplicateTest)

      console.log(`[FileManager] Duplicated test: ${testId}`)
      return duplicateTest
    } catch (error) {
      console.error('[FileManager] Failed to duplicate test:', error)
      return null
    }
  }

  async exportTest(testId: string, exportPath: string): Promise<boolean> {
    try {
      const fileName = `${testId}.json`
      const filePath = path.join(this.testsDir, fileName)

      const content = await fs.readFile(filePath, 'utf-8')
      await fs.writeFile(exportPath, content, 'utf-8')

      console.log(`[FileManager] Exported test to: ${exportPath}`)
      return true
    } catch (error) {
      console.error('[FileManager] Failed to export test:', error)
      return false
    }
  }

  async importTest(importPath: string): Promise<TestCase | null> {
    try {
      const content = await fs.readFile(importPath, 'utf-8')
      const testCase = JSON.parse(content) as TestCase

      // Generate new ID to avoid conflicts
      testCase.id = `imported_${Date.now()}`
      testCase.createdAt = new Date().toISOString()
      testCase.updatedAt = new Date().toISOString()

      await this.saveTest(testCase)

      console.log(`[FileManager] Imported test: ${testCase.name}`)
      return testCase
    } catch (error) {
      console.error('[FileManager] Failed to import test:', error)
      return null
    }
  }

  getTestsDirectory(): string {
    return this.testsDir
  }

  private async createExampleTests(): Promise<void> {
    const exampleTests: TestCase[] = [
      {
        id: 'example_login_001',
        name: 'Login Flow Test',
        description: 'Verify user can log in with valid credentials',
        version: '1.0',
        tags: ['authentication', 'smoke', 'critical'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        variables: {
          email: 'test@example.com',
          password: 'pass123'
        },
        steps: [
          {
            id: 'step_1',
            type: 'tap',
            description: 'Tap Login button',
            target: {
              method: 'gameObject',
              value: 'Button_Login',
              fallback: { x: 0.5, y: 0.7 }
            },
            options: {
              waitBefore: 1.0,
              screenshot: true
            }
          },
          {
            id: 'step_2',
            type: 'input',
            description: 'Enter email',
            target: {
              method: 'gameObject',
              value: 'InputField_Email'
            },
            value: '{{email}}',
            options: {
              clearFirst: true
            }
          },
          {
            id: 'step_3',
            type: 'input',
            description: 'Enter password',
            target: {
              method: 'gameObject',
              value: 'InputField_Password'
            },
            value: '{{password}}'
          },
          {
            id: 'step_4',
            type: 'tap',
            description: 'Tap Submit button',
            target: {
              method: 'gameObject',
              value: 'Button_Submit'
            }
          },
          {
            id: 'step_5',
            type: 'wait',
            description: 'Wait for loading',
            waitType: 'duration',
            value: 3.0
          },
          {
            id: 'step_6',
            type: 'assert',
            description: 'Verify welcome panel exists',
            assertType: 'elementExists',
            target: 'Panel_Welcome',
            timeout: 5.0
          }
        ],
        cleanup: [
          {
            id: 'cleanup_1',
            type: 'tap',
            description: 'Logout',
            target: {
              method: 'gameObject',
              value: 'Button_Logout'
            }
          }
        ]
      },
      {
        id: 'example_tutorial_001',
        name: 'Tutorial Complete',
        description: 'Complete tutorial from start to finish',
        version: '1.0',
        tags: ['tutorial', 'onboarding', 'smoke'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [
          {
            id: 'step_1',
            type: 'tap',
            description: 'Start tutorial',
            target: {
              method: 'gameObject',
              value: 'Button_StartTutorial'
            }
          },
          {
            id: 'step_2',
            type: 'tap',
            description: 'Next step',
            target: {
              method: 'gameObject',
              value: 'Button_Next'
            }
          },
          {
            id: 'step_3',
            type: 'assert',
            description: 'Verify tutorial complete',
            assertType: 'elementExists',
            target: 'Panel_TutorialComplete'
          }
        ]
      }
    ]

    for (const test of exampleTests) {
      await this.saveTest(test)
    }

    console.log(`[FileManager] Created ${exampleTests.length} example tests`)
  }
}
