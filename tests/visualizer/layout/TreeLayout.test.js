import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TreeLayout } from '../../../src/visualizer/layout/TreeLayout.js'
import { TreeNode } from '../../../src/visualizer/nodes/TreeNode.js'

describe('TreeLayout', () => {
  let layout

  beforeEach(() => {
    layout = new TreeLayout()
  })

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(layout.levelHeight).toBe(180)
      expect(layout.minNodeSpacing).toBe(220)
      expect(layout.multiRootSpacing).toBe(500)
    })

    it('should accept custom options', () => {
      const customLayout = new TreeLayout({
        levelHeight: 200,
        minNodeSpacing: 300,
        multiRootSpacing: 600
      })

      expect(customLayout.levelHeight).toBe(200)
      expect(customLayout.minNodeSpacing).toBe(300)
      expect(customLayout.multiRootSpacing).toBe(600)
    })
  })

  describe('calculateLayout()', () => {
    it('should handle empty node map', () => {
      const nodes = new Map()
      const callback = vi.fn()

      const bounds = layout.calculateLayout(nodes, callback)

      expect(callback).toHaveBeenCalled()
      expect(bounds).toBeUndefined()
    })

    it('should layout single root tree', () => {
      const root = new TreeNode({ uid: 1, componentName: 'Root' })
      const child1 = new TreeNode({ uid: 2, componentName: 'Child1' })
      const child2 = new TreeNode({ uid: 3, componentName: 'Child2' })
      const grandchild = new TreeNode({ uid: 4, componentName: 'Grandchild' })

      // Build tree structure
      root.children = [child1, child2]
      child1.parent = root
      child2.parent = root
      child1.children = [grandchild]
      grandchild.parent = child1

      const nodes = new Map([
        [1, root],
        [2, child1],
        [3, child2],
        [4, grandchild]
      ])

      const callback = vi.fn()
      layout.calculateLayout(nodes, callback)

      // Check root position
      expect(root.targetX).toBe(0)
      expect(root.targetY).toBe(0)
      expect(root.depth).toBe(0)

      // Check children positions
      expect(child1.targetX).toBe(-110) // -220/2
      expect(child1.targetY).toBe(180)
      expect(child1.depth).toBe(1)

      expect(child2.targetX).toBe(110) // 220/2
      expect(child2.targetY).toBe(180)
      expect(child2.depth).toBe(1)

      // Check grandchild position
      expect(grandchild.targetX).toBe(-110) // Inherits parent X
      expect(grandchild.targetY).toBe(360) // 2 * 180
      expect(grandchild.depth).toBe(2)

      expect(callback).toHaveBeenCalledWith(expect.any(Object))
    })

    it('should layout multiple root trees (forest)', () => {
      const root1 = new TreeNode({ uid: 1, componentName: 'Root1' })
      const root2 = new TreeNode({ uid: 2, componentName: 'Root2' })
      const root3 = new TreeNode({ uid: 3, componentName: 'Root3' })

      const nodes = new Map([
        [1, root1],
        [2, root2],
        [3, root3]
      ])

      layout.calculateLayout(nodes)

      // Check root positions are spaced correctly
      expect(root1.targetX).toBe(-500) // (0 - 1) * 500
      expect(root1.targetY).toBe(0)

      expect(root2.targetX).toBe(0) // (1 - 1) * 500
      expect(root2.targetY).toBe(0)

      expect(root3.targetX).toBe(500) // (2 - 1) * 500
      expect(root3.targetY).toBe(0)
    })

    it('should handle nodes with many children', () => {
      const root = new TreeNode({ uid: 1, componentName: 'Root' })
      const children = []

      // Create 5 children
      for (let i = 0; i < 5; i++) {
        const child = new TreeNode({ uid: i + 2, componentName: `Child${i}` })
        child.parent = root
        children.push(child)
      }
      root.children = children

      const nodes = new Map([[1, root], ...children.map(c => [c.uid, c])])

      layout.calculateLayout(nodes)

      // Check children are evenly spaced
      const expectedSpacing = 220
      const totalWidth = (children.length - 1) * expectedSpacing
      const startX = -totalWidth / 2

      children.forEach((child, index) => {
        expect(child.targetX).toBe(startX + index * expectedSpacing)
        expect(child.targetY).toBe(180)
      })
    })
  })

  describe('_calculateBounds()', () => {
    it('should return zero bounds for empty array', () => {
      const bounds = layout._calculateBounds([])

      expect(bounds).toEqual({
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0
      })
    })

    it('should calculate correct bounds for nodes', () => {
      const nodes = [
        { targetX: -200, targetY: 0, width: 100, height: 50 },
        { targetX: 200, targetY: 180, width: 100, height: 50 },
        { targetX: 0, targetY: 360, width: 100, height: 50 }
      ]

      const bounds = layout._calculateBounds(nodes)

      expect(bounds.minX).toBe(-250) // -200 - 50
      expect(bounds.maxX).toBe(250) // 200 + 50
      expect(bounds.minY).toBe(-25) // 0 - 25
      expect(bounds.maxY).toBe(385) // 360 + 25
      expect(bounds.width).toBe(500)
      expect(bounds.height).toBe(410)
    })
  })

  describe('calculateFitZoom()', () => {
    it('should calculate zoom to fit bounds in viewport', () => {
      const bounds = {
        minX: -500,
        minY: -200,
        maxX: 500,
        maxY: 600,
        width: 1000,
        height: 800
      }

      const zoom = layout.calculateFitZoom(bounds, 800, 600)

      // With 100px padding: tree = 1200x1000, viewport = 800x600
      // zoomX = 800/1200 = 0.667, zoomY = 600/1000 = 0.6
      expect(zoom).toBeCloseTo(0.6)
    })

    it('should respect max zoom limit', () => {
      const bounds = {
        minX: -50,
        minY: -50,
        maxX: 50,
        maxY: 50,
        width: 100,
        height: 100
      }

      const zoom = layout.calculateFitZoom(bounds, 800, 600, 100, 1.2)

      // Would calculate to ~2.0, but limited to 1.2
      expect(zoom).toBe(1.2)
    })

    it('should handle custom padding', () => {
      const bounds = {
        minX: -100,
        minY: -100,
        maxX: 100,
        maxY: 100,
        width: 200,
        height: 200
      }

      const zoom = layout.calculateFitZoom(bounds, 600, 600, 200)

      // With 200px padding: tree = 600x600, viewport = 600x600
      expect(zoom).toBe(1)
    })
  })

  describe('calculateCameraPosition()', () => {
    it('should center the tree in viewport', () => {
      const bounds = {
        minX: -200,
        minY: 0,
        maxX: 200,
        maxY: 400
      }

      const camera = layout.calculateCameraPosition(bounds, 800, 600, 1)

      // Tree center is at (0, 200)
      // Camera should position tree center at viewport center (400, 300)
      expect(camera.x).toBe(400) // 800/2 - 0*1
      expect(camera.y).toBe(100) // 600/2 - 200*1
    })

    it('should account for zoom level', () => {
      const bounds = {
        minX: -100,
        minY: -100,
        maxX: 100,
        maxY: 100
      }

      const camera = layout.calculateCameraPosition(bounds, 800, 600, 2)

      // Tree center is at (0, 0)
      // With zoom 2, camera should be at (400, 300)
      expect(camera.x).toBe(400) // 800/2 - 0*2
      expect(camera.y).toBe(300) // 600/2 - 0*2
    })

    it('should handle off-center trees', () => {
      const bounds = {
        minX: 100,
        minY: 100,
        maxX: 300,
        maxY: 300
      }

      const camera = layout.calculateCameraPosition(bounds, 800, 600, 1)

      // Tree center is at (200, 200)
      expect(camera.x).toBe(200) // 800/2 - 200*1
      expect(camera.y).toBe(100) // 600/2 - 200*1
    })
  })

  describe('updateSettings()', () => {
    it('should update level height', () => {
      layout.updateSettings({ levelHeight: 250 })
      expect(layout.levelHeight).toBe(250)
    })

    it('should update min node spacing', () => {
      layout.updateSettings({ minNodeSpacing: 300 })
      expect(layout.minNodeSpacing).toBe(300)
    })

    it('should update multi root spacing', () => {
      layout.updateSettings({ multiRootSpacing: 700 })
      expect(layout.multiRootSpacing).toBe(700)
    })

    it('should update multiple settings at once', () => {
      layout.updateSettings({
        levelHeight: 200,
        minNodeSpacing: 250,
        multiRootSpacing: 600
      })

      expect(layout.levelHeight).toBe(200)
      expect(layout.minNodeSpacing).toBe(250)
      expect(layout.multiRootSpacing).toBe(600)
    })

    it('should ignore undefined settings', () => {
      const originalHeight = layout.levelHeight
      const originalSpacing = layout.minNodeSpacing

      layout.updateSettings({
        levelHeight: undefined,
        minNodeSpacing: undefined
      })

      expect(layout.levelHeight).toBe(originalHeight)
      expect(layout.minNodeSpacing).toBe(originalSpacing)
    })
  })

  describe('Complex tree scenarios', () => {
    it('should handle deep trees', () => {
      const nodes = new Map()
      let current = null
      let parent = null

      // Create a deep tree (10 levels)
      for (let i = 0; i < 10; i++) {
        current = new TreeNode({ uid: i, componentName: `Level${i}` })
        nodes.set(i, current)

        if (parent) {
          current.parent = parent
          parent.children = [current]
        }
        parent = current
      }

      layout.calculateLayout(nodes)

      // Check depths and Y positions
      nodes.forEach((node, uid) => {
        expect(node.depth).toBe(uid)
        expect(node.targetY).toBe(uid * 180)
        expect(node.targetX).toBe(0) // All in a straight line
      })
    })

    it('should handle unbalanced trees', () => {
      const root = new TreeNode({ uid: 1, componentName: 'Root' })
      const leftChild = new TreeNode({ uid: 2, componentName: 'Left' })
      const rightChild = new TreeNode({ uid: 3, componentName: 'Right' })
      const deepChild = new TreeNode({ uid: 4, componentName: 'Deep' })
      const deeperChild = new TreeNode({ uid: 5, componentName: 'Deeper' })

      // Create unbalanced tree
      root.children = [leftChild, rightChild]
      leftChild.parent = root
      rightChild.parent = root

      rightChild.children = [deepChild]
      deepChild.parent = rightChild

      deepChild.children = [deeperChild]
      deeperChild.parent = deepChild

      const nodes = new Map([
        [1, root],
        [2, leftChild],
        [3, rightChild],
        [4, deepChild],
        [5, deeperChild]
      ])

      layout.calculateLayout(nodes)

      // Check that all nodes are positioned correctly
      expect(root.depth).toBe(0)
      expect(leftChild.depth).toBe(1)
      expect(rightChild.depth).toBe(1)
      expect(deepChild.depth).toBe(2)
      expect(deeperChild.depth).toBe(3)

      // Check Y positions follow depth
      expect(root.targetY).toBe(0)
      expect(leftChild.targetY).toBe(180)
      expect(rightChild.targetY).toBe(180)
      expect(deepChild.targetY).toBe(360)
      expect(deeperChild.targetY).toBe(540)
    })
  })
})
