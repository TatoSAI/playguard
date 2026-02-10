/**
 * AI Settings Tab
 * AI features, API key management, model configuration
 */

import React, { useState, useEffect } from 'react'
import { PlayGuardSettings } from '../../../types/settings'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'
import { Input } from '../../ui/input'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Eye, EyeOff, Key, Check, X } from 'lucide-react'
import { useToast } from '../../../hooks/useToast'

interface AISettingsProps {
  settings: PlayGuardSettings
  updateSettings: (updates: Partial<PlayGuardSettings>) => void
}

export default function AISettings({ settings, updateSettings }: AISettingsProps) {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false)
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    checkAPIKeys()
  }, [])

  const checkAPIKeys = async () => {
    const anthropic = await window.api.secure.hasAPIKey('anthropic')
    const openai = await window.api.secure.hasAPIKey('openai')

    if (anthropic.success && anthropic.has) {
      setHasAnthropicKey(true)
    }
    if (openai.success && openai.has) {
      setHasOpenaiKey(true)
    }
  }

  const saveAPIKey = async (provider: string, key: string) => {
    if (!key.trim()) {
      toast({
        title: 'Error',
        description: 'API key cannot be empty',
        variant: 'destructive'
      })
      return
    }

    const result = await window.api.secure.setAPIKey(provider, key)
    if (result.success) {
      toast({
        title: 'Success',
        description: `${provider} API key saved`
      })
      if (provider === 'anthropic') {
        setHasAnthropicKey(true)
        setAnthropicKey('')
      } else if (provider === 'openai') {
        setHasOpenaiKey(true)
        setOpenaiKey('')
      }
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to save API key',
        variant: 'destructive'
      })
    }
  }

  const deleteAPIKey = async (provider: string) => {
    const result = await window.api.secure.deleteAPIKey(provider)
    if (result.success) {
      toast({
        title: 'Success',
        description: `${provider} API key deleted`
      })
      if (provider === 'anthropic') {
        setHasAnthropicKey(false)
      } else if (provider === 'openai') {
        setHasOpenaiKey(false)
      }
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete API key',
        variant: 'destructive'
      })
    }
  }

  const updateAI = (updates: Partial<typeof settings.ai>) => {
    updateSettings({
      ai: {
        ...settings.ai,
        ...updates
      }
    })
  }

  const updateFeatures = (key: string, value: boolean) => {
    updateAI({
      features: {
        ...settings.ai.features,
        [key]: value
      }
    })
  }

  const updateModels = (key: string, value: any) => {
    updateAI({
      models: {
        ...settings.ai.models,
        [key]: value
      }
    })
  }

  const updateCostControls = (key: string, value: any) => {
    updateAI({
      costControls: {
        ...settings.ai.costControls,
        [key]: value
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* API Keys Management */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Key className="w-5 h-5" />
          API Keys
        </h3>
        <div className="space-y-4">
          {/* Anthropic API Key */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Anthropic (Claude)</Label>
              {hasAnthropicKey && <Check className="w-5 h-5 text-green-500" />}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showAnthropicKey ? 'text' : 'password'}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder={hasAnthropicKey ? '••••••••••••••••' : 'sk-ant-...'}
                />
                <button
                  type="button"
                  onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  {showAnthropicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button onClick={() => saveAPIKey('anthropic', anthropicKey)}>
                {hasAnthropicKey ? 'Update' : 'Save'}
              </Button>
              {hasAnthropicKey && (
                <Button variant="destructive" onClick={() => deleteAPIKey('anthropic')}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Get your API key from{' '}
              <a href="https://console.anthropic.com/" className="text-primary underline">
                console.anthropic.com
              </a>
            </p>
          </div>

          {/* OpenAI API Key */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">OpenAI (GPT)</Label>
              {hasOpenaiKey && <Check className="w-5 h-5 text-green-500" />}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder={hasOpenaiKey ? '••••••••••••••••' : 'sk-...'}
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button onClick={() => saveAPIKey('openai', openaiKey)}>
                {hasOpenaiKey ? 'Update' : 'Save'}
              </Button>
              {hasOpenaiKey && (
                <Button variant="destructive" onClick={() => deleteAPIKey('openai')}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Get your API key from{' '}
              <a href="https://platform.openai.com/api-keys" className="text-primary underline">
                platform.openai.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* AI Features */}
      <div>
        <h3 className="text-lg font-semibold mb-4">AI Features</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Generate Test Descriptions</Label>
              <p className="text-sm text-muted-foreground">
                Automatically generate test descriptions after recording
              </p>
            </div>
            <Switch
              checked={settings.ai.features.autoDescriptions}
              onCheckedChange={(checked) => updateFeatures('autoDescriptions', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Step Descriptions</Label>
              <p className="text-sm text-muted-foreground">
                Generate descriptions for individual test steps
              </p>
            </div>
            <Switch
              checked={settings.ai.features.stepDescriptions}
              onCheckedChange={(checked) => updateFeatures('stepDescriptions', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tag Suggestions</Label>
              <p className="text-sm text-muted-foreground">
                AI-powered tag recommendations
              </p>
            </div>
            <Switch
              checked={settings.ai.features.tagSuggestions}
              onCheckedChange={(checked) => updateFeatures('tagSuggestions', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Failure Analysis</Label>
              <p className="text-sm text-muted-foreground">
                Analyze test failures and suggest fixes
              </p>
            </div>
            <Switch
              checked={settings.ai.features.failureAnalysis}
              onCheckedChange={(checked) => updateFeatures('failureAnalysis', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Test Generation</Label>
              <p className="text-sm text-muted-foreground">
                Generate test cases from specifications
              </p>
            </div>
            <Switch
              checked={settings.ai.features.testGeneration}
              onCheckedChange={(checked) => updateFeatures('testGeneration', checked)}
            />
          </div>
        </div>
      </div>

      {/* Provider Configuration */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Provider Configuration</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>AI Provider</Label>
            <Select
              value={settings.ai.provider}
              onValueChange={(value) => updateAI({ provider: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                <SelectItem value="local">Local (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Cost Controls */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Cost Controls</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Max Requests Per Day</Label>
            <Input
              type="number"
              value={settings.ai.costControls.maxRequestsPerDay}
              onChange={(e) => updateCostControls('maxRequestsPerDay', parseInt(e.target.value))}
              min={1}
              max={10000}
            />
          </div>

          <div className="grid gap-2">
            <Label>Max Monthly Budget (USD)</Label>
            <Input
              type="number"
              value={settings.ai.costControls.maxCostPerMonth}
              onChange={(e) => updateCostControls('maxCostPerMonth', parseFloat(e.target.value))}
              min={0}
              max={1000}
              step={10}
            />
          </div>

          <div className="grid gap-2">
            <Label>Alert Threshold (%)</Label>
            <Input
              type="number"
              value={settings.ai.costControls.alertThreshold}
              onChange={(e) => updateCostControls('alertThreshold', parseInt(e.target.value))}
              min={1}
              max={100}
            />
            <p className="text-sm text-muted-foreground">
              Get alerted when reaching this % of monthly budget
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
