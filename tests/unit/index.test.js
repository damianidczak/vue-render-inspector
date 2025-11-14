import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from 'vue'
import {
  VueRenderInspector,
  default as defaultExport,
  getProfiler,
  ComponentProfiler,
  createProfiler,
  SnapshotManager,
  ComponentSnapshot,
  RenderDetector,
  RenderTracker,
  RenderRecord,
  ComponentStats,
  ConsoleReporter,
  shallowEqual,
  computeDiff,
  isDeepEqual,
  hasDifferentReferenceButSameContent,
  safeSerialize,
  captureProps,
  captureState,
  formatForConsole,
  RenderTimer,
  RenderFrequencyTracker,
  MovingAverage,
  measurePerformance,
  VERSION,
  setupRenderInspector
} from '../../src/index.js'

describe('index.js - Public API Exports', () => {
  describe('Named Exports', () => {
    it('should export VueRenderInspector plugin', () => {
      expect(VueRenderInspector).toBeDefined()
      expect(typeof VueRenderInspector.install).toBe('function')
    })

    it('should export default export as VueRenderInspector', () => {
      expect(defaultExport).toBeDefined()
      expect(defaultExport).toBe(VueRenderInspector)
    })

    it('should export getProfiler function', () => {
      expect(getProfiler).toBeDefined()
      expect(typeof getProfiler).toBe('function')
    })

    it('should export ComponentProfiler class', () => {
      expect(ComponentProfiler).toBeDefined()
      expect(typeof ComponentProfiler).toBe('function')
    })

    it('should export createProfiler function', () => {
      expect(createProfiler).toBeDefined()
      expect(typeof createProfiler).toBe('function')
    })

    it('should export SnapshotManager class', () => {
      expect(SnapshotManager).toBeDefined()
      expect(typeof SnapshotManager).toBe('function')
    })

    it('should export ComponentSnapshot class', () => {
      expect(ComponentSnapshot).toBeDefined()
      expect(typeof ComponentSnapshot).toBe('function')
    })

    it('should export RenderDetector class', () => {
      expect(RenderDetector).toBeDefined()
      expect(typeof RenderDetector).toBe('function')
    })

    it('should export RenderTracker class', () => {
      expect(RenderTracker).toBeDefined()
      expect(typeof RenderTracker).toBe('function')
    })

    it('should export RenderRecord class', () => {
      expect(RenderRecord).toBeDefined()
      expect(typeof RenderRecord).toBe('function')
    })

    it('should export ComponentStats class', () => {
      expect(ComponentStats).toBeDefined()
      expect(typeof ComponentStats).toBe('function')
    })

    it('should export ConsoleReporter class', () => {
      expect(ConsoleReporter).toBeDefined()
      expect(typeof ConsoleReporter).toBe('function')
    })

    it('should export comparison utilities', () => {
      expect(shallowEqual).toBeDefined()
      expect(typeof shallowEqual).toBe('function')
      expect(computeDiff).toBeDefined()
      expect(typeof computeDiff).toBe('function')
      expect(isDeepEqual).toBeDefined()
      expect(typeof isDeepEqual).toBe('function')
      expect(hasDifferentReferenceButSameContent).toBeDefined()
      expect(typeof hasDifferentReferenceButSameContent).toBe('function')
    })

    it('should export serialization utilities', () => {
      expect(safeSerialize).toBeDefined()
      expect(typeof safeSerialize).toBe('function')
      expect(captureProps).toBeDefined()
      expect(typeof captureProps).toBe('function')
      expect(captureState).toBeDefined()
      expect(typeof captureState).toBe('function')
      expect(formatForConsole).toBeDefined()
      expect(typeof formatForConsole).toBe('function')
    })

    it('should export performance utilities', () => {
      expect(RenderTimer).toBeDefined()
      expect(typeof RenderTimer).toBe('function')
      expect(RenderFrequencyTracker).toBeDefined()
      expect(typeof RenderFrequencyTracker).toBe('function')
      expect(MovingAverage).toBeDefined()
      expect(typeof MovingAverage).toBe('function')
      expect(measurePerformance).toBeDefined()
      expect(typeof measurePerformance).toBe('function')
    })

    it('should export VERSION constant', () => {
      expect(VERSION).toBeDefined()
      expect(typeof VERSION).toBe('string')
      expect(VERSION).toBe('1.0.0')
    })

    it('should export setupRenderInspector helper', () => {
      expect(setupRenderInspector).toBeDefined()
      expect(typeof setupRenderInspector).toBe('function')
    })
  })

  describe('setupRenderInspector() Helper Function', () => {
    let app
    let originalNodeEnv

    beforeEach(() => {
      app = createApp({ template: '<div>Test</div>' })
      originalNodeEnv = process.env.NODE_ENV

      // Mock console to suppress output
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv
      vi.restoreAllMocks()
    })

    it('should install VueRenderInspector plugin on app', () => {
      const result = setupRenderInspector(app, { console: false })

      expect(result).toBe(app)
      expect(app.config.globalProperties.$renderInspector).toBeDefined()
    })

    it('should use default options in development environment', () => {
      process.env.NODE_ENV = 'development'

      setupRenderInspector(app)

      const inspector = app.config.globalProperties.$renderInspector
      expect(inspector).toBeDefined()
      expect(inspector.enabled).toBe(true)
    })

    it('should disable by default in production environment', () => {
      process.env.NODE_ENV = 'production'

      setupRenderInspector(app)

      const inspector = app.config.globalProperties.$renderInspector
      expect(inspector).toBeDefined()
      expect(inspector.enabled).toBe(false)
    })

    it('should merge custom options with defaults', () => {
      const customOptions = {
        warnThreshold: 50,
        errorThreshold: 200,
        verbose: true
      }

      setupRenderInspector(app, customOptions)

      const inspector = app.config.globalProperties.$renderInspector
      expect(inspector).toBeDefined()
    })

    it('should allow overriding enabled option', () => {
      process.env.NODE_ENV = 'production'

      const result = setupRenderInspector(app, { enabled: true })

      expect(result).toBe(app)
      const inspector = app.config.globalProperties.$renderInspector
      expect(inspector.enabled).toBe(true)
    })

    it('should allow overriding console option', () => {
      const result = setupRenderInspector(app, { console: true })

      expect(result).toBe(app)
    })

    it('should allow overriding verbose option', () => {
      setupRenderInspector(app, { verbose: true })

      const inspector = app.config.globalProperties.$renderInspector
      expect(inspector).toBeDefined()
    })

    it('should allow overriding warnThreshold option', () => {
      setupRenderInspector(app, { warnThreshold: 25 })

      const inspector = app.config.globalProperties.$renderInspector
      expect(inspector).toBeDefined()
    })

    it('should allow overriding errorThreshold option', () => {
      setupRenderInspector(app, { errorThreshold: 150 })

      const inspector = app.config.globalProperties.$renderInspector
      expect(inspector).toBeDefined()
    })

    it('should allow overriding detectUnnecessary option', () => {
      setupRenderInspector(app, { detectUnnecessary: false })

      const inspector = app.config.globalProperties.$renderInspector
      expect(inspector).toBeDefined()
    })

    it('should allow overriding showWelcome option', () => {
      setupRenderInspector(app, { showWelcome: false })

      const inspector = app.config.globalProperties.$renderInspector
      expect(inspector).toBeDefined()
    })

    it('should allow overriding panelOpenByDefault option', () => {
      setupRenderInspector(app, { panelOpenByDefault: false })

      const inspector = app.config.globalProperties.$renderInspector
      expect(inspector).toBeDefined()
    })

    it('should pass all custom options to VueRenderInspector.install', () => {
      const customOptions = {
        enabled: true,
        console: false,
        verbose: true,
        warnThreshold: 30,
        errorThreshold: 150,
        detectUnnecessary: false,
        showWelcome: false,
        panelOpenByDefault: false,
        maxRecords: 500,
        strictMode: true
      }

      setupRenderInspector(app, customOptions)

      const inspector = app.config.globalProperties.$renderInspector
      expect(inspector).toBeDefined()
    })

    it('should work with empty options object', () => {
      const result = setupRenderInspector(app, {})

      expect(result).toBe(app)
      expect(app.config.globalProperties.$renderInspector).toBeDefined()
    })

    it('should work without options parameter', () => {
      const result = setupRenderInspector(app)

      expect(result).toBe(app)
      expect(app.config.globalProperties.$renderInspector).toBeDefined()
    })

    it('should handle missing process.env.NODE_ENV gracefully', () => {
      const originalNodeEnv = process.env.NODE_ENV
      delete process.env.NODE_ENV

      const result = setupRenderInspector(app)

      expect(result).toBe(app)

      process.env.NODE_ENV = originalNodeEnv
    })

    it('should enable inspector when NODE_ENV is not production', () => {
      process.env.NODE_ENV = 'test'

      setupRenderInspector(app)

      const inspector = app.config.globalProperties.$renderInspector
      expect(inspector.enabled).toBe(true)
    })

    it('should return the same app instance for method chaining', () => {
      const result1 = setupRenderInspector(app)
      const result2 = setupRenderInspector(app, { enabled: true })

      expect(result1).toBe(app)
      expect(result2).toBe(app)
    })
  })
})
