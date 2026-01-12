import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function createPackage() {
    const version = '2.0.0'
    const date = new Date().toISOString().split('T')[0]
    const filename = `brandpack-tools-v${version}-${date}.zip`

    console.log('📦 Creating release package...\n')

    // Check if dist folder exists
    if (!fs.existsSync('dist')) {
        console.error('❌ Error: dist/ folder not found. Run "npm run build" first.')
        process.exit(1)
    }

    // Check if all tools exist
    const requiredFiles = [
        'launcher.html',
        'converter.html',
        'inventory.html',
        'pantone.html',
        'productivity.html',
        'maintenance.html'
    ]

    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join('dist', file)))

    if (missingFiles.length > 0) {
        console.error(`❌ Error: Missing files in dist/: ${missingFiles.join(', ')}`)
        console.error('   Run "npm run build" first.')
        process.exit(1)
    }

    // Copy pantone_data.json if it exists
    const pantoneDataSource = 'src/assets/pantone_data.json'
    if (fs.existsSync(pantoneDataSource)) {
        fs.copyFileSync(pantoneDataSource, 'dist/pantone_data.json')
        console.log('✓ Copied pantone_data.json')
    }

    // Create README for distribution
    const readmeContent = `# Brandpack Tools v${version}

Professional toolkit for Brandpack Australasia proofing operations.

## Quick Start

1. Extract all files to a folder
2. Open **launcher.html** in your browser (Chrome, Edge, or Firefox)
3. Click on any tool to launch it

## Tools Included

- **🚀 Launcher** - Main dashboard with analytics
- **📦 Inventory System** - Track supplies and usage
- **⏱️ Productivity Tracker** - Monitor time and tasks
- **🎨 Pantone Tracker** - Manage matched colors
- **🔀 LAB-CMYK Converter** - Color space conversion
- **🔧 Maintenance Tracker** - Log issues and maintenance

## Offline Usage

All tools work completely offline. No internet connection required after extraction.

## Data Storage

All data is stored locally in your browser's localStorage. Data persists between sessions.

### Export/Import Data

1. Open the Launcher
2. Click "Export All Data" to backup all tool data
3. Use "Import Data" to restore from a backup

### Moving Between Computers

1. Export data from old computer
2. Copy the export file to new computer via USB
3. Import on new computer

## Requirements

- Modern web browser (Chrome, Edge, Firefox)
- No installation needed
- No administrator rights required

## File Size

Total package: ~4.2MB (all tools included)

## Support

For issues or questions, contact the Brandpack IT team.

## Version History

**v2.0.0** (${date})
- Complete modular rewrite
- All fonts embedded (no CDN dependencies)
- Improved offline support
- Enhanced analytics dashboard
- Optimized build size

---

Built with ❤️ by Brandpack Australasia
`

    fs.writeFileSync('dist/README.md', readmeContent)
    console.log('✓ Created README.md')

    // Create quick start guide
    const quickStartContent = `# Quick Start Guide

## 3-Step Setup

1. **Extract Files**
   - Unzip this folder anywhere on your computer
   - No installation needed

2. **Open Launcher**
   - Double-click \`launcher.html\`
   - If prompted, choose your default browser

3. **Start Using Tools**
   - Click any tool card to launch it
   - All tools work offline
   - Data saves automatically

## Daily Workflow

### Morning Routine
1. Open Maintenance Tracker
2. Complete daily checklist
3. Check for any overnight issues

### Throughout the Day
- Use Inventory System to track usage
- Log time with Productivity Tracker
- Check Pantone matches as needed
- Log any maintenance issues

### End of Day
- Export data backups weekly
- Review analytics in Launcher
- Plan next day's tasks

## Data Management

### Backup Your Data
\`\`\`
Launcher → Export All Data → Save file
\`\`\`

### Restore Data
\`\`\`
Launcher → Import Data → Select backup file
\`\`\`

### Transfer to New Computer
\`\`\`
1. Export from old computer
2. Copy backup file via USB
3. Import on new computer
\`\`\`

## Troubleshooting

**Tools not opening?**
- Right-click → Open With → Choose browser
- Try a different browser (Chrome/Edge/Firefox)

**Data not saving?**
- Check browser localStorage is enabled
- Don't use private/incognito mode

**Can't see all tools?**
- Make sure all .html files are in the same folder
- Don't rename the .html files

## Tips

- Keep all files in one folder
- Don't rename the HTML files
- Export data regularly as backup
- Use Chrome or Edge for best experience

---

Need help? Contact Brandpack IT support
`

    fs.writeFileSync('dist/QUICK-START.md', quickStartContent)
    console.log('✓ Created QUICK-START.md')

    // Create package file (tar.gz since zip may not be available)
    const tarFilename = filename.replace('.zip', '.tar.gz')

    try {
        // Remove old package if exists
        if (fs.existsSync(tarFilename)) {
            fs.unlinkSync(tarFilename)
        }

        // Create tar.gz (includes all HTML files + optional files)
        const tarCommand = fs.existsSync('dist/pantone_data.json')
            ? 'cd dist && tar -czf ../' + tarFilename + ' *.html *.json *.md'
            : 'cd dist && tar -czf ../' + tarFilename + ' *.html *.md'

        await execAsync(tarCommand)

        // Use tarFilename for stats
        const actualFilename = tarFilename

        const stats = fs.statSync(actualFilename)
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2)

        console.log(`\n✅ Package created successfully!`)
        console.log(`📦 File: ${actualFilename}`)
        console.log(`📊 Size: ${sizeMB} MB`)
        console.log(`\n📋 Package contents:`)
        console.log(`   ✓ launcher.html (${(fs.statSync('dist/launcher.html').size / 1024).toFixed(0)} KB)`)
        console.log(`   ✓ converter.html (${(fs.statSync('dist/converter.html').size / 1024).toFixed(0)} KB)`)
        console.log(`   ✓ inventory.html (${(fs.statSync('dist/inventory.html').size / 1024).toFixed(0)} KB)`)
        console.log(`   ✓ pantone.html (${(fs.statSync('dist/pantone.html').size / 1024).toFixed(0)} KB)`)
        console.log(`   ✓ productivity.html (${(fs.statSync('dist/productivity.html').size / 1024).toFixed(0)} KB)`)
        console.log(`   ✓ maintenance.html (${(fs.statSync('dist/maintenance.html').size / 1024).toFixed(0)} KB)`)
        if (fs.existsSync('dist/pantone_data.json')) {
            console.log(`   ✓ pantone_data.json (${(fs.statSync('dist/pantone_data.json').size / 1024).toFixed(0)} KB)`)
        }
        console.log(`   ✓ README.md`)
        console.log(`   ✓ QUICK-START.md`)
        console.log(`\n🚀 Ready for distribution!`)
        console.log(`\n💡 To extract: tar -xzf ${actualFilename}`)
    } catch (error) {
        console.error('❌ Error creating package:', error.message)
        process.exit(1)
    }
}

createPackage().catch(error => {
    console.error('❌ Package creation failed:', error)
    process.exit(1)
})
