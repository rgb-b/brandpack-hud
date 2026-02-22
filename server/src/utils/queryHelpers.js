/**
 * Database Query Helper Utilities
 * Provides reusable functions for building common query patterns
 */

/**
 * Build pagination parameters
 * @param {number|string} page - Page number (1-indexed)
 * @param {number|string} limit - Items per page
 * @returns {Object} Object with limit and offset
 */
export function buildPagination(page = 1, limit = 50) {
  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit) || 50))
  const offset = (pageNum - 1) * limitNum

  return {
    limit: limitNum,
    offset: offset,
    page: pageNum
  }
}

/**
 * Build LIKE query for search
 * @param {string} searchTerm - Search term
 * @returns {string} Formatted search term for SQL LIKE
 */
export function buildSearchTerm(searchTerm) {
  if (!searchTerm) return '%'
  return `%${searchTerm.trim()}%`
}

/**
 * Build date range WHERE clause
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} dateColumn - Column name for date comparison
 * @returns {Object} Object with clause and params
 */
export function buildDateRangeQuery(startDate, endDate, dateColumn = 'date') {
  const conditions = []
  const params = []

  if (startDate) {
    conditions.push(`${dateColumn} >= ?`)
    params.push(startDate)
  }

  if (endDate) {
    conditions.push(`${dateColumn} <= ?`)
    params.push(endDate)
  }

  return {
    clause: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
    params
  }
}

/**
 * Build ORDER BY clause
 * @param {string} sortBy - Column to sort by
 * @param {string} sortOrder - Sort direction ('asc' or 'desc')
 * @param {string[]} allowedColumns - List of allowed column names
 * @param {string} defaultColumn - Default column if sortBy is invalid
 * @returns {string} ORDER BY clause
 */
export function buildOrderBy(sortBy, sortOrder = 'desc', allowedColumns = [], defaultColumn = 'created_at') {
  const column = allowedColumns.includes(sortBy) ? sortBy : defaultColumn
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  return `ORDER BY ${column} ${order}`
}

/**
 * Build WHERE clause from filters object
 * @param {Object} filters - Filters object { column: value, ... }
 * @param {string[]} allowedFilters - List of allowed filter columns
 * @returns {Object} Object with clause and params
 */
export function buildWhereClause(filters = {}, allowedFilters = []) {
  const conditions = []
  const params = []

  for (const [key, value] of Object.entries(filters)) {
    if (allowedFilters.includes(key) && value !== undefined && value !== null && value !== '') {
      conditions.push(`${key} = ?`)
      params.push(value)
    }
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  }
}

/**
 * Calculate total pages from total count and limit
 * @param {number} totalCount - Total number of items
 * @param {number} limit - Items per page
 * @returns {number} Total number of pages
 */
export function calculateTotalPages(totalCount, limit) {
  return Math.ceil(totalCount / limit)
}

/**
 * Build pagination metadata for response
 * @param {number} totalCount - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
export function buildPaginationMeta(totalCount, page, limit) {
  const totalPages = calculateTotalPages(totalCount, limit)

  return {
    total: totalCount,
    page: page,
    limit: limit,
    totalPages: totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }
}
