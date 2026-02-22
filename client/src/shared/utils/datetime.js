/**
 * Date and time utility functions
 */

/**
 * Format date as YYYY-MM-DD
 * @param {Date|string} date - Date object or date string
 * @returns {string}
 */
export function formatDate(date = new Date()) {
  // If date is a string, parse it first
  if (typeof date === 'string') {
    date = new Date(date)
  }

  // If invalid date, return the original value
  if (!date || isNaN(date.getTime())) {
    return String(date)
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format time as HH:MM:SS
 * @param {Date} date - Date object
 * @returns {string}
 */
export function formatTime(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

/**
 * Format datetime as YYYY-MM-DD HH:MM:SS
 * @param {Date} date - Date object
 * @returns {string}
 */
export function formatDateTime(date = new Date()) {
  return `${formatDate(date)} ${formatTime(date)}`
}

/**
 * Format seconds to HH:MM:SS
 * @param {number} seconds - Total seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Parse date string (YYYY-MM-DD) to Date object
 * @param {string} dateString - Date string
 * @returns {Date|null}
 */
export function parseDate(dateString) {
  try {
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * Get days between two dates
 * @param {Date} date1
 * @param {Date} date2
 * @returns {number}
 */
export function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round(Math.abs((date1 - date2) / oneDay))
}

/**
 * Check if date is older than specified years
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @param {number} years - Number of years
 * @returns {boolean}
 */
export function isOlderThanYears(dateString, years = 5) {
  const date = parseDate(dateString)
  if (!date) return false

  const yearsAgo = new Date()
  yearsAgo.setFullYear(yearsAgo.getFullYear() - years)
  return date < yearsAgo
}
