/**
 * Developer Settings Tab
 * Debug options, advanced features, data management
 */

import React from 'react'
import { PlayGuardSettings } from '../../../types/settings'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'

interface DeveloperSettingsProps {
  settings: PlayGuardSettings
  updateSettings: (updates: Partial<PlayGuardSettings>) => void
}

export default function DeveloperSettings({ settings, updateSettings }: DeveloperSettingsProps) {
  const updateDebug = (key: string, value: any) => {
    updateSettings({
      developer: {
        ...settings.developer,
        debug: {
          ...settings.developer.debug,
          [key]: value
        }
      }
    })
  }

  const updateAdvanced = (key: string, value: any) => {
    updateSettings({
      developer: {
        ...settings.developer,
        advanced: {
          ...settings.developer.advanced,
          [key]: value
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Debug Options</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Debug Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable detailed debug logging
              </p>
            </div>
            <Switch
              checked={settings.developer.debug.enabled}
              onCheckedChange={(checked) => updateDebug('enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Verbose Logging</Label>
              <p className="text-sm text-muted-foreground">
                Log all operations in detail
              </p>
            </div>
            <Switch
              checked={settings.developer.debug.verboseLogging}
              onCheckedChange={(checked) => updateDebug('verboseLogging', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Dev Tools</Label>
              <p className="text-sm text-muted-foreground">
                Open developer console on startup
              </p>
            </div>
            <Switch
              checked={settings.developer.debug.showDevTools}
              onCheckedChange={(checked) => updateDebug('showDevTools', checked)}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Advanced Features</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Experimental Features</Label>
              <p className="text-sm text-muted-foreground">
                Enable features in development
              </p>
            </div>
            <Switch
              checked={settings.developer.advanced.enableExperimentalFeatures}
              onCheckedChange={(checked) => updateAdvanced('enableExperimentalFeatures', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Unsafe Operations</Label>
              <p className="text-sm text-muted-foreground text-red-500">
                Caution: May cause data loss or instability
              </p>
            </div>
            <Switch
              checked={settings.developer.advanced.allowUnsafeOperations}
              onCheckedChange={(checked) => updateAdvanced('allowUnsafeOperations', checked)}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Warning</h3>
        <p className="text-sm text-muted-foreground">
          These settings are intended for developers and advanced users. Modifying them may affect PlayGuard stability.
        </p>
      </div>
    </div>
  )
}
