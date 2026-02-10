/**
 * Settings Dialog Component
 * Main settings interface with tabbed navigation for all configuration options
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Button } from '../ui/button'
import { Settings, Cpu, Eye, Brain, FileText, Link, Puzzle, Code, Info } from 'lucide-react'
import { PlayGuardSettings } from '../../types/settings'
import RecorderSettings from './tabs/RecorderSettings'
import VisualTestingSettings from './tabs/VisualTestingSettings'
import AISettings from './tabs/AISettings'
import TestExecutionSettings from './tabs/TestExecutionSettings'
import ReportingSettings from './tabs/ReportingSettings'
import IntegrationsSettings from './tabs/IntegrationsSettings'
import UnitySDKSettings from './tabs/UnitySDKSettings'
import DeveloperSettings from './tabs/DeveloperSettings'
import GeneralSettings from './tabs/GeneralSettings'
import { useToast } from '../../hooks/useToast'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [settings, setSettings] = useState<PlayGuardSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const { toast } = useToast()

  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const result = await window.api.settings.get()
      if (result.success && result.settings) {
        setSettings(result.settings)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load settings',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const result = await window.api.settings.update(settings)
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Settings saved successfully'
        })
        onOpenChange(false)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save settings',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const resetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return
    }

    setSaving(true)
    try {
      const result = await window.api.settings.reset()
      if (result.success) {
        await loadSettings()
        toast({
          title: 'Success',
          description: 'Settings reset to defaults'
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reset settings',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (updates: Partial<PlayGuardSettings>) => {
    if (!settings) return
    setSettings({ ...settings, ...updates })
  }

  if (loading || !settings) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[85vh]">
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading settings...</div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            PlayGuard Settings
          </DialogTitle>
          <DialogDescription>
            Configure PlayGuard behavior, integrations, and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList className="grid grid-cols-9 w-full h-auto flex-shrink-0">
            <TabsTrigger value="general" className="flex flex-col items-center gap-1 py-2">
              <Info className="w-4 h-4" />
              <span className="text-xs">General</span>
            </TabsTrigger>
            <TabsTrigger value="recorder" className="flex flex-col items-center gap-1 py-2">
              <Cpu className="w-4 h-4" />
              <span className="text-xs">Recorder</span>
            </TabsTrigger>
            <TabsTrigger value="visual" className="flex flex-col items-center gap-1 py-2">
              <Eye className="w-4 h-4" />
              <span className="text-xs">Visual</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex flex-col items-center gap-1 py-2">
              <Brain className="w-4 h-4" />
              <span className="text-xs">AI</span>
            </TabsTrigger>
            <TabsTrigger value="execution" className="flex flex-col items-center gap-1 py-2">
              <Settings className="w-4 h-4" />
              <span className="text-xs">Execution</span>
            </TabsTrigger>
            <TabsTrigger value="reporting" className="flex flex-col items-center gap-1 py-2">
              <FileText className="w-4 h-4" />
              <span className="text-xs">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex flex-col items-center gap-1 py-2">
              <Link className="w-4 h-4" />
              <span className="text-xs">Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="unity" className="flex flex-col items-center gap-1 py-2">
              <Puzzle className="w-4 h-4" />
              <span className="text-xs">Unity SDK</span>
            </TabsTrigger>
            <TabsTrigger value="developer" className="flex flex-col items-center gap-1 py-2">
              <Code className="w-4 h-4" />
              <span className="text-xs">Developer</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 min-h-0">
            <TabsContent value="general" className="mt-0">
              <GeneralSettings settings={settings} updateSettings={updateSettings} />
            </TabsContent>

            <TabsContent value="recorder" className="mt-0">
              <RecorderSettings settings={settings} updateSettings={updateSettings} />
            </TabsContent>

            <TabsContent value="visual" className="mt-0">
              <VisualTestingSettings settings={settings} updateSettings={updateSettings} />
            </TabsContent>

            <TabsContent value="ai" className="mt-0">
              <AISettings settings={settings} updateSettings={updateSettings} />
            </TabsContent>

            <TabsContent value="execution" className="mt-0">
              <TestExecutionSettings settings={settings} updateSettings={updateSettings} />
            </TabsContent>

            <TabsContent value="reporting" className="mt-0">
              <ReportingSettings settings={settings} updateSettings={updateSettings} />
            </TabsContent>

            <TabsContent value="integrations" className="mt-0">
              <IntegrationsSettings settings={settings} updateSettings={updateSettings} />
            </TabsContent>

            <TabsContent value="unity" className="mt-0">
              <UnitySDKSettings settings={settings} updateSettings={updateSettings} />
            </TabsContent>

            <TabsContent value="developer" className="mt-0">
              <DeveloperSettings settings={settings} updateSettings={updateSettings} />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={resetSettings} disabled={saving}>
            Reset to Defaults
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
