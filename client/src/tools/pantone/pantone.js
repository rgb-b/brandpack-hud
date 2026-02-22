import { storage } from '../../shared/utils/storage.js'
import { STORAGE_KEYS } from '../../shared/constants.js'
import { formatDate, isOlderThanYears } from '../../shared/utils/datetime.js'
import { requireAuth } from '../../shared/utils/auth.js'
import '../../shared/components/AppHeader.js'
import { AppFooter } from '../../shared/components/AppFooter.js'
import { pantone, dashboard } from '../../api/client.js'
import '../../shared/utils/cyberpunk-effects.js'

// State
let pantoneData = []
let currentFilter = 'all'
let allCollections = []
let currentPage = 1
let totalPages = 1
let totalColors = 0
let isLoading = false
let currentSearchQuery = ''
let currentCollectionFilter = ''
let currentColorSpaceFilters = { hasRGB: false, hasCMYK: false, hasLAB: false }

// Initialize
async function init() {
    try {
        // Check authentication first
        const user = await requireAuth()
        if (!user) return // requireAuth redirects to login if not authenticated

        // Show app section
        const appSection = document.getElementById('appSection')
        if (appSection) {
            appSection.classList.add('active')
        } else {
            console.error('appSection element not found')
            return
        }

        // Load data from API
        await loadFromAPI()
        await loadCollections()
    } catch (error) {
        console.error('Error initializing pantone app:', error)
        alert('Failed to load Pantone tool. Please refresh the page.')
    }
}

// Load data from API (paginated)
async function loadFromAPI(page = 1, filters = {}) {
    if (isLoading) return

    try {
        isLoading = true
        showLoadingState()

        // Check if we need enhanced search (any advanced filters active)
        const useEnhancedSearch = currentSearchQuery || currentCollectionFilter ||
            currentColorSpaceFilters.hasRGB || currentColorSpaceFilters.hasCMYK ||
            currentColorSpaceFilters.hasLAB

        let response

        if (useEnhancedSearch) {
            // Use enhanced search endpoint
            const options = {
                query: currentSearchQuery || undefined,
                collection: currentCollectionFilter || undefined,
                hasRGB: currentColorSpaceFilters.hasRGB || undefined,
                hasCMYK: currentColorSpaceFilters.hasCMYK || undefined,
                hasLAB: currentColorSpaceFilters.hasLAB || undefined,
                page: page,
                limit: 50,
                ...filters
            }

            // Add status filter if set
            if (currentFilter !== 'all') {
                if (currentFilter === 'not-matched') {
                    options.status = 'not_matched'
                } else if (currentFilter === 'old-match') {
                    options.status = 'old'
                } else {
                    options.status = currentFilter // 'matched'
                }
            }

            response = await pantone.searchEnhanced(options)
        } else {
            // Use simple getAll endpoint
            const params = {
                page: page,
                limit: 50,
                ...filters
            }

            // Add status filter if set
            if (currentFilter !== 'all') {
                if (currentFilter === 'not-matched') {
                    params.status = 'not_matched'
                } else if (currentFilter === 'old-match') {
                    params.status = 'old'
                } else {
                    params.status = currentFilter // 'matched'
                }
            }

            response = await pantone.getAll(params)
        }

        // API response format: { success: true, data: [...colors...], pagination: {...} }
        pantoneData = response.data || []
        currentPage = response.pagination?.page || response.page || page
        totalPages = response.pagination?.totalPages || response.totalPages || 1
        totalColors = response.pagination?.total || response.total || pantoneData.length

        await updateStats()
        displayResults(pantoneData) // Display all results from backend (already filtered)
        updatePagination()
        hideLoadingState()
    } catch (error) {
        console.error('Error loading pantone data:', error)
        alert('Error loading Pantone colors. Please try again.')
        hideLoadingState()
    } finally {
        isLoading = false
    }
}

// Show loading state
function showLoadingState() {
    const resultsDiv = document.getElementById('searchResults')
    if (resultsDiv) {
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">Loading colors...</div>'
    }
}

// Hide loading state
function hideLoadingState() {
    // Results will be populated by searchColors()
}

// Update pagination controls
function updatePagination() {
    const paginationDiv = document.getElementById('paginationControls')
    if (!paginationDiv) return

    if (totalPages <= 1) {
        paginationDiv.style.display = 'none'
        return
    }

    paginationDiv.style.display = 'flex'

    const prevBtn = paginationDiv.querySelector('.prev-page')
    const nextBtn = paginationDiv.querySelector('.next-page')
    const pageInfo = paginationDiv.querySelector('.page-info')

    if (prevBtn) prevBtn.disabled = currentPage === 1
    if (nextBtn) nextBtn.disabled = currentPage === totalPages
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`
}

// Go to previous page
function prevPage() {
    if (currentPage > 1) {
        loadFromAPI(currentPage - 1)
    }
}

// Go to next page
function nextPage() {
    if (currentPage < totalPages) {
        loadFromAPI(currentPage + 1)
    }
}

// Load collections from API
async function loadCollections() {
    try {
        const response = await pantone.getCollections()
        allCollections = response.data || response || []

        // Populate collection dropdown
        const select = document.getElementById('collectionFilter')
        if (select) {
            // Keep "All Collections" option
            select.innerHTML = '<option value="">All Collections</option>'

            // Add each collection
            allCollections.forEach(collection => {
                const option = document.createElement('option')
                option.value = collection
                option.textContent = collection
                select.appendChild(option)
            })
        }
    } catch (error) {
        console.error('Error loading collections:', error)
        // Fail silently - filter will just show "All Collections" only
    }
}

// Get color status
function getColorStatus(color) {
    // Check status from database
    if (color.status === 'not_matched' || !color.match_date) {
        return 'not-matched'
    }

    if (color.status === 'old') {
        return 'old-match'
    }

    // Check if matched date is older than 5 years
    try {
        const matchDate = new Date(color.match_date)
        if (isOlderThanYears(matchDate, 5)) {
            return 'old-match'
        }
        return 'matched'
    } catch (error) {
        return 'not-matched'
    }
}

// Update statistics
async function updateStats() {
    try {
        const response = await pantone.getStats()
        const stats = response.data || response

        document.getElementById('statsSection').innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.total || 0}</div>
                <div class="stat-label">Total Colors</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.matched || 0}</div>
                <div class="stat-label">✅ Matched</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.not_matched || 0}</div>
                <div class="stat-label">❌ Not Matched</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.old || 0}</div>
                <div class="stat-label">⚠️ Old (5+ years)</div>
            </div>
        `
    } catch (error) {
        console.error('Error loading stats:', error)
    }
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
async function searchColors() {
    // Get current search/filter values from UI
    const query = document.getElementById('searchInput').value.trim()
    const collectionFilter = document.getElementById('collectionFilter')?.value || ''
    const hasRGB = document.getElementById('filterRGB')?.checked || false
    const hasCMYK = document.getElementById('filterCMYK')?.checked || false
    const hasLAB = document.getElementById('filterLAB')?.checked || false

    // Update state
    currentSearchQuery = query
    currentCollectionFilter = collectionFilter
    currentColorSpaceFilters = { hasRGB, hasCMYK, hasLAB }

    // Reload from API with search parameters (reset to page 1)
    await loadFromAPI(1)
}

// Filter results
async function filterResults(filter, event) {
    currentFilter = filter

    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active')
    })
    if (event && event.target) {
        event.target.classList.add('active')
    }

    // Reload from API with new filter (reset to page 1)
    await loadFromAPI(1)
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

        // Parse color data
        let colorData
        try {
            colorData = typeof color.color_data === 'string'
                ? JSON.parse(color.color_data)
                : color.color_data || {}
        } catch (e) {
            colorData = {}
        }

        let dateDisplay = ''
        if (color.match_date) {
            try {
                dateDisplay = formatDate(color.match_date, 'en-AU', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })
            } catch (error) {
                dateDisplay = color.match_date
            }
        }

        // Build color values display
        let colorValuesHtml = ''
        if (colorData.hex) {
            colorValuesHtml += `<div style="display: flex; gap: 8px; align-items: center;"><strong>HEX:</strong> ${colorData.hex} <span style="display: inline-block; width: 20px; height: 20px; background: ${colorData.hex}; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px;"></span></div>`
        }
        if (colorData.rgb) {
            colorValuesHtml += `<div><strong>RGB:</strong> ${colorData.rgb.r}, ${colorData.rgb.g}, ${colorData.rgb.b}</div>`
        }
        if (colorData.cmyk) {
            colorValuesHtml += `<div><strong>CMYK:</strong> ${colorData.cmyk.c}%, ${colorData.cmyk.m}%, ${colorData.cmyk.y}%, ${colorData.cmyk.k}%</div>`
        }
        if (colorData.lab) {
            colorValuesHtml += `<div><strong>LAB:</strong> L:${colorData.lab.l}, a:${colorData.lab.a}, b:${colorData.lab.b}</div>`
        }

        return `
            <div class="color-item ${status}">
                <div class="color-info">
                    <div class="color-name">${color.name}</div>
                    ${colorData.collection ? `<div style="color: var(--color-primary-light); font-size: var(--text-sm); margin-bottom: 4px;">📚 ${colorData.collection}</div>` : ''}
                    <div class="color-meta">
                        Sheet: ${colorData.sheet || 'Unknown'}
                        ${dateDisplay ? ` | Last matched: ${dateDisplay}` : ''}
                    </div>
                    ${colorValuesHtml ? `
                        <div style="margin-top: var(--spacing-sm); padding: var(--spacing-sm); background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); font-size: var(--text-sm);">
                            ${colorValuesHtml}
                        </div>
                    ` : ''}
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
async function markAsMatched(index) {
    const color = pantoneData[index]
    if (!color || !color.id) {
        console.error('Color not found or missing ID')
        return
    }

    const today = new Date().toISOString().split('T')[0]

    try {
        // Update via API
        await pantone.update(color.id, {
            status: 'matched',
            match_date: today
        })

        dashboard.createActivity({ type: 'pantone', description: `Matched Pantone: ${color.name}` }).catch(() => {})
        // Reload current page to show updated data
        await loadFromAPI(currentPage)
        alert('Color marked as matched!')
    } catch (error) {
        console.error('Error updating color:', error)
        alert('Failed to update color. Please try again.')
    }
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
async function exportData() {
    try {
        if (!confirm('Export all Pantone colors? This may take a moment for large datasets.')) {
            return
        }

        // Fetch all colors (no pagination limit)
        const response = await pantone.getAll({ limit: 10000 })
        const allColors = response.data || []

        const dataStr = JSON.stringify(allColors, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        const today = new Date().toISOString().split('T')[0]
        link.href = url
        link.download = `pantone_data_export_${today}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        alert(`✓ Exported ${allColors.length} colors!`)
    } catch (error) {
        console.error('Error exporting data:', error)
        alert('Failed to export data. Please try again.')
    }
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
        showSingleSearch,
        showMultiCheck,
        searchColors,
        filterResults,
        markAsMatched,
        checkMultiple,
        exportData,
        prevPage,
        nextPage
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp)
} else {
    initApp()
}
