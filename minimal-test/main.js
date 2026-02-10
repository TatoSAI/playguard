const { app, BrowserWindow } = require('electron')

console.log('process.type:', process.type)
console.log('app:', app)

app.whenReady().then(() => {
  console.log('Electron app ready!')

  const win = new BrowserWindow({
    width: 400,
    height: 300
  })

  win.loadURL('data:text/html,<h1>Minimal Test</h1>')

  setTimeout(() => {
    console.log('SUCCESS - Electron is working!')
    app.quit()
  }, 2000)
})
