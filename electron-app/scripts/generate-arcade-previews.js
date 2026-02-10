const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const versions = [
  { input: 'playguard-arcade.svg', output: 'arcade-red.png', name: '🔴 RED - Classic arcade' },
  { input: 'playguard-arcade-blue.svg', output: 'arcade-blue.png', name: '🔵 BLUE - Professional' },
  { input: 'playguard-arcade-yellow.svg', output: 'arcade-yellow.png', name: '🟡 YELLOW - Bright & Bold' },
  { input: 'playguard-arcade-green.svg', output: 'arcade-green.png', name: '🟢 GREEN - Quality/Pass' }
]

async function generatePreviews() {
  console.log('🕹️  Generating arcade button previews...\n')

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

  console.log('✅ Arcade button previews complete!')
  console.log('\n🕹️  Concept: Arcade button with magnifying glass')
  console.log('🎨 Style: Flat 3D with solid colors')
  console.log('🔍 Icon: Magnifying glass = Testing/Inspection')
  console.log('\n📁 Open resources/ folder and choose your color!')
}

generatePreviews().catch(console.error)
