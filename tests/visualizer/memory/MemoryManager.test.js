import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryManager } from '../../../src/visualizer/memory/MemoryManager.js'

describe('MemoryManager', () => {
  let memoryManager

  beforeEach(() => {
    memoryManager = new MemoryManager()
  })

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(memoryManager.maxNodes).toBe(5000)
      expect(memoryManager.maxHistoryPerNode).toBe(20)
      expect(memoryManager.pruneInterval).toBe(30000)
      expect(memoryManager.lastPrune).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('shouldPrune()', () => {
    it('should return false immediately after creation', () => {
      expect(memoryManager.shouldPrune()).toBe(false)
    })

    it('should return true after prune interval has passed', () => {
      memoryManager.lastPrune = Date.now() - 31000 // 31 seconds ago
      expect(memoryManager.shouldPrune()).toBe(true)
    })

    it('should return false before prune interval has passed', () => {
      memoryManager.lastPrune = Date.now() - 29000 // 29 seconds ago
      expect(memoryManager.shouldPrune()).toBe(false)
    })
  })

  describe('pruneNodes()', () => {
    function createMockNode(uid, lastUpdateTime) {
      return {
        uid,
        lastUpdateTime,
        componentName: `Component${uid}`
      }
    }

    it('should not prune when nodes are below maxNodes', () => {
      const nodes = new Map()
      for (let i = 1; i <= 100; i++) {
        const node = createMockNode(i, Date.now() - i * 1000)
        nodes.set(i, node)
      }

      const originalSize = nodes.size
      memoryManager.pruneNodes(nodes)

      expect(nodes.size).toBe(originalSize)
    })

    it('should prune oldest nodes when exceeding maxNodes', () => {
      const nodes = new Map()
      const now = Date.now()

      // Create 6000 nodes with different update times
      for (let i = 1; i <= 6000; i++) {
        const node = createMockNode(i, now - i) // Newer nodes have higher timestamps
        nodes.set(i, node)
      }

      memoryManager.pruneNodes(nodes)

      expect(nodes.size).toBe(5000)

      // Check that the newest nodes are kept
      expect(nodes.has(1)).toBe(true) // Newest
      expect(nodes.has(2)).toBe(true)
      expect(nodes.has(5000)).toBe(true)
      expect(nodes.has(5001)).toBe(false) // Pruned
      expect(nodes.has(6000)).toBe(false) // Pruned
    })

    it('should update lastPrune timestamp after pruning', () => {
      const nodes = new Map()
      const oldPruneTime = memoryManager.lastPrune

      // Create nodes exceeding limit
      for (let i = 1; i <= 6000; i++) {
        const node = createMockNode(i, Date.now())
        nodes.set(i, node)
      }

      memoryManager.pruneNodes(nodes)

      expect(memoryManager.lastPrune).toBeGreaterThanOrEqual(oldPruneTime)
    })

    it('should keep most recently updated nodes', () => {
      const nodes = new Map()
      const now = Date.now()

      // Create nodes with specific update patterns
      // First 3000 are very old (1 million ms ago)
      for (let i = 1; i <= 3000; i++) {
        const node = createMockNode(i, now - 1000000 - i)
        nodes.set(i, node)
      }

      // Next 3000 are recent (within last 3000ms)
      for (let i = 3001; i <= 6000; i++) {
        const node = createMockNode(i, now - (i - 3000))
        nodes.set(i, node)
      }

      memoryManager.pruneNodes(nodes)

      // Check the size is correct
      expect(nodes.size).toBe(5000)

      // The most recent 3000 nodes should all be kept
      expect(nodes.has(3001)).toBe(true)
      expect(nodes.has(6000)).toBe(true)

      // At least 1000 of the old nodes should be pruned
      let oldNodesPruned = 0
      for (let i = 1; i <= 3000; i++) {
        if (!nodes.has(i)) oldNodesPruned++
      }
      expect(oldNodesPruned).toBeGreaterThanOrEqual(1000)
    })

    it('should handle empty node map', () => {
      const nodes = new Map()

      expect(() => {
        memoryManager.pruneNodes(nodes)
      }).not.toThrow()

      expect(nodes.size).toBe(0)
    })

    it('should preserve node references after pruning', () => {
      const nodes = new Map()
      const now = Date.now()

      // Create specific nodes we want to keep (most recent)
      const keepNode1 = createMockNode('keep1', now)
      const keepNode2 = createMockNode('keep2', now - 1)

      // Add exactly 4998 old nodes (to stay at 5000 with our 2 keep nodes)
      for (let i = 1; i <= 4998; i++) {
        nodes.set(`old${i}`, createMockNode(`old${i}`, now - 100000 - i))
      }

      nodes.set('keep1', keepNode1)
      nodes.set('keep2', keepNode2)

      // Now add one more node to trigger pruning
      nodes.set('trigger', createMockNode('trigger', now - 500000))

      memoryManager.pruneNodes(nodes)

      // Should have exactly maxNodes
      expect(nodes.size).toBe(5000)

      // Check that kept nodes are the same references
      expect(nodes.get('keep1')).toBe(keepNode1)
      expect(nodes.get('keep2')).toBe(keepNode2)

      // The trigger node should have been pruned as it's the oldest
      expect(nodes.has('trigger')).toBe(false)
    })
  })

  describe('Memory management scenarios', () => {
    it('should handle rapid node additions', () => {
      const nodes = new Map()
      const batches = 10
      const nodesPerBatch = 1000

      for (let batch = 0; batch < batches; batch++) {
        for (let i = 0; i < nodesPerBatch; i++) {
          const id = batch * nodesPerBatch + i
          nodes.set(id, createMockNode(id, Date.now() - id))
        }

        if (nodes.size > memoryManager.maxNodes) {
          memoryManager.pruneNodes(nodes)
        }
      }

      expect(nodes.size).toBe(memoryManager.maxNodes)
    })

    it('should work with shouldPrune check', () => {
      const nodes = new Map()

      // Add nodes
      for (let i = 1; i <= 6000; i++) {
        nodes.set(i, createMockNode(i, Date.now()))
      }

      // Force prune by setting lastPrune to old time
      memoryManager.lastPrune = Date.now() - 31000

      // First prune should happen
      if (memoryManager.shouldPrune()) {
        memoryManager.pruneNodes(nodes)
      }

      expect(nodes.size).toBe(5000)

      // Immediate second check should not prune
      const sizeAfterFirstPrune = nodes.size
      if (memoryManager.shouldPrune()) {
        memoryManager.pruneNodes(nodes)
      }

      expect(nodes.size).toBe(sizeAfterFirstPrune)
    })

    function createMockNode(uid, lastUpdateTime) {
      return {
        uid,
        lastUpdateTime,
        componentName: `Component${uid}`
      }
    }
  })
})
