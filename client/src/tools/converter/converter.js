/**
 * LAB-CMYK Converter
 * Color space conversion utilities
 */

import '../../shared/components/AppHeader.js'
import '../../shared/components/AppFooter.js'
import { requireAuth } from '../../shared/utils/auth.js'
import '../../shared/utils/cyberpunk-effects.js'

// State
let conversionInProgress = false

/**
 * Convert LAB to RGB color space
 * @param {number} l - Lightness (0-100)
 * @param {number} a - Green-Red axis (-128 to 127)
 * @param {number} b - Blue-Yellow axis (-128 to 127)
 * @returns {{r: number, g: number, b: number}}
 */
function labToRGB(l, a, b) {
  // LAB to XYZ
  let y = (l + 16) / 116
  let x = a / 500 + y
  let z = y - b / 200

  x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16/116) / 7.787)
  y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16/116) / 7.787)
  z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16/116) / 7.787)

  // XYZ to RGB
  x = x * 100
  y = y * 100
  z = z * 100

  let r = x *  3.2406 + y * -1.5372 + z * -0.4986
  let g = x * -0.9689 + y *  1.8758 + z *  0.0415
  let bl = x *  0.0557 + y * -0.2040 + z *  1.0570

  r = (r > 0.0031308) ? (1.055 * Math.pow(r / 100, 1/2.4) - 0.055) : (r / 100 * 12.92)
  g = (g > 0.0031308) ? (1.055 * Math.pow(g / 100, 1/2.4) - 0.055) : (g / 100 * 12.92)
  bl = (bl > 0.0031308) ? (1.055 * Math.pow(bl / 100, 1/2.4) - 0.055) : (bl / 100 * 12.92)

  return {
    r: Math.max(0, Math.min(255, Math.round(r * 255))),
    g: Math.max(0, Math.min(255, Math.round(g * 255))),
    b: Math.max(0, Math.min(255, Math.round(bl * 255)))
  }
}

/**
 * Convert RGB to LAB color space
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {{l: number, a: number, b: number}}
 */
function rgbToLAB(r, g, b) {
  // RGB to XYZ
  r = r / 255
  g = g / 255
  b = b / 255

  r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
  g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
  b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92

  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883

  x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x + 16/116)
  y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y + 16/116)
  z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z + 16/116)

  return {
    l: (116 * y) - 16,
    a: 500 * (x - y),
    b: 200 * (y - z)
  }
}

/**
 * Convert RGB to CMYK color space
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {{c: number, m: number, y: number, k: number}}
 */
function rgbToCMYK(r, g, b) {
  let c = 1 - (r / 255)
  let m = 1 - (g / 255)
  let y = 1 - (b / 255)
  let k = Math.min(c, m, y)

  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 }
  }

  c = ((c - k) / (1 - k)) * 100
  m = ((m - k) / (1 - k)) * 100
  y = ((y - k) / (1 - k)) * 100
  k = k * 100

  return {
    c: Math.round(c),
    m: Math.round(m),
    y: Math.round(y),
    k: Math.round(k)
  }
}

/**
 * Convert CMYK to RGB color space
 * @param {number} c - Cyan (0-100)
 * @param {number} m - Magenta (0-100)
 * @param {number} y - Yellow (0-100)
 * @param {number} k - Black (0-100)
 * @returns {{r: number, g: number, b: number}}
 */
function cmykToRGB(c, m, y, k) {
  c = c / 100
  m = m / 100
  y = y / 100
  k = k / 100

  let r = 255 * (1 - c) * (1 - k)
  let g = 255 * (1 - m) * (1 - k)
  let b = 255 * (1 - y) * (1 - k)

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b)
  }
}

/**
 * Update the color preview display
 * @param {{r: number, g: number, b: number}} rgb
 */
function updateDisplay(rgb) {
  const colorBox = document.getElementById('colorBox')
  const rgbValue = document.getElementById('rgbValue')
  const hexValue = document.getElementById('hexValue')

  const hex = '#' + [rgb.r, rgb.g, rgb.b].map(x => {
    const h = x.toString(16)
    return h.length === 1 ? '0' + h : h
  }).join('')

  colorBox.style.backgroundColor = hex
  rgbValue.textContent = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  hexValue.textContent = hex.toUpperCase()
}

/**
 * Convert LAB to CMYK and update display
 */
function labToCMYK() {
  if (conversionInProgress) return
  conversionInProgress = true

  const l = parseFloat(document.getElementById('lab-l').value) || 0
  const a = parseFloat(document.getElementById('lab-a').value) || 0
  const b = parseFloat(document.getElementById('lab-b').value) || 0

  const rgb = labToRGB(l, a, b)
  const cmyk = rgbToCMYK(rgb.r, rgb.g, rgb.b)

  document.getElementById('cmyk-c').value = cmyk.c
  document.getElementById('cmyk-m').value = cmyk.m
  document.getElementById('cmyk-y').value = cmyk.y
  document.getElementById('cmyk-k').value = cmyk.k

  updateDisplay(rgb)
  conversionInProgress = false
}

/**
 * Convert CMYK to LAB and update display
 */
function cmykToLAB() {
  if (conversionInProgress) return
  conversionInProgress = true

  const c = parseFloat(document.getElementById('cmyk-c').value) || 0
  const m = parseFloat(document.getElementById('cmyk-m').value) || 0
  const y = parseFloat(document.getElementById('cmyk-y').value) || 0
  const k = parseFloat(document.getElementById('cmyk-k').value) || 0

  const rgb = cmykToRGB(c, m, y, k)
  const lab = rgbToLAB(rgb.r, rgb.g, rgb.b)

  document.getElementById('lab-l').value = lab.l.toFixed(1)
  document.getElementById('lab-a').value = lab.a.toFixed(1)
  document.getElementById('lab-b').value = lab.b.toFixed(1)

  updateDisplay(rgb)
  conversionInProgress = false
}

/**
 * Copy all color values to clipboard
 */
function copyValues() {
  const l = document.getElementById('lab-l').value
  const a = document.getElementById('lab-a').value
  const b = document.getElementById('lab-b').value
  const c = document.getElementById('cmyk-c').value
  const m = document.getElementById('cmyk-m').value
  const y = document.getElementById('cmyk-y').value
  const k = document.getElementById('cmyk-k').value
  const rgb = document.getElementById('rgbValue').textContent
  const hex = document.getElementById('hexValue').textContent

  const text = `LAB: L*${l} a*${a} b*${b}\nCMYK: C${c} M${m} Y${y} K${k}\nRGB: ${rgb}\nHex: ${hex}`

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyBtn')
    const originalText = btn.textContent
    btn.textContent = '✓ Copied!'
    btn.style.background = '#10b981'
    setTimeout(() => {
      btn.textContent = originalText
      btn.style.background = ''
    }, 2000)
  })
}

/**
 * Reset all values to defaults
 */
function resetValues() {
  document.getElementById('lab-l').value = 50
  document.getElementById('lab-a').value = 0
  document.getElementById('lab-b').value = 0
  document.getElementById('cmyk-c').value = 0
  document.getElementById('cmyk-m').value = 0
  document.getElementById('cmyk-y').value = 0
  document.getElementById('cmyk-k').value = 50
  cmykToLAB()
}

/**
 * Initialize the converter
 */
async function init() {
  // Check authentication first
  const user = await requireAuth()
  if (!user) return // requireAuth redirects to login if not authenticated

  // Add event listeners to LAB inputs
  document.getElementById('lab-l').addEventListener('input', labToCMYK)
  document.getElementById('lab-a').addEventListener('input', labToCMYK)
  document.getElementById('lab-b').addEventListener('input', labToCMYK)

  // Add event listeners to CMYK inputs
  document.getElementById('cmyk-c').addEventListener('input', cmykToLAB)
  document.getElementById('cmyk-m').addEventListener('input', cmykToLAB)
  document.getElementById('cmyk-y').addEventListener('input', cmykToLAB)
  document.getElementById('cmyk-k').addEventListener('input', cmykToLAB)

  // Add button listeners
  document.getElementById('copyBtn').addEventListener('click', copyValues)
  document.getElementById('resetBtn').addEventListener('click', resetValues)

  // Initialize display
  cmykToLAB()
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
