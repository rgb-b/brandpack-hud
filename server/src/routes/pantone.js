/**
 * Pantone API Routes
 * Handles Pantone color tracking endpoints
 */

import express from 'express'
import { getDatabase } from '../config/database.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { success, error, notFound, validationError, created } from '../utils/responses.js'
import { validatePantoneColor } from '../utils/validators.js'
import * as Pantone from '../models/pantone.model.js'

const router = express.Router()

// Apply authentication to all routes
router.use(requireAuth)

// ===== PANTONE COLORS =====

/**
 * GET /api/v1/pantone
 * Get all Pantone colors with pagination
 * Query: ?page=1&limit=50&status=matched&search=PANTONE
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = await getDatabase()

  const options = {
    page: req.query.page || 1,
    limit: req.query.limit || 50,
    status: req.query.status,
    search: req.query.search
  }

  // Validate page and limit
  const page = parseInt(options.page)
  const limit = parseInt(options.limit)

  if (isNaN(page) || page < 1) {
    return res.status(400).json(error('ValidationError', 'page must be a positive integer'))
  }

  if (isNaN(limit) || limit < 1 || limit > 1000) {
    return res.status(400).json(error('ValidationError', 'limit must be between 1 and 1000'))
  }

  options.page = page
  options.limit = limit

  const result = await Pantone.getAllColors(db, options)

  res.json(success(result.colors, result.pagination))
}))

/**
 * GET /api/v1/pantone/stats
 * Get Pantone color statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const stats = await Pantone.getColorStats(db)

  res.json(success(stats))
}))

/**
 * GET /api/v1/pantone/collections
 * Get unique collection names
 */
router.get('/collections', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const collections = await Pantone.getCollections(db)

  res.json(success(collections, { count: collections.length }))
}))

/**
 * GET /api/v1/pantone/search
 * Enhanced search with collection and color space filters
 * Query: ?q=PANTONE&collection=Solid%20Coated&hasRGB=true&hasCMYK=true&hasLAB=true&page=1&limit=50
 */
router.get('/search', asyncHandler(async (req, res) => {
  const db = await getDatabase()

  const options = {
    query: req.query.q,
    collection: req.query.collection,
    hasRGB: req.query.hasRGB === 'true',
    hasCMYK: req.query.hasCMYK === 'true',
    hasLAB: req.query.hasLAB === 'true',
    status: req.query.status,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 50
  }

  // Validate page and limit
  if (isNaN(options.page) || options.page < 1) {
    return res.status(400).json(error('ValidationError', 'page must be a positive integer'))
  }

  if (isNaN(options.limit) || options.limit < 1 || options.limit > 1000) {
    return res.status(400).json(error('ValidationError', 'limit must be between 1 and 1000'))
  }

  const result = await Pantone.searchEnhanced(db, options)

  res.json(success(result.colors, result.pagination))
}))

/**
 * GET /api/v1/pantone/:id
 * Get specific Pantone color
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid color ID'))
  }

  const db = await getDatabase()
  const color = await Pantone.getColorById(db, id)

  if (!color) {
    return res.status(404).json(notFound('Pantone color', id))
  }

  res.json(success(color))
}))

/**
 * POST /api/v1/pantone
 * Create a new Pantone color
 * Body: { name, color_data, status?, match_date? }
 */
router.post('/', asyncHandler(async (req, res) => {
  // Validate input
  const validation = validatePantoneColor(req.body)
  if (!validation.valid) {
    return res.status(400).json(validationError(validation.errors))
  }

  if (!req.body.color_data) {
    return res.status(400).json(error('ValidationError', 'color_data is required'))
  }

  const db = await getDatabase()
  const color = await Pantone.createColor(db, req.body)

  res.status(201).json(created(color, color.id))
}))

/**
 * POST /api/v1/pantone/bulk
 * Bulk import Pantone colors
 * Body: { colors: [{ name, color_data, status?, match_date? }, ...] }
 */
router.post('/bulk', asyncHandler(async (req, res) => {
  if (!req.body.colors || !Array.isArray(req.body.colors)) {
    return res.status(400).json(error('ValidationError', 'colors array is required'))
  }

  if (req.body.colors.length === 0) {
    return res.status(400).json(error('ValidationError', 'colors array cannot be empty'))
  }

  // Validate each color
  for (let i = 0; i < req.body.colors.length; i++) {
    const colorData = req.body.colors[i]

    if (!colorData.name) {
      return res.status(400).json(error('ValidationError', `Color at index ${i} is missing name`))
    }
  }

  const db = await getDatabase()
  const result = await Pantone.bulkCreateColors(db, req.body.colors)

  res.status(201).json(success({
    message: `Successfully imported ${result.count} colors`,
    ...result
  }))
}))

/**
 * PUT /api/v1/pantone/:id
 * Update Pantone color
 * Body: { name?, color_data?, status?, match_date? }
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid color ID'))
  }

  // Validate status if provided
  if (req.body.status && !['matched', 'not_matched', 'old'].includes(req.body.status)) {
    return res.status(400).json(error('ValidationError', 'Invalid status value. Must be: matched, not_matched, or old'))
  }

  const db = await getDatabase()
  const updated = await Pantone.updateColor(db, id, req.body)

  if (!updated) {
    return res.status(404).json(notFound('Pantone color', id))
  }

  res.json(success(updated))
}))

/**
 * DELETE /api/v1/pantone/:id
 * Delete Pantone color
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid color ID'))
  }

  const db = await getDatabase()
  const deleted = await Pantone.deleteColor(db, id)

  if (!deleted) {
    return res.status(404).json(notFound('Pantone color', id))
  }

  res.json(success({ message: 'Pantone color deleted successfully' }))
}))

export default router
