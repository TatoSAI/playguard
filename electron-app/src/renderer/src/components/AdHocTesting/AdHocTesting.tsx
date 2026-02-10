import React, { useState, useEffect } from 'react'
import { Zap, Play, Square, Clock, Lightbulb, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '../ui/button'

interface ActionLog {
  id: string
  timestamp: number
  type: 'tap' | 'swipe' | 'input' | 'device_action' | 'unity_action'
  description: string
  screenshot?: string
  suggestion?: string
}

interface AIInsight {
  id: string
  type: 'suggestion' | 'warning' | 'success'
  message: string
  timestamp: number
}

export default function AdHocTesting(): JSX.Element {
  const [isActive, setIsActive] = useState(false)
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [actionLog, setActionLog] = useState<ActionLog[]>([])
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([])
  const [currentScreen, setCurrentScreen] = useState<string | null>(null)

  useEffect(() => {
    // Load connected device on mount
    loadConnectedDevice()
  }, [])

  const loadConnectedDevice = async () => {
    try {
      const devices = await window.api.adb.getDevices()
      if (devices.length > 0) {
        setConnectedDevice(devices[0].id)
      }
    } catch (error) {
      console.error('Failed to load device:', error)
    }
  }

  const startSession = () => {
    setIsActive(true)
    setSessionStartTime(Date.now())
    setActionLog([])
    setAIInsights([])

    // Add welcome insight
    addAIInsight('suggestion', '🎯 Ad-Hoc session started! I\'ll assist you as you explore the app.')
  }

  const stopSession = () => {
    setIsActive(false)
    addAIInsight('success', `✅ Session completed! Duration: ${getSessionDuration()}`)
  }

  const addAIInsight = (type: 'suggestion' | 'warning' | 'success', message: string) => {
    const insight: AIInsight = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: Date.now()
    }
    setAIInsights(prev => [insight, ...prev])
  }

  const getSessionDuration = (): string => {
    if (!sessionStartTime) return '0s'
    const duration = Math.floor((Date.now() - sessionStartTime) / 1000)
    if (duration < 60) return `${duration}s`
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds}s`
  }

  const saveSessionLog = async () => {
    // TODO: Implement save session log
    console.log('Saving session log...', { actionLog, aiInsights })
    addAIInsight('success', '💾 Session log saved successfully!')
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'suggestion': return <Lightbulb className="w-4 h-4 text-yellow-500" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-orange-500" />
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      default: return <Lightbulb className="w-4 h-4" />
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-500/10">
              <Zap className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Ad-Hoc Testing</h2>
              <p className="text-sm text-muted-foreground">
                Exploratory testing with AI assistance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isActive && sessionStartTime && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">
                  {getSessionDuration()}
                </span>
              </div>
            )}

            {connectedDevice && (
              <div className="px-3 py-1.5 text-sm rounded-lg bg-primary/10 text-primary">
                Device: {connectedDevice.substring(0, 8)}...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Controls & Info */}
        <div className="w-80 border-r border-border flex flex-col">
          {/* Session Controls */}
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold mb-3">Session Controls</h3>

            {!isActive ? (
              <Button
                onClick={startSession}
                disabled={!connectedDevice}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Ad-Hoc Session
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={stopSession}
                  variant="destructive"
                  className="w-full"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Session
                </Button>
                <Button
                  onClick={saveSessionLog}
                  variant="outline"
                  className="w-full"
                >
                  Save Session Log
                </Button>
              </div>
            )}

            {!connectedDevice && (
              <p className="text-xs text-muted-foreground mt-2">
                No device connected. Go to Devices tab to connect.
              </p>
            )}
          </div>

          {/* AI Insights */}
          <div className="flex-1 overflow-hidden flex flex-col p-4">
            <h3 className="text-sm font-semibold mb-3">AI Insights</h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {aiInsights.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>AI insights will appear here</p>
                  <p className="text-xs mt-1">during your testing session</p>
                </div>
              ) : (
                aiInsights.map(insight => (
                  <div
                    key={insight.id}
                    className="p-3 rounded-lg border border-border bg-card/50 text-sm"
                  >
                    <div className="flex items-start gap-2">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <p className="text-foreground">{insight.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(insight.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center Panel - Device Preview */}
        <div className="flex-1 flex flex-col items-center justify-center bg-muted/20">
          {!isActive ? (
            <div className="text-center">
              <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Ready to Start
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Click "Start Ad-Hoc Session" to begin exploratory testing.
                I'll provide real-time insights and suggestions as you interact with your app.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="relative">
                <div className="w-64 h-96 rounded-2xl border-4 border-border bg-card shadow-xl flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Device preview coming soon
                  </p>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 border-2 border-background animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Session in progress - Interact with your device
              </p>
            </div>
          )}
        </div>

        {/* Right Panel - Action Log */}
        <div className="w-80 border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold">Action Log</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {actionLog.length} actions recorded
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {actionLog.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No actions yet</p>
                <p className="text-xs mt-1">Actions will be logged here</p>
              </div>
            ) : (
              actionLog.map(action => (
                <div
                  key={action.id}
                  className="p-3 rounded-lg border border-border bg-card text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">
                      {action.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(action.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{action.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
