import { mount } from '@vue/test-utils'
import VueRenderInspector from '../../src/index.js'

/**
 * Create a test wrapper with VueRenderInspector installed
 * @param {Object} component - Vue component to test
 * @param {Object} options - Mount options
 * @param {Object} inspectorOptions - VueRenderInspector options
 * @returns {Object} wrapper and inspector instance
 */
export async function mountWithInspector(component, options = {}, inspectorOptions = {}) {
  // Create wrapper with inspector plugin
  const wrapper = mount(component, {
    global: {
      plugins: [
        [
          VueRenderInspector,
          {
            enabled: true,
            console: false,
            ...inspectorOptions
          }
        ]
      ]
    },
    ...options
  })

  // Wait for the plugin to track components
  await new Promise(resolve => setTimeout(resolve, 600))

  // Get inspector instance from global
  const inspector = window.__VUE_RENDER_INSPECTOR__

  return { wrapper, inspector }
}

/**
 * Wait for next tick and flush promises
 */
export async function flushAll() {
  await new Promise(resolve => setTimeout(resolve, 0))
  await Promise.resolve()
}

/**
 * Simulate render storm by triggering multiple updates
 * @param {Function} triggerFn - Function to trigger updates
 * @param {Number} count - Number of updates
 * @param {Number} delay - Delay between updates in ms
 */
export async function simulateRenderStorm(triggerFn, count = 10, delay = 50) {
  for (let i = 0; i < count; i++) {
    triggerFn()
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}

/**
 * Get render stats for a specific component
 * @param {Object} inspector - Inspector instance
 * @param {String} componentName - Name of the component
 * @returns {Object} Render stats
 */
export function getComponentStats(inspector, componentName) {
  // Use the getAllStats() method to get all component stats
  if (!inspector || !inspector.getAllStats) return null

  // Get all stats using the public API
  const allStats = inspector.getAllStats()

  // Find the stats for the specific component
  return allStats.find(stat => stat.componentName === componentName)
}

/**
 * Clear console logs for testing
 */
export function clearConsole() {
  console.log = vi.fn()
  console.warn = vi.fn()
  console.error = vi.fn()
  console.group = vi.fn()
  console.groupEnd = vi.fn()
}

/**
 * Restore console
 */
export function restoreConsole() {
  vi.restoreAllMocks()
}
