/* global MouseEvent, WheelEvent */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CanvasRenderer } from '../../../src/visualizer/rendering/CanvasRenderer.js'
import { TreeNode } from '../../../src/visualizer/nodes/TreeNode.js'
import { Quadtree } from '../../../src/visualizer/spatial/Quadtree.js'

describe('CanvasRenderer', () => {
  let renderer
  let container
  let mockState
  let mockCanvas
  let mockCtx
  let rafCallbacks = []

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn(cb => {
    rafCallbacks.push(cb)
    return rafCallbacks.length
  })

  global.cancelAnimationFrame = vi.fn(id => {
    rafCallbacks[id - 1] = null
  })

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = ''
    rafCallbacks = []

    // Create container with canvas
    container = document.createElement('div')
    mockCanvas = document.createElement('canvas')
    mockCanvas.id = 'vri-canvas'
    container.appendChild(mockCanvas)
    document.body.appendChild(container)

    // Mock canvas context
    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      shadowBlur: 0,
      shadowColor: '',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn()
    }

    mockCanvas.getContext = vi.fn(() => mockCtx)
    mockCanvas.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 600,
      left: 0,
      top: 0
    }))

    // Create mock state
    mockState = {
      nodes: new Map(),
      camera: {
        x: 0,
        y: 0,
        zoom: 1,
        targetZoom: 1
      },
      mouse: {
        x: 0,
        y: 0,
        dragStart: null
      },
      settings: {
        viewportCulling: true,
        lodRendering: true,
        showMetrics: true,
        quality: 2
      },
      stats: {
        fps: 60,
        memory: 0,
        visibleNodes: 0,
        culledNodes: 0
      },
      quadtree: null,
      hoveredNode: null
    }

    renderer = new CanvasRenderer(container, mockState)
  })

  afterEach(() => {
    if (renderer) {
      renderer.destroy()
    }
  })

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(renderer.container).toBe(container)
      expect(renderer.state).toBe(mockState)
      expect(renderer.canvas).toBe(null)
      expect(renderer.ctx).toBe(null)
      expect(renderer.animationId).toBe(null)
      expect(renderer.frameCount).toBe(0)
      expect(renderer.lastCanvasWidth).toBe(0)
      expect(renderer.lastCanvasHeight).toBe(0)
      expect(renderer.lastDpr).toBe(0)
    })
  })

  describe('initialize()', () => {
    it('should setup canvas and context', () => {
      renderer.initialize()

      expect(renderer.canvas).toBe(mockCanvas)
      expect(renderer.ctx).toBe(mockCtx)
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d', { alpha: false })
    })

    it('should start render loop', () => {
      renderer.initialize()

      expect(global.requestAnimationFrame).toHaveBeenCalled()
      expect(renderer.animationId).toBeTruthy()
    })

    it('should handle missing canvas element', () => {
      container.removeChild(mockCanvas)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderer.initialize()

      expect(consoleSpy).toHaveBeenCalledWith('[CanvasRenderer] Canvas element not found')
      expect(renderer.canvas).toBe(null)

      consoleSpy.mockRestore()
    })
  })

  describe('setupCanvas()', () => {
    it('should set canvas dimensions based on quality setting', () => {
      renderer.canvas = mockCanvas
      renderer.ctx = mockCtx

      // Test quality level 2 (medium)
      mockState.settings.quality = 2
      global.devicePixelRatio = 2

      renderer.setupCanvas()

      expect(mockCanvas.width).toBe(1200) // 800 * 1.5
      expect(mockCanvas.height).toBe(900) // 600 * 1.5
      expect(mockCanvas.style.width).toBe('800px')
      expect(mockCanvas.style.height).toBe('600px')
      expect(mockCtx.scale).toHaveBeenCalledWith(1.5, 1.5)
    })

    it('should not update if dimensions unchanged', () => {
      renderer.canvas = mockCanvas
      renderer.ctx = mockCtx

      // First call
      renderer.setupCanvas()
      const firstCallCount = mockCtx.scale.mock.calls.length

      // Set last values to current
      renderer.lastCanvasWidth = mockCanvas.width
      renderer.lastCanvasHeight = mockCanvas.height
      renderer.lastDpr = 1.5

      // Second call with same dimensions
      renderer.setupCanvas()

      expect(mockCtx.scale).toHaveBeenCalledTimes(firstCallCount)
    })
  })

  describe('getVisibleNodes()', () => {
    let node1, node2, node3

    beforeEach(() => {
      renderer.canvas = mockCanvas

      // Create test nodes
      node1 = new TreeNode({ uid: 1, componentName: 'Node1' })
      node1.targetX = 0
      node1.targetY = 0
      node1.width = 100
      node1.height = 50

      node2 = new TreeNode({ uid: 2, componentName: 'Node2' })
      node2.targetX = 1000 // Outside viewport
      node2.targetY = 1000
      node2.width = 100
      node2.height = 50

      node3 = new TreeNode({ uid: 3, componentName: 'Node3' })
      node3.targetX = 200
      node3.targetY = 100
      node3.width = 100
      node3.height = 50

      mockState.nodes.set(1, node1)
      mockState.nodes.set(2, node2)
      mockState.nodes.set(3, node3)
    })

    it('should return all nodes when viewport culling disabled', () => {
      mockState.settings.viewportCulling = false

      const visible = renderer.getVisibleNodes()

      expect(visible).toHaveLength(3)
      expect(visible).toContain(node1)
      expect(visible).toContain(node2)
      expect(visible).toContain(node3)
    })

    it('should return only visible nodes when viewport culling enabled', () => {
      mockState.settings.viewportCulling = true
      global.devicePixelRatio = 1

      const visible = renderer.getVisibleNodes()

      expect(visible).toHaveLength(2)
      expect(visible).toContain(node1)
      expect(visible).toContain(node3)
      expect(visible).not.toContain(node2) // Outside viewport
    })

    it('should use quadtree when available', () => {
      mockState.settings.viewportCulling = true
      mockState.quadtree = new Quadtree({ x: -1000, y: -1000, width: 2000, height: 2000 })
      mockState.quadtree.retrieve = vi.fn(() => [node1, node3])

      const visible = renderer.getVisibleNodes()

      expect(mockState.quadtree.retrieve).toHaveBeenCalled()
      expect(visible).toHaveLength(2)
    })
  })

  describe('getNodeLOD()', () => {
    it('should return correct LOD based on zoom level', () => {
      mockState.settings.lodRendering = true

      expect(renderer.getNodeLOD(0.2)).toBe('minimal')
      expect(renderer.getNodeLOD(0.4)).toBe('basic')
      expect(renderer.getNodeLOD(0.7)).toBe('standard')
      expect(renderer.getNodeLOD(1.0)).toBe('full')
    })

    it('should return full when LOD rendering disabled', () => {
      mockState.settings.lodRendering = false

      expect(renderer.getNodeLOD(0.2)).toBe('full')
      expect(renderer.getNodeLOD(0.5)).toBe('full')
      expect(renderer.getNodeLOD(1.0)).toBe('full')
    })
  })

  describe('Node drawing methods', () => {
    let node

    beforeEach(() => {
      renderer.ctx = mockCtx
      node = new TreeNode({ uid: 1, componentName: 'TestNode' })
      node.getColor = vi.fn(() => '#42b883')
      node.getUnnecessaryPercent = vi.fn(() => 30)
      node.renderAnalysis.totalRenders = 10
      node.renderAnalysis.unnecessaryRenders = 3
      node.renderAnalysis.avgRenderTime = 5.5
    })

    it('should draw minimal node', () => {
      renderer.drawNodeMinimal(node, 100, 100)

      expect(mockCtx.fillStyle).toBe('#42b883')
      expect(mockCtx.beginPath).toHaveBeenCalled()
      expect(mockCtx.arc).toHaveBeenCalledWith(100, 100, 5, 0, Math.PI * 2)
      expect(mockCtx.fill).toHaveBeenCalled()
    })

    it('should draw basic node', () => {
      renderer.drawNodeBasic(node, 100, 100)

      expect(mockCtx.fillRect).toHaveBeenCalledWith(60, 85, 80, 30)
      expect(mockCtx.strokeStyle).toBe('#42b883')
      expect(mockCtx.strokeRect).toHaveBeenCalledWith(60, 85, 80, 30)
    })

    it('should draw standard node with name', () => {
      renderer.drawNodeStandard(node, 100, 100)

      expect(mockCtx.fillText).toHaveBeenCalledWith('TestNode', 100, 100)
      expect(mockCtx.textAlign).toBe('center')
      expect(mockCtx.textBaseline).toBe('middle')
    })

    it('should truncate long names in standard view', () => {
      node.componentName = 'VeryLongComponentNameThatShouldBeTruncated'

      renderer.drawNodeStandard(node, 100, 100)

      expect(mockCtx.fillText).toHaveBeenCalledWith('VeryLongCo...', 100, 100)
    })

    it('should draw full node with metrics', () => {
      mockState.settings.showMetrics = true
      node.selected = true

      renderer.drawNodeFull(node, 100, 100)

      expect(mockCtx.shadowBlur).toBe(0) // Reset after drawing
      expect(mockCtx.fillText).toHaveBeenCalledWith('TestNode', 100, expect.any(Number))
      expect(mockCtx.fillText).toHaveBeenCalledWith('Renders: 10', 100, expect.any(Number))
      expect(mockCtx.fillText).toHaveBeenCalledWith('Unnecessary: 3 (30%)', 100, expect.any(Number))
      expect(mockCtx.fillText).toHaveBeenCalledWith('Avg: 5.5ms', 100, expect.any(Number))
    })
  })

  describe('drawConnection()', () => {
    let fromNode, toNode

    beforeEach(() => {
      renderer.ctx = mockCtx

      fromNode = new TreeNode({ uid: 1, componentName: 'Parent' })
      fromNode.targetX = 100
      fromNode.targetY = 100
      fromNode.height = 50

      toNode = new TreeNode({ uid: 2, componentName: 'Child' })
      toNode.targetX = 100
      toNode.targetY = 200
      toNode.height = 50
    })

    it('should draw straight line for minimal/basic LOD', () => {
      renderer.drawConnection(fromNode, toNode, 'minimal')

      expect(mockCtx.strokeStyle).toBe('rgba(255, 255, 255, 0.1)')
      expect(mockCtx.lineWidth).toBe(1)
      expect(mockCtx.moveTo).toHaveBeenCalledWith(100, 125)
      expect(mockCtx.lineTo).toHaveBeenCalledWith(100, 175)
    })

    it('should draw bezier curve for standard/full LOD', () => {
      renderer.drawConnection(fromNode, toNode, 'full')

      expect(mockCtx.strokeStyle).toBe('rgba(255, 255, 255, 0.2)')
      expect(mockCtx.lineWidth).toBe(2)
      expect(mockCtx.bezierCurveTo).toHaveBeenCalled()
    })
  })

  describe('Mouse event handling', () => {
    beforeEach(() => {
      renderer.canvas = mockCanvas
      renderer.ctx = mockCtx
      renderer.initialize()
    })

    it('should handle mouse down for dragging', () => {
      const event = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100
      })

      mockCanvas.dispatchEvent(event)

      expect(mockState.mouse.dragStart).toEqual({
        x: 100,
        y: 100
      })
      expect(mockCanvas.style.cursor).toBe('grabbing')
    })

    it('should handle mouse move for dragging', () => {
      mockState.mouse.dragStart = { x: 100, y: 100 }

      const event = new MouseEvent('mousemove', {
        clientX: 150,
        clientY: 120
      })

      mockCanvas.dispatchEvent(event)

      expect(mockState.camera.x).toBe(50)
      expect(mockState.camera.y).toBe(20)
    })

    it('should detect node hover', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })
      node.targetX = 100
      node.targetY = 100
      node.width = 100
      node.height = 50
      mockState.nodes.set(1, node)

      renderer.getVisibleNodes = vi.fn(() => [node])

      const event = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 100
      })

      mockCanvas.dispatchEvent(event)

      expect(node.hovering).toBe(true)
      expect(mockCanvas.style.cursor).toBe('pointer')
    })

    it('should handle wheel for zoom', () => {
      const event = new WheelEvent('wheel', {
        deltaY: -100
      })

      event.preventDefault = vi.fn()

      mockCanvas.dispatchEvent(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockState.camera.targetZoom).toBeCloseTo(1.1)
    })
  })

  describe('Render loop', () => {
    beforeEach(() => {
      renderer.canvas = mockCanvas
      renderer.ctx = mockCtx
      renderer.initialize()
    })

    it('should update FPS every 30 frames', () => {
      // Mock performance.now
      let currentTime = 0
      performance.now = vi.fn(() => currentTime)

      // Simulate 30 frames
      for (let i = 0; i < 30; i++) {
        currentTime += 16.67 // ~60 FPS
        renderer.frameCount = i
        renderer.render(currentTime)
      }

      expect(mockState.stats.fps).toBe(60)
    })

    it('should update memory stats when performance.memory available', () => {
      // Mock performance.memory (lines 235-236)
      const originalMemory = performance.memory
      performance.memory = {
        usedJSHeapSize: 50 * 1048576 // 50 MB in bytes
      }

      let currentTime = 0
      performance.now = vi.fn(() => currentTime)

      // Simulate 30 frames to trigger stats update
      for (let i = 0; i < 30; i++) {
        currentTime += 16.67
        renderer.frameCount = i
        renderer.render(currentTime)
      }

      expect(mockState.stats.memory).toBe('50.0')

      // Cleanup
      performance.memory = originalMemory
    })

    it('should animate camera zoom smoothly', () => {
      mockState.camera.zoom = 1
      mockState.camera.targetZoom = 2

      renderer.render(performance.now())

      expect(mockState.camera.zoom).toBeCloseTo(1.1)
      expect(mockState.camera.zoom).toBeLessThan(2)
    })

    it('should animate node positions', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })
      node.targetX = 100
      node.targetY = 100
      node.animX = 50
      node.animY = 50
      mockState.nodes.set(1, node)

      renderer.getVisibleNodes = vi.fn(() => [node])

      renderer.render(performance.now())

      expect(node.animX).toBeCloseTo(57.5) // 50 + (100-50) * 0.15
      expect(node.animY).toBeCloseTo(57.5)
    })

    it('should render node with minimal LOD at low zoom', () => {
      // Test lines 298-299 (minimal case in switch statement)
      const node = new TreeNode({ uid: 1, componentName: 'Test' })
      node.targetX = 100
      node.targetY = 100
      node.width = 100
      node.height = 50
      node.getColor = vi.fn(() => '#42b883')
      mockState.nodes.set(1, node)

      // Set zoom to trigger minimal LOD
      mockState.camera.zoom = 0.2
      mockState.settings.lodRendering = true

      renderer.getVisibleNodes = vi.fn(() => [node])
      renderer.drawNodeMinimal = vi.fn()

      renderer.render(performance.now())

      // Verify minimal LOD drawing was called
      expect(renderer.drawNodeMinimal).toHaveBeenCalledWith(
        node,
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should render node with basic LOD at medium-low zoom', () => {
      // Test lines 301-302 (basic case in switch statement)
      const node = new TreeNode({ uid: 1, componentName: 'Test' })
      node.targetX = 100
      node.targetY = 100
      node.width = 100
      node.height = 50
      node.getColor = vi.fn(() => '#42b883')
      mockState.nodes.set(1, node)

      // Set zoom to trigger basic LOD
      mockState.camera.zoom = 0.4
      mockState.settings.lodRendering = true

      renderer.getVisibleNodes = vi.fn(() => [node])
      renderer.drawNodeBasic = vi.fn()

      renderer.render(performance.now())

      // Verify basic LOD drawing was called
      expect(renderer.drawNodeBasic).toHaveBeenCalledWith(
        node,
        expect.any(Number),
        expect.any(Number)
      )
    })
  })

  describe('Lifecycle methods', () => {
    it('should start render loop', () => {
      renderer.start()

      expect(global.requestAnimationFrame).toHaveBeenCalled()
      expect(renderer.animationId).toBeTruthy()
    })

    it('should stop render loop', () => {
      renderer.animationId = 123

      renderer.stop()

      expect(global.cancelAnimationFrame).toHaveBeenCalledWith(123)
      expect(renderer.animationId).toBe(null)
    })

    it('should cleanup on destroy', () => {
      renderer.initialize()
      const removeListenerSpy = vi.spyOn(window, 'removeEventListener')

      renderer.destroy()

      expect(renderer.animationId).toBe(null)
      expect(removeListenerSpy).toHaveBeenCalled()
    })
  })

  describe('Callbacks', () => {
    beforeEach(() => {
      renderer.canvas = mockCanvas
      renderer.ctx = mockCtx
      renderer.initialize()
    })

    it('should call onNodeHover callback', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })
      node.targetX = 100
      node.targetY = 100
      node.width = 100
      node.height = 50
      mockState.nodes.set(1, node)

      renderer.getVisibleNodes = vi.fn(() => [node])
      renderer.onNodeHover = vi.fn()

      const event = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 100
      })

      mockCanvas.dispatchEvent(event)

      expect(renderer.onNodeHover).toHaveBeenCalledWith(node)
    })

    it('should call onNodeClick callback', () => {
      const node = new TreeNode({ uid: 1, componentName: 'Test' })
      mockState.hoveredNode = node

      renderer.onNodeClick = vi.fn()

      mockCanvas.dispatchEvent(new MouseEvent('click'))

      expect(renderer.onNodeClick).toHaveBeenCalledWith(node)
    })
  })
})
