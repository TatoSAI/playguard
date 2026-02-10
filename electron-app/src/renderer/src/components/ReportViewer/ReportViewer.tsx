/**
 * Report Viewer Component
 * Displays suite execution sessions with per-session metrics
 */

import React, { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Clock,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Image,
  X
} from 'lucide-react'
import { ScreenshotViewer } from '../Common/ScreenshotViewer'

// Test case execution within a suite session
interface TestCaseExecution {
  testId: string
  testName: string
  status: 'passed' | 'failed' | 'error'
  duration: number
  totalSteps: number
  passedSteps: number
  failedSteps: number
  error?: string
  screenshots: string[]
  steps?: Array<{
    description: string
    status: 'passed' | 'failed' | 'error'
    duration?: number
    screenshot?: string
    error?: string
  }>
}

// Suite execution session
interface SuiteExecutionSession {
  id: string
  timestamp: string
  suiteId: string
  suiteName: string
  deviceId: string
  deviceModel: string
  testCases: TestCaseExecution[]
  status: 'passed' | 'failed' | 'partial'
  duration: number
  totalTests: number
  passedTests: number
  failedTests: number
  errorTests: number
  successRate: number
}

interface ReportViewerProps {
  highlightExecutionId?: string | null
}

export default function ReportViewer({ highlightExecutionId }: ReportViewerProps = {}): JSX.Element {
  const [sessions, setSessions] = useState<SuiteExecutionSession[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed' | 'partial'>('all')
  const [suiteFilter, setSuiteFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  })
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [expandedTestCases, setExpandedTestCases] = useState<Set<string>>(new Set())
  const [viewingScreenshots, setViewingScreenshots] = useState<{ screenshots: string[], title: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [filter, suiteFilter, dateRange])

  // Handle ESC key to close screenshot modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewingScreenshots) {
        setViewingScreenshots(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [viewingScreenshots])

  const loadData = async () => {
    setLoading(true)
    try {
      // Build filters
      const filters: any = {}
      if (filter !== 'all') {
        filters.status = filter
      }
      if (suiteFilter !== 'all') {
        filters.suiteId = suiteFilter
      }
      if (dateRange.start) {
        filters.startDate = new Date(dateRange.start).toISOString()
      }
      if (dateRange.end) {
        filters.endDate = new Date(dateRange.end + 'T23:59:59').toISOString()
      }

      // Get sessions
      const sessionsResult = await window.api.report.getSessions({ ...filters, limit: 100 })

      if (sessionsResult.success && sessionsResult.sessions) {
        setSessions(sessionsResult.sessions)
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportSession = async (sessionId: string) => {
    try {
      const result = await window.api.report.exportSessionToJSON(sessionId, `session_${sessionId}.json`)
      if (result.success) {
        alert('Session report exported successfully!')
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export session report')
    }
  }

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all session history? This cannot be undone.')) {
      return
    }

    try {
      const result = await window.api.report.clearSessions()
      if (result.success) {
        loadData()
      }
    } catch (error) {
      console.error('Failed to clear history:', error)
      alert('Failed to clear history')
    }
  }

  const toggleSessionExpansion = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
  }

  const toggleTestCaseExpansion = (testCaseId: string) => {
    const newExpanded = new Set(expandedTestCases)
    if (newExpanded.has(testCaseId)) {
      newExpanded.delete(testCaseId)
    } else {
      newExpanded.add(testCaseId)
    }
    setExpandedTestCases(newExpanded)
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return null
    }
  }

  const downloadScreenshot = (screenshot: string, title: string): void => {
    // Create a temporary link to download the screenshot
    const img = new Image()
    const screenshotSrc = screenshot.startsWith('data:')
      ? screenshot
      : `data:image/png;base64,${screenshot}`
    img.src = screenshotSrc

    img.onload = () => {
      // Create canvas to convert to blob
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${title.replace(/\s+/g, '_')}_${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'text-green-500 bg-green-500/10 border-green-500/20'
      case 'failed':
        return 'text-red-500 bg-red-500/10 border-red-500/20'
      case 'error':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
      case 'partial':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      default:
        return 'text-muted-foreground bg-muted'
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (sessions.length === 0 && filter === 'all' && suiteFilter === 'all' && !dateRange.start && !dateRange.end) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Test Sessions</h3>
          <p className="text-sm text-muted-foreground">
            Run test suites to see execution sessions here
          </p>
        </div>
      </div>
    )
  }

  const uniqueSuites = Array.from(new Set(sessions.map((s) => s.suiteName)))

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Test Execution Sessions
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {sessions.length} suite execution session{sessions.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={loadData}
              className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 border border-border rounded-lg bg-muted/20">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">
                  Status
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                >
                  <option value="all">All</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">
                  Suite
                </label>
                <select
                  value={suiteFilter}
                  onChange={(e) => setSuiteFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                >
                  <option value="all">All Suites</option>
                  {uniqueSuites.map((suite) => (
                    <option key={suite} value={suite}>
                      {suite}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No sessions match your filters</p>
            </div>
          ) : (
            sessions.map((session) => {
              const isExpanded = expandedSessions.has(session.id)
              const isHighlighted = highlightExecutionId === session.id

              return (
                <div
                  key={session.id}
                  className={`border border-border rounded-lg bg-card overflow-hidden transition-all duration-300 ${
                    isHighlighted ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                >
                  {/* Session Header */}
                  <div className="p-4 border-b border-border bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(session.status)}
                        <h3 className="font-semibold text-foreground text-lg">{session.suiteName}</h3>
                        <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(session.status)}`}>
                          {session.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExportSession(session.id)}
                          className="px-3 py-1.5 text-xs rounded border border-border hover:bg-accent transition-colors flex items-center gap-1.5"
                          title="Export session report"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export
                        </button>
                        <button
                          onClick={() => toggleSessionExpansion(session.id)}
                          className="px-3 py-1.5 text-xs rounded border border-border hover:bg-accent transition-colors flex items-center gap-1.5"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              Details
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Session Metrics */}
                    <div className="grid grid-cols-6 gap-3">
                      <div className="bg-background/50 rounded px-3 py-2 border border-border">
                        <div className="text-xs text-muted-foreground">Total Tests</div>
                        <div className="text-lg font-bold text-foreground">{session.totalTests}</div>
                      </div>
                      <div className="bg-background/50 rounded px-3 py-2 border border-border">
                        <div className="text-xs text-muted-foreground">Passed</div>
                        <div className="text-lg font-bold text-green-500">{session.passedTests}</div>
                      </div>
                      <div className="bg-background/50 rounded px-3 py-2 border border-border">
                        <div className="text-xs text-muted-foreground">Failed</div>
                        <div className="text-lg font-bold text-red-500">{session.failedTests}</div>
                      </div>
                      <div className="bg-background/50 rounded px-3 py-2 border border-border">
                        <div className="text-xs text-muted-foreground">Success Rate</div>
                        <div className="text-lg font-bold text-foreground">{session.successRate}%</div>
                      </div>
                      <div className="bg-background/50 rounded px-3 py-2 border border-border">
                        <div className="text-xs text-muted-foreground">Duration</div>
                        <div className="text-lg font-bold text-foreground">{formatDuration(session.duration)}</div>
                      </div>
                      <div className="bg-background/50 rounded px-3 py-2 border border-border">
                        <div className="text-xs text-muted-foreground">Device</div>
                        <div className="text-sm font-medium text-foreground truncate" title={session.deviceModel}>
                          {session.deviceModel}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Test Cases List (Expanded) */}
                  {isExpanded && (
                    <div className="p-4 space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        Test Cases ({session.testCases.length})
                      </h4>
                      {session.testCases.map((testCase, idx) => {
                        const testCaseKey = `${session.id}-${testCase.testId}-${idx}`
                        const isTestCaseExpanded = expandedTestCases.has(testCaseKey)
                        const hasDetails = (testCase.steps && testCase.steps.length > 0) || (testCase.screenshots && testCase.screenshots.length > 0)

                        return (
                          <div
                            key={testCaseKey}
                            className="border border-border rounded p-3 bg-muted/10"
                          >
                            {/* Test Case Header */}
                            <div
                              className={`flex items-center justify-between mb-2 ${hasDetails ? 'cursor-pointer' : ''}`}
                              onClick={() => hasDetails && toggleTestCaseExpansion(testCaseKey)}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                {getStatusIcon(testCase.status)}
                                <span className="text-sm font-medium text-foreground">{testCase.testName}</span>
                                <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(testCase.status)}`}>
                                  {testCase.status.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDuration(testCase.duration)}
                                </span>
                                <span>
                                  Steps: {testCase.passedSteps}/{testCase.totalSteps}
                                </span>
                                {testCase.screenshots && testCase.screenshots.length > 0 && (
                                  <span className="flex items-center gap-1 text-orange-500">
                                    <Image className="w-3 h-3" />
                                    {testCase.screenshots.length}
                                  </span>
                                )}
                                {hasDetails && (
                                  isTestCaseExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </div>

                            {/* Error Message */}
                            {testCase.error && (
                              <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 mt-2">
                                {testCase.error}
                              </div>
                            )}

                            {/* Expanded Details: Steps */}
                            {isTestCaseExpanded && testCase.steps && testCase.steps.length > 0 && (
                              <div className="mt-3 border-t border-border pt-3">
                                <h5 className="text-xs font-medium text-muted-foreground mb-2">
                                  Test Steps ({testCase.steps.length})
                                </h5>
                                <div className="space-y-1">
                                  {testCase.steps.map((step, stepIdx) => (
                                    <div
                                      key={stepIdx}
                                      className={`flex items-center gap-2 text-xs p-2 rounded ${
                                        step.status === 'passed'
                                          ? 'bg-green-500/5'
                                          : step.status === 'failed'
                                          ? 'bg-red-500/5'
                                          : 'bg-yellow-500/5'
                                      }`}
                                    >
                                      <span className="text-muted-foreground font-mono">{stepIdx + 1}.</span>
                                      {step.status === 'passed' ? (
                                        <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                                      ) : step.status === 'failed' ? (
                                        <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                                      ) : (
                                        <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                      )}
                                      {step.screenshot && (
                                        <div
                                          className="flex-shrink-0 w-12 h-20 rounded border border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
                                          onClick={() => setViewingScreenshots({
                                            screenshots: [step.screenshot!],
                                            title: `${testCase.testName} - Step ${stepIdx + 1}`
                                          })}
                                          title="Click to view full size"
                                        >
                                          <img
                                            src={step.screenshot}
                                            alt={`Step ${stepIdx + 1} screenshot`}
                                            className="w-full h-full object-contain"
                                          />
                                        </div>
                                      )}
                                      <span className="flex-1 text-foreground">{step.description}</span>
                                      {step.duration && (
                                        <span className="text-muted-foreground">{formatDuration(step.duration)}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Screenshot Modal */}
      {viewingScreenshots && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-4"
          onClick={() => setViewingScreenshots(null)}
        >
          <button
            onClick={() => setViewingScreenshots(null)}
            className="absolute top-4 right-4 p-3 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg z-10"
            title="Close (ESC)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Help hint */}
          <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-3 py-2 rounded-lg z-10">
            Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded">ESC</kbd> to close
          </div>

          <div className="max-w-6xl w-full h-full flex gap-4 items-center justify-center p-8" onClick={(e) => e.stopPropagation()}>
            {/* Screenshot */}
            <div className="flex-shrink-0" style={{ maxHeight: '90vh', maxWidth: '50vw' }}>
              <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl h-full">
                <img
                  src={viewingScreenshots.screenshots[0]}
                  alt="Screenshot"
                  className="max-h-[90vh] max-w-full object-contain"
                />
              </div>
            </div>

            {/* Details Panel */}
            <div className="w-80 bg-card border border-border rounded-lg p-4 max-h-[75vh] overflow-y-auto">
              <div className="flex items-start gap-2 mb-3">
                <div className="text-2xl">📸</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {viewingScreenshots.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Failure evidence screenshot
                  </p>
                </div>
              </div>

              {/* Download button */}
              <button
                onClick={() => downloadScreenshot(viewingScreenshots.screenshots[0], viewingScreenshots.title)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Download Screenshot</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
