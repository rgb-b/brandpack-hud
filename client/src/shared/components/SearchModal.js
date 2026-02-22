/**
 * Global Search Modal Component
 * Unified search across all tools (Ctrl+Shift+F)
 */

import { search } from '../../api/client.js'
import toast from './Toast.js'

class SearchModal {
  constructor() {
    this.isOpen = false
    this.searchQuery = ''
    this.results = null
    this.selectedIndex = 0
    this.allResults = []
    this.debounceTimeout = null
    this.container = null
    this.input = null
    this.resultsList = null
    this.init()
  }

  init() {
    // Create modal container
    this.container = document.createElement('div')
    this.container.className = 'search-modal-overlay'
    this.container.style.display = 'none'

    this.container.innerHTML = `
      <div class="search-modal">
        <div class="search-modal-header">
          <svg class="search-modal-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            class="search-modal-input"
            placeholder="Search inventory, pantone, maintenance, todos..."
            autocomplete="off"
            spellcheck="false"
          />
          <kbd class="search-modal-hint">ESC</kbd>
        </div>
        <div class="search-modal-results" id="searchModalResults"></div>
        <div class="search-modal-footer">
          <div class="search-modal-shortcuts">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span><kbd>Enter</kbd> Open</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(this.container)

    // Get references
    this.input = this.container.querySelector('.search-modal-input')
    this.resultsList = this.container.querySelector('.search-modal-results')

    // Bind event listeners
    this.setupEventListeners()

    // Register global keyboard shortcut
    this.registerGlobalShortcut()
  }

  setupEventListeners() {
    // Search input with debounce
    this.input.addEventListener('input', () => {
      clearTimeout(this.debounceTimeout)
      this.debounceTimeout = setTimeout(() => {
        this.handleSearch()
      }, 300)
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
      // Ctrl+Shift+F to open
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
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
    this.searchQuery = ''
    this.selectedIndex = 0
    this.results = null

    // Show empty state
    this.renderEmptyState()

    // Focus input
    requestAnimationFrame(() => {
      this.input.focus()
    })

    // Trigger animation
    requestAnimationFrame(() => {
      this.container.classList.add('search-modal-open')
    })
  }

  close() {
    if (!this.isOpen) return

    this.isOpen = false
    this.container.classList.remove('search-modal-open')

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

  async handleSearch() {
    const query = this.input.value.trim()
    this.searchQuery = query

    if (query.length < 2) {
      this.renderEmptyState()
      return
    }

    // Show loading state
    this.renderLoading()

    try {
      const response = await search.searchAll(query, { limit: 5 })
      this.results = response.data || response
      this.allResults = this.flattenResults(this.results)
      this.selectedIndex = 0
      this.render()
    } catch (error) {
      console.error('Search error:', error)
      this.renderError(error.message)
    }
  }

  flattenResults(results) {
    const flat = []

    if (results.inventory?.length > 0) {
      results.inventory.forEach(item => {
        flat.push({ ...item, _type: 'inventory' })
      })
    }

    if (results.pantone?.length > 0) {
      results.pantone.forEach(item => {
        flat.push({ ...item, _type: 'pantone' })
      })
    }

    if (results.maintenance?.length > 0) {
      results.maintenance.forEach(item => {
        flat.push({ ...item, _type: 'maintenance' })
      })
    }

    if (results.todos?.length > 0) {
      results.todos.forEach(item => {
        flat.push({ ...item, _type: 'todos' })
      })
    }

    if (results.productivity?.length > 0) {
      results.productivity.forEach(item => {
        flat.push({ ...item, _type: 'productivity' })
      })
    }

    return flat
  }

  handleKeydown(e) {
    if (!this.allResults || this.allResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.allResults.length - 1)
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
        this.openSelected()
        break

      case 'Escape':
        e.preventDefault()
        this.close()
        break

      default:
        break
    }
  }

  openSelected() {
    const item = this.allResults[this.selectedIndex]
    if (!item) return

    this.close()

    // Navigate to the appropriate tool page
    switch (item._type) {
      case 'inventory':
        window.location.href = `/inventory/index.html?id=${item.id}`
        break
      case 'pantone':
        window.location.href = `/pantone/index.html?id=${item.id}`
        break
      case 'maintenance':
        window.location.href = `/maintenance/index.html?id=${item.id}`
        break
      case 'todos':
        window.location.href = `/launcher/index.html#todo-${item.id}`
        break
      case 'productivity':
        window.location.href = `/productivity-v4/index.html`
        break
      default:
        toast.warning('Unable to open this item')
    }
  }

  scrollToSelected() {
    const selectedEl = this.resultsList.querySelector('.search-result-selected')
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }

  renderEmptyState() {
    this.resultsList.innerHTML = `
      <div class="search-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <p>Start typing to search...</p>
        <div class="search-empty-hints">
          <span class="search-empty-hint">📦 Inventory items</span>
          <span class="search-empty-hint">🎨 Pantone colors</span>
          <span class="search-empty-hint">🔧 Maintenance issues</span>
          <span class="search-empty-hint">✓ Todo tasks</span>
        </div>
      </div>
    `
  }

  renderLoading() {
    this.resultsList.innerHTML = `
      <div class="search-loading">
        <svg class="search-loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" opacity="0.25"/>
          <path d="M12 2a10 10 0 0110 10" opacity="0.75"/>
        </svg>
        <p>Searching...</p>
      </div>
    `
  }

  renderError(message) {
    this.resultsList.innerHTML = `
      <div class="search-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <circle cx="12" cy="16" r="0.5" fill="currentColor"/>
        </svg>
        <p>${message || 'Search failed'}</p>
      </div>
    `
  }

  render() {
    if (!this.results || this.allResults.length === 0) {
      this.resultsList.innerHTML = `
        <div class="search-no-results">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          <p>No results found for "${this.searchQuery}"</p>
        </div>
      `
      return
    }

    let html = ''
    let flatIndex = 0

    // Render results by category
    for (const [category, items] of Object.entries(this.results)) {
      if (items.length === 0) continue

      const categoryIcons = {
        inventory: '📦',
        pantone: '🎨',
        maintenance: '🔧',
        todos: '✓',
        productivity: '⏱️'
      }

      const categoryLabels = {
        inventory: 'Inventory',
        pantone: 'Pantone Colors',
        maintenance: 'Maintenance Issues',
        todos: 'To-Do List',
        productivity: 'Productivity'
      }

      html += `<div class="search-category">${categoryIcons[category]} ${categoryLabels[category]}</div>`

      items.forEach(item => {
        const isSelected = flatIndex === this.selectedIndex
        html += this.renderResultItem(item, category, isSelected, flatIndex)
        flatIndex++
      })
    }

    this.resultsList.innerHTML = html

    // Add click handlers
    this.resultsList.querySelectorAll('.search-result').forEach((el, idx) => {
      el.addEventListener('click', () => {
        this.selectedIndex = idx
        this.openSelected()
      })
    })
  }

  renderResultItem(item, type, isSelected, index) {
    let title = ''
    let subtitle = ''
    let icon = ''

    switch (type) {
      case 'inventory':
        title = item.name
        subtitle = `${item.printer} • ${item.category} • Stock: ${item.stock} ${item.unit}`
        icon = '📦'
        break
      case 'pantone':
        title = item.name
        subtitle = `Status: ${item.status}${item.match_date ? ` • Matched: ${item.match_date}` : ''}`
        icon = '🎨'
        break
      case 'maintenance':
        title = `${item.machine} - ${item.issue_type}`
        subtitle = `${item.severity} • ${item.status} • ${item.description.substring(0, 50)}...`
        icon = '🔧'
        break
      case 'todos':
        title = item.text
        subtitle = item.completed ? 'Completed' : 'Pending'
        icon = item.completed ? '✓' : '○'
        break
      case 'productivity':
        title = `${item.task} (${item.status})`
        subtitle = `${item.occurrences} entries • ${Math.round(item.total_duration / 60000)}min total`
        icon = '⏱️'
        break
      default:
        title = 'Unknown'
        subtitle = ''
        icon = '•'
    }

    return `
      <div class="search-result ${isSelected ? 'search-result-selected' : ''}" data-index="${index}">
        <span class="search-result-icon">${icon}</span>
        <div class="search-result-content">
          <div class="search-result-title">${title}</div>
          <div class="search-result-subtitle">${subtitle}</div>
        </div>
      </div>
    `
  }
}

// Create global instance
const searchModal = new SearchModal()

// Export for programmatic access
export default searchModal
