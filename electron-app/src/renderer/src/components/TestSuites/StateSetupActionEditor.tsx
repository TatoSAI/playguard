/**
 * State Setup Action Editor
 * Visual editor for creating State Setup actions in prerequisites
 */

import { useState } from 'react'
import { X, Smartphone, Gamepad2, Terminal, Plus } from 'lucide-react'

// Device actions available for selection
const DEVICE_ACTIONS = [
  { value: 'press_back', label: 'Press Back', icon: '⬅️' },
  { value: 'press_home', label: 'Press Home', icon: '🏠' },
  { value: 'press_volume_up', label: 'Volume Up', icon: '🔊' },
  { value: 'press_volume_down', label: 'Volume Down', icon: '🔉' },
  { value: 'rotate_portrait', label: 'Rotate Portrait', icon: '📱' },
  { value: 'rotate_landscape', label: 'Rotate Landscape', icon: '📱' },
  { value: 'rotate_portrait_reverse', label: 'Portrait Reverse', icon: '📱' },
  { value: 'rotate_landscape_reverse', label: 'Landscape Reverse', icon: '📱' },
  { value: 'toggle_auto_rotate', label: 'Toggle Auto-Rotate', icon: '🔄' },
  { value: 'background_app', label: 'Background App', icon: '⏸️' },
  { value: 'foreground_app', label: 'Foreground App', icon: '▶️' },
  { value: 'force_stop_app', label: 'Force Stop App', icon: '⏹️' },
  { value: 'clear_app_data', label: 'Clear App Data', icon: '🗑️' },
  { value: 'toggle_wifi', label: 'Toggle WiFi', icon: '📶' },
  { value: 'toggle_mobile_data', label: 'Toggle Mobile Data', icon: '📡' },
  { value: 'toggle_airplane_mode', label: 'Airplane Mode', icon: '✈️' },
  { value: 'simulate_call', label: 'Simulate Call', icon: '📞' },
  { value: 'simulate_notification', label: 'Simulate Notification', icon: '🔔' },
  { value: 'simulate_low_battery', label: 'Low Battery', icon: '🔋' },
  { value: 'simulate_memory_warning', label: 'Memory Warning', icon: '⚠️' }
]

interface StateSetupAction {
  type: 'device_action' | 'unity_action' | 'adb_command'
  deviceAction?: {
    action: string
    parameters?: Record<string, any>
  }
  unityAction?: {
    actionName: string
    parameters?: string[]
  }
  adbCommand?: {
    command: string
    description?: string
  }
}

interface Props {
  actions: StateSetupAction[]
  onChange: (actions: StateSetupAction[]) => void
}

export function StateSetupActionEditor({ actions, onChange }: Props) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [currentAction, setCurrentAction] = useState<StateSetupAction>({
    type: 'device_action',
    deviceAction: { action: 'press_back' }
  })

  const handleAdd = () => {
    setCurrentAction({
      type: 'device_action',
      deviceAction: { action: 'press_back' }
    })
    setEditingIndex(null)
    setShowAddDialog(true)
  }

  const handleEdit = (index: number) => {
    setCurrentAction(actions[index])
    setEditingIndex(index)
    setShowAddDialog(true)
  }

  const handleSave = () => {
    if (editingIndex !== null) {
      // Edit existing
      const updated = [...actions]
      updated[editingIndex] = currentAction
      onChange(updated)
    } else {
      // Add new
      onChange([...actions, currentAction])
    }
    setShowAddDialog(false)
  }

  const handleDelete = (index: number) => {
    onChange(actions.filter((_, i) => i !== index))
  }

  const getActionLabel = (action: StateSetupAction): string => {
    if (action.type === 'device_action' && action.deviceAction) {
      const deviceAction = DEVICE_ACTIONS.find(a => a.value === action.deviceAction!.action)
      return deviceAction?.label || action.deviceAction.action
    }
    if (action.type === 'unity_action' && action.unityAction) {
      return action.unityAction.actionName
    }
    if (action.type === 'adb_command' && action.adbCommand) {
      return action.adbCommand.command
    }
    return 'Unknown Action'
  }

  const getActionIcon = (action: StateSetupAction): string => {
    if (action.type === 'device_action' && action.deviceAction) {
      const deviceAction = DEVICE_ACTIONS.find(a => a.value === action.deviceAction!.action)
      return deviceAction?.icon || '📱'
    }
    if (action.type === 'unity_action') return '🎮'
    if (action.type === 'adb_command') return '💻'
    return '❓'
  }

  return (
    <div className="space-y-4">
      {/* Actions List */}
      {actions.length > 0 && (
        <div className="space-y-2">
          {actions.map((action, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getActionIcon(action)}</span>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {getActionLabel(action)}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {action.type.replace('_', ' ')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(index)}
                  className="px-2 py-1 text-xs border border-border rounded hover:bg-muted transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(index)}
                  className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Button */}
      <button
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors text-sm text-muted-foreground"
      >
        <Plus className="w-4 h-4" />
        Add State Setup Action
      </button>

      {/* Add/Edit Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[80vh] overflow-auto">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <h3 className="text-lg font-semibold text-foreground">
                {editingIndex !== null ? 'Edit' : 'Add'} State Setup Action
              </h3>
              <button
                onClick={() => setShowAddDialog(false)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Action Type Selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Action Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setCurrentAction({
                      type: 'device_action',
                      deviceAction: { action: 'press_back' }
                    })}
                    className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                      currentAction.type === 'device_action'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-sm">Device Action</span>
                  </button>
                  <button
                    onClick={() => setCurrentAction({
                      type: 'unity_action',
                      unityAction: { actionName: '', parameters: [] }
                    })}
                    className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                      currentAction.type === 'unity_action'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Gamepad2 className="w-5 h-5" />
                    <span className="text-sm">Unity Action</span>
                  </button>
                  <button
                    onClick={() => setCurrentAction({
                      type: 'adb_command',
                      adbCommand: { command: '', description: '' }
                    })}
                    className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                      currentAction.type === 'adb_command'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Terminal className="w-5 h-5" />
                    <span className="text-sm">ADB Command</span>
                  </button>
                </div>
              </div>

              {/* Device Action Form */}
              {currentAction.type === 'device_action' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Select Device Action
                    </label>
                    <select
                      value={currentAction.deviceAction?.action || ''}
                      onChange={(e) => setCurrentAction({
                        ...currentAction,
                        deviceAction: { action: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    >
                      {DEVICE_ACTIONS.map(action => (
                        <option key={action.value} value={action.value}>
                          {action.icon} {action.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Unity Action Form */}
              {currentAction.type === 'unity_action' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Action Name
                    </label>
                    <input
                      type="text"
                      value={currentAction.unityAction?.actionName || ''}
                      onChange={(e) => setCurrentAction({
                        ...currentAction,
                        unityAction: {
                          ...currentAction.unityAction,
                          actionName: e.target.value,
                          parameters: currentAction.unityAction?.parameters || []
                        }
                      })}
                      placeholder="e.g., giveCoins, skipTutorial"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Must match a registered custom action in Unity SDK
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Parameters (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={currentAction.unityAction?.parameters?.join(', ') || ''}
                      onChange={(e) => setCurrentAction({
                        ...currentAction,
                        unityAction: {
                          ...currentAction.unityAction!,
                          parameters: e.target.value.split(',').map(p => p.trim()).filter(Boolean)
                        }
                      })}
                      placeholder="e.g., 100, true"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                </div>
              )}

              {/* ADB Command Form */}
              {currentAction.type === 'adb_command' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      ADB Shell Command
                    </label>
                    <input
                      type="text"
                      value={currentAction.adbCommand?.command || ''}
                      onChange={(e) => setCurrentAction({
                        ...currentAction,
                        adbCommand: {
                          ...currentAction.adbCommand,
                          command: e.target.value,
                          description: currentAction.adbCommand?.description
                        }
                      })}
                      placeholder="e.g., settings put global airplane_mode_on 1"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={currentAction.adbCommand?.description || ''}
                      onChange={(e) => setCurrentAction({
                        ...currentAction,
                        adbCommand: {
                          ...currentAction.adbCommand!,
                          description: e.target.value
                        }
                      })}
                      placeholder="What does this command do?"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-card">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  (currentAction.type === 'unity_action' && !currentAction.unityAction?.actionName) ||
                  (currentAction.type === 'adb_command' && !currentAction.adbCommand?.command)
                }
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingIndex !== null ? 'Update' : 'Add'} Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
