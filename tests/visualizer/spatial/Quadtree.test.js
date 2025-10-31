import { describe, it, expect, beforeEach } from 'vitest'
import { Quadtree } from '../../../src/visualizer/spatial/Quadtree.js'

describe('Quadtree', () => {
  let quadtree
  let bounds

  beforeEach(() => {
    bounds = { x: 0, y: 0, width: 1000, height: 1000 }
    quadtree = new Quadtree(bounds, 2, 3)
  })

  function createNode(x, y) {
    return { targetX: x, targetY: y, animX: null, animY: null }
  }

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      expect(quadtree.bounds).toEqual(bounds)
      expect(quadtree.maxObjects).toBe(2)
      expect(quadtree.maxLevels).toBe(3)
      expect(quadtree.level).toBe(0)
      expect(quadtree.objects).toEqual([])
      expect(quadtree.nodes).toEqual([])
    })
  })

  describe('insert()', () => {
    it('should insert nodes into objects array', () => {
      const node1 = createNode(100, 100)
      const node2 = createNode(200, 200)

      quadtree.insert(node1)
      quadtree.insert(node2)

      expect(quadtree.objects).toHaveLength(2)
      expect(quadtree.objects).toContain(node1)
      expect(quadtree.objects).toContain(node2)
    })

    it('should split when exceeding maxObjects', () => {
      const node1 = createNode(100, 100)
      const node2 = createNode(200, 200)
      const node3 = createNode(600, 100) // Should trigger split

      quadtree.insert(node1)
      quadtree.insert(node2)
      expect(quadtree.nodes).toHaveLength(0)

      quadtree.insert(node3)
      expect(quadtree.nodes).toHaveLength(4)
      expect(quadtree.objects.length).toBeLessThanOrEqual(1)
    })

    it('should distribute nodes to correct quadrants after split', () => {
      // Create nodes in different quadrants
      const topLeft = createNode(200, 200)
      const topRight = createNode(700, 200)
      const bottomLeft = createNode(200, 700)

      quadtree.insert(topLeft)
      quadtree.insert(topRight)
      quadtree.insert(bottomLeft) // Triggers split

      expect(quadtree.nodes).toHaveLength(4)

      // Check nodes are in correct quadrants
      expect(quadtree.nodes[1].objects).toContain(topLeft)
      expect(quadtree.nodes[0].objects).toContain(topRight)
      expect(quadtree.nodes[2].objects).toContain(bottomLeft)
    })

    it('should not split beyond maxLevels', () => {
      // Create a deep quadtree with maxLevel 1
      const deepQuadtree = new Quadtree(bounds, 2, 1, 0)

      // Add nodes in the same quadrant to force them into child node
      deepQuadtree.insert(createNode(100, 100))
      deepQuadtree.insert(createNode(150, 150))
      deepQuadtree.insert(createNode(200, 200)) // Should split

      expect(deepQuadtree.nodes).toHaveLength(4)

      // Add more nodes to the same quadrant
      const topLeftQuadrant = deepQuadtree.nodes[1]
      deepQuadtree.insert(createNode(120, 120))
      deepQuadtree.insert(createNode(180, 180))
      deepQuadtree.insert(createNode(190, 190))

      // Should not split further (at max level)
      expect(topLeftQuadrant.nodes).toHaveLength(0)
      expect(topLeftQuadrant.objects.length).toBeGreaterThan(2)
    })
  })

  describe('getIndex()', () => {
    it('should return correct quadrant index', () => {
      expect(quadtree.getIndex(createNode(700, 200))).toBe(0) // Top right
      expect(quadtree.getIndex(createNode(200, 200))).toBe(1) // Top left
      expect(quadtree.getIndex(createNode(200, 700))).toBe(2) // Bottom left
      expect(quadtree.getIndex(createNode(700, 700))).toBe(3) // Bottom right
    })

    it('should return -1 for nodes on boundaries', () => {
      expect(quadtree.getIndex(createNode(500, 200))).toBe(-1) // On vertical midpoint
      expect(quadtree.getIndex(createNode(200, 500))).toBe(-1) // On horizontal midpoint
    })

    it('should use animX/animY when available', () => {
      const node = { targetX: 100, targetY: 100, animX: 700, animY: 200 }
      expect(quadtree.getIndex(node)).toBe(0) // Uses animX/animY
    })
  })

  describe('retrieve()', () => {
    it('should return all nodes when bounds cover entire tree', () => {
      const node1 = createNode(100, 100)
      const node2 = createNode(700, 700)

      quadtree.insert(node1)
      quadtree.insert(node2)

      const results = quadtree.retrieve(bounds)
      expect(results).toHaveLength(2)
      expect(results).toContain(node1)
      expect(results).toContain(node2)
    })

    it('should return empty array when bounds dont intersect', () => {
      const node1 = createNode(100, 100)
      quadtree.insert(node1)

      const searchBounds = { x: 2000, y: 2000, width: 100, height: 100 }
      const results = quadtree.retrieve(searchBounds)
      expect(results).toHaveLength(0)
    })

    it('should return nodes from specific area', () => {
      // Insert nodes in different areas
      const nodes = []
      for (let i = 0; i < 10; i++) {
        const node = createNode(i * 100, i * 100)
        nodes.push(node)
        quadtree.insert(node)
      }

      // Search top-left area
      const searchBounds = { x: 0, y: 0, width: 300, height: 300 }
      const results = quadtree.retrieve(searchBounds)

      expect(results.length).toBeGreaterThan(0)
      expect(results.length).toBeLessThan(10)

      // Should include nodes at 0,0  100,100  200,200
      expect(results).toContain(nodes[0])
      expect(results).toContain(nodes[1])
      expect(results).toContain(nodes[2])
    })

    it('should work recursively through subdivisions', () => {
      // Create enough nodes to force subdivision
      for (let i = 0; i < 20; i++) {
        quadtree.insert(createNode(Math.random() * 1000, Math.random() * 1000))
      }

      // Should have split
      expect(quadtree.nodes).toHaveLength(4)

      // Retrieve from a small area
      const searchBounds = { x: 0, y: 0, width: 250, height: 250 }
      const results = quadtree.retrieve(searchBounds)

      // Should get some results but not all
      expect(results.length).toBeGreaterThan(0)
      expect(results.length).toBeLessThan(20)
    })
  })

  describe('intersects()', () => {
    it('should detect intersecting bounds', () => {
      const testBounds = { x: 500, y: 500, width: 600, height: 600 }
      expect(quadtree.intersects(testBounds)).toBe(true)
    })

    it('should detect non-intersecting bounds', () => {
      const testBounds = { x: 1100, y: 1100, width: 100, height: 100 }
      expect(quadtree.intersects(testBounds)).toBe(false)
    })

    it('should detect touching and overlapping bounds correctly', () => {
      // Bounds that are completely outside
      const outsideBounds = { x: 1001, y: 0, width: 100, height: 100 }
      expect(quadtree.intersects(outsideBounds)).toBe(false)

      // Bounds that touch exactly at the edge (considered intersecting)
      // The quadtree uses > and < for bounds checking, so touching edges are included
      const touchingBounds = { x: 1000, y: 0, width: 100, height: 100 }
      expect(quadtree.intersects(touchingBounds)).toBe(true)

      // Bounds that overlap
      const overlappingBounds = { x: 999, y: 0, width: 100, height: 100 }
      expect(quadtree.intersects(overlappingBounds)).toBe(true)

      // Bounds completely inside
      const insideBounds = { x: 400, y: 400, width: 200, height: 200 }
      expect(quadtree.intersects(insideBounds)).toBe(true)
    })
  })

  describe('clear()', () => {
    it('should clear all objects and nodes', () => {
      // Add nodes to force split
      for (let i = 0; i < 10; i++) {
        quadtree.insert(createNode(i * 100, i * 100))
      }

      expect(quadtree.nodes).toHaveLength(4)
      expect(quadtree.objects.length).toBeGreaterThan(0)

      quadtree.clear()

      expect(quadtree.objects).toHaveLength(0)
      expect(quadtree.nodes).toHaveLength(0)
    })

    it('should recursively clear child nodes', () => {
      // Force multiple levels of subdivision
      for (let i = 0; i < 50; i++) {
        quadtree.insert(createNode(Math.random() * 1000, Math.random() * 1000))
      }

      quadtree.clear()

      // Verify complete clear
      const results = quadtree.retrieve(bounds)
      expect(results).toHaveLength(0)
    })
  })

  describe('Performance characteristics', () => {
    it('should handle large numbers of nodes efficiently', () => {
      const startInsert = performance.now()

      // Insert many nodes
      for (let i = 0; i < 1000; i++) {
        quadtree.insert(createNode(Math.random() * 1000, Math.random() * 1000))
      }

      const insertTime = performance.now() - startInsert
      expect(insertTime).toBeLessThan(100) // Should be fast

      // Test retrieval performance
      const startRetrieve = performance.now()
      const searchBounds = { x: 400, y: 400, width: 200, height: 200 }
      const results = quadtree.retrieve(searchBounds)
      const retrieveTime = performance.now() - startRetrieve

      expect(retrieveTime).toBeLessThan(10) // Should be very fast
      expect(results.length).toBeLessThan(1000) // Should not return all nodes
    })
  })
})
