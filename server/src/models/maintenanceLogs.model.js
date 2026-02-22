/**
 * Maintenance Logs Model
 * Handles weekly/routine maintenance logging
 */

import { promisifyDb } from '../config/database.js'
import { getCurrentDateTime } from '../utils/dateHelpers.js'

/**
 * Get all maintenance logs with optional filters
 */
export async function getAllLogs(db, filters = {}) {
  const dbPromise = promisifyDb(db)
  let query = 'SELECT * FROM maintenance_logs WHERE 1=1'
  const params = []

  if (filters.startDate) {
    query += ' AND date >= ?'
    params.push(filters.startDate)
  }

  if (filters.endDate) {
    query += ' AND date <= ?'
    params.push(filters.endDate)
  }

  query += ' ORDER BY date DESC, time DESC, created_at DESC'

  return await dbPromise.all(query, params)
}

/**
 * Get a single maintenance log by ID
 */
export async function getLogById(db, id) {
  const dbPromise = promisifyDb(db)
  return await dbPromise.get(
    'SELECT * FROM maintenance_logs WHERE id = ?',
    [id]
  ) || null
}

/**
 * Create a new maintenance log
 */
export async function createLog(db, logData) {
  const dbPromise = promisifyDb(db)
  const now = getCurrentDateTime()

  const result = await dbPromise.run(
    `INSERT INTO maintenance_logs
    (date, time, machines, description, notes, performed_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      logData.date,
      logData.time || null,
      logData.machines ? JSON.stringify(logData.machines) : null,
      logData.description,
      logData.notes || null,
      logData.performed_by || null,
      now,
      now
    ]
  )

  return {
    id: result.lastID,
    ...logData,
    machines: logData.machines ? JSON.stringify(logData.machines) : null,
    created_at: now,
    updated_at: now
  }
}

/**
 * Update an existing maintenance log
 */
export async function updateLog(db, id, updates) {
  const dbPromise = promisifyDb(db)

  const fields = []
  const params = []

  if (updates.date !== undefined) {
    fields.push('date = ?')
    params.push(updates.date)
  }

  if (updates.time !== undefined) {
    fields.push('time = ?')
    params.push(updates.time)
  }

  if (updates.machines !== undefined) {
    fields.push('machines = ?')
    params.push(updates.machines ? JSON.stringify(updates.machines) : null)
  }

  if (updates.description !== undefined) {
    fields.push('description = ?')
    params.push(updates.description)
  }

  if (updates.notes !== undefined) {
    fields.push('notes = ?')
    params.push(updates.notes)
  }

  if (updates.performed_by !== undefined) {
    fields.push('performed_by = ?')
    params.push(updates.performed_by)
  }

  if (fields.length === 0) {
    return await getLogById(db, id)
  }

  params.push(id)

  await dbPromise.run(
    `UPDATE maintenance_logs SET ${fields.join(', ')} WHERE id = ?`,
    params
  )

  return await getLogById(db, id)
}

/**
 * Delete a maintenance log
 */
export async function deleteLog(db, id) {
  const dbPromise = promisifyDb(db)

  const result = await dbPromise.run(
    'DELETE FROM maintenance_logs WHERE id = ?',
    [id]
  )

  return result.changes > 0
}

/**
 * Get recent maintenance logs (last N entries)
 */
export async function getRecentLogs(db, limit = 10) {
  const dbPromise = promisifyDb(db)

  return await dbPromise.all(
    `SELECT * FROM maintenance_logs
     ORDER BY date DESC, time DESC, created_at DESC
     LIMIT ?`,
    [limit]
  )
}

/**
 * Get last maintenance log for specific machine(s)
 * Used for weekly Roland maintenance reminder status calculation
 */
export async function getLastMaintenanceForMachine(db, machines) {
  const dbPromise = promisifyDb(db)
  const logs = await dbPromise.all(
    'SELECT * FROM maintenance_logs ORDER BY date DESC, created_at DESC LIMIT 50'
  )

  const machineList = Array.isArray(machines) ? machines : [machines]

  for (const log of logs) {
    if (log.machines) {
      try {
        const logMachines = JSON.parse(log.machines)
        if (machineList.some(m => logMachines.includes(m))) {
          return { ...log, machines: logMachines }
        }
      } catch (e) {
        console.error('Error parsing machines JSON:', e)
      }
    }
  }
  return null
}
