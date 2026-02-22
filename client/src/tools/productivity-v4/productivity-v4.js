/**
 * Productivity Tracker V4
 * Task-focused time tracking with analytics
 */

import '../../shared/components/AppHeader.js'
import '../../shared/components/AppFooter.js'
import { productivityV4, productivity as timeclock, dashboard } from '../../api/client.js'
import { requireAuth } from '../../shared/utils/auth.js'
import toast from '../../shared/components/Toast.js'
import { formatTime } from '../../shared/utils/datetime.js'

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format milliseconds as HH:MM:SS
 */
function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// ============================================================================
// STATE
// ============================================================================

const state = {
  currentTab: 'tracking',
  tasks: [],
  activeSession: null,
  recentSessions: [],
  analytics: {
    range: 'last7',
    taskStats: [],
    dailyStats: [],
    frequencyStats: [],
    durationStats: [],
    timeclockStats: null
  },
  schedule: [],
  clockStatus: null,
  timerInterval: null,
  clockBarInterval: null,
  pollingInterval: null
}

// AbortController for tracking events — set once on first call; guarded so it binds exactly once
let trackingEventsController = null

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
  try {
    console.log('[Init] Starting initialization...')

    // Check authentication
    console.log('[Init] Checking authentication...')
    const user = await requireAuth()
    if (!user) {
      console.log('[Init] Not authenticated, will redirect')
      return
    }
    console.log('[Init] Authenticated as:', user.username)

    // Render app structure
    console.log('[Init] Rendering app structure...')
    renderApp()

    // Load initial data
    console.log('[Init] Loading tasks...')
    await loadTasks()

    console.log('[Init] Checking clock status...')
    await loadClockStatus()

    console.log('[Init] Checking active session...')
    await checkActiveSession()

    console.log('[Init] Loading recent sessions...')
    await loadRecentSessions()

    // Start polling for session sync
    console.log('[Init] Starting polling...')
    startPolling()

    // Set up tab navigation
    console.log('[Init] Setting up tabs...')
    setupTabs()

    console.log('[Init] Initialization complete!')
  } catch (error) {
    console.error('[Init] Initialization failed:', error)
    throw error
  }
}

// ============================================================================
// RENDERING
// ============================================================================

function renderApp() {
  const app = document.getElementById('app')

  app.innerHTML = `
    <app-header tool-name="Productivity Tracker V4"></app-header>

    <!-- Sticky Header Section -->
    <div class="productivity-header">
      <div class="header-content">
        <div class="header-title">
          <div class="header-icon">⏱️</div>
          <div class="header-text">
            <h1>Productivity Tracker</h1>
            <p>Track tasks and analyze your work patterns</p>
          </div>
        </div>

        <div class="tab-nav">
          <button class="tab-btn active" data-tab="tracking">Tracking</button>
          <button class="tab-btn" data-tab="analytics">Analytics</button>
          <button class="tab-btn" data-tab="settings">Settings</button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="productivity-container">
      <div id="tab-tracking" class="tab-content active">
        ${renderTrackingTab()}
      </div>

      <div id="tab-analytics" class="tab-content">
        ${renderAnalyticsTab()}
      </div>

      <div id="tab-settings" class="tab-content">
        ${renderSettingsTab()}
      </div>
    </div>

    <app-footer></app-footer>

    <!-- Task Management Modal -->
    <div id="task-modal" class="modal-overlay" style="display:none;">
      <div class="modal-content" style="max-width:500px;">
        <div class="modal-header">
          <h2 class="modal-title">Manage Tasks</h2>
          <button class="modal-close" id="task-modal-close">×</button>
        </div>
        <div style="display:flex;gap:var(--spacing-sm);margin-bottom:var(--spacing-md);">
          <input id="new-task-input" type="text" class="form-input" placeholder="New task name..." style="flex:1;">
          <button id="btn-add-task" class="btn btn-primary">Add</button>
        </div>
        <div id="task-modal-list"></div>
      </div>
    </div>

    <!-- Timecard Modal -->
    <div id="timecard-modal" class="modal-overlay" style="display:none;">
      <div class="modal-content" style="max-width:520px;">
        <div class="modal-header">
          <h2 class="modal-title">Timecard</h2>
          <button class="modal-close" id="timecard-modal-close">×</button>
        </div>
        <div id="timecard-content">Loading...</div>
        <div style="margin-top:var(--spacing-lg);border-top:1px solid rgba(255,255,255,0.1);padding-top:var(--spacing-lg);">
          <h3 style="margin-bottom:var(--spacing-md);font-size:var(--text-base);">Add Manual Entry</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input id="tc-date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
              <label class="form-label">Notes (optional)</label>
              <input id="tc-notes" type="text" class="form-input" placeholder="e.g. forgot to clock in">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Clock In</label>
              <input id="tc-clock-in" type="time" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Clock Out (optional)</label>
              <input id="tc-clock-out" type="time" class="form-input">
            </div>
          </div>
          <button id="btn-add-timecard" class="btn btn-primary">Add Entry</button>
        </div>
      </div>
    </div>
  `
}

function renderTimeclockBar() {
  const s = state.clockStatus
  if (!s) return '<div class="timeclock-bar-inner"><span class="tc-status">Loading timeclock...</span></div>'

  const clockedIn = s.clocked_in
  let elapsed = ''
  if (clockedIn && s.entry?.clock_in) {
    const ms = Date.now() - s.entry.clock_in
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    elapsed = ` · ${h}h ${m}m`
  }

  return `
    <div class="timeclock-bar-inner">
      <span class="tc-dot ${clockedIn ? 'tc-dot-in' : 'tc-dot-out'}"></span>
      <span class="tc-status">${clockedIn ? `Clocked in${elapsed}` : 'Not clocked in'}</span>
      <div class="tc-actions">
        ${clockedIn
          ? `<button id="btn-clock-out" class="btn btn-sm btn-secondary">Clock Out</button>`
          : `<button id="btn-clock-in" class="btn btn-sm btn-primary">Clock In</button>`
        }
        <button id="btn-timecard" class="btn btn-sm btn-secondary">Timecard</button>
      </div>
    </div>
  `
}

function renderTrackingTab() {
  return `
    <!-- Timeclock Bar -->
    <div id="timeclock-bar" class="timeclock-bar">
      ${renderTimeclockBar()}
    </div>

    <!-- Active Tracking Section -->
    <div class="tracking-section">
      <h2>Time Tracking</h2>
      <div id="tracking-status">
        ${state.activeSession ? renderActiveTracking() : renderIdleState()}
      </div>
    </div>

    <!-- Recent Sessions Section -->
    <div class="recent-sessions">
      <h2>Recent Sessions</h2>
      <div id="recent-sessions-list">
        ${renderRecentSessions()}
      </div>
    </div>
  `
}

function renderIdleState() {
  const options = state.tasks.map(t => `<option value="${t.id}">${t.name}</option>`).join('')

  return `
    <div class="tracking-idle">
      <h3>Select a task to start tracking</h3>
      ${state.tasks.length === 0 ? `
        <p style="color:var(--color-text-muted);font-size:var(--text-sm);text-align:center;margin-bottom:var(--spacing-md);">
          No tasks yet. Use "Manage Tasks" to add one.
        </p>
      ` : ''}
      <div class="task-select-wrapper">
        <select id="task-select" class="task-select">
          <option value="">Choose a task...</option>
          ${options}
        </select>
      </div>
      <div class="tracking-actions">
        <button id="btn-start" class="btn btn-primary" disabled>Start Tracking</button>
        <button id="btn-manage-tasks" class="btn btn-secondary">Manage Tasks</button>
      </div>
    </div>
  `
}

function renderActiveTracking() {
  const elapsed = Date.now() - state.activeSession.start_time
  const formatted = formatMs(elapsed)

  return `
    <div class="tracking-active">
      <div class="current-task-label">Currently Tracking</div>
      <div class="current-task">${state.activeSession.task_name}</div>
      <div id="timer" class="timer-display">${formatted}</div>
      <button id="btn-stop" class="btn btn-stop">Stop Tracking</button>
    </div>
  `
}

function renderRecentSessions() {
  if (state.recentSessions.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>No recent sessions</p>
      </div>
    `
  }

  return `
    <ul class="session-list">
      ${state.recentSessions.map(s => `
        <li class="session-item">
          <div class="session-info">
            <div class="session-task">${s.task_name}</div>
            <div class="session-meta">
              <span>${new Date(s.end_time).toLocaleDateString()}</span>
              <span>${formatTime(new Date(s.start_time))}</span>
            </div>
          </div>
          <div class="session-duration">${formatMs(s.duration)}</div>
        </li>
      `).join('')}
    </ul>
  `
}

function renderAnalyticsTab() {
  return `
    <div class="analytics-controls">
      <span class="date-range-label">Date Range</span>
      <div class="date-range-selector">
        <button class="date-range-btn active" data-range="last7">Last 7 Days</button>
        <button class="date-range-btn" data-range="last30">Last 30 Days</button>
        <button class="date-range-btn" data-range="last90">Last 90 Days</button>
        <button class="date-range-btn" data-range="all">All Time</button>
      </div>
    </div>

    <div id="timeclock-stats-section"></div>

    <div class="analytics-grid">
      <div class="analytics-card">
        <h3>Time Per Task</h3>
        <div id="chart-time-per-task"></div>
      </div>

      <div class="analytics-card">
        <h3>Task Frequency</h3>
        <div id="chart-frequency"></div>
      </div>

      <div class="analytics-card">
        <h3>Daily Trends</h3>
        <div id="chart-daily"></div>
      </div>

      <div class="analytics-card">
        <h3>Duration Distribution</h3>
        <div id="chart-duration"></div>
      </div>
    </div>
  `
}

function renderSettingsTab() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return `
    <div class="settings-section">
      <h2>Work Schedule</h2>
      <p class="settings-description">Configure your work hours for automatic clock-in/out. When you start tracking within ±5 minutes of your scheduled start time, you'll be automatically clocked in.</p>

      <div class="schedule-grid" id="schedule-grid">
        ${days.map((day, i) => {
    const schedule = state.schedule.find(s => s.day_of_week === i)
    const enabled = !!schedule
    const startTime = schedule?.start_time || '09:00'
    const endTime = schedule?.end_time || '17:00'

    return `
            <div class="schedule-row" data-day="${i}">
              <div class="schedule-day">${day}</div>
              <input type="time" class="schedule-input start-time" value="${startTime}" ${!enabled ? 'disabled' : ''}>
              <input type="time" class="schedule-input end-time" value="${endTime}" ${!enabled ? 'disabled' : ''}>
              <input type="checkbox" class="schedule-checkbox" ${enabled ? 'checked' : ''}>
            </div>
          `
  }).join('')}
      </div>

      <div class="schedule-actions">
        <button id="btn-save-schedule" class="btn btn-primary">Save Schedule</button>
      </div>
    </div>
  `
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn')
  const tabContents = document.querySelectorAll('.tab-content')

  tabButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const tab = btn.dataset.tab

      // Update active states
      tabButtons.forEach(b => b.classList.remove('active'))
      tabContents.forEach(c => c.classList.remove('active'))

      btn.classList.add('active')
      document.getElementById(`tab-${tab}`).classList.add('active')

      state.currentTab = tab

      // Load tab-specific data
      if (tab === 'analytics') {
        await loadAnalytics()
      } else if (tab === 'settings') {
        await loadSchedule()
      }
    })
  })

  // Set up tracking tab events
  setupTrackingEvents()

  // Set up analytics events
  setupAnalyticsEvents()

  // Set up settings events
  setupSettingsEvents()
}

function setupTrackingEvents() {
  if (trackingEventsController) return  // Already bound — skip
  trackingEventsController = new AbortController()
  const signal = trackingEventsController.signal

  // Task select change
  document.addEventListener('change', (e) => {
    if (e.target.id === 'task-select') {
      const startBtn = document.getElementById('btn-start')
      startBtn.disabled = !e.target.value
    }
  }, { signal })

  // Task modal: Enter key to add task + Escape to close
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      closeTaskModal()
      closeTimecardModal()
    }
    if (e.key === 'Enter' && e.target.id === 'new-task-input') {
      document.getElementById('btn-add-task')?.click()
    }
  }, { signal })

  // All click-based actions delegated through one listener
  document.addEventListener('click', async (e) => {
    // Start tracking
    if (e.target.id === 'btn-start') {
      const select = document.getElementById('task-select')
      const taskId = parseInt(select.value, 10)

      if (!taskId) return

      try {
        const response = await productivityV4.startTracking(taskId)
        const session = response.data

        state.activeSession = session
        updateTrackingStatus()
        startTimer()

        if (response.auto_clocked_in) {
          toast.success('Started tracking and auto-clocked in')
        } else {
          toast.success('Started tracking')
        }
        dashboard.createActivity({ type: 'productivity', description: `Started tracking: ${session.task_name}` }).catch(() => {})
      } catch (error) {
        toast.error(error.message || 'Failed to start tracking')
      }
    }

    // Stop tracking
    if (e.target.id === 'btn-stop') {
      try {
        const stoppedTaskName = state.activeSession?.task_name
        const response = await productivityV4.stopTracking()

        state.activeSession = null
        stopTimer()
        updateTrackingStatus()
        await loadRecentSessions()

        if (response.auto_clocked_out) {
          toast.success('Stopped tracking and auto-clocked out')
        } else {
          toast.success('Stopped tracking')
        }
        if (stoppedTaskName) {
          dashboard.createActivity({ type: 'productivity', description: `Stopped tracking: ${stoppedTaskName}` }).catch(() => {})
        }
      } catch (error) {
        toast.error(error.message || 'Failed to stop tracking')
      }
    }

    // Manage tasks
    if (e.target.id === 'btn-manage-tasks') {
      showTaskManagementModal()
    }

    // Clock in / out
    if (e.target.id === 'btn-clock-in') {
      try {
        await timeclock.clockIn()
        await loadClockStatus()
        toast.success('Clocked in')
      } catch (error) {
        toast.error(error.message || 'Failed to clock in')
      }
    }
    if (e.target.id === 'btn-clock-out') {
      try {
        await timeclock.clockOut()
        await loadClockStatus()
        toast.success('Clocked out')
      } catch (error) {
        toast.error(error.message || 'Failed to clock out')
      }
    }

    // Open timecard modal
    if (e.target.id === 'btn-timecard') {
      showTimecardModal()
    }

    // Close modals
    if (e.target.id === 'task-modal-close' || e.target.id === 'task-modal') {
      closeTaskModal()
    }
    if (e.target.id === 'timecard-modal-close' || e.target.id === 'timecard-modal') {
      closeTimecardModal()
    }

    // Task modal: add task
    if (e.target.id === 'btn-add-task') {
      const input = document.getElementById('new-task-input')
      const name = input?.value?.trim()
      if (!name) return
      try {
        await productivityV4.createTask({ name })
        dashboard.createActivity({ type: 'productivity', description: `Created task: ${name}` }).catch(() => {})
        await loadTasks()
        updateTrackingStatus()
        renderTaskModalList()
        input.value = ''
        input.focus()
        toast.success('Task added')
      } catch (error) {
        toast.error(error.message || 'Failed to add task')
      }
    }

    // Task modal: delete task
    if (e.target.classList.contains('task-delete-btn')) {
      const taskId = parseInt(e.target.dataset.taskId, 10)
      const taskName = e.target.dataset.taskName
      if (!taskId) return
      try {
        await productivityV4.deleteTask(taskId)
        dashboard.createActivity({ type: 'productivity', description: `Deleted task: ${taskName}` }).catch(() => {})
        await loadTasks()
        updateTrackingStatus()
        renderTaskModalList()
        toast.success(`"${taskName}" deleted`)
      } catch (error) {
        toast.error(error.message || 'Failed to delete task')
      }
    }

    // Timecard modal: delete entry
    if (e.target.classList.contains('tc-delete-btn')) {
      const entryId = parseInt(e.target.dataset.entryId, 10)
      if (!entryId) return
      try {
        await timeclock.deleteTimecardEntry(entryId)
        await loadTimecardData()
        await loadClockStatus()
        toast.success('Entry removed')
      } catch (error) {
        toast.error(error.message || 'Failed to delete entry')
      }
    }

    // Timecard modal: inline edit — show edit row
    if (e.target.classList.contains('tc-edit-btn')) {
      const entryId = parseInt(e.target.dataset.entryId, 10)
      if (!entryId) return
      showTimecardEditRow(entryId)
    }

    // Timecard modal: save inline edit
    if (e.target.classList.contains('tc-save-btn')) {
      const entryId = parseInt(e.target.dataset.entryId, 10)
      if (!entryId) return
      await saveTimecardEdit(entryId)
    }

    // Timecard modal: cancel inline edit
    if (e.target.classList.contains('tc-cancel-btn')) {
      await loadTimecardData()
    }

    // Timecard modal: add manual entry
    if (e.target.id === 'btn-add-timecard') {
      const date = document.getElementById('tc-date')?.value
      const clockInVal = document.getElementById('tc-clock-in')?.value
      const clockOutVal = document.getElementById('tc-clock-out')?.value
      const notes = document.getElementById('tc-notes')?.value

      if (!date || !clockInVal) {
        toast.error('Date and clock-in time are required')
        return
      }

      const clockInMs = new Date(`${date}T${clockInVal}`).getTime()
      const clockOutMs = clockOutVal ? new Date(`${date}T${clockOutVal}`).getTime() : null

      try {
        await timeclock.addTimecardEntry({ date, clock_in: clockInMs, clock_out: clockOutMs, is_manual: true, notes: notes || null })
        await loadTimecardData()
        await loadClockStatus()
        toast.success('Manual entry added')
      } catch (error) {
        toast.error(error.message || 'Failed to add entry')
      }
    }
  }, { signal })

  // Keyboard shortcuts: Ctrl+I (clock in), Ctrl+O (clock out), Ctrl+T (timecard)
  document.addEventListener('keydown', async (e) => {
    if (!e.ctrlKey && !e.metaKey) return
    const tag = document.activeElement?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return

    if (e.key === 'i' || e.key === 'I') {
      e.preventDefault()
      if (state.clockStatus?.clocked_in) { toast.info('Already clocked in'); return }
      try {
        await timeclock.clockIn()
        await loadClockStatus()
        toast.success('Clocked in')
      } catch (error) { toast.error(error.message || 'Failed to clock in') }
    }
    if (e.key === 'o' || e.key === 'O') {
      e.preventDefault()
      if (!state.clockStatus?.clocked_in) { toast.info('Not clocked in'); return }
      try {
        await timeclock.clockOut()
        await loadClockStatus()
        toast.success('Clocked out')
      } catch (error) { toast.error(error.message || 'Failed to clock out') }
    }
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault()
      showTimecardModal()
    }
  }, { signal })
}

function setupAnalyticsEvents() {
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('date-range-btn')) {
      // Update active button
      document.querySelectorAll('.date-range-btn').forEach(btn => btn.classList.remove('active'))
      e.target.classList.add('active')

      // Update state and reload
      state.analytics.range = e.target.dataset.range
      await loadAnalytics()
    }
  })
}

function setupSettingsEvents() {
  // Enable/disable time inputs based on checkbox
  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('schedule-checkbox')) {
      const row = e.target.closest('.schedule-row')
      const inputs = row.querySelectorAll('.schedule-input')

      inputs.forEach(input => {
        input.disabled = !e.target.checked
      })
    }
  })

  // Save schedule
  document.addEventListener('click', async (e) => {
    if (e.target.id === 'btn-save-schedule') {
      await saveSchedule()
    }
  })
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadTasks() {
  try {
    const response = await productivityV4.getTasks()
    state.tasks = response.data || []
  } catch (error) {
    console.error('Failed to load tasks:', error)
    toast.error('Failed to load tasks')
  }
}

async function checkActiveSession() {
  try {
    const response = await productivityV4.getSession()
    state.activeSession = response.data

    if (state.activeSession) {
      startTimer()
    }
    updateTrackingStatus()  // Render correct state immediately
  } catch (error) {
    console.error('Failed to check active session:', error)
  }
}

async function loadRecentSessions() {
  try {
    const response = await productivityV4.getRecentSessions(10)
    state.recentSessions = response.data || []

    const container = document.getElementById('recent-sessions-list')
    if (container) {
      container.innerHTML = renderRecentSessions()
    }
  } catch (error) {
    console.error('Failed to load recent sessions:', error)
  }
}

async function loadClockStatus() {
  try {
    const response = await timeclock.getClockStatus()
    state.clockStatus = response.data
    updateTimeclockBar()
  } catch (error) {
    console.error('Failed to load clock status:', error)
  }
}

function updateTimeclockBar() {
  const bar = document.getElementById('timeclock-bar')
  if (bar) bar.innerHTML = renderTimeclockBar()
}

async function loadAnalytics() {
  const filters = getDateRangeFilters(state.analytics.range)

  try {
    const [taskStats, dailyStats, frequencyStats, durationStats, timeclockData] = await Promise.all([
      productivityV4.getTaskAnalytics(filters),
      productivityV4.getDailyAnalytics(filters),
      productivityV4.getFrequencyAnalytics(filters),
      productivityV4.getDurationAnalytics(filters),
      productivityV4.getTimeclockAnalytics(filters)
    ])

    state.analytics.taskStats = taskStats.data || []
    state.analytics.dailyStats = dailyStats.data || []
    state.analytics.frequencyStats = frequencyStats.data || []
    state.analytics.durationStats = durationStats.data || []
    state.analytics.timeclockStats = timeclockData.data || null

    renderTimeclockStats()
    renderAnalyticsCharts()
  } catch (error) {
    console.error('Failed to load analytics:', error)
    toast.error('Failed to load analytics')
  }
}

async function loadSchedule() {
  try {
    const response = await productivityV4.getSchedule()
    state.schedule = response.data || []

    // Re-render the whole settings tab so schedule data is reflected
    const settingsTab = document.getElementById('tab-settings')
    if (settingsTab) {
      settingsTab.innerHTML = renderSettingsTab()
    }
  } catch (error) {
    console.error('Failed to load schedule:', error)
    toast.error('Failed to load schedule')
  }
}

async function saveSchedule() {
  const rows = document.querySelectorAll('.schedule-row')

  try {
    for (const row of rows) {
      const checkbox = row.querySelector('.schedule-checkbox')
      const dayOfWeek = parseInt(row.dataset.day, 10)
      const existing = state.schedule.find(s => s.day_of_week === dayOfWeek)

      if (!checkbox.checked) {
        // Delete this day's schedule if it was previously saved
        if (existing) {
          await productivityV4.deleteSchedule(dayOfWeek)
        }
      } else {
        const startTime = row.querySelector('.start-time').value
        const endTime = row.querySelector('.end-time').value
        await productivityV4.setSchedule({ day_of_week: dayOfWeek, start_time: startTime, end_time: endTime })
      }
    }

    toast.success('Schedule saved')
    await loadSchedule()
  } catch (error) {
    console.error('Failed to save schedule:', error)
    toast.error('Failed to save schedule')
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getDateRangeFilters(range) {
  const now = new Date()
  const filters = {}

  switch (range) {
    case 'last7':
      filters.startDate = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case 'last30':
      filters.startDate = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case 'last90':
      filters.startDate = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    // 'all' - no filters
  }

  return filters
}

function updateTrackingStatus() {
  const container = document.getElementById('tracking-status')
  if (container) {
    container.innerHTML = state.activeSession ? renderActiveTracking() : renderIdleState()
    // No setupTrackingEvents() here — bound once in init
  }
  updateTimeclockBar()
}

// ============================================================================
// TIMER
// ============================================================================

function startTimer() {
  stopTimer() // Clear any existing timer

  state.timerInterval = setInterval(() => {
    if (!state.activeSession) {
      stopTimer()
      return
    }

    const timerEl = document.getElementById('timer')
    if (timerEl) {
      const elapsed = Date.now() - state.activeSession.start_time
      timerEl.textContent = formatMs(elapsed)
    }
  }, 1000)
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval)
    state.timerInterval = null
  }
}

// ============================================================================
// POLLING (Cross-device sync)
// ============================================================================

function startPolling() {
  stopPolling() // Clear any existing polling

  state.pollingInterval = setInterval(async () => {
    try {
      const response = await productivityV4.getSession()
      const serverSession = response.data

      // Check if session changed
      const changed =
        (!state.activeSession && serverSession) ||
        (state.activeSession && !serverSession) ||
        (state.activeSession && serverSession && state.activeSession.task_id !== serverSession.task_id)

      if (changed) {
        console.log('[Polling] Session changed, updating UI')
        state.activeSession = serverSession

        if (serverSession) {
          startTimer()
        } else {
          stopTimer()
        }

        updateTrackingStatus()
        await loadRecentSessions()
      }
    } catch (error) {
      console.error('[Polling] Failed to sync session:', error)
    }
  }, 3000) // Poll every 3 seconds
}

function stopPolling() {
  if (state.pollingInterval) {
    clearInterval(state.pollingInterval)
    state.pollingInterval = null
  }
}

// ============================================================================
// ANALYTICS CHARTS (CSS-only bar charts)
// ============================================================================

function renderTimeclockStats() {
  const container = document.getElementById('timeclock-stats-section')
  if (!container) return

  const stats = state.analytics.timeclockStats
  if (!stats || stats.daysClocked === 0) {
    container.innerHTML = ''
    return
  }

  const formatHours = (h) => {
    const hrs = Math.floor(h)
    const mins = Math.round((h - hrs) * 60)
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
  }

  container.innerHTML = `
    <div class="timeclock-stats-bar">
      <h3 class="timeclock-stats-title">Timeclock Summary</h3>
      <div class="timeclock-stats-cards">
        <div class="tc-stat-card">
          <div class="tc-stat-value">${formatHours(stats.totalHours)}</div>
          <div class="tc-stat-label">Total Hours Worked</div>
        </div>
        <div class="tc-stat-card">
          <div class="tc-stat-value">${formatHours(stats.avgHours)}</div>
          <div class="tc-stat-label">Avg Shift Length</div>
        </div>
        <div class="tc-stat-card">
          <div class="tc-stat-value">${stats.daysClocked}</div>
          <div class="tc-stat-label">Days Clocked In</div>
        </div>
      </div>
    </div>
  `
}

function renderAnalyticsCharts() {
  renderTimePerTaskChart()
  renderFrequencyChart()
  renderDailyChart()
  renderDurationChart()
}

function renderTimePerTaskChart() {
  const container = document.getElementById('chart-time-per-task')
  if (!container) return

  const data = state.analytics.taskStats
  if (data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <p>No data available</p>
      </div>
    `
    return
  }

  const maxDuration = Math.max(...data.map(d => d.total_duration))

  container.innerHTML = `
    <div class="bar-chart">
      ${data.map(d => `
        <div class="bar-item">
          <div class="bar-label" title="${d.task_name}">${d.task_name}</div>
          <div class="bar-visual-container">
            <div class="bar-visual" style="width: ${(d.total_duration / maxDuration * 100)}%"></div>
          </div>
          <div class="bar-value">${formatMs(d.total_duration)}</div>
        </div>
      `).join('')}
    </div>
  `
}

function renderFrequencyChart() {
  const container = document.getElementById('chart-frequency')
  if (!container) return

  const data = state.analytics.frequencyStats
  if (data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📈</div>
        <p>No data available</p>
      </div>
    `
    return
  }

  const maxSessions = Math.max(...data.map(d => d.total_sessions))

  container.innerHTML = `
    <div class="bar-chart">
      ${data.map(d => `
        <div class="bar-item">
          <div class="bar-label" title="${d.task_name}">${d.task_name}</div>
          <div class="bar-visual-container">
            <div class="bar-visual" style="width: ${(d.total_sessions / maxSessions * 100)}%"></div>
          </div>
          <div class="bar-value">${d.total_sessions} sessions</div>
        </div>
      `).join('')}
    </div>
  `
}

function renderDailyChart() {
  const container = document.getElementById('chart-daily')
  if (!container) return

  const data = state.analytics.dailyStats.slice(0, 30).reverse() // Last 30 days
  if (data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <p>No data available</p>
      </div>
    `
    return
  }

  const maxDuration = Math.max(...data.map(d => d.total_duration))

  container.innerHTML = `
    <div class="bar-chart">
      ${data.map(d => {
    const date = new Date(d.date)
    const label = `${date.getMonth() + 1}/${date.getDate()}`

    return `
          <div class="bar-item">
            <div class="bar-label">${label}</div>
            <div class="bar-visual-container">
              <div class="bar-visual" style="width: ${(d.total_duration / maxDuration * 100)}%"></div>
            </div>
            <div class="bar-value">${formatMs(d.total_duration)}</div>
          </div>
        `
  }).join('')}
    </div>
  `
}

function renderDurationChart() {
  const container = document.getElementById('chart-duration')
  if (!container) return

  const data = state.analytics.taskStats
  if (data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⏱️</div>
        <p>No data available</p>
      </div>
    `
    return
  }

  const maxDuration = Math.max(...data.map(d => d.max_duration))

  container.innerHTML = `
    <div class="bar-chart">
      ${data.map(d => `
        <div class="bar-item">
          <div class="bar-label" title="${d.task_name}">${d.task_name}</div>
          <div class="bar-visual-container">
            <div class="bar-visual" style="width: ${(d.avg_duration / maxDuration * 100)}%"></div>
          </div>
          <div class="bar-value">
            ${formatMs(d.avg_duration)} avg
            (${formatMs(d.min_duration)} - ${formatMs(d.max_duration)})
          </div>
        </div>
      `).join('')}
    </div>
  `
}

// ============================================================================
// TASK MANAGEMENT MODAL
// ============================================================================

function renderTaskModalList() {
  const list = document.getElementById('task-modal-list')
  if (!list) return

  if (state.tasks.length === 0) {
    list.innerHTML = `<p style="color:var(--color-text-muted);text-align:center;padding:var(--spacing-lg);">No tasks yet. Add one above.</p>`
    return
  }

  list.innerHTML = `
    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:var(--spacing-xs);">
      ${state.tasks.map(t => `
        <li style="display:flex;align-items:center;justify-content:space-between;padding:var(--spacing-sm) var(--spacing-md);background:rgba(255,255,255,0.04);border-radius:var(--radius-md);">
          <span>${t.name}</span>
          <button class="btn btn-sm btn-error task-delete-btn" data-task-id="${t.id}" data-task-name="${t.name.replace(/"/g, '&quot;')}">Delete</button>
        </li>
      `).join('')}
    </ul>
  `
}

function showTaskManagementModal() {
  const modal = document.getElementById('task-modal')
  if (!modal) return
  modal.style.display = 'flex'
  renderTaskModalList()
  const input = document.getElementById('new-task-input')
  if (input) { input.value = ''; input.focus() }
}

function closeTaskModal() {
  const modal = document.getElementById('task-modal')
  if (modal) modal.style.display = 'none'
}

async function showTimecardModal() {
  const modal = document.getElementById('timecard-modal')
  if (!modal) return
  modal.style.display = 'flex'
  await loadTimecardData()
}

function closeTimecardModal() {
  const modal = document.getElementById('timecard-modal')
  if (modal) modal.style.display = 'none'
}

async function loadTimecardData() {
  const content = document.getElementById('timecard-content')
  if (!content) return

  try {
    const response = await timeclock.getTimecard()
    const entries = response.data || []

    if (entries.length === 0) {
      content.innerHTML = `<p style="color:var(--color-text-muted);text-align:center;padding:var(--spacing-md);">No timecard entries found.</p>`
      return
    }

    const tdStyle = `style="padding:var(--spacing-xs) var(--spacing-sm);font-size:var(--text-sm);"`

    content.innerHTML = `
      <table style="width:100%;border-collapse:collapse;" id="timecard-table">
        <thead>
          <tr>
            <th style="text-align:left;padding:var(--spacing-xs) var(--spacing-sm);color:var(--color-text-muted);font-size:var(--text-sm);">Date</th>
            <th style="text-align:left;padding:var(--spacing-xs) var(--spacing-sm);color:var(--color-text-muted);font-size:var(--text-sm);">In</th>
            <th style="text-align:left;padding:var(--spacing-xs) var(--spacing-sm);color:var(--color-text-muted);font-size:var(--text-sm);">Out</th>
            <th style="text-align:left;padding:var(--spacing-xs) var(--spacing-sm);color:var(--color-text-muted);font-size:var(--text-sm);">Duration</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${entries.slice(0, 20).map(e => {
            const inTime = e.clock_in ? new Date(e.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
            const outTime = e.clock_out ? new Date(e.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
            const dur = e.clock_in && e.clock_out ? formatMs(e.clock_out - e.clock_in) : '—'
            return `
              <tr data-entry-id="${e.id}" style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <td ${tdStyle}>${e.date}</td>
                <td ${tdStyle}>${inTime}${e.is_manual ? ' *' : ''}</td>
                <td ${tdStyle}>${outTime}</td>
                <td ${tdStyle}>${dur}</td>
                <td style="padding:var(--spacing-xs) var(--spacing-sm);text-align:right;white-space:nowrap;">
                  <button class="btn btn-sm btn-secondary tc-edit-btn" data-entry-id="${e.id}" data-date="${e.date}" data-clock-in="${e.clock_in || ''}" data-clock-out="${e.clock_out || ''}">✏</button>
                  <button class="btn btn-sm btn-error tc-delete-btn" data-entry-id="${e.id}">×</button>
                </td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
      <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--spacing-sm);">* manual entry</p>
    `
  } catch (error) {
    content.innerHTML = `<p style="color:var(--color-error);">Failed to load timecard data.</p>`
  }
}

function showTimecardEditRow(entryId) {
  const row = document.querySelector(`tr[data-entry-id="${entryId}"]`)
  if (!row) return

  const editBtn = row.querySelector('.tc-edit-btn')
  const date = editBtn?.dataset.date || ''
  const clockInMs = parseInt(editBtn?.dataset.clockIn) || 0
  const clockOutMs = parseInt(editBtn?.dataset.clockOut) || 0

  const toTimeInput = (ms) => {
    if (!ms) return ''
    const d = new Date(ms)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const s = `style="padding:2px 4px;background:var(--color-bg-hover);border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-sm);color:var(--color-text-primary);font-size:var(--text-xs);"`

  row.innerHTML = `
    <td style="padding:4px var(--spacing-sm);">
      <input type="date" id="tc-edit-date-${entryId}" value="${date}" ${s} />
    </td>
    <td style="padding:4px var(--spacing-sm);">
      <input type="time" id="tc-edit-in-${entryId}" value="${toTimeInput(clockInMs)}" ${s} />
    </td>
    <td style="padding:4px var(--spacing-sm);">
      <input type="time" id="tc-edit-out-${entryId}" value="${toTimeInput(clockOutMs)}" ${s} />
    </td>
    <td style="padding:4px var(--spacing-sm);font-size:var(--text-xs);color:var(--color-text-muted);">editing</td>
    <td style="padding:4px var(--spacing-sm);text-align:right;white-space:nowrap;">
      <button class="btn btn-sm btn-primary tc-save-btn" data-entry-id="${entryId}">Save</button>
      <button class="btn btn-sm btn-secondary tc-cancel-btn">Cancel</button>
    </td>
  `
}

async function saveTimecardEdit(entryId) {
  const dateEl = document.getElementById(`tc-edit-date-${entryId}`)
  const inEl = document.getElementById(`tc-edit-in-${entryId}`)
  const outEl = document.getElementById(`tc-edit-out-${entryId}`)

  const date = dateEl?.value
  const clockInVal = inEl?.value
  const clockOutVal = outEl?.value

  if (!date || !clockInVal) {
    toast.error('Date and clock-in time are required')
    return
  }

  const clock_in = new Date(`${date}T${clockInVal}`).getTime()
  const clock_out = clockOutVal ? new Date(`${date}T${clockOutVal}`).getTime() : null

  try {
    await timeclock.updateTimecardEntry(entryId, { date, clock_in, clock_out })
    await loadTimecardData()
    await loadClockStatus()
    toast.success('Entry updated')
  } catch (error) {
    toast.error(error.message || 'Failed to update entry')
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

window.addEventListener('beforeunload', () => {
  stopTimer()
  stopPolling()
})

// ============================================================================
// START APP
// ============================================================================

init().catch(error => {
  console.error('Failed to initialize app:', error)
  document.getElementById('app').innerHTML = `
    <div style="padding: 40px; text-align: center;">
      <h1 style="color: #ff4444;">Error Loading Page</h1>
      <p>${error.message}</p>
      <pre style="text-align: left; background: #f0f0f0; padding: 20px; overflow: auto;">${error.stack}</pre>
    </div>
  `
})
