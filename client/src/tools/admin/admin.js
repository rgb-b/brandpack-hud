/**
 * Admin Panel
 * User management interface for administrators
 */

import '../../shared/components/AppHeader.js'
import '../../shared/components/AppFooter.js'
import { requireAuth, isAdmin } from '../../shared/utils/auth.js'
import { users as usersAPI } from '../../api/client.js'
import { formatDate } from '../../shared/utils/datetime.js'
import '../../shared/utils/cyberpunk-effects.js'

// State
let currentUser = null
let allUsers = []

// Initialize
async function init() {
    // Check authentication and admin privileges
    currentUser = await requireAuth(true) // true = require admin
    if (!currentUser) return

    // Double-check admin status
    if (!isAdmin(currentUser)) {
        alert('Access denied. Administrator privileges required.')
        window.location.href = '../launcher/index.html'
        return
    }

    // Load users and setup event listeners
    await loadUsers()
    setupEventListeners()
}

// Load all users from API
async function loadUsers() {
    try {
        const response = await usersAPI.getAll()
        allUsers = response.data || response // Handle both { data: [] } and direct array
        renderUsersTable()
        updateStats()
    } catch (error) {
        console.error('Failed to load users:', error)

        // Clear loading state and show error
        const tbody = document.getElementById('usersTableBody')
        tbody.innerHTML = '<tr><td colspan="4" class="error-cell" style="color: var(--color-error); text-align: center; padding: 2rem;">Failed to load users. Please refresh the page.</td></tr>'

        showError(`Failed to load users: ${error.message || 'Unknown error'}`)
    }
}

// Render users table
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody')

    if (allUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No users found</td></tr>'
        return
    }

    tbody.innerHTML = allUsers.map(user => {
        const isCurrentUser = user.id === currentUser.id
        const canDelete = !isCurrentUser && user.username !== 'System'

        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <svg class="user-avatar" viewBox="0 0 24 24" width="32" height="32">
                            <circle cx="12" cy="12" r="10" fill="var(--color-primary-light)" opacity="0.2"/>
                            <path fill="var(--color-primary-light)" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                        <span>${escapeHtml(user.username)}</span>
                        ${isCurrentUser ? '<span class="badge badge-info">You</span>' : ''}
                    </div>
                </td>
                <td>
                    ${user.role === 'admin'
                        ? '<span class="badge badge-warning">Administrator</span>'
                        : '<span class="badge">User</span>'}
                </td>
                <td>${user.created_at ? formatDate(user.created_at) : 'N/A'}</td>
                <td>
                    ${canDelete
                        ? `<button class="btn-icon btn-danger" onclick="window.adminApp.deleteUser(${user.id}, '${escapeHtml(user.username)}')" title="Delete user">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                           </button>`
                        : '<span class="text-muted">—</span>'}
                </td>
            </tr>
        `
    }).join('')
}

// Update statistics
function updateStats() {
    const totalCount = allUsers.length
    const adminCount = allUsers.filter(u => u.role === 'admin').length
    const userCount = totalCount - adminCount

    document.getElementById('totalUsers').textContent = totalCount
    document.getElementById('regularUsers').textContent = userCount
    document.getElementById('adminUsers').textContent = adminCount
}

// Setup event listeners
function setupEventListeners() {
    // Create user button
    document.getElementById('createUserBtn').addEventListener('click', openCreateModal)

    // Modal controls
    document.getElementById('closeModalBtn').addEventListener('click', closeCreateModal)
    document.getElementById('cancelBtn').addEventListener('click', closeCreateModal)

    // Form submission
    document.getElementById('createUserForm').addEventListener('submit', handleCreateUser)

    // Click outside modal to close
    document.getElementById('createUserModal').addEventListener('click', (e) => {
        if (e.target.id === 'createUserModal') {
            closeCreateModal()
        }
    })
}

// Open create user modal
function openCreateModal() {
    document.getElementById('createUserModal').style.display = 'flex'
    document.getElementById('username').focus()
}

// Close create user modal
function closeCreateModal() {
    document.getElementById('createUserModal').style.display = 'none'
    document.getElementById('createUserForm').reset()
    document.getElementById('formError').style.display = 'none'
}

// Handle create user form submission
async function handleCreateUser(e) {
    e.preventDefault()

    const formData = new FormData(e.target)
    const username = formData.get('username').trim()
    const pin = formData.get('pin')
    const confirmPin = formData.get('confirmPin')
    const role = formData.get('isAdmin') ? 'admin' : 'user'

    // Validate
    if (!username || username.length < 3) {
        showFormError('Username must be at least 3 characters')
        return
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
        showFormError('PIN must be exactly 4 digits')
        return
    }

    if (pin !== confirmPin) {
        showFormError('PINs do not match')
        return
    }

    // Validate PIN strength (match server-side rules)
    const pinError = validatePINStrength(pin)
    if (pinError) {
        showFormError(pinError)
        return
    }

    // Check if username already exists
    if (allUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        showFormError('Username already exists')
        return
    }

    // Create user
    try {
        await usersAPI.createUser({ username, pin, role })
        closeCreateModal()
        await loadUsers()
        showSuccess(`User "${username}" created successfully`)
    } catch (error) {
        console.error('Failed to create user:', error)
        showFormError(error.message || 'Failed to create user')
    }
}

// Delete user
async function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"?\n\nThis action cannot be undone.`)) {
        return
    }

    try {
        await usersAPI.deleteUser(userId)
        await loadUsers()
        showSuccess(`User "${username}" deleted successfully`)
    } catch (error) {
        console.error('Failed to delete user:', error)
        showError(error.message || 'Failed to delete user')
    }
}

// Show form error
function showFormError(message) {
    const errorEl = document.getElementById('formError')
    errorEl.textContent = message
    errorEl.style.display = 'block'
}

// Show success message
function showSuccess(message) {
    // You could implement a toast notification here
    alert(message)
}

// Show error message
function showError(message) {
    alert(message)
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

// Validate PIN strength (matches server-side validation)
function validatePINStrength(pin) {
    // Prohibit all same digits (0000, 1111, 2222, etc.)
    if (/^(\d)\1{3}$/.test(pin)) {
        return 'PIN cannot be all the same digit (e.g., 1111, 0000)'
    }

    // Prohibit sequential patterns (ascending and descending)
    const sequential = [
        '0123', '1234', '2345', '3456', '4567', '5678', '6789', // ascending
        '9876', '8765', '7654', '6543', '5432', '4321', '3210'  // descending
    ]
    if (sequential.includes(pin)) {
        return 'PIN cannot be sequential (e.g., 1234, 4321)'
    }

    return null // Valid PIN
}

// Export functions to window for inline event handlers
window.adminApp = {
    deleteUser
}

// Start the app
init()
