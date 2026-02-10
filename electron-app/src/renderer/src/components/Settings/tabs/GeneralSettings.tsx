/**
 * General Settings Tab
 * UI preferences, theme, language, date/time formats
 */

import React from 'react'
import { PlayGuardSettings } from '../../../types/settings'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'

interface GeneralSettingsProps {
  settings: PlayGuardSettings
  updateSettings: (updates: Partial<PlayGuardSettings>) => void
}

export default function GeneralSettings({ settings, updateSettings }: GeneralSettingsProps) {
  const updateUI = (key: string, value: any) => {
    updateSettings({
      ui: {
        ...settings.ui,
        [key]: value
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">User Interface</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Theme</Label>
            <Select value={settings.ui.theme} onValueChange={(value) => updateUI('theme', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose your preferred color theme
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Language</Label>
            <Select value={settings.ui.language} onValueChange={(value) => updateUI('language', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Select your preferred language
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Date Format</Label>
            <Select value={settings.ui.dateFormat} onValueChange={(value) => updateUI('dateFormat', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose how dates are displayed
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Time Format</Label>
            <Select value={settings.ui.timeFormat} onValueChange={(value) => updateUI('timeFormat', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                <SelectItem value="24h">24-hour</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose how times are displayed
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">About PlayGuard</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Version: {settings.version}</p>
          <p>AI-powered automated testing for Unity mobile games</p>
        </div>
      </div>
    </div>
  )
}
