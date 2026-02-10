// Try accessing electron from the internal electron context
try {
  // When running inside Electron, this should work
  const { app } = require('electron')

  console.log('SUCCESS: Got app from require("electron")')
  console.log('app:', app)

  app.whenReady().then(() => {
    console.log('Electron ready!')
    app.quit()
  })
} catch (err) {
  console.error('Error:', err.message)
  console.error('Stack:', err.stack)
  process.exit(1)
}
