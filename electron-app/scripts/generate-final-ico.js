const pngToIco = require('png-to-ico')
const fs = require('fs')
const path = require('path')

const inputFiles = [
  path.join(__dirname, '../resources/icon-16.png'),
  path.join(__dirname, '../resources/icon-32.png'),
  path.join(__dirname, '../resources/icon-48.png'),
  path.join(__dirname, '../resources/icon.png')
]

const outputFile = path.join(__dirname, '../resources/icon.ico')

console.log('🔧 Generating icon.ico for Windows...\n')

// Use the default export properly
const convertPngToIco = pngToIco.default || pngToIco

convertPngToIco(inputFiles)
  .then(buf => {
    fs.writeFileSync(outputFile, buf)
    console.log('✅ icon.ico generated successfully!')
    console.log(`📁 Location: ${outputFile}`)
    console.log('\n📦 All icons ready for PlayGuard!')
  })
  .catch(error => {
    console.error('❌ Error generating ICO:', error.message)
    console.log('\n⚠️  Fallback: Use online converter')
    console.log('   https://cloudconvert.com/png-to-ico')
    console.log('   Upload: icon.png')
  })
