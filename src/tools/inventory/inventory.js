/**
 * Inventory System
 * Manage printer supplies, inks, media, and maintenance items
 */

import '../../shared/components/AppHeader.js'
import '../../shared/components/AppFooter.js'
import '../../shared/components/Modal.js'
import { storage } from '../../shared/utils/storage.js'
import { STORAGE_KEYS, INITIAL_INVENTORY } from '../../shared/constants.js'
import { formatDate } from '../../shared/utils/datetime.js'

// State management
let inventory = JSON.parse(JSON.stringify(INITIAL_INVENTORY))
let usageHistory = []
let currentView = 'inventory'
let statsFilter = 'month'
let selectedPrinter = 'Epson 9900/WT7900'
let showAddItemModal = false

/**
 * Load data from localStorage
 */
function loadData() {
  const savedInventory = storage.get(STORAGE_KEYS.INVENTORY)
  const savedHistory = storage.get(STORAGE_KEYS.USAGE_HISTORY)

  if (savedInventory) {
    inventory = savedInventory
  }
  if (savedHistory) {
    usageHistory = savedHistory
  }
}

/**
 * Save data to localStorage
 */
function saveData() {
  storage.set(STORAGE_KEYS.INVENTORY, inventory)
  storage.set(STORAGE_KEYS.USAGE_HISTORY, usageHistory)
}

/**
 * Update stock level for an item
 * @param {string} printer - Printer name
 * @param {string} category - Category name
 * @param {string} itemId - Item ID
 * @param {number} change - Change amount (positive or negative)
 */
function updateStock(printer, category, itemId, change) {
  const item = inventory[printer][category].find(i => i.id === itemId)

  if (item) {
    item.stock = Math.max(0, item.stock + change)

    // Record usage if stock was decreased
    if (change < 0) {
      usageHistory.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        printer,
        category,
        itemId,
        itemName: item.name,
        quantity: Math.abs(change),
        unit: item.unit
      })
    }

    saveData()
    render()
  }
}

/**
 * Get stock level status
 * @param {number} stock - Stock count
 * @returns {string} - 'empty', 'low', or 'good'
 */
function getStockLevel(stock) {
  if (stock === 0) return 'empty'
  if (stock <= 2) return 'low'
  return 'good'
}

/**
 * Get filtered usage history based on stats filter
 * @returns {Array}
 */
function getFilteredUsage() {
  const now = new Date()
  let startDate

  switch (statsFilter) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default:
      return usageHistory
  }

  return usageHistory.filter(record => new Date(record.timestamp) >= startDate)
}

/**
 * Get usage statistics
 * @returns {Array} - Array of usage stats sorted by total used
 */
function getUsageStats() {
  const filtered = getFilteredUsage()
  const stats = {}

  filtered.forEach(record => {
    const key = `${record.printer}-${record.itemId}`
    if (!stats[key]) {
      stats[key] = {
        printer: record.printer,
        itemName: record.itemName,
        totalUsed: 0,
        unit: record.unit
      }
    }
    stats[key].totalUsed += record.quantity
  })

  return Object.values(stats).sort((a, b) => b.totalUsed - a.totalUsed)
}

/**
 * Export inventory data to JSON file
 */
function exportData() {
  const exportData = {
    inventory,
    usageHistory,
    exportDate: new Date().toISOString()
  }

  const dataStr = JSON.stringify(exportData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `inventory-backup-${formatDate()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Import inventory data from JSON file
 */
function importData() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target.result)

          if (importedData.inventory && importedData.usageHistory) {
            inventory = importedData.inventory
            usageHistory = importedData.usageHistory
            saveData()
            render()
            alert('Data imported successfully!')
          } else {
            alert('Invalid backup file format.')
          }
        } catch (error) {
          console.error('Error importing data:', error)
          alert('Error importing data. Please check the file format.')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

/**
 * Reset all data to initial state
 */
function resetData() {
  if (confirm('Are you sure you want to reset ALL data? This cannot be undone.')) {
    inventory = JSON.parse(JSON.stringify(INITIAL_INVENTORY))
    usageHistory = []
    storage.remove(STORAGE_KEYS.INVENTORY)
    storage.remove(STORAGE_KEYS.USAGE_HISTORY)
    render()
  }
}

/**
 * Add a new custom item
 */
function addNewItem() {
  const section = document.getElementById('newItemSection').value
  const category = document.getElementById('newItemCategory').value
  const itemId = document.getElementById('newItemId').value.trim()
  const itemName = document.getElementById('newItemName').value.trim()
  const itemUnit = document.getElementById('newItemUnit').value.trim()
  const itemStock = parseInt(document.getElementById('newItemStock').value) || 0

  if (!itemId || !itemName || !itemUnit) {
    alert('Please fill in all required fields (ID, Name, and Unit)')
    return
  }

  // Check if item ID already exists
  for (const [printer, categories] of Object.entries(inventory)) {
    for (const [cat, items] of Object.entries(categories)) {
      if (items.find(item => item.id === itemId)) {
        alert('An item with this ID already exists. Please use a unique ID.')
        return
      }
    }
  }

  const newItem = {
    id: itemId,
    name: itemName,
    stock: itemStock,
    unit: itemUnit
  }

  // Add to the appropriate section and category
  if (!inventory[section][category]) {
    inventory[section][category] = []
  }
  inventory[section][category].push(newItem)

  saveData()
  showAddItemModal = false
  selectedPrinter = section
  render()
  alert('Item added successfully!')
}

/**
 * Delete an item
 * @param {string} section - Printer section
 * @param {string} category - Category name
 * @param {string} itemId - Item ID
 */
function deleteItem(section, category, itemId) {
  if (confirm('Are you sure you want to delete this item? This will also remove all usage history for this item.')) {
    const categoryItems = inventory[section][category]
    const itemIndex = categoryItems.findIndex(item => item.id === itemId)
    if (itemIndex !== -1) {
      categoryItems.splice(itemIndex, 1)
    }

    usageHistory = usageHistory.filter(record => record.itemId !== itemId)

    saveData()
    render()
  }
}

/**
 * Update category options in add item modal
 */
function updateCategoryOptions() {
  const section = document.getElementById('newItemSection').value
  const categorySelect = document.getElementById('newItemCategory')
  const categories = Object.keys(inventory[section])

  categorySelect.innerHTML = categories.map(cat =>
    `<option value="${cat}">${cat}</option>`
  ).join('')
}

/**
 * Render the application
 */
function render() {
  const root = document.getElementById('root')

  let html = `
    <div>
      <!-- Header -->
      <div class="inventory-header">
        <div class="header-content">
          <div class="header-title">
            <div class="header-icon">📦</div>
            <div>
              <h1 style="font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 700; margin-bottom: var(--spacing-xs);">
                Proofing Room Inventory
              </h1>
              <p style="font-size: var(--text-sm); color: var(--color-text-muted);">
                Track and manage your stock levels
              </p>
            </div>
          </div>
          <div class="header-buttons">
            <a href="launcher.html" class="btn btn-secondary" title="Back to Launcher">
              ← Launcher
            </a>
            <button onclick="window.inventoryApp.setView('inventory')" class="btn-view ${currentView === 'inventory' ? 'active' : ''}">
              Inventory
            </button>
            <button onclick="window.inventoryApp.setView('stats')" class="btn-view ${currentView === 'stats' ? 'active' : ''}">
              Statistics
            </button>
            <button onclick="window.inventoryApp.showAddModal()" class="btn btn-primary" title="Add new item">
              + Add Item
            </button>
            <button onclick="window.inventoryApp.export()" class="btn btn-success" title="Export data to file">
              ↓ Export
            </button>
            <button onclick="window.inventoryApp.import()" class="btn btn-primary" title="Import data from file">
              ↑ Import
            </button>
            <button onclick="window.inventoryApp.reset()" class="btn btn-error" title="Reset all data">
              🔄
            </button>
          </div>
        </div>
      </div>

      <main class="inventory-container">
  `

  if (currentView === 'inventory') {
    html += renderInventoryView()
  } else {
    html += renderStatsView()
  }

  html += `
      </main>
    </div>
  `

  // Add modal if needed
  if (showAddItemModal) {
    html += renderAddItemModal()
  }

  root.innerHTML = html
}

/**
 * Render inventory view
 * @returns {string}
 */
function renderInventoryView() {
  let html = `
    <!-- Printer Selector -->
    <div class="printer-selector flex items-center gap-3">
      <label>Select Printer:</label>
      <select onchange="window.inventoryApp.selectPrinter(this.value)" class="form-select">
        ${Object.keys(inventory).map(printer => `
          <option value="${printer}" ${selectedPrinter === printer ? 'selected' : ''}>
            ${printer}
          </option>
        `).join('')}
      </select>
    </div>

    <!-- Info Banner -->
    <div class="info-banner">
      <div class="info-banner-icon">ℹ️</div>
      <div>
        <h3 style="font-weight: 600; color: #60a5fa; margin-bottom: var(--spacing-xs);">
          Moving data between computers?
        </h3>
        <p style="font-size: var(--text-sm);">
          Use the <strong>↓ Export</strong> button to save your inventory data to a file.
          Then on your other computer, use <strong>↑ Import</strong> to load it back in.
          Keep the backup file safe!
        </p>
      </div>
    </div>

    <!-- Selected Printer Inventory -->
    <div class="category-section">
      <div class="category-header">
        <h2 class="category-title">${selectedPrinter}</h2>
      </div>
  `

  const categories = inventory[selectedPrinter]
  for (const [category, items] of Object.entries(categories)) {
    html += `
      <div class="category-content">
        <h3 class="category-subtitle">${category}</h3>
        <div class="items-grid">
    `

    for (const item of items) {
      const stockLevel = getStockLevel(item.stock)

      html += `
        <div class="item-card">
          <div class="item-header">
            <div class="item-info">
              <h4>${item.name}</h4>
              <p>${item.unit}</p>
            </div>
            <span class="stock-badge stock-${stockLevel}">
              ${item.stock === 0 ? 'Empty' : item.stock <= 2 ? 'Low Stock' : 'In Stock'}
            </span>
          </div>
          <div class="item-controls">
            <button class="stock-btn stock-btn-minus" onclick="window.inventoryApp.updateStock('${selectedPrinter}', '${category}', '${item.id}', -1)" title="Use 1">
              −
            </button>
            <div class="stock-display">${item.stock}</div>
            <button class="stock-btn stock-btn-plus" onclick="window.inventoryApp.updateStock('${selectedPrinter}', '${category}', '${item.id}', 1)" title="Add 1">
              +
            </button>
            <button class="btn-delete" onclick="window.inventoryApp.deleteItem('${selectedPrinter}', '${category}', '${item.id}')" title="Delete item">
              ×
            </button>
          </div>
        </div>
      `
    }

    html += `
        </div>
      </div>
    `
  }

  html += '</div>'
  return html
}

/**
 * Render statistics view
 * @returns {string}
 */
function renderStatsView() {
  const stats = getUsageStats()

  let html = `
    <div class="stats-container">
      <div class="stats-filter">
        <label style="font-weight: 600; margin-right: var(--spacing-md);">Filter by:</label>
        <select onchange="window.inventoryApp.setStatsFilter(this.value)" class="form-select">
          <option value="week" ${statsFilter === 'week' ? 'selected' : ''}>Last Week</option>
          <option value="month" ${statsFilter === 'month' ? 'selected' : ''}>Last Month</option>
          <option value="year" ${statsFilter === 'year' ? 'selected' : ''}>Last Year</option>
          <option value="all" ${statsFilter === 'all' ? 'selected' : ''}>All Time</option>
        </select>
      </div>

      <table class="stats-table">
        <thead>
          <tr>
            <th>Printer</th>
            <th>Item</th>
            <th>Total Used</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
  `

  if (stats.length === 0) {
    html += `
          <tr>
            <td colspan="4" style="text-align: center; padding: var(--spacing-xl); color: var(--color-text-muted);">
              No usage data for the selected period
            </td>
          </tr>
    `
  } else {
    stats.forEach(stat => {
      html += `
        <tr>
          <td>${stat.printer}</td>
          <td>${stat.itemName}</td>
          <td style="font-weight: 700; font-family: var(--font-mono);">${stat.totalUsed}</td>
          <td style="color: var(--color-text-muted);">${stat.unit}</td>
        </tr>
      `
    })
  }

  html += `
        </tbody>
      </table>
    </div>
  `

  return html
}

/**
 * Render add item modal
 * @returns {string}
 */
function renderAddItemModal() {
  return `
    <div class="modal-overlay" onclick="if(event.target === this) window.inventoryApp.hideAddModal()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Add New Item</h3>
          <button class="modal-close" onclick="window.inventoryApp.hideAddModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Section</label>
            <select id="newItemSection" onchange="window.inventoryApp.updateCategories()" class="form-select">
              <option value="Epson 9900/WT7900">Epson 9900/WT7900</option>
              <option value="Epson 9070">Epson 9070</option>
              <option value="Roland">Roland</option>
              <option value="Materials">Materials</option>
              <option value="Misc">Misc</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Category</label>
            <select id="newItemCategory" class="form-select"></select>
          </div>

          <div class="form-group">
            <label class="form-label">Product ID / Code *</label>
            <input type="text" id="newItemId" placeholder="e.g., T636200 or CUSTOM-001" class="form-input">
          </div>

          <div class="form-group">
            <label class="form-label">Item Name *</label>
            <input type="text" id="newItemName" placeholder="e.g., Cleaning Solution or Custom Item" class="form-input">
          </div>

          <div class="form-group">
            <label class="form-label">Unit Type *</label>
            <input type="text" id="newItemUnit" placeholder="e.g., 700ml, roll, unit, box, pack" class="form-input">
          </div>

          <div class="form-group">
            <label class="form-label">Initial Stock (optional)</label>
            <input type="number" id="newItemStock" value="0" min="0" class="form-input">
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="window.inventoryApp.addItem()" class="btn btn-primary">Add Item</button>
          <button onclick="window.inventoryApp.hideAddModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  `
}

/**
 * Initialize the app
 */
function init() {
  loadData()

  // Expose API to window for event handlers
  window.inventoryApp = {
    updateStock,
    setView: (view) => {
      currentView = view
      render()
    },
    selectPrinter: (printer) => {
      selectedPrinter = printer
      render()
    },
    setStatsFilter: (filter) => {
      statsFilter = filter
      render()
    },
    showAddModal: () => {
      showAddItemModal = true
      render()
      // Populate categories after render
      setTimeout(updateCategoryOptions, 0)
    },
    hideAddModal: () => {
      showAddItemModal = false
      render()
    },
    updateCategories: updateCategoryOptions,
    addItem: addNewItem,
    deleteItem,
    export: exportData,
    import: importData,
    reset: resetData
  }

  render()
}

// Start the app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
