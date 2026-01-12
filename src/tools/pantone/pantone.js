import { storage } from '../../shared/utils/storage.js'
import { STORAGE_KEYS } from '../../shared/constants.js'
import { formatDate, isOlderThanYears } from '../../shared/utils/datetime.js'

// State
let pantoneData = []
let currentFilter = 'all'

// Initialize
function init() {
    loadFromStorage()
    setupDragDrop()
}

// Load data from localStorage
function loadFromStorage() {
    const saved = storage.get(STORAGE_KEYS.PANTONE_COLORS)
    if (saved && Array.isArray(saved)) {
        pantoneData = saved
        showApp()
    }
}

// Save data to localStorage
function saveToStorage() {
    storage.set(STORAGE_KEYS.PANTONE_COLORS, pantoneData)
}

// Setup drag and drop
function setupDragDrop() {
    const dropZone = document.getElementById('fileUpload')

    const preventDefaults = (e) => {
        e.preventDefault()
        e.stopPropagation()
    }

    ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false)
    })

    ;['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover')
        }, false)
    })

    ;['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover')
        }, false)
    })

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files
        if (files.length > 0) {
            handleFile(files[0])
        }
    }, false)
}

// Load data file
function loadDataFile(event) {
    const file = event.target.files[0]
    if (file) {
        handleFile(file)
    }
}

// Handle file upload
function handleFile(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result)
            if (!Array.isArray(data)) {
                throw new Error('Invalid data format')
            }
            pantoneData = data
            saveToStorage()
            showApp()
        } catch (error) {
            alert('Error loading file. Please make sure it\'s a valid JSON file.')
            console.error(error)
        }
    }
    reader.readAsText(file)
}

// Show app section
function showApp() {
    document.getElementById('setupSection').style.display = 'none'
    document.getElementById('appSection').classList.add('active')
    updateStats()
    searchColors()
}

// Get color status
function getColorStatus(color) {
    if (!color.date || color.date === '*' || color.date === 'CBW') {
        return 'not-matched'
    }

    try {
        const matchDate = new Date(color.date)
        if (isOlderThanYears(matchDate, 5)) {
            return 'old-match'
        }
        return 'matched'
    } catch (error) {
        return 'not-matched'
    }
}

// Update statistics
function updateStats() {
    const stats = {
        total: pantoneData.length,
        matched: 0,
        notMatched: 0,
        old: 0
    }

    pantoneData.forEach(color => {
        const status = getColorStatus(color)
        if (status === 'matched') stats.matched++
        else if (status === 'not-matched') stats.notMatched++
        else if (status === 'old-match') stats.old++
    })

    document.getElementById('statsSection').innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total Colors</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.matched}</div>
            <div class="stat-label">✅ Matched</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.notMatched}</div>
            <div class="stat-label">❌ Not Matched</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.old}</div>
            <div class="stat-label">⚠️ Old (5+ years)</div>
        </div>
    `
}

// Show single search
function showSingleSearch() {
    document.getElementById('singleSearchCard').classList.remove('hidden')
    document.getElementById('multiCheckCard').classList.add('hidden')
}

// Show multi check
function showMultiCheck() {
    document.getElementById('singleSearchCard').classList.add('hidden')
    document.getElementById('multiCheckCard').classList.remove('hidden')
}

// Search colors
function searchColors() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim()

    let filtered = pantoneData

    // Filter by search query
    if (query) {
        filtered = filtered.filter(color =>
            color.name.toLowerCase().includes(query)
        )
    }

    // Filter by status
    if (currentFilter !== 'all') {
        filtered = filtered.filter(color => getColorStatus(color) === currentFilter)
    }

    displayResults(filtered)
}

// Filter results
function filterResults(filter, event) {
    currentFilter = filter

    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active')
    })
    if (event && event.target) {
        event.target.classList.add('active')
    }

    searchColors()
}

// Display results
function displayResults(colors) {
    const container = document.getElementById('searchResults')

    if (colors.length === 0) {
        container.innerHTML = '<p style="color: var(--color-text-muted); text-align: center; padding: 2rem;">No colors found</p>'
        return
    }

    container.innerHTML = colors.map((color, index) => {
        // Find the original index in pantoneData
        const originalIndex = pantoneData.indexOf(color)
        const status = getColorStatus(color)
        const statusText = {
            'matched': '✅ Matched',
            'not-matched': '❌ Not Matched',
            'old-match': '⚠️ Old Match'
        }

        let dateDisplay = ''
        if (color.date && color.date !== '*' && color.date !== 'CBW') {
            try {
                dateDisplay = formatDate(color.date, 'en-AU', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })
            } catch (error) {
                dateDisplay = color.date
            }
        }

        return `
            <div class="color-item ${status}">
                <div class="color-info">
                    <div class="color-name">${color.name}</div>
                    <div class="color-meta">
                        Sheet: ${color.sheet}
                        ${dateDisplay ? ` | Last matched: ${dateDisplay}` : ''}
                    </div>
                    ${status === 'old-match' ? `
                        <div class="warning-box">
                            ⚠️ This match is over 5 years old and may need re-matching
                        </div>
                    ` : ''}
                </div>
                <div class="color-status">
                    <span class="status-badge ${status}">${statusText[status]}</span>
                    <button class="btn btn-secondary btn-small" onclick="window.pantoneApp.markAsMatched(${originalIndex})">
                        ${status === 'not-matched' ? 'Mark Matched' : 'Update Date'}
                    </button>
                </div>
            </div>
        `
    }).join('')
}

// Mark color as matched
function markAsMatched(index) {
    const today = new Date().toISOString().split('T')[0]
    pantoneData[index].date = today
    saveToStorage()
    updateStats()
    searchColors()
}

// Check multiple colors
function checkMultiple() {
    const input = document.getElementById('multiInput').value
    const colorNames = input.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

    if (colorNames.length === 0) {
        document.getElementById('multiResults').innerHTML = ''
        return
    }

    const results = colorNames.map(searchName => {
        // Normalize search - add PANTONE prefix if not present, ensure " C" suffix
        let normalizedSearch = searchName.toUpperCase()
        if (!normalizedSearch.startsWith('PANTONE')) {
            normalizedSearch = 'PANTONE ' + normalizedSearch
        }
        if (!normalizedSearch.endsWith(' C')) {
            normalizedSearch += ' C'
        }

        const found = pantoneData.find(color =>
            color.name.toUpperCase() === normalizedSearch ||
            color.name.toUpperCase().includes(searchName.toUpperCase())
        )

        return {
            searched: searchName,
            found: found,
            status: found ? getColorStatus(found) : 'not-found'
        }
    })

    const container = document.getElementById('multiResults')
    const summary = {
        total: results.length,
        matched: results.filter(r => r.status === 'matched').length,
        notMatched: results.filter(r => r.status === 'not-matched').length,
        old: results.filter(r => r.status === 'old-match').length,
        notFound: results.filter(r => r.status === 'not-found').length
    }

    container.innerHTML = `
        <div class="multi-summary">
            <h3>Summary</h3>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-value">${summary.total}</div>
                    <div class="summary-label">Checked</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" style="color: var(--color-success);">${summary.matched}</div>
                    <div class="summary-label">Matched</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" style="color: var(--color-error);">${summary.notMatched}</div>
                    <div class="summary-label">Not Matched</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" style="color: var(--color-warning);">${summary.old}</div>
                    <div class="summary-label">Old</div>
                </div>
                ${summary.notFound > 0 ? `
                    <div class="summary-item">
                        <div class="summary-value" style="color: var(--color-error);">${summary.notFound}</div>
                        <div class="summary-label">Not Found</div>
                    </div>
                ` : ''}
            </div>
        </div>

        <div class="color-list">
            ${results.map(result => {
                if (!result.found) {
                    return `
                        <div class="color-item not-matched">
                            <div class="color-info">
                                <div class="color-name">${result.searched}</div>
                                <div class="warning-box error">
                                    ❌ Color not found in database
                                </div>
                            </div>
                        </div>
                    `
                }

                const status = result.status
                const statusText = {
                    'matched': '✅ Matched',
                    'not-matched': '❌ Not Matched',
                    'old-match': '⚠️ Old Match'
                }

                let dateDisplay = ''
                if (result.found.date && result.found.date !== '*' && result.found.date !== 'CBW') {
                    try {
                        dateDisplay = formatDate(result.found.date, 'en-AU', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })
                    } catch (error) {
                        dateDisplay = result.found.date
                    }
                }

                return `
                    <div class="color-item ${status}">
                        <div class="color-info">
                            <div class="color-name">${result.found.name}</div>
                            <div class="color-meta">
                                ${dateDisplay ? `Last matched: ${dateDisplay}` : 'Never matched'}
                            </div>
                            ${status === 'old-match' ? `
                                <div class="warning-box">
                                    ⚠️ Match is over 5 years old - consider re-matching
                                </div>
                            ` : ''}
                            ${status === 'not-matched' ? `
                                <div class="warning-box error">
                                    ❌ Not matched - needs color matching before printing
                                </div>
                            ` : ''}
                        </div>
                        <div class="color-status">
                            <span class="status-badge ${status}">${statusText[status]}</span>
                        </div>
                    </div>
                `
            }).join('')}
        </div>
    `
}

// Export data
function exportData() {
    const dataStr = JSON.stringify(pantoneData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    const today = new Date().toISOString().split('T')[0]
    link.href = url
    link.download = `pantone_data_updated_${today}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    alert('✓ Data exported! You can now update your Excel file with the new dates.')
}

// Clear data
function clearData() {
    if (confirm('Clear all data and reload? You\'ll need to re-upload the JSON file.')) {
        storage.remove(STORAGE_KEYS.PANTONE_COLORS)
        location.reload()
    }
}

// Initialize and expose API
function initApp() {
    init()

    // Expose API for event handlers
    window.pantoneApp = {
        loadDataFile,
        showSingleSearch,
        showMultiCheck,
        searchColors,
        filterResults,
        markAsMatched,
        checkMultiple,
        exportData,
        clearData
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp)
} else {
    initApp()
}
