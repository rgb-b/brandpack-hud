/**
 * Command Palette Component
 * Universal keyboard shortcut overlay with fuzzy search (Ctrl+K)
 */

import commandRegistry from '../config/commands.js'

class CommandPalette {
  constructor() {
    this.isOpen = false
    this.selectedIndex = 0
    this.filteredCommands = []
    this.container = null
    this.input = null
    this.resultsList = null
    this.init()
  }

  init() {
    // Create palette container
    this.container = document.createElement('div')
    this.container.className = 'command-palette-overlay'
    this.container.style.display = 'none'

    this.container.innerHTML = `
      <div class="command-palette">
        <div class="command-palette-header">
          <svg class="command-palette-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            class="command-palette-input"
            placeholder="Type a command or search..."
            autocomplete="off"
            spellcheck="false"
          />
          <kbd class="command-palette-hint">ESC</kbd>
        </div>
        <div class="command-palette-results" id="command-palette-results"></div>
        <div class="command-palette-footer">
          <div class="command-palette-shortcuts">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span><kbd>Enter</kbd> Select</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(this.container)

    // Get references
    this.input = this.container.querySelector('.command-palette-input')
    this.resultsList = this.container.querySelector('.command-palette-results')

    // Bind event listeners
    this.setupEventListeners()

    // Register global keyboard shortcut
    this.registerGlobalShortcut()
  }

  setupEventListeners() {
    // Search input
    this.input.addEventListener('input', () => {
      this.handleSearch()
    })

    // Keyboard navigation
    this.input.addEventListener('keydown', (e) => {
      this.handleKeydown(e)
    })

    // Click outside to close
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close()
      }
    })

    // Prevent default on results list
    this.resultsList.addEventListener('mousedown', (e) => {
      e.preventDefault() // Prevent input blur
    })
  }

  registerGlobalShortcut() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K to open
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        this.toggle()
      }

      // Escape to close when open
      if (e.key === 'Escape' && this.isOpen) {
        this.close()
      }
    })
  }

  open() {
    if (this.isOpen) return

    this.isOpen = true
    this.container.style.display = 'flex'
    this.input.value = ''
    this.selectedIndex = 0

    // Render all commands initially
    this.handleSearch()

    // Focus input
    requestAnimationFrame(() => {
      this.input.focus()
    })

    // Trigger animation
    requestAnimationFrame(() => {
      this.container.classList.add('command-palette-open')
    })
  }

  close() {
    if (!this.isOpen) return

    this.isOpen = false
    this.container.classList.remove('command-palette-open')

    // Wait for animation before hiding
    setTimeout(() => {
      this.container.style.display = 'none'
    }, 200)
  }

  toggle() {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  handleSearch() {
    const query = this.input.value.trim()
    this.filteredCommands = commandRegistry.search(query)
    this.selectedIndex = 0
    this.render()
  }

  handleKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1)
        this.render()
        this.scrollToSelected()
        break

      case 'ArrowUp':
        e.preventDefault()
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0)
        this.render()
        this.scrollToSelected()
        break

      case 'Enter':
        e.preventDefault()
        this.executeSelected()
        break

      case 'Escape':
        e.preventDefault()
        this.close()
        break

      default:
        break
    }
  }

  executeSelected() {
    const command = this.filteredCommands[this.selectedIndex]
    if (!command) return

    // Close palette
    this.close()

    // Execute command
    try {
      command.handler()
    } catch (error) {
      console.error('Command execution error:', error)
    }
  }

  scrollToSelected() {
    const selectedEl = this.resultsList.querySelector('.command-item-selected')
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }

  render() {
    if (this.filteredCommands.length === 0) {
      this.resultsList.innerHTML = `
        <div class="command-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <circle cx="12" cy="16" r="0.5" fill="currentColor"/>
          </svg>
          <p>No commands found</p>
        </div>
      `
      return
    }

    // Group commands by category
    const groupedCommands = this.groupByCategory(this.filteredCommands)

    let html = ''
    let itemIndex = 0

    for (const [category, commands] of Object.entries(groupedCommands)) {
      html += `<div class="command-category">${category}</div>`

      commands.forEach(cmd => {
        const isSelected = itemIndex === this.selectedIndex
        const hotkeyHtml = cmd.hotkey
          ? `<kbd class="command-hotkey">${cmd.hotkey.replace(/ /g, '</kbd><kbd>')}</kbd>`
          : ''

        html += `
          <div class="command-item ${isSelected ? 'command-item-selected' : ''}" data-index="${itemIndex}">
            <span class="command-icon">${cmd.icon}</span>
            <span class="command-title">${this.highlightMatch(cmd.title, this.input.value)}</span>
            <span class="command-hotkeys">${hotkeyHtml}</span>
          </div>
        `
        itemIndex++
      })
    }

    this.resultsList.innerHTML = html

    // Add click handlers
    this.resultsList.querySelectorAll('.command-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index)
        this.selectedIndex = index
        this.executeSelected()
      })
    })
  }

  groupByCategory(commands) {
    const groups = {}
    commands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = []
      }
      groups[cmd.category].push(cmd)
    })
    return groups
  }

  highlightMatch(text, query) {
    if (!query) return text

    const regex = new RegExp(`(${query.split(' ').filter(Boolean).join('|')})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }
}

// Create global instance
const commandPalette = new CommandPalette()

// Export for programmatic access
export default commandPalette
