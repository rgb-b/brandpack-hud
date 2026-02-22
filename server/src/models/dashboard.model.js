/**
 * Dashboard Model
 * Database operations for dashboard todos and activity feed
 */

import { promisifyDb } from '../config/database.js'
import { getCurrentDateTime } from '../utils/dateHelpers.js'

// ===== TODOS =====

/**
 * Get all todos with optional filtering
 * @param {sqlite3.Database} db - Database instance
 * @param {Object} filters - Optional filters
 * @param {string} filters.filter - Filter type: 'all', 'active', 'completed', 'overdue', 'today', 'upcoming'
 * @param {string} filters.priority - Filter by priority
 * @param {number} filters.assigned_to - Filter by assigned user
 * @returns {Promise<Array>} Array of todos
 */
export async function getAllTodos(db, filters = {}) {
  const dbPromise = promisifyDb(db)

  let query = 'SELECT * FROM dashboard_todos WHERE 1=1'
  const params = []

  // Apply filter type
  if (filters.filter === 'active') {
    query += ' AND completed = 0'
  } else if (filters.filter === 'completed') {
    query += ' AND completed = 1'
  } else if (filters.filter === 'overdue') {
    query += ' AND completed = 0 AND due_date IS NOT NULL AND due_date < DATE("now")'
  } else if (filters.filter === 'today') {
    query += ' AND completed = 0 AND due_date = DATE("now")'
  } else if (filters.filter === 'upcoming') {
    query += ' AND completed = 0 AND due_date > DATE("now") AND due_date <= DATE("now", "+7 days")'
  }

  // Apply priority filter
  if (filters.priority) {
    query += ' AND priority = ?'
    params.push(filters.priority)
  }

  // Apply assigned_to filter
  if (filters.assigned_to) {
    query += ' AND assigned_to = ?'
    params.push(filters.assigned_to)
  }

  // Order by priority and due date
  query += ' ORDER BY CASE WHEN completed = 1 THEN 1 ELSE 0 END, '
  query += 'CASE priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 WHEN "low" THEN 4 ELSE 5 END, '
  query += 'due_date ASC NULLS LAST, created_at DESC'

  const todos = await dbPromise.all(query, params)

  // Parse tags JSON
  return todos.map(todo => ({
    ...todo,
    tags: todo.tags ? JSON.parse(todo.tags) : []
  }))
}

/**
 * Get todo by ID
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Todo ID
 * @returns {Promise<Object|null>} Todo object or null
 */
export async function getTodoById(db, id) {
  const dbPromise = promisifyDb(db)

  const todo = await dbPromise.get(
    'SELECT * FROM dashboard_todos WHERE id = ?',
    [id]
  )

  return todo || null
}

/**
 * Create a new todo
 * @param {sqlite3.Database} db - Database instance
 * @param {Object} todoData - Todo data
 * @param {string} todoData.text - Todo text
 * @param {string} todoData.due_date - Due date (YYYY-MM-DD) (optional)
 * @param {string} todoData.priority - Priority level (low, medium, high, urgent) (optional)
 * @param {number} todoData.assigned_to - User ID (optional)
 * @param {Array} todoData.tags - Tags array (optional)
 * @returns {Promise<Object>} Created todo with ID
 */
export async function createTodo(db, todoData) {
  const dbPromise = promisifyDb(db)

  const now = getCurrentDateTime()
  const text = typeof todoData === 'string' ? todoData : todoData.text
  const due_date = todoData.due_date || null
  const priority = todoData.priority || 'medium'
  const assigned_to = todoData.assigned_to || null
  const tags = todoData.tags ? JSON.stringify(todoData.tags) : null

  const result = await dbPromise.run(
    'INSERT INTO dashboard_todos (text, completed, created_at, due_date, priority, assigned_to, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [text, 0, now, due_date, priority, assigned_to, tags]
  )

  return {
    id: result.lastID,
    text,
    completed: false,
    created_at: now,
    completed_at: null,
    due_date,
    priority,
    assigned_to,
    tags: todoData.tags || []
  }
}

/**
 * Update a todo
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Todo ID
 * @param {Object} updates - Fields to update { text?, completed?, due_date?, priority?, assigned_to?, tags? }
 * @returns {Promise<Object|null>} Updated todo or null if not found
 */
export async function updateTodo(db, id, updates) {
  const dbPromise = promisifyDb(db)

  // Check if todo exists
  const existing = await getTodoById(db, id)
  if (!existing) {
    return null
  }

  const now = getCurrentDateTime()
  const fields = []
  const values = []

  if (updates.text !== undefined) {
    fields.push('text = ?')
    values.push(updates.text)
  }

  if (updates.completed !== undefined) {
    fields.push('completed = ?')
    values.push(updates.completed ? 1 : 0)

    // Update completed_at when completing or uncompleting
    fields.push('completed_at = ?')
    values.push(updates.completed ? now : null)
  }

  if (updates.due_date !== undefined) {
    fields.push('due_date = ?')
    values.push(updates.due_date)
  }

  if (updates.priority !== undefined) {
    fields.push('priority = ?')
    values.push(updates.priority)
  }

  if (updates.assigned_to !== undefined) {
    fields.push('assigned_to = ?')
    values.push(updates.assigned_to)
  }

  if (updates.tags !== undefined) {
    fields.push('tags = ?')
    values.push(Array.isArray(updates.tags) ? JSON.stringify(updates.tags) : updates.tags)
  }

  if (fields.length === 0) {
    // No fields to update, return existing
    return existing
  }

  // Add ID to params
  values.push(id)

  await dbPromise.run(
    `UPDATE dashboard_todos SET ${fields.join(', ')} WHERE id = ?`,
    values
  )

  // Return updated todo
  return await getTodoById(db, id)
}

/**
 * Delete a todo
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Todo ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteTodo(db, id) {
  const dbPromise = promisifyDb(db)

  // Check if exists
  const existing = await getTodoById(db, id)
  if (!existing) {
    return false
  }

  await dbPromise.run(
    'DELETE FROM dashboard_todos WHERE id = ?',
    [id]
  )

  return true
}

// ===== ACTIVITY FEED =====

/**
 * Get recent activity entries
 * @param {sqlite3.Database} db - Database instance
 * @param {number} limit - Maximum number of entries to return (default 100)
 * @returns {Promise<Array>} Array of activity entries
 */
export async function getRecentActivity(db, limit = 100) {
  const dbPromise = promisifyDb(db)

  const activities = await dbPromise.all(
    'SELECT * FROM dashboard_activity ORDER BY timestamp DESC LIMIT ?',
    [limit]
  )

  return activities
}

/**
 * Create an activity entry
 * @param {sqlite3.Database} db - Database instance
 * @param {string} type - Activity type (e.g., 'inventory', 'productivity')
 * @param {string} description - Activity description
 * @returns {Promise<Object>} Created activity with ID
 */
export async function createActivityEntry(db, type, description) {
  const dbPromise = promisifyDb(db)

  const now = getCurrentDateTime()

  const result = await dbPromise.run(
    'INSERT INTO dashboard_activity (type, description, timestamp) VALUES (?, ?, ?)',
    [type, description, now]
  )

  return {
    id: result.lastID,
    type,
    description,
    timestamp: now
  }
}

/**
 * Delete old activity entries
 * @param {sqlite3.Database} db - Database instance
 * @param {number} daysToKeep - Keep entries from last N days (default 30)
 * @returns {Promise<number>} Number of entries deleted
 */
export async function deleteOldActivity(db, daysToKeep = 30) {
  const dbPromise = promisifyDb(db)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const result = await dbPromise.run(
    'DELETE FROM dashboard_activity WHERE timestamp < ?',
    [cutoffDate.toISOString()]
  )

  return result.changes
}

// ===== CALENDAR =====

/**
 * Get calendar data aggregating service visits, issues, productivity, and todos
 * @param {sqlite3.Database} db - Database instance
 * @param {Object} options - Calendar options
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD) (optional, defaults to 7 days from start)
 * @param {number} options.userId - User ID for productivity data (optional)
 * @returns {Promise<Object>} Calendar data with days array and summary
 */
export async function getCalendarData(db, options) {
  const { all } = promisifyDb(db)

  const startDate = options.startDate
  let endDate = options.endDate

  // Default to 7 days if no end date provided
  if (!endDate) {
    const end = new Date(startDate)
    end.setDate(end.getDate() + 6)
    endDate = end.toISOString().split('T')[0]
  }

  // Fetch service visits
  const visits = await all(
    'SELECT * FROM service_visits WHERE date >= ? AND date <= ? ORDER BY date, time',
    [startDate, endDate]
  )

  // Fetch maintenance issues
  const issues = await all(
    `SELECT * FROM maintenance_issues
     WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
     ORDER BY created_at`,
    [startDate, endDate]
  )

  // Fetch productivity data for user
  let productivity = []
  if (options.userId) {
    productivity = await all(
      `SELECT date, available, working, unavailable
       FROM productivity_daily_totals
       WHERE user_id = ? AND date >= ? AND date <= ?
       ORDER BY date`,
      [options.userId, startDate, endDate]
    )
  }

  // Fetch todos due within the date range (using created_at as proxy for "due date")
  const todos = await all(
    `SELECT * FROM dashboard_todos
     WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
     ORDER BY created_at`,
    [startDate, endDate]
  )

  // Build day-by-day structure
  const days = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]

    // Filter events for this day
    const dayVisits = visits.filter(v => v.date === dateStr)
    const dayIssues = issues.filter(i => i.created_at.startsWith(dateStr))
    const dayProductivity = productivity.find(p => p.date === dateStr)
    const dayTodos = todos.filter(t => t.created_at.startsWith(dateStr))

    days.push({
      date: dateStr,
      events: {
        serviceVisits: dayVisits.map(v => ({
          id: v.id,
          time: v.time,
          technician: v.technician,
          machine: v.machine,
          visitType: v.visit_type,
          description: v.description
        })),
        issues: dayIssues.map(i => ({
          id: i.id,
          machine: i.machine,
          issueType: i.issue_type,
          severity: i.severity,
          status: i.status,
          description: i.description
        })),
        productivity: dayProductivity ? {
          available: dayProductivity.available,
          working: dayProductivity.working,
          unavailable: dayProductivity.unavailable,
          totalTime: dayProductivity.available + dayProductivity.working + dayProductivity.unavailable
        } : null,
        todos: dayTodos.map(t => ({
          id: t.id,
          text: t.text,
          completed: Boolean(t.completed)
        }))
      }
    })
  }

  // Calculate summary statistics
  const summary = {
    totalVisits: visits.length,
    totalIssues: issues.length,
    criticalIssues: issues.filter(i => i.severity === 'critical').length,
    openIssues: issues.filter(i => i.status === 'open').length,
    completedTodos: todos.filter(t => t.completed).length,
    totalTodos: todos.length
  }

  return {
    days,
    summary
  }
}

// ===== AGGREGATED STATS =====

/**
 * Get all dashboard stats in a single query
 * Replaces 4 separate API calls with 1 aggregated call
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID for productivity stats
 * @returns {Promise<Object>} Aggregated stats object
 */
export async function getAggregatedStats(db, userId) {
  const { get, all } = promisifyDb(db)

  // Run all queries in parallel
  const [
    inventoryStats,
    productivityStats,
    maintenanceStats,
    pantoneStats
  ] = await Promise.all([
    // Inventory stats (uses per-item low_stock_threshold, defaults to 2)
    get(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN stock <= COALESCE(low_stock_threshold, 2) THEN 1 ELSE 0 END) as lowStock,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as critical
      FROM inventory_items
    `),

    // Productivity stats (today's time for current user)
    (async () => {
      const today = new Date().toISOString().split('T')[0]
      const totals = await get(`
        SELECT
          COUNT(*) as session_count,
          COALESCE(SUM(duration), 0) as total_duration
        FROM productivity_tracking_v4
        WHERE user_id = ? AND date = ? AND end_time IS NOT NULL
      `, [userId, today])

      if (!totals || totals.session_count === 0) {
        return { todayTime: 0, sessionCount: 0 }
      }

      return {
        todayTime: totals.total_duration || 0,
        sessionCount: totals.session_count || 0
      }
    })(),

    // Maintenance stats
    get(`
      SELECT
        COUNT(*) as totalIssues,
        SUM(CASE WHEN status IN ('open', 'in_progress') THEN 1 ELSE 0 END) as activeIssues,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as criticalIssues,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as openIssues
      FROM maintenance_issues
    `),

    // Pantone stats
    get(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) as matched,
        SUM(CASE WHEN status = 'not_matched' THEN 1 ELSE 0 END) as unmatched,
        SUM(CASE WHEN status = 'old' THEN 1 ELSE 0 END) as old
      FROM pantone_colors
    `)
  ])

  return {
    inventory: {
      total: inventoryStats.total || 0,
      lowStock: inventoryStats.lowStock || 0,
      critical: inventoryStats.critical || 0
    },
    productivity: {
      todayTime: productivityStats.todayTime,
      sessionCount: productivityStats.sessionCount
    },
    maintenance: {
      totalIssues: maintenanceStats.totalIssues || 0,
      activeIssues: maintenanceStats.activeIssues || 0,
      criticalIssues: maintenanceStats.criticalIssues || 0,
      openIssues: maintenanceStats.openIssues || 0
    },
    pantone: {
      total: pantoneStats.total || 0,
      matched: pantoneStats.matched || 0,
      unmatched: pantoneStats.unmatched || 0,
      old: pantoneStats.old || 0
    }
  }
}
