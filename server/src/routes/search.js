/**
 * Search API Routes
 * Unified search across all tools and data types
 */

import express from 'express'
import { getDatabase } from '../config/database.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { success, error, validationError } from '../utils/responses.js'
import * as Search from '../models/search.model.js'

const router = express.Router()

// Apply authentication to all routes
router.use(requireAuth)

/**
 * GET /api/v1/search
 * Search across all data types
 * Query: ?q=query&types=inventory,pantone&limit=10
 */
router.get('/', asyncHandler(async (req, res) => {
  const query = req.query.q?.trim()

  if (!query) {
    return res.status(400).json(validationError(['Search query is required']))
  }

  if (query.length < 2) {
    return res.status(400).json(validationError(['Search query must be at least 2 characters']))
  }

  const types = req.query.types ? req.query.types.split(',') : undefined
  const limit = parseInt(req.query.limit) || 10

  if (limit < 1 || limit > 50) {
    return res.status(400).json(validationError(['Limit must be between 1 and 50']))
  }

  const db = await getDatabase()
  const results = await Search.searchAll(db, query, { types, limit })

  // Count total results
  const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0)

  res.json(success(results, { query, totalResults, types: Object.keys(results) }))
}))

/**
 * GET /api/v1/search/inventory
 * Search inventory items only
 * Query: ?q=query&limit=20
 */
router.get('/inventory', asyncHandler(async (req, res) => {
  const query = req.query.q?.trim()

  if (!query || query.length < 2) {
    return res.status(400).json(validationError(['Search query must be at least 2 characters']))
  }

  const limit = parseInt(req.query.limit) || 20
  const db = await getDatabase()
  const results = await Search.searchInventory(db, query, limit)

  res.json(success(results, { query, count: results.length }))
}))

/**
 * GET /api/v1/search/pantone
 * Search pantone colors only
 * Query: ?q=query&limit=20
 */
router.get('/pantone', asyncHandler(async (req, res) => {
  const query = req.query.q?.trim()

  if (!query || query.length < 2) {
    return res.status(400).json(validationError(['Search query must be at least 2 characters']))
  }

  const limit = parseInt(req.query.limit) || 20
  const db = await getDatabase()
  const results = await Search.searchPantone(db, query, limit)

  res.json(success(results, { query, count: results.length }))
}))

/**
 * GET /api/v1/search/maintenance
 * Search maintenance issues only
 * Query: ?q=query&limit=20
 */
router.get('/maintenance', asyncHandler(async (req, res) => {
  const query = req.query.q?.trim()

  if (!query || query.length < 2) {
    return res.status(400).json(validationError(['Search query must be at least 2 characters']))
  }

  const limit = parseInt(req.query.limit) || 20
  const db = await getDatabase()
  const results = await Search.searchMaintenance(db, query, limit)

  res.json(success(results, { query, count: results.length }))
}))

/**
 * GET /api/v1/search/todos
 * Search todos only
 * Query: ?q=query&limit=20
 */
router.get('/todos', asyncHandler(async (req, res) => {
  const query = req.query.q?.trim()

  if (!query || query.length < 2) {
    return res.status(400).json(validationError(['Search query must be at least 2 characters']))
  }

  const limit = parseInt(req.query.limit) || 20
  const db = await getDatabase()
  const results = await Search.searchTodos(db, query, limit)

  res.json(success(results, { query, count: results.length }))
}))

/**
 * GET /api/v1/search/suggestions
 * Get search suggestions
 * Query: ?type=inventory&limit=5
 */
router.get('/suggestions', asyncHandler(async (req, res) => {
  const type = req.query.type || 'all'
  const limit = parseInt(req.query.limit) || 5

  if (limit < 1 || limit > 20) {
    return res.status(400).json(validationError(['Limit must be between 1 and 20']))
  }

  const db = await getDatabase()
  const suggestions = await Search.getSearchSuggestions(db, type, limit)

  res.json(success(suggestions))
}))

export default router
