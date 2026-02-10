/**
 * Reporting Settings Tab
 * Test report generation and storage
 */

import React from 'react'
import { PlayGuardSettings, ReportingSettings as ReportingSettingsType } from '../../../types/settings'
import { FileText, Image, CheckSquare, Info, FolderOpen } from 'lucide-react'

interface ReportingSettingsProps {
  settings: PlayGuardSettings
  updateSettings: (updates: Partial<PlayGuardSettings>) => void
}

export default function ReportingSettings({ settings, updateSettings }: ReportingSettingsProps) {
  const reportSettings: ReportingSettingsType = settings.reporting

  const handleFormatToggle = (format: 'html' | 'pdf' | 'json' | 'junit', enabled: boolean) => {
    const currentFormats = reportSettings.generation.formats
    const newFormats = enabled
      ? [...currentFormats, format]
      : currentFormats.filter(f => f !== format)

    updateSettings({
      reporting: {
        ...reportSettings,
        generation: {
          ...reportSettings.generation,
          formats: newFormats
        }
      }
    })
  }

  const handleGenerationToggle = (field: keyof ReportingSettingsType['generation'], value: boolean) => {
    updateSettings({
      reporting: {
        ...reportSettings,
        generation: {
          ...reportSettings.generation,
          [field]: value
        }
      }
    })
  }

  const handleContentToggle = (field: keyof ReportingSettingsType['content'], value: boolean) => {
    updateSettings({
      reporting: {
        ...reportSettings,
        content: {
          ...reportSettings.content,
          [field]: value
        }
      }
    })
  }

  const handleStorageChange = (field: keyof ReportingSettingsType['storage'], value: any) => {
    updateSettings({
      reporting: {
        ...reportSettings,
        storage: {
          ...reportSettings.storage,
          [field]: value
        }
      }
    })
  }

  const isFormatEnabled = (format: 'html' | 'pdf' | 'json' | 'junit') => {
    return reportSettings.generation.formats.includes(format)
  }

  return (
    <div className="space-y-6">
      {/* Auto-Generate Toggle */}
      <div className="p-4 border border-border rounded-lg bg-card">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="font-medium text-foreground mb-1">Auto-Generate Reports</div>
            <p className="text-sm text-muted-foreground">
              Automatically generate reports after each test execution
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={reportSettings.generation.autoGenerate}
              onChange={(e) => handleGenerationToggle('autoGenerate', e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Report Formats</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select which report formats to generate after test execution
        </p>

        <div className="space-y-3">
          {/* JSON Format */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-foreground">JSON</div>
                <p className="text-sm text-muted-foreground">
                  Structured data format, ideal for automation and CI/CD pipelines
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isFormatEnabled('json')}
                onChange={(e) => handleFormatToggle('json', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* HTML Format */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-medium text-foreground">HTML</div>
                <p className="text-sm text-muted-foreground">
                  Human-readable web format, great for sharing with team
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isFormatEnabled('html')}
                onChange={(e) => handleFormatToggle('html', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* PDF Format */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <div className="font-medium text-foreground">PDF</div>
                <p className="text-sm text-muted-foreground">
                  Professional document format, perfect for documentation and archiving
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isFormatEnabled('pdf')}
                onChange={(e) => handleFormatToggle('pdf', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* JUnit XML Format */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium text-foreground">JUnit XML</div>
                <p className="text-sm text-muted-foreground">
                  Standard format for CI/CD integration (Jenkins, GitLab CI, GitHub Actions)
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isFormatEnabled('junit')}
                onChange={(e) => handleFormatToggle('junit', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Report Generation Options */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Report Generation</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure what to include in generated reports
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start gap-3">
              <Image className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Include Screenshots</div>
                <p className="text-sm text-muted-foreground">
                  Attach screenshots from test execution
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={reportSettings.generation.includeScreenshots}
                onChange={(e) => handleGenerationToggle('includeScreenshots', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start gap-3">
              <CheckSquare className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Include Logs</div>
                <p className="text-sm text-muted-foreground">
                  Include device logs and execution logs
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={reportSettings.generation.includeLogs}
                onChange={(e) => handleGenerationToggle('includeLogs', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Report Content Options */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Report Content</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure what information to include in reports
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Include Device Info</div>
                <p className="text-sm text-muted-foreground">
                  Show device model, OS version, and resolution
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={reportSettings.content.includeDeviceInfo}
                onChange={(e) => handleContentToggle('includeDeviceInfo', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Include System Info</div>
                <p className="text-sm text-muted-foreground">
                  Include system information and environment details
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={reportSettings.content.includeSystemInfo}
                onChange={(e) => handleContentToggle('includeSystemInfo', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start gap-3">
              <CheckSquare className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Include Timings</div>
                <p className="text-sm text-muted-foreground">
                  Show execution time and performance metrics
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={reportSettings.content.includeTimings}
                onChange={(e) => handleContentToggle('includeTimings', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start gap-3">
              <CheckSquare className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Include Metrics</div>
                <p className="text-sm text-muted-foreground">
                  Add test metrics and statistics
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={reportSettings.content.includeMetrics}
                onChange={(e) => handleContentToggle('includeMetrics', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Report Storage Options */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Report Storage</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure where and how reports are stored
        </p>

        <div className="space-y-3">
          {/* Storage Location */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <label className="block mb-2">
              <span className="text-sm font-medium text-foreground">Storage Location</span>
              <p className="text-xs text-muted-foreground mb-2">
                Directory where reports will be saved
              </p>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={reportSettings.storage.location}
                onChange={(e) => handleStorageChange('location', e.target.value)}
                placeholder="e.g., C:\Reports\PlayGuard"
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
              />
              <button className="px-3 py-2 border border-border rounded-md hover:bg-muted transition-colors">
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Retention Days */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <label className="block mb-2">
              <span className="text-sm font-medium text-foreground">Retention Days</span>
              <p className="text-xs text-muted-foreground mb-2">
                Number of days to keep reports before auto-cleanup
              </p>
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={reportSettings.storage.retentionDays}
              onChange={(e) => handleStorageChange('retentionDays', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
            />
          </div>

          {/* Max Reports */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <label className="block mb-2">
              <span className="text-sm font-medium text-foreground">Maximum Reports</span>
              <p className="text-xs text-muted-foreground mb-2">
                Maximum number of reports to keep (oldest will be deleted)
              </p>
            </label>
            <input
              type="number"
              min="10"
              max="1000"
              value={reportSettings.storage.maxReports}
              onChange={(e) => handleStorageChange('maxReports', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
            />
          </div>

          {/* Auto Cleanup */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div className="flex-1">
              <div className="font-medium text-foreground mb-1">Auto Cleanup</div>
              <p className="text-sm text-muted-foreground">
                Automatically delete old reports based on retention settings
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={reportSettings.storage.autoCleanup}
                onChange={(e) => handleStorageChange('autoCleanup', e.target.checked)}
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
            <p className="text-foreground font-medium mb-1">Report Generation</p>
            <p className="text-muted-foreground">
              Reports are generated automatically after test execution when enabled. You can also manually export
              reports from the Reports tab at any time. All reports are saved to the configured storage location.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
