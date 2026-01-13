# Tools Directory

This directory contains utility scripts for managing and migrating Brandpack Tools data.

## export-localStorage-data.js

**Purpose:** Export all data from the current localStorage-based application for migration to the new server-based version.

**Usage:**

1. Open any of the current Brandpack Tools in a web browser:
   - File path: `file:///path/to/brandpack-tools/index.html`
   - Or open any individual tool

2. Open the browser's Developer Console:
   - Chrome/Edge: Press `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
   - Firefox: Press `F12` or `Ctrl+Shift+K` (Windows/Linux) / `Cmd+Option+K` (Mac)

3. Copy the entire contents of `export-localStorage-data.js`

4. Paste into the console and press Enter

5. A JSON file will automatically download with a name like:
   ```
   brandpack-tools-export-1705123456789.json
   ```

6. Save this file in a safe location - you'll need it to import data into the new server application

**What gets exported:**

- Inventory data (all printers, items, stock levels)
- Usage history (inventory changes over time)
- Productivity tasks and history
- Daily totals and task totals
- Pantone colors (4,150+ colors with match status)
- Maintenance data (checklists, issues, tech visits)
- Dashboard todos and activity feed

**File format:**

```json
{
  "metadata": {
    "exportDate": "2026-01-14T12:00:00.000Z",
    "version": "2.0.0",
    "totalKeys": 8,
    "keysFound": ["INVENTORY", "PANTONE_COLORS", ...]
  },
  "data": {
    "INVENTORY": { ... },
    "USAGE_HISTORY": [ ... ],
    "PANTONE_COLORS": [ ... ],
    ...
  }
}
```

## Notes

- The export script is safe - it only reads data, it doesn't modify anything
- If you've never used the Pantone tool, that section will be `null`
- Empty/unused sections will show as `null` in the export
- Keep the exported JSON file safe - it's your backup before migrating
- You can run this export multiple times to create backups
