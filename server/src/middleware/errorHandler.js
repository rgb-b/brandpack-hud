/**
 * Global Error Handler Middleware
 * Converts errors to consistent HTTP responses with proper status codes
 */

import { error as errorResponse } from '../utils/responses.js'

/**
 * Convert SQLite error codes to HTTP status codes and error names
 * @param {Error} err - SQLite error
 * @returns {Object} Object with statusCode and errorName
 */
function getSQLiteErrorInfo(err) {
  const errorCode = err.code

  switch (errorCode) {
    case 'SQLITE_CONSTRAINT':
    case 'SQLITE_CONSTRAINT_UNIQUE':
      return {
        statusCode: 409,
        errorName: 'ConflictError',
        message: 'A resource with this data already exists'
      }

    case 'SQLITE_CONSTRAINT_FOREIGNKEY':
      return {
        statusCode: 400,
        errorName: 'ForeignKeyError',
        message: 'Referenced resource does not exist'
      }

    case 'SQLITE_CONSTRAINT_NOTNULL':
      return {
        statusCode: 400,
        errorName: 'ValidationError',
        message: 'Required field is missing'
      }

    case 'SQLITE_ERROR':
      return {
        statusCode: 400,
        errorName: 'DatabaseError',
        message: 'Database operation failed'
      }

    default:
      return {
        statusCode: 500,
        errorName: 'DatabaseError',
        message: 'An unexpected database error occurred'
      }
  }
}

/**
 * Global error handling middleware
 * Should be registered last in middleware chain
 */
export function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error('Error:', err)

  // Default error info
  let statusCode = 500
  let errorName = 'InternalServerError'
  let message = 'An unexpected error occurred'
  let details = null

  // Handle different error types
  if (err.name === 'ValidationError') {
    statusCode = 400
    errorName = 'ValidationError'
    message = err.message || 'Request validation failed'
    details = err.details || null
  } else if (err.message && err.message.includes('not found')) {
    statusCode = 404
    errorName = 'NotFoundError'
    message = err.message
  } else if (err.code && err.code.startsWith('SQLITE_')) {
    // SQLite error
    const sqliteInfo = getSQLiteErrorInfo(err)
    statusCode = sqliteInfo.statusCode
    errorName = sqliteInfo.errorName
    message = sqliteInfo.message

    // Include original error message in development
    if (process.env.NODE_ENV === 'development') {
      details = {
        code: err.code,
        originalMessage: err.message
      }
    }
  } else if (err.statusCode) {
    // Custom error with status code
    statusCode = err.statusCode
    errorName = err.name || errorName
    message = err.message || message
    details = err.details || null
  } else {
    // Generic error
    message = err.message || message

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      details = {
        stack: err.stack
      }
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse(errorName, message, details, statusCode))
}

/**
 * 404 Not Found handler
 * Should be registered before the error handler
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json(errorResponse(
    'NotFoundError',
    `Route ${req.method} ${req.path} not found`,
    null,
    404
  ))
}
