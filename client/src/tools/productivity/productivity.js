import { storage } from '../../shared/utils/storage.js'
import { STATUS_CATEGORIES } from '../../shared/constants.js'
import { formatDuration, formatDate } from '../../shared/utils/datetime.js'
import { requireAuth } from '../../shared/utils/auth.js'
import '../../shared/components/AppHeader.js'
import { AppFooter } from '../../shared/components/AppFooter.js'
import { productivity } from '../../api/client.js'
import '../../shared/utils/cyberpunk-effects.js'

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
let pollingInterval = null
const POLL_INTERVAL_MS = 3000 // 3 seconds

// Get local date string in YYYY-MM-DD format (avoids UTC timezone issues)
function getLocalDateString(date = new Date()) {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Initialize
async function init() {
    // Check authentication first
    const user = await requireAuth()
    if (!user) return // requireAuth redirects to login if not authenticated

    await loadData()

    await syncActiveSessionFromServer() // Sync before displaying
    await loadClockStatus() // Load timeclock status

    updateTaskSelect()
    updateSummary()

    startPolling() // Start polling for updates
}

// Ensure today's date exists in dailyTotalsByDate
function ensureTodayExists() {
    const today = getLocalDateString()
    if (!state.dailyTotalsByDate[today]) {
        state.dailyTotalsByDate[today] = {
            available: 0,
            working: 0,
            unavailable: 0
        }
    }
}

// Load data from server API
async function loadData() {
    try {
        // Load tasks from API
        const tasksResponse = await productivity.getTasks()
        const tasksData = tasksResponse.data || tasksResponse
        if (Array.isArray(tasksData)) {
            state.tasks = { working: [], unavailable: [] }
            tasksData.forEach(t => {
                if (state.tasks[t.status]) {
                    state.tasks[t.status].push(t.name)
                }
            })
        }

        // Load today's daily totals from API
        const today = getLocalDateString()
        const totalsResponse = await productivity.getDailyTotals({ startDate: today, endDate: today })
        const totalsData = totalsResponse.data || totalsResponse
        if (Array.isArray(totalsData) && totalsData.length > 0) {
            state.dailyTotalsByDate[today] = {
                available: totalsData[0].available || 0,
                working: totalsData[0].working || 0,
                unavailable: totalsData[0].unavailable || 0
            }
        }

        // Load history from API (last 7 days for summary)
        const weekAgo = getLocalDateString(new Date(Date.now() - 7 * 86400000))
        const historyResponse = await productivity.getHistory({ startDate: weekAgo })
        const historyData = historyResponse.data || historyResponse
        if (Array.isArray(historyData)) {
            state.history = historyData
        }

        // Load task totals from API
        const taskTotalsResponse = await productivity.getTaskTotals()
        const taskTotalsData = taskTotalsResponse.data || taskTotalsResponse
        if (Array.isArray(taskTotalsData)) {
            state.taskTotals = {}
            taskTotalsData.forEach(t => {
                state.taskTotals[t.task_key] = t.total_time
            })
        }
    } catch (error) {
        console.error('Error loading data from API:', error)
    }

    ensureTodayExists()
}

// Check for active session on load
function checkForActiveSession() {
    const activeSession = storage.get('activeSession')
    if (activeSession) {
        const sessionDate = getLocalDateString(activeSession.startTime)
        const today = getLocalDateString()

        // If session is from a previous day, save it to that day and start fresh
        if (sessionDate !== today) {
            console.log(`Found overnight session from ${sessionDate}, saving and resetting...`)

            // Calculate duration up to midnight of the session day
            const sessionStart = new Date(activeSession.startTime)
            const nextDayMidnight = new Date(sessionDate + 'T00:00:00')
            nextDayMidnight.setDate(nextDayMidnight.getDate() + 1)

            // Calculate time from start to midnight
            const durationTillMidnight = nextDayMidnight.getTime() - sessionStart.getTime()

            // Ensure the old date exists in dailyTotalsByDate
            if (!state.dailyTotalsByDate[sessionDate]) {
                state.dailyTotalsByDate[sessionDate] = { available: 0, working: 0, unavailable: 0 }
            }

            // Add the time to the correct day
            state.dailyTotalsByDate[sessionDate][activeSession.status] += durationTillMidnight

            // Add to history
            state.history.push({
                status: activeSession.status,
                task: activeSession.task,
                startTime: activeSession.startTime,
                duration: durationTillMidnight,
                date: sessionDate
            })

            // Update task totals
            const taskKey = `${activeSession.status}-${activeSession.task}`
            state.taskTotals[taskKey] = (state.taskTotals[taskKey] || 0) + durationTillMidnight

            saveData()

            // Clear the old session - user needs to manually restart tracking today
            clearActiveSession()
            console.log(`Saved ${Math.round(durationTillMidnight / 60000)} minutes to ${sessionDate}. Please restart tracking for today.`)
            return
        }

        // Same day session - restore normally
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

// ===== SERVER SYNCHRONIZATION =====

// Start polling for session updates
function startPolling() {
    console.log('[Polling] Starting session polling (every 3 seconds)')
    stopPolling()
    pollActiveSession() // Poll immediately
    pollingInterval = setInterval(pollActiveSession, POLL_INTERVAL_MS)
}

// Stop polling
function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
    }
}

// Poll server for active session
async function pollActiveSession() {
    try {
        const response = await fetch('/api/v1/productivity/session', {
            credentials: 'include'
        })

        if (!response.ok) {
            console.warn('[Polling] Session endpoint returned', response.status)
            return
        }

        const result = await response.json()
        console.log('[Polling] Server session:', result.data)
        handleSessionUpdate(result.data)
    } catch (error) {
        console.error('[Polling] Error:', error)
    }
}

// Handle session update from server
function handleSessionUpdate(serverSession) {
    // No server session, but client has one → stopped elsewhere
    if (!serverSession && state.currentStatus) {
        console.log('Session stopped on another device')
        state.currentStatus = null
        state.currentTask = null
        state.startTime = null
        stopTimer()
        storage.remove('activeSession')
        updateStatusButtons()
        updateTaskSelect()
        updateTimerDisplay()
        return
    }

    // Server has session, client doesn't → started elsewhere
    if (serverSession && !state.currentStatus) {
        console.log('Session started on another device')
        state.currentStatus = serverSession.status
        state.currentTask = serverSession.task
        state.startTime = serverSession.start_time
        storage.set('activeSession', serverSession)
        updateStatusButtons()
        updateTaskSelect()
        startTimer()
        return
    }

    // Both have sessions, but different → changed elsewhere
    if (serverSession && state.currentStatus) {
        const matches = (
            serverSession.status === state.currentStatus &&
            serverSession.task === state.currentTask &&
            serverSession.start_time === state.startTime
        )

        if (!matches) {
            console.log('Session changed on another device')
            state.currentStatus = serverSession.status
            state.currentTask = serverSession.task
            state.startTime = serverSession.start_time
            storage.set('activeSession', serverSession)
            updateStatusButtons()
            updateTaskSelect()
            startTimer()
        }
    }
}

// Sync with server on init
async function syncActiveSessionFromServer() {
    try {
        const response = await fetch('/api/v1/productivity/session', {
            credentials: 'include'
        })

        if (response.ok) {
            const result = await response.json()
            const serverSession = result.data

            if (serverSession) {
                state.currentStatus = serverSession.status
                state.currentTask = serverSession.task
                state.startTime = serverSession.start_time
                storage.set('activeSession', serverSession)
                updateStatusButtons()
                updateTaskSelect()
                startTimer()
            } else {
                checkForActiveSession()
                if (state.currentStatus) {
                    await saveSessionToServer()
                }
            }
        }
    } catch (error) {
        console.error('Sync error:', error)
        checkForActiveSession()
    }
}

// Save current session to server
async function saveSessionToServer() {
    if (!state.currentStatus || !state.currentTask) {
        console.log('[Save] Skipping save - no status or task')
        return
    }

    try {
        console.log('[Save] Saving session to server:', state.currentStatus, state.currentTask)
        const response = await fetch('/api/v1/productivity/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                status: state.currentStatus,
                task: state.currentTask,
                start_time: state.startTime || Date.now()
            })
        })
        if (response.ok) {
            console.log('[Save] Session saved successfully')
        } else {
            console.error('[Save] Failed to save session:', response.status)
        }
    } catch (error) {
        console.error('[Save] Error saving session:', error)
    }
}

// Set status
async function setStatus(status) {
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
        await saveSessionToServer()
        storage.set('activeSession', { status, task: 'Available', startTime: state.startTime })
        startTimer()
    }
}

// Set task
async function setTask() {
    const taskSelect = document.getElementById('taskSelect')
    const selectedTask = taskSelect.value

    if (!selectedTask) return

    // Save previous session if exists
    if (state.currentTask && state.startTime) {
        saveSession()
    }

    state.currentTask = selectedTask
    state.startTime = Date.now()

    await saveSessionToServer()
    storage.set('activeSession', {
        status: state.currentStatus,
        task: selectedTask,
        startTime: state.startTime
    })

    startTimer()
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
async function saveSession() {
    if (!state.currentStatus || !state.currentTask || !state.startTime) return

    const now = Date.now()
    const sessionDate = getLocalDateString(state.startTime)
    const today = getLocalDateString()

    // Handle session that spans midnight
    if (sessionDate !== today) {
        const nextDayMidnight = new Date(sessionDate + 'T00:00:00')
        nextDayMidnight.setDate(nextDayMidnight.getDate() + 1)
        const durationTillMidnight = nextDayMidnight.getTime() - state.startTime

        // Save pre-midnight portion via API
        try {
            await productivity.addHistory({
                status: state.currentStatus,
                task: state.currentTask,
                start_time: state.startTime,
                duration: durationTillMidnight,
                date: sessionDate
            })
        } catch (error) {
            console.error('Error saving pre-midnight session:', error)
        }

        // Save post-midnight portion via API
        const durationFromMidnight = now - nextDayMidnight.getTime()
        if (durationFromMidnight > 0) {
            try {
                await productivity.addHistory({
                    status: state.currentStatus,
                    task: state.currentTask,
                    start_time: nextDayMidnight.getTime(),
                    duration: durationFromMidnight,
                    date: today
                })
            } catch (error) {
                console.error('Error saving post-midnight session:', error)
            }
        }
    } else {
        // Normal same-day session
        const duration = now - state.startTime

        // Save via API
        try {
            await productivity.addHistory({
                status: state.currentStatus,
                task: state.currentTask,
                start_time: state.startTime,
                duration: duration,
                date: today
            })
        } catch (error) {
            console.error('Error saving session:', error)
        }
    }

    // Reload data from server to get updated totals
    await loadData()
    updateSummary()
}

// Update summary
function updateSummary() {
    const today = getLocalDateString()
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
async function addTask() {
    const statusSelect = document.getElementById('newTaskStatus')
    const nameInput = document.getElementById('newTaskName')

    const status = statusSelect.value
    const name = nameInput.value.trim()

    if (!name) {
        alert('Please enter a task name')
        return
    }

    if (state.tasks[status] && state.tasks[status].includes(name)) {
        alert('Task already exists')
        return
    }

    try {
        await productivity.addTask(status, name)
        if (!state.tasks[status]) state.tasks[status] = []
        state.tasks[status].push(name)
        updateTaskSelect()
        renderTasksList()
        nameInput.value = ''
        alert(`✓ Task "${name}" added to ${status}`)
    } catch (error) {
        console.error('Error adding task:', error)
        alert('Failed to add task: ' + error.message)
    }
}

// Delete task
async function deleteTask(status, name) {
    if (!confirm(`Delete task "${name}"?`)) return

    try {
        await productivity.deleteTask(status, name)
        state.tasks[status] = state.tasks[status].filter(t => t !== name)
        updateTaskSelect()
        renderTasksList()
    } catch (error) {
        console.error('Error deleting task:', error)
        alert('Failed to delete task: ' + error.message)
    }
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
    const today = getLocalDateString()
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

// Repair data - fix timezone bug that logged data to wrong dates
function repairData() {
    if (!confirm('Repair data? This will recalculate all daily totals from history using correct local dates. This fixes the timezone bug.')) return

    console.log('Starting data repair...')
    console.log('Before repair:', JSON.stringify(state.dailyTotalsByDate, null, 2))

    // Rebuild dailyTotalsByDate from history using correct local dates
    const repairedDailyTotals = {}
    const repairedTaskTotals = {}
    let fixedEntries = 0

    state.history.forEach((entry, index) => {
        // Calculate correct date from startTime using local timezone
        const correctDate = getLocalDateString(entry.startTime)

        // Check if the date was wrong
        if (entry.date !== correctDate) {
            console.log(`Fixing entry ${index}: ${entry.task} was ${entry.date}, should be ${correctDate}`)
            entry.date = correctDate
            fixedEntries++
        }

        // Ensure date exists in totals
        if (!repairedDailyTotals[correctDate]) {
            repairedDailyTotals[correctDate] = { available: 0, working: 0, unavailable: 0 }
        }

        // Add duration to correct date
        repairedDailyTotals[correctDate][entry.status] += entry.duration

        // Rebuild task totals
        const taskKey = `${entry.status}-${entry.task}`
        repairedTaskTotals[taskKey] = (repairedTaskTotals[taskKey] || 0) + entry.duration
    })

    // Update state
    state.dailyTotalsByDate = repairedDailyTotals
    state.taskTotals = repairedTaskTotals

    // Save repaired data
    saveData()
    updateSummary()

    console.log('After repair:', JSON.stringify(state.dailyTotalsByDate, null, 2))
    alert(`✓ Data repaired! Fixed ${fixedEntries} entries. Check console for details.`)
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

// ============================================================================
// TIMECLOCK FUNCTIONALITY
// ============================================================================

let clockInterval = null
let clockState = {
    clocked_in: false,
    entry: null,
    elapsed: 0
}

// Load clock status from server
async function loadClockStatus() {
    try {
        console.log('[Timeclock] Loading clock status...')
        const response = await productivity.getClockStatus()
        console.log('[Timeclock] Response:', response)
        const status = response.data || response

        clockState = status
        console.log('[Timeclock] Clock state:', clockState)
        updateClockUI()

        if (status.clocked_in) {
            startClockTimer()
        }
    } catch (error) {
        console.error('[Timeclock] Failed to load clock status:', error)
        // Initialize with default state if loading fails
        clockState = {
            clocked_in: false,
            entry: null,
            elapsed: 0
        }
        updateClockUI()
    }
}

// Update clock UI
function updateClockUI() {
    console.log('[Timeclock] Updating UI, state:', clockState)

    const statusLabel = document.getElementById('clockStatusLabel')
    const elapsed = document.getElementById('clockElapsed')
    const clockInBtn = document.getElementById('clockInBtn')
    const clockOutBtn = document.getElementById('clockOutBtn')
    const statusIcon = document.getElementById('clockStatusIcon')

    // Check if elements exist
    if (!statusLabel || !elapsed || !clockInBtn || !clockOutBtn || !statusIcon) {
        console.warn('[Timeclock] Clock UI elements not found in DOM')
        return
    }

    if (clockState.clocked_in) {
        statusLabel.textContent = 'Clocked In'
        elapsed.textContent = formatElapsed(clockState.elapsed)
        clockInBtn.style.display = 'none'
        clockOutBtn.style.display = 'flex'
        statusIcon.textContent = '✅'
    } else {
        statusLabel.textContent = 'Not Clocked In'
        elapsed.textContent = '--:--:--'
        clockInBtn.style.display = 'flex'
        clockOutBtn.style.display = 'none'
        statusIcon.textContent = '⏰'
    }

    console.log('[Timeclock] UI updated successfully')
}

// Format elapsed time (milliseconds to HH:MM:SS)
function formatElapsed(ms) {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// Start clock timer (update every second)
function startClockTimer() {
    if (clockInterval) {
        clearInterval(clockInterval)
    }

    clockInterval = setInterval(() => {
        if (clockState.clocked_in && clockState.entry) {
            clockState.elapsed = Date.now() - clockState.entry.clock_in
            document.getElementById('clockElapsed').textContent = formatElapsed(clockState.elapsed)
        }
    }, 1000)
}

// Stop clock timer
function stopClockTimer() {
    if (clockInterval) {
        clearInterval(clockInterval)
        clockInterval = null
    }
}

// Clock in
async function clockIn() {
    console.log('[Timeclock] Clock in button clicked')
    try {
        const timestamp = Date.now()
        console.log('[Timeclock] Calling API clockIn with timestamp:', timestamp)
        const response = await productivity.clockIn(timestamp)
        console.log('[Timeclock] Clock in response:', response)

        if (response.success !== false) {
            const entry = response.data || response
            console.log('Clocked in:', entry)

            // Update state
            clockState = {
                clocked_in: true,
                entry: {
                    id: entry.id,
                    clock_in: entry.clock_in,
                    date: entry.date
                },
                elapsed: 0
            }

            updateClockUI()
            startClockTimer()

            alert('✓ Clocked in successfully!')
        } else {
            alert('❌ ' + (response.message || 'Failed to clock in'))
        }
    } catch (error) {
        console.error('Clock in error:', error)
        alert('❌ Failed to clock in: ' + error.message)
    }
}

// Clock out
async function clockOut() {
    console.log('[Timeclock] Clock out button clicked')

    // Confirmation dialog
    const confirmMsg = state.currentStatus
        ? `Clock out and save current session (${state.currentStatus} - ${state.currentTask})?`
        : 'Clock out for the day?'

    if (!confirm(confirmMsg)) {
        console.log('[Timeclock] Clock out cancelled by user')
        return
    }

    try {
        const timestamp = Date.now()
        console.log('[Timeclock] Calling API clockOut with timestamp:', timestamp)
        const response = await productivity.clockOut(timestamp)
        console.log('[Timeclock] Clock out response:', response)

        if (response.success !== false) {
            const entry = response.data || response
            console.log('Clocked out:', entry)

            // Update state
            clockState = {
                clocked_in: false,
                entry: null,
                elapsed: 0
            }

            updateClockUI()
            stopClockTimer()

            // Stop current tracking if active
            if (state.currentStatus) {
                stopTimer()
                state.currentStatus = null
                state.currentTask = null
                state.startTime = null
                updateStatusButtons()
                updateTimerDisplay()
            }

            // Reload data to show updated totals
            await loadData()
            updateSummary()

            alert('✓ Clocked out successfully!')
        } else {
            alert('❌ ' + (response.message || 'Failed to clock out'))
        }
    } catch (error) {
        console.error('Clock out error:', error)
        alert('❌ Failed to clock out: ' + error.message)
    }
}

// Show timecard modal (placeholder - to be implemented)
function showTimecard() {
    console.log('[Timeclock] Timecard button clicked')
    alert('Timecard view coming soon! This will show your clock in/out history and allow manual adjustments.')
}

// Initialize app
function initApp() {
    console.log('[App] Initializing productivity app...')
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
        repairData,
        resetData,
        clockIn,
        clockOut,
        showTimecard
    }

    console.log('[App] window.productivityApp exposed:', Object.keys(window.productivityApp))
    console.log('[Timeclock] Functions available:', {
        clockIn: typeof window.productivityApp.clockIn,
        clockOut: typeof window.productivityApp.clockOut,
        showTimecard: typeof window.productivityApp.showTimecard
    })
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopPolling()
})

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp)
} else {
    initApp()
}
