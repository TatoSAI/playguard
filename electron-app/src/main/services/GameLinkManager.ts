import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { randomUUID } from 'crypto'

export interface GameLink {
  id: string
  name: string
  devUrl: string
  stagingUrl: string
  productionUrl: string
  createdAt: string
}

export class GameLinkManager {
  private filePath: string
  private links: GameLink[] = []

  constructor(userDataPath: string) {
    const dir = join(userDataPath, 'config')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.filePath = join(dir, 'game-links.json')
    this.load()
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        const raw: GameLink[] = JSON.parse(readFileSync(this.filePath, 'utf-8'))
        this.links = raw.map((l) => ({
          devUrl: '',
          stagingUrl: '',
          productionUrl: '',
          ...l
        }))
      }
    } catch {
      this.links = []
    }
  }

  private save(): void {
    writeFileSync(this.filePath, JSON.stringify(this.links, null, 2))
  }

  getAll(): GameLink[] {
    return [...this.links]
  }

  add(name: string, devUrl: string, stagingUrl: string, productionUrl: string): GameLink {
    const link: GameLink = {
      id: `game_${randomUUID()}`,
      name,
      devUrl,
      stagingUrl,
      productionUrl,
      createdAt: new Date().toISOString()
    }
    this.links.push(link)
    this.save()
    return link
  }

  update(
    id: string,
    updates: Partial<Pick<GameLink, 'name' | 'devUrl' | 'stagingUrl' | 'productionUrl'>>
  ): GameLink | null {
    const idx = this.links.findIndex((l) => l.id === id)
    if (idx === -1) return null
    this.links[idx] = { ...this.links[idx], ...updates }
    this.save()
    return this.links[idx]
  }

  delete(id: string): boolean {
    const before = this.links.length
    this.links = this.links.filter((l) => l.id !== id)
    if (this.links.length !== before) {
      this.save()
      return true
    }
    return false
  }
}
