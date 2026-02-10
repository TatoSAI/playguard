import { promises as fs } from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { TestSuite, TestCase, DeviceMetadata, MigrationStatus } from '../types/models'
import { SuiteManager } from '../managers/SuiteManager'
import { TestCaseManager } from '../managers/TestCaseManager'

export class DataMigration {
  private userDataPath: string
  private suiteManager: SuiteManager
  private testCaseManager: TestCaseManager
  private migrationStatusFile: string

  constructor(userDataPath: string, suiteManager: SuiteManager, testCaseManager: TestCaseManager) {
    this.userDataPath = userDataPath
    this.suiteManager = suiteManager
    this.testCaseManager = testCaseManager
    this.migrationStatusFile = path.join(userDataPath, 'test-data', 'migration_status.json')
  }

  async checkMigrationNeeded(): Promise<boolean> {
    // Check if migration has already been completed
    const status = await this.getMigrationStatus()
    if (status && status.migrated) {
      console.log('[DataMigration] Migration already completed')
      return false
    }

    // Check if old test-cases directory exists
    const oldTestCasesDir = path.join(this.userDataPath, 'test-cases')
    try {
      await fs.access(oldTestCasesDir)
      const files = await fs.readdir(oldTestCasesDir)
      const jsonFiles = files.filter(f => f.endsWith('.json'))

      if (jsonFiles.length > 0) {
        console.log(`[DataMigration] Found ${jsonFiles.length} old test cases, migration needed`)
        return true
      }
    } catch {
      // Old directory doesn't exist
    }

    return false
  }

  async migrateToV2(): Promise<void> {
    console.log('[DataMigration] Starting migration to V2...')

    try {
      // Step 1: Create backup
      console.log('[DataMigration] Creating backup...')
      const backupPath = await this.createBackup()
      console.log(`[DataMigration] Backup created at: ${backupPath}`)

      // Step 2: Create "Migrated Tests" suite
      console.log('[DataMigration] Creating migration suite...')
      const migrationSuite = await this.createMigrationSuite()
      console.log(`[DataMigration] Migration suite created: ${migrationSuite.id}`)

      // Step 3: Migrate test cases
      console.log('[DataMigration] Migrating test cases...')
      const migratedCount = await this.migrateTestCases(migrationSuite.id)
      console.log(`[DataMigration] Migrated ${migratedCount} test cases`)

      // Step 4: Archive old directory
      console.log('[DataMigration] Archiving old directory...')
      await this.archiveOldDirectory()

      // Step 5: Mark migration complete
      await this.markMigrationComplete(backupPath)
      console.log('[DataMigration] Migration completed successfully!')
    } catch (error) {
      console.error('[DataMigration] Migration failed:', error)
      throw error
    }
  }

  private async createBackup(): Promise<string> {
    const oldTestCasesDir = path.join(this.userDataPath, 'test-cases')
    const backupsDir = path.join(this.userDataPath, 'backups')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = path.join(backupsDir, `backup_${timestamp}`)

    await fs.mkdir(backupDir, { recursive: true })

    // Copy all files from old directory to backup
    const files = await fs.readdir(oldTestCasesDir)
    for (const file of files) {
      const srcPath = path.join(oldTestCasesDir, file)
      const destPath = path.join(backupDir, file)

      const stat = await fs.stat(srcPath)
      if (stat.isFile()) {
        await fs.copyFile(srcPath, destPath)
      }
    }

    return backupDir
  }

  private async createMigrationSuite(): Promise<TestSuite> {
    return await this.suiteManager.createSuite({
      name: 'Migrated Tests',
      description: 'Tests migrated from previous PlayGuard version',
      environment: 'Development',
      tags: ['migrated'],
      testCaseIds: []
    })
  }

  private async migrateTestCases(suiteId: string): Promise<number> {
    const oldTestCasesDir = path.join(this.userDataPath, 'test-cases')

    // Load old test cases
    const oldTests = await this.testCaseManager.getAllTestsFromLegacyDirectory(oldTestCasesDir)

    let migratedCount = 0

    for (const oldTest of oldTests) {
      try {
        // Convert old test to new format
        const newTestCase = await this.convertOldTestCase(oldTest, suiteId)

        // Create test case in new structure
        await this.testCaseManager.createTestCase(suiteId, newTestCase)

        migratedCount++
      } catch (error) {
        console.error(`[DataMigration] Failed to migrate test ${oldTest.id}:`, error)
      }
    }

    return migratedCount
  }

  private async convertOldTestCase(oldTest: any, suiteId: string): Promise<Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>> {
    // Create device metadata (use defaults since old format didn't track this)
    const recordingDevice: DeviceMetadata = {
      id: 'unknown',
      model: 'Unknown Device',
      manufacturer: 'Unknown',
      androidVersion: 'Unknown',
      resolution: '1080x2400',
      recordedAt: oldTest.createdAt || new Date().toISOString()
    }

    // Convert to new test case format
    return {
      suiteId,
      name: oldTest.name,
      description: oldTest.description || '',
      tags: oldTest.tags || [],
      recordingDevice,
      prerequisites: [], // Old format didn't have prerequisites
      steps: oldTest.steps || [],
      cleanup: oldTest.cleanup,
      executionHistory: [], // No execution history in old format
      version: oldTest.version || '1.0',
      variables: oldTest.variables
    }
  }

  private async archiveOldDirectory(): Promise<void> {
    const oldTestCasesDir = path.join(this.userDataPath, 'test-cases')
    const archiveDir = path.join(this.userDataPath, 'test-cases_old')

    try {
      await fs.rename(oldTestCasesDir, archiveDir)
      console.log(`[DataMigration] Old directory archived to: ${archiveDir}`)
    } catch (error) {
      console.warn('[DataMigration] Failed to archive old directory:', error)
    }
  }

  private async markMigrationComplete(backupPath: string): Promise<void> {
    const status: MigrationStatus = {
      version: '2.0',
      lastMigration: new Date().toISOString(),
      migrated: true,
      backupPath
    }

    const statusDir = path.dirname(this.migrationStatusFile)
    await fs.mkdir(statusDir, { recursive: true })

    await fs.writeFile(this.migrationStatusFile, JSON.stringify(status, null, 2), 'utf-8')
  }

  private async getMigrationStatus(): Promise<MigrationStatus | null> {
    try {
      const content = await fs.readFile(this.migrationStatusFile, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  async resetMigration(): Promise<void> {
    // WARNING: This is for testing only!
    try {
      await fs.unlink(this.migrationStatusFile)
      console.log('[DataMigration] Migration status reset')
    } catch (error) {
      console.warn('[DataMigration] Failed to reset migration status:', error)
    }
  }
}
