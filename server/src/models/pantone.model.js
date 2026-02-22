/**
 * Pantone Model
 * Database operations for Pantone color tracking
 */

import { promisifyDb } from '../config/database.js'
import { getCurrentDateTime } from '../utils/dateHelpers.js'
import { buildPagination } from '../utils/queryHelpers.js'

// Map raw sheet names to official Pantone book names
const SHEET_TO_BOOK_MAP = {
  'Pantone Coated': 'Formula Guide Solid Coated',
  '+2000 Coated': 'Formula Guide Solid Coated',
  '+3500 Coated': 'Formula Guide Solid Coated',
  '+4000 Coated': 'Formula Guide Solid Coated',
  '+6000 Coated': 'Formula Guide Solid Coated',
  'Color Bridge': 'Formula Guide Solid Coated',
  'Pastel Coated': 'Pastels & Neons Coated',
  'Metallic': 'Metallic Formula Guide',
  'Premium Metallic': 'Metallic Formula Guide'
}

// Reverse map: official book name to raw sheet names
const BOOK_TO_SHEETS_MAP = {
  'Formula Guide Solid Coated': ['Pantone Coated', '+2000 Coated', '+3500 Coated', '+4000 Coated', '+6000 Coated', 'Color Bridge'],
  'Pastels & Neons Coated': ['Pastel Coated'],
  'Metallic Formula Guide': ['Metallic', 'Premium Metallic']
}

// ===== PANTONE COLORS =====

/**
 * Get all colors with pagination
 * @param {sqlite3.Database} db - Database instance
 * @param {Object} options - Options { page?, limit?, status?, search? }
 * @returns {Promise<Object>} Object with colors array and pagination metadata
 */
export async function getAllColors(db, options = {}) {
  const dbPromise = promisifyDb(db)

  const pagination = buildPagination(options.page, options.limit || 50)
  let query = 'SELECT * FROM pantone_colors WHERE 1=1'
  const params = []

  // Apply filters
  if (options.status) {
    if (options.status === 'old') {
      // Special handling for 'old' status: include colors that are old OR have match_date > 5 years ago
      const fiveYearsAgo = new Date()
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
      const fiveYearsAgoStr = fiveYearsAgo.toISOString().split('T')[0]

      query += ' AND (status = ? OR (status = ? AND match_date IS NOT NULL AND match_date < ?))'
      params.push('old', 'matched', fiveYearsAgoStr)
    } else {
      query += ' AND status = ?'
      params.push(options.status)
    }
  }

  if (options.search) {
    query += ' AND name LIKE ?'
    params.push(`%${options.search}%`)
  }

  query += ' ORDER BY name'

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM pantone_colors WHERE 1=1'
  const countParams = []

  if (options.status) {
    if (options.status === 'old') {
      // Same logic for count query
      const fiveYearsAgo = new Date()
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
      const fiveYearsAgoStr = fiveYearsAgo.toISOString().split('T')[0]

      countQuery += ' AND (status = ? OR (status = ? AND match_date IS NOT NULL AND match_date < ?))'
      countParams.push('old', 'matched', fiveYearsAgoStr)
    } else {
      countQuery += ' AND status = ?'
      countParams.push(options.status)
    }
  }

  if (options.search) {
    countQuery += ' AND name LIKE ?'
    countParams.push(`%${options.search}%`)
  }

  const { total } = await dbPromise.get(countQuery, countParams)

  // Get paginated results
  query += ' LIMIT ? OFFSET ?'
  params.push(pagination.limit, pagination.offset)

  const colors = await dbPromise.all(query, params)

  // Parse color_data JSON
  const parsedColors = colors.map(color => ({
    ...color,
    color_data: JSON.parse(color.color_data)
  }))

  return {
    colors: parsedColors,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      hasNext: pagination.offset + pagination.limit < total,
      hasPrev: pagination.page > 1
    }
  }
}

/**
 * Get color by ID
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Color ID
 * @returns {Promise<Object|null>} Color or null
 */
export async function getColorById(db, id) {
  const dbPromise = promisifyDb(db)

  const color = await dbPromise.get(
    'SELECT * FROM pantone_colors WHERE id = ?',
    [id]
  )

  if (!color) {
    return null
  }

  return {
    ...color,
    color_data: JSON.parse(color.color_data)
  }
}

/**
 * Get colors by status with pagination
 * @param {sqlite3.Database} db - Database instance
 * @param {string} status - Status value
 * @param {Object} pagination - Pagination options { page?, limit? }
 * @returns {Promise<Object>} Object with colors array and pagination metadata
 */
export async function getColorsByStatus(db, status, pagination = {}) {
  return await getAllColors(db, { ...pagination, status })
}

/**
 * Search colors by name with pagination
 * @param {sqlite3.Database} db - Database instance
 * @param {string} searchTerm - Search term
 * @param {Object} pagination - Pagination options { page?, limit? }
 * @returns {Promise<Object>} Object with colors array and pagination metadata
 */
export async function searchColors(db, searchTerm, pagination = {}) {
  return await getAllColors(db, { ...pagination, search: searchTerm })
}

/**
 * Create a new color
 * @param {sqlite3.Database} db - Database instance
 * @param {Object} colorData - Color data { name, color_data, status?, match_date? }
 * @returns {Promise<Object>} Created color with ID
 */
export async function createColor(db, colorData) {
  const dbPromise = promisifyDb(db)

  const now = getCurrentDateTime()

  const result = await dbPromise.run(
    `INSERT INTO pantone_colors
    (color_data, name, status, match_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [
      JSON.stringify(colorData.color_data),
      colorData.name,
      colorData.status || 'not_matched',
      colorData.match_date || null,
      now,
      now
    ]
  )

  return {
    id: result.lastID,
    ...colorData,
    status: colorData.status || 'not_matched',
    created_at: now,
    updated_at: now
  }
}

/**
 * Bulk create colors
 * @param {sqlite3.Database} db - Database instance
 * @param {Array} colorsArray - Array of color objects
 * @returns {Promise<Object>} Object with count and first/last IDs
 */
export async function bulkCreateColors(db, colorsArray) {
  const dbPromise = promisifyDb(db)

  const now = getCurrentDateTime()
  let firstId = null
  let lastId = null

  for (const colorData of colorsArray) {
    const result = await dbPromise.run(
      `INSERT INTO pantone_colors
      (color_data, name, status, match_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        JSON.stringify(colorData.color_data || colorData),
        colorData.name,
        colorData.status || 'not_matched',
        colorData.match_date || null,
        now,
        now
      ]
    )

    if (firstId === null) {
      firstId = result.lastID
    }
    lastId = result.lastID
  }

  return {
    count: colorsArray.length,
    firstId,
    lastId
  }
}

/**
 * Update a color
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Color ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated color or null if not found
 */
export async function updateColor(db, id, updates) {
  const dbPromise = promisifyDb(db)

  // Check if exists
  const existing = await getColorById(db, id)
  if (!existing) {
    return null
  }

  const now = getCurrentDateTime()
  const fields = []
  const values = []

  // Allowed update fields
  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }

  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status)
  }

  if (updates.match_date !== undefined) {
    fields.push('match_date = ?')
    values.push(updates.match_date)
  }

  if (updates.color_data !== undefined) {
    fields.push('color_data = ?')
    values.push(JSON.stringify(updates.color_data))
  }

  if (fields.length === 0) {
    return existing
  }

  // Always update updated_at
  fields.push('updated_at = ?')
  values.push(now)

  // Add ID to params
  values.push(id)

  await dbPromise.run(
    `UPDATE pantone_colors SET ${fields.join(', ')} WHERE id = ?`,
    values
  )

  // Return updated color
  return await getColorById(db, id)
}

/**
 * Delete a color
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Color ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteColor(db, id) {
  const dbPromise = promisifyDb(db)

  // Check if exists
  const existing = await getColorById(db, id)
  if (!existing) {
    return false
  }

  await dbPromise.run('DELETE FROM pantone_colors WHERE id = ?', [id])

  return true
}

/**
 * Update color status and match date
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Color ID
 * @param {string} status - New status
 * @param {string} matchDate - Match date (YYYY-MM-DD)
 * @returns {Promise<Object|null>} Updated color or null if not found
 */
export async function updateColorStatus(db, id, status, matchDate) {
  return await updateColor(db, id, { status, match_date: matchDate })
}

/**
 * Get color statistics (counts by status)
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<Object>} Statistics object
 */
export async function getColorStats(db) {
  const dbPromise = promisifyDb(db)

  const stats = await dbPromise.all(
    `SELECT
      status,
      COUNT(*) as count
    FROM pantone_colors
    GROUP BY status`
  )

  const total = await dbPromise.get(
    'SELECT COUNT(*) as total FROM pantone_colors'
  )

  // Count colors with old match_date (over 5 years old)
  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
  const fiveYearsAgoStr = fiveYearsAgo.toISOString().split('T')[0]

  const oldMatchDateCount = await dbPromise.get(
    'SELECT COUNT(*) as count FROM pantone_colors WHERE status = ? AND match_date IS NOT NULL AND match_date < ?',
    ['matched', fiveYearsAgoStr]
  )

  // Convert to object
  const statusCounts = {}
  stats.forEach(stat => {
    statusCounts[stat.status] = stat.count
  })

  // Add colors with old match_date to the old count
  const oldCount = (statusCounts.old || 0) + (oldMatchDateCount.count || 0)

  return {
    total: total.total,
    byStatus: statusCounts,
    matched: statusCounts.matched || 0,
    not_matched: statusCounts.not_matched || 0,
    old: oldCount
  }
}

/**
 * Enhanced search with collection and color space filters
 * @param {sqlite3.Database} db - Database instance
 * @param {Object} options - Search options
 * @param {string} options.query - Search query for name
 * @param {string} options.collection - Filter by collection name
 * @param {boolean} options.hasRGB - Filter colors with RGB values
 * @param {boolean} options.hasCMYK - Filter colors with CMYK values
 * @param {boolean} options.hasLAB - Filter colors with LAB values
 * @param {number} options.page - Page number for pagination
 * @param {number} options.limit - Items per page
 * @returns {Promise<Object>} Object with colors array and pagination metadata
 */
export async function searchEnhanced(db, options = {}) {
  const dbPromise = promisifyDb(db)

  const pagination = buildPagination(options.page, options.limit || 50)
  let query = 'SELECT * FROM pantone_colors WHERE 1=1'
  const params = []

  // Name search
  if (options.query) {
    query += ' AND name LIKE ?'
    params.push(`%${options.query}%`)
  }

  // Collection filter (map official book name to raw sheet names)
  if (options.collection) {
    const sheets = BOOK_TO_SHEETS_MAP[options.collection]
    if (sheets && sheets.length > 0) {
      const placeholders = sheets.map(() => '?').join(',')
      query += ` AND json_extract(color_data, '$.sheet') IN (${placeholders})`
      params.push(...sheets)
    }
  }

  // Color space filters (JSON field existence checks)
  if (options.hasRGB) {
    query += " AND json_extract(color_data, '$.rgb') IS NOT NULL"
  }

  if (options.hasCMYK) {
    query += " AND json_extract(color_data, '$.cmyk') IS NOT NULL"
  }

  if (options.hasLAB) {
    query += " AND json_extract(color_data, '$.lab') IS NOT NULL"
  }

  // Status filter
  if (options.status) {
    query += ' AND status = ?'
    params.push(options.status)
  }

  query += ' ORDER BY name'

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM pantone_colors WHERE 1=1'
  const countParams = []

  if (options.query) {
    countQuery += ' AND name LIKE ?'
    countParams.push(`%${options.query}%`)
  }

  if (options.collection) {
    const sheets = BOOK_TO_SHEETS_MAP[options.collection]
    if (sheets && sheets.length > 0) {
      const placeholders = sheets.map(() => '?').join(',')
      countQuery += ` AND json_extract(color_data, '$.sheet') IN (${placeholders})`
      countParams.push(...sheets)
    }
  }

  if (options.hasRGB) {
    countQuery += " AND json_extract(color_data, '$.rgb') IS NOT NULL"
  }

  if (options.hasCMYK) {
    countQuery += " AND json_extract(color_data, '$.cmyk') IS NOT NULL"
  }

  if (options.hasLAB) {
    countQuery += " AND json_extract(color_data, '$.lab') IS NOT NULL"
  }

  if (options.status) {
    countQuery += ' AND status = ?'
    countParams.push(options.status)
  }

  const { total } = await dbPromise.get(countQuery, countParams)

  // Get paginated results
  query += ' LIMIT ? OFFSET ?'
  params.push(pagination.limit, pagination.offset)

  const colors = await dbPromise.all(query, params)

  // Parse color_data JSON
  const parsedColors = colors.map(color => ({
    ...color,
    color_data: JSON.parse(color.color_data)
  }))

  return {
    colors: parsedColors,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      hasNext: pagination.offset + pagination.limit < total,
      hasPrev: pagination.page > 1
    }
  }
}

/**
 * Get unique collection names from all colors
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<Array<string>>} Array of official Pantone book names
 */
export async function getCollections(db) {
  // Return official Pantone book names in display order
  return [
    'Formula Guide Solid Coated',
    'Pastels & Neons Coated',
    'Metallic Formula Guide'
  ]
}
