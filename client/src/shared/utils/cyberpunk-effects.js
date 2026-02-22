/**
 * Cyberpunk 2077 Theme Effects
 * Glitch effects, scanning lines, and interactive animations
 */

/**
 * Apply glitch effect to element on trigger
 * @param {HTMLElement} element - Element to glitch
 */
export function triggerGlitch(element) {
  if (!element) return

  element.classList.add('glitch-effect')

  // Remove class after animation completes
  setTimeout(() => {
    element.classList.remove('glitch-effect')
  }, 300)
}

/**
 * Initialize glitch effects on hover for specific elements
 */
export function initializeGlitchEffects() {
  // Only run if Cyberpunk theme is active
  const theme = document.documentElement.getAttribute('data-theme')
  if (!theme || !theme.startsWith('cyberpunk-')) return

  // Apply to headings
  const headings = document.querySelectorAll('h1, h2, h3, .widget-title, .tool-title')
  headings.forEach(heading => {
    heading.addEventListener('mouseenter', () => {
      // Random chance of glitch (30%)
      if (Math.random() < 0.3) {
        triggerGlitch(heading)
      }
    })
  })

  // Apply to buttons on focus
  const buttons = document.querySelectorAll('button, .btn')
  buttons.forEach(button => {
    button.addEventListener('focus', () => {
      triggerGlitch(button)
    })
  })
}

/**
 * Initialize all Cyberpunk effects
 */
export function initializeCyberpunkEffects() {
  const theme = document.documentElement.getAttribute('data-theme')
  if (!theme || !theme.startsWith('cyberpunk-')) return

  initializeGlitchEffects()

  console.log('[Cyberpunk] Theme effects initialized')
}

// Auto-initialize if module loaded and theme is active
if (typeof window !== 'undefined') {
  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCyberpunkEffects)
  } else {
    initializeCyberpunkEffects()
  }

  // Re-initialize on theme change
  window.addEventListener('themechange', (e) => {
    if (e.detail.theme.startsWith('cyberpunk-')) {
      initializeCyberpunkEffects()
    }
  })
}
