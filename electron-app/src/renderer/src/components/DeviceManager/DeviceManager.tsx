import { useState, useEffect, type ReactNode } from 'react'
import {
  Smartphone,
  Wifi,
  RefreshCw,
  Circle,
  AlertCircle,
  CheckCircle2,
  Globe,
  Plus,
  Pencil,
  Trash2,
  X,
  Gamepad2,
  Monitor,
  Cpu,
  Zap,
  ChevronRight
} from 'lucide-react'

interface DeviceInfo {
  id: string
  model: string
  marketName: string
  manufacturer: string
  androidVersion: string
  resolution: string
  isConnected: boolean
}

interface VirtualBrowser {
  id: string // browser_chromium | browser_chrome | browser_edge | browser_firefox
  label: string
  isBuiltIn: boolean
  version?: string
}

interface GameLink {
  id: string
  name: string
  devUrl: string
  stagingUrl: string
  productionUrl: string
  createdAt: string
}

type SelectedItem =
  | { type: 'android'; id: string }
  | { type: 'browser'; id: string }
  | { type: 'gamelink'; id: string }
  | null

// Built-in Chromium is always available (Electron's embedded renderer).
const BUILTIN_BROWSER: VirtualBrowser = {
  id: 'browser_chromium',
  label: 'Chromium',
  isBuiltIn: true
}

const DETECTED_BROWSER_META: Record<string, { label: string }> = {
  chrome: { label: 'Google Chrome' },
  edge: { label: 'Microsoft Edge' },
  firefox: { label: 'Mozilla Firefox' }
}

// Technical metadata per browser type
const BROWSER_TECH: Record<string, {
  engine: string
  jsEngine: string
  protocol: string
  channel: string
  icon: string
}> = {
  chromium: { engine: 'Blink', jsEngine: 'V8', protocol: 'Chrome DevTools Protocol', channel: 'Embedded (Electron)', icon: '⚛' },
  chrome: { engine: 'Blink', jsEngine: 'V8', protocol: 'Chrome DevTools Protocol', channel: 'Stable', icon: '🌐' },
  edge: { engine: 'Blink', jsEngine: 'V8', protocol: 'Chrome DevTools Protocol', channel: 'Stable', icon: '🔷' },
  firefox: { engine: 'Gecko', jsEngine: 'SpiderMonkey', protocol: 'WebDriver BiDi', channel: 'Stable', icon: '🦊' }
}

export default function DeviceManager(): JSX.Element {
  const [androidDevices, setAndroidDevices] = useState<DeviceInfo[]>([])
  const [browsers, setBrowsers] = useState<VirtualBrowser[]>([BUILTIN_BROWSER])
  const [gameLinks, setGameLinks] = useState<GameLink[]>([])
  const [selected, setSelected] = useState<SelectedItem>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [detectingBrowsers, setDetectingBrowsers] = useState(false)

  // Game link form state
  const [showGameForm, setShowGameForm] = useState(false)
  const [gameFormName, setGameFormName] = useState('')
  const [gameFormDev, setGameFormDev] = useState('')
  const [gameFormStaging, setGameFormStaging] = useState('')
  const [gameFormProd, setGameFormProd] = useState('')
  const [gameEditId, setGameEditId] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const [adb, links] = await Promise.all([
        window.api.adb.getDevices().catch(() => [] as DeviceInfo[]),
        window.api.gameLink.getAll().catch(() => [] as GameLink[])
      ])
      setAndroidDevices(adb)
      setGameLinks(links)
      if (!selected && adb.length > 0) {
        setSelected({ type: 'android', id: adb[0].id })
      }
    } catch (error) {
      console.error('Failed to load devices:', error)
    } finally {
      setIsLoading(false)
    }

    // Detect extra installed browsers + their versions in the background
    detectExtraBrowsers()
  }

  const detectExtraBrowsers = async (): Promise<void> => {
    setDetectingBrowsers(true)
    try {
      // Detect available types and fetch versions in parallel
      const [detected, versionMap] = await Promise.all([
        window.api.browserDevice.detectBrowsers().catch(() => [] as string[]),
        window.api.browserDevice.getVersions().catch(() => ({} as Record<string, string>))
      ])
      const extra: VirtualBrowser[] = (detected as string[])
        .filter((t) => t !== 'chromium')
        .map((t) => ({
          id: `browser_${t}`,
          label: DETECTED_BROWSER_META[t]?.label ?? t,
          isBuiltIn: false,
          version: versionMap[t]
        }))
      const chromiumWithVersion: VirtualBrowser = {
        ...BUILTIN_BROWSER,
        version: versionMap.chromium
      }
      setBrowsers([chromiumWithVersion, ...extra])
    } catch {
      // keep built-in only
    } finally {
      setDetectingBrowsers(false)
    }
  }

  const refreshDevices = async (): Promise<void> => {
    setIsRefreshing(true)
    await loadAll()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const connectAndroid = async (deviceId: string): Promise<void> => {
    try {
      await window.api.adb.connect(deviceId)
      setSelected({ type: 'android', id: deviceId })
      await loadAll()
    } catch (error) {
      console.error('Failed to connect device:', error)
    }
  }

  // ── Game link form ─────────────────────────────────────────────────────────

  const openGameForm = (link?: GameLink): void => {
    if (link) {
      setGameEditId(link.id)
      setGameFormName(link.name)
      setGameFormDev(link.devUrl)
      setGameFormStaging(link.stagingUrl)
      setGameFormProd(link.productionUrl)
    } else {
      setGameEditId(null)
      setGameFormName('')
      setGameFormDev('')
      setGameFormStaging('')
      setGameFormProd('')
    }
    setShowGameForm(true)
  }

  const cancelGameForm = (): void => {
    setShowGameForm(false)
    setGameEditId(null)
    setGameFormName('')
    setGameFormDev('')
    setGameFormStaging('')
    setGameFormProd('')
  }

  const saveGameForm = async (): Promise<void> => {
    if (!gameFormName.trim()) return
    if (gameEditId) {
      await window.api.gameLink.update(gameEditId, {
        name: gameFormName,
        devUrl: gameFormDev,
        stagingUrl: gameFormStaging,
        productionUrl: gameFormProd
      })
    } else {
      await window.api.gameLink.add(gameFormName, gameFormDev, gameFormStaging, gameFormProd)
    }
    cancelGameForm()
    await loadAll()
  }

  const deleteGameLink = async (id: string): Promise<void> => {
    await window.api.gameLink.delete(id)
    if (selected?.type === 'gamelink' && selected.id === id) setSelected(null)
    await loadAll()
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const selectedAndroid = selected?.type === 'android'
    ? androidDevices.find((d) => d.id === selected.id) ?? null
    : null
  const selectedBrowser = selected?.type === 'browser'
    ? browsers.find((b) => b.id === selected.id) ?? null
    : null
  const selectedGameLink = selected?.type === 'gamelink'
    ? gameLinks.find((l) => l.id === selected.id) ?? null
    : null

  return (
    <div className="h-full flex">
      {/* ── Sidebar ── */}
      <div className="w-72 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Devices</h2>
            <p className="text-xs text-muted-foreground mt-0.5">USB · Web · Game Links</p>
          </div>
          <button
            onClick={refreshDevices}
            disabled={isRefreshing}
            title="Refresh"
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 px-3">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Scanning…</p>
            </div>
          ) : (
            <>
              {/* ── Android ── */}
              {androidDevices.length > 0 && (
                <Section label="Android" count={androidDevices.length}>
                  {androidDevices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => connectAndroid(device.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all ${
                        selected?.type === 'android' && selected.id === device.id
                          ? 'border-primary/50 bg-primary/8 ring-1 ring-primary/20'
                          : 'border-transparent hover:border-border hover:bg-accent'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {device.marketName}
                          {device.manufacturer && device.manufacturer !== 'Unknown' && (
                            <span className="text-muted-foreground font-normal"> · {device.manufacturer}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Android {device.androidVersion}</p>
                      </div>
                      {device.isConnected && (
                        <Circle className="w-1.5 h-1.5 fill-green-500 text-green-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </Section>
              )}

              {/* ── Browsers ── */}
              <Section
                label="Browsers"
                count={browsers.length}
                badge={detectingBrowsers ? <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" /> : undefined}
              >
                {browsers.map((browser) => {
                  const typeKey = browser.id.replace('browser_', '')
                  const isSelected = selected?.type === 'browser' && selected.id === browser.id
                  return (
                    <button
                      key={browser.id}
                      onClick={() => setSelected({ type: 'browser', id: browser.id })}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-blue-500/40 bg-blue-500/8 ring-1 ring-blue-500/20'
                          : 'border-transparent hover:border-border hover:bg-accent'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-blue-500/15 flex items-center justify-center shrink-0 text-base leading-none">
                        {BROWSER_TECH[typeKey]?.icon ?? '🌐'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{browser.label}</p>
                        {browser.version ? (
                          <p className="text-[10px] font-mono text-muted-foreground">v{browser.version}</p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">
                            {browser.isBuiltIn ? 'Built-in' : 'Detected'}
                          </p>
                        )}
                      </div>
                      {browser.isBuiltIn && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium shrink-0 uppercase tracking-wide">
                          built-in
                        </span>
                      )}
                    </button>
                  )
                })}
              </Section>

              {/* ── Game Links ── */}
              <Section label="Game Links" count={gameLinks.length}>
                {gameLinks.map((link) => (
                  <div
                    key={link.id}
                    className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg border cursor-pointer transition-all ${
                      selected?.type === 'gamelink' && selected.id === link.id
                        ? 'border-emerald-500/40 bg-emerald-500/8 ring-1 ring-emerald-500/20'
                        : 'border-transparent hover:border-border hover:bg-accent'
                    }`}
                    onClick={() => setSelected({ type: 'gamelink', id: link.id })}
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center shrink-0">
                      <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{link.name}</p>
                      <div className="flex gap-1 mt-0.5">
                        {link.devUrl && <EnvDot env="dev" />}
                        {link.stagingUrl && <EnvDot env="staging" />}
                        {link.productionUrl && <EnvDot env="prod" />}
                      </div>
                    </div>
                    {/* Edit / Delete on hover */}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); openGameForm(link) }}
                        className="p-1 rounded hover:bg-muted"
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteGameLink(link.id) }}
                        className="p-1 rounded hover:bg-destructive/20"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add / Edit form */}
                {showGameForm ? (
                  <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 space-y-2 mt-1">
                    <input
                      type="text"
                      placeholder="Game name"
                      value={gameFormName}
                      onChange={(e) => setGameFormName(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      autoFocus
                    />
                    {[
                      { label: 'Dev', color: 'text-yellow-400', value: gameFormDev, set: setGameFormDev, placeholder: 'http://localhost:3000' },
                      { label: 'Stg', color: 'text-orange-400', value: gameFormStaging, set: setGameFormStaging, placeholder: 'https://staging.example.com' },
                      { label: 'Prd', color: 'text-green-400', value: gameFormProd, set: setGameFormProd, placeholder: 'https://game.example.com' }
                    ].map(({ label, color, value, set, placeholder }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium w-6 shrink-0 ${color}`}>{label}</span>
                        <input
                          type="url"
                          placeholder={placeholder}
                          value={value}
                          onChange={(e) => set(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveGameForm(); if (e.key === 'Escape') cancelGameForm() }}
                          className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveGameForm}
                        disabled={!gameFormName.trim()}
                        className="flex-1 px-2 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded disabled:opacity-50 font-medium"
                      >
                        {gameEditId ? 'Save' : 'Add Game'}
                      </button>
                      <button onClick={cancelGameForm} className="px-2 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => openGameForm()}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-dashed border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 text-xs text-muted-foreground hover:text-emerald-400 transition-all mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Game
                  </button>
                )}
              </Section>

              {/* Empty state — only when truly nothing */}
              {androidDevices.length === 0 && gameLinks.length === 0 && !showGameForm && (
                <div className="flex flex-col items-center justify-center py-8 text-center px-2">
                  <AlertCircle className="w-7 h-7 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Connect an Android device via USB or add a Game Link to test web games.
                  </p>
                  <button
                    onClick={refreshDevices}
                    className="mt-3 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-xs font-medium"
                  >
                    Scan Again
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2.5 border-t border-border">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
            <span>
              {androidDevices.length} Android · {browsers.length} browser{browsers.length !== 1 ? 's' : ''} · {gameLinks.length} game link{gameLinks.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-background/50">
        {selectedAndroid ? (
          <AndroidDeviceDetails device={selectedAndroid} />
        ) : selectedBrowser ? (
          <BrowserDetails browser={selectedBrowser} />
        ) : selectedGameLink ? (
          <GameLinkDetails link={selectedGameLink} onEdit={() => openGameForm(selectedGameLink)} />
        ) : (
          <EmptySelection />
        )}
      </div>
    </div>
  )
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({
  label,
  count,
  badge,
  children
}: {
  label: string
  count: number
  badge?: ReactNode
  children: ReactNode
}): JSX.Element {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex-1">
          {label}
        </p>
        {count > 0 && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-medium">{count}</span>
        )}
        {badge}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

// ─── Env dot ────────────────────────────────────────────────────────────────

function EnvDot({ env }: { env: 'dev' | 'staging' | 'prod' }): JSX.Element {
  const styles = {
    dev: 'bg-yellow-500',
    staging: 'bg-orange-400',
    prod: 'bg-green-500'
  }
  const labels = { dev: 'D', staging: 'S', prod: 'P' }
  return (
    <span
      title={env}
      className={`inline-block w-3.5 h-3.5 rounded-sm text-[8px] font-bold text-white flex items-center justify-center ${styles[env]}`}
    >
      {labels[env]}
    </span>
  )
}

// ─── Android Device Details ─────────────────────────────────────────────────

function AndroidDeviceDetails({ device }: { device: DeviceInfo }): JSX.Element {
  return (
    <div className="w-full max-w-lg space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <Smartphone className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{device.marketName}</h3>
          <p className="text-sm text-muted-foreground">{device.manufacturer}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium">
          <Circle className="w-1.5 h-1.5 fill-current" />
          Connected
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {[
              { label: 'Market Name', value: device.marketName },
              { label: 'Model Number', value: device.model, mono: true },
              { label: 'Android Version', value: device.androidVersion },
              { label: 'Resolution', value: device.resolution },
              { label: 'Device ID', value: device.id, mono: true }
            ].map(({ label, value, mono }) => (
              <tr key={label}>
                <td className="px-4 py-2.5 text-xs text-muted-foreground w-40">{label}</td>
                <td className={`px-4 py-2.5 text-xs text-foreground ${mono ? 'font-mono' : 'font-medium'}`}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-500/8 border border-green-500/20 text-green-500">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span className="text-xs font-medium">Device ready for testing</span>
      </div>
    </div>
  )
}

// ─── Browser Details ─────────────────────────────────────────────────────────

function BrowserDetails({ browser }: { browser: VirtualBrowser }): JSX.Element {
  const typeKey = browser.id.replace('browser_', '')
  const tech = BROWSER_TECH[typeKey] ?? {
    engine: 'Blink', jsEngine: 'V8', protocol: 'Chrome DevTools Protocol', channel: 'Stable', icon: '🌐'
  }

  const infoRows: { icon: ReactNode; label: string; value: string; mono?: boolean }[] = [
    {
      icon: <Zap className="w-3.5 h-3.5 text-blue-400" />,
      label: 'Version',
      value: browser.version ? `${browser.version}` : 'Detecting…',
      mono: true
    },
    {
      icon: <Cpu className="w-3.5 h-3.5 text-purple-400" />,
      label: 'Rendering Engine',
      value: tech.engine
    },
    {
      icon: <ChevronRight className="w-3.5 h-3.5 text-amber-400" />,
      label: 'JS Engine',
      value: tech.jsEngine
    },
    {
      icon: <Wifi className="w-3.5 h-3.5 text-teal-400" />,
      label: 'Test Protocol',
      value: tech.protocol
    },
    {
      icon: <Monitor className="w-3.5 h-3.5 text-muted-foreground" />,
      label: 'Channel',
      value: tech.channel
    }
  ]

  return (
    <div className="w-full max-w-lg space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl">
          {tech.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{browser.label}</h3>
            {browser.isBuiltIn && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold uppercase tracking-wide">
                Built-in
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {browser.isBuiltIn ? 'Embedded in Electron — always available' : 'Detected on this system'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
          <Circle className="w-1.5 h-1.5 fill-current" />
          Ready
        </div>
      </div>

      {/* Technical info table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Technical Info</p>
        </div>
        <div className="divide-y divide-border">
          {infoRows.map(({ icon, label, value, mono }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-2.5">
              <div className="shrink-0">{icon}</div>
              <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
              <span className={`text-xs text-foreground font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage hint */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-blue-500/8 border border-blue-500/20 text-blue-400">
        <Globe className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed">
          Select this browser in <strong>Create → Record</strong>, then pick a <strong>Web suite</strong> with a Game Link assigned to start capturing interactions.
        </p>
      </div>
    </div>
  )
}

// ─── Game Link Details ───────────────────────────────────────────────────────

function GameLinkDetails({ link, onEdit }: { link: GameLink; onEdit: () => void }): JSX.Element {
  const envRows = [
    { label: 'Development', key: 'devUrl', url: link.devUrl, color: 'text-yellow-400', bg: 'bg-yellow-500/8 border-yellow-500/20', dot: 'bg-yellow-500' },
    { label: 'Staging', key: 'stagingUrl', url: link.stagingUrl, color: 'text-orange-400', bg: 'bg-orange-500/8 border-orange-500/20', dot: 'bg-orange-400' },
    { label: 'Production', key: 'productionUrl', url: link.productionUrl, color: 'text-green-400', bg: 'bg-green-500/8 border-green-500/20', dot: 'bg-green-500' }
  ]

  return (
    <div className="w-full max-w-lg space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Gamepad2 className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{link.name}</h3>
          <p className="text-xs text-muted-foreground">HTML5 Game · 3 environments</p>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
      </div>

      {/* URLs */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Environment URLs</p>
        </div>
        <div className="divide-y divide-border">
          {envRows.map(({ label, url, color, dot }) => (
            <div key={label} className="flex items-start gap-3 px-4 py-3">
              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${dot}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${color}`}>{label}</p>
                {url ? (
                  <p className="text-xs font-mono text-foreground break-all leading-relaxed">{url}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Not configured</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center px-4">
        Assign this game link to a Web suite — the recorder will automatically use the correct URL for each environment.
      </p>
    </div>
  )
}

// ─── Empty selection ─────────────────────────────────────────────────────────

function EmptySelection(): JSX.Element {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Smartphone className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">Nothing selected</h3>
      <p className="text-xs text-muted-foreground max-w-xs">
        Select a device, browser or game link from the list to see its details.
      </p>
    </div>
  )
}
