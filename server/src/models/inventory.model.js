/**
 * Inventory Model
 * Database operations for inventory items and usage history
 */

import { promisifyDb } from '../config/database.js'
import { getCurrentDateTime } from '../utils/dateHelpers.js'

// ===== INVENTORY ITEMS =====

/**
 * Get all inventory items
 * @param {sqlite3.Database} db - Database instance
 * @param {Object} filters - Optional filters { printer?, category? }
 * @returns {Promise<Array>} Array of inventory items
 */
export async function getAllItems(db, filters = {}) {
  const dbPromise = promisifyDb(db)

  let query = 'SELECT * FROM inventory_items'
  const conditions = []
  const params = []

  if (filters.printer) {
    conditions.push('printer = ?')
    params.push(filters.printer)
  }

  if (filters.category) {
    conditions.push('category = ?')
    params.push(filters.category)
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }

  query += ' ORDER BY printer, category, name'

  const items = await dbPromise.all(query, params)
  return items
}

/**
 * Get inventory items by printer
 * @param {sqlite3.Database} db - Database instance
 * @param {string} printer - Printer name
 * @returns {Promise<Array>} Array of inventory items
 */
export async function getItemsByPrinter(db, printer) {
  const dbPromise = promisifyDb(db)

  const items = await dbPromise.all(
    'SELECT * FROM inventory_items WHERE printer = ? ORDER BY category, name',
    [printer]
  )

  return items
}

/**
 * Get inventory item by ID
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Item ID
 * @returns {Promise<Object|null>} Inventory item or null
 */
export async function getItemById(db, id) {
  const dbPromise = promisifyDb(db)

  const item = await dbPromise.get(
    'SELECT * FROM inventory_items WHERE id = ?',
    [id]
  )

  return item || null
}

/**
 * Get inventory item by barcode
 * @param {sqlite3.Database} db - Database instance
 * @param {string} barcode - Barcode value
 * @returns {Promise<Object|null>} Inventory item or null
 */
export async function getItemByBarcode(db, barcode) {
  const dbPromise = promisifyDb(db)

  const item = await dbPromise.get(
    'SELECT * FROM inventory_items WHERE barcode = ?',
    [barcode]
  )

  return item || null
}

/**
 * Create a new inventory item
 * @param {sqlite3.Database} db - Database instance
 * @param {Object} itemData - Item data { name, printer, category, stock, unit, barcode?, item_id? }
 * @returns {Promise<Object>} Created item with ID
 */
export async function createItem(db, itemData) {
  const dbPromise = promisifyDb(db)

  const now = getCurrentDateTime()

  // id is TEXT PRIMARY KEY, use provided id or generate one
  const id = itemData.id || itemData.item_id || `ITEM-${Date.now()}`

  const threshold = itemData.low_stock_threshold !== undefined ? itemData.low_stock_threshold : 2

  await dbPromise.run(
    `INSERT INTO inventory_items
    (id, name, printer, category, stock, unit, barcode, low_stock_threshold, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      itemData.name,
      itemData.printer,
      itemData.category,
      itemData.stock || 0,
      itemData.unit || 'unit',
      itemData.barcode || null,
      threshold,
      now,
      now
    ]
  )

  return {
    id,
    name: itemData.name,
    printer: itemData.printer,
    category: itemData.category,
    stock: itemData.stock || 0,
    unit: itemData.unit || 'unit',
    barcode: itemData.barcode || null,
    low_stock_threshold: threshold,
    created_at: now,
    updated_at: now
  }
}

/**
 * Update an inventory item
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Item ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated item or null if not found
 */
export async function updateItem(db, id, updates) {
  const dbPromise = promisifyDb(db)

  // Check if item exists
  const existing = await getItemById(db, id)
  if (!existing) {
    return null
  }

  const now = getCurrentDateTime()
  const fields = []
  const values = []

  // Allowed update fields (id cannot be updated as it's PRIMARY KEY)
  const allowedFields = ['name', 'stock', 'unit', 'printer', 'category', 'barcode', 'low_stock_threshold']

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`)
      values.push(updates[field])
    }
  }

  if (fields.length === 0) {
    // No fields to update
    return existing
  }

  // Always update updated_at
  fields.push('updated_at = ?')
  values.push(now)

  // Add ID to params
  values.push(id)

  await dbPromise.run(
    `UPDATE inventory_items SET ${fields.join(', ')} WHERE id = ?`,
    values
  )

  // Return updated item
  return await getItemById(db, id)
}

/**
 * Update stock level and record usage history
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Item ID
 * @param {number} stockChange - Stock change (negative for usage)
 * @returns {Promise<Object|null>} Updated item or null if not found
 */
export async function updateStock(db, id, stockChange) {
  const dbPromise = promisifyDb(db)

  // Get current item
  const item = await getItemById(db, id)
  if (!item) {
    return null
  }

  const newStock = item.stock + stockChange
  if (newStock < 0) {
    throw new Error('Stock cannot be negative')
  }

  const now = getCurrentDateTime()

  // Update stock
  await dbPromise.run(
    'UPDATE inventory_items SET stock = ?, updated_at = ? WHERE id = ?',
    [newStock, now, id]
  )

  // Record usage history if stock decreased
  if (stockChange < 0) {
    await dbPromise.run(
      `INSERT INTO inventory_usage_history
      (item_id, item_name, printer, category, quantity, unit, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.name,
        item.printer,
        item.category,
        Math.abs(stockChange),
        item.unit,
        now
      ]
    )
  }

  // Return updated item
  return await getItemById(db, id)
}

/**
 * Delete an inventory item
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Item ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteItem(db, id) {
  const dbPromise = promisifyDb(db)

  // Check if exists
  const existing = await getItemById(db, id)
  if (!existing) {
    return false
  }

  await dbPromise.run('DELETE FROM inventory_items WHERE id = ?', [id])

  return true
}

/**
 * Get critical stock items using the v_critical_stock view
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<Array>} Array of critical stock items
 */
export async function getCriticalStock(db) {
  const dbPromise = promisifyDb(db)

  const items = await dbPromise.all(
    'SELECT * FROM v_critical_stock ORDER BY stock ASC'
  )

  return items
}

// ===== USAGE HISTORY =====

/**
 * Get usage history with optional filters
 * @param {sqlite3.Database} db - Database instance
 * @param {Object} filters - Filters { startDate?, endDate?, printer?, category?, limit? }
 * @returns {Promise<Array>} Array of usage history entries
 */
export async function getUsageHistory(db, filters = {}) {
  const dbPromise = promisifyDb(db)

  let query = 'SELECT * FROM inventory_usage_history WHERE 1=1'
  const params = []

  if (filters.startDate) {
    query += ' AND DATE(timestamp) >= ?'
    params.push(filters.startDate)
  }

  if (filters.endDate) {
    query += ' AND DATE(timestamp) <= ?'
    params.push(filters.endDate)
  }

  if (filters.printer) {
    query += ' AND printer = ?'
    params.push(filters.printer)
  }

  if (filters.category) {
    query += ' AND category = ?'
    params.push(filters.category)
  }

  query += ' ORDER BY timestamp DESC'

  if (filters.limit) {
    query += ' LIMIT ?'
    params.push(parseInt(filters.limit))
  }

  const history = await dbPromise.all(query, params)
  return history
}

/**
 * Get usage history by date range
 * @param {sqlite3.Database} db - Database instance
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of usage history entries
 */
export async function getUsageByDateRange(db, startDate, endDate) {
  return await getUsageHistory(db, { startDate, endDate })
}

/**
 * Get usage statistics by printer
 * @param {sqlite3.Database} db - Database instance
 * @param {string} printer - Printer name
 * @param {number} days - Number of days to look back (default 30)
 * @returns {Promise<Object>} Usage statistics
 */
export async function getUsageStatsByPrinter(db, printer, days = 30) {
  const dbPromise = promisifyDb(db)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const stats = await dbPromise.all(
    `SELECT
      category,
      item_name,
      SUM(quantity) as total_quantity,
      COUNT(*) as usage_count,
      MIN(timestamp) as first_use,
      MAX(timestamp) as last_use
    FROM inventory_usage_history
    WHERE printer = ? AND timestamp >= ?
    GROUP BY category, item_name
    ORDER BY total_quantity DESC`,
    [printer, cutoffDate.toISOString()]
  )

  return {
    printer,
    days,
    items: stats,
    totalUsageEvents: stats.reduce((sum, item) => sum + item.usage_count, 0)
  }
}
