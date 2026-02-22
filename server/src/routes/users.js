/**
 * Users API Routes
 * Handles user authentication and management
 */

import express from 'express'
import { getDatabase } from '../config/database.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { loginLimiter } from '../middleware/rateLimit.js'
import { success, error, notFound, validationError } from '../utils/responses.js'
import { validatePIN } from '../utils/validators.js'
import * as Users from '../models/users.model.js'

const router = express.Router()

/**
 * GET /api/v1/users/setup/required
 * Check if first-time setup is needed (no users exist)
 * This endpoint is public - no authentication required
 */
router.get('/setup/required', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const isFirstUser = await Users.isFirstUser(db)
  res.json(success({ setupRequired: isFirstUser }))
}))

/**
 * POST /api/v1/users/setup
 * First-time setup: create first admin user
 * Body: { username: string, pin: string }
 */
router.post('/setup', asyncHandler(async (req, res) => {
  const db = await getDatabase()

  const isFirst = await Users.isFirstUser(db)
  if (!isFirst) {
    return res.status(400).json(validationError('Setup already completed'))
  }

  const { username, pin } = req.body

  if (!username || username.length < 3) {
    return res.status(400).json(validationError('Username must be at least 3 characters'))
  }

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json(validationError('PIN is required'))
  }

  const pinError = validatePIN(pin)
  if (pinError) {
    return res.status(400).json(validationError(pinError))
  }

  const user = await Users.createUser(db, username.trim(), pin)

  req.session.userId = user.id

  res.status(201).json(success(user, { message: 'First admin user created successfully' }))
}))

/**
 * POST /api/v1/users/setup/import
 * First-time setup with data import
 * Body: { username: string, pin: string, importData?: Object }
 */
router.post('/setup/import', asyncHandler(async (req, res) => {
  const db = await getDatabase()

  const isFirst = await Users.isFirstUser(db)
  if (!isFirst) {
    return res.status(400).json(validationError('Setup already completed'))
  }

  const { username, pin, importData } = req.body

  if (!username || username.length < 3) {
    return res.status(400).json(validationError('Username must be at least 3 characters'))
  }

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json(validationError('PIN is required'))
  }

  const pinError = validatePIN(pin)
  if (pinError) {
    return res.status(400).json(validationError(pinError))
  }

  const user = await Users.createUser(db, username.trim(), pin)

  let importStats = null
  if (importData) {
    const { importAllData } = await import('../models/migration.model.js')
    importStats = await importAllData(db, importData, user.id)
  }

  req.session.userId = user.id

  res.status(201).json(success(
    { user, importStats },
    { message: 'Setup completed and data imported successfully' }
  ))
}))

/**
 * GET /api/v1/users
 * Get all users (admin only)
 */
router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const users = await Users.getAllUsers(db)

  res.json(success(users, { count: users.length }))
}))

/**
 * GET /api/v1/users/me
 * Get current authenticated user
 * Requires authentication
 */
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json(success(req.user))
}))

/**
 * GET /api/v1/users/:id
 * Get a single user by ID
 */
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid user ID'))
  }

  const db = await getDatabase()
  const user = await Users.getUserById(db, id)

  if (!user) {
    return res.status(404).json(notFound('User', id))
  }

  res.json(success(user))
}))

/**
 * POST /api/v1/users/login
 * Authenticate user and create session
 * Body: { username: string, pin: string }
 */
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { username, pin } = req.body

  if (!username || typeof username !== 'string') {
    return res.status(400).json(validationError(['username is required']))
  }

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json(validationError(['pin is required']))
  }

  const db = await getDatabase()
  const user = await Users.validateLogin(db, username.trim(), pin)

  if (!user) {
    return res.status(401).json(error('AuthenticationError', 'Invalid username or PIN'))
  }

  req.session.regenerate((err) => {
    if (err) {
      console.error('Session regeneration failed:', err)
      return res.status(500).json(error('ServerError', 'Login failed. Please try again.'))
    }

    req.session.userId = user.id

    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Session save failed:', saveErr)
        return res.status(500).json(error('ServerError', 'Login failed. Please try again.'))
      }

      res.json(success(user, { message: 'Login successful' }))
    })
  })
}))

/**
 * POST /api/v1/users/logout
 * Destroy session and log out user
 */
router.post('/logout', asyncHandler(async (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err)
        return res.status(500).json(error('ServerError', 'Failed to log out'))
      }
      res.json(success({ message: 'Logged out successfully' }))
    })
  } else {
    res.json(success({ message: 'No active session' }))
  }
}))

/**
 * POST /api/v1/users/register
 * Create a new user (admin only, except for first user)
 * Body: { username: string, pin: string }
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { username, pin, role } = req.body

  if (!username || typeof username !== 'string') {
    return res.status(400).json(validationError(['username is required']))
  }

  const trimmedUsername = username.trim()
  if (trimmedUsername.length < 2 || trimmedUsername.length > 50) {
    return res.status(400).json(validationError(['username must be 2-50 characters']))
  }

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json(validationError(['pin is required']))
  }

  const pinError = validatePIN(pin)
  if (pinError) {
    return res.status(400).json(validationError([pinError]))
  }

  if (role && !['user', 'admin'].includes(role)) {
    return res.status(400).json(validationError(['role must be either "user" or "admin"']))
  }

  const db = await getDatabase()

  const isFirstUser = await Users.isFirstUser(db)

  if (!isFirstUser) {
    if (!req.session || !req.session.userId) {
      return res.status(401).json(error('AuthenticationError', 'Authentication required'))
    }

    const currentUser = await Users.getUserById(db, req.session.userId)
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json(error('ForbiddenError', 'Admin access required'))
    }
  }

  try {
    const user = await Users.createUser(db, trimmedUsername, pin, role)
    res.status(201).json(success(user, { message: 'User created successfully' }))
  } catch (err) {
    if (err.message === 'Username already exists') {
      return res.status(409).json(error('ConflictError', 'Username already exists'))
    }
    throw err
  }
}))

/**
 * DELETE /api/v1/users/:id
 * Delete a user and all their data (admin only)
 */
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json(error('ValidationError', 'Invalid user ID'))
  }

  const db = await getDatabase()
  const deleted = await Users.deleteUser(db, id)

  if (!deleted) {
    return res.status(404).json(notFound('User', id))
  }

  res.json(success({ message: 'User deleted successfully' }))
}))

/**
 * GET /api/v1/users/me/shift-length
 * Get current user's configured shift length
 * Requires authentication
 */
router.get('/me/shift-length', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const shiftLength = await Users.getShiftLength(db, req.user.id)
  res.json(success({ shift_length_hours: shiftLength }))
}))

/**
 * PUT /api/v1/users/me/shift-length
 * Update current user's configured shift length
 * Body: { hours: number }
 * Requires authentication
 */
router.put('/me/shift-length', requireAuth, asyncHandler(async (req, res) => {
  const { hours } = req.body

  if (!hours || typeof hours !== 'number') {
    return res.status(400).json(validationError('Hours must be a number'))
  }

  const db = await getDatabase()
  await Users.updateShiftLength(db, req.user.id, hours)
  res.json(success({ shift_length_hours: hours }))
}))

export default router
