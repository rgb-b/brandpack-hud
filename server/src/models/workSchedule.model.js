/**
 * Work Schedule Model
 * Manages user work schedules for auto clock-in/out functionality
 */

import { promisifyDb } from '../config/database.js'

// ============================================================================
// Schedule CRUD
// ============================================================================

/**
 * Get all schedule entries for a user
 * Returns array of { id, user_id, day_of_week, start_time, end_time }
 */
export async function getSchedule(db, userId) {
  const { all } = promisifyDb(db)

  return all(
    `SELECT id, user_id, day_of_week, start_time, end_time, created_at, updated_at
     FROM work_schedules
     WHERE user_id = ?
     ORDER BY day_of_week ASC`,
    [userId]
  )
}

/**
 * Get schedule for a specific day
 */
export async function getScheduleForDay(db, userId, dayOfWeek) {
  const { get } = promisifyDb(db)

  return get(
    `SELECT id, user_id, day_of_week, start_time, end_time
     FROM work_schedules
     WHERE user_id = ? AND day_of_week = ?`,
    [userId, dayOfWeek]
  )
}

/**
 * Set schedule for a specific day (creates or updates)
 */
export async function setSchedule(db, userId, { day_of_week, start_time, end_time }) {
  const { run, get } = promisifyDb(db)

  // Validate day_of_week (0-6)
  if (day_of_week < 0 || day_of_week > 6) {
    throw new Error('day_of_week must be between 0 (Sunday) and 6 (Saturday)')
  }

  // Validate time format (HH:MM)
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
    throw new Error('Time must be in HH:MM format (24-hour)')
  }

  // Check if schedule exists for this day
  const existing = await get(
    'SELECT id FROM work_schedules WHERE user_id = ? AND day_of_week = ?',
    [userId, day_of_week]
  )

  if (existing) {
    // Update existing
    await run(
      `UPDATE work_schedules
       SET start_time = ?, end_time = ?, updated_at = datetime('now')
       WHERE user_id = ? AND day_of_week = ?`,
      [start_time, end_time, userId, day_of_week]
    )

    return get('SELECT * FROM work_schedules WHERE id = ?', [existing.id])
  } else {
    // Insert new
    const result = await run(
      `INSERT INTO work_schedules (user_id, day_of_week, start_time, end_time)
       VALUES (?, ?, ?, ?)`,
      [userId, day_of_week, start_time, end_time]
    )

    return get('SELECT * FROM work_schedules WHERE id = ?', [result.lastID])
  }
}

/**
 * Delete schedule for a specific day
 */
export async function deleteSchedule(db, userId, dayOfWeek) {
  const { run } = promisifyDb(db)

  const result = await run(
    'DELETE FROM work_schedules WHERE user_id = ? AND day_of_week = ?',
    [userId, dayOfWeek]
  )

  return result.changes > 0
}

/**
 * Delete all schedules for a user
 */
export async function deleteAllSchedules(db, userId) {
  const { run } = promisifyDb(db)

  const result = await run('DELETE FROM work_schedules WHERE user_id = ?', [userId])

  return result.changes
}

// ============================================================================
// Auto Clock-In/Out Logic
// ============================================================================

/**
 * Check if user should auto clock-in based on current time and schedule
 * Returns true if within ±5 minutes of scheduled start time
 */
export async function shouldAutoClockIn(db, userId, timestamp = Date.now()) {
  const date = new Date(timestamp)
  const dayOfWeek = date.getDay() // 0=Sunday, 6=Saturday
  const currentMinutes = date.getHours() * 60 + date.getMinutes()

  // Get schedule for current day
  const schedule = await getScheduleForDay(db, userId, dayOfWeek)

  if (!schedule) {
    return false // No schedule for today
  }

  // Parse scheduled start time to minutes
  const [startHour, startMinute] = schedule.start_time.split(':').map(Number)
  const scheduledMinutes = startHour * 60 + startMinute

  // Check if within ±5 minute window
  const WINDOW = 5 // minutes
  const diff = currentMinutes - scheduledMinutes

  return diff >= -WINDOW && diff <= WINDOW
}

/**
 * Check if user should auto clock-out based on current time and schedule
 * Returns true if past scheduled end time
 */
export async function shouldAutoClockOut(db, userId, timestamp = Date.now()) {
  const date = new Date(timestamp)
  const dayOfWeek = date.getDay()
  const currentMinutes = date.getHours() * 60 + date.getMinutes()

  // Get schedule for current day
  const schedule = await getScheduleForDay(db, userId, dayOfWeek)

  if (!schedule) {
    return false // No schedule for today
  }

  // Parse scheduled end time to minutes
  const [endHour, endMinute] = schedule.end_time.split(':').map(Number)
  const scheduledMinutes = endHour * 60 + endMinute

  // Check if current time is past end time
  return currentMinutes >= scheduledMinutes
}

/**
 * Get next scheduled work period for a user
 * Returns { day_of_week, start_time, end_time, days_until } or null if no schedule
 */
export async function getNextScheduledPeriod(db, userId) {
  const { all } = promisifyDb(db)

  const schedules = await all(
    `SELECT day_of_week, start_time, end_time
     FROM work_schedules
     WHERE user_id = ?
     ORDER BY day_of_week ASC`,
    [userId]
  )

  if (schedules.length === 0) {
    return null
  }

  const now = new Date()
  const currentDay = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // Find next schedule entry
  for (let i = 0; i < 7; i++) {
    const checkDay = (currentDay + i) % 7
    const schedule = schedules.find(s => s.day_of_week === checkDay)

    if (!schedule) continue

    // If checking today, make sure we haven't passed the start time
    if (i === 0) {
      const [startHour, startMinute] = schedule.start_time.split(':').map(Number)
      const scheduledMinutes = startHour * 60 + startMinute

      if (currentMinutes >= scheduledMinutes) {
        continue // Already passed, check next day
      }
    }

    return {
      ...schedule,
      days_until: i
    }
  }

  // Wrap around to first schedule (next week)
  const firstSchedule = schedules[0]
  const daysUntil = (7 - currentDay + firstSchedule.day_of_week) % 7 || 7

  return {
    ...firstSchedule,
    days_until: daysUntil
  }
}

/**
 * Check if current time is within a scheduled work period
 */
export async function isWithinScheduledHours(db, userId, timestamp = Date.now()) {
  const date = new Date(timestamp)
  const dayOfWeek = date.getDay()
  const currentMinutes = date.getHours() * 60 + date.getMinutes()

  const schedule = await getScheduleForDay(db, userId, dayOfWeek)

  if (!schedule) {
    return false
  }

  const [startHour, startMinute] = schedule.start_time.split(':').map(Number)
  const [endHour, endMinute] = schedule.end_time.split(':').map(Number)

  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}
