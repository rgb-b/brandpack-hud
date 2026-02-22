/**
 * Search Model
 * Unified search across all tools and data types
 */

import { promisifyDb } from '../config/database.js'

/**
 * Search across all data types
 * @param {sqlite3.Database} db - Database instance
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {string[]} options.types - Data types to search (default: all)
 * @param {number} options.limit - Max results per type (default: 10)
 * @returns {Promise<Object>} Search results grouped by type
 */
export async function searchAll(db, query, options = {}) {
  const { types = ['inventory', 'pantone', 'maintenance', 'todos', 'productivity'], limit = 10 } = options
  const { all } = promisifyDb(db)

  const searchPattern = `%${query}%`
  const results = {}

  // Search inventory items
  if (types.includes('inventory')) {
    results.inventory = await all(`
      SELECT id, name, printer, category, stock, unit, barcode
      FROM inventory_items
      WHERE name LIKE ? OR id LIKE ? OR barcode LIKE ?
      ORDER BY
        CASE
          WHEN name LIKE ? THEN 1
          WHEN id LIKE ? THEN 2
          ELSE 3
        END,
        name ASC
      LIMIT ?
    `, [searchPattern, searchPattern, searchPattern, `${query}%`, `${query}%`, limit])
  }

  // Search pantone colors
  if (types.includes('pantone')) {
    results.pantone = await all(`
      SELECT id, name, color_data, status, match_date
      FROM pantone_colors
      WHERE name LIKE ? OR color_data LIKE ?
      ORDER BY
        CASE
          WHEN name LIKE ? THEN 1
          ELSE 2
        END,
        name ASC
      LIMIT ?
    `, [searchPattern, searchPattern, `${query}%`, limit])
  }

  // Search maintenance issues
  if (types.includes('maintenance')) {
    results.maintenance = await all(`
      SELECT id, machine, issue_type, issue_subtype, description, status, severity, created_at
      FROM maintenance_issues
      WHERE machine LIKE ? OR issue_type LIKE ? OR description LIKE ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [searchPattern, searchPattern, searchPattern, limit])
  }

  // Search todos
  if (types.includes('todos')) {
    results.todos = await all(`
      SELECT id, text, completed, created_at
      FROM dashboard_todos
      WHERE text LIKE ?
      ORDER BY
        CASE WHEN completed = 1 THEN 1 ELSE 0 END,
        created_at DESC
      LIMIT ?
    `, [searchPattern, limit])
  }

  // Search productivity history (tasks)
  if (types.includes('productivity')) {
    results.productivity = await all(`
      SELECT DISTINCT task, status, COUNT(*) as occurrences, SUM(duration) as total_duration
      FROM productivity_history
      WHERE task LIKE ?
      GROUP BY task, status
      ORDER BY occurrences DESC
      LIMIT ?
    `, [searchPattern, limit])
  }

  return results
}

/**
 * Search inventory items
 * @param {sqlite3.Database} db - Database instance
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Inventory items
 */
export async function searchInventory(db, query, limit = 20) {
  const { all } = promisifyDb(db)
  const searchPattern = `%${query}%`

  return await all(`
    SELECT id, name, printer, category, stock, unit, barcode, created_at, updated_at
    FROM inventory_items
    WHERE name LIKE ? OR id LIKE ? OR barcode LIKE ? OR printer LIKE ? OR category LIKE ?
    ORDER BY
      CASE
        WHEN name LIKE ? THEN 1
        WHEN id LIKE ? THEN 2
        ELSE 3
      END,
      name ASC
    LIMIT ?
  `, [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, `${query}%`, `${query}%`, limit])
}

/**
 * Search pantone colors
 * @param {sqlite3.Database} db - Database instance
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Pantone colors
 */
export async function searchPantone(db, query, limit = 20) {
  const { all } = promisifyDb(db)
  const searchPattern = `%${query}%`

  return await all(`
    SELECT id, name, color_data, status, match_date, created_at
    FROM pantone_colors
    WHERE name LIKE ? OR color_data LIKE ?
    ORDER BY
      CASE
        WHEN name LIKE ? THEN 1
        ELSE 2
      END,
      name ASC
    LIMIT ?
  `, [searchPattern, searchPattern, `${query}%`, limit])
}

/**
 * Search maintenance issues
 * @param {sqlite3.Database} db - Database instance
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Maintenance issues
 */
export async function searchMaintenance(db, query, limit = 20) {
  const { all } = promisifyDb(db)
  const searchPattern = `%${query}%`

  return await all(`
    SELECT id, machine, issue_type, issue_subtype, description, colors, status, severity, created_at, resolved_at
    FROM maintenance_issues
    WHERE machine LIKE ? OR issue_type LIKE ? OR issue_subtype LIKE ? OR description LIKE ?
    ORDER BY
      CASE
        WHEN status = 'open' THEN 1
        WHEN status = 'in_progress' THEN 2
        ELSE 3
      END,
      created_at DESC
    LIMIT ?
  `, [searchPattern, searchPattern, searchPattern, searchPattern, limit])
}

/**
 * Search todos
 * @param {sqlite3.Database} db - Database instance
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Todos
 */
export async function searchTodos(db, query, limit = 20) {
  const { all } = promisifyDb(db)
  const searchPattern = `%${query}%`

  return await all(`
    SELECT id, text, completed, created_at, completed_at
    FROM dashboard_todos
    WHERE text LIKE ?
    ORDER BY
      CASE WHEN completed = 1 THEN 1 ELSE 0 END,
      created_at DESC
    LIMIT ?
  `, [searchPattern, limit])
}

/**
 * Get search suggestions (recent/popular searches)
 * @param {sqlite3.Database} db - Database instance
 * @param {string} type - Data type
 * @param {number} limit - Max suggestions
 * @returns {Promise<Array>} Suggestions
 */
export async function getSearchSuggestions(db, type = 'all', limit = 5) {
  const { all } = promisifyDb(db)

  switch (type) {
    case 'inventory':
      return await all(`
        SELECT DISTINCT name as suggestion, 'inventory' as type
        FROM inventory_items
        ORDER BY updated_at DESC
        LIMIT ?
      `, [limit])

    case 'pantone':
      return await all(`
        SELECT DISTINCT name as suggestion, 'pantone' as type
        FROM pantone_colors
        ORDER BY created_at DESC
        LIMIT ?
      `, [limit])

    case 'maintenance':
      return await all(`
        SELECT DISTINCT machine as suggestion, 'maintenance' as type
        FROM maintenance_issues
        ORDER BY created_at DESC
        LIMIT ?
      `, [limit])

    default:
      // Return mixed suggestions
      const [inventory, pantone, maintenance] = await Promise.all([
        all(`SELECT DISTINCT name as suggestion FROM inventory_items ORDER BY updated_at DESC LIMIT 2`),
        all(`SELECT DISTINCT name as suggestion FROM pantone_colors ORDER BY created_at DESC LIMIT 2`),
        all(`SELECT DISTINCT machine as suggestion FROM maintenance_issues ORDER BY created_at DESC LIMIT 2`)
      ])

      return [
        ...inventory.map(i => ({ suggestion: i.suggestion, type: 'inventory' })),
        ...pantone.map(p => ({ suggestion: p.suggestion, type: 'pantone' })),
        ...maintenance.map(m => ({ suggestion: m.suggestion, type: 'maintenance' }))
      ].slice(0, limit)
  }
}
