const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const versions = [
  { input: 'playguard-icon-v2.svg', output: 'preview-v2.png', name: 'V2: Cyan/Blue Gradient + Small Check' },
  { input: 'playguard-icon-v3.svg', output: 'preview-v3.png', name: 'V3: Purple/Pink Rounded Square' },
  { input: 'playguard-icon-v4.svg', output: 'preview-v4.png', name: 'V4: Ultra Minimal Indigo' },
  { input: 'playguard-icon-v5.svg', output: 'preview-v5.png', name: 'V5: Dark Neon Gaming' }
]

async function generatePreviews() {
  console.log('🎨 Generating icon previews...\n')

  for (const { input, output, name } of versions) {
    try {
      const svgPath = path.join(__dirname, '../resources', input)
      const outputPath = path.join(__dirname, '../resources', output)

      const svgBuffer = fs.readFileSync(svgPath)

      await sharp(svgBuffer)
        .resize(512, 512)
        .png()
        .toFile(outputPath)

      console.log(`✓ ${name}`)
      console.log(`  → ${output}\n`)
    } catch (error) {
      console.error(`✗ Failed ${input}:`, error.message)
    }
  }

  console.log('✅ Preview generation complete!')
  console.log('\n📁 Check resources/ folder for preview-v*.png files')
  console.log('🖼️  Open each one and choose your favorite!')
}

generatePreviews().catch(console.error)
