/**
 * Date Helper Utilities
 * Provides consistent date formatting and parsing across the application
 */

/**
 * Format a date to YYYY-MM-DD string
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  const d = new Date(date)
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date')
  }

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Format a date to ISO 8601 datetime string
 * @param {Date|string|number} date - Date to format
 * @returns {string} ISO datetime string
 */
export function formatDateTime(date) {
  const d = new Date(date)
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date')
  }

  return d.toISOString()
}

/**
 * Parse a date string to Date object
 * @param {string} dateString - Date string to parse
 * @returns {Date|null} Parsed date or null if invalid
 */
export function parseDate(dateString) {
  if (!dateString) return null

  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Get current date as YYYY-MM-DD string
 * @returns {string} Current date
 */
export function getCurrentDate() {
  return formatDate(new Date())
}

/**
 * Get current datetime as ISO string
 * @returns {string} Current datetime
 */
export function getCurrentDateTime() {
  return formatDateTime(new Date())
}

/**
 * Get date range (start and end dates)
 * @param {number} days - Number of days in the past
 * @returns {Object} Object with startDate and endDate
 */
export function getDateRange(days) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  }
}

/**
 * Check if a date string is valid
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid
 */
export function isValidDate(dateString) {
  return parseDate(dateString) !== null
}

/**
 * Calculate difference in days between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Difference in days
 */
export function daysDifference(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    throw new Error('Invalid date')
  }

  const diffTime = Math.abs(d2 - d1)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Check if a date is older than specified years
 * @param {Date|string} date - Date to check
 * @param {number} years - Number of years
 * @returns {boolean} True if older
 */
export function isOlderThanYears(date, years) {
  const d = new Date(date)
  if (isNaN(d.getTime())) {
    return false
  }

  const now = new Date()
  const yearsDiff = (now - d) / (1000 * 60 * 60 * 24 * 365)

  return yearsDiff > years
}
