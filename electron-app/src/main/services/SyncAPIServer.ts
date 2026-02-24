/**
 * SyncAPIServer - REST API for RUN.studio integration
 * Allows RUN.studio to import test specs and retrieve execution results.
 * Runs locally on port 7777.
 */

import express, { Request, Response, NextFunction } from 'express'
import * as http from 'http'
import { TestCaseManager } from '../managers/TestCaseManager'
import { SuiteManager } from '../managers/SuiteManager'
import { reportManager } from './ReportManager'
import type { TestStep } from '../types/models'

interface RunStudioTestStep {
  action: string // 'tap' | 'swipe' | 'input' | 'wait' | 'assert'
  target?: string // element name or selector
  value?: any
  expected?: any
  timeout?: number
}

interface RunStudioTestSpec {
  name: string
  description?: string
  tags?: string[]
  suiteId?: string
  steps: RunStudioTestStep[]
}

export class SyncAPIServer {
  private app = express()
  private server: http.Server | null = null
  private readonly PORT = 7777

  constructor(
    private testCaseManager: TestCaseManager,
    private suiteManager: SuiteManager
  ) {
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '1mb' }))

    // CORS — allow RUN.studio (localhost) to call this API
    this.app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      if (_req.method === 'OPTIONS') {
        res.sendStatus(200)
        return
      }
      next()
    })
  }

  private setupRoutes(): void {
    /** Health check — returns PlayGuard status and connected suites count */
    this.app.get('/api/status', async (_req: Request, res: Response) => {
      try {
        const suites = await this.suiteManager.listSuites()
        res.json({
          status: 'ok',
          version: '1.0.0',
          platform: 'PlayGuard',
          suiteCount: suites.length,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        res.status(500).json({ status: 'error', error: String(error) })
      }
    })

    /** Import test specs from RUN.studio */
    this.app.post('/api/sync/tests', async (req: Request, res: Response) => {
      try {
        const body = req.body
        const specs: RunStudioTestSpec[] = Array.isArray(body) ? body : [body]

        if (specs.length === 0) {
          res.status(400).json({ success: false, error: 'No test specs provided' })
          return
        }

        const created: string[] = []

        for (const spec of specs) {
          if (!spec.name || !Array.isArray(spec.steps)) {
            console.warn('[SyncAPIServer] Skipping invalid spec:', spec)
            continue
          }

          const suiteId = spec.suiteId || (await this.getOrCreateSyncSuite())
          const testCase = this.convertSpecToTestCase(spec, suiteId)
          const saved = await this.testCaseManager.createTestCase(suiteId, testCase as any)
          created.push(saved.id)
          console.log(`[SyncAPIServer] Imported test: ${spec.name} → ${saved.id}`)
        }

        res.json({ success: true, created, count: created.length })
      } catch (error) {
        console.error('[SyncAPIServer] Import error:', error)
        res.status(400).json({ success: false, error: String(error) })
      }
    })

    /** Return latest execution results */
    this.app.get('/api/sync/results', async (req: Request, res: Response) => {
      try {
        const limit = Math.min(Number(req.query.limit) || 50, 200)
        const suiteId = req.query.suiteId as string | undefined
        const executions = await reportManager.getExecutions({ suiteId, limit })
        res.json({ success: true, results: executions, count: executions.length })
      } catch (error) {
        res.status(500).json({ success: false, error: String(error) })
      }
    })

    /** List available test suites */
    this.app.get('/api/sync/suites', async (_req: Request, res: Response) => {
      try {
        const suites = await this.suiteManager.listSuites()
        res.json({
          success: true,
          suites: suites.map((s) => ({
            id: s.id,
            name: s.name,
            environment: s.environment,
            testCount: s.testCaseIds?.length ?? 0
          }))
        })
      } catch (error) {
        res.status(500).json({ success: false, error: String(error) })
      }
    })
  }

  private async getOrCreateSyncSuite(): Promise<string> {
    const suites = await this.suiteManager.listSuites()
    const existing = suites.find((s) => s.name === 'RUN.studio Synced')
    if (existing) return existing.id

    const newSuite = await this.suiteManager.createSuite({
      name: 'RUN.studio Synced',
      description: 'Test cases imported from RUN.studio',
      environment: 'Staging',
      targetPlatform: 'Web',
      tags: [],
      testCaseIds: []
    })
    console.log(`[SyncAPIServer] Created sync suite: ${newSuite.id}`)
    return newSuite.id
  }

  private convertSpecToTestCase(spec: RunStudioTestSpec, suiteId: string): Partial<any> {
    const steps: Partial<TestStep>[] = spec.steps.map((s, i) => {
      const step: Partial<TestStep> = {
        id: `step_${String(i + 1).padStart(3, '0')}`,
        type: s.action as any,
        description: s.target ? `${s.action} on ${s.target}` : s.action
      }

      if (s.target) {
        step.target = {
          method: 'html5Element' as any,
          value: s.target
        }
      }

      if (s.value !== undefined) {
        step.value = s.value
      }

      if (s.action === 'assert' && s.expected !== undefined) {
        step.assertion = {
          type: 'text_equals' as any,
          target: { elementName: s.target },
          expected: s.expected,
          timeout: s.timeout ?? 5000
        }
      }

      if (s.timeout) {
        step.options = { timeout: s.timeout }
      }

      return step
    })

    return {
      name: spec.name,
      description: spec.description ?? '',
      tags: spec.tags ?? [],
      suiteId,
      recordingMode: 'html5' as any,
      gameSDKType: 'html5',
      steps,
      executionHistory: [],
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recordingDevice: {
        id: 'runstudio',
        model: 'RUN.studio Browser',
        manufacturer: 'Web',
        androidVersion: 'N/A',
        resolution: '1920x1080',
        recordedAt: new Date().toISOString()
      }
    }
  }

  start(): void {
    if (this.server) return

    this.server = this.app.listen(this.PORT, '127.0.0.1', () => {
      console.log(`[SyncAPIServer] REST API listening on http://127.0.0.1:${this.PORT}`)
    })

    this.server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[SyncAPIServer] Port ${this.PORT} already in use. Sync API unavailable.`)
      } else {
        console.error('[SyncAPIServer] Server error:', err)
      }
    })
  }

  stop(): void {
    this.server?.close(() => {
      console.log('[SyncAPIServer] Stopped')
    })
    this.server = null
  }
}
