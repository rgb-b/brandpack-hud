/**
 * Keyboard Navigation Service
 * Centralized keyboard shortcut management with priority system
 */

import commandRegistry from '../config/commands.js'

class KeyboardService {
  constructor() {
    this.listeners = new Map()
    this.shortcuts = new Map()
    this.sequences = new Map() // For chord shortcuts (G+I, G+P, etc.)
    this.sequenceBuffer = []
    this.sequenceTimeout = null
    this.enabled = true
    this.hintsVisible = false
    this.init()
  }

  init() {
    // Register global keyboard handler
    document.addEventListener('keydown', (e) => this.handleKeyDown(e), true)

    // Clear sequence buffer on any mouse click
    document.addEventListener('click', () => this.clearSequenceBuffer())
  }

  /**
   * Handle keyboard event with priority system
   */
  handleKeyDown(e) {
    if (!this.enabled) return

    // Ignore if typing in input/textarea (unless it's a modal/palette shortcut)
    const isInputElement = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
    const isModalShortcut = (e.ctrlKey || e.metaKey) && e.key === 'k'
    const isEscape = e.key === 'Escape'

    if (isInputElement && !isModalShortcut && !isEscape) {
      return
    }

    // Check for sequence shortcuts (G+X)
    const key = e.key.toUpperCase()
    if (key >= 'A' && key <= 'Z' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.handleSequenceKey(key, e)
      return
    }

    // Check for single-key shortcuts
    this.checkShortcuts(e)
  }

  /**
   * Handle chord/sequence shortcuts (G+I, G+P, etc.)
   */
  handleSequenceKey(key, e) {
    this.sequenceBuffer.push(key)

    // Clear buffer after 1.5 seconds
    clearTimeout(this.sequenceTimeout)
    this.sequenceTimeout = setTimeout(() => {
      this.clearSequenceBuffer()
    }, 1500)

    // Check if buffer matches any sequence
    const sequence = this.sequenceBuffer.join('+')
    const shortcut = this.sequences.get(sequence)

    if (shortcut) {
      e.preventDefault()
      e.stopPropagation()
      this.clearSequenceBuffer()
      shortcut.handler()
    }
  }

  /**
   * Clear sequence buffer
   */
  clearSequenceBuffer() {
    this.sequenceBuffer = []
    clearTimeout(this.sequenceTimeout)
  }

  /**
   * Check for matching shortcuts
   */
  checkShortcuts(e) {
    // Build shortcut key
    const modifiers = []
    if (e.ctrlKey) modifiers.push('Ctrl')
    if (e.metaKey) modifiers.push('Cmd')
    if (e.altKey) modifiers.push('Alt')
    if (e.shiftKey) modifiers.push('Shift')

    const key = e.key === ' ' ? 'Space' : e.key
    const shortcutKey = [...modifiers, key].join('+')

    const shortcut = this.shortcuts.get(shortcutKey)
    if (shortcut) {
      e.preventDefault()
      e.stopPropagation()
      shortcut.handler()
    }
  }

  /**
   * Register a keyboard shortcut
   * @param {string} keys - Shortcut keys (e.g., "Ctrl+K", "G+I", "/")
   * @param {function} handler - Handler function
   * @param {object} options - Options
   */
  register(keys, handler, options = {}) {
    const {
      description = '',
      category = 'General',
      global = false, // Global shortcuts work even in input fields
      priority = 0
    } = options

    const shortcut = {
      keys,
      handler,
      description,
      category,
      global,
      priority
    }

    // Check if it's a sequence shortcut (contains +)
    if (keys.includes('+') && !keys.includes('Ctrl') && !keys.includes('Cmd') && !keys.includes('Alt') && !keys.includes('Shift')) {
      this.sequences.set(keys, shortcut)
    } else {
      this.shortcuts.set(keys, shortcut)
    }

    return () => this.unregister(keys)
  }

  /**
   * Unregister a shortcut
   */
  unregister(keys) {
    this.shortcuts.delete(keys)
    this.sequences.delete(keys)
  }

  /**
   * Register multiple shortcuts
   */
  registerMany(shortcuts) {
    const unregisterFns = shortcuts.map(s => this.register(s.keys, s.handler, s.options))
    return () => unregisterFns.forEach(fn => fn())
  }

  /**
   * Get all registered shortcuts grouped by category
   */
  getAllShortcuts() {
    const allShortcuts = [
      ...Array.from(this.shortcuts.values()),
      ...Array.from(this.sequences.values())
    ]

    const grouped = {}
    allShortcuts.forEach(shortcut => {
      const category = shortcut.category || 'General'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(shortcut)
    })

    return grouped
  }

  /**
   * Enable/disable keyboard shortcuts
   */
  setEnabled(enabled) {
    this.enabled = enabled
  }

  /**
   * Show keyboard hints overlay
   */
  showHints() {
    if (this.hintsVisible) return

    this.hintsVisible = true
    const overlay = this.createHintsOverlay()
    document.body.appendChild(overlay)

    // Close on escape or click
    const closeHandler = (e) => {
      if (e.key === 'Escape' || e.type === 'click') {
        this.hideHints()
        document.removeEventListener('keydown', closeHandler)
      }
    }
    document.addEventListener('keydown', closeHandler)
  }

  /**
   * Hide keyboard hints overlay
   */
  hideHints() {
    const overlay = document.getElementById('keyboard-hints-overlay')
    if (overlay) {
      overlay.classList.remove('keyboard-hints-show')
      setTimeout(() => overlay.remove(), 200)
    }
    this.hintsVisible = false
  }

  /**
   * Create keyboard hints overlay
   */
  createHintsOverlay() {
    const overlay = document.createElement('div')
    overlay.id = 'keyboard-hints-overlay'
    overlay.className = 'keyboard-hints-overlay'

    const shortcuts = this.getAllShortcuts()
    const commands = commandRegistry.getAll()

    let html = `
      <div class="keyboard-hints">
        <div class="keyboard-hints-header">
          <h2>Keyboard Shortcuts</h2>
          <button class="keyboard-hints-close" onclick="this.closest('.keyboard-hints-overlay').remove()">×</button>
        </div>
        <div class="keyboard-hints-content">
    `

    // Global shortcuts
    html += `
      <div class="keyboard-hints-section">
        <h3>Global</h3>
        <div class="keyboard-hints-list">
          <div class="keyboard-hint-item">
            <kbd>Ctrl</kbd> + <kbd>K</kbd>
            <span>Open Command Palette</span>
          </div>
          <div class="keyboard-hint-item">
            <kbd>?</kbd>
            <span>Show Keyboard Shortcuts</span>
          </div>
          <div class="keyboard-hint-item">
            <kbd>Esc</kbd>
            <span>Close Overlay/Modal</span>
          </div>
        </div>
      </div>
    `

    // Navigation shortcuts from commands
    const navCommands = commands.filter(cmd => cmd.category === 'Navigation' && cmd.hotkey)
    if (navCommands.length > 0) {
      html += `
        <div class="keyboard-hints-section">
          <h3>Navigation</h3>
          <div class="keyboard-hints-list">
      `
      navCommands.forEach(cmd => {
        const keys = cmd.hotkey.split(' ').map(k => `<kbd>${k}</kbd>`).join(' + ')
        html += `
          <div class="keyboard-hint-item">
            ${keys}
            <span>${cmd.title.replace('Go to ', '')}</span>
          </div>
        `
      })
      html += `
          </div>
        </div>
      `
    }

    // Dashboard shortcuts (launcher page only)
    if (window.location.pathname.includes('/launcher/')) {
      html += `
        <div class="keyboard-hints-section">
          <h3>Dashboard</h3>
          <div class="keyboard-hints-list">
            <div class="keyboard-hint-item">
              <kbd>T</kbd>
              <span>Focus todo input</span>
            </div>
          </div>
        </div>
      `
    }

    // Timeclock shortcuts (always shown — available on productivity pages)
    html += `
      <div class="keyboard-hints-section">
        <h3>Timeclock</h3>
        <div class="keyboard-hints-list">
          <div class="keyboard-hint-item">
            <kbd>Ctrl</kbd> + <kbd>I</kbd>
            <span>Clock In</span>
          </div>
          <div class="keyboard-hint-item">
            <kbd>Ctrl</kbd> + <kbd>O</kbd>
            <span>Clock Out</span>
          </div>
          <div class="keyboard-hint-item">
            <kbd>Ctrl</kbd> + <kbd>T</kbd>
            <span>Open Timecard</span>
          </div>
        </div>
      </div>
    `

    // Tool-specific shortcuts
    for (const [category, categoryShortcuts] of Object.entries(shortcuts)) {
      if (categoryShortcuts.length === 0) continue

      html += `
        <div class="keyboard-hints-section">
          <h3>${category}</h3>
          <div class="keyboard-hints-list">
      `
      categoryShortcuts.forEach(shortcut => {
        const keys = shortcut.keys.split('+').map(k => `<kbd>${k}</kbd>`).join(' + ')
        html += `
          <div class="keyboard-hint-item">
            ${keys}
            <span>${shortcut.description}</span>
          </div>
        `
      })
      html += `
          </div>
        </div>
      `
    }

    html += `
        </div>
        <div class="keyboard-hints-footer">
          Press <kbd>Esc</kbd> to close
        </div>
      </div>
    `

    overlay.innerHTML = html

    // Trigger animation
    requestAnimationFrame(() => {
      overlay.classList.add('keyboard-hints-show')
    })

    // Close on background click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hideHints()
      }
    })

    return overlay
  }
}

// Create global instance
const keyboardService = new KeyboardService()

// Register global shortcuts
keyboardService.register('?', () => {
  keyboardService.showHints()
}, {
  description: 'Show keyboard shortcuts',
  category: 'Global',
  global: true
})

// Export for use in other modules
export default keyboardService
