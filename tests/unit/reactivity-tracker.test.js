/**
 * Unit Tests for ReactivityTracker
 * Tests individual ReactivityTracker functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ReactivityTracker } from '../../src/core/reactivity-tracker.js'

describe('ReactivityTracker - Unit Tests', () => {
  let reactivityTracker
  let mockInstance

  beforeEach(() => {
    reactivityTracker = new ReactivityTracker({
      enabled: true,
      maxEvents: 100,
      samplingRate: 1
    })

    mockInstance = {
      uid: 123,
      type: { __name: 'TestComponent' }
    }
  })

  afterEach(() => {
    reactivityTracker.clear()
  })

  describe('Initialization', () => {
    it('should initialize with correct default options', () => {
      const tracker = new ReactivityTracker()

      expect(tracker.enabled).toBe(true)
      expect(tracker.maxEvents).toBe(100)
      expect(tracker.samplingRate).toBe(1)
      expect(tracker.eventCount).toBe(0)
    })

    it('should respect custom options', () => {
      const tracker = new ReactivityTracker({
        enabled: false,
        maxEvents: 50,
        samplingRate: 0.5
      })

      expect(tracker.enabled).toBe(false)
      expect(tracker.maxEvents).toBe(50)
      expect(tracker.samplingRate).toBe(0.5)
    })
  })

  describe('Tracking Setup', () => {
    it('should set up tracking for enabled tracker', () => {
      reactivityTracker.startTracking(mockInstance)

      expect(reactivityTracker.componentTracking.has(mockInstance)).toBe(true)
      expect(reactivityTracker.componentTriggers.has(mockInstance)).toBe(true)
    })

    it('should not set up tracking when disabled', () => {
      const disabledTracker = new ReactivityTracker({ enabled: false })

      disabledTracker.startTracking(mockInstance)

      expect(disabledTracker.componentTracking.has(mockInstance)).toBe(false)
    })

    it('should not set up tracking for null instance', () => {
      reactivityTracker.startTracking(null)

      // WeakMap doesn't have size property, so we check that no data was stored
      expect(reactivityTracker.currentInstance).toBeNull()
      expect(reactivityTracker.isTracking).toBe(false)
    })
  })

  describe('Event Recording', () => {
    beforeEach(() => {
      reactivityTracker.startTracking(mockInstance)
    })

    it('should record onTrack events', () => {
      const mockTrackEvent = {
        type: 'get',
        key: 'count',
        target: { value: 42 },
        effect: {}
      }

      reactivityTracker.onTrack(mockTrackEvent)

      const tracking = reactivityTracker.getTrackingEvents(mockInstance)
      expect(tracking).toHaveLength(1)
      expect(tracking[0].operation).toBe('get')
      expect(tracking[0].key).toBe('count')
    })

    it('should record onTrigger events', () => {
      const mockTriggerEvent = {
        type: 'set',
        key: 'count',
        newValue: 43,
        oldValue: 42,
        target: { value: 43 },
        effect: {}
      }

      reactivityTracker.onTrigger(mockTriggerEvent)

      const triggers = reactivityTracker.getTriggerEvents(mockInstance)
      expect(triggers).toHaveLength(1)
      expect(triggers[0].operation).toBe('set')
      expect(triggers[0].key).toBe('count')
    })

    it('should respect sampling rate', () => {
      const sampledTracker = new ReactivityTracker({
        enabled: true,
        samplingRate: 0.5
      })
      sampledTracker.startTracking(mockInstance)

      // Mock Math.random to return values that should be sampled
      const originalRandom = Math.random
      Math.random = vi.fn().mockReturnValue(0.3) // Should be sampled ( < 0.5)

      sampledTracker.onTrack({ type: 'get', key: 'test', target: {}, effect: {} })

      Math.random = vi.fn().mockReturnValue(0.7) // Should not be sampled ( > 0.5)

      sampledTracker.onTrack({ type: 'get', key: 'test2', target: {}, effect: {} })

      const tracking = sampledTracker.getTrackingEvents(mockInstance)
      expect(tracking).toHaveLength(1) // Only the first event should be recorded

      Math.random = originalRandom
    })

    it('should limit events per component', () => {
      const limitedTracker = new ReactivityTracker({
        enabled: true,
        maxEvents: 3
      })
      limitedTracker.startTracking(mockInstance)

      // Add more events than the limit
      for (let i = 0; i < 5; i++) {
        limitedTracker.onTrack({
          type: 'get',
          key: `prop${i}`,
          target: {},
          effect: {}
        })
      }

      const tracking = limitedTracker.getTrackingEvents(mockInstance)
      expect(tracking).toHaveLength(3) // Should be limited to maxEvents
    })
  })

  describe('Event Retrieval', () => {
    beforeEach(() => {
      reactivityTracker.startTracking(mockInstance)
    })

    it('should get tracking events for instance', () => {
      reactivityTracker.onTrack({ type: 'get', key: 'count', target: {}, effect: {} })

      const events = reactivityTracker.getTrackingEvents(mockInstance)

      expect(events).toHaveLength(1)
      expect(events[0].operation).toBe('get')
    })

    it('should get trigger events for instance', () => {
      reactivityTracker.onTrigger({ type: 'set', key: 'count', target: {}, effect: {} })

      const events = reactivityTracker.getTriggerEvents(mockInstance)

      expect(events).toHaveLength(1)
      expect(events[0].operation).toBe('set')
    })

    it('should return empty arrays for unknown instance', () => {
      const unknownInstance = { uid: 999 }

      const tracking = reactivityTracker.getTrackingEvents(unknownInstance)
      const triggers = reactivityTracker.getTriggerEvents(unknownInstance)

      expect(tracking).toEqual([])
      expect(triggers).toEqual([])
    })
  })

  describe('Current Instance Tracking', () => {
    it('should track current instance during start/stop', () => {
      reactivityTracker.startTracking(mockInstance)

      expect(reactivityTracker.currentInstance).toBe(mockInstance)
      expect(reactivityTracker.isTracking).toBe(true)

      reactivityTracker.stopTracking()

      expect(reactivityTracker.currentInstance).toBeNull()
      expect(reactivityTracker.isTracking).toBe(false)
    })
  })

  describe('Memory Management', () => {
    it('should clear all tracking data', () => {
      reactivityTracker.startTracking(mockInstance)
      reactivityTracker.onTrack({ type: 'get', key: 'test', target: {}, effect: {} })
      reactivityTracker.onTrigger({ type: 'set', key: 'test', target: {}, effect: {} })

      reactivityTracker.clear()

      expect(reactivityTracker.componentTracking).toEqual(new WeakMap())
      expect(reactivityTracker.componentTriggers).toEqual(new WeakMap())
      expect(reactivityTracker.currentInstance).toBeNull()
      expect(reactivityTracker.isTracking).toBe(false)
    })

    it('should clear instance data', () => {
      reactivityTracker.startTracking(mockInstance)
      reactivityTracker.onTrack({ type: 'get', key: 'test', target: {}, effect: {} })

      reactivityTracker.clearInstance(mockInstance)

      expect(reactivityTracker.getTrackingEvents(mockInstance)).toEqual([])
      expect(reactivityTracker.getTriggerEvents(mockInstance)).toEqual([])
    })
  })

  describe('Statistics', () => {
    it('should provide memory statistics', () => {
      reactivityTracker.startTracking(mockInstance)
      reactivityTracker.onTrack({ type: 'get', key: 'count', target: {}, effect: {} })
      reactivityTracker.onTrigger({ type: 'set', key: 'count', target: {}, effect: {} })

      const stats = reactivityTracker.getMemoryStats()

      expect(stats).toHaveProperty('enabled')
      expect(stats).toHaveProperty('maxEventsPerInstance')
      expect(stats).toHaveProperty('samplingRate')
      expect(stats.enabled).toBe(true)
      expect(stats.maxEventsPerInstance).toBe(100)
    })
  })
})
