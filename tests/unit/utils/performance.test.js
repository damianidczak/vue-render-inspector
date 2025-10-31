/**
 * Unit Tests for Performance Utilities
 * Tests timing, frequency tracking, and moving averages
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  RenderTimer,
  RenderFrequencyTracker,
  MovingAverage,
  measurePerformance
} from '../../../src/utils/performance.js'

describe('Performance Utilities - Unit Tests', () => {
  describe('RenderTimer', () => {
    let timer

    beforeEach(() => {
      timer = new RenderTimer()
    })

    afterEach(() => {
      timer.clear()
    })

    it('should start and end measurements', () => {
      const id = timer.start('test-component-123')

      expect(id).toBeDefined()
      expect(typeof id).toBe('string')

      const duration = timer.end(id)

      expect(duration).toBeGreaterThanOrEqual(0)
      expect(typeof duration).toBe('number')
    })

    it('should return null for invalid measurement id', () => {
      const duration = timer.end('invalid-id')

      expect(duration).toBeNull()
    })

    it('should handle multiple concurrent measurements', () => {
      const id1 = timer.start('component-1')
      const id2 = timer.start('component-2')

      expect(id1).not.toBe(id2)

      const duration1 = timer.end(id1)
      const duration2 = timer.end(id2)

      expect(duration1).toBeGreaterThanOrEqual(0)
      expect(duration2).toBeGreaterThanOrEqual(0)
    })

    it('should clear all measurements', () => {
      const id = timer.start('test')
      timer.clear()

      const duration = timer.end(id)
      expect(duration).toBeNull()
    })

    it('should generate unique measurement IDs', () => {
      const ids = new Set()

      for (let i = 0; i < 100; i++) {
        const id = timer.start(`component-${i}`)
        expect(ids.has(id)).toBe(false)
        ids.add(id)
        timer.end(id)
      }
    })

    it('should measure actual time passage', async () => {
      vi.useFakeTimers()

      const id = timer.start('test')

      // Advance time by 10ms
      vi.advanceTimersByTime(10)

      const duration = timer.end(id)

      // Due to timer precision, we check it's approximately correct
      expect(duration).toBeGreaterThanOrEqual(8)
      expect(duration).toBeLessThan(15)

      vi.useRealTimers()
    })
  })

  describe('MovingAverage', () => {
    let average

    beforeEach(() => {
      average = new MovingAverage(5) // Window size of 5
    })

    it('should initialize with correct window size', () => {
      expect(average.windowSize).toBe(5)
      expect(average.values).toEqual([])
    })

    it('should handle default window size', () => {
      const defaultAverage = new MovingAverage()
      expect(defaultAverage.windowSize).toBe(10)
    })

    it('should add values and calculate average', () => {
      average.add(10)
      expect(average.get()).toBe(10)

      average.add(20)
      expect(average.get()).toBe(15) // (10 + 20) / 2

      average.add(30)
      expect(average.get()).toBe(20) // (10 + 20 + 30) / 3
    })

    it('should maintain window size limit', () => {
      // Add more values than window size
      for (let i = 1; i <= 7; i++) {
        average.add(i * 10)
      }

      expect(average.values).toHaveLength(5) // Should be limited to window size
      expect(average.values).toEqual([30, 40, 50, 60, 70]) // Last 5 values
    })

    it('should calculate correct average after overflow', () => {
      for (let i = 1; i <= 7; i++) {
        average.add(i * 10)
      }

      const expectedAverage = (30 + 40 + 50 + 60 + 70) / 5
      expect(average.get()).toBe(expectedAverage)
    })

    it('should handle zero values', () => {
      average.add(0)
      average.add(10)
      average.add(0)

      expect(average.get()).toBe(10 / 3)
    })

    it('should handle negative values', () => {
      average.add(-5)
      average.add(5)
      average.add(-10)

      expect(average.get()).toBe(-10 / 3)
    })

    it('should return 0 for empty average', () => {
      expect(average.get()).toBe(0)
    })

    it('should clear all values', () => {
      average.add(10)
      average.add(20)
      average.clear()

      expect(average.values).toEqual([])
      expect(average.get()).toBe(0)
    })
  })

  describe('RenderFrequencyTracker', () => {
    let tracker

    beforeEach(() => {
      tracker = new RenderFrequencyTracker({
        windowSize: 1000, // 1 second window
        stormThreshold: 5 // 5 renders = storm
      })
    })

    afterEach(() => {
      tracker.clear()
    })

    it('should initialize with correct options', () => {
      expect(tracker.windowSize).toBe(1000)
      expect(tracker.stormThreshold).toBe(5)
    })

    it('should use default options', () => {
      const defaultTracker = new RenderFrequencyTracker()
      expect(defaultTracker.windowSize).toBe(1000)
      expect(defaultTracker.stormThreshold).toBe(5)
    })

    it('should record render events', () => {
      const now = Date.now()

      tracker.recordRender('TestComponent-123', now)
      tracker.recordRender('TestComponent-123', now + 100)
      tracker.recordRender('TestComponent-123', now + 200)

      const frequency = tracker.getFrequency('TestComponent-123', now + 200)
      expect(frequency).toBe(3) // 3 renders in window
    })

    it('should detect render storms', () => {
      const now = Date.now()
      const componentKey = 'TestComponent-123'

      // Add renders that exceed threshold
      for (let i = 0; i < 6; i++) {
        tracker.recordRender(componentKey, now + i * 100)
      }

      expect(tracker.isRenderStorm(componentKey)).toBe(true)
    })

    it('should not detect storm below threshold', () => {
      const now = Date.now()
      const componentKey = 'TestComponent-123'

      // Add renders below threshold
      for (let i = 0; i < 3; i++) {
        tracker.recordRender(componentKey, now + i * 100)
      }

      expect(tracker.isRenderStorm(componentKey)).toBe(false)
    })

    it('should handle window sliding', () => {
      const now = Date.now()
      const componentKey = 'TestComponent-123'

      // Add old renders outside window
      tracker.recordRender(componentKey, now - 2000)
      tracker.recordRender(componentKey, now - 1500)

      // Add recent renders within window
      tracker.recordRender(componentKey, now - 500)
      tracker.recordRender(componentKey, now - 200)
      tracker.recordRender(componentKey, now)

      const frequency = tracker.getFrequency(componentKey, now)
      expect(frequency).toBe(3) // Only recent renders count
    })

    it('should return correct active storms', () => {
      const now = Date.now()

      // Create storm for component 1
      for (let i = 0; i < 6; i++) {
        tracker.recordRender('Component1-1', now + i * 100)
      }

      // No storm for component 2
      for (let i = 0; i < 3; i++) {
        tracker.recordRender('Component2-2', now + i * 100)
      }

      const storms = tracker.getActiveStorms()
      expect(storms).toHaveLength(1)
      expect(storms[0].componentId).toBe('Component1-1')
      expect(storms[0].count).toBeGreaterThanOrEqual(6)
      expect(storms[0].severity).toBe('warning')
    })

    it('should clear all data', () => {
      tracker.recordRender('TestComponent-123', Date.now())
      tracker.clear()

      expect(tracker.getFrequency('TestComponent-123')).toBe(0)
      expect(tracker.getActiveStorms()).toHaveLength(0)
    })

    it('should handle component with no renders', () => {
      expect(tracker.getFrequency('NonExistent-999')).toBe(0)
      expect(tracker.isRenderStorm('NonExistent-999')).toBe(false)
    })
  })

  describe('measurePerformance', () => {
    it('should measure synchronous function performance', async () => {
      const testFunction = () => {
        // Simulate some work
        let sum = 0
        for (let i = 0; i < 1000; i++) {
          sum += i
        }
        return sum
      }

      const result = await measurePerformance(testFunction)

      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(result.result).toBe(499500) // Sum of 0..999
    })

    it('should measure async function performance', async () => {
      const asyncFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'completed'
      }

      const result = await measurePerformance(asyncFunction)

      expect(result.duration).toBeGreaterThanOrEqual(8) // At least ~10ms
      expect(result.result).toBe('completed')
    })

    it('should handle function that throws error', async () => {
      const errorFunction = () => {
        throw new Error('Test error')
      }

      try {
        await measurePerformance(errorFunction)
        expect.fail('Should have thrown an error')
      } catch (errorResult) {
        expect(errorResult.error.message).toBe('Test error')
        expect(errorResult.duration).toBeGreaterThanOrEqual(0)
      }
    })

    it('should handle async function that rejects', async () => {
      const rejectFunction = async () => {
        throw new Error('Async error')
      }

      try {
        await measurePerformance(rejectFunction)
        expect.fail('Should have thrown an error')
      } catch (errorResult) {
        expect(errorResult.error.message).toBe('Async error')
        expect(errorResult.duration).toBeGreaterThanOrEqual(0)
      }
    })

    it('should provide accurate timing for very fast operations', async () => {
      const fastFunction = () => 42

      const result = await measurePerformance(fastFunction)

      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(result.duration).toBeLessThan(5) // Should be very fast
      expect(result.result).toBe(42)
    })
  })
})
