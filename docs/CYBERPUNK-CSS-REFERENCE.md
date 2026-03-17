# Cyberpunk Theme - CSS Class Reference

## Overview

This document provides a quick reference for CSS classes and data attributes that are styled differently in the Cyberpunk theme.

## Data Type Attributes

Use these attributes to get color-coded styling:

### Count Values (Cyan/Teal)
```html
<span class="count">42</span>
<span data-type="count">42</span>
```

### Time Values (Yellow/Gold)
```html
<span class="time">2h 30m</span>
<span data-type="time">2h 30m</span>
```

### Percentage Values (Magenta/Orange)
```html
<span class="percentage">87%</span>
<span data-type="percentage">87%</span>
```

## Number Display Classes

### Stat Values (with brackets)
```html
<span class="stat-value">42</span>
<!-- Renders as: [42] with monospace font and glow -->
```

### Metric Values (with brackets)
```html
<span class="metric-value">1,234</span>
<!-- Renders as: [1,234] with monospace font and glow -->
```

### Countdown Time (yellow pulsing)
```html
<span class="countdown-time">02:45:30</span>
<!-- Renders with pulsing yellow glow animation -->
```

## Widget Components

### Widget Cards (corner brackets)
```html
<div class="widget">
  <h3 class="widget-title">System Status</h3>
  <!-- Content here -->
</div>
<!-- Auto-gets corner brackets that extend on hover -->
```

### Tool Cards (Ripperdoc style)
```html
<div class="tool-card">
  <div class="tool-icon">📦</div>
  <h3 class="tool-title">Inventory</h3>
  <p>Description here</p>
</div>
<!-- Gets hover effects: glow, transform, corner brackets -->
```

### Activity Items (pulse indicator)
```html
<div class="activity-item">
  <p>Recent activity text</p>
</div>
<!-- Gets left border and pulsing dot indicator -->
```

## Progress Bars

### Standard Progress Bar (HUD style)
```html
<div class="progress-bar">
  <div class="progress-fill" style="width: 75%"></div>
</div>
<!-- Rectangular with glowing right edge -->
```

### Resource Bar (same styling)
```html
<div class="resource-bar">
  <div class="resource-fill" style="width: 60%"></div>
</div>
```

## Buttons

All `<button>` and `.btn` elements automatically get:
- Gradient background
- Scan line effect on hover
- Uppercase text
- Letter spacing
- Glow shadow

```html
<button>Click Me</button>
<button class="btn btn-primary">Action</button>
```

## Typography

### Headers (auto-styled)
```html
<h1>Main Title</h1>
<h2>Section Title</h2>
<h3>Subsection</h3>
<!-- All get Rajdhani font, uppercase, letter-spacing, glow -->
```

### Widget/Tool Titles
```html
<h3 class="widget-title">Widget Name</h3>
<h3 class="tool-title">Tool Name</h3>
<!-- Same styling as headers -->
```

## Special Elements

### Countdown Widget
```html
<div class="countdown-widget">
  <span class="countdown-time">02:45:30</span>
</div>
<!-- Enhanced border glow and pulsing time -->
```

### Tool Icon (with glow)
```html
<div class="tool-icon">
  <!-- Icon content (emoji, SVG, etc.) -->
</div>
<!-- Gets drop-shadow glow filter -->
```

## Glitch Effect

Trigger glitch animation programmatically:

```javascript
import { triggerGlitch } from '../../shared/utils/cyberpunk-effects.js'

const element = document.querySelector('.my-element')
triggerGlitch(element)
```

Or use the class directly:
```html
<span class="glitch-effect">Text to glitch</span>
<!-- Animation plays once (300ms) -->
```

## Background Elements

### Grid Overlay
The grid pattern is automatically added via CSS `body::before` pseudo-element.
No HTML needed - it's always present when Cyberpunk theme is active.

### Scanning Lines
The scanning lines are automatically added via CSS `body::after` pseudo-element.
No HTML needed - continuous animation when Cyberpunk theme is active.

## Theme Detection

Check if Cyberpunk theme is active:

```javascript
import { theme } from '../../shared/utils/theme.js'

if (theme.isCyberpunkTheme()) {
  // Cyberpunk theme is active
  const variant = theme.getCyberpunkVariant() // 'magenta' or 'orange'
}
```

Listen for theme changes:

```javascript
window.addEventListener('themechange', (e) => {
  if (e.detail.theme.startsWith('cyberpunk-')) {
    console.log('Cyberpunk theme activated')
  }
})
```

## CSS Custom Properties

### Colors (Auto-set by theme)
```css
var(--color-primary)          /* Magenta or Orange */
var(--color-primary-light)    /* Lighter variant */
var(--color-primary-bright)   /* Brightest variant */
var(--color-secondary)        /* Blue or Teal */
var(--color-secondary-light)
var(--color-secondary-bright)
var(--color-warning)          /* Yellow/Gold (always) */
```

### Backgrounds
```css
var(--color-bg-dark)      /* #000000 */
var(--color-bg-darker)    /* #000000 */
var(--color-bg-card)      /* #0a0a12 (blue-tinted black) */
var(--color-bg-hover)     /* #12121a */
```

### Text Colors
```css
var(--color-text-primary)    /* #F0F0FF (blue-tinted white) */
var(--color-text-secondary)  /* #A0A0C0 */
var(--color-text-muted)      /* #606080 */
```

### Effects
```css
var(--glow-primary)      /* Primary color glow shadow */
var(--glow-secondary)    /* Secondary color glow shadow */
var(--glow-text)         /* Text glow shadow */
var(--bracket-size)      /* 12px (corner bracket size) */
var(--grid-size)         /* 40px (background grid) */
```

### Fonts
```css
var(--font-display)  /* 'Rajdhani', 'Orbitron' */
var(--font-mono)     /* 'Fira Code', 'JetBrains Mono' */
var(--font-sans)     /* 'Inter' (fallback) */
```

## Best Practices

### DO:
✅ Use semantic HTML first (don't add classes just for styling)
✅ Use data-type attributes for color-coding numbers
✅ Let existing widget/card classes work automatically
✅ Use CSS variables for custom components
✅ Test with both Magenta and Orange variants

### DON'T:
❌ Hardcode Cyberpunk colors in inline styles
❌ Override theme variables without good reason
❌ Add glitch effects to every element (performance)
❌ Disable animations globally (respect user preferences)
❌ Assume Cyberpunk theme is always active

## Examples

### Stat Card with Color-Coded Values
```html
<div class="widget">
  <h3 class="widget-title">System Stats</h3>
  <div>
    <span>Items:</span>
    <span class="stat-value count">42</span>
  </div>
  <div>
    <span>Uptime:</span>
    <span class="stat-value time">2h 30m</span>
  </div>
  <div>
    <span>Usage:</span>
    <span class="stat-value percentage">87%</span>
  </div>
</div>
```

### Progress Indicator
```html
<div class="widget">
  <h3 class="widget-title">Resource Usage</h3>
  <div class="progress-bar">
    <div class="progress-fill" style="width: 65%"></div>
  </div>
  <span class="metric-value percentage">65%</span>
</div>
```

### Activity Feed
```html
<div class="widget">
  <h3 class="widget-title">Recent Activity</h3>
  <div class="activity-item">
    <p>User added 5 items to inventory</p>
    <span class="time">2 min ago</span>
  </div>
  <div class="activity-item">
    <p>System backup completed</p>
    <span class="time">15 min ago</span>
  </div>
</div>
```

## Animation Timing

All animations use these durations:
- **Fast**: 150ms (micro-interactions)
- **Base**: 200ms (default transitions)
- **Medium**: 300ms (glitch effect, hover states)
- **Slow**: 500ms (scan lines, bracket extension)
- **Breathing**: 2s (pulse glow, continuous)
- **Background**: 10s (scanning lines, continuous)

Easing functions:
- `cubic-bezier(0.4, 0, 0.2, 1)` - Smooth deceleration
- `ease-in-out` - Symmetrical transitions
- `linear` - Constant speed (scanning lines)

---

**Quick Start**: Most elements style themselves automatically. Just use semantic HTML and add `.widget`, `.tool-card`, or data-type attributes where needed. The theme does the rest!
