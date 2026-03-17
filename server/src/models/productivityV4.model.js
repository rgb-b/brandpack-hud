/**
 * Productivity V4 Model
 * Task-focused time tracking with analytics
 */

import { promisifyDb } from '../config/database.js'

// ============================================================================
// Task Library Management
// ============================================================================

/**
 * Get all active tasks for a user
 */
export async function getTasks(db, userId) {
  const { all } = promisifyDb(db)
  return all(
    `SELECT id, user_id, name, category, color, created_at
     FROM productivity_tasks_v4
     WHERE user_id = ? AND is_active = 1
     ORDER BY name ASC`,
    [userId]
  )
}

/**
 * Get a single task by ID
 */
export async function getTaskById(db, taskId, userId) {
  const { get } = promisifyDb(db)
  return get(
    `SELECT id, user_id, name, category, color, created_at
     FROM productivity_tasks_v4
     WHERE id = ? AND user_id = ? AND is_active = 1`,
    [taskId, userId]
  )
}

/**
 * Create a new task (reactivates soft-deleted task with same name if found)
 */
export async function createTask(db, userId, { name, category = null, color = null }) {
  const { run, get } = promisifyDb(db)

  // Check for a soft-deleted task with the same name — reactivate instead of INSERT
  const existing = await get(
    'SELECT * FROM productivity_tasks_v4 WHERE user_id = ? AND name = ? AND is_active = 0',
    [userId, name]
  )

  if (existing) {
    await run(
      'UPDATE productivity_tasks_v4 SET is_active = 1, category = ?, color = ? WHERE id = ?',
      [category !== null ? category : existing.category, color !== null ? color : existing.color, existing.id]
    )
    return get('SELECT * FROM productivity_tasks_v4 WHERE id = ?', [existing.id])
  }

  const result = await run(
    `INSERT INTO productivity_tasks_v4 (user_id, name, category, color)
     VALUES (?, ?, ?, ?)`,
    [userId, name, category, color]
  )

  return {
    id: result.lastID,
    user_id: userId,
    name,
    category,
    color,
    is_active: 1,
    created_at: new Date().toISOString()
  }
}

/**
 * Update an existing task
 */
export async function updateTask(db, taskId, userId, updates) {
  const { run, get } = promisifyDb(db)

  // Verify task exists and belongs to user
  const existing = await get(
    'SELECT id FROM productivity_tasks_v4 WHERE id = ? AND user_id = ? AND is_active = 1',
    [taskId, userId]
  )

  if (!existing) {
    return null
  }

  const fields = []
  const values = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  if (updates.category !== undefined) {
    fields.push('category = ?')
    values.push(updates.category)
  }
  if (updates.color !== undefined) {
    fields.push('color = ?')
    values.push(updates.color)
  }

  if (fields.length === 0) {
    return existing
  }

  values.push(taskId, userId)

  await run(
    `UPDATE productivity_tasks_v4 SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  )

  return get('SELECT * FROM productivity_tasks_v4 WHERE id = ? AND user_id = ?', [taskId, userId])
}

/**
 * Soft delete a task (set is_active = 0)
 */
export async function deleteTask(db, taskId, userId) {
  const { run } = promisifyDb(db)

  const result = await run(
    'UPDATE productivity_tasks_v4 SET is_active = 0 WHERE id = ? AND user_id = ?',
    [taskId, userId]
  )

  return result.changes > 0
}

// ============================================================================
// Time Tracking
// ============================================================================

/**
 * Start tracking a task
 * Creates tracking entry and updates active session
 */
export async function startTracking(db, userId, taskId, taskName, startTime = Date.now()) {
  const { run, get } = promisifyDb(db)

  // Verify task exists
  const task = await get(
    'SELECT id, name FROM productivity_tasks_v4 WHERE id = ? AND user_id = ? AND is_active = 1',
    [taskId, userId]
  )

  if (!task) {
    throw new Error('Task not found')
  }

  // Check if already tracking something
  const existing = await getActiveTracking(db, userId)
  if (existing) {
    throw new Error('Already tracking a task. Stop current task first.')
  }

  // Get date for tracking entry
  const date = new Date(startTime).toISOString().split('T')[0] // YYYY-MM-DD

  // Create tracking entry
  const trackingResult = await run(
    `INSERT INTO productivity_tracking_v4 (user_id, task_id, task_name, start_time, date)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, taskId, taskName, startTime, date]
  )

  // Create active session for real-time sync
  await run(
    `INSERT OR REPLACE INTO productivity_active_sessions_v4 (user_id, task_id, task_name, start_time, last_heartbeat)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, taskId, taskName, startTime, Date.now()]
  )

  return {
    id: trackingResult.lastID,
    user_id: userId,
    task_id: taskId,
    task_name: taskName,
    start_time: startTime,
    date
  }
}

/**
 * Stop tracking (completes current session)
 */
export async function stopTracking(db, userId, endTime = Date.now()) {
  const { run, get } = promisifyDb(db)

  // Get active tracking entry
  const active = await get(
    `SELECT id, task_id, task_name, start_time, date
     FROM productivity_tracking_v4
     WHERE user_id = ? AND end_time IS NULL
     ORDER BY start_time DESC LIMIT 1`,
    [userId]
  )

  // Always clear active session — prevents phantom sessions from getting stuck
  const cleared = await run('DELETE FROM productivity_active_sessions_v4 WHERE user_id = ?', [userId])

  if (!active) {
    // Phantom session (active session row existed but no open tracking entry)
    return cleared.changes > 0 ? { phantom: true } : null
  }

  const duration = endTime - active.start_time

  // Update tracking entry with end time and duration
  await run(
    'UPDATE productivity_tracking_v4 SET end_time = ?, duration = ? WHERE id = ?',
    [endTime, duration, active.id]
  )

  return {
    id: active.id,
    user_id: userId,
    task_id: active.task_id,
    task_name: active.task_name,
    start_time: active.start_time,
    end_time: endTime,
    duration,
    date: active.date
  }
}

/**
 * Get active tracking session for a user
 */
export async function getActiveTracking(db, userId) {
  const { get } = promisifyDb(db)

  return get(
    `SELECT user_id, task_id, task_name, start_time, last_heartbeat
     FROM productivity_active_sessions_v4
     WHERE user_id = ?`,
    [userId]
  )
}

/**
 * Update heartbeat for active session (for polling health check)
 */
export async function updateHeartbeat(db, userId) {
  const { run } = promisifyDb(db)

  const result = await run(
    'UPDATE productivity_active_sessions_v4 SET last_heartbeat = ? WHERE user_id = ?',
    [Date.now(), userId]
  )

  return result.changes > 0
}

// ============================================================================
// History
// ============================================================================

/**
 * Get tracking history with optional filters
 */
export async function getHistory(db, userId, filters = {}) {
  const { all } = promisifyDb(db)

  const conditions = ['user_id = ?', 'end_time IS NOT NULL']
  const params = [userId]

  if (filters.startDate) {
    conditions.push('date >= ?')
    params.push(filters.startDate)
  }

  if (filters.endDate) {
    conditions.push('date <= ?')
    params.push(filters.endDate)
  }

  if (filters.taskId) {
    conditions.push('task_id = ?')
    params.push(filters.taskId)
  }

  const limit = filters.limit || 100

  return all(
    `SELECT id, task_id, task_name, start_time, end_time, duration, date, created_at
     FROM productivity_tracking_v4
     WHERE ${conditions.join(' AND ')}
     ORDER BY start_time DESC
     LIMIT ?`,
    [...params, limit]
  )
}

/**
 * Get recent tracking sessions (last N completed)
 */
export async function getRecentSessions(db, userId, limit = 10) {
  const { all } = promisifyDb(db)

  return all(
    `SELECT id, task_id, task_name, start_time, end_time, duration, date
     FROM productivity_tracking_v4
     WHERE user_id = ? AND end_time IS NOT NULL
     ORDER BY end_time DESC
     LIMIT ?`,
    [userId, limit]
  )
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Get time spent per task (total, average, count)
 */
export async function getTaskAnalytics(db, userId, { startDate = null, endDate = null } = {}) {
  const { all } = promisifyDb(db)

  const conditions = ['user_id = ?', 'end_time IS NOT NULL']
  const params = [userId]

  if (startDate) {
    conditions.push('date >= ?')
    params.push(startDate)
  }

  if (endDate) {
    conditions.push('date <= ?')
    params.push(endDate)
  }

  return all(
    `SELECT
       task_id,
       task_name,
       COUNT(*) as session_count,
       SUM(duration) as total_duration,
       AVG(duration) as avg_duration,
       MIN(duration) as min_duration,
       MAX(duration) as max_duration
     FROM productivity_tracking_v4
     WHERE ${conditions.join(' AND ')}
     GROUP BY task_id, task_name
     ORDER BY total_duration DESC`,
    params
  )
}

/**
 * Get daily totals (total time per day)
 */
export async function getDailyAnalytics(db, userId, { startDate = null, endDate = null } = {}) {
  const { all } = promisifyDb(db)

  const conditions = ['user_id = ?', 'end_time IS NOT NULL']
  const params = [userId]

  if (startDate) {
    conditions.push('date >= ?')
    params.push(startDate)
  }

  if (endDate) {
    conditions.push('date <= ?')
    params.push(endDate)
  }

  return all(
    `SELECT
       date,
       COUNT(*) as session_count,
       SUM(duration) as total_duration,
       COUNT(DISTINCT task_id) as unique_tasks
     FROM productivity_tracking_v4
     WHERE ${conditions.join(' AND ')}
     GROUP BY date
     ORDER BY date DESC`,
    params
  )
}

/**
 * Get task frequency (session count, unique days)
 */
export async function getFrequencyAnalytics(db, userId, { startDate = null, endDate = null } = {}) {
  const { all } = promisifyDb(db)

  const conditions = ['user_id = ?', 'end_time IS NOT NULL']
  const params = [userId]

  if (startDate) {
    conditions.push('date >= ?')
    params.push(startDate)
  }

  if (endDate) {
    conditions.push('date <= ?')
    params.push(endDate)
  }

  return all(
    `SELECT
       task_id,
       task_name,
       COUNT(*) as total_sessions,
       COUNT(DISTINCT date) as unique_days,
       MIN(date) as first_tracked,
       MAX(date) as last_tracked
     FROM productivity_tracking_v4
     WHERE ${conditions.join(' AND ')}
     GROUP BY task_id, task_name
     ORDER BY total_sessions DESC`,
    params
  )
}

/**
 * Get duration distribution per task (for box plot / distribution visualization)
 */
export async function getDurationAnalytics(db, userId, { startDate = null, endDate = null } = {}) {
  const { all } = promisifyDb(db)

  const conditions = ['user_id = ?', 'end_time IS NOT NULL']
  const params = [userId]

  if (startDate) {
    conditions.push('date >= ?')
    params.push(startDate)
  }

  if (endDate) {
    conditions.push('date <= ?')
    params.push(endDate)
  }

  // Get all durations grouped by task
  const sessions = await all(
    `SELECT task_id, task_name, duration
     FROM productivity_tracking_v4
     WHERE ${conditions.join(' AND ')}
     ORDER BY task_id, duration`,
    params
  )

  // Group durations by task
  const taskMap = new Map()

  for (const session of sessions) {
    if (!taskMap.has(session.task_id)) {
      taskMap.set(session.task_id, {
        task_id: session.task_id,
        task_name: session.task_name,
        durations: []
      })
    }
    taskMap.get(session.task_id).durations.push(session.duration)
  }

  return Array.from(taskMap.values())
}

/**
 * Get timeclock hours worked per day for analytics
 */
export async function getTimeclockAnalytics(db, userId, { startDate = null, endDate = null } = {}) {
  const { all } = promisifyDb(db)

  const conditions = ['user_id = ?', 'clock_out IS NOT NULL']
  const params = [userId]

  if (startDate) {
    conditions.push('date >= ?')
    params.push(startDate)
  }
  if (endDate) {
    conditions.push('date <= ?')
    params.push(endDate)
  }

  const rows = await all(
    `SELECT date,
            SUM((clock_out - clock_in) / 3600000.0) as hours_worked
     FROM timeclock_entries
     WHERE ${conditions.join(' AND ')}
     GROUP BY date ORDER BY date`,
    params
  )

  const totalHours = rows.reduce((sum, r) => sum + (r.hours_worked || 0), 0)
  const avgHours = rows.length > 0 ? totalHours / rows.length : 0

  return {
    days: rows,
    totalHours: Math.round(totalHours * 100) / 100,
    avgHours: Math.round(avgHours * 100) / 100,
    daysClocked: rows.length
  }
}

/**
 * Get summary stats for dashboard (today's time + session count)
 */
export async function getTodayStats(db, userId) {
  const { get } = promisifyDb(db)

  const today = new Date().toISOString().split('T')[0]

  const stats = await get(
    `SELECT
       COUNT(*) as session_count,
       COALESCE(SUM(duration), 0) as total_duration
     FROM productivity_tracking_v4
     WHERE user_id = ? AND date = ? AND end_time IS NOT NULL`,
    [userId, today]
  )

  return {
    today_time: stats?.total_duration || 0,
    session_count: stats?.session_count || 0
  }
}
