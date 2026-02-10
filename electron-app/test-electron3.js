const electron = require('electron')

console.log('typeof electron:', typeof electron)
console.log('electron keys:', Object.keys(electron))
console.log('electron.app:', electron.app)
console.log('electron.BrowserWindow:', electron.BrowserWindow)

// Try to quit immediately
setTimeout(() => {
  if (electron.app) {
    electron.app.quit()
  } else {
    process.exit(0)
  }
}, 100)
