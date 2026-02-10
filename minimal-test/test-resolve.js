console.log('Node version:', process.version)
console.log('Electron version:', process.versions.electron)
console.log('Process type:', process.type)

console.log('\nTrying require.resolve:')
try {
  const electronPath = require.resolve('electron')
  console.log('electron resolves to:', electronPath)
} catch (e) {
  console.log('Error resolving:', e.message)
}

console.log('\nTrying require:')
const electron = require('electron')
console.log('typeof electron:', typeof electron)
console.log('electron value:', electron)
console.log('electron.app:', electron.app)

// Check module.cache
console.log('\nChecked require.cache:')
const electronCacheKey = Object.keys(require.cache).find(k => k.includes('electron'))
if (electronCacheKey) {
  console.log('Found in cache:', electronCacheKey)
  console.log('Cached exports:', require.cache[electronCacheKey].exports)
}

setTimeout(() => process.exit(0), 100)
