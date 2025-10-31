/**
 * Unit Tests for SnapshotManager
 * Tests component state capture and history management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SnapshotManager, ComponentSnapshot } from '../../../src/utils/snapshot.js'

describe('SnapshotManager - Unit Tests', () => {
  let snapshotManager
  let mockInstance

  beforeEach(() => {
    snapshotManager = new SnapshotManager({
      maxHistorySize: 5
    })

    mockInstance = {
      uid: 123,
      type: {
        __name: 'TestComponent',
        __file: '/src/components/TestComponent.vue'
      },
      props: { message: 'Hello', count: 1 },
      setupState: { internal: 'value' },
      parent: null,
      subTree: null,
      isMounted: true
    }
  })

  afterEach(() => {
    snapshotManager.clear()
  })

  describe('ComponentSnapshot Class', () => {
    it('should create snapshot with correct properties', () => {
      const snapshot = new ComponentSnapshot(mockInstance, 5.5)

      expect(snapshot.uid).toBe(123)
      expect(snapshot.componentName).toBe('TestComponent')
      expect(snapshot.timestamp).toBeGreaterThan(0)
      expect(snapshot.duration).toBe(5.5)
      expect(snapshot.props).toEqual({ message: 'Hello', count: 1 })
      expect(snapshot.state).toEqual({ internal: 'value' })
    })

    it('should handle missing component name gracefully', () => {
      delete mockInstance.type.__name
      delete mockInstance.type.name

      const snapshot = new ComponentSnapshot(mockInstance)

      expect(snapshot.componentName).toBe('TestComponent') // From file path
    })

    it('should handle missing file path', () => {
      delete mockInstance.type.__name
      delete mockInstance.type.name
      delete mockInstance.type.__file

      const snapshot = new ComponentSnapshot(mockInstance)

      expect(snapshot.componentName).toBe('Anonymous')
    })

    it('should capture parent information', () => {
      const parentInstance = { uid: 456, type: { __name: 'ParentComponent' } }
      mockInstance.parent = parentInstance

      const snapshot = new ComponentSnapshot(mockInstance)

      expect(snapshot.parentUid).toBe(456)
      expect(snapshot.parentName).toBe('ParentComponent')
    })

    it('should handle null parent', () => {
      mockInstance.parent = null

      const snapshot = new ComponentSnapshot(mockInstance)

      expect(snapshot.parentUid).toBeNull()
      expect(snapshot.parentName).toBeNull()
    })

    it('should serialize to JSON correctly', () => {
      const snapshot = new ComponentSnapshot(mockInstance, 5.5)
      const json = snapshot.toJSON()

      expect(json.uid).toBe(123)
      expect(json.componentName).toBe('TestComponent')
      expect(json.duration).toBe(5.5)
      expect(json.timestamp).toBe(snapshot.timestamp)
      expect(json.hasProps).toBe(true)
      expect(json.hasState).toBe(true)
    })

    it('should indicate empty props/state correctly', () => {
      mockInstance.props = {}
      mockInstance.setupState = {}

      const snapshot = new ComponentSnapshot(mockInstance)
      const json = snapshot.toJSON()

      expect(json.hasProps).toBe(false)
      expect(json.hasState).toBe(false)
    })
  })

  describe('SnapshotManager Core Functionality', () => {
    it('should initialize with correct options', () => {
      expect(snapshotManager.maxHistorySize).toBe(5)
      expect(snapshotManager.componentHistories.size).toBe(0)
    })

    it('should use default options', () => {
      const defaultManager = new SnapshotManager()
      expect(defaultManager.maxHistorySize).toBe(50)
    })

    it('should capture snapshot and return it', () => {
      const snapshot = snapshotManager.capture(mockInstance, 3.2)

      expect(snapshot).toBeInstanceOf(ComponentSnapshot)
      expect(snapshot.uid).toBe(123)
      expect(snapshot.duration).toBe(3.2)
    })

    it('should store snapshot in history', () => {
      snapshotManager.capture(mockInstance)

      const history = snapshotManager.getHistory(123)
      expect(history).toHaveLength(1)
      expect(history[0].uid).toBe(123)
    })

    it('should maintain history limit', () => {
      // Capture more snapshots than the limit
      for (let i = 0; i < 8; i++) {
        mockInstance.props.count = i
        snapshotManager.capture(mockInstance)
      }

      const history = snapshotManager.getHistory(123)
      expect(history).toHaveLength(5) // Limited to maxHistorySize

      // Should contain the last 5 snapshots
      expect(history[0].props.count).toBe(3) // First in kept history
      expect(history[4].props.count).toBe(7) // Last snapshot
    })

    it('should get latest snapshot', () => {
      snapshotManager.capture(mockInstance)
      mockInstance.props.count = 2
      const latest = snapshotManager.capture(mockInstance)

      const retrieved = snapshotManager.getLatest(123)
      expect(retrieved).toBe(latest)
      expect(retrieved.props.count).toBe(2)
    })

    it('should return null for unknown component', () => {
      const latest = snapshotManager.getLatest(999)
      expect(latest).toBeNull()

      const history = snapshotManager.getHistory(999)
      expect(history).toEqual([])
    })
  })

  describe('History Management', () => {
    beforeEach(() => {
      // Create some history
      for (let i = 0; i < 3; i++) {
        mockInstance.props.count = i
        snapshotManager.capture(mockInstance)
      }
    })

    it('should get complete history', () => {
      const history = snapshotManager.getHistory(123)

      expect(history).toHaveLength(3)
      expect(history[0].props.count).toBe(0)
      expect(history[1].props.count).toBe(1)
      expect(history[2].props.count).toBe(2)
    })

    it('should get limited history', () => {
      const history = snapshotManager.getHistory(123, 2)

      expect(history).toHaveLength(2)
      expect(history[0].props.count).toBe(1) // Last 2 snapshots
      expect(history[1].props.count).toBe(2)
    })

    it('should get previous snapshot', () => {
      const previous = snapshotManager.getPrevious(123)

      expect(previous.props.count).toBe(1) // Second to last
    })

    it('should return null when no previous snapshot exists', () => {
      snapshotManager.clear()
      snapshotManager.capture(mockInstance) // Only one snapshot

      const previous = snapshotManager.getPrevious(123)
      expect(previous).toBeNull()
    })

    it('should clear specific component history', () => {
      const otherInstance = { ...mockInstance, uid: 456 }
      snapshotManager.capture(otherInstance)

      snapshotManager.clearComponent(123)

      expect(snapshotManager.getHistory(123)).toEqual([])
      expect(snapshotManager.getHistory(456)).toHaveLength(1)
    })

    it('should clear all histories', () => {
      const otherInstance = { ...mockInstance, uid: 456 }
      snapshotManager.capture(otherInstance)

      snapshotManager.clear()

      expect(snapshotManager.getHistory(123)).toEqual([])
      expect(snapshotManager.getHistory(456)).toEqual([])
      expect(snapshotManager.componentHistories.size).toBe(0)
    })
  })

  describe('State Capture', () => {
    it('should capture props correctly', () => {
      const complexProps = {
        simple: 'value',
        number: 42,
        object: { nested: 'data' },
        array: [1, 2, 3],
        func: () => 'test'
      }
      mockInstance.props = complexProps

      const snapshot = snapshotManager.capture(mockInstance)

      expect(snapshot.props.simple).toBe('value')
      expect(snapshot.props.number).toBe(42)
      expect(snapshot.props.object).toEqual({ nested: 'data' })
      expect(snapshot.props.array).toEqual([1, 2, 3])
      expect(snapshot.props.func).toBe('[Function: func]')
    })

    it('should capture setupState correctly', () => {
      const setupState = {
        reactiveData: { count: 5 },
        computed: 'computed value',
        method: () => 'method'
      }
      mockInstance.setupState = setupState

      const snapshot = snapshotManager.capture(mockInstance)

      expect(snapshot.state.reactiveData).toEqual({ count: 5 })
      expect(snapshot.state.computed).toBe('computed value')
      expect(snapshot.state.method).toBe('[Function: method]')
    })

    it('should handle missing props and state', () => {
      mockInstance.props = null
      mockInstance.setupState = undefined

      const snapshot = snapshotManager.capture(mockInstance)

      expect(snapshot.props).toEqual({})
      expect(snapshot.state).toEqual({})
    })

    it('should capture additional metadata', () => {
      mockInstance.isMounted = true
      mockInstance.isUnmounted = false

      const snapshot = snapshotManager.capture(mockInstance)

      expect(snapshot.isMounted).toBe(true)
      expect(snapshot.isUnmounted).toBe(false)
    })
  })

  describe('Multiple Components', () => {
    it('should handle multiple components independently', () => {
      const instance1 = { ...mockInstance, uid: 111 }
      const instance2 = { ...mockInstance, uid: 222 }

      snapshotManager.capture(instance1)
      snapshotManager.capture(instance2)
      snapshotManager.capture(instance1)

      expect(snapshotManager.getHistory(111)).toHaveLength(2)
      expect(snapshotManager.getHistory(222)).toHaveLength(1)
    })

    it('should maintain separate history limits', () => {
      const instance1 = { ...mockInstance, uid: 111 }
      const instance2 = { ...mockInstance, uid: 222 }

      // Fill up instance1 history
      for (let i = 0; i < 7; i++) {
        snapshotManager.capture(instance1)
      }

      // Add to instance2
      snapshotManager.capture(instance2)

      expect(snapshotManager.getHistory(111)).toHaveLength(5) // Limited
      expect(snapshotManager.getHistory(222)).toHaveLength(1) // Not affected
    })
  })

  describe('Performance Considerations', () => {
    it('should handle large numbers of snapshots efficiently', () => {
      const startTime = performance.now()

      // Create many snapshots
      for (let i = 0; i < 1000; i++) {
        mockInstance.props.count = i
        snapshotManager.capture(mockInstance)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete in reasonable time (< 100ms for 1000 snapshots)
      expect(duration).toBeLessThan(100)

      // Should maintain history limit
      expect(snapshotManager.getHistory(123)).toHaveLength(5)
    })

    it('should not leak memory with many components', () => {
      // Create snapshots for many different components
      for (let i = 0; i < 100; i++) {
        const instance = { ...mockInstance, uid: i }
        snapshotManager.capture(instance)
      }

      expect(snapshotManager.componentHistories.size).toBe(100)

      // Clear should remove all
      snapshotManager.clear()
      expect(snapshotManager.componentHistories.size).toBe(0)
    })
  })
})
