/**
 * Unity SDK Settings Tab
 * Unity SDK connection, custom events, element detection
 */

import React from 'react'
import { PlayGuardSettings } from '../../../types/settings'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'
import { Input } from '../../ui/input'

interface UnitySDKSettingsProps {
  settings: PlayGuardSettings
  updateSettings: (updates: Partial<PlayGuardSettings>) => void
}

export default function UnitySDKSettings({ settings, updateSettings }: UnitySDKSettingsProps) {
  const updateConnection = (key: string, value: any) => {
    updateSettings({
      unitySDK: {
        ...settings.unitySDK,
        connection: {
          ...settings.unitySDK.connection,
          [key]: value
        }
      }
    })
  }

  const updateCustomEvents = (key: string, value: any) => {
    updateSettings({
      unitySDK: {
        ...settings.unitySDK,
        customEvents: {
          ...settings.unitySDK.customEvents,
          [key]: value
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Unity SDK Connection</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>TCP Port</Label>
            <Input
              type="number"
              value={settings.unitySDK.connection.port}
              onChange={(e) => updateConnection('port', parseInt(e.target.value))}
              min={1}
              max={65535}
            />
            <p className="text-sm text-muted-foreground">
              Port for Unity SDK communication (default: 12345)
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Connection Timeout (ms)</Label>
            <Input
              type="number"
              value={settings.unitySDK.connection.timeout}
              onChange={(e) => updateConnection('timeout', parseInt(e.target.value))}
              min={1000}
              max={30000}
              step={1000}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Connect</Label>
              <p className="text-sm text-muted-foreground">
                Automatically connect to Unity SDK when detected
              </p>
            </div>
            <Switch
              checked={settings.unitySDK.connection.autoConnect}
              onCheckedChange={(checked) => updateConnection('autoConnect', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Port Forwarding</Label>
              <p className="text-sm text-muted-foreground">
                Automatically set up ADB port forwarding
              </p>
            </div>
            <Switch
              checked={settings.unitySDK.connection.autoPortForward}
              onCheckedChange={(checked) => updateConnection('autoPortForward', checked)}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Custom Events</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Custom Events</Label>
              <p className="text-sm text-muted-foreground">
                Allow recording of Unity SDK custom events
              </p>
            </div>
            <Switch
              checked={settings.unitySDK.customEvents.enabled}
              onCheckedChange={(checked) => updateCustomEvents('enabled', checked)}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Custom event definitions can be managed in the Custom Steps section (coming soon).
          </p>
        </div>
      </div>
    </div>
  )
}
