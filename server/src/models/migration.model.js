/**
 * Migration Model
 * Database operations for importing/exporting data between localStorage and SQLite
 */

import { promisifyDb } from '../config/database.js'
import { getCurrentDateTime } from '../utils/dateHelpers.js'

// Storage keys mapping (from localStorage to SQLite)
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

/**
 * Export all data from database to localStorage-compatible format
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<Object>} Exported data in localStorage format
 */
export async function exportAllData(db) {
  const dbPromise = promisifyDb(db)

  const exported = {
    exportedAt: getCurrentDateTime(),
    version: '3.0.0',
    data: {}
  }

  // Inventory items
  const inventoryItems = await dbPromise.all('SELECT * FROM inventory_items')
  exported.data[STORAGE_KEYS.INVENTORY] = inventoryItems

  // Usage history
  const usageHistory = await dbPromise.all('SELECT * FROM inventory_usage_history')
  exported.data[STORAGE_KEYS.USAGE_HISTORY] = usageHistory

  // Productivity tasks
  const tasks = await dbPromise.all('SELECT * FROM productivity_tasks')
  exported.data[STORAGE_KEYS.TASKS] = tasks

  // Productivity history
  const history = await dbPromise.all('SELECT * FROM productivity_history')
  exported.data[STORAGE_KEYS.HISTORY] = history

  // Daily totals
  const dailyTotals = await dbPromise.all('SELECT * FROM productivity_daily_totals')
  exported.data[STORAGE_KEYS.DAILY_TOTALS] = dailyTotals

  // Task totals
  const taskTotals = await dbPromise.all('SELECT * FROM productivity_task_totals')
  exported.data[STORAGE_KEYS.TASK_TOTALS] = taskTotals

  // Pantone colors
  const pantoneColors = await dbPromise.all('SELECT * FROM pantone_colors')
  // Parse color_data JSON for export
  exported.data[STORAGE_KEYS.PANTONE_COLORS] = pantoneColors.map(color => ({
    ...color,
    color_data: JSON.parse(color.color_data)
  }))

  // Maintenance checklist and issues
  const checklist = await dbPromise.all('SELECT * FROM maintenance_checklist')
  const issues = await dbPromise.all('SELECT * FROM maintenance_issues')
  // Parse JSON fields
  exported.data[STORAGE_KEYS.MAINTENANCE] = {
    checklist,
    issues: issues.map(issue => ({
      ...issue,
      colors: issue.colors ? JSON.parse(issue.colors) : null,
      photos: issue.photos ? JSON.parse(issue.photos) : null
    }))
  }

  // Dashboard todos
  const todos = await dbPromise.all('SELECT * FROM dashboard_todos')
  exported.data[STORAGE_KEYS.DASHBOARD_TODOS] = todos

  // Dashboard activity
  const activity = await dbPromise.all('SELECT * FROM dashboard_activity')
  exported.data[STORAGE_KEYS.DASHBOARD_ACTIVITY] = activity

  return exported
}

/**
 * Validate import data structure
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result { valid: boolean, errors?: string[] }
 */
export function validateImportData(data) {
  const errors = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data must be an object'] }
  }

  // Check if it has the expected structure
  if (!data.data && !data[STORAGE_KEYS.INVENTORY]) {
    errors.push('Data does not appear to be in the correct format')
  }

  // If wrapped in "data" property, use that
  const actualData = data.data || data

  // Validate each storage key
  const requiredKeys = Object.values(STORAGE_KEYS)
  const foundKeys = requiredKeys.filter(key => actualData[key] !== undefined)

  if (foundKeys.length === 0) {
    errors.push('No recognizable data found in import')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true }
}

/**
 * Import data from localStorage format to SQLite
 * @param {sqlite3.Database} db - Database instance
 * @param {Object} data - Data in localStorage format
 * @param {number} userId - User ID to associate with imported data (defaults to 1)
 * @returns {Promise<Object>} Import statistics
 */
export async function importAllData(db, data, userId = 1) {
  const dbPromise = promisifyDb(db)
  const now = getCurrentDateTime()

  // Validate data
  const validation = validateImportData(data)
  if (!validation.valid) {
    throw new Error(`Invalid data: ${validation.errors.join(', ')}`)
  }

  // Use data.data if wrapped, otherwise use data directly
  const actualData = data.data || data

  const stats = {
    inventory: 0,
    usageHistory: 0,
    tasks: 0,
    history: 0,
    dailyTotals: 0,
    taskTotals: 0,
    pantoneColors: 0,
    maintenanceChecklist: 0,
    maintenanceIssues: 0,
    todos: 0,
    activity: 0
  }

  // Import inventory items
  if (actualData[STORAGE_KEYS.INVENTORY]) {
    const items = Array.isArray(actualData[STORAGE_KEYS.INVENTORY])
      ? actualData[STORAGE_KEYS.INVENTORY]
      : Object.values(actualData[STORAGE_KEYS.INVENTORY]).flat()

    for (const item of items) {
      try {
        await dbPromise.run(
          `INSERT INTO inventory_items (item_id, name, printer, category, stock, unit, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.item_id || item.id, item.name, item.printer, item.category, item.stock || 0, item.unit || 'unit', now, now]
        )
        stats.inventory++
      } catch (err) {
        console.error('Error importing inventory item:', err.message)
      }
    }
  }

  // Import usage history
  if (actualData[STORAGE_KEYS.USAGE_HISTORY] && Array.isArray(actualData[STORAGE_KEYS.USAGE_HISTORY])) {
    for (const entry of actualData[STORAGE_KEYS.USAGE_HISTORY]) {
      try {
        await dbPromise.run(
          `INSERT INTO inventory_usage_history (item_id, printer, category, item_name, quantity, unit, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [entry.item_id || entry.itemId, entry.printer, entry.category, entry.item_name || entry.itemName, entry.quantity, entry.unit || 'unit', entry.timestamp || now]
        )
        stats.usageHistory++
      } catch (err) {
        console.error('Error importing usage history:', err.message)
      }
    }
  }

  // Import productivity tasks
  if (actualData[STORAGE_KEYS.TASKS]) {
    const tasks = actualData[STORAGE_KEYS.TASKS]
    for (const [status, taskList] of Object.entries(tasks)) {
      if (Array.isArray(taskList)) {
        for (const taskName of taskList) {
          try {
            await dbPromise.run(
              'INSERT INTO productivity_tasks (user_id, status, name, created_at) VALUES (?, ?, ?, ?)',
              [userId, status, taskName, now]
            )
            stats.tasks++
          } catch (err) {
            console.error('Error importing task:', err.message)
          }
        }
      }
    }
  }

  // Import productivity history
  if (actualData[STORAGE_KEYS.HISTORY] && Array.isArray(actualData[STORAGE_KEYS.HISTORY])) {
    for (const entry of actualData[STORAGE_KEYS.HISTORY]) {
      try {
        await dbPromise.run(
          `INSERT INTO productivity_history (user_id, status, task, start_time, duration, date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, entry.status, entry.task, entry.startTime || entry.start_time, entry.duration, entry.date, now]
        )
        stats.history++
      } catch (err) {
        console.error('Error importing history entry:', err.message)
      }
    }
  }

  // Import daily totals
  if (actualData[STORAGE_KEYS.DAILY_TOTALS]) {
    const dailyTotals = actualData[STORAGE_KEYS.DAILY_TOTALS]
    for (const [date, totals] of Object.entries(dailyTotals)) {
      try {
        await dbPromise.run(
          `INSERT INTO productivity_daily_totals (user_id, date, available, working, unavailable)
          VALUES (?, ?, ?, ?, ?)`,
          [userId, date, totals.available || 0, totals.working || 0, totals.unavailable || 0]
        )
        stats.dailyTotals++
      } catch (err) {
        console.error('Error importing daily totals:', err.message)
      }
    }
  }

  // Import task totals
  if (actualData[STORAGE_KEYS.TASK_TOTALS]) {
    const taskTotals = actualData[STORAGE_KEYS.TASK_TOTALS]
    for (const [taskKey, totalTime] of Object.entries(taskTotals)) {
      try {
        await dbPromise.run(
          'INSERT INTO productivity_task_totals (user_id, task_key, total_time) VALUES (?, ?, ?)',
          [userId, taskKey, totalTime]
        )
        stats.taskTotals++
      } catch (err) {
        console.error('Error importing task total:', err.message)
      }
    }
  }

  // Import Pantone colors
  if (actualData[STORAGE_KEYS.PANTONE_COLORS] && Array.isArray(actualData[STORAGE_KEYS.PANTONE_COLORS])) {
    for (const color of actualData[STORAGE_KEYS.PANTONE_COLORS]) {
      try {
        await dbPromise.run(
          `INSERT INTO pantone_colors (color_data, name, status, match_date, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            JSON.stringify(color.color_data || color),
            color.name,
            color.status || 'not_matched',
            color.match_date || color.matchDate || null,
            now,
            now
          ]
        )
        stats.pantoneColors++
      } catch (err) {
        console.error('Error importing Pantone color:', err.message)
      }
    }
  }

  // Import maintenance data
  if (actualData[STORAGE_KEYS.MAINTENANCE]) {
    const maintenance = actualData[STORAGE_KEYS.MAINTENANCE]

    // Checklist
    if (maintenance.checklist && Array.isArray(maintenance.checklist)) {
      for (const item of maintenance.checklist) {
        try {
          await dbPromise.run(
            `INSERT INTO maintenance_checklist (date, item_id, item_text, completed, completed_at)
            VALUES (?, ?, ?, ?, ?)`,
            [item.date, item.item_id, item.item_text, item.completed ? 1 : 0, item.completed_at || null]
          )
          stats.maintenanceChecklist++
        } catch (err) {
          console.error('Error importing checklist item:', err.message)
        }
      }
    }

    // Issues
    if (maintenance.issues && Array.isArray(maintenance.issues)) {
      for (const issue of maintenance.issues) {
        try {
          await dbPromise.run(
            `INSERT INTO maintenance_issues (machine, issue_type, issue_subtype, colors, description, photos, status, severity, time_spent, created_at, resolved_at, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              issue.machine,
              issue.issue_type,
              issue.issue_subtype || '',
              issue.colors ? JSON.stringify(issue.colors) : null,
              issue.description,
              issue.photos ? JSON.stringify(issue.photos) : null,
              issue.status || 'open',
              issue.severity || 'medium',
              issue.time_spent || 0,
              issue.created_at || now,
              issue.resolved_at || null,
              issue.notes || null
            ]
          )
          stats.maintenanceIssues++
        } catch (err) {
          console.error('Error importing maintenance issue:', err.message)
        }
      }
    }
  }

  // Import dashboard todos
  if (actualData[STORAGE_KEYS.DASHBOARD_TODOS] && Array.isArray(actualData[STORAGE_KEYS.DASHBOARD_TODOS])) {
    for (const todo of actualData[STORAGE_KEYS.DASHBOARD_TODOS]) {
      try {
        await dbPromise.run(
          `INSERT INTO dashboard_todos (text, completed, created_at, completed_at)
          VALUES (?, ?, ?, ?)`,
          [todo.text, todo.completed ? 1 : 0, todo.created_at || now, todo.completed_at || null]
        )
        stats.todos++
      } catch (err) {
        console.error('Error importing todo:', err.message)
      }
    }
  }

  // Import dashboard activity
  if (actualData[STORAGE_KEYS.DASHBOARD_ACTIVITY] && Array.isArray(actualData[STORAGE_KEYS.DASHBOARD_ACTIVITY])) {
    for (const activity of actualData[STORAGE_KEYS.DASHBOARD_ACTIVITY]) {
      try {
        await dbPromise.run(
          'INSERT INTO dashboard_activity (type, description, timestamp) VALUES (?, ?, ?)',
          [activity.type, activity.description, activity.timestamp || now]
        )
        stats.activity++
      } catch (err) {
        console.error('Error importing activity:', err.message)
      }
    }
  }

  return stats
}

/**
 * Clear all data from database
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<Object>} Clear statistics
 */
export async function clearAllData(db) {
  const dbPromise = promisifyDb(db)

  const stats = {}

  // Clear all tables
  const tables = [
    'inventory_items',
    'inventory_usage_history',
    'productivity_tasks',
    'productivity_history',
    'productivity_daily_totals',
    'productivity_task_totals',
    'pantone_colors',
    'maintenance_checklist',
    'maintenance_issues',
    'dashboard_todos',
    'dashboard_activity'
  ]

  for (const table of tables) {
    const result = await dbPromise.run(`DELETE FROM ${table}`)
    stats[table] = result.changes
  }

  return stats
}
