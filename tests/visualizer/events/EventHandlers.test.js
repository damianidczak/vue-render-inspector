import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EventHandlers } from '../../../src/visualizer/events/EventHandlers.js'
import { VisualizerState } from '../../../src/visualizer/state/VisualizerState.js'
import { JSDOM } from 'jsdom'

describe('EventHandlers', () => {
  let eventHandlers
  let state
  let canvasRenderer
  let treeLayout
  let notificationSystem
  let container
  let dom

  beforeEach(() => {
    // Setup DOM
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="container">
            <button id="vri-center-tree">🎯 Center Tree</button>
            <button id="vri-toggle-notifications">🔔 Notifications</button>
            <button id="vri-close">✕ Close</button>
          </div>
        </body>
      </html>
    `)

    global.window = dom.window
    global.document = dom.window.document

    container = document.getElementById('container')

    // Setup mocks
    state = new VisualizerState()
    vi.spyOn(state, 'updateSettings')

    canvasRenderer = {
      setupCanvas: vi.fn()
    }

    treeLayout = {}

    notificationSystem = {
      toggleVisibility: vi.fn()
    }

    eventHandlers = new EventHandlers(
      state,
      canvasRenderer,
      treeLayout,
      notificationSystem,
      container
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(eventHandlers.state).toBe(state)
      expect(eventHandlers.canvasRenderer).toBe(canvasRenderer)
      expect(eventHandlers.treeLayout).toBe(treeLayout)
      expect(eventHandlers.notificationSystem).toBe(notificationSystem)
      expect(eventHandlers.container).toBe(container)
      expect(eventHandlers.cleanupCallback).toBe(null)
      expect(eventHandlers.centerTreeCallback).toBe(null)
    })
  })

  describe('initialize()', () => {
    it('should setup all event handlers', () => {
      eventHandlers.initialize()

      // Check that handlers are set
      expect(document.getElementById('vri-center-tree').onclick).toBeDefined()
      expect(document.getElementById('vri-toggle-notifications').onclick).toBeDefined()
      expect(document.getElementById('vri-close').onclick).toBeDefined()
    })
  })

  describe('Button handlers', () => {
    beforeEach(() => {
      eventHandlers.initialize()
    })

    it('should handle center tree button', () => {
      const callback = vi.fn()
      eventHandlers.setCenterTreeCallback(callback)

      const button = document.getElementById('vri-center-tree')
      button.click()

      expect(callback).toHaveBeenCalled()
    })

    it('should not error if center tree callback not set', () => {
      const button = document.getElementById('vri-center-tree')

      expect(() => button.click()).not.toThrow()
    })

    it('should handle notifications toggle', () => {
      const button = document.getElementById('vri-toggle-notifications')
      button.click()

      expect(notificationSystem.toggleVisibility).toHaveBeenCalled()
    })

    it('should handle close button', () => {
      const callback = vi.fn()
      eventHandlers.setCleanupCallback(callback)

      const button = document.getElementById('vri-close')
      const removeSpy = vi.spyOn(container, 'remove')

      button.click()

      expect(callback).toHaveBeenCalled()
      expect(removeSpy).toHaveBeenCalled()
    })

    it('should remove container even if cleanup callback not set', () => {
      const button = document.getElementById('vri-close')
      const removeSpy = vi.spyOn(container, 'remove')

      button.click()

      expect(removeSpy).toHaveBeenCalled()
    })
  })

  describe('Callback setters', () => {
    it('should set cleanup callback', () => {
      const callback = vi.fn()

      eventHandlers.setCleanupCallback(callback)

      expect(eventHandlers.cleanupCallback).toBe(callback)
    })

    it('should set center tree callback', () => {
      const callback = vi.fn()

      eventHandlers.setCenterTreeCallback(callback)

      expect(eventHandlers.centerTreeCallback).toBe(callback)
    })
  })

  describe('cleanup()', () => {
    it('should remove all event handlers', () => {
      eventHandlers.initialize()

      // Set callbacks
      const cleanupCallback = vi.fn()
      const centerTreeCallback = vi.fn()
      eventHandlers.setCleanupCallback(cleanupCallback)
      eventHandlers.setCenterTreeCallback(centerTreeCallback)

      eventHandlers.cleanup()

      // Check all handlers are removed
      expect(document.getElementById('vri-center-tree').onclick).toBe(null)
      expect(document.getElementById('vri-toggle-notifications').onclick).toBe(null)
      expect(document.getElementById('vri-close').onclick).toBe(null)

      // Check callbacks are cleared
      expect(eventHandlers.cleanupCallback).toBe(null)
      expect(eventHandlers.centerTreeCallback).toBe(null)
    })

    it('should handle missing elements gracefully', () => {
      // Remove an element
      document.getElementById('vri-toggle-notifications').remove()

      expect(() => eventHandlers.cleanup()).not.toThrow()
    })
  })

  describe('Edge cases', () => {
    it('should handle missing elements during initialization', () => {
      // Remove all elements
      container.innerHTML = ''

      expect(() => eventHandlers.initialize()).not.toThrow()
    })
  })
})
