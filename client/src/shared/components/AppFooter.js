/**
 * AppFooter Web Component
 * Navigation is now handled by the slim header bar on all inner pages.
 */

export class AppFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = ''
  }
}

customElements.define('app-footer', AppFooter)
