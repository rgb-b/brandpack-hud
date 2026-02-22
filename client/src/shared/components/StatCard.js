/**
 * StatCard Web Component
 * Reusable statistics display card
 */

export class StatCard extends HTMLElement {
  connectedCallback() {
    const value = this.getAttribute('value') || '0'
    const label = this.getAttribute('label') || ''
    const color = this.getAttribute('color') || 'primary'

    this.innerHTML = `
      <div class="stat-card">
        <div class="stat-value" data-color="${color}">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    `
  }

  /**
   * Update the stat value
   * @param {string|number} newValue
   */
  updateValue(newValue) {
    const valueElement = this.querySelector('.stat-value')
    if (valueElement) {
      valueElement.textContent = newValue
    }
  }
}

customElements.define('stat-card', StatCard)
