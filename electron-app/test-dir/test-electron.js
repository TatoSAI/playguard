const electron = require('electron')

console.log('typeof electron:', typeof electron)
console.log('electron:', electron)
console.log('electron.app:', electron.app)

if (electron.app) {
  electron.app.whenReady().then(() => {
    console.log('Electron app is ready!')
    electron.app.quit()
  })
} else {
  console.error('electron.app is undefined!')
  process.exit(1)
}
