/**
 * Server-side Validation Utilities
 * Provides input validation for API requests
 */

/**
 * Validate that a value is a non-empty string
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result { valid: boolean, error?: string }
 */
export function validateNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {
      valid: false,
      error: `${fieldName} must be a non-empty string`
    }
  }
  return { valid: true }
}

/**
 * Validate that a value is a positive integer
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export function validatePositiveInteger(value, fieldName) {
  const num = Number(value)
  if (!Number.isInteger(num) || num <= 0) {
    return {
      valid: false,
      error: `${fieldName} must be a positive integer`
    }
  }
  return { valid: true }
}

/**
 * Validate that a value is a non-negative integer
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export function validateNonNegativeInteger(value, fieldName) {
  const num = Number(value)
  if (!Number.isInteger(num) || num < 0) {
    return {
      valid: false,
      error: `${fieldName} must be a non-negative integer`
    }
  }
  return { valid: true }
}

/**
 * Validate a date string (YYYY-MM-DD format)
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export function validateDate(value, fieldName) {
  if (!value) {
    return {
      valid: false,
      error: `${fieldName} is required`
    }
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(value)) {
    return {
      valid: false,
      error: `${fieldName} must be in YYYY-MM-DD format`
    }
  }

  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: `${fieldName} is not a valid date`
    }
  }

  return { valid: true }
}

/**
 * Validate a datetime string (ISO 8601 format)
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export function validateDateTime(value, fieldName) {
  if (!value) {
    return {
      valid: false,
      error: `${fieldName} is required`
    }
  }

  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: `${fieldName} is not a valid datetime`
    }
  }

  return { valid: true }
}

/**
 * Validate stock update data
 * @param {Object} data - Stock update data
 * @returns {Object} Validation result
 */
export function validateStockUpdate(data) {
  const errors = {}

  if (!data) {
    return {
      valid: false,
      errors: { general: 'Request body is required' }
    }
  }

  if (data.stock !== undefined) {
    const stockValidation = validateNonNegativeInteger(data.stock, 'stock')
    if (!stockValidation.valid) {
      errors.stock = stockValidation.error
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true }
}

/**
 * Validate inventory item data
 * @param {Object} data - Inventory item data
 * @returns {Object} Validation result
 */
export function validateInventoryItem(data) {
  const errors = {}

  if (!data) {
    return {
      valid: false,
      errors: { general: 'Request body is required' }
    }
  }

  const nameValidation = validateNonEmptyString(data.name, 'name')
  if (!nameValidation.valid) {
    errors.name = nameValidation.error
  }

  const printerValidation = validateNonEmptyString(data.printer, 'printer')
  if (!printerValidation.valid) {
    errors.printer = printerValidation.error
  }

  const categoryValidation = validateNonEmptyString(data.category, 'category')
  if (!categoryValidation.valid) {
    errors.category = categoryValidation.error
  }

  if (data.stock !== undefined) {
    const stockValidation = validateNonNegativeInteger(data.stock, 'stock')
    if (!stockValidation.valid) {
      errors.stock = stockValidation.error
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true }
}

/**
 * Validate productivity task data
 * @param {Object} data - Task data
 * @returns {Object} Validation result
 */
export function validateTask(data) {
  const errors = {}

  if (!data) {
    return {
      valid: false,
      errors: { general: 'Request body is required' }
    }
  }

  const statusValidation = validateNonEmptyString(data.status, 'status')
  if (!statusValidation.valid) {
    errors.status = statusValidation.error
  } else if (!['available', 'working', 'unavailable'].includes(data.status)) {
    errors.status = 'status must be one of: available, working, unavailable'
  }

  const nameValidation = validateNonEmptyString(data.name, 'name')
  if (!nameValidation.valid) {
    errors.name = nameValidation.error
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true }
}

/**
 * Validate maintenance issue data
 * @param {Object} data - Issue data
 * @returns {Object} Validation result
 */
export function validateMaintenanceIssue(data) {
  const errors = {}

  if (!data) {
    return {
      valid: false,
      errors: { general: 'Request body is required' }
    }
  }

  const machineValidation = validateNonEmptyString(data.machine, 'machine')
  if (!machineValidation.valid) {
    errors.machine = machineValidation.error
  }

  const issueTypeValidation = validateNonEmptyString(data.issue_type, 'issue_type')
  if (!issueTypeValidation.valid) {
    errors.issue_type = issueTypeValidation.error
  }

  const issueSubtypeValidation = validateNonEmptyString(data.issue_subtype, 'issue_subtype')
  if (!issueSubtypeValidation.valid) {
    errors.issue_subtype = issueSubtypeValidation.error
  }

  const descriptionValidation = validateNonEmptyString(data.description, 'description')
  if (!descriptionValidation.valid) {
    errors.description = descriptionValidation.error
  }

  if (data.severity && !['low', 'medium', 'high', 'critical'].includes(data.severity)) {
    errors.severity = 'severity must be one of: low, medium, high, critical'
  }

  if (data.status && !['open', 'in_progress', 'resolved', 'closed'].includes(data.status)) {
    errors.status = 'status must be one of: open, in_progress, resolved, closed'
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true }
}

/**
 * Validate Pantone color data
 * @param {Object} data - Color data
 * @returns {Object} Validation result
 */
export function validatePantoneColor(data) {
  const errors = {}

  if (!data) {
    return {
      valid: false,
      errors: { general: 'Request body is required' }
    }
  }

  const nameValidation = validateNonEmptyString(data.name, 'name')
  if (!nameValidation.valid) {
    errors.name = nameValidation.error
  }

  if (data.status && !['matched', 'not_matched', 'old'].includes(data.status)) {
    errors.status = 'status must be one of: matched, not_matched, old'
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true }
}

/**
 * Validate todo data
 * @param {Object} data - Todo data
 * @returns {Object} Validation result
 */
export function validateTodo(data) {
  const errors = {}

  if (!data) {
    return {
      valid: false,
      errors: { general: 'Request body is required' }
    }
  }

  const textValidation = validateNonEmptyString(data.text, 'text')
  if (!textValidation.valid) {
    errors.text = textValidation.error
  }

  if (data.completed !== undefined && typeof data.completed !== 'boolean') {
    errors.completed = 'completed must be a boolean'
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true }
}

/**
 * Validates PIN for security requirements
 * @param {string} pin - The PIN to validate
 * @returns {string|null} - Error message if invalid, null if valid
 */
export function validatePIN(pin) {
  // Must be exactly 4 digits
  if (!/^\d{4}$/.test(pin)) {
    return 'PIN must be exactly 4 digits'
  }

  // Prohibit all same digits (0000, 1111, 2222, etc.)
  if (/^(\d)\1{3}$/.test(pin)) {
    return 'PIN cannot be all the same digit (e.g., 1111, 0000)'
  }

  // Prohibit sequential patterns (ascending and descending)
  const sequential = [
    '0123', '1234', '2345', '3456', '4567', '5678', '6789', // ascending
    '9876', '8765', '7654', '6543', '5432', '4321', '3210'  // descending
  ]
  if (sequential.includes(pin)) {
    return 'PIN cannot be sequential (e.g., 1234, 4321)'
  }

  return null // Valid PIN
}

/**
 * Validate service visit data
 * @param {Object} data - Service visit data
 * @returns {Object} Validation result
 */
export function validateServiceVisit(data) {
  const errors = {}

  if (!data) {
    return { valid: false, errors: { general: 'Request body is required' } }
  }

  const dateValidation = validateDate(data.date, 'date')
  if (!dateValidation.valid) {
    errors.date = dateValidation.error
  }

  const technicianValidation = validateNonEmptyString(data.technician, 'technician')
  if (!technicianValidation.valid) {
    errors.technician = technicianValidation.error
  }

  const machineValidation = validateNonEmptyString(data.machine, 'machine')
  if (!machineValidation.valid) {
    errors.machine = machineValidation.error
  }

  const visitTypeValidation = validateNonEmptyString(data.visit_type, 'visit_type')
  if (!visitTypeValidation.valid) {
    errors.visit_type = visitTypeValidation.error
  } else if (!['scheduled', 'emergency', 'warranty', 'installation'].includes(data.visit_type)) {
    errors.visit_type = 'visit_type must be one of: scheduled, emergency, warranty, installation'
  }

  if (data.time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.time)) {
    errors.time = 'time must be in HH:MM format (24-hour)'
  }

  if (data.cost !== undefined && data.cost !== null) {
    const cost = Number(data.cost)
    if (isNaN(cost) || cost < 0) {
      errors.cost = 'cost must be a non-negative number'
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true }
}
