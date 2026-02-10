import { promises as fs } from 'fs'
import * as path from 'path'
import { Tag, TagCategory } from '../types/models'

export class TagManager {
  private tagsFile: string
  private tags: Map<string, Tag> = new Map()

  constructor(userDataPath: string) {
    const tagsDir = path.join(userDataPath, 'test-data', 'tags')
    this.tagsFile = path.join(tagsDir, 'tags.json')
  }

  async initialize(): Promise<void> {
    console.log('[TagManager] Initializing...')

    // Create tags directory if it doesn't exist
    try {
      const tagsDir = path.dirname(this.tagsFile)
      await fs.mkdir(tagsDir, { recursive: true })
      console.log(`[TagManager] Tags directory ready: ${tagsDir}`)
    } catch (error) {
      console.error('[TagManager] Failed to create tags directory:', error)
      throw error
    }

    // Load existing tags
    await this.loadTags()
  }

  private async loadTags(): Promise<void> {
    try {
      const content = await fs.readFile(this.tagsFile, 'utf-8')
      const tagsArray: Tag[] = JSON.parse(content)

      this.tags.clear()
      for (const tag of tagsArray) {
        this.tags.set(tag.id, tag)
      }

      console.log(`[TagManager] Loaded ${this.tags.size} tags`)
    } catch (error) {
      // File doesn't exist yet or is invalid, start with empty tags
      console.log('[TagManager] No existing tags found, starting fresh')
      this.tags.clear()

      // Create some default tags
      await this.createDefaultTags()
    }
  }

  private async saveTags(): Promise<void> {
    try {
      const tagsArray = Array.from(this.tags.values())
      const content = JSON.stringify(tagsArray, null, 2)
      await fs.writeFile(this.tagsFile, content, 'utf-8')
    } catch (error) {
      console.error('[TagManager] Failed to save tags:', error)
      throw error
    }
  }

  private async createDefaultTags(): Promise<void> {
    const defaultTags = [
      {
        name: 'Critical',
        color: '#ef4444',
        category: 'priority' as TagCategory,
        description: 'Critical tests that must pass'
      },
      {
        name: 'Smoke',
        color: '#f59e0b',
        category: 'priority' as TagCategory,
        description: 'Quick smoke tests for basic functionality'
      },
      {
        name: 'Regression',
        color: '#3b82f6',
        category: 'functional' as TagCategory,
        description: 'Regression tests for bug fixes'
      },
      {
        name: 'Authentication',
        color: '#8b5cf6',
        category: 'feature' as TagCategory,
        description: 'Tests related to user authentication'
      },
      {
        name: 'UI',
        color: '#ec4899',
        category: 'functional' as TagCategory,
        description: 'User interface tests'
      },
      {
        name: 'API',
        color: '#10b981',
        category: 'functional' as TagCategory,
        description: 'API integration tests'
      }
    ]

    for (const tagData of defaultTags) {
      await this.createTag(tagData.name, tagData)
    }

    console.log(`[TagManager] Created ${defaultTags.length} default tags`)
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async createTag(name: string, options?: Partial<Tag>): Promise<Tag> {
    const tagId = this.generateTagId(name)

    // Check if tag already exists
    if (this.tags.has(tagId)) {
      throw new Error(`Tag already exists: ${name}`)
    }

    const now = new Date().toISOString()
    const newTag: Tag = {
      id: tagId,
      name,
      color: options?.color,
      description: options?.description,
      category: options?.category,
      usageCount: 0,
      createdAt: now,
      updatedAt: now
    }

    this.tags.set(tagId, newTag)
    await this.saveTags()

    console.log(`[TagManager] Created tag: ${tagId} (${name})`)
    return newTag
  }

  async getTag(tagId: string): Promise<Tag | null> {
    return this.tags.get(tagId) || null
  }

  async listTags(): Promise<Tag[]> {
    // Return sorted by usage count (most used first), then by name
    return Array.from(this.tags.values()).sort((a, b) => {
      if (a.usageCount !== b.usageCount) {
        return b.usageCount - a.usageCount
      }
      return a.name.localeCompare(b.name)
    })
  }

  async updateTag(tagId: string, updates: Partial<Tag>): Promise<Tag> {
    const existingTag = this.tags.get(tagId)
    if (!existingTag) {
      throw new Error(`Tag not found: ${tagId}`)
    }

    const updatedTag: Tag = {
      ...existingTag,
      ...updates,
      id: existingTag.id, // ID cannot be changed
      createdAt: existingTag.createdAt, // Created date cannot be changed
      updatedAt: new Date().toISOString()
    }

    this.tags.set(tagId, updatedTag)
    await this.saveTags()

    console.log(`[TagManager] Updated tag: ${tagId}`)
    return updatedTag
  }

  async deleteTag(tagId: string): Promise<boolean> {
    const tag = this.tags.get(tagId)
    if (!tag) {
      return false
    }

    // Prevent deletion of tags in use
    if (tag.usageCount > 0) {
      throw new Error(
        `Cannot delete tag ${tag.name}: it is used in ${tag.usageCount} places. Remove it from all suites/tests first.`
      )
    }

    this.tags.delete(tagId)
    await this.saveTags()

    console.log(`[TagManager] Deleted tag: ${tagId}`)
    return true
  }

  // ============================================================================
  // Usage Tracking
  // ============================================================================

  async incrementUsage(tagId: string): Promise<void> {
    const tag = this.tags.get(tagId)
    if (!tag) {
      console.warn(`[TagManager] Tag not found for increment: ${tagId}`)
      return
    }

    tag.usageCount++
    tag.updatedAt = new Date().toISOString()
    await this.saveTags()
  }

  async decrementUsage(tagId: string): Promise<void> {
    const tag = this.tags.get(tagId)
    if (!tag) {
      console.warn(`[TagManager] Tag not found for decrement: ${tagId}`)
      return
    }

    tag.usageCount = Math.max(0, tag.usageCount - 1)
    tag.updatedAt = new Date().toISOString()
    await this.saveTags()
  }

  async getTagUsage(tagId: string): Promise<number> {
    const tag = this.tags.get(tagId)
    return tag ? tag.usageCount : 0
  }

  // ============================================================================
  // Queries
  // ============================================================================

  async getTagsByCategory(category: TagCategory): Promise<Tag[]> {
    const allTags = await this.listTags()
    return allTags.filter(tag => tag.category === category)
  }

  async searchTags(query: string): Promise<Tag[]> {
    const allTags = await this.listTags()
    const lowerQuery = query.toLowerCase()

    return allTags.filter(tag => {
      return (
        tag.name.toLowerCase().includes(lowerQuery) ||
        tag.description?.toLowerCase().includes(lowerQuery) ||
        tag.id.toLowerCase().includes(lowerQuery)
      )
    })
  }

  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    const allTags = await this.listTags()
    return allTags.slice(0, limit) // Already sorted by usage count
  }

  // ============================================================================
  // Validation
  // ============================================================================

  async validateTags(tagIds: string[]): Promise<boolean> {
    for (const tagId of tagIds) {
      if (!this.tags.has(tagId)) {
        console.warn(`[TagManager] Invalid tag ID: ${tagId}`)
        return false
      }
    }
    return true
  }

  async suggestTags(context: string): Promise<string[]> {
    // Simple keyword-based suggestion
    // In production, this would use AI via AIService
    const lowerContext = context.toLowerCase()
    const suggestions: string[] = []

    // Check each tag for relevance
    for (const tag of this.tags.values()) {
      const tagLower = tag.name.toLowerCase()
      const descLower = tag.description?.toLowerCase() || ''

      // If tag name or description matches context keywords
      if (lowerContext.includes(tagLower) || descLower.includes(lowerContext)) {
        suggestions.push(tag.id)
      }
    }

    // Also suggest popular tags if no specific matches
    if (suggestions.length === 0) {
      const popular = await this.getPopularTags(3)
      return popular.map(t => t.id)
    }

    return suggestions.slice(0, 5) // Return top 5 suggestions
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private normalizeTagName(name: string): string {
    // Normalize to lowercase, replace spaces with hyphens
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  }

  private generateTagId(name: string): string {
    return this.normalizeTagName(name)
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  async updateTagsUsage(tagIds: string[], delta: number): Promise<void> {
    for (const tagId of tagIds) {
      if (delta > 0) {
        await this.incrementUsage(tagId)
      } else if (delta < 0) {
        await this.decrementUsage(tagId)
      }
    }
  }

  async ensureTagsExist(tagNames: string[]): Promise<string[]> {
    const tagIds: string[] = []

    for (const name of tagNames) {
      const tagId = this.generateTagId(name)

      // Create tag if it doesn't exist
      if (!this.tags.has(tagId)) {
        await this.createTag(name, { category: 'custom' })
      }

      tagIds.push(tagId)
    }

    return tagIds
  }
}
