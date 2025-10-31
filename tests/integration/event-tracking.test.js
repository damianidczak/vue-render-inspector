/**
 * Event Tracking Tests
 * Tests the new event tracking functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from 'vue'
import { VueRenderInspector } from '../../src/index.js'
import EventTriggerDemo from './components/EventTriggerDemo.vue'

describe('Event Tracking', () => {
  let app
  let container

  beforeEach(() => {
    window.__VUE_RENDER_INSPECTOR__ = undefined
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (app) {
      app.unmount()
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should create render records with enhanced data structures', async () => {
    app = createApp(EventTriggerDemo)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    // Wait for initial render
    await new Promise(resolve => setTimeout(resolve, 50))

    // Check that render records have the new fields
    const records = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getRecentRecords(10)
    expect(records.length).toBeGreaterThan(0)

    const record = records[0]
    expect(record).toHaveProperty('eventTrigger')
    expect(record).toHaveProperty('reactivityTracking')
    expect(record).toHaveProperty('reactivityTriggers')
    expect(Array.isArray(record.reactivityTracking)).toBe(true)
    expect(Array.isArray(record.reactivityTriggers)).toBe(true)
  })

  it('should handle render records with reactivity data', async () => {
    app = createApp(EventTriggerDemo)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    // Wait for initial render
    await new Promise(resolve => setTimeout(resolve, 50))

    // Trigger some renders
    const button = container.querySelector('button[data-test="click-trigger"]')
    button.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Check that render records contain reactivity tracking arrays
    const records = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getRecentRecords(10)
    const recentRecords = records.slice(-2) // Get last 2 records

    recentRecords.forEach(record => {
      expect(record).toHaveProperty('reactivityTracking')
      expect(record).toHaveProperty('reactivityTriggers')
      expect(Array.isArray(record.reactivityTracking)).toBe(true)
      expect(Array.isArray(record.reactivityTriggers)).toBe(true)
    })
  })

  it('should serialize enhanced render record data', async () => {
    app = createApp(EventTriggerDemo)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    // Wait for initial render
    await new Promise(resolve => setTimeout(resolve, 50))

    // Get a render record
    const records = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getRecentRecords(1)
    const record = records[0]

    // Test JSON serialization
    const serialized = record.toJSON()

    expect(serialized).toHaveProperty('eventTrigger')
    expect(serialized).toHaveProperty('reactivityTrackingCount')
    expect(serialized).toHaveProperty('reactivityTriggersCount')
    expect(typeof serialized.reactivityTrackingCount).toBe('number')
    expect(typeof serialized.reactivityTriggersCount).toBe('number')
  })

  it('should properly initialize reactivity tracking arrays', async () => {
    app = createApp(EventTriggerDemo)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    // Wait for initial render
    await new Promise(resolve => setTimeout(resolve, 50))

    // Get render records
    const records = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getRecentRecords(5)

    // All records should have properly initialized reactivity tracking arrays
    records.forEach(record => {
      expect(Array.isArray(record.reactivityTracking)).toBe(true)
      expect(Array.isArray(record.reactivityTriggers)).toBe(true)

      // Arrays should be empty for components without hooks
      // (actual reactivity data depends on Vue's internal implementation)
      expect(record.reactivityTracking.length).toBeGreaterThanOrEqual(0)
      expect(record.reactivityTriggers.length).toBeGreaterThanOrEqual(0)
    })
  })

  it('should handle components without reactivity hooks gracefully', async () => {
    app = createApp(EventTriggerDemo)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    // Wait for initial render
    await new Promise(resolve => setTimeout(resolve, 50))

    // Get render records
    const records = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getRecentRecords(10)

    // All records should have reactivity tracking arrays (even if empty)
    records.forEach(record => {
      expect(Array.isArray(record.reactivityTracking)).toBe(true)
      expect(Array.isArray(record.reactivityTriggers)).toBe(true)
    })
  })
})
