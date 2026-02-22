/**
 * Request Validation Middleware
 * Factory functions for creating validation middleware
 */

import { validationError } from '../utils/responses.js'

/**
 * Validate request body against a validator function
 * @param {Function} validator - Validator function that returns { valid, errors }
 * @returns {Function} Express middleware
 */
export function validateBody(validator) {
  return (req, res, next) => {
    const result = validator(req.body)

    if (!result.valid) {
      return res.status(400).json(validationError(result.errors || result.error))
    }

    next()
  }
}

/**
 * Validate request params against a validator function
 * @param {Function} validator - Validator function that returns { valid, errors }
 * @returns {Function} Express middleware
 */
export function validateParams(validator) {
  return (req, res, next) => {
    const result = validator(req.params)

    if (!result.valid) {
      return res.status(400).json(validationError(result.errors || result.error))
    }

    next()
  }
}

/**
 * Validate request query against a validator function
 * @param {Function} validator - Validator function that returns { valid, errors }
 * @returns {Function} Express middleware
 */
export function validateQuery(validator) {
  return (req, res, next) => {
    const result = validator(req.query)

    if (!result.valid) {
      return res.status(400).json(validationError(result.errors || result.error))
    }

    next()
  }
}

/**
 * Validate required fields in request body
 * @param {string[]} requiredFields - Array of required field names
 * @returns {Function} Express middleware
 */
export function validateRequiredFields(requiredFields) {
  return (req, res, next) => {
    const errors = {}

    for (const field of requiredFields) {
      if (!req.body[field]) {
        errors[field] = `${field} is required`
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json(validationError(errors))
    }

    next()
  }
}
