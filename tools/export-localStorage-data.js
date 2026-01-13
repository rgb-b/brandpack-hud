/**
 * localStorage Data Export Script
 *
 * Run this in the browser console while the current offline app is open.
 * It will download all localStorage data as a JSON file for migration.
 *
 * Usage:
 * 1. Open any of the current Brandpack Tools in browser
 * 2. Open Developer Console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. A JSON file will download automatically
 */

(function exportAllData() {
  console.log('🚀 Starting localStorage data export...')

  // All storage keys used across the application
  const STORAGE_KEYS = {
    INVENTORY: 'printer-inventory',
    USAGE_HISTORY: 'printer-usage-history',
    TASKS: 'tasks',
    HISTORY: 'history',
    DAILY_TOTALS: 'dailyTotalsByDate',
    TASK_TOTALS: 'taskTotals',
    PANTONE_COLORS: 'pantone-colors',
    MAINTENANCE: 'proofing-maintenance',
    DASHBOARD_TODOS: 'dashboard-todos',
    DASHBOARD_ACTIVITY: 'dashboard-activity'
  }

  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      version: '2.0.0',
      source: 'Brandpack Tools v2.0.0',
      totalKeys: 0,
      keysFound: []
    },
    data: {}
  }

  // Extract data from localStorage
  let keysFound = 0
  for (const [name, storageKey] of Object.entries(STORAGE_KEYS)) {
    try {
      const rawData = localStorage.getItem(storageKey)
      if (rawData !== null) {
        exportData.data[name] = JSON.parse(rawData)
        exportData.metadata.keysFound.push(name)
        keysFound++
        console.log(`✓ Found ${name}: ${rawData.length} bytes`)
      } else {
        exportData.data[name] = null
        console.log(`⚠ ${name} not found in localStorage`)
      }
    } catch (error) {
      console.error(`✗ Error parsing ${name}:`, error)
      exportData.data[name] = { error: error.message }
    }
  }

  exportData.metadata.totalKeys = keysFound

  // Create download
  const jsonString = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `brandpack-tools-export-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  console.log('✅ Export complete!')
  console.log(`   - Total keys found: ${keysFound}/${Object.keys(STORAGE_KEYS).length}`)
  console.log(`   - File size: ${(jsonString.length / 1024).toFixed(2)} KB`)
  console.log(`   - File downloaded: brandpack-tools-export-${Date.now()}.json`)

  return exportData
})()
