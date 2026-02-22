/**
 * Productivity API Routes
 * Handles productivity tracking with time aggregations
 * All endpoints require authentication
 */

import express from 'express'
import { getDatabase } from '../config/database.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { success, error, notFound, validationError, created } from '../utils/responses.js'
import { validateTask } from '../utils/validators.js'
import * as Productivity from '../models/productivity.model.js'
import * as ProductivitySession from '../models/productivitySession.model.js'
import * as Timeclock from '../models/timeclock.model.js'

const router = express.Router()

// All routes require authentication
router.use(requireAuth)

// ===== TASKS =====

/**
 * GET /api/v1/productivity/tasks
 * Get all tasks for authenticated user
 * Query: ?status=working
 */
router.get('/tasks', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const db = await getDatabase()

  let tasks
  if (req.query.status) {
    tasks = await Productivity.getTasksByStatus(db, userId, req.query.status)
  } else {
    tasks = await Productivity.getAllTasks(db, userId)
  }

  res.json(success(tasks, { count: tasks.length, userId }))
}))

/**
 * POST /api/v1/productivity/tasks
 * Create a new task
 * Body: { status, name }
 */
router.post('/tasks', asyncHandler(async (req, res) => {
  const userId = req.user.id

  // Validate input
  const validation = validateTask(req.body)
  if (!validation.valid) {
    return res.status(400).json(validationError(validation.errors))
  }

  const db = await getDatabase()

  try {
    const task = await Productivity.createTask(db, userId, req.body.status, req.body.name)
    res.status(201).json(created(task, task.id))
  } catch (err) {
    if (err.message.includes('already exists')) {
      return res.status(409).json(error('ConflictError', err.message))
    }
    throw err
  }
}))

/**
 * DELETE /api/v1/productivity/tasks/:status/:name
 * Delete a task
 */
router.delete('/tasks/:status/:name', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { status, name } = req.params

  if (!status || !name) {
    return res.status(400).json(error('ValidationError', 'Status and name are required'))
  }

  const db = await getDatabase()
  const deleted = await Productivity.deleteTask(db, userId, status, name)

  if (!deleted) {
    return res.status(404).json(notFound('Task', `${status}/${name}`))
  }

  res.json(success({ message: 'Task deleted successfully' }))
}))

// ===== HISTORY =====

/**
 * GET /api/v1/productivity/history
 * Get history entries for authenticated user
 * Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&status=working
 */
router.get('/history', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const db = await getDatabase()

  const filters = {}
  if (req.query.startDate) filters.startDate = req.query.startDate
  if (req.query.endDate) filters.endDate = req.query.endDate
  if (req.query.status) filters.status = req.query.status

  const history = await Productivity.getAllHistory(db, userId, filters)

  res.json(success(history, { count: history.length, userId }))
}))

/**
 * POST /api/v1/productivity/history
 * Add a time entry
 * Body: { status, task, start_time, duration, date }
 */
router.post('/history', asyncHandler(async (req, res) => {
  const userId = req.user.id

  // Validate required fields
  const required = ['status', 'task', 'start_time', 'duration', 'date']
  const errors = {}

  for (const field of required) {
    if (!req.body[field]) {
      errors[field] = `${field} is required`
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json(validationError(errors))
  }

  // Validate status
  if (!['available', 'working', 'unavailable'].includes(req.body.status)) {
    return res.status(400).json(error('ValidationError', 'Invalid status value'))
  }

  // Validate start_time and duration are numbers
  if (typeof req.body.start_time !== 'number' || typeof req.body.duration !== 'number') {
    return res.status(400).json(error('ValidationError', 'start_time and duration must be numbers (milliseconds)'))
  }

  const db = await getDatabase()
  const entry = await Productivity.createHistoryEntry(db, userId, req.body)

  // Update daily totals for this date
  await Productivity.calculateDailyTotals(db, userId, req.body.date)

  // Update task totals
  const taskKey = `${req.body.status}-${req.body.task}`
  const currentTotal = await Productivity.getTaskTotal(db, userId, taskKey)
  const newTotal = (currentTotal?.total_time || 0) + req.body.duration
  await Productivity.updateTaskTotal(db, userId, taskKey, newTotal)

  res.status(201).json(created(entry, entry.id))
}))

/**
 * DELETE /api/v1/productivity/history/:id
 * Delete a history entry
 */
router.delete('/history/:id', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid history entry ID'))
  }

  const db = await getDatabase()
  const deleted = await Productivity.deleteHistoryEntry(db, userId, id)

  if (!deleted) {
    return res.status(404).json(notFound('History entry', id))
  }

  res.json(success({ message: 'History entry deleted successfully' }))
}))

// ===== DAILY TOTALS =====

/**
 * GET /api/v1/productivity/daily-totals
 * Get daily totals for authenticated user
 * Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/daily-totals', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const db = await getDatabase()

  const startDate = req.query.startDate
  const endDate = req.query.endDate

  const totals = await Productivity.getAllDailyTotals(db, userId, startDate, endDate)

  res.json(success(totals, { count: totals.length, userId }))
}))

/**
 * GET /api/v1/productivity/daily-totals/:date
 * Get daily totals for a specific date
 */
router.get('/daily-totals/:date', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const date = req.params.date

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json(error('ValidationError', 'Invalid date format. Use YYYY-MM-DD'))
  }

  const db = await getDatabase()
  const totals = await Productivity.getDailyTotals(db, userId, date)

  if (!totals) {
    // Return empty totals if not found (new day)
    return res.json(success({
      user_id: userId,
      date,
      available: 0,
      working: 0,
      unavailable: 0
    }))
  }

  res.json(success(totals))
}))

// ===== TASK TOTALS =====

/**
 * GET /api/v1/productivity/task-totals
 * Get task totals for authenticated user
 */
router.get('/task-totals', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const db = await getDatabase()
  const totals = await Productivity.getTaskTotals(db, userId)

  res.json(success(totals, { count: totals.length, userId }))
}))

// ===== ACTIVE SESSION =====

/**
 * GET /api/v1/productivity/session
 * Get current active session (updates heartbeat)
 */
router.get('/session', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const db = await getDatabase()

  const session = await ProductivitySession.getActiveSession(db, userId)

  res.json(success(session))
}))

/**
 * POST /api/v1/productivity/session
 * Start/update active session
 * Body: { status, task, start_time? }
 */
router.post('/session', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { status, task, start_time } = req.body

  // Validate
  if (!status || !task) {
    return res.status(400).json(validationError(['status and task are required']))
  }

  if (!['available', 'working', 'unavailable'].includes(status)) {
    return res.status(400).json(validationError(['Invalid status value']))
  }

  const db = await getDatabase()

  // Check for existing session to save to history
  const existing = await ProductivitySession.getActiveSession(db, userId)

  if (existing && (existing.status !== status || existing.task !== task)) {
    // Save old session to history
    const duration = Date.now() - existing.start_time
    const date = getLocalDateString(existing.start_time)

    await Productivity.createHistoryEntry(db, userId, {
      status: existing.status,
      task: existing.task,
      start_time: existing.start_time,
      duration,
      date
    })

    await Productivity.calculateDailyTotals(db, userId, date)

    const taskKey = `${existing.status}-${existing.task}`
    const currentTotal = await Productivity.getTaskTotal(db, userId, taskKey)
    const newTotal = (currentTotal?.total_time || 0) + duration
    await Productivity.updateTaskTotal(db, userId, taskKey, newTotal)
  }

  // Set new session
  const session = await ProductivitySession.setActiveSession(db, userId, {
    status,
    task,
    start_time: start_time || Date.now()
  })

  res.status(201).json(created(session))
}))

/**
 * DELETE /api/v1/productivity/session
 * Stop session and save to history
 */
router.delete('/session', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const db = await getDatabase()

  const session = await ProductivitySession.getActiveSession(db, userId)

  if (!session) {
    return res.status(404).json(notFound('Active session', userId))
  }

  // Save to history
  const duration = Date.now() - session.start_time
  const date = getLocalDateString(session.start_time)

  await Productivity.createHistoryEntry(db, userId, {
    status: session.status,
    task: session.task,
    start_time: session.start_time,
    duration,
    date
  })

  await Productivity.calculateDailyTotals(db, userId, date)

  const taskKey = `${session.status}-${session.task}`
  const currentTotal = await Productivity.getTaskTotal(db, userId, taskKey)
  const newTotal = (currentTotal?.total_time || 0) + duration
  await Productivity.updateTaskTotal(db, userId, taskKey, newTotal)

  await ProductivitySession.clearActiveSession(db, userId)

  res.json(success({ message: 'Session ended and saved to history' }))
}))

// ===== TIMECLOCK =====

/**
 * POST /api/v1/productivity/clock-in
 * Clock in for work day
 * Body: { timestamp? }
 */
router.post('/clock-in', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const timestamp = req.body.timestamp || Date.now()

  // Validate timestamp
  if (typeof timestamp !== 'number') {
    return res.status(400).json(validationError({ timestamp: 'Must be a number (milliseconds)' }))
  }

  if (timestamp > Date.now()) {
    return res.status(400).json(validationError({ timestamp: 'Cannot be in the future' }))
  }

  const db = await getDatabase()

  try {
    const entry = await Timeclock.clockIn(db, userId, timestamp)
    res.status(201).json(created(entry, entry.id))
  } catch (err) {
    if (err.message.includes('already has an open')) {
      return res.status(409).json(error('ConflictError', err.message))
    }
    throw err
  }
}))

/**
 * POST /api/v1/productivity/clock-out
 * Clock out for work day
 * Body: { timestamp? }
 */
router.post('/clock-out', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const timestamp = req.body.timestamp || Date.now()

  // Validate timestamp
  if (typeof timestamp !== 'number') {
    return res.status(400).json(validationError({ timestamp: 'Must be a number (milliseconds)' }))
  }

  if (timestamp > Date.now()) {
    return res.status(400).json(validationError({ timestamp: 'Cannot be in the future' }))
  }

  const db = await getDatabase()

  try {
    const entry = await Timeclock.clockOut(db, userId, timestamp)

    // Save current active session to history if exists
    const session = await ProductivitySession.getActiveSession(db, userId)
    if (session) {
      const duration = timestamp - session.start_time
      const date = getLocalDateString(session.start_time)

      await Productivity.createHistoryEntry(db, userId, {
        status: session.status,
        task: session.task,
        start_time: session.start_time,
        duration,
        date
      })

      // Update totals
      await Productivity.calculateDailyTotals(db, userId, date)

      const taskKey = `${session.status}-${session.task}`
      const currentTotal = await Productivity.getTaskTotal(db, userId, taskKey)
      const newTotal = (currentTotal?.total_time || 0) + duration
      await Productivity.updateTaskTotal(db, userId, taskKey, newTotal)

      // Clear active session
      await ProductivitySession.clearActiveSession(db, userId)
    }

    res.json(success(entry))
  } catch (err) {
    if (err.message.includes('No open clock entry')) {
      return res.status(404).json(notFound('Open clock entry', userId))
    }
    if (err.message.includes('must be after')) {
      return res.status(400).json(validationError({ timestamp: err.message }))
    }
    throw err
  }
}))

/**
 * GET /api/v1/productivity/clock-status
 * Get current clock status
 */
router.get('/clock-status', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const db = await getDatabase()

  const status = await Timeclock.getCurrentClockStatus(db, userId)

  // Auto-clock-out after 8 hours
  const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000
  if (status.clocked_in && status.elapsed >= EIGHT_HOURS_MS) {
    const autoClockoutTime = status.entry.clock_in + EIGHT_HOURS_MS

    // Save current active session to history if exists
    const session = await ProductivitySession.getActiveSession(db, userId)
    if (session) {
      const duration = autoClockoutTime - session.start_time
      const date = getLocalDateString(session.start_time)

      await Productivity.createHistoryEntry(db, userId, {
        status: session.status,
        task: session.task,
        start_time: session.start_time,
        duration,
        date
      })

      await Productivity.calculateDailyTotals(db, userId, date)

      const taskKey = `${session.status}-${session.task}`
      const currentTotal = await Productivity.getTaskTotal(db, userId, taskKey)
      const newTotal = (currentTotal?.total_time || 0) + duration
      await Productivity.updateTaskTotal(db, userId, taskKey, newTotal)

      await ProductivitySession.clearActiveSession(db, userId)
    }

    await Timeclock.clockOut(db, userId, autoClockoutTime)
    const closedStatus = await Timeclock.getCurrentClockStatus(db, userId)
    return res.json(success({ ...closedStatus, auto_clocked_out: true }))
  }

  res.json(success(status))
}))

/**
 * GET /api/v1/productivity/timecard
 * Get timecard entries
 * Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&includeOpen=true
 */
router.get('/timecard', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const db = await getDatabase()

  const filters = {}
  if (req.query.startDate) filters.startDate = req.query.startDate
  if (req.query.endDate) filters.endDate = req.query.endDate
  if (req.query.includeOpen !== undefined) {
    filters.includeOpen = req.query.includeOpen === 'true'
  }

  const entries = await Timeclock.getTimecardEntries(db, userId, filters)
  res.json(success(entries, { count: entries.length }))
}))

/**
 * POST /api/v1/productivity/timecard
 * Create manual timecard entry
 * Body: { date, clock_in, clock_out?, notes? }
 */
router.post('/timecard', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const db = await getDatabase()

  try {
    const entry = await Timeclock.createTimecardEntry(db, userId, req.body)

    // Recalculate daily totals for the affected date
    await Productivity.calculateDailyTotals(db, userId, entry.date)

    res.status(201).json(created(entry, entry.id))
  } catch (err) {
    if (err.message.includes('required') || err.message.includes('must be after') || err.message.includes('must match')) {
      return res.status(400).json(validationError({ error: err.message }))
    }
    throw err
  }
}))

/**
 * PUT /api/v1/productivity/timecard/:id
 * Update timecard entry
 * Body: { clock_in?, clock_out?, notes? }
 */
router.put('/timecard/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(validationError({ id: 'Invalid timecard entry ID' }))
  }

  const db = await getDatabase()

  try {
    const entry = await Timeclock.updateTimecardEntry(db, id, req.body)

    // Recalculate daily totals for the affected date
    await Productivity.calculateDailyTotals(db, entry.user_id, entry.date)

    res.json(success(entry))
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json(notFound('Timecard entry', id))
    }
    throw err
  }
}))

/**
 * DELETE /api/v1/productivity/timecard/:id
 * Delete timecard entry
 */
router.delete('/timecard/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(validationError({ id: 'Invalid timecard entry ID' }))
  }

  const db = await getDatabase()

  const deleted = await Timeclock.deleteTimecardEntry(db, id)

  if (!deleted) {
    return res.status(404).json(notFound('Timecard entry', id))
  }

  res.json(success({ message: 'Timecard entry deleted successfully' }))
}))

/**
 * GET /api/v1/productivity/out-of-hours
 * Preview productivity data outside clock hours
 * Query: ?date=YYYY-MM-DD
 */
router.get('/out-of-hours', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const date = req.query.date

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json(validationError({ date: 'Date is required in YYYY-MM-DD format' }))
  }

  const db = await getDatabase()
  const entries = await Timeclock.getOutOfHoursHistory(db, userId, date)

  res.json(success(entries, { count: entries.length }))
}))

/**
 * POST /api/v1/productivity/cleanup-hours
 * Delete productivity data outside clock hours
 * Body: { date, dryRun? }
 */
router.post('/cleanup-hours', asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { date, dryRun } = req.body

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json(validationError({ date: 'Date is required in YYYY-MM-DD format' }))
  }

  const db = await getDatabase()
  const result = await Timeclock.cleanupOutOfHours(db, userId, date, dryRun)

  // Recalculate daily totals if data was deleted
  if (!dryRun && result.deleted > 0) {
    await Productivity.calculateDailyTotals(db, userId, date)
  }

  res.json(success(result))
}))

// Helper function
function getLocalDateString(timestamp) {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default router
