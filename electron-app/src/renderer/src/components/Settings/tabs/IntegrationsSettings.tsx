/**
 * Integrations Settings Tab
 * Jira, Slack, GitHub, and custom webhooks
 */

import React from 'react'
import { PlayGuardSettings } from '../../../types/settings'

interface IntegrationsSettingsProps {
  settings: PlayGuardSettings
  updateSettings: (updates: Partial<PlayGuardSettings>) => void
}

export default function IntegrationsSettings({ settings, updateSettings }: IntegrationsSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Integrations</h3>
        <p className="text-muted-foreground">
          Connect PlayGuard with Jira, Slack, GitHub, and custom webhooks.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          Coming soon: Configure integrations for bug reporting (Jira), notifications (Slack), and issue tracking (GitHub).
        </p>
      </div>
    </div>
  )
}
