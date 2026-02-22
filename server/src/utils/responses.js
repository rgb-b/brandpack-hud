/**
 * Standardized API response helpers
 * Ensures consistent response format across all endpoints
 */

/**
 * Success response with data
 * @param {*} data - The response data
 * @param {Object} meta - Optional metadata (count, pagination, etc.)
 * @returns {Object} Formatted success response
 */
export function success(data, meta = {}) {
  return {
    success: true,
    data,
    ...meta
  }
}

/**
 * Created resource response
 * @param {*} data - The created resource data
 * @param {number|string} id - The ID of the created resource
 * @returns {Object} Formatted creation response
 */
export function created(data, id) {
  return {
    success: true,
    data,
    id
  }
}

/**
 * Error response
 * @param {string} name - Error name/type (e.g., 'ValidationError', 'NotFoundError')
 * @param {string} message - Human-readable error message
 * @param {Object} details - Additional error details
 * @param {number} statusCode - HTTP status code (for reference, not used in response)
 * @returns {Object} Formatted error response
 */
export function error(name, message, details = null, statusCode = 500) {
  const response = {
    success: false,
    error: name,
    message
  }

  if (details) {
    response.details = details
  }

  return response
}

/**
 * Not found error response
 * @param {string} resource - The resource type (e.g., 'Item', 'User')
 * @param {number|string} id - The ID that wasn't found
 * @returns {Object} Formatted not found error response
 */
export function notFound(resource, id) {
  return error(
    'NotFoundError',
    `${resource} with id ${id} not found`,
    null,
    404
  )
}

/**
 * Validation error response
 * @param {Object|string} errors - Validation errors object or message
 * @returns {Object} Formatted validation error response
 */
export function validationError(errors) {
  if (typeof errors === 'string') {
    return error('ValidationError', errors, null, 400)
  }

  return error(
    'ValidationError',
    'Request validation failed',
    errors,
    400
  )
}

/**
 * Conflict error response (e.g., duplicate resource)
 * @param {string} message - Description of the conflict
 * @returns {Object} Formatted conflict error response
 */
export function conflict(message) {
  return error(
    'ConflictError',
    message,
    null,
    409
  )
}

/**
 * Unauthorized error response
 * @param {string} message - Optional message
 * @returns {Object} Formatted unauthorized error response
 */
export function unauthorized(message = 'Unauthorized') {
  return error(
    'UnauthorizedError',
    message,
    null,
    401
  )
}

/**
 * Forbidden error response
 * @param {string} message - Optional message
 * @returns {Object} Formatted forbidden error response
 */
export function forbidden(message = 'Forbidden') {
  return error(
    'ForbiddenError',
    message,
    null,
    403
  )
}
