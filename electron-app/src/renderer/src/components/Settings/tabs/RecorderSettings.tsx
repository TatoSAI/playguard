/**
 * Recorder Settings Tab
 * Recording behavior, auto screen change, input detection
 */

import React from 'react'
import { PlayGuardSettings } from '../../../types/settings'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'
import { Slider } from '../../ui/slider'
import { Input } from '../../ui/input'

interface RecorderSettingsProps {
  settings: PlayGuardSettings
  updateSettings: (updates: Partial<PlayGuardSettings>) => void
}

export default function RecorderSettings({ settings, updateSettings }: RecorderSettingsProps) {
  const updateRecorder = (key: string, value: any) => {
    updateSettings({
      recorder: {
        ...settings.recorder,
        [key]: value
      }
    })
  }

  const updateAutoScreenChange = (key: string, value: any) => {
    updateSettings({
      recorder: {
        ...settings.recorder,
        autoScreenChange: {
          ...settings.recorder.autoScreenChange,
          [key]: value
        }
      }
    })
  }

  const updateInputDetection = (key: string, value: any) => {
    updateSettings({
      recorder: {
        ...settings.recorder,
        inputDetection: {
          ...settings.recorder.inputDetection,
          [key]: value
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Auto Screen Change Detection */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Auto Screen Change Detection</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Auto Detection</Label>
              <p className="text-sm text-muted-foreground">
                Automatically detect and capture screen changes during recording
              </p>
            </div>
            <Switch
              checked={settings.recorder.autoScreenChange.enabled}
              onCheckedChange={(checked) => updateAutoScreenChange('enabled', checked)}
            />
          </div>

          {settings.recorder.autoScreenChange.enabled && (
            <>
              <div className="grid gap-2">
                <Label>Sensitivity: {settings.recorder.autoScreenChange.sensitivity}%</Label>
                <Slider
                  value={[settings.recorder.autoScreenChange.sensitivity]}
                  onValueChange={(value) => updateAutoScreenChange('sensitivity', value[0])}
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-sm text-muted-foreground">
                  Lower values detect smaller changes, higher values require bigger changes
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Debounce Delay (ms)</Label>
                <Input
                  type="number"
                  value={settings.recorder.autoScreenChange.debounceMs}
                  onChange={(e) => updateAutoScreenChange('debounceMs', parseInt(e.target.value))}
                  min={0}
                  max={5000}
                  step={100}
                />
                <p className="text-sm text-muted-foreground">
                  Time to wait before capturing a screen change (prevents rapid captures)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Screenshot Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Screenshot Settings</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Quality: {settings.recorder.screenshotQuality}%</Label>
            <Slider
              value={[settings.recorder.screenshotQuality]}
              onValueChange={(value) => updateRecorder('screenshotQuality', value[0])}
              min={10}
              max={100}
              step={10}
            />
            <p className="text-sm text-muted-foreground">
              Higher quality produces larger file sizes
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Capture Interval (ms)</Label>
            <Input
              type="number"
              value={settings.recorder.captureInterval}
              onChange={(e) => updateRecorder('captureInterval', parseInt(e.target.value))}
              min={50}
              max={1000}
              step={50}
            />
            <p className="text-sm text-muted-foreground">
              Minimum time between screenshot captures
            </p>
          </div>
        </div>
      </div>

      {/* Input Detection */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Input Detection</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Tap Delay (ms)</Label>
            <Input
              type="number"
              value={settings.recorder.inputDetection.tapDelay}
              onChange={(e) => updateInputDetection('tapDelay', parseInt(e.target.value))}
              min={0}
              max={2000}
              step={50}
            />
            <p className="text-sm text-muted-foreground">
              Delay after tap before next action
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Swipe Minimum Distance (px)</Label>
            <Input
              type="number"
              value={settings.recorder.inputDetection.swipeMinDistance}
              onChange={(e) => updateInputDetection('swipeMinDistance', parseInt(e.target.value))}
              min={10}
              max={200}
              step={10}
            />
            <p className="text-sm text-muted-foreground">
              Minimum movement to register as a swipe
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Long Press Threshold (ms)</Label>
            <Input
              type="number"
              value={settings.recorder.inputDetection.longPressThreshold}
              onChange={(e) => updateInputDetection('longPressThreshold', parseInt(e.target.value))}
              min={100}
              max={3000}
              step={100}
            />
            <p className="text-sm text-muted-foreground">
              How long to hold for long press detection
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
