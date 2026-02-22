/**
 * AppFooter Web Component
 * Sticky back-to-launcher icon in bottom-left corner
 */

export class AppFooter extends HTMLElement {
  connectedCallback() {
    const backUrl = this.getAttribute('back-url') || '../launcher/index.html'

    this.innerHTML = `
      <a href="${backUrl}" class="back-home-btn" title="Back to Dashboard">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </a>
    `
  }
}

customElements.define('app-footer', AppFooter)
