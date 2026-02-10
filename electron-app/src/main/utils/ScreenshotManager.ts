import * as fs from 'fs/promises'
import * as path from 'path'
import * as electron from 'electron'

/**
 * ScreenshotManager - Manages screenshot storage as separate PNG files
 *
 * Benefits:
 * - Reduces JSON file size from 23MB to ~2KB
 * - Faster file I/O (no base64 encoding/decoding)
 * - Better organization (screenshots in dedicated folder)
 * - Easier to view/debug (can open PNG files directly)
 */
export class ScreenshotManager {
  private screenshotsDir: string

  constructor() {
    // Handle case when ELECTRON_RUN_AS_NODE is set (electron module not properly loaded)
    try {
      if (electron?.app?.getPath) {
        this.screenshotsDir = path.join(
          electron.app.getPath('userData'),
          'test-data',
          'screenshots'
        )
      } else {
        // Fallback to relative path if electron is not available
        console.warn('[ScreenshotManager] Electron app not available, using fallback path')
        this.screenshotsDir = path.join(process.cwd(), 'test-data', 'screenshots')
      }
    } catch (error) {
      // Fallback to relative path if any error occurs
      console.error('[ScreenshotManager] Error accessing electron.app:', error)
      this.screenshotsDir = path.join(process.cwd(), 'test-data', 'screenshots')
    }
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.screenshotsDir, { recursive: true })
    console.log(`[ScreenshotManager] Initialized: ${this.screenshotsDir}`)
  }

  /**
   * Save a screenshot from base64 data
   * @param suiteId - Test suite ID
   * @param testId - Test case ID
   * @param stepId - Step ID
   * @param base64Data - Base64 screenshot data (with or without data URI prefix)
   * @returns Relative path to the saved screenshot
   */
  async saveScreenshot(
    suiteId: string,
    testId: string,
    stepId: string,
    base64Data: string
  ): Promise<string> {
    // Remove data URI prefix if present
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '')

    // Create suite directory
    const suiteDir = path.join(this.screenshotsDir, suiteId)
    await fs.mkdir(suiteDir, { recursive: true })

    // Generate filename: testId_stepId.png
    const filename = `${testId}_${stepId}.png`
    const fullPath = path.join(suiteDir, filename)

    // Convert base64 to buffer and save
    const buffer = Buffer.from(base64Clean, 'base64')
    await fs.writeFile(fullPath, buffer)

    // Return relative path (from screenshots dir)
    const relativePath = path.join(suiteId, filename)
    console.log(`[ScreenshotManager] Saved: ${relativePath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)

    return relativePath
  }

  /**
   * Load a screenshot as base64 data URI
   * @param relativePath - Relative path returned by saveScreenshot()
   * @returns Base64 data URI (data:image/png;base64,...)
   */
  async loadScreenshot(relativePath: string): Promise<string> {
    const fullPath = path.join(this.screenshotsDir, relativePath)

    try {
      const buffer = await fs.readFile(fullPath)
      const base64 = buffer.toString('base64')
      return `data:image/png;base64,${base64}`
    } catch (error) {
      console.error(`[ScreenshotManager] Failed to load: ${relativePath}`, error)
      throw new Error(`Screenshot not found: ${relativePath}`)
    }
  }

  /**
   * Delete all screenshots for a test case
   * @param suiteId - Test suite ID
   * @param testId - Test case ID
   */
  async deleteTestScreenshots(suiteId: string, testId: string): Promise<void> {
    const suiteDir = path.join(this.screenshotsDir, suiteId)

    try {
      const files = await fs.readdir(suiteDir)
      const testFiles = files.filter(file => file.startsWith(`${testId}_`))

      for (const file of testFiles) {
        await fs.unlink(path.join(suiteDir, file))
        console.log(`[ScreenshotManager] Deleted: ${suiteId}/${file}`)
      }
    } catch (error) {
      console.error(`[ScreenshotManager] Failed to delete screenshots for ${testId}:`, error)
    }
  }

  /**
   * Delete all screenshots for a test suite
   * @param suiteId - Test suite ID
   */
  async deleteSuiteScreenshots(suiteId: string): Promise<void> {
    const suiteDir = path.join(this.screenshotsDir, suiteId)

    try {
      await fs.rm(suiteDir, { recursive: true, force: true })
      console.log(`[ScreenshotManager] Deleted suite screenshots: ${suiteId}`)
    } catch (error) {
      console.error(`[ScreenshotManager] Failed to delete suite screenshots:`, error)
    }
  }

  /**
   * Get screenshot file size
   * @param relativePath - Relative path to screenshot
   * @returns Size in bytes
   */
  async getScreenshotSize(relativePath: string): Promise<number> {
    const fullPath = path.join(this.screenshotsDir, relativePath)

    try {
      const stats = await fs.stat(fullPath)
      return stats.size
    } catch (error) {
      return 0
    }
  }

  /**
   * Check if screenshot exists
   * @param relativePath - Relative path to screenshot
   * @returns True if exists
   */
  async screenshotExists(relativePath: string): Promise<boolean> {
    const fullPath = path.join(this.screenshotsDir, relativePath)

    try {
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Clean up orphaned screenshots (screenshots without corresponding test)
   * @returns Number of deleted files
   */
  async cleanupOrphanedScreenshots(existingTestIds: Set<string>): Promise<number> {
    let deletedCount = 0

    try {
      const suites = await fs.readdir(this.screenshotsDir)

      for (const suiteId of suites) {
        const suiteDir = path.join(this.screenshotsDir, suiteId)
        const files = await fs.readdir(suiteDir)

        for (const file of files) {
          // Extract testId from filename (testId_stepId.png)
          const testId = file.split('_')[0]

          if (!existingTestIds.has(testId)) {
            await fs.unlink(path.join(suiteDir, file))
            deletedCount++
            console.log(`[ScreenshotManager] Cleaned orphaned: ${suiteId}/${file}`)
          }
        }
      }

      console.log(`[ScreenshotManager] Cleanup complete: ${deletedCount} orphaned screenshots deleted`)
    } catch (error) {
      console.error('[ScreenshotManager] Cleanup failed:', error)
    }

    return deletedCount
  }

  /**
   * Get total size of all screenshots
   * @returns Size in bytes
   */
  async getTotalSize(): Promise<number> {
    let totalSize = 0

    try {
      const suites = await fs.readdir(this.screenshotsDir)

      for (const suiteId of suites) {
        const suiteDir = path.join(this.screenshotsDir, suiteId)
        const files = await fs.readdir(suiteDir)

        for (const file of files) {
          const stats = await fs.stat(path.join(suiteDir, file))
          totalSize += stats.size
        }
      }
    } catch (error) {
      console.error('[ScreenshotManager] Failed to calculate total size:', error)
    }

    return totalSize
  }
}

// Singleton instance
export const screenshotManager = new ScreenshotManager()
