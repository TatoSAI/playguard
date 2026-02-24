import { EventEmitter } from 'events'

export type BrowserType = 'chrome' | 'edge' | 'firefox'

export interface BrowserSession {
  url: string
  browserType: BrowserType
  startTime: number
}

export class BrowserSessionManager extends EventEmitter {
  private browser: any = null
  private context: any = null
  private page: any = null
  private screenshotTimer: NodeJS.Timeout | null = null
  private currentSession: BrowserSession | null = null
  private sessionVersion = 0 // incremented on every stopSession(); handlers check their own captured version

  async getBrowserVersions(): Promise<Record<string, string>> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execSync } = require('child_process') as typeof import('child_process')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { existsSync } = require('fs') as typeof import('fs')

    const versions: Record<string, string> = {
      chromium: process.versions.chrome ?? 'Unknown'
    }

    if (process.platform === 'win32') {
      const exePaths: Record<string, string[]> = {
        chrome: [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        ],
        edge: [
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
        ],
        firefox: [
          'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
          'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
        ]
      }
      for (const [browser, paths] of Object.entries(exePaths)) {
        for (const exePath of paths) {
          if (!existsSync(exePath)) continue
          try {
            const safe = exePath.replace(/'/g, "''")
            const out = execSync(
              `powershell -NoProfile -Command "(Get-Item '${safe}').VersionInfo.ProductVersion"`,
              { timeout: 5000, encoding: 'utf8', windowsHide: true }
            )
            const version = out.trim().match(/\d+[\d.]+/)?.[0]
            if (version) { versions[browser] = version; break }
          } catch { /* try next path */ }
        }
      }
    } else {
      // macOS / Linux: launch headless briefly via Playwright to get version
      const checks: { type: BrowserType }[] = [
        { type: 'chrome' }, { type: 'edge' }, { type: 'firefox' }
      ]
      for (const { type } of checks) {
        try {
          const b = await this.launchBrowser(type, true)
          const v = b.version()
          await b.close()
          if (v) versions[type] = v
        } catch { /* not installed */ }
      }
    }

    return versions
  }

  async detectAvailableBrowsers(): Promise<BrowserType[]> {
    const available: BrowserType[] = []
    const checks: { type: BrowserType; fn: () => Promise<any> }[] = [
      { type: 'chrome', fn: () => this.launchBrowser('chrome', true) },
      { type: 'edge', fn: () => this.launchBrowser('edge', true) },
      { type: 'firefox', fn: () => this.launchBrowser('firefox', true) }
    ]
    for (const check of checks) {
      try {
        const b = await check.fn()
        await b.close()
        available.push(check.type)
      } catch {
        // browser not installed
      }
    }
    return available
  }

  async startSession(url: string, browserType: BrowserType): Promise<void> {
    await this.stopSession()

    this.browser = await this.launchBrowser(browserType, false)
    this.context = await this.browser.newContext({
      viewport: { width: 390, height: 844 }
    })
    this.page = await this.context.newPage()

    // Expose capture function BEFORE navigation so addInitScript can use it
    await this.page.exposeFunction('__pgCapture', (data: any) => {
      this.emit('action', data)
    })

    await this.page.addInitScript(`
      (function() {
        if (window.__pgInjected) return;
        window.__pgInjected = true;
        document.addEventListener('mousedown', function(e) {
          if (window.__pgCapture) window.__pgCapture({ t: 'tap', x: Math.round(e.clientX), y: Math.round(e.clientY) });
        }, true);
        document.addEventListener('keydown', function(e) {
          if (window.__pgCapture) window.__pgCapture({ t: 'key', k: e.key, c: e.code });
        }, true);
        document.addEventListener('wheel', function(e) {
          if (window.__pgCapture) window.__pgCapture({ t: 'scroll', dx: Math.round(e.deltaX), dy: Math.round(e.deltaY) });
        }, { passive: true, capture: true });
      })();
    `)

    await this.page.goto(url)

    // Detect when user closes the browser window — emit 'closed' once
    const myVersion = this.sessionVersion
    let browserClosed = false
    const onBrowserClose = () => {
      if (browserClosed || this.sessionVersion !== myVersion) return
      browserClosed = true
      if (this.screenshotTimer) {
        clearInterval(this.screenshotTimer)
        this.screenshotTimer = null
      }
      this.page = null
      this.context = null
      this.browser = null
      this.currentSession = null
      this.emit('closed')
    }
    this.page.on('close', onBrowserClose)
    this.browser.on('disconnected', onBrowserClose)

    this.currentSession = { url, browserType, startTime: Date.now() }

    // Poll screenshot every 800ms and emit to renderer
    this.screenshotTimer = setInterval(async () => {
      if (!this.page) return
      try {
        const buf: Buffer = await this.page.screenshot({ type: 'png' })
        this.emit('screenshot', buf.toString('base64'))
      } catch {
        // page may be navigating
      }
    }, 800)
  }

  async stopSession(): Promise<void> {
    this.sessionVersion++ // invalidate any pending onBrowserClose handlers from previous startSession
    if (this.screenshotTimer) {
      clearInterval(this.screenshotTimer)
      this.screenshotTimer = null
    }
    try { await this.page?.close() } catch {}
    try { await this.context?.close() } catch {}
    try { await this.browser?.close() } catch {}
    this.page = null
    this.context = null
    this.browser = null
    this.currentSession = null
  }

  async executeAction(type: string, data: any): Promise<void> {
    if (!this.page) return
    try {
      if (type === 'tap') {
        await this.page.mouse.click(data.x, data.y)
      } else if (type === 'key') {
        await this.page.keyboard.press(data.k)
      }
    } catch (err) {
      console.error('[BrowserSessionManager] executeAction error:', err)
    }
  }

  async takeScreenshot(): Promise<string | null> {
    if (!this.page) return null
    try {
      const buf: Buffer = await this.page.screenshot({ type: 'png' })
      return buf.toString('base64')
    } catch {
      return null
    }
  }

  getSession(): BrowserSession | null {
    return this.currentSession
  }

  isActive(): boolean {
    return this.page !== null
  }

  private async launchBrowser(type: BrowserType, headless: boolean): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pw = require('playwright-core')
    switch (type) {
      case 'chrome':
        return pw.chromium.launch({ channel: 'chrome', headless })
      case 'edge':
        return pw.chromium.launch({ channel: 'msedge', headless })
      case 'firefox':
        return pw.firefox.launch({ headless })
    }
  }
}
