# Brandpack Tools - Development Guide

## Project Overview

**Brandpack Tools** is a suite of 6 professional web-based tools for managing proofing room operations at Brandpack Australasia. The project was migrated from monolithic HTML prototypes to a maintainable, modular codebase while preserving the simple single-file distribution model.

### Tools Included

1. **Launcher** (702 KB) - Main dashboard with cross-tool analytics
2. **LAB-CMYK Converter** (693 KB) - Color space conversion utility
3. **Inventory System** (706 KB) - Track printer supplies and usage
4. **Pantone Tracker** (703 KB) - Manage matched Pantone colors for Roland printer
5. **Productivity Tracker** (710 KB) - Time tracking with real-time timer and task management
6. **Maintenance Tracker** (723 KB) - Issue logging, maintenance scheduling, and technician visits

### Key Constraints

- **Work computers:** Cannot install software, limited internet access
- **Distribution:** Single HTML files that work offline
- **Development:** VM with Node.js build tools
- **Production:** Work computer with just a browser
- **Data:** localStorage-based, no backend required

---

## Architecture

### Development Structure (Modular)

```
brandpack-tools/
├── src/
│   ├── shared/                    # Shared code (DRY principle)
│   │   ├── components/            # Web Components (optional)
│   │   │   ├── AppHeader.js       # Reusable header component
│   │   │   ├── AppFooter.js       # Reusable footer component
│   │   │   ├── StatCard.js        # Statistics display card
│   │   │   └── Modal.js           # Reusable modal dialog
│   │   ├── utils/                 # Shared utilities
│   │   │   ├── storage.js         # localStorage abstraction with error handling
│   │   │   ├── export.js          # Cross-tool export/import functionality
│   │   │   ├── datetime.js        # Date/time formatting and calculations
│   │   │   └── validation.js      # Input validation utilities
│   │   ├── styles/                # Shared CSS
│   │   │   ├── theme.css          # CSS variables (colors, spacing, fonts)
│   │   │   ├── base.css           # Reset, typography, base styles
│   │   │   └── components.css     # Shared component styles (buttons, cards, etc.)
│   │   └── constants.js           # Centralized configuration (storage keys, printers, etc.)
│   │
│   ├── tools/                     # Individual tools (modular)
│   │   ├── launcher/
│   │   │   ├── index.html         # HTML structure
│   │   │   └── launcher.js        # JavaScript logic
│   │   ├── converter/
│   │   │   ├── index.html
│   │   │   └── converter.js
│   │   ├── inventory/
│   │   │   ├── index.html
│   │   │   └── inventory.js
│   │   ├── pantone/
│   │   │   ├── index.html
│   │   │   └── pantone.js
│   │   ├── productivity/
│   │   │   ├── index.html
│   │   │   └── productivity.js
│   │   └── maintenance/
│   │       ├── index.html
│   │       └── maintenance.js
│   │
│   └── assets/
│       ├── fonts/                 # Local fonts (8 TTF files)
│       │   ├── dm-sans-*.ttf
│       │   ├── outfit-*.ttf
│       │   ├── jetbrains-mono-*.ttf
│       │   └── fonts.css
│       └── pantone_data.json      # Pantone color database (358 KB)
│
├── scripts/
│   ├── build-all.js               # Sequential build script for all tools
│   └── package.js                 # Distribution package creator
│
├── dist/                          # Build output (gitignored)
│   ├── launcher.html              # Self-contained single files
│   ├── converter.html
│   ├── inventory.html
│   ├── pantone.html
│   ├── productivity.html
│   ├── maintenance.html
│   └── pantone_data.json
│
├── package.json                   # Node.js dependencies and scripts
├── vite.config.js                 # Vite build configuration
└── .gitignore                     # Excludes node_modules, dist, build artifacts
```

### Production Structure (Flat)

After building, all tools are single HTML files in the same directory:

```
brandpack-tools-v2.0.0/
├── launcher.html          # Open this first
├── converter.html
├── inventory.html
├── pantone.html
├── productivity.html
├── maintenance.html
├── pantone_data.json
├── README.md
└── QUICK-START.md
```

**All navigation uses same-directory links:**
- Launcher links: `inventory.html`, `pantone.html`, etc.
- Tool back links: `launcher.html`

---

## What Changed from Prototypes

### Before (Monolithic Prototypes)

- **6 separate HTML files** with all code inline
- **Massive duplication:** Same header/footer/utility code in each file (~2,000 lines duplicated)
- **CDN dependencies:** Google Fonts via CDN (wouldn't work offline)
- **No build process:** Manual file management
- **Hard to maintain:** Changes required editing 6 files

**Prototype files (preserved in repo root for reference):**
- `brandpack-tools-launcher.html`
- `lab-cmyk-converter.html`
- `inventory-system.html`
- `pantone-tracker.html`
- `productivity-tracker.html`
- `maintenance-tracker-FIXED.html`

### After (Modular with Build)

- **Modular development:** Shared utilities, styles, and components
- **DRY principle:** Zero duplication, single source of truth
- **Local fonts:** 8 font files embedded, fully offline
- **Build system:** Vite + vite-plugin-singlefile
- **Maintainable:** Edit once, affects all tools
- **Same output:** Still single HTML files, no change for users

### Key Technical Changes

1. **localStorage abstraction:** `storage.js` provides error handling and consistent API
2. **Centralized constants:** All storage keys, printer configs in `constants.js`
3. **Shared utilities:** Date formatting, validation, export/import logic
4. **Modular CSS:** Theme variables, base styles, component styles
5. **ES Modules:** Import/export for code organization
6. **Build automation:** Single command builds all 6 tools

---

## Build System

### Technology Stack

- **Node.js:** v24.12.0 (installed via nvm, no sudo required)
- **Vite:** v7.3.1 - Fast build tool
- **vite-plugin-singlefile:** Inlines all assets into single HTML files
- **Vanilla JavaScript:** No frameworks, just ES modules
- **CSS:** Custom properties (variables), no preprocessors

### How Building Works

**Problem:** Vite's multi-page build doesn't work with `vite-plugin-singlefile` (which requires `inlineDynamicImports: true`, incompatible with multiple entry points).

**Solution:** `scripts/build-all.js` builds each tool sequentially:

1. Loop through each tool
2. Run Vite build with single entry point
3. Move generated file from `dist/src/tools/toolname/index.html` to `dist/toolname.html`
4. Clean up nested directories
5. Repeat for next tool

**Build output:**
- Each tool is 690-725 KB (includes all fonts, CSS, JS)
- Total uncompressed: 4.2 MB
- Total compressed (tar.gz): 1.98 MB

### Build Process Details

**What gets inlined:**
- All JavaScript (ES modules bundled and minified)
- All CSS (from shared styles + tool-specific styles)
- All fonts (8 TTF files as base64 data URIs)
- Tool-specific code

**What doesn't get inlined:**
- `pantone_data.json` (358 KB, too large, stays separate)

---

## Development Workflow

### Initial Setup

```bash
# Install Node.js via nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 24.12.0
nvm use 24.12.0

# Install dependencies
cd brandpack-tools
npm install
```

### Development Commands

```bash
# Start development server (hot reload)
npm run dev

# Open browser to:
# http://localhost:5173/src/tools/launcher/index.html
# http://localhost:5173/src/tools/converter/index.html
# etc.

# Build all tools for production
npm run build

# Create distribution package
npm run package
```

### Development Server Navigation

When using `npm run dev`:
- Tools use development paths: `../toolname/index.html`
- Vite dev server resolves these correctly
- Changes auto-reload in browser

### Making Changes

**To modify a tool:**
1. Edit files in `src/tools/toolname/`
2. Dev server auto-reloads
3. Test in browser
4. When done: `npm run build`

**To modify shared code:**
1. Edit files in `src/shared/`
2. All tools automatically use the changes
3. Build to see final result

**To add a new tool:**
1. Create `src/tools/newtool/index.html` and `newtool.js`
2. Add entry to `scripts/build-all.js`:
   ```javascript
   { name: 'newtool', input: 'src/tools/newtool/index.html' }
   ```
3. Add link in launcher
4. Build and test

---

## Key Files Explained

### `src/shared/constants.js`

Centralized configuration for all tools:
- **STORAGE_KEYS:** localStorage keys used by each tool
- **PRINTERS:** Machine configurations (Epson, Roland, etc.)
- **INITIAL_INVENTORY:** Default inventory structure
- **STATUS_CATEGORIES:** Productivity status types
- **VERSION:** Current version number

### `src/shared/utils/storage.js`

localStorage wrapper with error handling:
```javascript
storage.get(key, defaultValue)  // Safely read with fallback
storage.set(key, value)         // Safely write with error catching
storage.remove(key)             // Delete key
```

### `src/shared/utils/export.js`

Cross-tool data export/import:
```javascript
exportAllData()     // Export all tool data to JSON
importAllData(data) // Import and merge data
downloadJSON(data)  // Trigger browser download
```

### `src/shared/utils/datetime.js`

Date/time utilities:
```javascript
formatDate(date, locale, options)      // Format date
formatDateTime(date, locale, options)  // Format date+time
formatDuration(ms)                     // Format milliseconds to HH:MM:SS
isOlderThanYears(date, years)          // Check if date is X years old
```

### `scripts/build-all.js`

Sequential build script:
1. Reads tool list array
2. For each tool:
   - Runs `vite build` with tool-specific config
   - Moves output from nested path to flat `dist/`
3. Cleans up intermediate directories
4. Reports build summary

### `scripts/package.js`

Distribution packager:
1. Verifies all tools exist in `dist/`
2. Copies `pantone_data.json` if exists
3. Generates `README.md` and `QUICK-START.md`
4. Creates `.tar.gz` archive
5. Reports package contents and size

---

## Tool Architecture Details

### Launcher (Analytics Dashboard)

**Purpose:** Main entry point, links to all tools, displays cross-tool analytics

**Key Features:**
- Tool cards with navigation
- Analytics aggregation from all tools' localStorage
- Export/import master data functionality

**Data Sources:**
- Reads from all tool storage keys
- Calculates statistics (inventory counts, time tracking, issue counts)
- Displays top used items, top tasks, etc.

**Important:** Launcher must be built last in development since it depends on understanding all tool data structures.

### Inventory System

**Purpose:** Track printer supplies, inks, media, and usage

**Data Structure:**
```javascript
{
  inventory: {
    'Printer Name': {
      'Category': [
        { id: 'SKU', name: 'Item Name', stock: 5, unit: '700ml' }
      ]
    }
  },
  usageHistory: [
    { timestamp, itemId, itemName, quantity, printer, category }
  ]
}
```

**Features:**
- Multi-printer support (Epson 9900, WT7900, P9070, Roland)
- Stock levels with visual indicators (empty/low/good)
- Usage tracking with history
- Statistics view with filtering

### Pantone Tracker

**Purpose:** Manage 4,150+ Pantone colors for Roland printing

**Data Structure:**
```javascript
[
  { name: 'PANTONE 185 C', sheet: 'Sheet1', date: '2024-01-15' }
]
```

**Features:**
- Large dataset handling (360KB JSON)
- Search/filter by color name
- Status tracking (matched/not matched/old)
- Date-based warnings (5+ years old)
- Bulk color checking
- Export updated dates

**Note:** `pantone_data.json` stays as separate file due to size.

### Productivity Tracker

**Purpose:** Real-time time tracking with status and task management

**Data Structure:**
```javascript
{
  dailyTotalsByDate: {
    '2024-01-15': { available: ms, working: ms, unavailable: ms }
  },
  taskTotals: {
    'status-taskname': totalMs
  },
  history: [
    { status, task, startTime, duration, date }
  ],
  tasks: {
    working: ['Admin', 'Maintenance'],
    unavailable: ['Lunch break', 'Tea break']
  }
}
```

**Features:**
- Real-time timer (100ms accuracy, persists across refresh)
- Three status categories (available/working/unavailable)
- Task-level time tracking
- Daily summaries with percentages
- End work day functionality
- Active session persistence

**Critical Implementation:**
- Timer uses `Date.now()` timestamps for accuracy
- Active session saved to localStorage on every change
- On page load, checks for active session and resumes

### Maintenance Tracker

**Purpose:** Comprehensive maintenance logging and tracking

**Data Structure:**
```javascript
{
  dailyChecklist: {
    '2024-01-15': [
      { id: 1, text: 'Task', completed: false }
    ]
  },
  issues: [
    {
      id, timestamp, machine, category, issueType,
      affectedColors: [], severity, timeSpent, actions,
      parts, photos: [], status, resolvedAt
    }
  ],
  recurringTasks: [
    { id, name, frequency, lastCompleted, nextDue, machine }
  ],
  techVisits: [
    { id, dateTime, company, machine, type, notes }
  ]
}
```

**Features:**
- 5 tabs: Today, Issues, Maintenance, Tech Visits, Analytics
- 15-item daily checklist with progress tracking
- Issue logging with photo upload (base64)
- Timer for time tracking
- Weekly maintenance procedures
- Recurring task management
- Technician visit scheduling
- Analytics with filtering

**Complex Features:**
- Photo upload stores images as base64 in localStorage
- Multi-tab interface with conditional rendering
- Machine-specific configurations (inks, categories)
- Date-based reminders and overdue detection

### LAB-CMYK Converter

**Purpose:** Color space conversion with visual preview

**Features:**
- Bidirectional conversion (LAB ↔ CMYK)
- Visual color preview
- Copy values functionality
- Real-time conversion updates
- Reference ranges for LAB values

**Note:** Simplest tool, good starting point for understanding architecture.

---

## Data Persistence

### localStorage Strategy

All tools use browser localStorage for data persistence:

**Storage Keys (from `constants.js`):**
```javascript
STORAGE_KEYS = {
  INVENTORY: 'printer-inventory',
  USAGE_HISTORY: 'printer-usage-history',
  TASKS: 'tasks',
  HISTORY: 'history',
  DAILY_TOTALS: 'dailyTotalsByDate',
  TASK_TOTALS: 'taskTotals',
  PANTONE_COLORS: 'pantone-colors',
  MAINTENANCE: 'proofing-maintenance'
}
```

**Why localStorage?**
- No backend required
- Works completely offline
- Persists across sessions
- Accessible from JavaScript
- ~5-10MB limit per domain (plenty for this use case)

**Data Format:**
- All data stored as JSON strings
- `storage.js` handles serialization/deserialization
- Error handling prevents data corruption

**Backward Compatibility:**
- Storage keys unchanged from prototypes
- Existing user data works without migration
- Data structures preserved

### Export/Import

Users can backup/restore data:

**Export:**
1. Click "Export All Data" in launcher
2. Downloads JSON file with all tool data
3. Filename includes date: `brandpack-tools-backup-2024-01-15.json`

**Import:**
1. Click "Import Data" in launcher
2. Select backup JSON file
3. Data is merged (not replaced)
4. Handles old data format migrations

---

## Build Configuration

### `vite.config.js`

```javascript
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Used for dev mode only
      // Production uses build-all.js script
      input: 'src/tools/converter/index.html',
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
})
```

**Key Points:**
- `viteSingleFile()` plugin inlines everything
- Dev mode: single entry point
- Production: `build-all.js` handles multiple tools
- Output files named after tool names

### `package.json`

```json
{
  "name": "brandpack-tools",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "node scripts/build-all.js",
    "preview": "vite preview",
    "package": "node scripts/package.js"
  },
  "devDependencies": {
    "vite": "^7.3.1",
    "vite-plugin-singlefile": "^2.3.0"
  }
}
```

**Scripts:**
- `npm run dev`: Start dev server
- `npm run build`: Build all tools
- `npm run preview`: Preview built files
- `npm run package`: Create distribution archive

---

## Testing

### Testing Checklist

After building, verify each tool:

**All Tools:**
- [ ] Opens without errors
- [ ] Fonts display correctly
- [ ] All styles applied
- [ ] No console errors
- [ ] localStorage works
- [ ] Navigation links work (back to launcher)

**Launcher:**
- [ ] All tool cards link correctly
- [ ] Analytics load without errors
- [ ] Export/import functionality works

**Inventory:**
- [ ] Can add/edit/delete items
- [ ] Stock tracking works
- [ ] Statistics display correctly

**Pantone:**
- [ ] Can upload pantone_data.json
- [ ] Search works
- [ ] Can mark colors as matched
- [ ] Export updated data works

**Productivity:**
- [ ] Timer starts/stops
- [ ] Timer persists on refresh
- [ ] Task switching works
- [ ] Daily summary calculates correctly
- [ ] End work day works

**Maintenance:**
- [ ] All 5 tabs switch correctly
- [ ] Checklist progress updates
- [ ] Issue logging works
- [ ] Photo upload works (optional, may be disabled in some browsers)

**Converter:**
- [ ] LAB to CMYK conversion
- [ ] CMYK to LAB conversion
- [ ] Color preview displays

### Offline Testing

**Critical:** Tools must work without internet.

```bash
# 1. Build tools
npm run build

# 2. Open DevTools Network tab in browser
# 3. Set throttling to "Offline"
# 4. Open dist/launcher.html
# 5. Verify no network requests
# 6. Test all tools
```

**Expected:** Zero network requests, all tools fully functional.

---

## Deployment

### Creating Distribution Package

```bash
# 1. Build all tools
npm run build

# 2. Create package
npm run package

# Output: brandpack-tools-v2.0.0-YYYY-MM-DD.tar.gz
```

### Package Contents

```
brandpack-tools-v2.0.0/
├── launcher.html (702 KB)
├── converter.html (693 KB)
├── inventory.html (706 KB)
├── pantone.html (703 KB)
├── productivity.html (710 KB)
├── maintenance.html (723 KB)
├── pantone_data.json (358 KB)
├── README.md
└── QUICK-START.md
```

**Total:** ~4.2 MB uncompressed, ~1.98 MB compressed

### Deploying to Work Computer

1. Extract `.tar.gz` file
2. Ensure all files in same folder
3. Open `launcher.html` in browser
4. No installation or configuration needed

**Requirements:**
- Modern browser (Chrome, Edge, Firefox)
- No admin rights needed
- No internet connection needed

---

## Common Issues & Solutions

### Issue: Fonts not loading

**Symptom:** Text appears in system font
**Cause:** Font paths incorrect
**Solution:** Verify `@import url('../../assets/fonts/fonts.css')` in `base.css`

### Issue: Tools can't find each other

**Symptom:** "File not found" when clicking tool links
**Cause:** Links using development paths
**Solution:** Use flat paths (`toolname.html` not `../toolname/index.html`)

### Issue: Build fails with "multiple inputs" error

**Symptom:** Build error about `inlineDynamicImports`
**Cause:** Trying to build multiple tools in single vite build
**Solution:** Use `npm run build` (which runs `build-all.js` script)

### Issue: Data not persisting

**Symptom:** Data lost after closing browser
**Cause:** Private/incognito mode or localStorage disabled
**Solution:** Use normal browser mode with localStorage enabled

### Issue: Package script fails

**Symptom:** "zip not found" or similar
**Cause:** `zip` command not available
**Solution:** Script uses `tar` instead (automatically handled)

---

## Future Enhancements (YAGNI)

These were considered but **not implemented** (following YAGNI principle):

- IndexedDB migration (localStorage is sufficient)
- Desktop app wrapper (HTML files work fine)
- PWA features (offline already works)
- Automated backups (manual export is enough)
- Print/PDF export (not requested)
- Dark mode (not requested)
- Multi-user support (single user only)
- Backend sync (localStorage is adequate)

**Philosophy:** Only build what's needed. Current solution works perfectly for the use case.

---

## Development Principles Applied

### DRY (Don't Repeat Yourself)

**Before:** 2,000+ lines duplicated across 6 files
**After:** Zero duplication, shared utilities and styles

**Examples:**
- localStorage logic: Was in every file, now in `storage.js`
- Date formatting: Duplicated 20+ times, now in `datetime.js`
- Header styles: Copy-pasted 6 times, now in shared CSS

### KISS (Keep It Simple, Stupid)

**Approach:**
- Vanilla JavaScript (no React/Vue/Angular complexity)
- Standard CSS (no Sass/Less/Tailwind)
- Simple build (just Vite + one plugin)
- Flat output (just HTML files)

**Result:** Easy to understand, easy to maintain, easy to deploy.

### YAGNI (You Aren't Gonna Need It)

**Avoided:**
- Complex state management (just localStorage)
- Testing frameworks (manual testing sufficient)
- CI/CD pipelines (manual build is fine)
- Type checking (JavaScript is adequate)
- Code generators (manual code is clear)

**Result:** Minimal dependencies, faster development, less maintenance.

---

## Git Workflow

### Repository Structure

```
master (main branch)
└── All development happens here
```

**Why no branches?** Single developer, simple workflow, no conflicts.

### Commit Guidelines

**Format:**
```
Type: Brief description

- Detailed change 1
- Detailed change 2
- Detailed change 3
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructuring
- `docs:` Documentation
- `build:` Build system changes
- `style:` Code formatting (no logic change)

**Example:**
```
feat: Add photo upload to maintenance tracker

- Implement base64 encoding for images
- Add photo preview grid
- Store images in localStorage with issue
- Add remove photo functionality
```

### Typical Workflow

```bash
# 1. Make changes
# Edit files in src/

# 2. Test locally
npm run dev
# Test in browser

# 3. Build to verify
npm run build
# Check dist/ output

# 4. Commit
git add .
git commit -m "fix: Correct navigation links in production build"

# 5. Push
git push origin master
```

---

## Working with Claude Code Web

### When Starting a Session

1. **Read this file first** to understand the project
2. **Check `package.json`** to see available scripts
3. **Look at `src/shared/constants.js`** to understand data structures
4. **Review recent commits** to see what changed

### Typical Tasks

**Add a new utility function:**
1. Add to appropriate file in `src/shared/utils/`
2. Export the function
3. Import in tool files that need it
4. Test with `npm run dev`
5. Build with `npm run build`

**Modify a tool:**
1. Edit files in `src/tools/toolname/`
2. Test in dev mode
3. Build and verify in `dist/`
4. Test navigation between tools

**Add a new tool:**
1. Create `src/tools/newtool/` folder
2. Create `index.html` and `newtool.js`
3. Import shared utilities
4. Add to `build-all.js` script
5. Add link in launcher
6. Build and test

**Fix a bug:**
1. Identify which tool(s) affected
2. Check if issue is in shared code or tool-specific
3. Make fix in appropriate location
4. Test with `npm run dev`
5. Build and verify
6. Commit with clear description

### Before Pushing Changes

**Checklist:**
- [ ] Code builds without errors (`npm run build`)
- [ ] All tools tested in browser
- [ ] Navigation works (launcher ↔ tools)
- [ ] localStorage works
- [ ] No console errors
- [ ] Changes committed with clear message

---

## Quick Reference

### File Paths

**Development:**
- Shared utilities: `../../shared/utils/filename.js`
- Shared styles: `../../shared/styles/filename.css`
- Tool navigation: `../toolname/index.html`

**Production (built):**
- All files: Same directory (flat)
- Tool navigation: `toolname.html`

### Import Patterns

```javascript
// Utilities
import { storage } from '../../shared/utils/storage.js'
import { formatDate } from '../../shared/utils/datetime.js'

// Constants
import { STORAGE_KEYS, PRINTERS } from '../../shared/constants.js'

// Export functions
import { exportAllData, importAllData } from '../../shared/utils/export.js'
```

### localStorage Keys

```javascript
STORAGE_KEYS.INVENTORY          // 'printer-inventory'
STORAGE_KEYS.USAGE_HISTORY      // 'printer-usage-history'
STORAGE_KEYS.TASKS              // 'tasks'
STORAGE_KEYS.HISTORY            // 'history'
STORAGE_KEYS.DAILY_TOTALS       // 'dailyTotalsByDate'
STORAGE_KEYS.TASK_TOTALS        // 'taskTotals'
STORAGE_KEYS.PANTONE_COLORS     // 'pantone-colors'
STORAGE_KEYS.MAINTENANCE        // 'proofing-maintenance'
```

### Build Commands

```bash
npm run dev        # Development server
npm run build      # Build all tools
npm run preview    # Preview built files
npm run package    # Create distribution package
```

---

## Version History

**v2.0.0** (2026-01-12)
- Complete modular rewrite
- All 6 tools migrated
- Shared utilities and styles
- Local fonts (no CDN)
- Build system with Vite
- Distribution package script
- Fixed navigation links for production
- Private GitHub repository created

**v1.0.0** (Prototypes)
- Original monolithic HTML files
- Proof of concept implementations
- Manual file management
- CDN-dependent fonts

---

## Support & Maintenance

### When Something Breaks

1. **Check console errors** - Browser DevTools (F12)
2. **Check localStorage** - DevTools > Application > Local Storage
3. **Verify build output** - Check `dist/` folder
4. **Test in clean browser** - Clear cache or incognito mode
5. **Check Git history** - What changed recently?

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update Vite
npm install vite@latest

# Update plugin
npm install vite-plugin-singlefile@latest

# Test after updating
npm run build
```

### Getting Help

**Resources:**
- This file (DEVELOPMENT.md)
- README.md (in distribution package)
- Original prototypes (repo root, for reference)
- Git commit history (what changed and why)

**Questions to Ask Claude Code Web:**
- "How does the [tool name] work?"
- "Where is [feature] implemented?"
- "How do I add [new functionality]?"
- "Why is [thing] not working?"
- "Show me how to [task]"

---

## Contact

**Project:** Brandpack Tools v2.0
**Repository:** https://github.com/elphiene/brandpack-tools (Private)
**Developer:** Brandpack Australasia
**Purpose:** Proofing room operations management

---

*Last updated: 2026-01-12*
