const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const svgPath = path.join(__dirname, '../resources/playguard-icon.svg')
const outputDir = path.join(__dirname, '../resources')

// Icon sizes for different platforms
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
  console.log('🎨 Generating PlayGuard icons...\n')

  // Read SVG
  const svgBuffer = fs.readFileSync(svgPath)

  // Generate PNG icons
  for (const { size, name } of sizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, name))

      console.log(`✓ Generated ${name} (${size}x${size})`)
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message)
    }
  }

  console.log('\n✅ Icon generation complete!')
  console.log('\n📝 Next steps:')
  console.log('1. For .ico (Windows): Use https://cloudconvert.com/png-to-ico')
  console.log('   Upload icon-256.png and convert to icon.ico')
  console.log('\n2. For .icns (macOS): Use https://cloudconvert.com/png-to-icns')
  console.log('   Upload icon-512.png and convert to icon.icns')
  console.log('\n3. Replace old icons in resources/ folder')
}

generateIcons().catch(console.error)
