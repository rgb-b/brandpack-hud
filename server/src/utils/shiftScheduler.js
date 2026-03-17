/**
 * Shift Scheduler
 * Background job that automatically ends shifts after 8 hours.
 * Runs every 60 seconds, clocks out expired sessions, and invalidates
 * the user's active browser session so the next request returns 401.
 */

import { getDatabase, promisifyDb } from '../config/database.js'
import * as ProductivityV4 from '../models/productivityV4.model.js'
import * as Timeclock from '../models/timeclock.model.js'

const SHIFT_DURATION_MS = 8 * 60 * 60 * 1000  // 8 hours
const CHECK_INTERVAL_MS = 60 * 1000            // every 60 seconds

let intervalId = null

export function startShiftScheduler() {
  if (intervalId) return
  intervalId = setInterval(checkExpiredShifts, CHECK_INTERVAL_MS)
  console.log('[ShiftScheduler] Started — shifts auto-end after 8h')
}

export function stopShiftScheduler() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

async function checkExpiredShifts() {
  try {
    const db = await getDatabase()
    const { all, run } = promisifyDb(db)
    const now = Date.now()
    const cutoff = now - SHIFT_DURATION_MS

    const expired = await all(
      'SELECT id, user_id, clock_in FROM timeclock_entries WHERE clock_out IS NULL AND clock_in <= ?',
      [cutoff]
    )

    for (const entry of expired) {
      const clockOutTime = entry.clock_in + SHIFT_DURATION_MS

      // Stop active V4 tracking session (phantom-safe — no-op if nothing is running)
      await ProductivityV4.stopTracking(db, entry.user_id, clockOutTime)

      // Clock out at the exact 8-hour mark
      try {
        await Timeclock.clockOut(db, entry.user_id, clockOutTime)
      } catch (e) {
        if (!e.message?.includes('No open clock entry')) throw e
      }

      // Invalidate active browser sessions — next requireAuth request returns 401
      await run(
        'UPDATE users SET session_invalidated_at = ? WHERE id = ?',
        [clockOutTime, entry.user_id]
      )

      console.log(`[ShiftScheduler] Shift ended for user ${entry.user_id} at ${new Date(clockOutTime).toISOString()}`)
    }
  } catch (err) {
    console.error('[ShiftScheduler] Check failed:', err)
  }
}
