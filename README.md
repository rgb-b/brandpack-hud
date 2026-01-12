# Brandpack Tools v2.0.0

Professional toolkit for Brandpack Australasia proofing operations.

## 🚀 Quick Start

**To open the application:**
1. Open `index.html` in your browser
2. It will automatically redirect to the dashboard

**Alternative direct access:**
- Dashboard: `src/tools/launcher/index.html`
- Or use the file: URL in your browser

## 📁 Project Structure

```
brandpack-tools/
├── index.html                      # 🏠 Main entry point (open this file!)
├── README.md                       # Project documentation
├── DEVELOPMENT.md                  # Developer guide
├── src/                            # Source code
│   ├── tools/                      # All tool applications
│   │   ├── launcher/               # 📊 Dashboard/Homepage
│   │   ├── inventory/              # 📦 Inventory System
│   │   ├── productivity/           # ⏱️ Productivity Tracker
│   │   ├── pantone/                # 🎨 Pantone Tracker
│   │   ├── converter/              # 🔄 LAB-CMYK Converter
│   │   └── maintenance/            # 🔧 Maintenance Tracker
│   └── shared/                     # Shared resources
│       ├── styles/                 # CSS files
│       ├── utils/                  # Utility functions
│       ├── components/             # Reusable components
│       └── constants.js            # App-wide constants
├── docs/                           # 📚 Documentation files
│   ├── Daily tasks.txt
│   ├── Maintenance.txt
│   ├── QUICK-START.txt
│   └── README.txt
├── archive/                        # 📦 Old files & backups
│   ├── Pantone library spreadsheets
│   ├── Previous data backups
│   └── Legacy productivity tracker
├── scripts/                        # Build and utility scripts
└── package.json                    # Project dependencies
```

## 🛠️ Available Tools

### 1. **Dashboard (Launcher)**
Modern homepage with:
- Live clock and dynamic greeting
- Quick stats from all tools
- Interactive calendar with maintenance events
- Editable to-do list
- Resource usage stats
- Recent activity feed
- Quick action buttons

### 2. **Inventory System**
Track printer supplies, inks, media, and maintenance items across:
- Epson 9900/WT7900
- Epson 9070
- Roland VS-300i
- General materials

### 3. **Productivity Tracker**
Monitor daily activities and time allocation with:
- Status tracking (Available/Working/Unavailable)
- Task-specific time tracking
- Daily/weekly/monthly analytics
- Calendar view

### 4. **Pantone Tracker**
Manage matched Pantone colors for Roland printing:
- Add/edit/delete colors
- Search and filter
- Export/import database
- Date tracking for matches

### 5. **LAB-CMYK Converter**
Convert between LAB and CMYK color spaces:
- Visual color preview
- Bidirectional conversion
- Color history
- Copy values

### 6. **Maintenance Tracker**
Log issues and track maintenance:
- Daily checklist
- Issue logging with photos
- Tech visit scheduling
- Recurring maintenance tasks
- Analytics dashboard

## 💾 Data Storage

All data is stored in browser localStorage:
- Persistent across sessions
- Export/import functionality for backups
- Transfer data between computers via USB

## 🔄 Updating

When pulling updates from git:
```bash
git pull origin master
```

Then simply refresh the browser - no build step required!

## 📱 Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (Recommended)
- Firefox
- Safari

## 🆘 Support

For issues or questions, contact the development team or refer to the documentation in `/docs/DEVELOPMENT.md`

---

**Made with ❤️ for Brandpack Australasia**
