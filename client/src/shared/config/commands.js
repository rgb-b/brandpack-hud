/**
 * Command Registry for Command Palette
 * Central registry of all available commands across the application
 */

import keyboardService from '../utils/keyboard.js'

class CommandRegistry {
  constructor() {
    this.commands = new Map()
    this.categories = new Set()
  }

  /**
   * Register a command
   * @param {Object} command - Command configuration
   */
  register(command) {
    const {
      id,
      title,
      category = 'General',
      icon = '•',
      hotkey = null,
      keywords = [],
      handler,
      condition = () => true, // Function to determine if command is available
      priority = 0 // Higher priority commands appear first
    } = command

    if (!id || !title || !handler) {
      console.error('Invalid command:', command)
      return
    }

    this.commands.set(id, {
      id,
      title,
      category,
      icon,
      hotkey,
      keywords,
      handler,
      condition,
      priority
    })

    this.categories.add(category)

    // Auto-register keyboard shortcut if hotkey is specified
    if (hotkey && keyboardService) {
      // Convert "G D" to "G+D" for keyboard service
      const shortcutKey = hotkey.replace(/\s+/g, '+')
      keyboardService.register(shortcutKey, handler, {
        description: title,
        category,
        priority
      })
    }
  }

  /**
   * Register multiple commands at once
   */
  registerMany(commands) {
    commands.forEach(cmd => this.register(cmd))
  }

  /**
   * Get all available commands
   */
  getAll() {
    return Array.from(this.commands.values())
      .filter(cmd => cmd.condition())
      .sort((a, b) => {
        // Sort by category first, then priority, then title
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category)
        }
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        return a.title.localeCompare(b.title)
      })
  }

  /**
   * Search commands by query
   */
  search(query) {
    if (!query) return this.getAll()

    const lowerQuery = query.toLowerCase()
    const terms = lowerQuery.split(' ').filter(Boolean)

    return this.getAll()
      .map(cmd => {
        // Calculate relevance score
        let score = 0

        // Exact title match = highest score
        if (cmd.title.toLowerCase() === lowerQuery) {
          score += 1000
        }

        // Title starts with query
        if (cmd.title.toLowerCase().startsWith(lowerQuery)) {
          score += 500
        }

        // Title contains all terms
        const titleLower = cmd.title.toLowerCase()
        const categoryLower = cmd.category.toLowerCase()
        const allKeywords = [...cmd.keywords, cmd.category, cmd.title].join(' ').toLowerCase()

        terms.forEach(term => {
          if (titleLower.includes(term)) score += 100
          if (categoryLower.includes(term)) score += 50
          if (allKeywords.includes(term)) score += 20
        })

        return { ...cmd, score }
      })
      .filter(cmd => cmd.score > 0)
      .sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score
        }
        return a.title.localeCompare(b.title)
      })
  }

  /**
   * Get command by ID
   */
  get(id) {
    return this.commands.get(id)
  }

  /**
   * Execute a command by ID
   */
  execute(id) {
    const command = this.get(id)
    if (!command) {
      console.error(`Command not found: ${id}`)
      return false
    }

    if (!command.condition()) {
      console.warn(`Command not available: ${id}`)
      return false
    }

    try {
      command.handler()
      return true
    } catch (error) {
      console.error(`Error executing command ${id}:`, error)
      return false
    }
  }

  /**
   * Clear all commands
   */
  clear() {
    this.commands.clear()
    this.categories.clear()
  }

  /**
   * Get all categories
   */
  getCategories() {
    return Array.from(this.categories).sort()
  }
}

// Create global registry instance
const commandRegistry = new CommandRegistry()

// Helper function to get proper tool path (handles dev vs prod)
function getToolPath(toolName) {
  const currentPath = window.location.pathname

  // If we're in /src/tools/ structure (dev mode), use relative paths
  if (currentPath.includes('/src/tools/')) {
    return `../${toolName}/index.html`
  }

  // Otherwise use absolute paths (production)
  return `/${toolName}/index.html`
}

// Register global navigation commands
commandRegistry.registerMany([
  {
    id: 'nav-dashboard',
    title: 'Go to Dashboard',
    category: 'Navigation',
    icon: '🏠',
    hotkey: 'G D',
    keywords: ['home', 'launcher', 'main'],
    handler: () => {
      if (!window.location.pathname.includes('/launcher/')) {
        window.location.href = getToolPath('launcher')
      }
    },
    priority: 100
  },
  {
    id: 'nav-inventory',
    title: 'Go to Inventory',
    category: 'Navigation',
    icon: '📦',
    hotkey: 'G I',
    keywords: ['stock', 'items', 'supplies'],
    handler: () => {
      if (!window.location.pathname.includes('/inventory/')) {
        window.location.href = getToolPath('inventory')
      }
    },
    priority: 90
  },
  {
    id: 'nav-productivity',
    title: 'Go to Productivity',
    category: 'Navigation',
    icon: '⏱️',
    hotkey: 'G P',
    keywords: ['time', 'tracking', 'tasks', 'clock'],
    handler: () => {
      if (!window.location.pathname.includes('/productivity-v4/')) {
        window.location.href = getToolPath('productivity-v4')
      }
    },
    priority: 80
  },
  {
    id: 'nav-pantone',
    title: 'Go to Pantone Tracker',
    category: 'Navigation',
    icon: '🎨',
    hotkey: 'G T',
    keywords: ['colors', 'pantone', 'swatches'],
    handler: () => {
      if (!window.location.pathname.includes('/pantone/')) {
        window.location.href = getToolPath('pantone')
      }
    },
    priority: 70
  },
  {
    id: 'nav-converter',
    title: 'Go to LAB-CMYK Converter',
    category: 'Navigation',
    icon: '🔄',
    hotkey: 'G C',
    keywords: ['color', 'conversion', 'lab', 'cmyk'],
    handler: () => {
      if (!window.location.pathname.includes('/converter/')) {
        window.location.href = getToolPath('converter')
      }
    },
    priority: 60
  },
  {
    id: 'nav-maintenance',
    title: 'Go to Maintenance',
    category: 'Navigation',
    icon: '🔧',
    hotkey: 'G M',
    keywords: ['service', 'issues', 'repairs'],
    handler: () => {
      if (!window.location.pathname.includes('/maintenance/')) {
        window.location.href = getToolPath('maintenance')
      }
    },
    priority: 50
  },
  {
    id: 'nav-admin',
    title: 'Go to Admin Panel',
    category: 'Navigation',
    icon: '⚙️',
    hotkey: 'G A',
    keywords: ['settings', 'users', 'admin'],
    handler: () => {
      if (!window.location.pathname.includes('/admin/')) {
        window.location.href = getToolPath('admin')
      }
    },
    // Only show for admin users
    condition: () => {
      const user = JSON.parse(localStorage.getItem('currentUser') || '{}')
      return user.role === 'admin'
    },
    priority: 40
  }
])

export default commandRegistry
