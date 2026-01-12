/**
 * AppFooter Web Component
 * Reusable footer with back button
 */

export class AppFooter extends HTMLElement {
  connectedCallback() {
    const backUrl = this.getAttribute('back-url') || '../launcher/index.html'
    const backText = this.getAttribute('back-text') || '← Back to Launcher'

    this.innerHTML = `
      <footer class="app-footer">
        <a href="${backUrl}" class="back-button">${backText}</a>
      </footer>
    `
  }
}

customElements.define('app-footer', AppFooter)
