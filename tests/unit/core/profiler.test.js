/**
 * Unit Tests for ComponentProfiler
 * Tests the main orchestrator functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ComponentProfiler } from '../../../src/core/profiler.js'

describe('ComponentProfiler - Unit Tests', () => {
  let profiler
  let mockInstance

  beforeEach(() => {
    profiler = new ComponentProfiler({
      enabled: true,
      warnThreshold: 16,
      errorThreshold: 100,
      detectUnnecessary: true,
      console: false // Disable console output during tests
    })

    mockInstance = {
      uid: 123,
      type: {
        __name: 'TestComponent',
        __file: '/src/components/TestComponent.vue'
      },
      props: { message: 'Hello' },
      setupState: { count: 0 },
      parent: null,
      subTree: null,
      isMounted: false
    }
  })

  afterEach(() => {
    profiler.clear()
    profiler.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const defaultProfiler = new ComponentProfiler()

      expect(defaultProfiler.options.enabled).toBe(true)
      expect(defaultProfiler.options.warnThreshold).toBe(16)
      expect(defaultProfiler.options.errorThreshold).toBe(100)
      expect(defaultProfiler.options.detectUnnecessary).toBe(true)
    })

    it('should respect custom options', () => {
      const customProfiler = new ComponentProfiler({
        enabled: false,
        warnThreshold: 10,
        errorThreshold: 50,
        detectUnnecessary: false
      })

      expect(customProfiler.options.enabled).toBe(false)
      expect(customProfiler.options.warnThreshold).toBe(10)
      expect(customProfiler.options.errorThreshold).toBe(50)
      expect(customProfiler.options.detectUnnecessary).toBe(false)
    })

    it('should initialize all subsystems', () => {
      expect(profiler.snapshotManager).toBeDefined()
      expect(profiler.renderDetector).toBeDefined()
      expect(profiler.renderTracker).toBeDefined()
      expect(profiler.renderTimer).toBeDefined()
      expect(profiler.recreationDetector).toBeDefined()
      expect(profiler.eventTracker).toBeDefined()
      expect(profiler.reactivityTracker).toBeDefined()
      expect(profiler.reporter).toBeDefined()
    })
  })

  describe('Component Tracking', () => {
    it('should track component when shouldTrackComponent returns true', () => {
      const shouldTrackSpy = vi.spyOn(profiler, 'shouldTrackComponent').mockReturnValue(true)
      const trackingSizeBefore = profiler.trackedComponents

      profiler.profileComponent(mockInstance)

      expect(shouldTrackSpy).toHaveBeenCalledWith(mockInstance)
      expect(profiler.trackedComponents.has(mockInstance)).toBe(true)
    })

    it('should not track component when shouldTrackComponent returns false', () => {
      const shouldTrackSpy = vi.spyOn(profiler, 'shouldTrackComponent').mockReturnValue(false)

      profiler.profileComponent(mockInstance)

      expect(shouldTrackSpy).toHaveBeenCalledWith(mockInstance)
      expect(profiler.trackedComponents.has(mockInstance)).toBe(false)
    })

    it('should not track same component twice', () => {
      vi.spyOn(profiler, 'shouldTrackComponent').mockReturnValue(true)
      const attachMountSpy = vi.spyOn(profiler, 'attachMountHooks')

      profiler.profileComponent(mockInstance)
      profiler.profileComponent(mockInstance) // Second call

      expect(attachMountSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Component Name Resolution', () => {
    it('should get component name from __name', () => {
      const name = profiler.getComponentName(mockInstance)
      expect(name).toBe('TestComponent')
    })

    it('should get component name from type.name', () => {
      delete mockInstance.type.__name
      mockInstance.type.name = 'MyComponent'

      const name = profiler.getComponentName(mockInstance)
      expect(name).toBe('MyComponent')
    })

    it('should get component name from file path', () => {
      delete mockInstance.type.__name
      delete mockInstance.type.name

      const name = profiler.getComponentName(mockInstance)
      expect(name).toBe('TestComponent') // from __file
    })

    it('should handle anonymous components', () => {
      delete mockInstance.type.__name
      delete mockInstance.type.name
      delete mockInstance.type.__file

      const name = profiler.getComponentName(mockInstance)
      expect(name).toBe('Anonymous')
    })

    it('should handle Component generic name', () => {
      mockInstance.type.__name = 'Component'

      const name = profiler.getComponentName(mockInstance)
      expect(name).toBe('TestComponent') // Should fallback to file
    })
  })

  describe('Filtering Logic', () => {
    it('should track all components when no filters specified', () => {
      const result = profiler.shouldTrackComponent(mockInstance)
      expect(result).toBe(true)
    })

    it('should exclude components matching exclude patterns', () => {
      profiler.options.exclude = ['TestComponent']

      const result = profiler.shouldTrackComponent(mockInstance)
      expect(result).toBe(false)
    })

    it('should include only components matching include patterns', () => {
      profiler.options.include = ['OtherComponent']

      const result = profiler.shouldTrackComponent(mockInstance)
      expect(result).toBe(false)
    })

    it('should include components matching include patterns', () => {
      profiler.options.include = ['TestComponent']

      const result = profiler.shouldTrackComponent(mockInstance)
      expect(result).toBe(true)
    })

    it('should handle regex patterns for exclude', () => {
      profiler.options.exclude = [/^Test/]

      const result = profiler.shouldTrackComponent(mockInstance)
      expect(result).toBe(false)
    })

    it('should handle regex patterns for include', () => {
      profiler.options.include = [/Component$/]

      const result = profiler.shouldTrackComponent(mockInstance)
      expect(result).toBe(true)
    })
  })

  describe('Lifecycle Hook Management', () => {
    beforeEach(() => {
      vi.spyOn(profiler, 'shouldTrackComponent').mockReturnValue(true)
    })

    it('should attach mount hooks to component', () => {
      profiler.profileComponent(mockInstance)

      expect(Array.isArray(mockInstance.bm)).toBe(true)
      expect(Array.isArray(mockInstance.m)).toBe(true)
      expect(mockInstance.bm.length).toBeGreaterThan(0)
      expect(mockInstance.m.length).toBeGreaterThan(0)
    })

    it('should attach update hooks to component', () => {
      profiler.profileComponent(mockInstance)

      expect(Array.isArray(mockInstance.bu)).toBe(true)
      expect(Array.isArray(mockInstance.u)).toBe(true)
      expect(mockInstance.bu.length).toBeGreaterThan(0)
      expect(mockInstance.u.length).toBeGreaterThan(0)
    })

    it('should attach unmount hooks to component', () => {
      profiler.profileComponent(mockInstance)

      expect(Array.isArray(mockInstance.bum)).toBe(true)
      expect(mockInstance.bum.length).toBeGreaterThan(0)
    })
  })

  describe('Render Tracking', () => {
    it('should track render with correct data', () => {
      const trackRenderSpy = vi.spyOn(profiler.renderTracker, 'trackRender')
      const mockData = {
        uid: 123,
        componentName: 'TestComponent',
        reason: 'props-changed',
        duration: 5.5
      }

      profiler.trackRender(mockInstance, mockData)

      expect(trackRenderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 123,
          componentName: 'TestComponent',
          reason: 'props-changed',
          duration: 5.5,
          timestamp: expect.any(Number)
        })
      )
    })
  })

  describe('Summary and Statistics', () => {
    it('should get summary from render tracker', () => {
      const mockSummary = { totalComponents: 5, totalRenders: 10 }
      vi.spyOn(profiler.renderTracker, 'getSummary').mockReturnValue(mockSummary)

      const summary = profiler.getSummary()
      expect(summary).toBe(mockSummary)
    })

    it('should get top offenders from render tracker', () => {
      const mockOffenders = [{ componentName: 'TestComponent', unnecessaryRenders: 5 }]
      vi.spyOn(profiler.renderTracker, 'getTopOffenders').mockReturnValue(mockOffenders)

      const offenders = profiler.getTopOffenders(10)
      expect(offenders).toBe(mockOffenders)
    })

    it('should get slowest components from render tracker', () => {
      const mockSlowest = [{ componentName: 'TestComponent', avgRenderTime: 25.5 }]
      vi.spyOn(profiler.renderTracker, 'getSlowestComponents').mockReturnValue(mockSlowest)

      const slowest = profiler.getSlowestComponents(5)
      expect(slowest).toBe(mockSlowest)
    })
  })

  describe('Dynamic Filtering', () => {
    it('should enable dynamic filtering', () => {
      profiler.enableDynamicFiltering()

      expect(profiler.dynamicFilteringEnabled).toBe(true)
      expect(profiler.enabledComponents.size).toBe(0)
    })

    it('should disable dynamic filtering', () => {
      profiler.enableDynamicFiltering()
      profiler.disableDynamicFiltering()

      expect(profiler.dynamicFilteringEnabled).toBe(false)
    })

    it('should enable specific component', () => {
      profiler.enableComponent(123)

      expect(profiler.enabledComponents.has(123)).toBe(true)
    })

    it('should disable specific component', () => {
      profiler.enableComponent(123)
      profiler.disableComponent(123)

      expect(profiler.enabledComponents.has(123)).toBe(false)
    })
  })

  describe('Memory Management', () => {
    it('should clear all subsystems', () => {
      const snapshotClearSpy = vi.spyOn(profiler.snapshotManager, 'clear')
      const trackerClearSpy = vi.spyOn(profiler.renderTracker, 'clear')
      const timerClearSpy = vi.spyOn(profiler.renderTimer, 'clear')

      profiler.clear()

      expect(snapshotClearSpy).toHaveBeenCalled()
      expect(trackerClearSpy).toHaveBeenCalled()
      expect(timerClearSpy).toHaveBeenCalled()
    })

    it('should get memory statistics', () => {
      const stats = profiler.getMemoryStats()

      expect(stats).toHaveProperty('reactivity')
      expect(stats).toHaveProperty('totalInstances')
      expect(stats).toHaveProperty('totalEvents')
    })

    it('should clean up on destroy', () => {
      const clearSpy = vi.spyOn(profiler, 'clear')

      profiler.destroy()

      expect(clearSpy).toHaveBeenCalled()
      expect(profiler.isAttached).toBe(false)
    })
  })
})
