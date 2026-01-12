import { build } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'fs'
import path from 'path'

const tools = [
  { name: 'converter', input: 'src/tools/converter/index.html' },
  { name: 'inventory', input: 'src/tools/inventory/index.html' },
  { name: 'pantone', input: 'src/tools/pantone/index.html' },
  { name: 'productivity', input: 'src/tools/productivity/index.html' },
  { name: 'maintenance', input: 'src/tools/maintenance/index.html' },
  { name: 'launcher', input: 'src/tools/launcher/index.html' },
]

async function buildAll() {
  console.log('🚀 Building all tools...\n')

  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true })
  }
  fs.mkdirSync('dist', { recursive: true })

  for (const tool of tools) {
    console.log(`📦 Building ${tool.name}...`)

    try {
      await build({
        plugins: [viteSingleFile()],
        build: {
          outDir: 'dist',
          emptyOutDir: false,
          rollupOptions: {
            input: tool.input,
            output: {
              entryFileNames: `${tool.name}.js`,
              assetFileNames: `${tool.name}.[ext]`
            }
          }
        }
      })

      // Move the generated index.html to tool-name.html
      const generatedPath = path.join('dist', 'src', 'tools', tool.name, 'index.html')
      const targetPath = path.join('dist', `${tool.name}.html`)

      if (fs.existsSync(generatedPath)) {
        fs.renameSync(generatedPath, targetPath)
        console.log(`✓ ${tool.name}.html created (${(fs.statSync(targetPath).size / 1024).toFixed(0)}KB)\n`)
      }
    } catch (error) {
      console.error(`✗ Error building ${tool.name}:`, error.message)
      process.exit(1)
    }
  }

  // Clean up the src directory in dist
  const distSrcPath = path.join('dist', 'src')
  if (fs.existsSync(distSrcPath)) {
    fs.rmSync(distSrcPath, { recursive: true })
  }

  console.log('✅ All tools built successfully!')
  console.log('\n📊 Build summary:')

  for (const tool of tools) {
    const filePath = path.join('dist', `${tool.name}.html`)
    if (fs.existsSync(filePath)) {
      const size = (fs.statSync(filePath).size / 1024).toFixed(0)
      console.log(`   ${tool.name}.html - ${size}KB`)
    }
  }
}

buildAll().catch(error => {
  console.error('Build failed:', error)
  process.exit(1)
})
