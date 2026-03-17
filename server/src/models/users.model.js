/**
 * Users Model
 * Database operations for user authentication
 */

import bcrypt from 'bcrypt'
import { promisifyDb } from '../config/database.js'
import { getCurrentDateTime } from '../utils/dateHelpers.js'

const BCRYPT_ROUNDS = 10

/**
 * Get all users (for user picker, excludes PIN)
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<Array>} Array of users
 */
export async function getAllUsers(db) {
  const dbPromise = promisifyDb(db)

  const users = await dbPromise.all(
    'SELECT id, username, role, created_at FROM users ORDER BY username'
  )

  return users
}

/**
 * Get user by ID (excludes PIN)
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User or null
 */
export async function getUserById(db, id) {
  const dbPromise = promisifyDb(db)

  const user = await dbPromise.get(
    'SELECT id, username, role, created_at, session_invalidated_at FROM users WHERE id = ?',
    [id]
  )

  return user || null
}

/**
 * Get user by username (includes PIN for auth)
 * @param {sqlite3.Database} db - Database instance
 * @param {string} username - Username
 * @returns {Promise<Object|null>} User with PIN or null
 */
export async function getUserByUsername(db, username) {
  const dbPromise = promisifyDb(db)

  const user = await dbPromise.get(
    'SELECT id, username, pin, role, created_at FROM users WHERE username = ?',
    [username]
  )

  return user || null
}

/**
 * Check if this is the first user
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<boolean>} True if no users exist
 */
export async function isFirstUser(db) {
  const dbPromise = promisifyDb(db)
  const result = await dbPromise.get('SELECT COUNT(*) as count FROM users')
  return result.count === 0
}

/**
 * Create a new user
 * @param {sqlite3.Database} db - Database instance
 * @param {string} username - Username
 * @param {string} pin - 4-digit PIN
 * @returns {Promise<Object>} Created user (without PIN)
 */
export async function createUser(db, username, pin, requestedRole = null) {
  const dbPromise = promisifyDb(db)
  const now = getCurrentDateTime()

  // Determine role: first user is auto-admin, otherwise use requested role or default to 'user'
  const firstUser = await isFirstUser(db)
  const role = firstUser ? 'admin' : (requestedRole || 'user')

  try {
    const hashedPin = await bcrypt.hash(pin, BCRYPT_ROUNDS)
    const result = await dbPromise.run(
      'INSERT INTO users (username, pin, role, created_at) VALUES (?, ?, ?, ?)',
      [username, hashedPin, role, now]
    )

    // Create default tasks for the new user
    const defaultTasks = [
      { status: 'working', name: 'Admin' },
      { status: 'working', name: 'Maintenance' },
      { status: 'unavailable', name: 'Lunch break' },
      { status: 'unavailable', name: 'Tea break' },
      { status: 'unavailable', name: 'Bathroom' },
      { status: 'unavailable', name: 'Personal' }
    ]

    for (const task of defaultTasks) {
      await dbPromise.run(
        'INSERT INTO productivity_tasks (user_id, status, name, created_at) VALUES (?, ?, ?, ?)',
        [result.lastID, task.status, task.name, now]
      )
    }

    return {
      id: result.lastID,
      username,
      role,
      created_at: now
    }
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Username already exists')
    }
    throw err
  }
}

/**
 * Validate user login
 * @param {sqlite3.Database} db - Database instance
 * @param {string} username - Username
 * @param {string} pin - 4-digit PIN
 * @returns {Promise<Object|null>} User if valid, null if invalid
 */
export async function validateLogin(db, username, pin) {
  const user = await getUserByUsername(db, username)

  if (!user) {
    return null
  }

  const isHashed = user.pin.startsWith('$2b$') || user.pin.startsWith('$2a$')

  if (isHashed) {
    // Compare against bcrypt hash
    const match = await bcrypt.compare(pin, user.pin)
    if (!match) return null
  } else {
    // Legacy plaintext comparison
    if (user.pin !== pin) return null

    // Auto-upgrade to bcrypt hash on successful login
    const dbPromise = promisifyDb(db)
    const hashedPin = await bcrypt.hash(pin, BCRYPT_ROUNDS)
    await dbPromise.run('UPDATE users SET pin = ? WHERE id = ?', [hashedPin, user.id])
  }

  // Return user without PIN
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    created_at: user.created_at
  }
}

/**
 * Delete a user and all their data
 * @param {sqlite3.Database} db - Database instance
 * @param {number} id - User ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteUser(db, id) {
  const dbPromise = promisifyDb(db)

  const result = await dbPromise.run(
    'DELETE FROM users WHERE id = ?',
    [id]
  )

  return result.changes > 0
}

/**
 * Get user's configured shift length
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @returns {Promise<number>} Shift length in hours (default 8)
 */
export async function getShiftLength(db, userId) {
  const dbPromise = promisifyDb(db)
  const user = await dbPromise.get(
    'SELECT shift_length_hours FROM users WHERE id = ?',
    [userId]
  )
  return user ? user.shift_length_hours : 8 // Default 8 hours
}

/**
 * Update user's configured shift length
 * @param {sqlite3.Database} db - Database instance
 * @param {number} userId - User ID
 * @param {number} hours - Shift length in hours (1-24)
 * @returns {Promise<boolean>} True if updated successfully
 */
export async function updateShiftLength(db, userId, hours) {
  const dbPromise = promisifyDb(db)

  // Validate hours (must be between 1 and 24)
  if (hours < 1 || hours > 24) {
    throw new Error('Shift length must be between 1 and 24 hours')
  }

  const result = await dbPromise.run(
    'UPDATE users SET shift_length_hours = ? WHERE id = ?',
    [hours, userId]
  )

  return result.changes > 0
}
