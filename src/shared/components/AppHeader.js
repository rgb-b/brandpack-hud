/**
 * AppHeader Web Component
 * Reusable header for all tools
 */

export class AppHeader extends HTMLElement {
  connectedCallback() {
    const toolName = this.getAttribute('tool-name') || 'Brandpack Tools'

    this.innerHTML = `
      <header class="app-header">
        <h1>Brandpack Tools</h1>
        <p class="subtitle">${toolName}</p>
      </header>
    `
  }
}

customElements.define('app-header', AppHeader)
