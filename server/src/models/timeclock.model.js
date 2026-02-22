/**
 * Timeclock Model
 * Database operations for clock in/out and timecard management
 * All operations are scoped to a specific user
 */

import { promisifyDb } from '../config/database.js'
import { getCurrentDateTime } from '../utils/dateHelpers.js'

/**
 * Get local date string from timestamp
 * @param {number} timestamp - Milliseconds since epoch
 * @returns {string} Date in YYYY-MM-DD format
 */
function getLocalDateString(timestamp) {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ===== CLOCK OPERATIONS =====

/**
 * Check if user has an open (not clocked out) entry
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if open entry exists
 */
export async function hasOpenEntry(db, userId) {
  const dbPromise = promisifyDb(db)

  const entry = await dbPromise.get(
    'SELECT id FROM timeclock_entries WHERE user_id = ? AND clock_out IS NULL',
    [userId]
  )

  return !!entry
}

/**
 * Get open entry for user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Open entry or null
 */
export async function getOpenEntry(db, userId) {
  const dbPromise = promisifyDb(db)

  const entry = await dbPromise.get(
    'SELECT * FROM timeclock_entries WHERE user_id = ? AND clock_out IS NULL',
    [userId]
  )

  return entry || null
}

/**
 * Clock in - Create new entry
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {number} timestamp - Clock in time (milliseconds since epoch)
 * @returns {Promise<Object>} Created entry
 */
export async function clockIn(db, userId, timestamp = Date.now()) {
  const dbPromise = promisifyDb(db)

  // Check if already clocked in
  const hasOpen = await hasOpenEntry(db, userId)
  if (hasOpen) {
    throw new Error('User already has an open clock entry')
  }

  const date = getLocalDateString(timestamp)
  const now = getCurrentDateTime()

  const result = await dbPromise.run(
    `INSERT INTO timeclock_entries (user_id, date, clock_in, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)`,
    [userId, date, timestamp, now, now]
  )

  return {
    id: result.lastID,
    user_id: userId,
    date,
    clock_in: timestamp,
    clock_out: null,
    is_manual: 0,
    notes: null,
    created_at: now,
    updated_at: now
  }
}

/**
 * Clock out - Update open entry
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {number} timestamp - Clock out time (milliseconds since epoch)
 * @returns {Promise<Object>} Updated entry with duration
 */
export async function clockOut(db, userId, timestamp = Date.now()) {
  const dbPromise = promisifyDb(db)

  // Get open entry
  const entry = await getOpenEntry(db, userId)
  if (!entry) {
    throw new Error('No open clock entry found')
  }

  // Validate clock_out is after clock_in
  if (timestamp <= entry.clock_in) {
    throw new Error('Clock out time must be after clock in time')
  }

  // Update entry
  await dbPromise.run(
    'UPDATE timeclock_entries SET clock_out = ? WHERE id = ?',
    [timestamp, entry.id]
  )

  const duration = timestamp - entry.clock_in

  return {
    ...entry,
    clock_out: timestamp,
    duration
  }
}

/**
 * Get current clock status for user
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Clock status { clocked_in, entry, elapsed }
 */
export async function getCurrentClockStatus(db, userId) {
  const entry = await getOpenEntry(db, userId)

  if (!entry) {
    return {
      clocked_in: false,
      entry: null,
      elapsed: 0
    }
  }

  const elapsed = Date.now() - entry.clock_in

  return {
    clocked_in: true,
    entry: {
      id: entry.id,
      clock_in: entry.clock_in,
      date: entry.date
    },
    elapsed
  }
}

// ===== TIMECARD MANAGEMENT =====

/**
 * Get timecard entries for user with optional filters
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {Object} filters - { startDate?, endDate?, includeOpen? }
 * @returns {Promise<Array>} Array of entries with calculated durations
 */
export async function getTimecardEntries(db, userId, filters = {}) {
  const dbPromise = promisifyDb(db)

  let query = 'SELECT * FROM timeclock_entries WHERE user_id = ?'
  const params = [userId]

  if (filters.startDate) {
    query += ' AND date >= ?'
    params.push(filters.startDate)
  }

  if (filters.endDate) {
    query += ' AND date <= ?'
    params.push(filters.endDate)
  }

  if (filters.includeOpen === false) {
    query += ' AND clock_out IS NOT NULL'
  }

  query += ' ORDER BY date DESC, clock_in DESC'

  const entries = await dbPromise.all(query, params)

  // Add calculated duration
  return entries.map(entry => ({
    ...entry,
    duration: entry.clock_out ? entry.clock_out - entry.clock_in : null
  }))
}

/**
 * Create a manual timecard entry
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {Object} entry - { date, clock_in, clock_out?, notes? }
 * @returns {Promise<Object>} Created entry
 */
export async function createTimecardEntry(db, userId, entry) {
  const dbPromise = promisifyDb(db)

  const { date, clock_in, clock_out, notes } = entry

  // Validate
  if (!date || !clock_in) {
    throw new Error('Date and clock_in are required')
  }

  // Validate clock_out is after clock_in
  if (clock_out && clock_out <= clock_in) {
    throw new Error('Clock out time must be after clock in time')
  }

  // Validate date matches clock_in
  const clockInDate = getLocalDateString(clock_in)
  if (date !== clockInDate) {
    throw new Error('Date must match clock_in timestamp')
  }

  const now = getCurrentDateTime()

  const result = await dbPromise.run(
    `INSERT INTO timeclock_entries
    (user_id, date, clock_in, clock_out, is_manual, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
    [userId, date, clock_in, clock_out || null, notes || null, now, now]
  )

  return {
    id: result.lastID,
    user_id: userId,
    date,
    clock_in,
    clock_out: clock_out || null,
    is_manual: 1,
    notes: notes || null,
    created_at: now,
    updated_at: now,
    duration: clock_out ? clock_out - clock_in : null
  }
}

/**
 * Update a timecard entry
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Entry ID
 * @param {Object} updates - { clock_in?, clock_out?, notes? }
 * @returns {Promise<Object>} Updated entry
 */
export async function updateTimecardEntry(db, id, updates) {
  const dbPromise = promisifyDb(db)

  // Get existing entry
  const existing = await dbPromise.get(
    'SELECT * FROM timeclock_entries WHERE id = ?',
    [id]
  )

  if (!existing) {
    throw new Error('Timecard entry not found')
  }

  const fields = []
  const values = []

  if (updates.clock_in !== undefined) {
    fields.push('clock_in = ?')
    values.push(updates.clock_in)
  }

  if (updates.clock_out !== undefined) {
    fields.push('clock_out = ?')
    values.push(updates.clock_out)
  }

  if (updates.notes !== undefined) {
    fields.push('notes = ?')
    values.push(updates.notes)
  }

  // Mark as manual if not already
  if (!existing.is_manual) {
    fields.push('is_manual = 1')
  }

  if (fields.length > 0) {
    values.push(id)
    await dbPromise.run(
      `UPDATE timeclock_entries SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
  }

  // Fetch updated entry
  const updated = await dbPromise.get(
    'SELECT * FROM timeclock_entries WHERE id = ?',
    [id]
  )

  return {
    ...updated,
    duration: updated.clock_out ? updated.clock_out - updated.clock_in : null
  }
}

/**
 * Delete a timecard entry
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Entry ID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteTimecardEntry(db, id) {
  const dbPromise = promisifyDb(db)

  const result = await dbPromise.run(
    'DELETE FROM timeclock_entries WHERE id = ?',
    [id]
  )

  return result.changes > 0
}

// ===== DATA CLEANUP =====

/**
 * Get productivity history entries outside of clock hours for a date
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Out-of-hours history entries
 */
export async function getOutOfHoursHistory(db, userId, date) {
  const dbPromise = promisifyDb(db)

  // Get clock entry for date
  const clockEntry = await dbPromise.get(
    'SELECT * FROM timeclock_entries WHERE user_id = ? AND date = ? AND clock_out IS NOT NULL',
    [userId, date]
  )

  if (!clockEntry) {
    return []
  }

  // Get history entries outside clock hours
  const entries = await dbPromise.all(
    `SELECT * FROM productivity_history
    WHERE user_id = ? AND date = ?
    AND (start_time < ? OR start_time >= ?)
    ORDER BY start_time`,
    [userId, date, clockEntry.clock_in, clockEntry.clock_out]
  )

  return entries
}

/**
 * Clean up productivity data outside of clock hours
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {boolean} dryRun - If true, return preview without deleting
 * @returns {Promise<Object>} { deleted: number, entries?: Array }
 */
export async function cleanupOutOfHours(db, userId, date, dryRun = false) {
  const dbPromise = promisifyDb(db)

  const outOfHoursEntries = await getOutOfHoursHistory(db, userId, date)

  if (dryRun) {
    return {
      deleted: outOfHoursEntries.length,
      entries: outOfHoursEntries
    }
  }

  if (outOfHoursEntries.length === 0) {
    return { deleted: 0 }
  }

  // Delete out-of-hours entries
  const ids = outOfHoursEntries.map(e => e.id)
  const placeholders = ids.map(() => '?').join(',')

  await dbPromise.run(
    `DELETE FROM productivity_history WHERE id IN (${placeholders})`,
    ids
  )

  return { deleted: outOfHoursEntries.length }
}
