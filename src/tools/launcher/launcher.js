import { storage } from '../../shared/utils/storage.js'
import { STORAGE_KEYS, VERSION } from '../../shared/constants.js'
import { exportAllData, importAllData } from '../../shared/utils/export.js'

// Dashboard state
let dashboardState = {
    currentMonth: new Date(),
    todos: [],
    maintenanceEvents: []
}

// Initialize dashboard
function init() {
    loadDashboardData()
    initializeClock()
    initializeCalendar()
    loadQuickStats()
    loadTodoList()
    loadResourceStats()
    loadActivityFeed()

    // Refresh stats every 30 seconds
    setInterval(loadQuickStats, 30000)
}

// Initialize live clock
function initializeClock() {
    function updateClock() {
        const now = new Date()

        // Update time
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')
        document.getElementById('liveClock').textContent = `${hours}:${minutes}:${seconds}`

        // Update date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        document.getElementById('liveDate').textContent = now.toLocaleDateString('en-AU', options)

        // Update greeting
        const hour = now.getHours()
        let greeting = 'Good Evening'
        if (hour < 12) greeting = 'Good Morning'
        else if (hour < 18) greeting = 'Good Afternoon'
        document.getElementById('greeting').textContent = greeting
    }

    updateClock()
    setInterval(updateClock, 1000)
}

// Calendar functionality
function initializeCalendar() {
    renderCalendar()
}

function renderCalendar() {
    const year = dashboardState.currentMonth.getFullYear()
    const month = dashboardState.currentMonth.getMonth()

    // Set month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    document.getElementById('calendarMonth').textContent = `${monthNames[month]} ${year}`

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    // Get maintenance events for this month
    const maintenanceData = storage.get(STORAGE_KEYS.MAINTENANCE, {})
    const techVisits = maintenanceData.techVisits || []
    const recurringTasks = maintenanceData.recurringTasks || []
    const dailyChecklist = maintenanceData.dailyChecklist || {}

    const eventDates = new Set()

    // Add tech visit dates
    techVisits.forEach(visit => {
        const date = new Date(visit.dateTime)
        if (date.getMonth() === month && date.getFullYear() === year) {
            eventDates.add(date.getDate())
        }
    })

    // Add recurring task dates
    recurringTasks.forEach(task => {
        if (task.nextDue) {
            const date = new Date(task.nextDue)
            if (date.getMonth() === month && date.getFullYear() === year) {
                eventDates.add(date.getDate())
            }
        }
    })

    // Add daily checklist dates
    Object.keys(dailyChecklist).forEach(dateKey => {
        const date = new Date(dateKey)
        if (date.getMonth() === month && date.getFullYear() === year) {
            eventDates.add(date.getDate())
        }
    })

    let html = ''
    const today = new Date()
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i
        html += `<div class="calendar-day other-month">${day}</div>`
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const classes = ['calendar-day']
        if (isCurrentMonth && day === today.getDate()) {
            classes.push('today')
        }
        if (eventDates.has(day)) {
            classes.push('has-event')
        }
        html += `<div class="${classes.join(' ')}">${day}</div>`
    }

    // Next month days
    const remainingDays = 42 - (firstDay + daysInMonth)
    for (let day = 1; day <= remainingDays; day++) {
        html += `<div class="calendar-day other-month">${day}</div>`
    }

    document.getElementById('calendarDays').innerHTML = html
}

function previousMonth() {
    dashboardState.currentMonth.setMonth(dashboardState.currentMonth.getMonth() - 1)
    renderCalendar()
}

function nextMonth() {
    dashboardState.currentMonth.setMonth(dashboardState.currentMonth.getMonth() + 1)
    renderCalendar()
}

// Quick stats
function loadQuickStats() {
    // Inventory stats
    try {
        const inventory = storage.get(STORAGE_KEYS.INVENTORY, {})
        let totalItems = 0
        let lowStockItems = 0

        Object.values(inventory).forEach(printer => {
            Object.values(printer).forEach(category => {
                if (Array.isArray(category)) {
                    totalItems += category.length
                    category.forEach(item => {
                        if (item.stock <= 2 && item.stock > 0) lowStockItems++
                    })
                }
            })
        })

        document.getElementById('inventoryCount').textContent = totalItems
        document.getElementById('inventorySubtext').textContent =
            lowStockItems > 0 ? `${lowStockItems} low stock items` : 'All items stocked'
    } catch (error) {
        console.error('Error loading inventory stats:', error)
    }

    // Productivity stats
    try {
        const dailyTotalsByDate = storage.get(STORAGE_KEYS.DAILY_TOTALS, {})
        const today = new Date().toISOString().split('T')[0]

        if (dailyTotalsByDate[today]) {
            const todayData = dailyTotalsByDate[today]
            const total = (todayData.available || 0) + (todayData.working || 0) + (todayData.unavailable || 0)
            const hours = Math.floor(total / 3600000)
            const mins = Math.floor((total % 3600000) / 60000)

            document.getElementById('todayTime').textContent = `${hours}h ${mins}m`

            const working = todayData.working || 0
            const workingHours = Math.floor(working / 3600000)
            document.getElementById('timeSubtext').textContent = `${workingHours}h working time`
        } else {
            document.getElementById('todayTime').textContent = '0h 0m'
            document.getElementById('timeSubtext').textContent = 'No activity today'
        }
    } catch (error) {
        console.error('Error loading productivity stats:', error)
    }

    // Maintenance stats
    try {
        const maintenanceData = storage.get(STORAGE_KEYS.MAINTENANCE, {})
        const issues = maintenanceData.issues || []
        const activeIssues = issues.filter(i => i.status === 'in-progress').length
        const totalIssues = issues.length

        document.getElementById('activeIssues').textContent = activeIssues
        document.getElementById('issuesSubtext').textContent =
            `${totalIssues} total issues logged`
    } catch (error) {
        console.error('Error loading maintenance stats:', error)
    }

    // Pantone stats
    try {
        const pantoneColors = storage.get(STORAGE_KEYS.PANTONE_COLORS, [])
        const matched = pantoneColors.filter(c => c.date && c.date !== '*' && c.date !== 'CBW').length

        document.getElementById('pantoneCount').textContent = pantoneColors.length
        document.getElementById('pantoneSubtext').textContent = `${matched} matched colors`
    } catch (error) {
        console.error('Error loading pantone stats:', error)
    }
}

// Todo list functionality
function loadDashboardData() {
    const saved = storage.get(STORAGE_KEYS.DASHBOARD_TODOS)
    if (saved && Array.isArray(saved)) {
        dashboardState.todos = saved
    }
}

function saveDashboardData() {
    storage.set(STORAGE_KEYS.DASHBOARD_TODOS, dashboardState.todos)
}

function loadTodoList() {
    const html = dashboardState.todos.length > 0
        ? dashboardState.todos.map((todo, index) => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}">
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}
                       onchange="window.dashboardApp.toggleTodo(${index})">
                <div class="todo-content">
                    <div class="todo-text">${escapeHtml(todo.text)}</div>
                </div>
                <div class="todo-delete" onclick="window.dashboardApp.deleteTodo(${index})">✕</div>
            </div>
        `).join('')
        : '<div style="color: var(--color-text-muted); text-align: center; padding: var(--spacing-lg);">No tasks yet. Add one below!</div>'

    document.getElementById('todoList').innerHTML = html
}

function addTodo() {
    const input = document.getElementById('todoInput')
    const text = input.value.trim()

    if (text) {
        dashboardState.todos.push({
            text,
            completed: false,
            createdAt: new Date().toISOString()
        })

        input.value = ''
        saveDashboardData()
        loadTodoList()
        updateActivityFeed('todo', `Added task: ${text}`)
    }
}

function toggleTodo(index) {
    dashboardState.todos[index].completed = !dashboardState.todos[index].completed
    saveDashboardData()
    loadTodoList()

    if (dashboardState.todos[index].completed) {
        updateActivityFeed('todo', `Completed task: ${dashboardState.todos[index].text}`)
    }
}

function deleteTodo(index) {
    const todo = dashboardState.todos[index]
    dashboardState.todos.splice(index, 1)
    saveDashboardData()
    loadTodoList()
    updateActivityFeed('todo', `Deleted task: ${todo.text}`)
}

function clearCompleted() {
    const count = dashboardState.todos.filter(t => t.completed).length
    if (count > 0 && confirm(`Clear ${count} completed task${count > 1 ? 's' : ''}?`)) {
        dashboardState.todos = dashboardState.todos.filter(t => !t.completed)
        saveDashboardData()
        loadTodoList()
        updateActivityFeed('todo', `Cleared ${count} completed tasks`)
    }
}

// Resource stats
function loadResourceStats() {
    try {
        const inventory = storage.get(STORAGE_KEYS.INVENTORY, {})
        const maintenanceData = storage.get(STORAGE_KEYS.MAINTENANCE, {})
        const pantoneColors = storage.get(STORAGE_KEYS.PANTONE_COLORS, [])

        let totalItems = 0
        let stockedItems = 0

        Object.values(inventory).forEach(printer => {
            Object.values(printer).forEach(category => {
                if (Array.isArray(category)) {
                    category.forEach(item => {
                        totalItems++
                        if (item.stock > 0) stockedItems++
                    })
                }
            })
        })

        const stockPercentage = totalItems > 0 ? Math.round((stockedItems / totalItems) * 100) : 0

        const issues = maintenanceData.issues || []
        const resolvedIssues = issues.filter(i => i.status === 'resolved').length
        const healthPercentage = issues.length > 0 ? Math.round((resolvedIssues / issues.length) * 100) : 100

        const pantonePercentage = pantoneColors.length > 0 ? Math.min(100, Math.round((pantoneColors.length / 200) * 100)) : 0

        const html = `
            <div class="resource-item">
                <div class="resource-label">Inventory Status</div>
                <div class="resource-value">${stockPercentage}%</div>
            </div>
            <div class="resource-bar">
                <div class="resource-fill" style="width: ${stockPercentage}%"></div>
            </div>

            <div class="resource-item">
                <div class="resource-label">System Health</div>
                <div class="resource-value">${healthPercentage}%</div>
            </div>
            <div class="resource-bar">
                <div class="resource-fill" style="width: ${healthPercentage}%"></div>
            </div>

            <div class="resource-item">
                <div class="resource-label">Database Usage</div>
                <div class="resource-value">${pantonePercentage}%</div>
            </div>
            <div class="resource-bar">
                <div class="resource-fill" style="width: ${pantonePercentage}%"></div>
            </div>

            <div class="resource-item">
                <div class="resource-label">Tools Active</div>
                <div class="resource-value">5/5</div>
            </div>
            <div class="resource-bar">
                <div class="resource-fill" style="width: 100%"></div>
            </div>
        `

        document.getElementById('resourceStats').innerHTML = html
    } catch (error) {
        console.error('Error loading resource stats:', error)
    }
}

// Activity feed
function loadActivityFeed() {
    const activities = storage.get(STORAGE_KEYS.DASHBOARD_ACTIVITY, [])

    if (activities.length === 0) {
        document.getElementById('activityFeed').innerHTML =
            '<div style="color: var(--color-text-muted); text-align: center; padding: var(--spacing-lg);">No recent activity</div>'
        return
    }

    const html = activities.slice(0, 10).map(activity => {
        const icon = getActivityIcon(activity.type)
        const time = formatTimeAgo(new Date(activity.timestamp))

        return `
            <div class="activity-item">
                <div class="activity-icon">${icon}</div>
                <div class="activity-content">
                    <div class="activity-text">${escapeHtml(activity.text)}</div>
                    <div class="activity-time">${time}</div>
                </div>
            </div>
        `
    }).join('')

    document.getElementById('activityFeed').innerHTML = html
}

function updateActivityFeed(type, text) {
    let activities = storage.get(STORAGE_KEYS.DASHBOARD_ACTIVITY, [])

    activities.unshift({
        type,
        text,
        timestamp: new Date().toISOString()
    })

    // Keep only last 50 activities
    activities = activities.slice(0, 50)

    storage.set(STORAGE_KEYS.DASHBOARD_ACTIVITY, activities)
    loadActivityFeed()
}

function getActivityIcon(type) {
    const icons = {
        'todo': '✓',
        'inventory': '📦',
        'productivity': '⏱️',
        'maintenance': '🔧',
        'pantone': '🎨',
        'export': '💾',
        'import': '📥'
    }
    return icons[type] || '📌'
}

function formatTimeAgo(date) {
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'Just now'
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

// Switch view (legacy function)
function switchView(viewName) {
    // This function is kept for backwards compatibility
    // The new dashboard doesn't use tabs, but we keep the analytics functionality
    console.log('Switch view:', viewName)
}

// Load all analytics (legacy function)
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
        updateActivityFeed('export', 'Exported all data')
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
            alert('✓ Data imported successfully! Reloading dashboard...')
            updateActivityFeed('import', 'Imported data from file')

            // Reload all dashboard components
            loadQuickStats()
            renderCalendar()
            loadTodoList()
            loadResourceStats()
            loadActivityFeed()
        } catch (error) {
            console.error('Error importing data:', error)
            alert('Error importing data. Please check the file format.')
        }
    }
    reader.readAsText(file)

    // Reset file input
    event.target.value = ''
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

    window.dashboardApp = {
        previousMonth,
        nextMonth,
        addTodo,
        toggleTodo,
        deleteTodo,
        clearCompleted
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp)
} else {
    initApp()
}
