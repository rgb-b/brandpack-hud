import { storage } from '../../shared/utils/storage.js'
import { STORAGE_KEYS, STATUS_CATEGORIES } from '../../shared/constants.js'
import { formatDuration, formatDate } from '../../shared/utils/datetime.js'

// State
let state = {
    currentStatus: null,
    currentTask: null,
    startTime: null,
    tasks: {
        working: ['Admin', 'Maintenance'],
        unavailable: ['Lunch break', 'Tea break', 'Bathroom', 'Personal']
    },
    history: [],
    dailyTotalsByDate: {},
    taskTotals: {}
}

let timerInterval = null

// Initialize
function init() {
    migrateOldData()
    ensureTodayExists()
    loadData()
    checkForActiveSession()
    updateTaskSelect()
    updateSummary()
}

// Migrate old data format
function migrateOldData() {
    const oldDailyTotals = storage.get('dailyTotals')
    if (oldDailyTotals && !storage.get(STORAGE_KEYS.DAILY_TOTALS)) {
        const today = new Date().toISOString().split('T')[0]
        state.dailyTotalsByDate = { [today]: oldDailyTotals }
        storage.remove('dailyTotals')
    }
}

// Ensure today's date exists in dailyTotalsByDate
function ensureTodayExists() {
    const today = new Date().toISOString().split('T')[0]
    if (!state.dailyTotalsByDate[today]) {
        state.dailyTotalsByDate[today] = {
            available: 0,
            working: 0,
            unavailable: 0
        }
    }
}

// Load data from localStorage
function loadData() {
    state.tasks = storage.get(STORAGE_KEYS.TASKS, state.tasks)
    state.history = storage.get(STORAGE_KEYS.HISTORY, [])
    state.dailyTotalsByDate = storage.get(STORAGE_KEYS.DAILY_TOTALS, {})
    state.taskTotals = storage.get(STORAGE_KEYS.TASK_TOTALS, {})

    ensureTodayExists()
}

// Save data to localStorage
function saveData() {
    storage.set(STORAGE_KEYS.TASKS, state.tasks)
    storage.set(STORAGE_KEYS.HISTORY, state.history)
    storage.set(STORAGE_KEYS.DAILY_TOTALS, state.dailyTotalsByDate)
    storage.set(STORAGE_KEYS.TASK_TOTALS, state.taskTotals)
}

// Check for active session on load
function checkForActiveSession() {
    const activeSession = storage.get('activeSession')
    if (activeSession) {
        state.currentStatus = activeSession.status
        state.currentTask = activeSession.task
        state.startTime = activeSession.startTime

        // Update UI
        updateStatusButtons()
        updateTaskSelect()
        startTimer()
    }
}

// Save active session
function saveActiveSession() {
    if (state.currentStatus && state.currentTask && state.startTime) {
        storage.set('activeSession', {
            status: state.currentStatus,
            task: state.currentTask,
            startTime: state.startTime
        })
    }
}

// Clear active session
function clearActiveSession() {
    storage.remove('activeSession')
}

// Set status
function setStatus(status) {
    // Save previous session if exists
    if (state.currentStatus && state.currentTask && state.startTime) {
        saveSession()
    }

    state.currentStatus = status
    state.currentTask = null
    state.startTime = null

    stopTimer()
    updateStatusButtons()
    updateTaskSelect()
    clearActiveSession()

    // Auto-start for available status
    if (status === STATUS_CATEGORIES.AVAILABLE) {
        state.currentTask = 'Available'
        state.startTime = Date.now()
        startTimer()
        saveActiveSession()
    }
}

// Set task
function setTask() {
    const taskSelect = document.getElementById('taskSelect')
    const selectedTask = taskSelect.value

    if (!selectedTask) return

    // Save previous session if exists
    if (state.currentTask && state.startTime) {
        saveSession()
    }

    state.currentTask = selectedTask
    state.startTime = Date.now()
    startTimer()
    saveActiveSession()
}

// Start timer
function startTimer() {
    stopTimer() // Clear any existing interval

    timerInterval = setInterval(() => {
        updateTimerDisplay()
    }, 100) // Update every 100ms for smooth display

    updateTimerDisplay()
}

// Stop timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
    }
}

// Update timer display
function updateTimerDisplay() {
    if (!state.startTime) {
        document.getElementById('timerStatus').textContent = 'No status selected'
        document.getElementById('timerTime').textContent = '00:00:00'
        document.getElementById('timerTask').textContent = '-'
        return
    }

    const elapsed = Date.now() - state.startTime
    const seconds = Math.floor(elapsed / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    const displayHours = String(hours).padStart(2, '0')
    const displayMinutes = String(minutes % 60).padStart(2, '0')
    const displaySeconds = String(seconds % 60).padStart(2, '0')

    document.getElementById('timerStatus').textContent = state.currentStatus.toUpperCase()
    document.getElementById('timerTime').textContent = `${displayHours}:${displayMinutes}:${displaySeconds}`
    document.getElementById('timerTask').textContent = state.currentTask || '-'
}

// Update status buttons
function updateStatusButtons() {
    const buttons = document.querySelectorAll('.status-btn')
    buttons.forEach(btn => {
        btn.classList.remove('active')
        if (btn.textContent.toLowerCase().trim() === state.currentStatus) {
            btn.classList.add('active')
        }
    })
}

// Update task select
function updateTaskSelect() {
    const taskSelect = document.getElementById('taskSelect')
    const taskLabel = document.getElementById('taskLabel')

    taskSelect.innerHTML = '<option value="">-- Select Task --</option>'

    if (!state.currentStatus) {
        taskSelect.disabled = true
        taskLabel.textContent = 'Select a status first'
        return
    }

    if (state.currentStatus === STATUS_CATEGORIES.AVAILABLE) {
        taskSelect.disabled = true
        taskLabel.textContent = 'Available - Auto-tracking'
        return
    }

    taskSelect.disabled = false
    taskLabel.textContent = 'Select a task to start tracking:'

    const tasks = state.tasks[state.currentStatus] || []
    tasks.forEach(task => {
        const option = document.createElement('option')
        option.value = task
        option.textContent = task
        taskSelect.appendChild(option)
    })

    // Select current task if active
    if (state.currentTask) {
        taskSelect.value = state.currentTask
    }
}

// Save session
function saveSession() {
    if (!state.currentStatus || !state.currentTask || !state.startTime) return

    const duration = Date.now() - state.startTime
    const today = new Date().toISOString().split('T')[0]

    // Add to history
    state.history.push({
        status: state.currentStatus,
        task: state.currentTask,
        startTime: state.startTime,
        duration: duration,
        date: today
    })

    // Update daily totals
    ensureTodayExists()
    state.dailyTotalsByDate[today][state.currentStatus] += duration

    // Update task totals
    const taskKey = `${state.currentStatus}-${state.currentTask}`
    state.taskTotals[taskKey] = (state.taskTotals[taskKey] || 0) + duration

    saveData()
    updateSummary()
}

// Update summary
function updateSummary() {
    const today = new Date().toISOString().split('T')[0]
    const todayTotals = state.dailyTotalsByDate[today] || { available: 0, working: 0, unavailable: 0 }

    const total = todayTotals.available + todayTotals.working + todayTotals.unavailable

    if (total === 0) {
        document.getElementById('summaryCards').innerHTML = `
            <div class="empty-state">
                <p>No time tracked yet today. Start tracking to see your summary!</p>
            </div>
        `
        return
    }

    const statuses = [
        { key: 'available', label: 'Available', color: 'available' },
        { key: 'working', label: 'Working', color: 'working' },
        { key: 'unavailable', label: 'Unavailable', color: 'unavailable' }
    ]

    let html = ''

    statuses.forEach(({ key, label, color }) => {
        const statusTime = todayTotals[key]
        if (statusTime === 0) return

        const percentage = ((statusTime / total) * 100).toFixed(1)
        const hours = Math.round((statusTime / (1000 * 60 * 60)) * 10) / 10

        // Get task breakdown for this status
        const taskBreakdown = []
        for (const [taskKey, taskTime] of Object.entries(state.taskTotals)) {
            const [taskStatus, taskName] = taskKey.split('-')
            if (taskStatus === key && taskTime > 0) {
                // Check if task has time today
                const todayTaskTime = state.history
                    .filter(h => h.date === today && h.status === key && h.task === taskName)
                    .reduce((sum, h) => sum + h.duration, 0)

                if (todayTaskTime > 0) {
                    const taskHours = Math.round((todayTaskTime / (1000 * 60 * 60)) * 10) / 10
                    taskBreakdown.push({ name: taskName, time: taskHours })
                }
            }
        }

        html += `
            <div class="summary-card">
                <div class="summary-card-header">
                    <div class="summary-status">
                        <span class="status-indicator ${color}"></span>
                        ${label}
                    </div>
                    <div class="summary-percentage">${percentage}%</div>
                </div>
                <div class="summary-progress">
                    <div class="summary-progress-bar ${color}" style="width: ${percentage}%"></div>
                </div>
                <div class="summary-time">${hours}h total</div>
                ${taskBreakdown.length > 0 ? `
                    <div class="task-breakdown">
                        ${taskBreakdown.map(t => `
                            <div class="task-item">
                                <span>${t.name}</span>
                                <span>${t.time}h</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `
    })

    document.getElementById('summaryCards').innerHTML = html
}

// End work day
function endWorkDay() {
    if (!confirm('End work day? This will save your current session and reset tracking.')) return

    // Save current session if active
    if (state.currentStatus && state.currentTask && state.startTime) {
        saveSession()
    }

    // Clear active session
    state.currentStatus = null
    state.currentTask = null
    state.startTime = null
    stopTimer()
    clearActiveSession()

    // Reset UI
    updateStatusButtons()
    updateTaskSelect()
    updateTimerDisplay()
    updateSummary()

    alert('✓ Work day ended. See you tomorrow!')
}

// Toggle manage tasks modal
function toggleManageTasks() {
    const modal = document.getElementById('tasksModal')
    const isVisible = modal.style.display === 'flex'

    if (isVisible) {
        modal.style.display = 'none'
    } else {
        modal.style.display = 'flex'
        renderTasksList()
    }
}

// Render tasks list
function renderTasksList() {
    const container = document.getElementById('tasksList')

    let html = ''

    const statuses = [
        { key: 'working', label: 'Working', color: 'working' },
        { key: 'unavailable', label: 'Unavailable', color: 'unavailable' }
    ]

    statuses.forEach(({ key, label }) => {
        const tasks = state.tasks[key] || []

        html += `
            <div style="margin-bottom: var(--spacing-md);">
                <h4 style="color: var(--color-${key}); margin-bottom: var(--spacing-sm);">${label}</h4>
                ${tasks.map(task => `
                    <div class="task-list-item">
                        <span>${task}</span>
                        <button class="btn btn-danger btn-small" onclick="window.productivityApp.deleteTask('${key}', '${task}')">
                            Delete
                        </button>
                    </div>
                `).join('')}
            </div>
        `
    })

    container.innerHTML = html
}

// Add task
function addTask() {
    const statusSelect = document.getElementById('newTaskStatus')
    const nameInput = document.getElementById('newTaskName')

    const status = statusSelect.value
    const name = nameInput.value.trim()

    if (!name) {
        alert('Please enter a task name')
        return
    }

    if (!state.tasks[status]) {
        state.tasks[status] = []
    }

    if (state.tasks[status].includes(name)) {
        alert('Task already exists')
        return
    }

    state.tasks[status].push(name)
    saveData()
    updateTaskSelect()
    renderTasksList()
    nameInput.value = ''

    alert(`✓ Task "${name}" added to ${status}`)
}

// Delete task
function deleteTask(status, name) {
    if (!confirm(`Delete task "${name}"?`)) return

    state.tasks[status] = state.tasks[status].filter(t => t !== name)
    saveData()
    updateTaskSelect()
    renderTasksList()
}

// Toggle history view
function toggleHistoryView() {
    const modal = document.getElementById('historyModal')
    const isVisible = modal.style.display === 'flex'

    if (isVisible) {
        modal.style.display = 'none'
    } else {
        modal.style.display = 'flex'
        renderHistoryView()
    }
}

// Render history view
function renderHistoryView() {
    const container = document.getElementById('historyContent')

    // Calculate all-time stats
    const daysTracked = Object.keys(state.dailyTotalsByDate).length
    const totalMs = Object.values(state.dailyTotalsByDate).reduce((sum, day) => {
        return sum + day.available + day.working + day.unavailable
    }, 0)
    const totalHours = Math.round((totalMs / (1000 * 60 * 60)) * 10) / 10
    const avgHours = daysTracked > 0 ? Math.round((totalHours / daysTracked) * 10) / 10 : 0

    let html = `
        <div class="history-summary">
            <h3>All-Time Statistics</h3>
            <div class="history-stats">
                <div class="history-stat">
                    <div class="history-stat-value">${daysTracked}</div>
                    <div class="history-stat-label">Days Tracked</div>
                </div>
                <div class="history-stat">
                    <div class="history-stat-value">${totalHours}</div>
                    <div class="history-stat-label">Total Hours</div>
                </div>
                <div class="history-stat">
                    <div class="history-stat-value">${avgHours}</div>
                    <div class="history-stat-label">Avg Hours/Day</div>
                </div>
            </div>
        </div>
    `

    // Sort dates descending
    const sortedDates = Object.keys(state.dailyTotalsByDate).sort((a, b) => b.localeCompare(a))

    sortedDates.forEach(date => {
        const dayTotals = state.dailyTotalsByDate[date]
        const dayTotal = dayTotals.available + dayTotals.working + dayTotals.unavailable

        if (dayTotal === 0) return

        const dateObj = new Date(date + 'T00:00:00')
        const formattedDate = formatDate(dateObj, 'en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

        const availablePercent = ((dayTotals.available / dayTotal) * 100).toFixed(1)
        const workingPercent = ((dayTotals.working / dayTotal) * 100).toFixed(1)
        const unavailablePercent = ((dayTotals.unavailable / dayTotal) * 100).toFixed(1)

        const availableHours = Math.round((dayTotals.available / (1000 * 60 * 60)) * 10) / 10
        const workingHours = Math.round((dayTotals.working / (1000 * 60 * 60)) * 10) / 10
        const unavailableHours = Math.round((dayTotals.unavailable / (1000 * 60 * 60)) * 10) / 10

        html += `
            <div class="history-day">
                <div class="history-day-header">${formattedDate}</div>
                <div class="history-day-breakdown">
                    <div class="history-status-item">
                        <div style="color: var(--color-available); font-weight: 700; font-size: var(--text-xl);">${availablePercent}%</div>
                        <div style="color: var(--color-text-muted); font-size: var(--text-sm);">Available</div>
                        <div style="color: var(--color-text-secondary); font-size: var(--text-sm);">${availableHours}h</div>
                    </div>
                    <div class="history-status-item">
                        <div style="color: var(--color-working); font-weight: 700; font-size: var(--text-xl);">${workingPercent}%</div>
                        <div style="color: var(--color-text-muted); font-size: var(--text-sm);">Working</div>
                        <div style="color: var(--color-text-secondary); font-size: var(--text-sm);">${workingHours}h</div>
                    </div>
                    <div class="history-status-item">
                        <div style="color: var(--color-unavailable); font-weight: 700; font-size: var(--text-xl);">${unavailablePercent}%</div>
                        <div style="color: var(--color-text-muted); font-size: var(--text-sm);">Unavailable</div>
                        <div style="color: var(--color-text-secondary); font-size: var(--text-sm);">${unavailableHours}h</div>
                    </div>
                </div>
            </div>
        `
    })

    if (sortedDates.length === 0) {
        html += '<div class="empty-state"><p>No history data available</p></div>'
    }

    container.innerHTML = html
}

// Export data
function exportData() {
    const exportObj = {
        tasks: state.tasks,
        history: state.history,
        dailyTotalsByDate: state.dailyTotalsByDate,
        taskTotals: state.taskTotals,
        exportDate: new Date().toISOString()
    }

    const dataStr = JSON.stringify(exportObj, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    const today = new Date().toISOString().split('T')[0]
    link.href = url
    link.download = `productivity_backup_${today}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    alert('✓ Data exported successfully!')
}

// Import data
function importData(event) {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result)

            // Merge tasks
            if (importedData.tasks) {
                Object.keys(importedData.tasks).forEach(status => {
                    if (!state.tasks[status]) {
                        state.tasks[status] = []
                    }
                    importedData.tasks[status].forEach(task => {
                        if (!state.tasks[status].includes(task)) {
                            state.tasks[status].push(task)
                        }
                    })
                })
            }

            // Merge history
            if (Array.isArray(importedData.history)) {
                state.history = [...state.history, ...importedData.history]
            }

            // Merge daily totals
            if (importedData.dailyTotalsByDate) {
                Object.keys(importedData.dailyTotalsByDate).forEach(date => {
                    if (!state.dailyTotalsByDate[date]) {
                        state.dailyTotalsByDate[date] = { available: 0, working: 0, unavailable: 0 }
                    }
                    Object.keys(importedData.dailyTotalsByDate[date]).forEach(status => {
                        state.dailyTotalsByDate[date][status] += importedData.dailyTotalsByDate[date][status]
                    })
                })
            }

            // Merge task totals
            if (importedData.taskTotals) {
                Object.keys(importedData.taskTotals).forEach(key => {
                    state.taskTotals[key] = (state.taskTotals[key] || 0) + importedData.taskTotals[key]
                })
            }

            saveData()
            updateTaskSelect()
            updateSummary()

            alert('✓ Data imported and merged successfully!')
        } catch (error) {
            alert('Error importing data. Please check the file format.')
            console.error(error)
        }
    }
    reader.readAsText(file)

    // Reset file input
    event.target.value = ''
}

// Reset data
function resetData() {
    if (!confirm('⚠️ Reset ALL data? This will delete all history, tasks, and totals. This cannot be undone!')) return
    if (!confirm('Are you absolutely sure? This will permanently delete everything!')) return

    // Clear state
    state.currentStatus = null
    state.currentTask = null
    state.startTime = null
    state.tasks = {
        working: ['Admin', 'Maintenance'],
        unavailable: ['Lunch break', 'Tea break', 'Bathroom', 'Personal']
    }
    state.history = []
    state.dailyTotalsByDate = {}
    state.taskTotals = {}

    // Clear localStorage
    storage.remove(STORAGE_KEYS.TASKS)
    storage.remove(STORAGE_KEYS.HISTORY)
    storage.remove(STORAGE_KEYS.DAILY_TOTALS)
    storage.remove(STORAGE_KEYS.TASK_TOTALS)
    clearActiveSession()

    // Reset timer
    stopTimer()

    // Reset UI
    updateStatusButtons()
    updateTaskSelect()
    updateTimerDisplay()
    updateSummary()

    alert('✓ All data has been reset.')
}

// Initialize app
function initApp() {
    init()

    // Expose API for event handlers
    window.productivityApp = {
        setStatus,
        setTask,
        endWorkDay,
        toggleManageTasks,
        addTask,
        deleteTask,
        toggleHistoryView,
        exportData,
        importData,
        resetData
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp)
} else {
    initApp()
}
