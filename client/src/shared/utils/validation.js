/**
 * Input validation utilities
 */

/**
 * Validate date string (YYYY-MM-DD format)
 * @param {string} dateString
 * @returns {boolean}
 */
export function isValidDate(dateString) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) {
    return false
  }

  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * Validate time string (HH:MM or HH:MM:SS format)
 * @param {string} timeString
 * @returns {boolean}
 */
export function isValidTime(timeString) {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/
  return timeRegex.test(timeString)
}

/**
 * Validate number (positive integer)
 * @param {string|number} value
 * @returns {boolean}
 */
export function isPositiveInteger(value) {
  const num = Number(value)
  return Number.isInteger(num) && num > 0
}

/**
 * Validate number (non-negative integer)
 * @param {string|number} value
 * @returns {boolean}
 */
export function isNonNegativeInteger(value) {
  const num = Number(value)
  return Number.isInteger(num) && num >= 0
}

/**
 * Validate number (positive float)
 * @param {string|number} value
 * @returns {boolean}
 */
export function isPositiveNumber(value) {
  const num = Number(value)
  return !isNaN(num) && num > 0
}

/**
 * Validate string is not empty
 * @param {string} value
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Validate Pantone color name format
 * @param {string} colorName
 * @returns {boolean}
 */
export function isValidPantoneColor(colorName) {
  return /^PANTONE\s+\d+\s+C$/.test(colorName)
}

/**
 * Validate backup data structure
 * @param {object} data
 * @returns {boolean}
 */
export function isValidBackupData(data) {
  if (!data || typeof data !== 'object') {
    return false
  }

  // Check for required top-level keys
  const requiredKeys = ['version', 'exportDate']
  for (const key of requiredKeys) {
    if (!(key in data)) {
      return false
    }
  }

  // Check version format
  if (!/^\d+\.\d+(\.\d+)?$/.test(data.version)) {
    return false
  }

  // Check export date
  if (!isValidDate(data.exportDate.split('T')[0])) {
    return false
  }

  return true
}
