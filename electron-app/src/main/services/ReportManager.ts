/**
 * Report Manager
 * Manages test execution history and report generation
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

export interface ExecutionRecord {
  id: string // exec_timestamp
  timestamp: string // ISO string
  suiteId: string
  suiteName: string
  testId: string
  testName: string
  deviceId: string
  deviceModel: string
  status: 'passed' | 'failed' | 'error'
  duration: number // milliseconds
  totalSteps: number
  passedSteps: number
  failedSteps: number
  error?: string
}

// New structure: Test case execution within a suite session
export interface TestCaseExecution {
  testId: string
  testName: string
  status: 'passed' | 'failed' | 'error'
  duration: number // milliseconds
  totalSteps: number
  passedSteps: number
  failedSteps: number
  error?: string
  screenshots: string[] // failure evidence screenshots
  steps?: Array<{
    description: string
    status: 'passed' | 'failed' | 'error'
    duration?: number
    screenshot?: string
    error?: string
  }>
}

// New structure: Suite execution session (groups multiple test cases)
export interface SuiteExecutionSession {
  id: string // session_timestamp
  timestamp: string // ISO string
  suiteId: string
  suiteName: string
  deviceId: string
  deviceModel: string
  testCases: TestCaseExecution[] // All test cases executed in this session
  status: 'passed' | 'failed' | 'partial' // partial = some passed, some failed
  duration: number // total duration of all tests
  totalTests: number
  passedTests: number
  failedTests: number
  errorTests: number
  successRate: number // percentage
}

export interface ExecutionStats {
  total: number
  passed: number
  failed: number
  error: number
  successRate: number // percentage
  averageDuration: number // milliseconds
  totalDuration: number // milliseconds
  byStatus: {
    passed: ExecutionRecord[]
    failed: ExecutionRecord[]
    error: ExecutionRecord[]
  }
  bySuite: Record<string, {
    total: number
    passed: number
    failed: number
    error: number
  }>
  recentExecutions: ExecutionRecord[] // Last 10
}

export class ReportManager {
  private historyFile: string
  private sessionsFile: string // New: for suite execution sessions
  private executions: ExecutionRecord[] = [] // Legacy: individual test executions
  private sessions: SuiteExecutionSession[] = [] // New: suite execution sessions

  constructor() {
    const userDataPath = app.getPath('userData')
    const testDataPath = path.join(userDataPath, 'test-data')
    this.historyFile = path.join(testDataPath, 'execution-history.json')
    this.sessionsFile = path.join(testDataPath, 'suite-sessions.json')
  }

  async initialize(): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.historyFile), { recursive: true })

      // Load existing history (legacy)
      await this.loadHistory()

      // Load suite sessions (new)
      await this.loadSessions()
    } catch (error) {
      console.error('[ReportManager] Failed to initialize:', error)
      this.executions = []
      this.sessions = []
    }
  }

  private async loadHistory(): Promise<void> {
    try {
      const data = await fs.readFile(this.historyFile, 'utf-8')
      this.executions = JSON.parse(data)
      console.log(`[ReportManager] Loaded ${this.executions.length} execution records`)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, start with empty array
        this.executions = []
        await this.saveHistory()
      } else {
        throw error
      }
    }
  }

  private async saveHistory(): Promise<void> {
    try {
      await fs.writeFile(this.historyFile, JSON.stringify(this.executions, null, 2), 'utf-8')
    } catch (error) {
      console.error('[ReportManager] Failed to save history:', error)
      throw error
    }
  }

  private async loadSessions(): Promise<void> {
    try {
      const data = await fs.readFile(this.sessionsFile, 'utf-8')
      this.sessions = JSON.parse(data)
      console.log(`[ReportManager] Loaded ${this.sessions.length} suite execution sessions`)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, start with empty array
        this.sessions = []
        await this.saveSessions()
      } else {
        throw error
      }
    }
  }

  private async saveSessions(): Promise<void> {
    try {
      await fs.writeFile(this.sessionsFile, JSON.stringify(this.sessions, null, 2), 'utf-8')
    } catch (error) {
      console.error('[ReportManager] Failed to save sessions:', error)
      throw error
    }
  }

  /**
   * Record a test execution
   */
  async recordExecution(record: ExecutionRecord): Promise<void> {
    console.log(`[ReportManager] Recording execution: ${record.testName} - ${record.status}`)

    // Add to beginning of array (most recent first)
    this.executions.unshift(record)

    // Keep only last 1000 executions to avoid file bloat
    if (this.executions.length > 1000) {
      this.executions = this.executions.slice(0, 1000)
    }

    await this.saveHistory()
  }

  /**
   * Record a suite execution session (NEW - groups multiple test cases)
   */
  async recordSuiteSession(session: SuiteExecutionSession): Promise<void> {
    console.log(
      `[ReportManager] Recording suite session: ${session.suiteName} - ` +
      `${session.passedTests}/${session.totalTests} passed - ${session.status}`
    )

    // Add to beginning of array (most recent first)
    this.sessions.unshift(session)

    // Keep only last 500 sessions to avoid file bloat
    if (this.sessions.length > 500) {
      this.sessions = this.sessions.slice(0, 500)
    }

    await this.saveSessions()
  }

  /**
   * Get all suite execution sessions with optional filters
   */
  async getSessions(filters?: {
    suiteId?: string
    status?: 'passed' | 'failed' | 'partial'
    startDate?: string
    endDate?: string
    limit?: number
  }): Promise<SuiteExecutionSession[]> {
    let filtered = [...this.sessions]

    // Apply filters
    if (filters) {
      if (filters.suiteId) {
        filtered = filtered.filter(s => s.suiteId === filters.suiteId)
      }

      if (filters.status) {
        filtered = filtered.filter(s => s.status === filters.status)
      }

      if (filters.startDate) {
        filtered = filtered.filter(s => s.timestamp >= filters.startDate!)
      }

      if (filters.endDate) {
        filtered = filtered.filter(s => s.timestamp <= filters.endDate!)
      }

      if (filters.limit) {
        filtered = filtered.slice(0, filters.limit)
      }
    }

    return filtered
  }

  /**
   * Get session by ID
   */
  async getSessionById(id: string): Promise<SuiteExecutionSession | null> {
    return this.sessions.find(s => s.id === id) || null
  }

  /**
   * Clear all suite sessions
   */
  async clearSessions(): Promise<void> {
    this.sessions = []
    await this.saveSessions()
    console.log('[ReportManager] Cleared all suite execution sessions')
  }

  /**
   * Export sessions to JSON
   */
  async exportSessionToJSON(sessionId: string, outputPath: string): Promise<void> {
    const session = await this.getSessionById(sessionId)

    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const report = {
      generatedAt: new Date().toISOString(),
      session
    }

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8')
    console.log(`[ReportManager] Exported session ${sessionId} to ${outputPath}`)
  }

  /**
   * Get all executions with optional filters
   */
  async getExecutions(filters?: {
    suiteId?: string
    testId?: string
    status?: 'passed' | 'failed' | 'error'
    startDate?: string
    endDate?: string
    limit?: number
  }): Promise<ExecutionRecord[]> {
    let filtered = [...this.executions]

    // Apply filters
    if (filters) {
      if (filters.suiteId) {
        filtered = filtered.filter(e => e.suiteId === filters.suiteId)
      }

      if (filters.testId) {
        filtered = filtered.filter(e => e.testId === filters.testId)
      }

      if (filters.status) {
        filtered = filtered.filter(e => e.status === filters.status)
      }

      if (filters.startDate) {
        filtered = filtered.filter(e => e.timestamp >= filters.startDate!)
      }

      if (filters.endDate) {
        filtered = filtered.filter(e => e.timestamp <= filters.endDate!)
      }

      if (filters.limit) {
        filtered = filtered.slice(0, filters.limit)
      }
    }

    return filtered
  }

  /**
   * Get execution statistics
   */
  async getStats(filters?: {
    suiteId?: string
    startDate?: string
    endDate?: string
  }): Promise<ExecutionStats> {
    const executions = await this.getExecutions(filters)

    const stats: ExecutionStats = {
      total: executions.length,
      passed: 0,
      failed: 0,
      error: 0,
      successRate: 0,
      averageDuration: 0,
      totalDuration: 0,
      byStatus: {
        passed: [],
        failed: [],
        error: []
      },
      bySuite: {},
      recentExecutions: executions.slice(0, 10)
    }

    // Calculate statistics
    executions.forEach(exec => {
      // Count by status
      if (exec.status === 'passed') {
        stats.passed++
        stats.byStatus.passed.push(exec)
      } else if (exec.status === 'failed') {
        stats.failed++
        stats.byStatus.failed.push(exec)
      } else if (exec.status === 'error') {
        stats.error++
        stats.byStatus.error.push(exec)
      }

      // Total duration
      stats.totalDuration += exec.duration

      // By suite
      if (!stats.bySuite[exec.suiteId]) {
        stats.bySuite[exec.suiteId] = {
          total: 0,
          passed: 0,
          failed: 0,
          error: 0
        }
      }
      stats.bySuite[exec.suiteId].total++
      stats.bySuite[exec.suiteId][exec.status]++
    })

    // Calculate derived stats
    if (stats.total > 0) {
      stats.successRate = Math.round((stats.passed / stats.total) * 100)
      stats.averageDuration = Math.round(stats.totalDuration / stats.total)
    }

    return stats
  }

  /**
   * Get execution by ID
   */
  async getExecutionById(id: string): Promise<ExecutionRecord | null> {
    return this.executions.find(e => e.id === id) || null
  }

  /**
   * Delete old executions (older than specified days)
   */
  async cleanupOldExecutions(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    const cutoffISO = cutoffDate.toISOString()

    const originalCount = this.executions.length
    this.executions = this.executions.filter(e => e.timestamp >= cutoffISO)
    const deletedCount = originalCount - this.executions.length

    if (deletedCount > 0) {
      await this.saveHistory()
      console.log(`[ReportManager] Cleaned up ${deletedCount} old executions`)
    }

    return deletedCount
  }

  /**
   * Clear all execution history
   */
  async clearHistory(): Promise<void> {
    this.executions = []
    await this.saveHistory()
    console.log('[ReportManager] Cleared all execution history')
  }

  /**
   * Export executions to JSON
   */
  async exportToJSON(outputPath: string, filters?: {
    suiteId?: string
    startDate?: string
    endDate?: string
  }): Promise<void> {
    const executions = await this.getExecutions(filters)
    const stats = await this.getStats(filters)

    const report = {
      generatedAt: new Date().toISOString(),
      filters,
      statistics: stats,
      executions
    }

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8')
    console.log(`[ReportManager] Exported ${executions.length} executions to ${outputPath}`)
  }
}

// Singleton instance
export const reportManager = new ReportManager()
