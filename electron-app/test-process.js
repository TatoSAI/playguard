console.log('process.versions:', process.versions)
console.log('process.type:', process.type)

// Check if we're in Electron
if (process.versions.electron) {
  console.log('Running in Electron:', process.versions.electron)

  // Try accessing electron
  const electron = require('electron')
  console.log('typeof electron:', typeof electron)

  // Check if there's a different way to access it
  console.log('process.electronBinding:', typeof process.electronBinding)

  // Try binding
  if (typeof process.electronBinding === 'function') {
    try {
      const atomBinding = process.electronBinding('atom')
      console.log('atomBinding:', atomBinding)
    } catch (e) {
      console.log('No atom binding:', e.message)
    }
  }
} else {
  console.log('NOT running in Electron')
}

setTimeout(() => process.exit(0), 100)
