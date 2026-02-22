/**
 * Enhanced Toast Notification System
 * Provides rich toast notifications with cyberpunk styling, icons, actions, and undo capability
 */

class ToastManager {
  constructor() {
    this.toasts = new Map();
    this.container = null;
    this.nextId = 1;
    this.init();
  }

  init() {
    // Create toast container
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  /**
   * Show a toast notification
   * @param {string} message - Toast message
   * @param {object} options - Toast options
   * @returns {string} Toast ID
   */
  show(message, options = {}) {
    const {
      type = 'info', // 'success', 'error', 'warning', 'info', 'loading', 'progress'
      duration = 5000, // Auto-dismiss duration (0 = no auto-dismiss)
      action = null, // { label: string, handler: function }
      icon = null, // Custom icon
      id = null, // Custom ID (for updating existing toast)
      progress = 0, // Progress percentage (0-100) for progress type
      dismissible = true // Show close button
    } = options;

    const toastId = id || `toast-${this.nextId++}`;

    // If toast exists, update it
    if (this.toasts.has(toastId)) {
      return this.update(toastId, { type, message, progress });
    }

    // Create toast element
    const toast = this.createToastElement(toastId, message, { type, action, icon, progress, dismissible });

    // Add to container
    this.container.appendChild(toast);
    this.toasts.set(toastId, { element: toast, timer: null, pauseTimer: null });

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-show');
    });

    // Auto-dismiss
    if (duration > 0 && type !== 'loading') {
      this.setAutoDismiss(toastId, duration);
    }

    return toastId;
  }

  /**
   * Update an existing toast
   */
  update(toastId, updates = {}) {
    const toastData = this.toasts.get(toastId);
    if (!toastData) return;

    const { element } = toastData;
    const { type, message, progress } = updates;

    // Update type/class
    if (type) {
      element.className = `toast toast-${type} toast-show`;
    }

    // Update message
    if (message) {
      const messageEl = element.querySelector('.toast-message');
      if (messageEl) messageEl.textContent = message;
    }

    // Update progress bar
    if (typeof progress === 'number') {
      const progressBar = element.querySelector('.toast-progress-fill');
      if (progressBar) {
        progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
      }
    }

    // If changing from loading to success/error, auto-dismiss
    if (type && type !== 'loading' && element.classList.contains('toast-loading')) {
      this.setAutoDismiss(toastId, 3000);
    }
  }

  /**
   * Create toast element
   */
  createToastElement(toastId, message, options) {
    const { type, action, icon, progress, dismissible } = options;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.dataset.toastId = toastId;

    // Icon
    const iconEl = document.createElement('div');
    iconEl.className = 'toast-icon';
    iconEl.innerHTML = icon || this.getDefaultIcon(type);

    // Message
    const messageEl = document.createElement('div');
    messageEl.className = 'toast-message';
    messageEl.textContent = message;

    // Progress bar (for progress type)
    let progressEl = null;
    if (type === 'progress') {
      progressEl = document.createElement('div');
      progressEl.className = 'toast-progress';
      progressEl.innerHTML = `<div class="toast-progress-fill" style="width: ${progress}%"></div>`;
    }

    // Actions container
    const actionsEl = document.createElement('div');
    actionsEl.className = 'toast-actions';

    // Action button
    if (action) {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'toast-action-btn';
      actionBtn.textContent = action.label;
      actionBtn.onclick = (e) => {
        e.stopPropagation();
        action.handler();
        this.dismiss(toastId);
      };
      actionsEl.appendChild(actionBtn);
    }

    // Close button
    if (dismissible) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close-btn';
      closeBtn.innerHTML = '×';
      closeBtn.onclick = () => this.dismiss(toastId);
      actionsEl.appendChild(closeBtn);
    }

    // Assemble toast
    toast.appendChild(iconEl);
    toast.appendChild(messageEl);
    if (progressEl) toast.appendChild(progressEl);
    if (action || dismissible) toast.appendChild(actionsEl);

    // Pause on hover
    toast.addEventListener('mouseenter', () => this.pauseAutoDismiss(toastId));
    toast.addEventListener('mouseleave', () => this.resumeAutoDismiss(toastId));

    return toast;
  }

  /**
   * Get default icon for toast type
   */
  getDefaultIcon(type) {
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 20h20L12 2z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><circle cx="12" cy="8" r="0.5" fill="currentColor"/></svg>',
      loading: '<svg class="toast-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0110 10" opacity="0.75"/></svg>',
      progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'
    };
    return icons[type] || icons.info;
  }

  /**
   * Set auto-dismiss timer
   */
  setAutoDismiss(toastId, duration) {
    const toastData = this.toasts.get(toastId);
    if (!toastData) return;

    // Clear existing timer
    if (toastData.timer) {
      clearTimeout(toastData.timer);
    }

    // Set new timer
    toastData.timer = setTimeout(() => {
      this.dismiss(toastId);
    }, duration);
  }

  /**
   * Pause auto-dismiss on hover
   */
  pauseAutoDismiss(toastId) {
    const toastData = this.toasts.get(toastId);
    if (!toastData || !toastData.timer) return;

    clearTimeout(toastData.timer);
    toastData.pauseTimer = Date.now();
  }

  /**
   * Resume auto-dismiss after hover
   */
  resumeAutoDismiss(toastId) {
    const toastData = this.toasts.get(toastId);
    if (!toastData || !toastData.pauseTimer) return;

    const elapsed = Date.now() - toastData.pauseTimer;
    const remaining = Math.max(1000, 5000 - elapsed); // At least 1s remaining

    toastData.pauseTimer = null;
    this.setAutoDismiss(toastId, remaining);
  }

  /**
   * Dismiss a toast
   */
  dismiss(toastId) {
    const toastData = this.toasts.get(toastId);
    if (!toastData) return;

    const { element, timer } = toastData;

    // Clear timer
    if (timer) clearTimeout(timer);

    // Animate out
    element.classList.remove('toast-show');
    element.classList.add('toast-hide');

    // Remove after animation
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.toasts.delete(toastId);
    }, 300);
  }

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    this.toasts.forEach((_, toastId) => this.dismiss(toastId));
  }

  // Convenience methods
  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error', duration: options.duration || 7000 });
  }

  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }

  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }

  loading(message, options = {}) {
    return this.show(message, { ...options, type: 'loading', duration: 0 });
  }

  progress(message, progressValue = 0, options = {}) {
    return this.show(message, { ...options, type: 'progress', progress: progressValue, duration: 0 });
  }
}

// Create global instance
const toast = new ToastManager();

// Export for use in other modules
export default toast;
