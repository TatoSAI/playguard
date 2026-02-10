/**
 * Test Execution Settings Tab
 * Test running behavior, timeouts, retry logic
 */

import React from 'react'
import { PlayGuardSettings } from '../../../types/settings'
import { Clock, RefreshCw, AlertTriangle, Play, Pause, Info } from 'lucide-react'

interface TestExecutionSettingsProps {
  settings: PlayGuardSettings
  updateSettings: (updates: Partial<PlayGuardSettings>) => void
}

export default function TestExecutionSettings({ settings, updateSettings }: TestExecutionSettingsProps) {
  const execSettings = settings.execution || {
    defaultTimeout: 30000,
    stepTimeout: 10000,
    retryFailedTests: false,
    maxRetries: 3,
    retryDelay: 2000,
    stopOnFirstFailure: false,
    parallelExecution: false,
    screenshotOnFailure: true,
    screenshotOnSuccess: false,
    continueOnError: false
  }

  const handleNumberChange = (field: string, value: number) => {
    updateSettings({
      execution: {
        ...execSettings,
        [field]: value
      }
    })
  }

  const handleToggle = (field: string, value: boolean) => {
    updateSettings({
      execution: {
        ...execSettings,
        [field]: value
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Timeouts */}
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Timeouts
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure maximum wait times for test execution
        </p>

        <div className="space-y-4">
          <div className="p-4 border border-border rounded-lg bg-card">
            <label className="block mb-2">
              <span className="text-sm font-medium text-foreground">Default Test Timeout</span>
              <p className="text-xs text-muted-foreground mb-2">
                Maximum time to wait for entire test to complete (milliseconds)
              </p>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={execSettings.defaultTimeout}
                onChange={(e) => handleNumberChange('defaultTimeout', parseInt(e.target.value) || 30000)}
                min="1000"
                max="600000"
                step="1000"
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {(execSettings.defaultTimeout / 1000).toFixed(0)}s
              </span>
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg bg-card">
            <label className="block mb-2">
              <span className="text-sm font-medium text-foreground">Step Timeout</span>
              <p className="text-xs text-muted-foreground mb-2">
                Maximum time to wait for each individual step (milliseconds)
              </p>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={execSettings.stepTimeout}
                onChange={(e) => handleNumberChange('stepTimeout', parseInt(e.target.value) || 10000)}
                min="1000"
                max="120000"
                step="1000"
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {(execSettings.stepTimeout / 1000).toFixed(0)}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Retry Logic */}
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Retry Logic
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure automatic retry behavior for failed tests
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex-1">
              <div className="font-medium text-foreground mb-1">Retry Failed Tests</div>
              <p className="text-sm text-muted-foreground">
                Automatically retry tests that fail
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={execSettings.retryFailedTests}
                onChange={(e) => handleToggle('retryFailedTests', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {execSettings.retryFailedTests && (
            <>
              <div className="p-4 border border-border rounded-lg bg-card">
                <label className="block mb-2">
                  <span className="text-sm font-medium text-foreground">Max Retries</span>
                  <p className="text-xs text-muted-foreground mb-2">
                    Maximum number of retry attempts per test
                  </p>
                </label>
                <input
                  type="number"
                  value={execSettings.maxRetries}
                  onChange={(e) => handleNumberChange('maxRetries', parseInt(e.target.value) || 3)}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                />
              </div>

              <div className="p-4 border border-border rounded-lg bg-card">
                <label className="block mb-2">
                  <span className="text-sm font-medium text-foreground">Retry Delay</span>
                  <p className="text-xs text-muted-foreground mb-2">
                    Time to wait between retry attempts (milliseconds)
                  </p>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={execSettings.retryDelay}
                    onChange={(e) => handleNumberChange('retryDelay', parseInt(e.target.value) || 2000)}
                    min="0"
                    max="30000"
                    step="1000"
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {(execSettings.retryDelay / 1000).toFixed(0)}s
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Execution Behavior */}
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Play className="w-5 h-5" />
          Execution Behavior
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Control how tests are executed and handle failures
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Stop on First Failure</div>
                <p className="text-sm text-muted-foreground">
                  Stop test suite execution when the first test fails
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={execSettings.stopOnFirstFailure}
                onChange={(e) => handleToggle('stopOnFirstFailure', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Continue on Error</div>
                <p className="text-sm text-muted-foreground">
                  Continue executing remaining steps even if an error occurs
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={execSettings.continueOnError}
                onChange={(e) => handleToggle('continueOnError', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start gap-3">
              <Play className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-foreground">
                  Parallel Execution{' '}
                  <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20">
                    Experimental
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Run multiple tests simultaneously (requires multiple devices)
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={execSettings.parallelExecution}
                onChange={(e) => handleToggle('parallelExecution', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Screenshot Options */}
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <img alt="camera" className="w-5 h-5" />
          Screenshots
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure when to capture screenshots during test execution
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex-1">
              <div className="font-medium text-foreground">Screenshot on Failure</div>
              <p className="text-sm text-muted-foreground">
                Automatically capture screenshot when a test step fails
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={execSettings.screenshotOnFailure}
                onChange={(e) => handleToggle('screenshotOnFailure', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex-1">
              <div className="font-medium text-foreground">Screenshot on Success</div>
              <p className="text-sm text-muted-foreground">
                Capture screenshot for every successful step (increases storage)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={execSettings.screenshotOnSuccess}
                onChange={(e) => handleToggle('screenshotOnSuccess', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 border border-primary/20 rounded-lg bg-primary/5">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-foreground font-medium mb-1">Execution Settings</p>
            <p className="text-muted-foreground">
              These settings apply to all test executions. You can override some settings per test
              case or suite. Changes take effect immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
