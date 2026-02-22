/**
 * Migration API Routes
 * Handles data import/export between localStorage and SQLite
 */

import express from 'express'
import { getDatabase } from '../config/database.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { success, error } from '../utils/responses.js'
import * as Migration from '../models/migration.model.js'

const router = express.Router()

/**
 * POST /api/v1/migration/import
 * Import data from localStorage format
 * Body: { data: { ... localStorage data ... } } or raw localStorage data
 */
router.post('/import', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  if (!req.body) {
    return res.status(400).json(error('ValidationError', 'Request body is required'))
  }

  // Validate data structure
  const validation = Migration.validateImportData(req.body)
  if (!validation.valid) {
    return res.status(400).json(error('ValidationError', `Invalid data format: ${validation.errors.join(', ')}`))
  }

  const db = await getDatabase()

  try {
    const stats = await Migration.importAllData(db, req.body)

    res.json(success({
      message: 'Data imported successfully',
      stats
    }))
  } catch (err) {
    if (err.message.includes('Invalid data')) {
      return res.status(400).json(error('ValidationError', err.message))
    }
    throw err
  }
}))

/**
 * GET /api/v1/migration/export
 * Export all database data to localStorage format
 */
router.get('/export', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const exported = await Migration.exportAllData(db)

  res.json(success(exported))
}))

/**
 * POST /api/v1/migration/clear
 * Clear all data from database
 * Body: { confirm: true } - Required for safety
 */
router.post('/clear', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  // Require confirmation
  if (!req.body.confirm || req.body.confirm !== true) {
    return res.status(400).json(error('ValidationError', 'Must provide { confirm: true } to clear all data'))
  }

  const db = await getDatabase()
  const stats = await Migration.clearAllData(db)

  res.json(success({
    message: 'All data cleared successfully',
    stats
  }))
}))

export default router
