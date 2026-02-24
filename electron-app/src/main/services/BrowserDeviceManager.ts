import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { randomUUID } from 'crypto'

export type BrowserType = 'chrome' | 'edge' | 'firefox'

export interface BrowserDevice {
  id: string
  name: string
  url?: string // optional — legacy field; new browser devices don't store URLs here
  browserType: BrowserType
  createdAt: string
}

export class BrowserDeviceManager {
  private filePath: string
  private devices: BrowserDevice[] = []

  constructor(userDataPath: string) {
    const dir = join(userDataPath, 'config')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.filePath = join(dir, 'browser-devices.json')
    this.load()
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        const raw: BrowserDevice[] = JSON.parse(readFileSync(this.filePath, 'utf-8'))
        // migrate old records that lack browserType
        this.devices = raw.map((d) => ({ browserType: 'chrome' as BrowserType, ...d }))
      }
    } catch {
      this.devices = []
    }
  }

  private save(): void {
    writeFileSync(this.filePath, JSON.stringify(this.devices, null, 2))
  }

  getAll(): BrowserDevice[] {
    return [...this.devices]
  }

  add(name: string, url?: string, browserType: BrowserType = 'chrome'): BrowserDevice {
    const device: BrowserDevice = {
      id: `browser_${randomUUID()}`,
      name,
      ...(url ? { url } : {}),
      browserType,
      createdAt: new Date().toISOString()
    }
    this.devices.push(device)
    this.save()
    return device
  }

  update(
    id: string,
    updates: Partial<Pick<BrowserDevice, 'name' | 'url' | 'browserType'>>
  ): BrowserDevice | null {
    const idx = this.devices.findIndex((d) => d.id === id)
    if (idx === -1) return null
    this.devices[idx] = { ...this.devices[idx], ...updates }
    this.save()
    return this.devices[idx]
  }

  delete(id: string): boolean {
    const before = this.devices.length
    this.devices = this.devices.filter((d) => d.id !== id)
    if (this.devices.length !== before) {
      this.save()
      return true
    }
    return false
  }
}
