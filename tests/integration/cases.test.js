import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest'
import { createApp } from 'vue'
import { VueRenderInspector } from '../../src/index.js'
import App from '../../examples/App.vue'

// Mock console methods to capture logs
const consoleSpy = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

beforeAll(() => {
  global.__VUE_RENDER_INSPECTOR__ = undefined
  global.window = global
  global.console = { ...console, ...consoleSpy }
})

describe('Vue Render Inspector - Optimization Cases', () => {
  let app
  let container

  beforeEach(() => {
    window.__VUE_RENDER_INSPECTOR__ = undefined
    container = document.createElement('div')
    document.body.appendChild(container)

    app = createApp(App)
    app.use(VueRenderInspector, { enabled: true, console: false })
    app.mount(container)
  })

  afterEach(() => {
    if (app) {
      app.unmount()
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should initialize with the plugin', async () => {
    // Wait for initial render
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check that inspector is available
    expect(window.__VUE_RENDER_INSPECTOR__).toBeDefined()
    expect(window.__VUE_RENDER_INSPECTOR__.profiler).toBeDefined()

    // Check that components are being tracked
    const stats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()
    expect(stats.length).toBeGreaterThan(0)
  })

  it('should track component renders', async () => {
    await new Promise(resolve => setTimeout(resolve, 100))

    // Find any button and click it
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)

    // Click first available button
    buttons[0].click()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check that renders were tracked
    const summary = window.__VUE_RENDER_INSPECTOR__.summary()
    expect(summary.totalRenders).toBeGreaterThan(0)
  })

  it('should detect unnecessary renders', async () => {
    await new Promise(resolve => setTimeout(resolve, 100))

    // Click multiple buttons to trigger renders
    const buttons = container.querySelectorAll('button')
    for (let i = 0; i < Math.min(3, buttons.length); i++) {
      buttons[i].click()
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Check for unnecessary renders
    const stats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()
    const hasUnnecessary = stats.some(stat => stat.unnecessaryRenders > 0)

    // Should have detected at least some unnecessary renders from the demo
    expect(hasUnnecessary).toBe(true)
  })

  it('should provide component statistics', async () => {
    await new Promise(resolve => setTimeout(resolve, 100))

    // Trigger some renders
    const button = container.querySelector('button')
    if (button) {
      button.click()
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Get top offenders
    const top = window.__VUE_RENDER_INSPECTOR__.top(5)
    expect(Array.isArray(top)).toBe(true)

    // Check stats structure
    if (top.length > 0) {
      const stat = top[0]
      expect(stat).toHaveProperty('componentName')
      expect(stat).toHaveProperty('totalRenders')
      expect(stat).toHaveProperty('unnecessaryRenders')
    }
  })

  it('should track slow components', async () => {
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check for slow components
    const slow = window.__VUE_RENDER_INSPECTOR__.slow(5)
    expect(Array.isArray(slow)).toBe(true)

    if (slow.length > 0) {
      const stat = slow[0]
      expect(stat).toHaveProperty('avgRenderTime')
      expect(typeof stat.avgRenderTime).toBe('number')
    }
  })

  it('should clear tracking data', () => {
    // Clear all data
    window.__VUE_RENDER_INSPECTOR__.clear()

    // Check that data was cleared
    const summary = window.__VUE_RENDER_INSPECTOR__.summary()
    expect(summary.totalRenders).toBe(0)
    expect(summary.totalComponents).toBe(0)
  })
})
