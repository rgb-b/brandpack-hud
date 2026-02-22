/**
 * Service Visits Model
 * Handles database operations for maintenance service visit tracking
 */

import { promisifyDb } from '../config/database.js'
import { getCurrentDateTime } from '../utils/dateHelpers.js'

/**
 * Get all service visits with optional filters
 * @param {Object} db - Database instance
 * @param {Object} filters - Filter options
 * @param {string} filters.startDate - Filter by start date (YYYY-MM-DD)
 * @param {string} filters.endDate - Filter by end date (YYYY-MM-DD)
 * @param {string} filters.machine - Filter by machine name
 * @param {string} filters.visitType - Filter by visit type
 * @returns {Promise<Array>} Array of service visit records
 */
export async function getAllVisits(db, filters = {}) {
  const { all } = promisifyDb(db)
  let query = `SELECT sv.*,
         mi.machine AS linked_issue_machine,
         mi.description AS linked_issue_description
       FROM service_visits sv
       LEFT JOIN maintenance_issues mi ON sv.linked_issue_id = mi.id
       WHERE 1=1`
  const params = []

  if (filters.startDate) {
    query += ' AND sv.date >= ?'
    params.push(filters.startDate)
  }

  if (filters.endDate) {
    query += ' AND sv.date <= ?'
    params.push(filters.endDate)
  }

  if (filters.machine) {
    query += ' AND sv.machine = ?'
    params.push(filters.machine)
  }

  if (filters.visitType) {
    query += ' AND sv.visit_type = ?'
    params.push(filters.visitType)
  }

  query += ' ORDER BY sv.date DESC, sv.time DESC NULLS LAST, sv.id DESC'

  return await all(query, params)
}

/**
 * Get a single service visit by ID
 * @param {Object} db - Database instance
 * @param {number} id - Visit ID
 * @returns {Promise<Object|null>} Visit record or null if not found
 */
export async function getVisitById(db, id) {
  const { get } = promisifyDb(db)
  const visit = await get(
    `SELECT sv.*,
            mi.machine AS linked_issue_machine,
            mi.description AS linked_issue_description
     FROM service_visits sv
     LEFT JOIN maintenance_issues mi ON sv.linked_issue_id = mi.id
     WHERE sv.id = ?`,
    [id]
  )
  return visit || null
}

/**
 * Create a new service visit
 * @param {Object} db - Database instance
 * @param {Object} visitData - Visit data
 * @param {string} visitData.date - Visit date (YYYY-MM-DD)
 * @param {string} visitData.time - Visit time (HH:MM) (optional)
 * @param {string} visitData.technician - Technician name
 * @param {string} visitData.company - Company name (optional)
 * @param {string} visitData.machine - Machine name
 * @param {string} visitData.visit_type - Visit type (scheduled|emergency|warranty|installation)
 * @param {string} visitData.description - Visit description (optional)
 * @param {string} visitData.notes - Additional notes (optional)
 * @param {number} visitData.cost - Visit cost (optional)
 * @returns {Promise<Object>} Created visit record with ID
 */
export async function createVisit(db, visitData) {
  const { run } = promisifyDb(db)
  const now = getCurrentDateTime()

  const result = await run(
    `INSERT INTO service_visits
    (date, time, technician, company, machine, visit_type, description, notes, cost, linked_issue_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      visitData.date,
      visitData.time || null,
      visitData.technician,
      visitData.company || null,
      visitData.machine,
      visitData.visit_type,
      visitData.description || null,
      visitData.notes || null,
      visitData.cost !== undefined && visitData.cost !== null ? Number(visitData.cost) : null,
      visitData.linked_issue_id || null,
      now,
      now
    ]
  )

  return {
    id: result.lastID,
    date: visitData.date,
    time: visitData.time || null,
    technician: visitData.technician,
    company: visitData.company || null,
    machine: visitData.machine,
    visit_type: visitData.visit_type,
    description: visitData.description || null,
    notes: visitData.notes || null,
    cost: visitData.cost !== undefined && visitData.cost !== null ? Number(visitData.cost) : null,
    linked_issue_id: visitData.linked_issue_id || null,
    created_at: now,
    updated_at: now
  }
}

/**
 * Update an existing service visit
 * @param {Object} db - Database instance
 * @param {number} id - Visit ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated visit record or null if not found
 */
export async function updateVisit(db, id, updates) {
  const { run, get } = promisifyDb(db)

  // Check if visit exists
  const existingVisit = await get('SELECT * FROM service_visits WHERE id = ?', [id])
  if (!existingVisit) {
    return null
  }

  const allowedFields = ['date', 'time', 'technician', 'company', 'machine', 'visit_type', 'description', 'notes', 'cost', 'linked_issue_id']
  const setClauses = []
  const params = []

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      setClauses.push(`${field} = ?`)
      if (field === 'cost' && updates[field] !== null) {
        params.push(Number(updates[field]))
      } else if (field === 'linked_issue_id') {
        params.push(updates[field] ? Number(updates[field]) : null)
      } else {
        params.push(updates[field])
      }
    }
  }

  if (setClauses.length === 0) {
    // No updates provided, return existing record
    return existingVisit
  }

  // Add ID to params for WHERE clause
  params.push(id)

  const query = `UPDATE service_visits SET ${setClauses.join(', ')} WHERE id = ?`
  await run(query, params)

  // Fetch and return updated record
  return await get('SELECT * FROM service_visits WHERE id = ?', [id])
}

/**
 * Delete a service visit
 * @param {Object} db - Database instance
 * @param {number} id - Visit ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteVisit(db, id) {
  const { run } = promisifyDb(db)

  const result = await run('DELETE FROM service_visits WHERE id = ?', [id])

  return result.changes > 0
}

/**
 * Get maintenance metrics for a machine
 * @param {Object} db - Database instance
 * @param {string} machine - Machine name (optional, null for all machines)
 * @returns {Promise<Object>} Metrics object with last visit date, days since, visit counts
 */
export async function getMaintenanceMetrics(db, machine = null) {
  const { get, all } = promisifyDb(db)

  let whereClause = ''
  let params = []

  if (machine) {
    whereClause = 'WHERE machine = ?'
    params = [machine]
  }

  // Get last visit date and days since
  const lastVisit = await get(
    `SELECT date, machine, visit_type
     FROM service_visits
     ${whereClause}
     ORDER BY date DESC, time DESC NULLS LAST
     LIMIT 1`,
    params
  )

  // Get visit counts by type
  const visitCounts = await all(
    `SELECT visit_type, COUNT(*) as count
     FROM service_visits
     ${whereClause}
     GROUP BY visit_type`,
    params
  )

  // Calculate days since last visit
  let daysSinceLastVisit = null
  if (lastVisit) {
    const lastVisitDate = new Date(lastVisit.date)
    const today = new Date()
    daysSinceLastVisit = Math.floor((today - lastVisitDate) / (1000 * 60 * 60 * 24))
  }

  // Convert visit counts array to object
  const countsByType = {}
  visitCounts.forEach(row => {
    countsByType[row.visit_type] = row.count
  })

  return {
    lastVisit: lastVisit ? {
      date: lastVisit.date,
      machine: lastVisit.machine,
      visitType: lastVisit.visit_type,
      daysSince: daysSinceLastVisit
    } : null,
    visitCounts: {
      scheduled: countsByType.scheduled || 0,
      emergency: countsByType.emergency || 0,
      warranty: countsByType.warranty || 0,
      installation: countsByType.installation || 0,
      total: visitCounts.reduce((sum, row) => sum + row.count, 0)
    }
  }
}
