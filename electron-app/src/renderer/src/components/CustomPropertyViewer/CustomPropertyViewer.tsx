/**
 * Custom Property Viewer Component (SDK v2.0)
 * Real-time viewer for Unity game custom properties and actions
 * Allows testers to inspect game state and execute actions during testing
 */

import React, { useState, useEffect } from 'react'
import {
  Eye,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  Zap,
  Code,
  AlertCircle
} from 'lucide-react'

interface CustomExtensions {
  properties: string[]
  actions: string[]
  commands: string[]
}

interface PropertyValue {
  name: string
  value: string | null
  loading: boolean
  error?: string
}

interface CustomPropertyViewerProps {
  isSDKConnected: boolean
  onRefresh?: () => void
}

export default function CustomPropertyViewer({
  isSDKConnected,
  onRefresh
}: CustomPropertyViewerProps): JSX.Element {
  const [extensions, setExtensions] = useState<CustomExtensions>({
    properties: [],
    actions: [],
    commands: []
  })
  const [propertyValues, setPropertyValues] = useState<Map<string, PropertyValue>>(new Map())
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [actionArgs, setActionArgs] = useState<string>('')
  const [executingAction, setExecutingAction] = useState(false)

  // Load available extensions
  useEffect(() => {
    if (isSDKConnected) {
      loadExtensions()
    } else {
      // Reset when SDK disconnects
      setExtensions({ properties: [], actions: [], commands: []})
      setPropertyValues(new Map())
    }
  }, [isSDKConnected])

  const loadExtensions = async () => {
    setLoading(true)
    try {
      const result = await window.api.unity.getAvailableExtensions()
      if (result.success && result.extensions) {
        setExtensions(result.extensions)
        console.log('[CustomPropertyViewer] Loaded extensions:', result.extensions)
      }
    } catch (error) {
      console.error('[CustomPropertyViewer] Failed to load extensions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPropertyValue = async (propertyName: string) => {
    // Set loading state
    setPropertyValues((prev) => {
      const newMap = new Map(prev)
      newMap.set(propertyName, {
        name: propertyName,
        value: null,
        loading: true
      })
      return newMap
    })

    try {
      const result = await window.api.unity.getCustomProperty(propertyName)

      setPropertyValues((prev) => {
        const newMap = new Map(prev)
        newMap.set(propertyName, {
          name: propertyName,
          value: result.success ? result.value! : null,
          loading: false,
          error: result.success ? undefined : result.error
        })
        return newMap
      })
    } catch (error) {
      setPropertyValues((prev) => {
        const newMap = new Map(prev)
        newMap.set(propertyName, {
          name: propertyName,
          value: null,
          loading: false,
          error: error instanceof Error ? error.message : String(error)
        })
        return newMap
      })
    }
  }

  const executeAction = async () => {
    if (!selectedAction) return

    setExecutingAction(true)
    try {
      // Parse args (comma-separated)
      const args = actionArgs
        .split(',')
        .map((arg) => arg.trim())
        .filter((arg) => arg.length > 0)

      const result = await window.api.unity.executeCustomAction(selectedAction, args)

      if (result.success) {
        alert(`Action '${selectedAction}' executed successfully!`)
        // Refresh property values after action
        extensions.properties.forEach((prop) => {
          if (propertyValues.has(prop)) {
            loadPropertyValue(prop)
          }
        })
      } else {
        alert(`Action failed: ${result.error}`)
      }
    } catch (error) {
      alert(`Error executing action: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setExecutingAction(false)
      setSelectedAction(null)
      setActionArgs('')
    }
  }

  const refreshAll = () => {
    propertyValues.forEach((_, propName) => {
      loadPropertyValue(propName)
    })
    if (onRefresh) {
      onRefresh()
    }
  }

  if (!isSDKConnected) {
    return (
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium text-foreground">Custom Properties</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
            SDK v2.0
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          Unity SDK not connected
        </div>
      </div>
    )
  }

  const hasExtensions =
    extensions.properties.length > 0 ||
    extensions.actions.length > 0 ||
    extensions.commands.length > 0

  return (
    <div className="border border-border rounded-lg bg-card">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-foreground">Custom Extensions</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            SDK v2.0
          </span>
          {hasExtensions && (
            <span className="text-xs text-muted-foreground">
              {extensions.properties.length}p / {extensions.actions.length}a
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              loadExtensions()
            }}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Refresh extensions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {!hasExtensions && !loading && (
            <div className="text-sm text-muted-foreground flex items-center gap-2 py-2">
              <Info className="w-4 h-4" />
              No custom extensions registered. Add GameTestExtensions to your Unity game.
            </div>
          )}

          {/* Custom Properties */}
          {extensions.properties.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Eye className="w-3 h-3" />
                  Properties ({extensions.properties.length})
                </h4>
                <button
                  onClick={refreshAll}
                  className="text-xs text-primary hover:underline"
                  disabled={propertyValues.size === 0}
                >
                  Refresh All
                </button>
              </div>
              <div className="space-y-2">
                {extensions.properties.map((propName) => {
                  const propValue = propertyValues.get(propName)
                  const hasValue = propValue !== undefined

                  return (
                    <div
                      key={propName}
                      className="flex items-center justify-between p-2 rounded border border-border bg-muted/20"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-mono text-foreground">{propName}</div>
                        {hasValue && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {propValue.loading ? (
                              <span className="animate-pulse">Loading...</span>
                            ) : propValue.error ? (
                              <span className="text-red-500">{propValue.error}</span>
                            ) : (
                              <span className="font-mono">{propValue.value}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => loadPropertyValue(propName)}
                        className="px-2 py-1 text-xs rounded border border-border hover:bg-accent transition-colors"
                        disabled={propValue?.loading}
                      >
                        {hasValue ? 'Refresh' : 'Load'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Custom Actions */}
          {extensions.actions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                <Zap className="w-3 h-3" />
                Actions ({extensions.actions.length})
              </h4>
              <div className="space-y-2">
                {extensions.actions.map((actionName) => (
                  <div
                    key={actionName}
                    className="flex items-center gap-2 p-2 rounded border border-border bg-muted/20"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-mono text-foreground">{actionName}</div>
                    </div>
                    <button
                      onClick={() => setSelectedAction(actionName)}
                      className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/80 transition-colors flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      Execute
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Commands Info */}
          {extensions.commands.length > 0 && (
            <div className="p-2 rounded border border-primary/20 bg-primary/5">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Code className="w-3 h-3" />
                {extensions.commands.length} custom command(s) available for advanced use
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Execution Modal */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-4 w-96 max-w-full mx-4">
            <h3 className="font-medium text-foreground mb-3">Execute Action: {selectedAction}</h3>
            <div className="mb-4">
              <label className="text-sm text-muted-foreground block mb-2">
                Arguments (comma-separated)
              </label>
              <input
                type="text"
                value={actionArgs}
                onChange={(e) => setActionArgs(e.target.value)}
                placeholder="e.g., 1000, true, Level_01"
                className="w-full px-3 py-2 rounded border border-border bg-background text-foreground"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty if action takes no arguments
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setSelectedAction(null)
                  setActionArgs('')
                }}
                className="px-3 py-1.5 text-sm rounded border border-border hover:bg-accent transition-colors"
                disabled={executingAction}
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/80 transition-colors flex items-center gap-1"
                disabled={executingAction}
              >
                {executingAction ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    Execute
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
