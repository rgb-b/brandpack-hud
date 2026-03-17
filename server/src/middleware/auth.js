/**
 * Authentication Middleware
 * Provides authentication and authorization checks for protected routes
 */

import { asyncHandler } from './asyncHandler.js'
import { unauthorized, forbidden } from '../utils/responses.js'
import { getDatabase } from '../config/database.js'
import * as Users from '../models/users.model.js'

/**
 * Require user to be authenticated
 * Checks session for userId and populates req.user from database
 * Returns 401 if not authenticated
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  // Check if session contains userId
  if (!req.session || !req.session.userId) {
    return res.status(401).json(unauthorized('Authentication required'))
  }

  // Get user from database
  const db = await getDatabase()
  const user = await Users.getUserById(db, req.session.userId)

  if (!user) {
    // User was deleted but session still exists
    req.session.destroy()
    return res.status(401).json(unauthorized('User not found'))
  }

  // Check if session was invalidated by the shift scheduler
  const loginTime = req.session.loginTime || 0
  if (user.session_invalidated_at && loginTime < user.session_invalidated_at) {
    req.session.destroy(() => {})
    return res.status(401).json(unauthorized('Session expired'))
  }

  // Attach user to request object
  req.user = user

  next()
})

/**
 * Require user to have admin role
 * Must be used after requireAuth middleware
 * Returns 403 if user is not an admin
 */
export const requireAdmin = asyncHandler(async (req, res, next) => {
  // Check if user exists (should be set by requireAuth)
  if (!req.user) {
    return res.status(401).json(unauthorized('Authentication required'))
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json(forbidden('Admin access required'))
  }

  next()
})

export default { requireAuth, requireAdmin }
