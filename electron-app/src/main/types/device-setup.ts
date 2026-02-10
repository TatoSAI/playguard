/**
 * Device Setup System Types
 * Defines reusable device configuration profiles for consistent test execution
 */

export interface UnitySetupAction {
  action: string
  args?: string[]
}

export interface SetupProfile {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number

  // App Management
  clearAppData: boolean
  reinstallApp: boolean
  apkPath?: string
  packageName: string

  // Device Settings
  brightness?: number          // 0-255
  volume?: number             // 0-100
  orientation?: 'portrait' | 'landscape' | 'auto'
  wifi: boolean
  mobileData: boolean
  airplane: boolean

  // Unity SDK Setup (requires Unity SDK integration)
  unitySetup?: {
    enabled: boolean
    skipTutorial?: boolean
    setPlayerCoins?: number
    unlockLevel?: number
    customActions?: UnitySetupAction[]
  }

  // Advanced Options
  clearCache: boolean
  killBackgroundApps: boolean
  timeout: number             // Max time to wait for setup (ms)
}

export interface SetupResult {
  success: boolean
  profileId: string
  deviceId: string
  duration: number
  steps: SetupStepResult[]
  error?: string
}

export interface SetupStepResult {
  step: string
  success: boolean
  duration: number
  error?: string
}

export const DEFAULT_SETUP_PROFILE: Omit<SetupProfile, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Default Setup',
  description: 'Standard device configuration for testing',

  clearAppData: true,
  reinstallApp: false,
  packageName: '',

  brightness: 200,
  volume: 50,
  orientation: 'portrait',
  wifi: true,
  mobileData: false,
  airplane: false,

  unitySetup: {
    enabled: false,
    skipTutorial: false,
    customActions: []
  },

  clearCache: true,
  killBackgroundApps: false,
  timeout: 60000
}
