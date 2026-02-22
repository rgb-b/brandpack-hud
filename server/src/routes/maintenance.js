/**
 * Maintenance API Routes
 * Handles service visits and maintenance issues endpoints
 */

import express from 'express'
import { getDatabase } from '../config/database.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { success, error, notFound, validationError, created } from '../utils/responses.js'
import { validateDate, validateMaintenanceIssue, validateServiceVisit } from '../utils/validators.js'
import * as Maintenance from '../models/maintenance.model.js'
import * as ServiceVisits from '../models/serviceVisits.model.js'
import * as MaintenanceLogs from '../models/maintenanceLogs.model.js'

const router = express.Router()

// Apply authentication to all routes
router.use(requireAuth)

// ===== SERVICE VISITS =====

/**
 * GET /api/v1/maintenance/visits
 * Get all service visits with optional filters
 * Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&machine=X&visitType=scheduled
 */
router.get('/visits', asyncHandler(async (req, res) => {
  const db = await getDatabase()

  const filters = {}
  if (req.query.startDate) filters.startDate = req.query.startDate
  if (req.query.endDate) filters.endDate = req.query.endDate
  if (req.query.machine) filters.machine = req.query.machine
  if (req.query.visitType) filters.visitType = req.query.visitType

  const visits = await ServiceVisits.getAllVisits(db, filters)

  res.json(success(visits, { count: visits.length }))
}))

/**
 * GET /api/v1/maintenance/visits/:id
 * Get specific service visit
 */
router.get('/visits/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid visit ID'))
  }

  const db = await getDatabase()
  const visit = await ServiceVisits.getVisitById(db, id)

  if (!visit) {
    return res.status(404).json(notFound('Service visit', id))
  }

  res.json(success(visit))
}))

/**
 * POST /api/v1/maintenance/visits
 * Create new service visit
 * Body: { date, time?, technician, company?, machine, visit_type, description?, notes?, cost? }
 */
router.post('/visits', asyncHandler(async (req, res) => {
  // Validate input
  const validation = validateServiceVisit(req.body)
  if (!validation.valid) {
    return res.status(400).json(validationError(validation.errors))
  }

  const db = await getDatabase()
  const visit = await ServiceVisits.createVisit(db, req.body)

  res.status(201).json(created(visit, visit.id))
}))

/**
 * PUT /api/v1/maintenance/visits/:id
 * Update service visit
 * Body: { date?, time?, technician?, company?, machine?, visit_type?, description?, notes?, cost? }
 */
router.put('/visits/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid visit ID'))
  }

  const db = await getDatabase()
  const updated = await ServiceVisits.updateVisit(db, id, req.body)

  if (!updated) {
    return res.status(404).json(notFound('Service visit', id))
  }

  res.json(success(updated))
}))

/**
 * DELETE /api/v1/maintenance/visits/:id
 * Delete service visit
 */
router.delete('/visits/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid visit ID'))
  }

  const db = await getDatabase()
  const deleted = await ServiceVisits.deleteVisit(db, id)

  if (!deleted) {
    return res.status(404).json(notFound('Service visit', id))
  }

  res.json(success({ message: 'Service visit deleted successfully' }))
}))

/**
 * GET /api/v1/maintenance/metrics
 * Get maintenance metrics (issue counts by status and severity)
 * Query: ?machine=X (optional, for specific machine)
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const machine = req.query.machine || null

  const metrics = await Maintenance.getMaintenanceMetrics(db, machine)

  res.json(success(metrics))
}))

// ===== MAINTENANCE ISSUES =====

/**
 * GET /api/v1/maintenance/issues
 * Get all maintenance issues
 * Query: ?status=open&machine=X&severity=high
 */
router.get('/issues', asyncHandler(async (req, res) => {
  const db = await getDatabase()

  const filters = {}
  if (req.query.status) filters.status = req.query.status
  if (req.query.machine) filters.machine = req.query.machine
  if (req.query.severity) filters.severity = req.query.severity

  const issues = await Maintenance.getAllIssues(db, filters)

  res.json(success(issues, { count: issues.length }))
}))

/**
 * GET /api/v1/maintenance/issues/:id
 * Get specific maintenance issue
 */
router.get('/issues/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid issue ID'))
  }

  const db = await getDatabase()
  const issue = await Maintenance.getIssueById(db, id)

  if (!issue) {
    return res.status(404).json(notFound('Maintenance issue', id))
  }

  res.json(success(issue))
}))

/**
 * POST /api/v1/maintenance/issues
 * Create new maintenance issue
 * Body: { machine, issue_type, issue_subtype?, colors?, description, photos?, status?, severity?, time_spent?, notes? }
 */
router.post('/issues', asyncHandler(async (req, res) => {
  // Validate input
  const validation = validateMaintenanceIssue(req.body)
  if (!validation.valid) {
    return res.status(400).json(validationError(validation.errors))
  }

  const db = await getDatabase()
  const issue = await Maintenance.createIssue(db, req.body)

  res.status(201).json(created(issue, issue.id))
}))

/**
 * PUT /api/v1/maintenance/issues/:id
 * Update maintenance issue
 * Body: { machine?, issue_type?, issue_subtype?, colors?, description?, photos?, status?, severity?, time_spent?, notes? }
 */
router.put('/issues/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid issue ID'))
  }

  // Validate status if provided
  if (req.body.status && !['open', 'in_progress', 'resolved', 'closed'].includes(req.body.status)) {
    return res.status(400).json(error('ValidationError', 'Invalid status value'))
  }

  // Validate severity if provided
  if (req.body.severity && !['low', 'medium', 'high', 'critical'].includes(req.body.severity)) {
    return res.status(400).json(error('ValidationError', 'Invalid severity value'))
  }

  const db = await getDatabase()
  const updated = await Maintenance.updateIssue(db, id, req.body)

  if (!updated) {
    return res.status(404).json(notFound('Maintenance issue', id))
  }

  res.json(success(updated))
}))

/**
 * DELETE /api/v1/maintenance/issues/:id
 * Delete maintenance issue
 */
router.delete('/issues/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid issue ID'))
  }

  const db = await getDatabase()
  const deleted = await Maintenance.deleteIssue(db, id)

  if (!deleted) {
    return res.status(404).json(notFound('Maintenance issue', id))
  }

  res.json(success({ message: 'Maintenance issue deleted successfully' }))
}))

// ===== MAINTENANCE LOGS =====

/**
 * GET /api/v1/maintenance/logs
 * Get all maintenance logs with optional filters
 * Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/logs', asyncHandler(async (req, res) => {
  const db = await getDatabase()

  const filters = {}
  if (req.query.startDate) filters.startDate = req.query.startDate
  if (req.query.endDate) filters.endDate = req.query.endDate

  const logs = await MaintenanceLogs.getAllLogs(db, filters)

  // Parse machines JSON for each log
  const parsedLogs = logs.map(log => ({
    ...log,
    machines: log.machines ? JSON.parse(log.machines) : null
  }))

  res.json(success(parsedLogs, { count: parsedLogs.length }))
}))

/**
 * GET /api/v1/maintenance/logs/recent
 * Get recent maintenance logs
 * Query: ?limit=10
 */
router.get('/logs/recent', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const limit = parseInt(req.query.limit) || 10

  const logs = await MaintenanceLogs.getRecentLogs(db, limit)

  // Parse machines JSON for each log
  const parsedLogs = logs.map(log => ({
    ...log,
    machines: log.machines ? JSON.parse(log.machines) : null
  }))

  res.json(success(parsedLogs, { count: parsedLogs.length }))
}))

/**
 * GET /api/v1/maintenance/logs/:id
 * Get specific maintenance log
 */
router.get('/logs/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid log ID'))
  }

  const db = await getDatabase()
  const log = await MaintenanceLogs.getLogById(db, id)

  if (!log) {
    return res.status(404).json(notFound('Maintenance log', id))
  }

  // Parse machines JSON
  log.machines = log.machines ? JSON.parse(log.machines) : null

  res.json(success(log))
}))

/**
 * POST /api/v1/maintenance/logs
 * Create new maintenance log
 * Body: { date, time?, machines?, description, notes?, performed_by? }
 */
router.post('/logs', asyncHandler(async (req, res) => {
  const { date, time, machines, description, notes, performed_by } = req.body

  // Validate required fields
  const errors = {}

  if (!date) {
    errors.date = 'Date is required'
  } else {
    const dateValidation = validateDate(date, 'date')
    if (!dateValidation.valid) {
      errors.date = dateValidation.error
    }
  }

  if (!description || description.trim() === '') {
    errors.description = 'Description is required'
  }

  if (time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
    errors.time = 'Time must be in HH:MM format (24-hour)'
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json(validationError(errors))
  }

  const db = await getDatabase()
  const log = await MaintenanceLogs.createLog(db, {
    date,
    time: time || null,
    machines: machines || null,
    description: description.trim(),
    notes: notes?.trim() || null,
    performed_by: performed_by?.trim() || null
  })

  // Parse machines for response
  log.machines = log.machines ? JSON.parse(log.machines) : null

  res.status(201).json(created(log, log.id))
}))

/**
 * PUT /api/v1/maintenance/logs/:id
 * Update maintenance log
 */
router.put('/logs/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid log ID'))
  }

  const db = await getDatabase()
  const existingLog = await MaintenanceLogs.getLogById(db, id)

  if (!existingLog) {
    return res.status(404).json(notFound('Maintenance log', id))
  }

  const { date, time, machines, description, notes, performed_by } = req.body

  // Validate if provided
  const errors = {}

  if (date) {
    const dateValidation = validateDate(date, 'date')
    if (!dateValidation.valid) {
      errors.date = dateValidation.error
    }
  }

  if (time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
    errors.time = 'Time must be in HH:MM format (24-hour)'
  }

  if (description !== undefined && description.trim() === '') {
    errors.description = 'Description cannot be empty'
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json(validationError(errors))
  }

  const updates = {}
  if (date !== undefined) updates.date = date
  if (time !== undefined) updates.time = time || null
  if (machines !== undefined) updates.machines = machines || null
  if (description !== undefined) updates.description = description.trim()
  if (notes !== undefined) updates.notes = notes?.trim() || null
  if (performed_by !== undefined) updates.performed_by = performed_by?.trim() || null

  const updatedLog = await MaintenanceLogs.updateLog(db, id, updates)

  // Parse machines for response
  updatedLog.machines = updatedLog.machines ? JSON.parse(updatedLog.machines) : null

  res.json(success(updatedLog))
}))

/**
 * DELETE /api/v1/maintenance/logs/:id
 * Delete maintenance log
 */
router.delete('/logs/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid log ID'))
  }

  const db = await getDatabase()
  const deleted = await MaintenanceLogs.deleteLog(db, id)

  if (!deleted) {
    return res.status(404).json(notFound('Maintenance log', id))
  }

  res.json(success({ message: 'Maintenance log deleted successfully' }))
}))

export default router
