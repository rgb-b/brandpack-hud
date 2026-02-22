/**
 * Inventory API Routes
 * Handles inventory items and usage history endpoints
 */

import express from 'express'
import { getDatabase } from '../config/database.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { success, error, notFound, validationError, created } from '../utils/responses.js'
import { validateInventoryItem, validateStockUpdate } from '../utils/validators.js'
import * as Inventory from '../models/inventory.model.js'

const router = express.Router()

// ===== INVENTORY ITEMS =====

/**
 * GET /api/v1/inventory
 * Get all inventory items
 * Query: ?printer=X&category=Y
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = await getDatabase()

  const filters = {}
  if (req.query.printer) filters.printer = req.query.printer
  if (req.query.category) filters.category = req.query.category

  const items = await Inventory.getAllItems(db, filters)

  res.json(success(items, { count: items.length }))
}))

/**
 * GET /api/v1/inventory/critical
 * Get critical stock items (stock <= 5)
 */
router.get('/critical', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const items = await Inventory.getCriticalStock(db)

  res.json(success(items, { count: items.length }))
}))

/**
 * GET /api/v1/inventory/barcode/:barcode
 * Get inventory item by barcode
 */
router.get('/barcode/:barcode', asyncHandler(async (req, res) => {
  const barcode = req.params.barcode

  const db = await getDatabase()
  const item = await Inventory.getItemByBarcode(db, barcode)

  if (!item) {
    return res.status(404).json(notFound('Inventory item with barcode', barcode))
  }

  res.json(success(item))
}))

/**
 * GET /api/v1/inventory/usage
 * Get usage history
 * Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&printer=X&category=Y&limit=100
 */
router.get('/usage', asyncHandler(async (req, res) => {
  const db = await getDatabase()

  const filters = {}
  if (req.query.startDate) filters.startDate = req.query.startDate
  if (req.query.endDate) filters.endDate = req.query.endDate
  if (req.query.printer) filters.printer = req.query.printer
  if (req.query.category) filters.category = req.query.category
  if (req.query.limit) filters.limit = req.query.limit

  const history = await Inventory.getUsageHistory(db, filters)

  res.json(success(history, { count: history.length }))
}))

/**
 * GET /api/v1/inventory/:id
 * Get specific inventory item
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id

  const db = await getDatabase()
  const item = await Inventory.getItemById(db, id)

  if (!item) {
    return res.status(404).json(notFound('Inventory item', id))
  }

  res.json(success(item))
}))

/**
 * POST /api/v1/inventory
 * Create new inventory item
 * Body: { name, printer, category, stock?, unit?, item_id? }
 */
router.post('/', asyncHandler(async (req, res) => {
  // Validate input
  const validation = validateInventoryItem(req.body)
  if (!validation.valid) {
    return res.status(400).json(validationError(validation.errors))
  }

  const db = await getDatabase()

  try {
    const item = await Inventory.createItem(db, req.body)
    res.status(201).json(created(item, item.id))
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json(error('ConflictError', 'Item with this item_id already exists'))
    }
    throw err
  }
}))

/**
 * PUT /api/v1/inventory/:id
 * Update inventory item (including stock)
 * Body: { name?, stock?, unit?, printer?, category? }
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id

  // If only updating stock, use updateStock method
  if (Object.keys(req.body).length === 1 && req.body.stock !== undefined) {
    const validation = validateStockUpdate(req.body)
    if (!validation.valid) {
      return res.status(400).json(validationError(validation.errors))
    }

    const db = await getDatabase()
    const item = await Inventory.getItemById(db, id)

    if (!item) {
      return res.status(404).json(notFound('Inventory item', id))
    }

    const stockChange = req.body.stock - item.stock

    try {
      const updated = await Inventory.updateStock(db, id, stockChange)
      return res.json(success(updated))
    } catch (err) {
      if (err.message.includes('cannot be negative')) {
        return res.status(400).json(error('ValidationError', 'Stock cannot be negative'))
      }
      throw err
    }
  }

  // General update
  const db = await getDatabase()

  try {
    const updated = await Inventory.updateItem(db, id, req.body)

    if (!updated) {
      return res.status(404).json(notFound('Inventory item', id))
    }

    res.json(success(updated))
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json(error('ConflictError', 'Item with this item_id already exists'))
    }
    throw err
  }
}))

/**
 * POST /api/v1/inventory/bulk
 * Bulk insert inventory items
 * Body: { items: [{ name, printer, category, stock?, unit?, id?, barcode? }] }
 */
router.post('/bulk', asyncHandler(async (req, res) => {
  const { items } = req.body

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json(validationError(['items array is required and cannot be empty']))
  }

  const db = await getDatabase()
  const results = {
    success: [],
    errors: []
  }

  // Insert each item individually to handle duplicates gracefully
  for (const itemData of items) {
    try {
      // Validate each item
      const validation = validateInventoryItem(itemData)
      if (!validation.valid) {
        results.errors.push({
          item: itemData.name || itemData.id,
          errors: validation.errors
        })
        continue
      }

      const item = await Inventory.createItem(db, itemData)
      results.success.push(item)
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        results.errors.push({
          item: itemData.name || itemData.id,
          errors: ['Item with this ID already exists']
        })
      } else {
        results.errors.push({
          item: itemData.name || itemData.id,
          errors: [err.message]
        })
      }
    }
  }

  const responseData = {
    successCount: results.success.length,
    errorCount: results.errors.length,
    totalRequested: items.length,
    items: results.success,
    errors: results.errors
  }

  // Return 207 Multi-Status if some succeeded and some failed
  if (results.success.length > 0 && results.errors.length > 0) {
    return res.status(207).json(success(responseData))
  }

  // Return 400 if all failed
  if (results.errors.length === items.length) {
    return res.status(400).json(error('BulkInsertError', 'All items failed to insert', responseData))
  }

  // Return 201 if all succeeded
  res.status(201).json(created(responseData, `${results.success.length} items created`))
}))

/**
 * DELETE /api/v1/inventory/:id
 * Delete inventory item
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id

  const db = await getDatabase()
  const deleted = await Inventory.deleteItem(db, id)

  if (!deleted) {
    return res.status(404).json(notFound('Inventory item', id))
  }

  res.json(success({ message: 'Inventory item deleted successfully' }))
}))

export default router
