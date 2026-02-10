const pngToIco = require('png-to-ico')
const fs = require('fs')
const path = require('path')

const inputFiles = [
  path.join(__dirname, '../resources/icon-16.png'),
  path.join(__dirname, '../resources/icon-32.png'),
  path.join(__dirname, '../resources/icon-48.png'),
  path.join(__dirname, '../resources/icon-256.png')
]

const outputFile = path.join(__dirname, '../resources/icon.ico')

console.log('🔧 Generating icon.ico for Windows...\n')

pngToIco(inputFiles)
  .then(buf => {
    fs.writeFileSync(outputFile, buf)
    console.log('✅ icon.ico generated successfully!')
    console.log(`📁 Location: ${outputFile}`)
  })
  .catch(error => {
    console.error('❌ Error generating ICO:', error.message)
  })
