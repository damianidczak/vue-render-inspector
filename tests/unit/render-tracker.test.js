/**
 * Unit Tests for RenderTracker
 * Tests individual RenderTracker functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RenderTracker, RenderRecord } from '../../src/core/tracker.js'

describe('RenderTracker - Unit Tests', () => {
  let renderTracker

  beforeEach(() => {
    renderTracker = new RenderTracker({
      maxRecords: 100,
      stormWindow: 1000,
      stormThreshold: 5
    })
  })

  afterEach(() => {
    // Clear any test data
  })

  describe('Initialization', () => {
    it('should initialize with correct default options', () => {
      const tracker = new RenderTracker()

      expect(tracker.maxRecords).toBe(1000)
      expect(tracker.records).toEqual([])
      expect(tracker.componentStats).toBeInstanceOf(Map)
    })

    it('should respect custom options', () => {
      const tracker = new RenderTracker({
        maxRecords: 50
      })

      expect(tracker.maxRecords).toBe(50)
    })
  })

  describe('RenderRecord Class', () => {
    it('should create render record with correct properties', () => {
      const mockData = {
        uid: 123,
        componentName: 'TestComponent',
        timestamp: Date.now(),
        duration: 5.5,
        reason: 'props-changed',
        isUnnecessary: false
      }

      const record = new RenderRecord(mockData)

      expect(record.uid).toBe(123)
      expect(record.componentName).toBe('TestComponent')
      expect(record.duration).toBe(5.5)
      expect(record.reason).toBe('props-changed')
      expect(record.isUnnecessary).toBe(false)
      expect(record.id).toMatch(/^123-\d+-\d+\.\d+$/)
    })

    it('should handle missing data gracefully', () => {
      const record = new RenderRecord({})

      expect(record.uid).toBeUndefined()
      expect(record.componentName).toBeUndefined()
      expect(record.duration).toBeNull()
      expect(record.triggerMechanism).toBe('unknown')
      expect(record.triggerSource).toBe('unknown')
    })

    it('should serialize to JSON correctly', () => {
      const mockData = {
        uid: 123,
        componentName: 'TestComponent',
        duration: 5.5,
        reason: 'props-changed',
        isUnnecessary: false,
        eventTrigger: { type: 'click', target: 'button' },
        reactivityTracking: [{ operation: 'get', key: 'count' }],
        reactivityTriggers: [{ operation: 'set', key: 'count' }]
      }

      const record = new RenderRecord(mockData)
      const json = record.toJSON()

      expect(json.uid).toBe(123)
      expect(json.componentName).toBe('TestComponent')
      expect(json.duration).toBe(5.5)
      expect(json.reactivityTrackingCount).toBe(1)
      expect(json.reactivityTriggersCount).toBe(1)
    })
  })

  describe('Render Tracking', () => {
    it('should track render and return record', () => {
      const mockData = {
        uid: 123,
        componentName: 'TestComponent',
        timestamp: Date.now(),
        duration: 5.5,
        reason: 'props-changed'
      }

      const record = renderTracker.trackRender(mockData)

      expect(record).toBeInstanceOf(RenderRecord)
      expect(record.uid).toBe(123)
      expect(record.componentName).toBe('TestComponent')
      expect(renderTracker.records).toHaveLength(1)
    })

    it('should limit records to maxRecords', () => {
      const smallTracker = new RenderTracker({ maxRecords: 2 })

      // Add more records than the limit
      for (let i = 0; i < 4; i++) {
        smallTracker.trackRender({
          uid: i,
          componentName: `Component${i}`,
          timestamp: Date.now()
        })
      }

      expect(smallTracker.records).toHaveLength(2)
      expect(smallTracker.records[0].uid).toBe(2) // Should have the last 2 records
      expect(smallTracker.records[1].uid).toBe(3)
    })
  })

  describe('Record Retrieval', () => {
    beforeEach(() => {
      // Add some test records
      for (let i = 0; i < 5; i++) {
        renderTracker.trackRender({
          uid: i % 2, // Mix of UIDs 0 and 1
          componentName: `Component${i % 2}`,
          timestamp: Date.now()
        })
      }
    })

    it('should get recent records with limit', () => {
      const recent = renderTracker.getRecentRecords(3)

      expect(recent).toHaveLength(3)
      // Records are in order: [uid0, uid1, uid0, uid1, uid0]
      // Last 3: [uid1, uid0, uid0] - most recent first
      expect(recent[0].uid).toBe(0) // Most recent
      expect(recent[1].uid).toBe(1)
      expect(recent[2].uid).toBe(0)
    })

    it('should get all recent records if no limit specified', () => {
      const recent = renderTracker.getRecentRecords()

      expect(recent).toHaveLength(5)
    })

    it('should get records for specific component', () => {
      const componentRecords = renderTracker.getComponentRecords(0, 10)

      expect(componentRecords).toHaveLength(3) // UID 0 appears 3 times
      expect(componentRecords.every(r => r.uid === 0)).toBe(true)
    })

    it('should limit component records', () => {
      const componentRecords = renderTracker.getComponentRecords(0, 2)

      expect(componentRecords).toHaveLength(2)
    })

    it('should return empty array for unknown component', () => {
      const componentRecords = renderTracker.getComponentRecords(999)

      expect(componentRecords).toEqual([])
    })
  })

  describe('Unnecessary Renders Analysis', () => {
    beforeEach(() => {
      // Add mix of necessary and unnecessary renders
      renderTracker.trackRender({
        uid: 1,
        componentName: 'TestComponent',
        isUnnecessary: false,
        reason: 'props-changed'
      })
      renderTracker.trackRender({
        uid: 1,
        componentName: 'TestComponent',
        isUnnecessary: true,
        reason: 'no-changes-detected'
      })
      renderTracker.trackRender({
        uid: 2,
        componentName: 'OtherComponent',
        isUnnecessary: true,
        reason: 'reference-changed'
      })
    })

    it('should get unnecessary renders', () => {
      const unnecessary = renderTracker.getUnnecessaryRenders(10)

      expect(unnecessary).toHaveLength(2)
      expect(unnecessary.every(r => r.isUnnecessary)).toBe(true)
    })

    it('should limit unnecessary renders', () => {
      const unnecessary = renderTracker.getUnnecessaryRenders(1)

      expect(unnecessary).toHaveLength(1)
    })
  })

  describe('Component Statistics', () => {
    beforeEach(() => {
      // Add renders for different components
      renderTracker.trackRender({
        uid: 1,
        componentName: 'ComponentA',
        duration: 5,
        isUnnecessary: false
      })
      renderTracker.trackRender({
        uid: 1,
        componentName: 'ComponentA',
        duration: 10,
        isUnnecessary: true
      })
      renderTracker.trackRender({
        uid: 2,
        componentName: 'ComponentB',
        duration: 8,
        isUnnecessary: false
      })
    })

    it('should track component statistics', () => {
      const allStats = renderTracker.getAllStats()

      expect(allStats).toHaveLength(2)
      const componentA = allStats.find(s => s.componentName === 'ComponentA')
      const componentB = allStats.find(s => s.componentName === 'ComponentB')

      expect(componentA.totalRenders).toBe(2)
      expect(componentA.unnecessaryRenders).toBe(1)
      expect(componentB.totalRenders).toBe(1)
    })

    it('should update existing component stats', () => {
      // Add another render for ComponentA
      renderTracker.trackRender({
        uid: 1,
        componentName: 'ComponentA',
        duration: 3,
        isUnnecessary: false
      })

      const allStats = renderTracker.getAllStats()
      const componentA = allStats.find(s => s.componentName === 'ComponentA')

      expect(componentA.totalRenders).toBe(3)
      expect(componentA.unnecessaryRenders).toBe(1)
    })
  })

  describe('Frequency Tracking', () => {
    it('should track render frequency', () => {
      const now = Date.now()

      // Simulate rapid renders
      for (let i = 0; i < 6; i++) {
        renderTracker.trackRender({
          uid: 1,
          componentName: 'TestComponent',
          timestamp: now + i * 100 // 100ms apart
        })
      }

      // Check if storm detection would trigger (this is tested in integration tests)
      // Here we just verify the frequency tracker is working
      expect(renderTracker.records).toHaveLength(6)
    })
  })

  describe('Memory Management', () => {
    it('should clear all records and stats', () => {
      // Add some data
      renderTracker.trackRender({
        uid: 1,
        componentName: 'TestComponent'
      })

      renderTracker.clear()

      expect(renderTracker.records).toEqual([])
      expect(renderTracker.getAllStats()).toHaveLength(0)
    })
  })
})
