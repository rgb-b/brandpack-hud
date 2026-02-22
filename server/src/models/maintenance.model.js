/**
 * Maintenance Model
 * Database operations for maintenance checklist and issues
 */

import { promisifyDb } from '../config/database.js'
import { getCurrentDateTime } from '../utils/dateHelpers.js'

// ===== MAINTENANCE METRICS =====

/**
 * Get maintenance metrics for issues
 * @param {sqlite3.Database} db - Database instance
 * @param {string} machine - Machine name (optional, null for all machines)
 * @returns {Promise<Object>} Metrics object with issue counts by status and severity
 */
export async function getMaintenanceMetrics(db, machine = null) {
  const { get, all } = promisifyDb(db)

  let whereClause = ''
  let params = []

  if (machine) {
    whereClause = 'WHERE machine = ?'
    params = [machine]
  }

  // Get issue counts by status
  const statusCounts = await all(
    `SELECT status, COUNT(*) as count
     FROM maintenance_issues
     ${whereClause}
     GROUP BY status`,
    params
  )

  // Get issue counts by severity
  const severityCounts = await all(
    `SELECT severity, COUNT(*) as count
     FROM maintenance_issues
     ${whereClause}
     GROUP BY severity`,
    params
  )

  // Get most recent issue
  const recentIssue = await get(
    `SELECT id, machine, issue_type, created_at, status, severity
     FROM maintenance_issues
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT 1`,
    params
  )

  // Convert arrays to objects
  const countsByStatus = {}
  statusCounts.forEach(row => {
    countsByStatus[row.status] = row.count
  })

  const countsBySeverity = {}
  severityCounts.forEach(row => {
    countsBySeverity[row.severity] = row.count
  })

  return {
    issues: {
      open: countsByStatus.open || 0,
      in_progress: countsByStatus.in_progress || 0,
      resolved: countsByStatus.resolved || 0,
      closed: countsByStatus.closed || 0,
      total: statusCounts.reduce((sum, row) => sum + row.count, 0)
    },
    severity: {
      low: countsBySeverity.low || 0,
      medium: countsBySeverity.medium || 0,
      high: countsBySeverity.high || 0,
      critical: countsBySeverity.critical || 0
    },
    recentIssue: recentIssue || null
  }
}

// ===== ISSUES =====

/**
 * Get all maintenance issues with optional filters
 * @param {sqlite3.Database} db - Database instance
 * @param {Object} filters - Filters { status?, machine?, severity? }
 * @returns {Promise<Array>} Array of issues
 */
export async function getAllIssues(db, filters = {}) {
  const dbPromise = promisifyDb(db)

  let query = 'SELECT * FROM maintenance_issues WHERE 1=1'
  const params = []

  if (filters.status) {
    query += ' AND status = ?'
    params.push(filters.status)
  }

  if (filters.machine) {
    query += ' AND machine = ?'
    params.push(filters.machine)
  }

  if (filters.severity) {
    query += ' AND severity = ?'
    params.push(filters.severity)
  }

  query += ' ORDER BY created_at DESC'

  const issues = await dbPromise.all(query, params)

  // Parse JSON fields
  return issues.map(issue => ({
    ...issue,
    colors: issue.colors ? JSON.parse(issue.colors) : null,
    photos: issue.photos ? JSON.parse(issue.photos) : null
  }))
}

/**
 * Get issue by ID
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Issue ID
 * @returns {Promise<Object|null>} Issue or null
 */
export async function getIssueById(db, id) {
  const dbPromise = promisifyDb(db)

  const issue = await dbPromise.get(
    'SELECT * FROM maintenance_issues WHERE id = ?',
    [id]
  )

  if (!issue) {
    return null
  }

  // Parse JSON fields
  return {
    ...issue,
    colors: issue.colors ? JSON.parse(issue.colors) : null,
    photos: issue.photos ? JSON.parse(issue.photos) : null
  }
}

/**
 * Create a new maintenance issue
 * @param {sqlite3.Database} db - Database instance
 * @param {Object} issueData - Issue data
 * @returns {Promise<Object>} Created issue with ID
 */
export async function createIssue(db, issueData) {
  const dbPromise = promisifyDb(db)

  const now = getCurrentDateTime()

  // Stringify JSON fields
  const colors = issueData.colors ? JSON.stringify(issueData.colors) : null
  const photos = issueData.photos ? JSON.stringify(issueData.photos) : null

  const result = await dbPromise.run(
    `INSERT INTO maintenance_issues
    (machine, issue_type, issue_subtype, colors, description, photos, status, severity, time_spent, created_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      issueData.machine,
      issueData.issue_type,
      issueData.issue_subtype || '',
      colors,
      issueData.description,
      photos,
      issueData.status || 'open',
      issueData.severity || 'medium',
      issueData.time_spent || 0,
      now,
      issueData.notes || null
    ]
  )

  return {
    id: result.lastID,
    ...issueData,
    status: issueData.status || 'open',
    severity: issueData.severity || 'medium',
    time_spent: issueData.time_spent || 0,
    created_at: now,
    resolved_at: null
  }
}

/**
 * Update a maintenance issue
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Issue ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated issue or null if not found
 */
export async function updateIssue(db, id, updates) {
  const dbPromise = promisifyDb(db)

  // Check if exists
  const existing = await getIssueById(db, id)
  if (!existing) {
    return null
  }

  const fields = []
  const values = []

  // Allowed update fields
  const allowedFields = ['machine', 'issue_type', 'issue_subtype', 'description', 'status', 'severity', 'time_spent', 'notes']

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`)
      values.push(updates[field])
    }
  }

  // Handle JSON fields
  if (updates.colors !== undefined) {
    fields.push('colors = ?')
    values.push(updates.colors ? JSON.stringify(updates.colors) : null)
  }

  if (updates.photos !== undefined) {
    fields.push('photos = ?')
    values.push(updates.photos ? JSON.stringify(updates.photos) : null)
  }

  // Handle resolved_at
  if (updates.status === 'resolved' && !existing.resolved_at) {
    fields.push('resolved_at = ?')
    values.push(getCurrentDateTime())
  }

  if (fields.length === 0) {
    return existing
  }

  // Add ID to params
  values.push(id)

  await dbPromise.run(
    `UPDATE maintenance_issues SET ${fields.join(', ')} WHERE id = ?`,
    values
  )

  // Return updated issue
  return await getIssueById(db, id)
}

/**
 * Delete a maintenance issue
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - Issue ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteIssue(db, id) {
  const dbPromise = promisifyDb(db)

  // Check if exists
  const existing = await getIssueById(db, id)
  if (!existing) {
    return false
  }

  await dbPromise.run('DELETE FROM maintenance_issues WHERE id = ?', [id])

  return true
}

/**
 * Get issues by machine
 * @param {sqlite3.Database} db - Database instance
 * @param {string} machine - Machine name
 * @returns {Promise<Array>} Array of issues
 */
export async function getIssuesByMachine(db, machine) {
  return await getAllIssues(db, { machine })
}

/**
 * Get open issues using the v_open_issues view
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<Array>} Array of open issues
 */
export async function getOpenIssues(db) {
  const dbPromise = promisifyDb(db)

  const issues = await dbPromise.all(
    'SELECT * FROM v_open_issues'
  )

  // Parse JSON fields
  return issues.map(issue => ({
    ...issue,
    colors: issue.colors ? JSON.parse(issue.colors) : null,
    photos: issue.photos ? JSON.parse(issue.photos) : null
  }))
}
