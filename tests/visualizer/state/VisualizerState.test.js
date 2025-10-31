import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VisualizerState } from '../../../src/visualizer/state/VisualizerState.js'
import { TreeNode } from '../../../src/visualizer/nodes/TreeNode.js'
import { MemoryManager } from '../../../src/visualizer/memory/MemoryManager.js'

describe('VisualizerState', () => {
  let state

  beforeEach(() => {
    state = new VisualizerState()
  })

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(state.nodes).toBeInstanceOf(Map)
      expect(state.nodes.size).toBe(0)
      expect(state.rootNode).toBe(null)
      expect(state.selectedNode).toBe(null)
      expect(state.hoveredNode).toBe(null)

      expect(state.camera).toEqual({
        x: 0,
        y: 0,
        zoom: 1,
        targetZoom: 1
      })

      expect(state.mouse).toEqual({
        x: 0,
        y: 0,
        dragStart: null
      })

      expect(state.settings).toEqual({
        viewportCulling: true,
        lodRendering: true,
        showMetrics: true,
        performanceMode: true,
        quality: 2,
        clusterAsync: false
      })

      expect(state.stats).toEqual({
        visibleNodes: 0,
        renderedNodes: 0,
        culledNodes: 0,
        fps: 60,
        memory: 0
      })

      expect(state.quadtree).toBe(null)
      expect(state.memoryManager).toBeInstanceOf(MemoryManager)
      expect(state.asyncClusters).toBeInstanceOf(Map)
    })
  })

  describe('addNode()', () => {
    it('should add a node to the state', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })

      state.addNode(1, node)

      expect(state.nodes.has(1)).toBe(true)
      expect(state.nodes.get(1)).toBe(node)
    })

    it('should set root node if first parentless node', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Root' })

      state.addNode(1, node)

      expect(state.rootNode).toBe(node)
    })

    it('should not change root node if already set', () => {
      const root1 = new TreeNode({ uid: 1, componentName: 'Root1' })
      const root2 = new TreeNode({ uid: 2, componentName: 'Root2' })

      state.addNode(1, root1)
      state.addNode(2, root2)

      expect(state.rootNode).toBe(root1)
    })

    it('should not set root node for child nodes', () => {
      const parent = new TreeNode({ uid: 1, componentName: 'Parent' })
      const child = new TreeNode({ uid: 2, componentName: 'Child' })
      child.parent = parent

      state.addNode(2, child)

      expect(state.rootNode).toBe(null)
    })
  })

  describe('removeNode()', () => {
    it('should remove a node from the state', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })
      state.addNode(1, node)

      state.removeNode(1)

      expect(state.nodes.has(1)).toBe(false)
    })

    it('should handle removing non-existent node', () => {
      expect(() => state.removeNode(999)).not.toThrow()
    })

    it('should update root node if removed', () => {
      const root1 = new TreeNode({ uid: 1, componentName: 'Root1' })
      const root2 = new TreeNode({ uid: 2, componentName: 'Root2' })

      state.addNode(1, root1)
      state.addNode(2, root2)

      state.removeNode(1)

      expect(state.rootNode).toBe(root2)
    })

    it('should clear root node if last parentless node removed', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Root' })
      state.addNode(1, node)

      state.removeNode(1)

      expect(state.rootNode).toBe(null)
    })

    it('should clear selected node if removed', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })
      state.addNode(1, node)
      state.selectNode(node)

      state.removeNode(1)

      expect(state.selectedNode).toBe(null)
    })

    it('should clear hovered node if removed', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })
      state.addNode(1, node)
      state.setHoveredNode(node)

      state.removeNode(1)

      expect(state.hoveredNode).toBe(null)
    })
  })

  describe('getNode()', () => {
    it('should get node by numeric UID', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })
      state.addNode(1, node)

      expect(state.getNode(1)).toBe(node)
    })

    it('should get node by string UID', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })
      state.addNode(1, node)

      expect(state.getNode('1')).toBe(node)
    })

    it('should return null for non-existent node', () => {
      expect(state.getNode(999)).toBe(null)
    })

    it('should handle string UIDs in map', () => {
      const node = new TreeNode({ uid: 'abc', componentName: 'Test' })
      state.addNode('abc', node)

      expect(state.getNode('abc')).toBe(node)
    })
  })

  describe('clearNodes()', () => {
    it('should clear all nodes and references', () => {
      const node1 = new TreeNode({ uid: 1, componentName: 'Node1' })
      const node2 = new TreeNode({ uid: 2, componentName: 'Node2' })

      state.addNode(1, node1)
      state.addNode(2, node2)
      state.selectNode(node1)
      state.setHoveredNode(node2)
      state.asyncClusters.set('cluster1', [node1])

      state.clearNodes()

      expect(state.nodes.size).toBe(0)
      expect(state.rootNode).toBe(null)
      expect(state.selectedNode).toBe(null)
      expect(state.hoveredNode).toBe(null)
      expect(state.asyncClusters.size).toBe(0)
    })
  })

  describe('selectNode()', () => {
    it('should select a node', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })

      state.selectNode(node)

      expect(state.selectedNode).toBe(node)
      expect(node.selected).toBe(true)
    })

    it('should deselect previous node', () => {
      const node1 = new TreeNode({ uid: 1, componentName: 'Node1' })
      const node2 = new TreeNode({ uid: 2, componentName: 'Node2' })

      state.selectNode(node1)
      state.selectNode(node2)

      expect(node1.selected).toBe(false)
      expect(node2.selected).toBe(true)
      expect(state.selectedNode).toBe(node2)
    })

    it('should handle selecting null', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })
      state.selectNode(node)

      state.selectNode(null)

      expect(state.selectedNode).toBe(null)
      expect(node.selected).toBe(false)
    })
  })

  describe('setHoveredNode()', () => {
    it('should set hovered node', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })

      state.setHoveredNode(node)

      expect(state.hoveredNode).toBe(node)
      expect(node.hovering).toBe(true)
    })

    it('should clear previous hover', () => {
      const node1 = new TreeNode({ uid: 1, componentName: 'Node1' })
      const node2 = new TreeNode({ uid: 2, componentName: 'Node2' })

      state.setHoveredNode(node1)
      state.setHoveredNode(node2)

      expect(node1.hovering).toBe(false)
      expect(node2.hovering).toBe(true)
      expect(state.hoveredNode).toBe(node2)
    })

    it('should handle hovering null', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })
      state.setHoveredNode(node)

      state.setHoveredNode(null)

      expect(state.hoveredNode).toBe(null)
      expect(node.hovering).toBe(false)
    })

    it('should not clear hover if same node', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })

      state.setHoveredNode(node)
      state.setHoveredNode(node)

      expect(node.hovering).toBe(true)
    })
  })

  describe('updateCamera()', () => {
    it('should update camera position', () => {
      state.updateCamera({ x: 100, y: 200 })

      expect(state.camera.x).toBe(100)
      expect(state.camera.y).toBe(200)
    })

    it('should update zoom levels', () => {
      state.updateCamera({ zoom: 1.5, targetZoom: 2 })

      expect(state.camera.zoom).toBe(1.5)
      expect(state.camera.targetZoom).toBe(2)
    })

    it('should update only provided properties', () => {
      state.camera = { x: 10, y: 20, zoom: 1, targetZoom: 1 }

      state.updateCamera({ x: 50 })

      expect(state.camera).toEqual({
        x: 50,
        y: 20,
        zoom: 1,
        targetZoom: 1
      })
    })
  })

  describe('updateMouse()', () => {
    it('should update mouse position', () => {
      state.updateMouse({ x: 100, y: 200 })

      expect(state.mouse.x).toBe(100)
      expect(state.mouse.y).toBe(200)
    })

    it('should update drag start', () => {
      const dragStart = { x: 50, y: 50 }
      state.updateMouse({ dragStart })

      expect(state.mouse.dragStart).toBe(dragStart)
    })

    it('should clear drag start with null', () => {
      state.mouse.dragStart = { x: 10, y: 10 }

      state.updateMouse({ dragStart: null })

      expect(state.mouse.dragStart).toBe(null)
    })
  })

  describe('updateSettings()', () => {
    it('should update settings', () => {
      state.updateSettings({
        viewportCulling: false,
        quality: 3
      })

      expect(state.settings.viewportCulling).toBe(false)
      expect(state.settings.quality).toBe(3)
      expect(state.settings.lodRendering).toBe(true) // Unchanged
    })

    it('should handle empty settings', () => {
      const originalSettings = { ...state.settings }

      state.updateSettings({})

      expect(state.settings).toEqual(originalSettings)
    })
  })

  describe('updateStats()', () => {
    it('should update stats', () => {
      state.updateStats({
        visibleNodes: 10,
        fps: 45,
        memory: 128.5
      })

      expect(state.stats.visibleNodes).toBe(10)
      expect(state.stats.fps).toBe(45)
      expect(state.stats.memory).toBe(128.5)
      expect(state.stats.renderedNodes).toBe(0) // Unchanged
    })
  })

  describe('getRootNodes()', () => {
    it('should return all root nodes', () => {
      const root1 = new TreeNode({ uid: 1, componentName: 'Root1' })
      const root2 = new TreeNode({ uid: 2, componentName: 'Root2' })
      const child = new TreeNode({ uid: 3, componentName: 'Child' })
      child.parent = root1

      state.addNode(1, root1)
      state.addNode(2, root2)
      state.addNode(3, child)

      const roots = state.getRootNodes()

      expect(roots).toHaveLength(2)
      expect(roots).toContain(root1)
      expect(roots).toContain(root2)
      expect(roots).not.toContain(child)
    })

    it('should return empty array when no nodes', () => {
      expect(state.getRootNodes()).toEqual([])
    })
  })

  describe('getNodesArray()', () => {
    it('should return all nodes as array', () => {
      const node1 = new TreeNode({ uid: 1, componentName: 'Node1' })
      const node2 = new TreeNode({ uid: 2, componentName: 'Node2' })

      state.addNode(1, node1)
      state.addNode(2, node2)

      const nodes = state.getNodesArray()

      expect(nodes).toHaveLength(2)
      expect(nodes).toContain(node1)
      expect(nodes).toContain(node2)
    })

    it('should return empty array when no nodes', () => {
      expect(state.getNodesArray()).toEqual([])
    })
  })

  describe('Memory management', () => {
    it('should check if memory pruning needed', () => {
      state.memoryManager.shouldPrune = vi.fn(() => true)

      expect(state.shouldPruneMemory()).toBe(true)
      expect(state.memoryManager.shouldPrune).toHaveBeenCalled()
    })

    it('should prune memory', () => {
      state.memoryManager.pruneNodes = vi.fn()

      state.pruneMemory()

      expect(state.memoryManager.pruneNodes).toHaveBeenCalledWith(state.nodes)
    })
  })

  describe('getSummary()', () => {
    it('should return state summary', () => {
      const node1 = new TreeNode({ uid: 1, componentName: 'Node1' })
      const node2 = new TreeNode({ uid: 2, componentName: 'Node2' })

      state.addNode(1, node1)
      state.addNode(2, node2)
      state.selectNode(node1)
      state.setHoveredNode(node2)
      state.updateCamera({ x: 100, y: 200 })
      state.updateStats({ fps: 55 })

      const summary = state.getSummary()

      expect(summary).toEqual({
        nodeCount: 2,
        hasRootNode: true,
        selectedNode: 'Node1',
        hoveredNode: 'Node2',
        camera: {
          x: 100,
          y: 200,
          zoom: 1,
          targetZoom: 1
        },
        settings: state.settings,
        stats: {
          ...state.stats,
          fps: 55
        }
      })
    })

    it('should handle null selected/hovered nodes', () => {
      const summary = state.getSummary()

      expect(summary.selectedNode).toBe(null)
      expect(summary.hoveredNode).toBe(null)
    })
  })
})
