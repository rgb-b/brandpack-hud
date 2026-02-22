import { promisifyDb } from '../config/database.js'
import { getCurrentDateTime } from '../utils/dateHelpers.js'

/**
 * Get active session for user
 * Updates heartbeat while fetching
 */
export async function getActiveSession(db, userId) {
  const { get, run } = promisifyDb(db)

  // Update heartbeat while fetching
  await run(
    'UPDATE productivity_active_sessions SET last_heartbeat = ? WHERE user_id = ?',
    [getCurrentDateTime(), userId]
  )

  const session = await get(
    'SELECT user_id, status, task, start_time, last_heartbeat FROM productivity_active_sessions WHERE user_id = ?',
    [userId]
  )

  return session || null
}

/**
 * Set/update active session (upsert)
 */
export async function setActiveSession(db, userId, { status, task, start_time }) {
  const { run } = promisifyDb(db)
  const now = getCurrentDateTime()

  const result = await run(
    `INSERT INTO productivity_active_sessions (user_id, status, task, start_time, last_heartbeat)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       status = excluded.status,
       task = excluded.task,
       start_time = excluded.start_time,
       last_heartbeat = excluded.last_heartbeat`,
    [userId, status, task, start_time, now]
  )

  return {
    user_id: userId,
    status,
    task,
    start_time,
    last_heartbeat: now
  }
}

/**
 * Clear active session
 */
export async function clearActiveSession(db, userId) {
  const { run } = promisifyDb(db)

  const result = await run(
    'DELETE FROM productivity_active_sessions WHERE user_id = ?',
    [userId]
  )

  return result.changes > 0
}
