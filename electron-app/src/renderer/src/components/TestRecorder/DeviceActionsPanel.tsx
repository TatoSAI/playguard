/**
 * Device Actions Panel Component
 * UI for adding device actions during test recording
 */

import React, { useState } from 'react'
import {
  Phone,
  Home,
  ArrowLeft,
  Volume2,
  RotateCw,
  Wifi,
  Smartphone,
  Bell,
  Battery,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface DeviceAction {
  type: string
  label: string
  icon: React.ReactNode
  description: string
  hasParams?: boolean
  params?: {
    name: string
    type: 'boolean' | 'number' | 'string'
    label: string
    default?: any
    options?: { label: string; value: any }[]
  }[]
}

interface DeviceActionsCategory {
  name: string
  icon: React.ReactNode
  actions: DeviceAction[]
  color: string
}

interface DeviceActionsPanelProps {
  onActionAdd: (action: { type: string; description: string; data?: any }) => void
}

export default function DeviceActionsPanel({ onActionAdd }: DeviceActionsPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['hardware']))
  const [showParamsModal, setShowParamsModal] = useState(false)
  const [selectedAction, setSelectedAction] = useState<DeviceAction | null>(null)
  const [actionParams, setActionParams] = useState<Record<string, any>>({})

  const categories: DeviceActionsCategory[] = [
    {
      name: 'hardware',
      icon: <Smartphone className="w-4 h-4" />,
      color: 'blue',
      actions: [
        {
          type: 'press_back',
          label: 'Back',
          icon: <ArrowLeft className="w-4 h-4" />,
          description: 'Press back button'
        },
        {
          type: 'press_home',
          label: 'Home',
          icon: <Home className="w-4 h-4" />,
          description: 'Press home button'
        },
        {
          type: 'press_volume_up',
          label: 'Vol +',
          icon: <Volume2 className="w-4 h-4" />,
          description: 'Press volume up'
        },
        {
          type: 'press_volume_down',
          label: 'Vol -',
          icon: <Volume2 className="w-4 h-4" />,
          description: 'Press volume down'
        }
      ]
    },
    {
      name: 'orientation',
      icon: <RotateCw className="w-4 h-4" />,
      color: 'purple',
      actions: [
        {
          type: 'rotate_portrait',
          label: 'Portrait',
          icon: <Smartphone className="w-4 h-4" />,
          description: 'Rotate to portrait mode'
        },
        {
          type: 'rotate_landscape',
          label: 'Landscape',
          icon: <Smartphone className="w-4 h-4 rotate-90" />,
          description: 'Rotate to landscape mode'
        },
        {
          type: 'toggle_auto_rotate',
          label: 'Auto-Rotate',
          icon: <RotateCw className="w-4 h-4" />,
          description: 'Toggle auto-rotation',
          hasParams: true,
          params: [
            {
              name: 'enable',
              type: 'boolean',
              label: 'Enable',
              options: [
                { label: 'Toggle (auto)', value: undefined },
                { label: 'Enable', value: true },
                { label: 'Disable', value: false }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'lifecycle',
      icon: <Smartphone className="w-4 h-4" />,
      color: 'green',
      actions: [
        {
          type: 'background_app',
          label: 'Background',
          icon: <Home className="w-4 h-4" />,
          description: 'Send app to background'
        },
        {
          type: 'foreground_app',
          label: 'Foreground',
          icon: <Smartphone className="w-4 h-4" />,
          description: 'Bring app to foreground',
          hasParams: true,
          params: [
            {
              name: 'packageName',
              type: 'string',
              label: 'Package Name (optional)',
              default: ''
            }
          ]
        },
        {
          type: 'force_stop_app',
          label: 'Force Stop',
          icon: <AlertCircle className="w-4 h-4" />,
          description: 'Force stop the app',
          hasParams: true,
          params: [
            {
              name: 'packageName',
              type: 'string',
              label: 'Package Name (optional)',
              default: ''
            }
          ]
        },
        {
          type: 'clear_app_data',
          label: 'Clear Data',
          icon: <AlertCircle className="w-4 h-4" />,
          description: 'Clear app data',
          hasParams: true,
          params: [
            {
              name: 'packageName',
              type: 'string',
              label: 'Package Name (optional)',
              default: ''
            }
          ]
        }
      ]
    },
    {
      name: 'connectivity',
      icon: <Wifi className="w-4 h-4" />,
      color: 'cyan',
      actions: [
        {
          type: 'toggle_wifi',
          label: 'WiFi',
          icon: <Wifi className="w-4 h-4" />,
          description: 'Toggle WiFi',
          hasParams: true,
          params: [
            {
              name: 'enable',
              type: 'boolean',
              label: 'Enable',
              options: [
                { label: 'Toggle (auto)', value: undefined },
                { label: 'Enable', value: true },
                { label: 'Disable', value: false }
              ]
            }
          ]
        },
        {
          type: 'toggle_mobile_data',
          label: 'Data',
          icon: <Smartphone className="w-4 h-4" />,
          description: 'Toggle mobile data',
          hasParams: true,
          params: [
            {
              name: 'enable',
              type: 'boolean',
              label: 'Enable',
              options: [
                { label: 'Toggle (auto)', value: undefined },
                { label: 'Enable', value: true },
                { label: 'Disable', value: false }
              ]
            }
          ]
        },
        {
          type: 'toggle_airplane_mode',
          label: 'Airplane',
          icon: <Smartphone className="w-4 h-4" />,
          description: 'Toggle airplane mode',
          hasParams: true,
          params: [
            {
              name: 'enable',
              type: 'boolean',
              label: 'Enable',
              options: [
                { label: 'Toggle (auto)', value: undefined },
                { label: 'Enable', value: true },
                { label: 'Disable', value: false }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'interruptions',
      icon: <Bell className="w-4 h-4" />,
      color: 'orange',
      actions: [
        {
          type: 'simulate_call',
          label: 'Call',
          icon: <Phone className="w-4 h-4" />,
          description: 'Simulate incoming call',
          hasParams: true,
          params: [
            {
              name: 'phoneNumber',
              type: 'string',
              label: 'Phone Number',
              default: '1234567890'
            }
          ]
        },
        {
          type: 'simulate_notification',
          label: 'Notification',
          icon: <Bell className="w-4 h-4" />,
          description: 'Simulate notification',
          hasParams: true,
          params: [
            {
              name: 'title',
              type: 'string',
              label: 'Title',
              default: 'Test'
            },
            {
              name: 'message',
              type: 'string',
              label: 'Message',
              default: 'Test Notification'
            }
          ]
        },
        {
          type: 'simulate_low_battery',
          label: 'Low Battery',
          icon: <Battery className="w-4 h-4" />,
          description: 'Simulate low battery',
          hasParams: true,
          params: [
            {
              name: 'level',
              type: 'number',
              label: 'Battery Level (%)',
              default: 10
            }
          ]
        },
        {
          type: 'simulate_memory_warning',
          label: 'Memory',
          icon: <AlertCircle className="w-4 h-4" />,
          description: 'Simulate memory warning',
          hasParams: true,
          params: [
            {
              name: 'packageName',
              type: 'string',
              label: 'Package Name (optional)',
              default: ''
            }
          ]
        }
      ]
    }
  ]

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryName)) {
        next.delete(categoryName)
      } else {
        next.add(categoryName)
      }
      return next
    })
  }

  const handleActionClick = (action: DeviceAction) => {
    if (action.hasParams && action.params) {
      // Show params modal
      setSelectedAction(action)
      const defaultParams: Record<string, any> = {}
      action.params.forEach((param) => {
        defaultParams[param.name] = param.default !== undefined ? param.default : (param.options ? param.options[0].value : '')
      })
      setActionParams(defaultParams)
      setShowParamsModal(true)
    } else {
      // Add action directly
      onActionAdd({
        type: action.type,
        description: action.description
      })
    }
  }

  const handleParamsConfirm = () => {
    if (selectedAction) {
      // Filter out empty or undefined params
      const filteredParams: Record<string, any> = {}
      Object.entries(actionParams).forEach(([key, value]) => {
        if (value !== '' && value !== undefined) {
          filteredParams[key] = value
        }
      })

      onActionAdd({
        type: selectedAction.type,
        description: selectedAction.description,
        data: Object.keys(filteredParams).length > 0 ? filteredParams : undefined
      })
    }
    setShowParamsModal(false)
    setSelectedAction(null)
    setActionParams({})
  }

  const getCategoryColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'border-blue-500 bg-blue-500/10 text-blue-500',
      purple: 'border-purple-500 bg-purple-500/10 text-purple-500',
      green: 'border-green-500 bg-green-500/10 text-green-500',
      cyan: 'border-cyan-500 bg-cyan-500/10 text-cyan-500',
      orange: 'border-orange-500 bg-orange-500/10 text-orange-500'
    }
    return colors[color] || colors.blue
  }

  return (
    <>
      <div className="space-y-2">
        {categories.map((category) => {
          const isExpanded = expandedCategories.has(category.name)
          return (
            <div key={category.name} className="border rounded-md">
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center justify-between p-2 hover:bg-accent transition-colors rounded-md"
              >
                <div className="flex items-center gap-2">
                  {category.icon}
                  <span className="text-sm font-medium capitalize">{category.name}</span>
                  <span className="text-xs text-muted-foreground">({category.actions.length})</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="p-2 space-y-1 border-t">
                  {category.actions.map((action) => (
                    <button
                      key={action.type}
                      onClick={() => handleActionClick(action)}
                      className={`w-full flex items-center gap-2 p-2 rounded border ${getCategoryColor(category.color)} hover:opacity-80 transition-opacity text-left`}
                      title={action.description}
                    >
                      {action.icon}
                      <span className="text-xs font-medium">{action.label}</span>
                      {action.hasParams && (
                        <span className="ml-auto text-xs opacity-60">⚙️</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

      </div>

      {/* Parameters Modal */}
      {showParamsModal && selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowParamsModal(false)}>
          <div className="bg-card border rounded-lg p-4 w-96 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              {selectedAction.icon}
              {selectedAction.label} - Parameters
            </h3>

            <div className="space-y-3 mb-4">
              {selectedAction.params?.map((param) => (
                <div key={param.name}>
                  <label className="text-sm font-medium block mb-1">{param.label}</label>
                  {param.type === 'boolean' && param.options ? (
                    <select
                      value={actionParams[param.name] === undefined ? 'undefined' : String(actionParams[param.name])}
                      onChange={(e) => {
                        const value = e.target.value === 'undefined' ? undefined : e.target.value === 'true'
                        setActionParams({ ...actionParams, [param.name]: value })
                      }}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      {param.options.map((opt) => (
                        <option key={opt.label} value={opt.value === undefined ? 'undefined' : String(opt.value)}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : param.type === 'number' ? (
                    <input
                      type="number"
                      value={actionParams[param.name] || ''}
                      onChange={(e) => setActionParams({ ...actionParams, [param.name]: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                  ) : (
                    <input
                      type="text"
                      value={actionParams[param.name] || ''}
                      onChange={(e) => setActionParams({ ...actionParams, [param.name]: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      placeholder={param.default}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowParamsModal(false)}
                className="flex-1 px-4 py-2 border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleParamsConfirm}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Add Action
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
