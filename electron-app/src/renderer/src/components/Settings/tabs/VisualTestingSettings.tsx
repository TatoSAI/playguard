/**
 * Visual Testing Settings Tab
 * Screenshot comparison, visual regression testing
 */

import React from 'react'
import { PlayGuardSettings } from '../../../types/settings'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'
import { Slider } from '../../ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'

interface VisualTestingSettingsProps {
  settings: PlayGuardSettings
  updateSettings: (updates: Partial<PlayGuardSettings>) => void
}

export default function VisualTestingSettings({ settings, updateSettings }: VisualTestingSettingsProps) {
  const updateScreenshotSimilarity = (key: string, value: any) => {
    updateSettings({
      visualTesting: {
        ...settings.visualTesting,
        screenshotSimilarity: {
          ...settings.visualTesting.screenshotSimilarity,
          [key]: value
        }
      }
    })
  }

  const updateVisualRegression = (key: string, value: any) => {
    updateSettings({
      visualTesting: {
        ...settings.visualTesting,
        visualRegression: {
          ...settings.visualTesting.visualRegression,
          [key]: value
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Screenshot Comparison</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Similarity Threshold: {(settings.visualTesting.screenshotSimilarity.threshold * 100).toFixed(0)}%</Label>
            <Slider
              value={[settings.visualTesting.screenshotSimilarity.threshold * 100]}
              onValueChange={(value) => updateScreenshotSimilarity('threshold', value[0] / 100)}
              min={50}
              max={100}
              step={1}
            />
            <p className="text-sm text-muted-foreground">
              Minimum similarity required for screenshots to match (higher = stricter)
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Comparison Algorithm</Label>
            <Select
              value={settings.visualTesting.screenshotSimilarity.algorithm}
              onValueChange={(value) => updateScreenshotSimilarity('algorithm', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pixelmatch">Pixelmatch (Fast)</SelectItem>
                <SelectItem value="ssim">SSIM (Accurate)</SelectItem>
                <SelectItem value="mse">MSE (Simple)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Algorithm used for comparing screenshots
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ignore Anti-aliasing</Label>
              <p className="text-sm text-muted-foreground">
                Reduce sensitivity to anti-aliasing differences
              </p>
            </div>
            <Switch
              checked={settings.visualTesting.screenshotSimilarity.ignoreAntialiasing}
              onCheckedChange={(checked) => updateScreenshotSimilarity('ignoreAntialiasing', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ignore Colors</Label>
              <p className="text-sm text-muted-foreground">
                Compare only structure, not colors
              </p>
            </div>
            <Switch
              checked={settings.visualTesting.screenshotSimilarity.ignoreColors}
              onCheckedChange={(checked) => updateScreenshotSimilarity('ignoreColors', checked)}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Visual Regression Testing</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Visual Regression</Label>
              <p className="text-sm text-muted-foreground">
                Track visual changes across test runs
              </p>
            </div>
            <Switch
              checked={settings.visualTesting.visualRegression.enabled}
              onCheckedChange={(checked) => updateVisualRegression('enabled', checked)}
            />
          </div>

          {settings.visualTesting.visualRegression.enabled && (
            <>
              <div className="grid gap-2">
                <Label>Baseline Update Mode</Label>
                <Select
                  value={settings.visualTesting.visualRegression.baselineUpdateMode}
                  onValueChange={(value) => updateVisualRegression('baselineUpdateMode', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="auto">Auto (on pass)</SelectItem>
                    <SelectItem value="prompt">Prompt</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How baseline images are updated
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Storage Location</Label>
                <Select
                  value={settings.visualTesting.visualRegression.storageLocation}
                  onValueChange={(value) => updateVisualRegression('storageLocation', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="cloud">Cloud (Coming Soon)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Where baseline images are stored
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
