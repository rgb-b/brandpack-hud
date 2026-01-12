import { storage } from '../../shared/utils/storage.js'
import { STORAGE_KEYS, VERSION } from '../../shared/constants.js'
import { exportAllData, importAllData } from '../../shared/utils/export.js'

// Switch view
function switchView(viewName) {
    // Update tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'))
    event.target.classList.add('active')

    // Update views
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'))

    if (viewName === 'tools') {
        document.getElementById('toolsView').classList.add('active')
    } else if (viewName === 'analytics') {
        document.getElementById('analyticsView').classList.add('active')
        loadAnalytics()
    }
}

// Load all analytics
function loadAnalytics() {
    loadInventoryAnalytics()
    loadProductivityAnalytics()
    loadPantoneAnalytics()
    loadMaintenanceAnalytics()
    loadTopUsedItems()
    loadTopTasks()
}

// Inventory Analytics
function loadInventoryAnalytics() {
    try {
        const inventory = storage.get(STORAGE_KEYS.INVENTORY, {})
        const usageHistory = storage.get(STORAGE_KEYS.USAGE_HISTORY, [])

        let totalItems = 0
        let lowStockItems = 0
        let emptyItems = 0

        Object.values(inventory).forEach(printer => {
            Object.values(printer).forEach(category => {
                if (Array.isArray(category)) {
                    totalItems += category.length
                    category.forEach(item => {
                        if (item.stock === 0) emptyItems++
                        else if (item.stock <= 2) lowStockItems++
                    })
                }
            })
        })

        const totalUsage = usageHistory.reduce((sum, record) => sum + Math.abs(record.quantity), 0)

        const html = `
            <div class="stat-item">
                <span class="stat-name">Total Items</span>
                <span class="stat-number">${totalItems}</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Low Stock</span>
                <span class="stat-number" style="color: ${lowStockItems > 0 ? 'var(--color-warning)' : 'var(--color-success)'}">${lowStockItems}</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Empty Items</span>
                <span class="stat-number" style="color: ${emptyItems > 0 ? 'var(--color-error)' : 'var(--color-success)'}">${emptyItems}</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Total Usage</span>
                <span class="stat-number">${totalUsage}</span>
            </div>
        `

        document.getElementById('inventoryAnalytics').innerHTML = html
    } catch (error) {
        console.error('Error loading inventory analytics:', error)
        document.getElementById('inventoryAnalytics').innerHTML = '<div style="color: var(--color-error);">Error loading data</div>'
    }
}

// Productivity Analytics
function loadProductivityAnalytics() {
    try {
        const dailyTotalsByDate = storage.get(STORAGE_KEYS.DAILY_TOTALS, {})
        const today = new Date().toISOString().split('T')[0]

        let available = 0
        let working = 0
        let unavailable = 0
        let label = 'Today'

        if (dailyTotalsByDate[today]) {
            const todayData = dailyTotalsByDate[today]
            available = todayData.available || 0
            working = todayData.working || 0
            unavailable = todayData.unavailable || 0
        } else {
            // Show all-time data if no data today
            Object.values(dailyTotalsByDate).forEach(day => {
                available += day.available || 0
                working += day.working || 0
                unavailable += day.unavailable || 0
            })
            label = 'All Time'
        }

        const total = available + working + unavailable

        const formatTime = (ms) => {
            const hours = Math.floor(ms / 3600000)
            const mins = Math.floor((ms % 3600000) / 60000)
            return `${hours}h ${mins}m`
        }

        const html = total > 0 ? `
            <div class="stat-item">
                <span class="stat-name">Available (${label})</span>
                <span class="stat-number" style="color: var(--color-available)">${formatTime(available)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Working (${label})</span>
                <span class="stat-number" style="color: var(--color-working)">${formatTime(working)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Unavailable (${label})</span>
                <span class="stat-number" style="color: var(--color-unavailable)">${formatTime(unavailable)}</span>
            </div>
        ` : '<div style="color: var(--color-text-muted); padding: 1rem;">No productivity data yet</div>'

        document.getElementById('productivityAnalytics').innerHTML = html
    } catch (error) {
        console.error('Error loading productivity analytics:', error)
        document.getElementById('productivityAnalytics').innerHTML = '<div style="color: var(--color-error);">Error loading data</div>'
    }
}

// Pantone Analytics
function loadPantoneAnalytics() {
    try {
        const pantoneColors = storage.get(STORAGE_KEYS.PANTONE_COLORS, [])

        let matched = 0
        let notMatched = 0

        if (Array.isArray(pantoneColors)) {
            pantoneColors.forEach(color => {
                if (color.date && color.date !== '*' && color.date !== 'CBW') {
                    matched++
                } else {
                    notMatched++
                }
            })
        }

        const html = `
            <div class="stat-item">
                <span class="stat-name">Total Colors</span>
                <span class="stat-number">${pantoneColors.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Matched</span>
                <span class="stat-number" style="color: var(--color-success)">${matched}</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Not Matched</span>
                <span class="stat-number" style="color: var(--color-warning)">${notMatched}</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Database Status</span>
                <span class="stat-number" style="font-size: 1rem; color: ${pantoneColors.length > 0 ? 'var(--color-success)' : 'var(--color-text-muted)'}">${pantoneColors.length > 0 ? 'Active' : 'Empty'}</span>
            </div>
        `

        document.getElementById('pantoneAnalytics').innerHTML = html
    } catch (error) {
        console.error('Error loading Pantone analytics:', error)
        document.getElementById('pantoneAnalytics').innerHTML = '<div style="color: var(--color-error);">Error loading data</div>'
    }
}

// Maintenance Analytics
function loadMaintenanceAnalytics() {
    try {
        const maintenanceData = storage.get(STORAGE_KEYS.MAINTENANCE, {})

        const issues = maintenanceData.issues || []
        const recurringTasks = maintenanceData.recurringTasks || []
        const techVisits = maintenanceData.techVisits || []

        const inProgressIssues = issues.filter(i => i.status === 'in-progress').length
        const resolvedIssues = issues.filter(i => i.status === 'resolved').length
        const totalTimeSpent = issues.reduce((sum, i) => sum + (parseInt(i.timeSpent) || 0), 0)

        const html = `
            <div class="stat-item">
                <span class="stat-name">In Progress Issues</span>
                <span class="stat-number" style="color: ${inProgressIssues > 0 ? 'var(--color-warning)' : 'var(--color-success)'}">${inProgressIssues}</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Resolved Issues</span>
                <span class="stat-number">${resolvedIssues}</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Total Time Spent</span>
                <span class="stat-number">${totalTimeSpent} min</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Recurring Tasks</span>
                <span class="stat-number">${recurringTasks.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Tech Visits</span>
                <span class="stat-number">${techVisits.length}</span>
            </div>
        `

        document.getElementById('maintenanceAnalytics').innerHTML = html
    } catch (error) {
        console.error('Error loading maintenance analytics:', error)
        document.getElementById('maintenanceAnalytics').innerHTML = '<div style="color: var(--color-error);">Error loading data</div>'
    }
}

// Top Used Items
function loadTopUsedItems() {
    try {
        const usageHistory = storage.get(STORAGE_KEYS.USAGE_HISTORY, [])

        const itemUsage = {}
        usageHistory.forEach(record => {
            const key = record.itemId
            if (!itemUsage[key]) {
                itemUsage[key] = { name: record.itemName, count: 0 }
            }
            itemUsage[key].count += Math.abs(record.quantity)
        })

        const topItems = Object.values(itemUsage)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)

        const html = topItems.length > 0
            ? topItems.map(item => `
                <div class="stat-item">
                    <span class="stat-name">${item.name}</span>
                    <span class="stat-number">${item.count}</span>
                </div>
            `).join('')
            : '<div style="color: var(--color-text-muted); padding: 1rem;">No usage data yet</div>'

        document.getElementById('topUsedItems').innerHTML = html
    } catch (error) {
        console.error('Error loading top used items:', error)
        document.getElementById('topUsedItems').innerHTML = '<div style="color: var(--color-error);">Error loading data</div>'
    }
}

// Top Tasks
function loadTopTasks() {
    try {
        const taskTotals = storage.get(STORAGE_KEYS.TASK_TOTALS, {})

        const tasks = Object.entries(taskTotals)
            .map(([key, duration]) => {
                const parts = key.split('-')
                const taskName = parts.slice(1).join('-')
                return { name: taskName, duration }
            })
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5)

        const formatTime = (ms) => {
            const hours = Math.floor(ms / 3600000)
            const mins = Math.floor((ms % 3600000) / 60000)
            return `${hours}h ${mins}m`
        }

        const html = tasks.length > 0
            ? tasks.map(task => `
                <div class="stat-item">
                    <span class="stat-name">${task.name}</span>
                    <span class="stat-number">${formatTime(task.duration)}</span>
                </div>
            `).join('')
            : '<div style="color: var(--color-text-muted); padding: 1rem;">No task data yet</div>'

        document.getElementById('topTasks').innerHTML = html
    } catch (error) {
        console.error('Error loading top tasks:', error)
        document.getElementById('topTasks').innerHTML = '<div style="color: var(--color-error);">Error loading data</div>'
    }
}

// Export all data
function exportData() {
    try {
        exportAllData()
        alert('✓ All data exported successfully!')
    } catch (error) {
        console.error('Error exporting data:', error)
        alert('Error exporting data. Check console for details.')
    }
}

// Import data
function importData(event) {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result)
            importAllData(data)
            alert('✓ Data imported successfully! Refresh the page to see updated analytics.')

            // Reload analytics if on analytics view
            const analyticsView = document.getElementById('analyticsView')
            if (analyticsView.classList.contains('active')) {
                loadAnalytics()
            }
        } catch (error) {
            console.error('Error importing data:', error)
            alert('Error importing data. Please check the file format.')
        }
    }
    reader.readAsText(file)

    // Reset file input
    event.target.value = ''
}

// Initialize
function init() {
    // Initial load if on analytics view
    const analyticsView = document.getElementById('analyticsView')
    if (analyticsView.classList.contains('active')) {
        loadAnalytics()
    }
}

// Initialize app
function initApp() {
    init()

    // Expose API
    window.launcherApp = {
        switchView,
        exportAllData: exportData,
        importData
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp)
} else {
    initApp()
}
