/**
 * Productivity Model
 * Database operations for productivity tracking with time aggregations
 * All operations are scoped to a specific user
 */

import { promisifyDb } from '../config/database.js'
import { getCurrentDateTime } from '../utils/dateHelpers.js'

// ===== TASKS =====

/**
 * Get all tasks for a user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of tasks
 */
export async function getAllTasks(db, userId) {
  const dbPromise = promisifyDb(db)

  const tasks = await dbPromise.all(
    'SELECT * FROM productivity_tasks WHERE user_id = ? ORDER BY status, name',
    [userId]
  )

  return tasks
}

/**
 * Get tasks by status for a user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} status - Status value ('working' or 'unavailable')
 * @returns {Promise<Array>} Array of tasks
 */
export async function getTasksByStatus(db, userId, status) {
  const dbPromise = promisifyDb(db)

  const tasks = await dbPromise.all(
    'SELECT * FROM productivity_tasks WHERE user_id = ? AND status = ? ORDER BY name',
    [userId, status]
  )

  return tasks
}

/**
 * Create a new task for a user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} status - Status ('working' or 'unavailable')
 * @param {string} name - Task name
 * @returns {Promise<Object>} Created task with ID
 */
export async function createTask(db, userId, status, name) {
  const dbPromise = promisifyDb(db)

  const now = getCurrentDateTime()

  try {
    const result = await dbPromise.run(
      'INSERT INTO productivity_tasks (user_id, status, name, created_at) VALUES (?, ?, ?, ?)',
      [userId, status, name, now]
    )

    return {
      id: result.lastID,
      user_id: userId,
      status,
      name,
      created_at: now
    }
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Task with this name already exists for this status')
    }
    throw err
  }
}

/**
 * Delete a task for a user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} status - Status value
 * @param {string} name - Task name
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteTask(db, userId, status, name) {
  const dbPromise = promisifyDb(db)

  const result = await dbPromise.run(
    'DELETE FROM productivity_tasks WHERE user_id = ? AND status = ? AND name = ?',
    [userId, status, name]
  )

  return result.changes > 0
}

// ===== HISTORY =====

/**
 * Get all history for a user with optional filters
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {Object} filters - Filters { startDate?, endDate?, status? }
 * @returns {Promise<Array>} Array of history entries
 */
export async function getAllHistory(db, userId, filters = {}) {
  const dbPromise = promisifyDb(db)

  let query = 'SELECT * FROM productivity_history WHERE user_id = ?'
  const params = [userId]

  if (filters.startDate) {
    query += ' AND date >= ?'
    params.push(filters.startDate)
  }

  if (filters.endDate) {
    query += ' AND date <= ?'
    params.push(filters.endDate)
  }

  if (filters.status) {
    query += ' AND status = ?'
    params.push(filters.status)
  }

  query += ' ORDER BY date DESC, start_time DESC'

  const history = await dbPromise.all(query, params)
  return history
}

/**
 * Get history by date for a user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of history entries
 */
export async function getHistoryByDate(db, userId, date) {
  const dbPromise = promisifyDb(db)

  const history = await dbPromise.all(
    'SELECT * FROM productivity_history WHERE user_id = ? AND date = ? ORDER BY start_time',
    [userId, date]
  )

  return history
}

/**
 * Create a history entry for a user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {Object} entry - Entry data { status, task, start_time, duration, date }
 * @returns {Promise<Object>} Created entry with ID
 */
export async function createHistoryEntry(db, userId, entry) {
  const dbPromise = promisifyDb(db)

  const now = getCurrentDateTime()

  const result = await dbPromise.run(
    `INSERT INTO productivity_history
    (user_id, status, task, start_time, duration, date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      entry.status,
      entry.task,
      entry.start_time,
      entry.duration,
      entry.date,
      now
    ]
  )

  return {
    id: result.lastID,
    user_id: userId,
    ...entry,
    created_at: now
  }
}

/**
 * Delete a history entry for a user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {number} id - Entry ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteHistoryEntry(db, userId, id) {
  const dbPromise = promisifyDb(db)

  const result = await dbPromise.run(
    'DELETE FROM productivity_history WHERE id = ? AND user_id = ?',
    [id, userId]
  )

  return result.changes > 0
}

// ===== DAILY TOTALS =====

/**
 * Get daily totals for a date for a user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} Daily totals or null
 */
export async function getDailyTotals(db, userId, date) {
  const dbPromise = promisifyDb(db)

  const totals = await dbPromise.get(
    'SELECT * FROM productivity_daily_totals WHERE user_id = ? AND date = ?',
    [userId, date]
  )

  return totals || null
}

/**
 * Get all daily totals in date range for a user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of daily totals
 */
export async function getAllDailyTotals(db, userId, startDate, endDate) {
  const dbPromise = promisifyDb(db)

  let query = 'SELECT * FROM productivity_daily_totals WHERE user_id = ?'
  const params = [userId]

  if (startDate) {
    query += ' AND date >= ?'
    params.push(startDate)
  }

  if (endDate) {
    query += ' AND date <= ?'
    params.push(endDate)
  }

  query += ' ORDER BY date DESC'

  const totals = await dbPromise.all(query, params)
  return totals
}

/**
 * Update daily totals for a user (upsert)
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} totals - Totals { available?, working?, unavailable? }
 * @returns {Promise<Object>} Updated totals
 */
export async function updateDailyTotals(db, userId, date, totals) {
  const dbPromise = promisifyDb(db)

  // Check if exists
  const existing = await getDailyTotals(db, userId, date)

  if (existing) {
    // Update existing
    const fields = []
    const values = []

    if (totals.available !== undefined) {
      fields.push('available = ?')
      values.push(totals.available)
    }

    if (totals.working !== undefined) {
      fields.push('working = ?')
      values.push(totals.working)
    }

    if (totals.unavailable !== undefined) {
      fields.push('unavailable = ?')
      values.push(totals.unavailable)
    }

    if (fields.length > 0) {
      values.push(userId, date)
      await dbPromise.run(
        `UPDATE productivity_daily_totals SET ${fields.join(', ')} WHERE user_id = ? AND date = ?`,
        values
      )
    }
  } else {
    // Insert new
    await dbPromise.run(
      `INSERT INTO productivity_daily_totals (user_id, date, available, working, unavailable)
      VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        date,
        totals.available || 0,
        totals.working || 0,
        totals.unavailable || 0
      ]
    )
  }

  return await getDailyTotals(db, userId, date)
}

/**
 * Calculate daily totals from history for a user
 * Filters to only count time within clocked hours if timeclock entry exists
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Calculated totals
 */
export async function calculateDailyTotals(db, userId, date) {
  const dbPromise = promisifyDb(db)

  // Check if there's a timeclock entry for this date
  const clockEntry = await dbPromise.get(
    'SELECT clock_in, clock_out FROM timeclock_entries WHERE user_id = ? AND date = ?',
    [userId, date]
  )

  let totals

  if (clockEntry && clockEntry.clock_out) {
    // Filter history to only include entries within clock times
    totals = await dbPromise.get(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'available' THEN duration ELSE 0 END), 0) as available,
        COALESCE(SUM(CASE WHEN status = 'working' THEN duration ELSE 0 END), 0) as working,
        COALESCE(SUM(CASE WHEN status = 'unavailable' THEN duration ELSE 0 END), 0) as unavailable
      FROM productivity_history
      WHERE user_id = ? AND date = ?
        AND start_time >= ?
        AND start_time < ?`,
      [userId, date, clockEntry.clock_in, clockEntry.clock_out]
    )
  } else {
    // No clock entry or still open - count all history for the day
    totals = await dbPromise.get(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'available' THEN duration ELSE 0 END), 0) as available,
        COALESCE(SUM(CASE WHEN status = 'working' THEN duration ELSE 0 END), 0) as working,
        COALESCE(SUM(CASE WHEN status = 'unavailable' THEN duration ELSE 0 END), 0) as unavailable
      FROM productivity_history
      WHERE user_id = ? AND date = ?`,
      [userId, date]
    )
  }

  // Update the totals
  await updateDailyTotals(db, userId, date, totals)

  return totals
}

// ===== TASK TOTALS =====

/**
 * Get all task totals for a user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of task totals
 */
export async function getTaskTotals(db, userId) {
  const dbPromise = promisifyDb(db)

  const totals = await dbPromise.all(
    'SELECT * FROM productivity_task_totals WHERE user_id = ? ORDER BY total_time DESC',
    [userId]
  )

  return totals
}

/**
 * Get task total by key for a user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} taskKey - Task key (format: 'status-taskname')
 * @returns {Promise<Object|null>} Task total or null
 */
export async function getTaskTotal(db, userId, taskKey) {
  const dbPromise = promisifyDb(db)

  const total = await dbPromise.get(
    'SELECT * FROM productivity_task_totals WHERE user_id = ? AND task_key = ?',
    [userId, taskKey]
  )

  return total || null
}

/**
 * Update task total for a user (upsert)
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} taskKey - Task key (format: 'status-taskname')
 * @param {number} totalTime - Total time in milliseconds
 * @returns {Promise<Object>} Updated task total
 */
export async function updateTaskTotal(db, userId, taskKey, totalTime) {
  const dbPromise = promisifyDb(db)

  // Check if exists
  const existing = await getTaskTotal(db, userId, taskKey)

  if (existing) {
    // Update existing
    await dbPromise.run(
      'UPDATE productivity_task_totals SET total_time = ? WHERE user_id = ? AND task_key = ?',
      [totalTime, userId, taskKey]
    )
  } else {
    // Insert new
    await dbPromise.run(
      'INSERT INTO productivity_task_totals (user_id, task_key, total_time) VALUES (?, ?, ?)',
      [userId, taskKey, totalTime]
    )
  }

  return await getTaskTotal(db, userId, taskKey)
}

/**
 * Recalculate all task totals from history for a user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Updated task totals
 */
export async function recalculateTaskTotals(db, userId) {
  const dbPromise = promisifyDb(db)

  // Calculate totals from history
  const totals = await dbPromise.all(
    `SELECT
      status || '-' || task as task_key,
      SUM(duration) as total_time
    FROM productivity_history
    WHERE user_id = ?
    GROUP BY status, task`,
    [userId]
  )

  // Clear existing totals for this user
  await dbPromise.run('DELETE FROM productivity_task_totals WHERE user_id = ?', [userId])

  // Insert new totals
  for (const total of totals) {
    await updateTaskTotal(db, userId, total.task_key, total.total_time)
  }

  return await getTaskTotals(db, userId)
}
