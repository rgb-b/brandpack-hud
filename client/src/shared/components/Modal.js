/**
 * Modal Web Component
 * Reusable modal dialog
 */

export class Modal extends HTMLElement {
  constructor() {
    super()
    this.isOpen = false
  }

  connectedCallback() {
    const title = this.getAttribute('title') || 'Modal'
    const content = this.innerHTML

    this.innerHTML = `
      <div class="modal-overlay hidden" id="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button class="modal-close" id="modal-close" aria-label="Close modal">×</button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
        </div>
      </div>
    `

    // Add event listeners
    const overlay = this.querySelector('#modal-overlay')
    const closeButton = this.querySelector('#modal-close')

    closeButton.addEventListener('click', () => this.close())

    // Close on overlay click (not content click)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close()
      }
    })

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close()
      }
    })
  }

  /**
   * Open the modal
   */
  open() {
    const overlay = this.querySelector('#modal-overlay')
    if (overlay) {
      overlay.classList.remove('hidden')
      this.isOpen = true
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }
  }

  /**
   * Close the modal
   */
  close() {
    const overlay = this.querySelector('#modal-overlay')
    if (overlay) {
      overlay.classList.add('hidden')
      this.isOpen = false
      document.body.style.overflow = '' // Restore scrolling
    }
  }

  /**
   * Toggle modal open/closed
   */
  toggle() {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  /**
   * Update modal content
   * @param {string} html - New HTML content
   */
  setContent(html) {
    const body = this.querySelector('.modal-body')
    if (body) {
      body.innerHTML = html
    }
  }

  /**
   * Update modal title
   * @param {string} title - New title
   */
  setTitle(title) {
    const titleElement = this.querySelector('.modal-title')
    if (titleElement) {
      titleElement.textContent = title
    }
  }
}

customElements.define('modal-dialog', Modal)
