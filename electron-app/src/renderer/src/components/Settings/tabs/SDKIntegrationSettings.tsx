/**
 * SDK Integration Settings Tab
 * Configuration for Unity SDK (Android) and RUN.studio SDK (Web HTML5)
 */

import { PlayGuardSettings } from '../../../types/settings'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'
import { Input } from '../../ui/input'

interface SDKIntegrationSettingsProps {
  settings: PlayGuardSettings
  updateSettings: (updates: Partial<PlayGuardSettings>) => void
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-base flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold leading-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

// ─── Row: toggle ───────────────────────────────────────────────────────────────
function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="space-y-0.5">
        <Label>{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

// ─── Row: port input ───────────────────────────────────────────────────────────
function PortRow({
  label,
  description,
  value,
  onChange,
  disabled
}: {
  label: string
  description?: string
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || value)}
        min={1}
        max={65535}
        disabled={disabled}
        className="w-36"
      />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return <div className="border-t my-6" />
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SDKIntegrationSettings({ settings, updateSettings }: SDKIntegrationSettingsProps) {
  // ── Unity SDK helpers ──────────────────────────────────────────────────────
  const updateUnityConnection = (key: string, value: any) => {
    updateSettings({
      unitySDK: {
        ...settings.unitySDK,
        connection: { ...settings.unitySDK.connection, [key]: value }
      }
    })
  }

  const updateUnityCustomEvents = (key: string, value: any) => {
    updateSettings({
      unitySDK: {
        ...settings.unitySDK,
        customEvents: { ...settings.unitySDK.customEvents, [key]: value }
      }
    })
  }

  const updateUnityElementDetection = (key: string, value: any) => {
    updateSettings({
      unitySDK: {
        ...settings.unitySDK,
        elementDetection: { ...settings.unitySDK.elementDetection, [key]: value }
      }
    })
  }

  // ── RUN.studio helpers ─────────────────────────────────────────────────────
  const updateRunStudio = (key: string, value: any) => {
    updateSettings({ runStudioSDK: { ...settings.runStudioSDK, [key]: value } })
  }

  const updateRunStudioApiServer = (key: string, value: any) => {
    updateSettings({
      runStudioSDK: {
        ...settings.runStudioSDK,
        apiServer: { ...settings.runStudioSDK.apiServer, [key]: value }
      }
    })
  }

  const updateRunStudioWebSocket = (key: string, value: any) => {
    updateSettings({
      runStudioSDK: {
        ...settings.runStudioSDK,
        webSocket: { ...settings.runStudioSDK.webSocket, [key]: value }
      }
    })
  }

  return (
    <div className="space-y-2">

      {/* ═══════════════════════════════ UNITY SDK ═══════════════════════════════ */}
      <SectionHeader
        icon="🎮"
        title="Unity SDK"
        subtitle="TCP/IP bridge for Android Unity games (ADB port forwarding)"
      />

      <div className="space-y-4 pl-11">
        {/* Connection */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Connection</p>

          <PortRow
            label="TCP Port"
            description="Port the Unity SDK listens on inside the device (default: 12345)"
            value={settings.unitySDK.connection.port}
            onChange={(v) => updateUnityConnection('port', v)}
          />

          <PortRow
            label="Connection Timeout (ms)"
            description="Max wait time when connecting to the SDK"
            value={settings.unitySDK.connection.timeout}
            onChange={(v) => updateUnityConnection('timeout', v)}
          />

          <ToggleRow
            label="Auto Connect"
            description="Automatically connect when the SDK is detected on the device"
            checked={settings.unitySDK.connection.autoConnect}
            onCheckedChange={(v) => updateUnityConnection('autoConnect', v)}
          />

          <ToggleRow
            label="Auto Port Forwarding"
            description="Run adb forward tcp:{port} automatically when a device connects"
            checked={settings.unitySDK.connection.autoPortForward}
            onCheckedChange={(v) => updateUnityConnection('autoPortForward', v)}
          />
        </div>

        {/* Custom Events */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custom Events</p>

          <ToggleRow
            label="Enable Custom Events"
            description="Allow recording and playback of Unity SDK custom events (RegisterCustomAction)"
            checked={settings.unitySDK.customEvents.enabled}
            onCheckedChange={(v) => updateUnityCustomEvents('enabled', v)}
          />
        </div>

        {/* Element Detection */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Element Detection</p>

          <div className="grid gap-1.5">
            <Label>Hierarchy Search Depth</Label>
            <Input
              type="number"
              value={settings.unitySDK.elementDetection.searchDepth}
              onChange={(e) => updateUnityElementDetection('searchDepth', parseInt(e.target.value) || 10)}
              min={1}
              max={100}
              className="w-36"
            />
            <p className="text-xs text-muted-foreground">Max levels deep when traversing the Canvas hierarchy</p>
          </div>

          <ToggleRow
            label="Include Inactive GameObjects"
            description="Search hidden/disabled objects (slower but more thorough)"
            checked={settings.unitySDK.elementDetection.includeInactive}
            onCheckedChange={(v) => updateUnityElementDetection('includeInactive', v)}
          />

          <ToggleRow
            label="Cache Element Tree"
            description="Cache the UI hierarchy for faster repeated lookups"
            checked={settings.unitySDK.elementDetection.cacheElements}
            onCheckedChange={(v) => updateUnityElementDetection('cacheElements', v)}
          />

          {settings.unitySDK.elementDetection.cacheElements && (
            <PortRow
              label="Cache Timeout (ms)"
              description="Time before the cached hierarchy is invalidated"
              value={settings.unitySDK.elementDetection.cacheTimeout}
              onChange={(v) => updateUnityElementDetection('cacheTimeout', v)}
            />
          )}
        </div>
      </div>

      <Divider />

      {/* ═══════════════════════════════ RUN.STUDIO SDK ═══════════════════════════════ */}
      <SectionHeader
        icon="🌐"
        title="RUN.studio SDK"
        subtitle="REST API + WebSocket bridge for Web HTML5 games"
      />

      <div className="space-y-4 pl-11">
        {/* REST API Server */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">REST API Server</p>
            <Switch
              checked={settings.runStudioSDK.apiServer.enabled}
              onCheckedChange={(v) => updateRunStudioApiServer('enabled', v)}
            />
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            HTTP server that RUN.studio uses to push test specs and pull execution results
          </p>

          <PortRow
            label="API Port"
            description="Endpoint: http://127.0.0.1:{port}/api/v1 (default: 7777)"
            value={settings.runStudioSDK.apiServer.port}
            onChange={(v) => updateRunStudioApiServer('port', v)}
            disabled={!settings.runStudioSDK.apiServer.enabled}
          />
        </div>

        {/* WebSocket Server */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">WebSocket Server</p>
            <Switch
              checked={settings.runStudioSDK.webSocket.enabled}
              onCheckedChange={(v) => updateRunStudioWebSocket('enabled', v)}
            />
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            WebSocket server that the in-game HTML5 SDK connects to for live event streaming
          </p>

          <PortRow
            label="WebSocket Port"
            description="Game SDK connects to ws://127.0.0.1:{port} (default: 9876)"
            value={settings.runStudioSDK.webSocket.port}
            onChange={(v) => updateRunStudioWebSocket('port', v)}
            disabled={!settings.runStudioSDK.webSocket.enabled}
          />
        </div>

        {/* Security */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Security</p>

          <ToggleRow
            label="Allow External Connections"
            description="Accept requests from network addresses other than 127.0.0.1 (not recommended)"
            checked={settings.runStudioSDK.allowExternalConnections}
            onCheckedChange={(v) => updateRunStudio('allowExternalConnections', v)}
          />

          <div className="grid gap-1.5">
            <Label>Auth Token</Label>
            <Input
              type="password"
              placeholder="Leave empty to disable authentication"
              value={settings.runStudioSDK.authToken}
              onChange={(e) => updateRunStudio('authToken', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Bearer token required in the Authorization header. Empty = no auth.
            </p>
          </div>
        </div>

        {/* Behavior */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Behavior</p>

          <ToggleRow
            label="Auto-import Specs"
            description="Automatically save test specs pushed by RUN.studio into the active suite"
            checked={settings.runStudioSDK.autoImportSpecs}
            onCheckedChange={(v) => updateRunStudio('autoImportSpecs', v)}
          />

          <ToggleRow
            label="Auto-export Results"
            description="Push execution results back to RUN.studio after each test run"
            checked={settings.runStudioSDK.autoExportResults}
            onCheckedChange={(v) => updateRunStudio('autoExportResults', v)}
          />
        </div>
      </div>
    </div>
  )
}
