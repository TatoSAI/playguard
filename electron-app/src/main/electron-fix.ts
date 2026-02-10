// Workaround for electron module resolution issue
// When require('electron') returns a string path instead of the module,
// we need to access electron's built-in modules directly

let electron: any

try {
  // Try normal require first
  const electronModule = require('electron')

  if (typeof electronModule === 'string') {
    // If it's a string (path), electron module isn't loaded properly
    // This shouldn't happen in a proper Electron environment
    console.error('[FATAL] Electron module not available - got path string instead')
    console.error('[FATAL] This indicates a module resolution issue')
    process.exit(1)
  } else {
    electron = electronModule
  }
} catch (error) {
  console.error('[FATAL] Could not require electron:', error)
  process.exit(1)
}

export const app = electron.app
export const shell = electron.shell
export const BrowserWindow = electron.BrowserWindow
export const ipcMain = electron.ipcMain
