const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const svgPath = path.join(__dirname, '../resources/playguard-final.svg')
const outputDir = path.join(__dirname, '../resources')

// All required icon sizes
const sizes = [
  { size: 16, name: 'icon-16.png' },
  { size: 32, name: 'icon-32.png' },
  { size: 48, name: 'icon-48.png' },
  { size: 64, name: 'icon-64.png' },
  { size: 128, name: 'icon-128.png' },
  { size: 256, name: 'icon.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 1024, name: 'icon-1024.png' }
]

async function generateIcons() {
  console.log('🚀 Generating PlayGuard final icons...\n')

  const svgBuffer = fs.readFileSync(svgPath)

  for (const { size, name } of sizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, name))

      console.log(`✓ ${name} (${size}x${size})`)
    } catch (error) {
      console.error(`✗ Failed ${name}:`, error.message)
    }
  }

  console.log('\n✅ All PNG icons generated!')
  console.log('📦 Next: Generate ICO for Windows')
}

generateIcons().catch(console.error)
