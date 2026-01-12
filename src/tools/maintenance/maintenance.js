import { storage } from '../../shared/utils/storage.js'
import { STORAGE_KEYS } from '../../shared/constants.js'
import { formatDate, formatDateTime } from '../../shared/utils/datetime.js'

// Machine configurations
const MACHINE_INKS = {
    'Epson 9900': ['C', 'LC', 'M', 'LM', 'Y', 'O', 'G', 'PK', 'MK', 'LK', 'LLK'],
    'Epson WT7900': ['C', 'LC', 'M', 'LM', 'Y', 'O', 'G', 'PK', 'LK', 'LLK', 'White'],
    'Epson P9070': ['C', 'LC', 'M', 'LM', 'Y', 'O', 'G', 'PK', 'MK', 'LK', 'LLK', 'Violet'],
    'Roland VS-300i': ['C', 'M', 'Y', 'K', 'O', 'G', 'White', 'Metallic'],
    'Laminator': []
}

const ISSUE_TYPES = {
    'Print Quality': [
        { value: 'nozzle-clog', label: 'Nozzle clog/dropout', colors: true },
        { value: 'banding', label: 'Banding', colors: true },
        { value: 'color-inconsistency', label: 'Color inconsistency', colors: true },
        { value: 'registration', label: 'Registration issues', colors: false }
    ],
    'Mechanical': [
        { value: 'paper-jam', label: 'Paper jam', colors: false },
        { value: 'media-feed', label: 'Media feed issues', colors: false },
        { value: 'cutting', label: 'Cutting issues', colors: false }
    ],
    'Ink': [
        { value: 'cartridge-error', label: 'Cartridge error', colors: true },
        { value: 'ink-level', label: 'Ink level sensor', colors: false }
    ],
    'Other': [
        { value: 'software', label: 'Software/RIP issues', colors: false },
        { value: 'network', label: 'Network connection', colors: false },
        { value: 'general', label: 'General maintenance', colors: false }
    ]
}

// Daily checklist template
const CHECKLIST_TEMPLATE = [
    { id: 1, text: 'Turn all PCs and Mac on', details: null },
    { id: 2, text: 'Open media player on all PCs', details: null },
    { id: 3, text: 'Open PC programs', details: 'Illustrator, Photoshop, Acrobat' },
    { id: 4, text: 'Turn laminator on', details: null },
    { id: 5, text: 'Run clean on Epson 9900 and WT7900', details: null },
    { id: 6, text: 'Test print on Epson 9900 and WT7900', details: null },
    { id: 7, text: 'Shake Roland inks', details: 'Shake all 8 cartridges' },
    { id: 8, text: 'Run clean on Roland', details: null, monday: 'Power clean on Monday' },
    { id: 9, text: 'Test print on Roland', details: null },
    { id: 10, text: 'Sign all test prints', details: 'Date and initial' },
    { id: 11, text: 'Run "All colors new.pdf"', details: null },
    { id: 12, text: 'Trim and stack Epson test prints', details: null },
    { id: 13, text: 'Sign and stack Roland test print', details: null },
    { id: 14, text: 'Process "All colors new.pdf"', details: null },
    { id: 15, text: 'Check for overnight proofs', details: null }
]

// Weekly maintenance tasks
const WEEKLY_MAINTENANCE = [
    { id: 'weekly-roland', name: 'Roland Manual Cleaning', steps: [
        'Open front cover',
        'Wipe print head with lint-free swab',
        'Clean wiper blade gently',
        'Clean capping station with swab',
        'Wipe encoder strip carefully',
        'Check and clean media path',
        'Inspect and clean pinch rollers',
        'Clean dust filter',
        'Wipe down exterior',
        'Check ink levels',
        'Verify cable connections',
        'Test print after cleaning',
        'Document any issues',
        'Sign off maintenance log',
        'Schedule next cleaning',
        'Close and secure cover'
    ]}
]

// State
let state = {
    dailyChecklist: {},
    issues: [],
    recurringTasks: [],
    techVisits: [],
    maintenanceHistory: {},
    currentTimer: null,
    timerStart: null,
    analyticsPeriod: 'month',
    uploadedPhotos: []
}

let timerInterval = null
let elapsedSeconds = 0

// Initialize
function init() {
    loadData()
    updateCurrentDate()
    initializeToday()
    populateFormDropdowns()
    render()
}

// Get today's key
function getTodayKey() {
    return new Date().toISOString().split('T')[0]
}

// Check if today is Monday
function isMonday() {
    return new Date().getDay() === 1
}

// Update current date display
function updateCurrentDate() {
    const today = new Date()
    const formatted = formatDate(today, 'en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    document.getElementById('currentDate').textContent = formatted
}

// Initialize today's checklist
function initializeToday() {
    const today = getTodayKey()
    if (!state.dailyChecklist[today]) {
        state.dailyChecklist[today] = CHECKLIST_TEMPLATE.map(item => ({
            ...item,
            completed: false
        }))
        saveData()
    }
}

// Load data
function loadData() {
    const saved = storage.get(STORAGE_KEYS.MAINTENANCE)
    if (saved) {
        state = { ...state, ...saved }
    }
}

// Save data
function saveData() {
    storage.set(STORAGE_KEYS.MAINTENANCE, {
        dailyChecklist: state.dailyChecklist,
        issues: state.issues,
        recurringTasks: state.recurringTasks,
        techVisits: state.techVisits,
        maintenanceHistory: state.maintenanceHistory
    })
}

// Switch tab
function switchTab(tabName) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'))
    event.target.classList.add('active')

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'))
    document.getElementById(`tab-${tabName}`).classList.add('active')

    // Conditional rendering
    if (tabName === 'analytics') {
        renderAnalytics()
    } else if (tabName === 'maintenance') {
        renderWeeklyMaintenance()
        renderRecurringTasks()
    } else if (tabName === 'calendar') {
        renderTechVisits()
    } else if (tabName === 'issues') {
        renderIssues()
    }
}

// Toggle checklist task
function toggleTask(taskId) {
    const today = getTodayKey()
    const task = state.dailyChecklist[today].find(t => t.id === taskId)
    if (task) {
        task.completed = !task.completed
        saveData()
        render()
    }
}

// Update progress
function updateProgress() {
    const today = getTodayKey()
    const tasks = state.dailyChecklist[today] || []
    const completed = tasks.filter(t => t.completed).length
    const total = tasks.length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    const progressBar = document.getElementById('progressBar')
    progressBar.style.width = `${percentage}%`
    progressBar.textContent = `${percentage}% (${completed}/${total})`
}

// Reset checklist
function resetChecklist() {
    if (!confirm('Reset today\'s checklist? All completed tasks will be unchecked.')) return

    const today = getTodayKey()
    state.dailyChecklist[today].forEach(task => task.completed = false)
    saveData()
    render()
}

// Render daily checklist
function renderDailyChecklist() {
    const today = getTodayKey()
    const tasks = state.dailyChecklist[today] || []
    const monday = isMonday()

    const html = tasks.map(task => `
        <div class="checklist-item ${task.completed ? 'completed' : ''}" onclick="window.maintenanceApp.toggleTask(${task.id})">
            <div class="checklist-checkbox"></div>
            <div class="checklist-content">
                <div class="checklist-text">${task.text}</div>
                ${task.details ? `<div class="checklist-details">${task.details}</div>` : ''}
                ${monday && task.monday ? `<div class="checklist-details" style="color: var(--color-warning);">⚠️ ${task.monday}</div>` : ''}
            </div>
        </div>
    `).join('')

    document.getElementById('dailyChecklist').innerHTML = html
    updateProgress()
}

// Render today's issues
function renderTodayIssues() {
    const today = getTodayKey()
    const todayIssues = state.issues.filter(issue => issue.timestamp.startsWith(today))

    if (todayIssues.length === 0) {
        document.getElementById('todayIssues').innerHTML = '<p style="color: var(--color-text-muted);">No issues logged today</p>'
        return
    }

    const html = todayIssues.map(issue => renderIssueCard(issue)).join('')
    document.getElementById('todayIssues').innerHTML = html
}

// Render reminders
function renderReminders() {
    const today = new Date()
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    const reminders = []

    // Check recurring tasks
    state.recurringTasks.forEach(task => {
        const dueDate = new Date(task.nextDue)
        if (dueDate <= sevenDaysFromNow) {
            const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
            reminders.push({
                type: 'task',
                text: task.name,
                daysUntil,
                overdue: daysUntil < 0
            })
        }
    })

    // Check tech visits
    state.techVisits.forEach(visit => {
        const visitDate = new Date(visit.dateTime)
        if (visitDate >= today && visitDate <= sevenDaysFromNow) {
            const daysUntil = Math.ceil((visitDate - today) / (1000 * 60 * 60 * 24))
            reminders.push({
                type: 'visit',
                text: `${visit.company} - ${visit.machine}`,
                daysUntil,
                overdue: false
            })
        }
    })

    if (reminders.length === 0) return

    const html = `
        <div style="margin-top: var(--spacing-xl);">
            <h2 style="margin-bottom: var(--spacing-md);">Upcoming Reminders</h2>
            ${reminders.map(r => `
                <div class="issue-card ${r.overdue ? 'major' : 'moderate'}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${r.type === 'task' ? '⚙️ Task:' : '📆 Visit:'}</strong> ${r.text}
                        </div>
                        <div style="color: ${r.overdue ? 'var(--color-error)' : 'var(--color-warning)'}; font-weight: 600;">
                            ${r.overdue ? `${Math.abs(r.daysUntil)} days overdue` : `${r.daysUntil} days`}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `

    document.getElementById('remindersSection').innerHTML = html
}

// Populate form dropdowns
function populateFormDropdowns() {
    // Machine filter
    const machineFilter = document.getElementById('machineFilter')
    Object.keys(MACHINE_INKS).forEach(machine => {
        const option = document.createElement('option')
        option.value = machine
        option.textContent = machine
        machineFilter.appendChild(option)
    })
}

// Open issue modal
function openIssueModal() {
    const form = document.getElementById('issueForm')
    form.innerHTML = `
        <div class="form-group">
            <label class="form-label">Machine *</label>
            <select id="issueMachine" class="form-select" required onchange="window.maintenanceApp.updateIssueTypes()">
                <option value="">Select machine</option>
                ${Object.keys(MACHINE_INKS).map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
        </div>

        <div class="form-group">
            <label class="form-label">Category *</label>
            <select id="issueCategory" class="form-select" required onchange="window.maintenanceApp.updateIssueTypes()">
                <option value="">Select category</option>
                ${Object.keys(ISSUE_TYPES).map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
        </div>

        <div class="form-group">
            <label class="form-label">Issue Type *</label>
            <select id="issueType" class="form-select" required onchange="window.maintenanceApp.updateColorOptions()">
                <option value="">Select issue type</option>
            </select>
        </div>

        <div class="form-group" id="colorOptionsGroup" style="display: none;">
            <label class="form-label">Affected Colors</label>
            <div id="colorOptions" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: var(--spacing-xs);"></div>
        </div>

        <div class="form-group">
            <label class="form-label">Severity *</label>
            <div style="display: flex; gap: var(--spacing-md);">
                <label><input type="radio" name="severity" value="minor" required> Minor</label>
                <label><input type="radio" name="severity" value="moderate" required> Moderate</label>
                <label><input type="radio" name="severity" value="major" required> Major</label>
                <label><input type="radio" name="severity" value="critical" required> Critical</label>
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">Time Spent (minutes)</label>
            <div style="display: flex; gap: var(--spacing-sm); align-items: center;">
                <input type="number" id="manualTime" class="form-input" value="0" min="0">
                <button type="button" class="btn btn-secondary" onclick="window.maintenanceApp.toggleTimer()">Start Timer</button>
                <span id="timerDisplay">00:00</span>
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">Actions Taken *</label>
            <textarea id="issueActions" class="form-input" rows="3" required></textarea>
        </div>

        <div class="form-group">
            <label class="form-label">Parts Used</label>
            <textarea id="issueParts" class="form-input" rows="2"></textarea>
        </div>

        <div class="form-group">
            <label class="form-label">Photos</label>
            <input type="file" id="photoUpload" accept="image/*" multiple onchange="window.maintenanceApp.handlePhotoUpload(event)">
            <div id="photoPreviewGrid" class="photo-preview-grid"></div>
        </div>

        <div class="form-group">
            <label class="form-label">Status *</label>
            <div style="display: flex; gap: var(--spacing-md);">
                <label><input type="radio" name="status" value="in-progress" required checked> In Progress</label>
                <label><input type="radio" name="status" value="resolved" required> Resolved</label>
            </div>
        </div>

        <button type="submit" class="btn btn-primary">Log Issue</button>
    `

    state.uploadedPhotos = []
    document.getElementById('issueModal').style.display = 'flex'
}

// Close issue modal
function closeIssueModal() {
    document.getElementById('issueModal').style.display = 'none'
    stopTimer()
}

// Update issue types based on category
function updateIssueTypes() {
    const category = document.getElementById('issueCategory').value
    const issueTypeSelect = document.getElementById('issueType')

    issueTypeSelect.innerHTML = '<option value="">Select issue type</option>'

    if (category && ISSUE_TYPES[category]) {
        ISSUE_TYPES[category].forEach(type => {
            const option = document.createElement('option')
            option.value = type.value
            option.textContent = type.label
            option.dataset.colors = type.colors
            issueTypeSelect.appendChild(option)
        })
    }

    updateColorOptions()
}

// Update color options based on machine and issue type
function updateColorOptions() {
    const machine = document.getElementById('issueMachine').value
    const issueTypeSelect = document.getElementById('issueType')
    const selectedOption = issueTypeSelect.options[issueTypeSelect.selectedIndex]
    const needsColors = selectedOption && selectedOption.dataset.colors === 'true'

    const colorGroup = document.getElementById('colorOptionsGroup')
    const colorOptions = document.getElementById('colorOptions')

    if (needsColors && machine && MACHINE_INKS[machine]) {
        colorGroup.style.display = 'block'
        colorOptions.innerHTML = MACHINE_INKS[machine].map(color => `
            <label style="display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs);">
                <input type="checkbox" name="affectedColors" value="${color}">
                ${color}
            </label>
        `).join('')
    } else {
        colorGroup.style.display = 'none'
        colorOptions.innerHTML = ''
    }
}

// Handle photo upload
function handlePhotoUpload(event) {
    const files = Array.from(event.target.files)

    files.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
            state.uploadedPhotos.push(e.target.result)
            renderPhotoPreview()
        }
        reader.readAsDataURL(file)
    })

    event.target.value = ''
}

// Render photo preview
function renderPhotoPreview() {
    const grid = document.getElementById('photoPreviewGrid')
    grid.innerHTML = state.uploadedPhotos.map((photo, index) => `
        <div class="photo-preview">
            <img src="${photo}" alt="Photo ${index + 1}">
            <button class="photo-remove" onclick="window.maintenanceApp.removePhoto(${index})">×</button>
        </div>
    `).join('')
}

// Remove photo
function removePhoto(index) {
    state.uploadedPhotos.splice(index, 1)
    renderPhotoPreview()
}

// Toggle timer
function toggleTimer() {
    if (timerInterval) {
        stopTimer()
    } else {
        startTimer()
    }
}

// Start timer
function startTimer() {
    elapsedSeconds = 0
    timerInterval = setInterval(() => {
        elapsedSeconds++
        const minutes = Math.floor(elapsedSeconds / 60)
        const seconds = elapsedSeconds % 60
        document.getElementById('timerDisplay').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        document.getElementById('manualTime').value = minutes
    }, 1000)

    document.querySelector('[onclick="window.maintenanceApp.toggleTimer()"]').textContent = 'Stop Timer'
}

// Stop timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
    }
    document.getElementById('timerDisplay').textContent = '00:00'
    const btn = document.querySelector('[onclick="window.maintenanceApp.toggleTimer()"]')
    if (btn) btn.textContent = 'Start Timer'
}

// Submit issue
function submitIssue(event) {
    event.preventDefault()

    const form = event.target
    const affectedColors = Array.from(form.querySelectorAll('[name="affectedColors"]:checked')).map(cb => cb.value)

    const issue = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        machine: form.querySelector('#issueMachine').value,
        category: form.querySelector('#issueCategory').value,
        issueType: form.querySelector('#issueType').value,
        affectedColors,
        severity: form.querySelector('[name="severity"]:checked').value,
        timeSpent: parseInt(form.querySelector('#manualTime').value) || 0,
        actions: form.querySelector('#issueActions').value,
        parts: form.querySelector('#issueParts').value,
        photos: [...state.uploadedPhotos],
        status: form.querySelector('[name="status"]:checked').value,
        resolvedAt: form.querySelector('[name="status"]:checked').value === 'resolved' ? new Date().toISOString() : null
    }

    state.issues.unshift(issue)
    saveData()
    closeIssueModal()
    render()

    alert('✓ Issue logged successfully')
}

// Render issue card
function renderIssueCard(issue) {
    const date = formatDateTime(new Date(issue.timestamp), 'en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })

    const issueTypeLabel = Object.values(ISSUE_TYPES).flat().find(t => t.value === issue.issueType)?.label || issue.issueType

    return `
        <div class="issue-card ${issue.severity}">
            <div class="issue-header">
                <div>
                    <div class="issue-title">${issue.machine} - ${issue.category}</div>
                    <div class="issue-meta">${date}</div>
                </div>
                <div class="issue-badges">
                    <span class="severity-badge ${issue.severity}">${issue.severity}</span>
                    <span class="status-badge ${issue.status}">${issue.status.replace('-', ' ')}</span>
                </div>
            </div>
            <div class="issue-details">
                <div class="issue-section">
                    <div class="issue-label">Issue Type:</div>
                    <div>${issueTypeLabel}</div>
                </div>
                ${issue.affectedColors.length > 0 ? `
                    <div class="issue-section">
                        <div class="issue-label">Affected Colors:</div>
                        <div>${issue.affectedColors.join(', ')}</div>
                    </div>
                ` : ''}
                <div class="issue-section">
                    <div class="issue-label">Time Spent:</div>
                    <div>${issue.timeSpent} minutes</div>
                </div>
                <div class="issue-section">
                    <div class="issue-label">Actions Taken:</div>
                    <div>${issue.actions}</div>
                </div>
                ${issue.parts ? `
                    <div class="issue-section">
                        <div class="issue-label">Parts Used:</div>
                        <div>${issue.parts}</div>
                    </div>
                ` : ''}
                ${issue.photos.length > 0 ? `
                    <div class="issue-section">
                        <div class="issue-label">Photos:</div>
                        <div class="issue-photos">
                            ${issue.photos.map(photo => `<img src="${photo}" class="issue-photo" onclick="window.open('${photo}')">`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `
}

// Filter issues
function filterIssues() {
    renderIssues()
}

// Get filtered issues
function getFilteredIssues() {
    const machineFilter = document.getElementById('machineFilter').value
    const statusFilter = document.getElementById('statusFilter').value

    return state.issues.filter(issue => {
        if (machineFilter !== 'all' && issue.machine !== machineFilter) return false
        if (statusFilter !== 'all' && issue.status !== statusFilter) return false
        return true
    })
}

// Render issues
function renderIssues() {
    const filtered = getFilteredIssues()

    if (filtered.length === 0) {
        document.getElementById('issuesList').innerHTML = '<p style="color: var(--color-text-muted);">No issues found</p>'
        return
    }

    const html = filtered.map(issue => renderIssueCard(issue)).join('')
    document.getElementById('issuesList').innerHTML = html
}

// Render weekly maintenance
function renderWeeklyMaintenance() {
    const html = WEEKLY_MAINTENANCE.map(task => `
        <div class="maintenance-procedure">
            <h3 style="margin-bottom: var(--spacing-md);">${task.name}</h3>
            ${task.steps.map((step, index) => `
                <div class="procedure-step">
                    <strong>${index + 1}.</strong> ${step}
                </div>
            `).join('')}
            <button class="btn btn-primary" style="margin-top: var(--spacing-md);" onclick="window.maintenanceApp.markMaintenanceComplete('${task.id}')">
                Mark Complete
            </button>
        </div>
    `).join('')

    document.getElementById('weeklyMaintenance').innerHTML = html
}

// Mark maintenance complete
function markMaintenanceComplete(taskId) {
    const timestamp = Date.now()
    if (!state.maintenanceHistory[taskId]) {
        state.maintenanceHistory[taskId] = []
    }
    state.maintenanceHistory[taskId].push(timestamp)
    saveData()
    alert('✓ Maintenance marked complete')
}

// Render recurring tasks
function renderRecurringTasks() {
    if (state.recurringTasks.length === 0) {
        document.getElementById('recurringTasks').innerHTML = '<p style="color: var(--color-text-muted);">No recurring tasks configured</p>'
        return
    }

    const today = new Date()
    const html = state.recurringTasks.map(task => {
        const dueDate = new Date(task.nextDue)
        const isOverdue = dueDate < today

        return `
            <div class="recurring-task ${isOverdue ? 'overdue' : ''}">
                <div>
                    <div style="font-weight: 600;">${task.name}</div>
                    <div style="font-size: var(--text-sm); color: var(--color-text-muted);">
                        ${task.machine} | ${task.frequency}
                    </div>
                    <div style="font-size: var(--text-sm); color: ${isOverdue ? 'var(--color-error)' : 'var(--color-text-secondary)'};">
                        Next due: ${formatDate(dueDate, 'en-AU', { year: 'numeric', month: 'short', day: 'numeric' })}
                        ${isOverdue ? ' (Overdue)' : ''}
                    </div>
                </div>
                <button class="btn btn-primary btn-small" onclick="window.maintenanceApp.completeRecurringTask(${task.id})">
                    Complete
                </button>
            </div>
        `
    }).join('')

    document.getElementById('recurringTasks').innerHTML = html
}

// Complete recurring task
function completeRecurringTask(taskId) {
    const task = state.recurringTasks.find(t => t.id === taskId)
    if (!task) return

    const today = new Date()
    task.lastCompleted = today.toISOString()

    // Calculate next due date based on frequency
    let nextDue = new Date(today)
    if (task.frequency === 'biannual') {
        nextDue.setMonth(nextDue.getMonth() + 6)
    }
    task.nextDue = nextDue.toISOString().split('T')[0]

    saveData()
    renderRecurringTasks()
    alert('✓ Task completed. Next due date updated.')
}

// Open visit modal
function openVisitModal() {
    const form = document.getElementById('visitForm')
    form.innerHTML = `
        <div class="form-group">
            <label class="form-label">Date & Time *</label>
            <input type="datetime-local" id="visitDateTime" class="form-input" required>
        </div>

        <div class="form-group">
            <label class="form-label">Company *</label>
            <input type="text" id="visitCompany" class="form-input" required>
        </div>

        <div class="form-group">
            <label class="form-label">Machine *</label>
            <select id="visitMachine" class="form-select" required>
                <option value="">Select machine</option>
                ${Object.keys(MACHINE_INKS).map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
        </div>

        <div class="form-group">
            <label class="form-label">Type *</label>
            <div style="display: flex; gap: var(--spacing-md);">
                <label><input type="radio" name="visitType" value="scheduled" required> Scheduled Maintenance</label>
                <label><input type="radio" name="visitType" value="repair" required> Repair</label>
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea id="visitNotes" class="form-input" rows="3"></textarea>
        </div>

        <button type="submit" class="btn btn-primary">Schedule Visit</button>
    `

    document.getElementById('visitModal').style.display = 'flex'
}

// Close visit modal
function closeVisitModal() {
    document.getElementById('visitModal').style.display = 'none'
}

// Submit visit
function submitVisit(event) {
    event.preventDefault()

    const form = event.target

    const visit = {
        id: Date.now(),
        dateTime: form.querySelector('#visitDateTime').value,
        company: form.querySelector('#visitCompany').value,
        machine: form.querySelector('#visitMachine').value,
        type: form.querySelector('[name="visitType"]:checked').value,
        notes: form.querySelector('#visitNotes').value
    }

    state.techVisits.push(visit)
    saveData()
    closeVisitModal()
    renderTechVisits()

    alert('✓ Visit scheduled successfully')
}

// Render tech visits
function renderTechVisits() {
    if (state.techVisits.length === 0) {
        document.getElementById('techVisitsList').innerHTML = '<p style="color: var(--color-text-muted);">No technician visits scheduled</p>'
        return
    }

    // Sort by date
    const sorted = [...state.techVisits].sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))

    const html = sorted.map(visit => {
        const visitDate = new Date(visit.dateTime)
        const formatted = formatDateTime(visitDate, 'en-AU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })

        return `
            <div class="visit-card">
                <div class="visit-header">
                    <h3>${visit.company}</h3>
                    <span class="badge">${visit.type === 'scheduled' ? '📅 Scheduled' : '🔧 Repair'}</span>
                </div>
                <div style="color: var(--color-text-muted); margin-bottom: var(--spacing-sm);">${formatted}</div>
                <div><strong>Machine:</strong> ${visit.machine}</div>
                ${visit.notes ? `<div style="margin-top: var(--spacing-sm);"><strong>Notes:</strong> ${visit.notes}</div>` : ''}
            </div>
        `
    }).join('')

    document.getElementById('techVisitsList').innerHTML = html
}

// Set analytics period
function setAnalyticsPeriod(period) {
    state.analyticsPeriod = period

    // Update button styles
    document.querySelectorAll('.analytics-controls .btn').forEach(btn => {
        btn.classList.remove('active')
    })
    event.target.classList.add('active')

    renderAnalytics()
}

// Get analytics issues based on period
function getAnalyticsIssues() {
    const now = new Date()
    let cutoff = new Date(0)

    if (state.analyticsPeriod === 'week') {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (state.analyticsPeriod === 'month') {
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    return state.issues.filter(issue => new Date(issue.timestamp) >= cutoff)
}

// Render analytics
function renderAnalytics() {
    const issues = getAnalyticsIssues()

    if (issues.length === 0) {
        document.getElementById('analyticsContent').innerHTML = '<p style="color: var(--color-text-muted);">No data available for this period</p>'
        return
    }

    const totalIssues = issues.length
    const resolvedIssues = issues.filter(i => i.status === 'resolved').length
    const totalTime = issues.reduce((sum, i) => sum + i.timeSpent, 0)
    const avgTime = totalIssues > 0 ? Math.round(totalTime / totalIssues) : 0

    // Most common issues
    const issueCount = {}
    issues.forEach(issue => {
        const key = `${issue.machine} - ${issue.issueType}`
        issueCount[key] = (issueCount[key] || 0) + 1
    })
    const topIssues = Object.entries(issueCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)

    // Issues by machine
    const machineCount = {}
    issues.forEach(issue => {
        machineCount[issue.machine] = (machineCount[issue.machine] || 0) + 1
    })

    // Color issues
    const colorCount = {}
    issues.forEach(issue => {
        issue.affectedColors.forEach(color => {
            colorCount[color] = (colorCount[color] || 0) + 1
        })
    })
    const topColors = Object.entries(colorCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)

    const html = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${totalIssues}</div>
                <div class="stat-label">Total Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${resolvedIssues}</div>
                <div class="stat-label">Resolved</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${avgTime}m</div>
                <div class="stat-label">Avg Resolution Time</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Math.round(totalTime / 60)}h</div>
                <div class="stat-label">Total Downtime</div>
            </div>
        </div>

        <div class="chart-section">
            <h3 class="chart-title">Most Common Issues</h3>
            ${topIssues.map(([issue, count]) => `
                <div class="chart-item">
                    <span>${issue}</span>
                    <span>${count} issues</span>
                </div>
            `).join('')}
        </div>

        <div class="chart-section">
            <h3 class="chart-title">Issues by Machine</h3>
            ${Object.entries(machineCount).map(([machine, count]) => `
                <div class="chart-item">
                    <span>${machine}</span>
                    <span>${count} issues (${Math.round(count / totalIssues * 100)}%)</span>
                </div>
            `).join('')}
        </div>

        ${topColors.length > 0 ? `
            <div class="chart-section">
                <h3 class="chart-title">Most Problematic Colors</h3>
                ${topColors.map(([color, count]) => `
                    <div class="chart-item">
                        <span>${color}</span>
                        <span>${count} issues</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `

    document.getElementById('analyticsContent').innerHTML = html
}

// Render
function render() {
    renderDailyChecklist()
    renderTodayIssues()
    renderReminders()
}

// Initialize app
function initApp() {
    init()

    // Expose API
    window.maintenanceApp = {
        switchTab,
        toggleTask,
        resetChecklist,
        openIssueModal,
        closeIssueModal,
        updateIssueTypes,
        updateColorOptions,
        handlePhotoUpload,
        removePhoto,
        toggleTimer,
        submitIssue,
        filterIssues,
        markMaintenanceComplete,
        completeRecurringTask,
        openVisitModal,
        closeVisitModal,
        submitVisit,
        setAnalyticsPeriod
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp)
} else {
    initApp()
}
