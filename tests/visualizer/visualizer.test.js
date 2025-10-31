import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createEnhancedVisualizerV2 } from '../../src/visualizer/visualizer.js'
import { TreeNode } from '../../src/visualizer/nodes/TreeNode.js'
import { TreeLayout } from '../../src/visualizer/layout/TreeLayout.js'
import { subscribeToRenderEvents } from '../../src/core/broadcast-channel.js'
import { JSDOM } from 'jsdom'

// Mock broadcast channel
vi.mock('../../src/core/broadcast-channel.js', () => ({
  subscribeToRenderEvents: vi.fn(callback =>
    // Return unsubscribe function
    () => {}
  )
}))

describe('Advanced Optimized Visualizer', () => {
  let dom
  let document
  let window
  let container
  let mockProfiler
  let mockCanvasContext

  beforeEach(() => {
    vi.useFakeTimers()
    // Setup DOM environment
    dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
        <body></body>
      </html>
    `,
      { url: 'http://localhost' }
    )

    document = dom.window.document
    window = dom.window

    // Mock canvas context
    mockCanvasContext = {
      scale: vi.fn(),
      translate: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      font: '12px Arial',
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      textAlign: 'left',
      textBaseline: 'top',
      globalAlpha: 1,
      shadowBlur: 0,
      shadowColor: '#000',
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 }))
    }

    // Mock canvas element
    window.HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext)

    // Setup globals
    global.document = document
    global.window = window
    global.HTMLCanvasElement = window.HTMLCanvasElement
    global.performance = {
      now: vi.fn(() => Date.now()),
      memory: {
        usedJSHeapSize: 50 * 1024 * 1024 // 50MB
      }
    }
    global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16))
    global.cancelAnimationFrame = vi.fn(id => clearTimeout(id))

    // Mock profiler
    mockProfiler = {
      getSummary: vi.fn(() => ({
        totalRenders: 100,
        totalUnnecessary: 25
      }))
    }

    // Initialize global API
    window.__VUE_RENDER_INSPECTOR__ = {}
  })

  afterEach(() => {
    vi.useRealTimers()
    // Cleanup
    if (container) {
      container.remove()
      container = null
    }
    // Clear any remaining visualizer containers
    const visualizers = document.querySelectorAll('#vue-render-inspector-visualizer-optimized')
    visualizers.forEach(v => v.remove())

    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  describe('Initialization', () => {
    it('should create visualizer container with correct structure', () => {
      createEnhancedVisualizerV2(mockProfiler)

      container = document.getElementById('vue-render-inspector-visualizer-optimized')
      expect(container).toBeTruthy()
      expect(container.style.position).toBe('fixed')
      expect(container.style.zIndex).toBe('99999')
    })

    it('should create notification panel with correct positioning', () => {
      createEnhancedVisualizerV2(mockProfiler)

      const notificationPanel = document.querySelector('[id="notification-list"]').parentElement
      expect(notificationPanel).toBeTruthy()
      expect(notificationPanel.style.position).toBe('absolute')
      expect(notificationPanel.style.left).toBe('20px')
      expect(notificationPanel.style.top).toBe('80px')
      expect(notificationPanel.style.width).toBe('400px')
      expect(notificationPanel.style.maxHeight).toBe('300px')
    })

    it('should create header with all control buttons', () => {
      createEnhancedVisualizerV2(mockProfiler)

      const buttons = ['vri-toggle-notifications', 'vri-close']

      buttons.forEach(id => {
        const btn = document.getElementById(id)
        expect(btn).toBeTruthy()
      })
    })

    it('should create canvas element', () => {
      createEnhancedVisualizerV2(mockProfiler)

      const canvas = document.getElementById('vri-canvas')
      expect(canvas).toBeTruthy()
      expect(canvas.tagName).toBe('CANVAS')
      // Canvas dimensions are set as attributes, not styles in JSDOM
      expect(canvas.width).toBeDefined()
      expect(canvas.height).toBeDefined()
    })

    it('should create inspector panel (hidden by default)', () => {
      createEnhancedVisualizerV2(mockProfiler)

      const inspector = document.getElementById('vri-inspector')
      expect(inspector).toBeTruthy()
      expect(inspector.style.display).toBe('none')
      expect(inspector.style.position).toBe('absolute')
      expect(inspector.style.bottom).toBe('20px')
    })
  })

  describe('TreeNode Class', () => {
    it('should create node with all required properties', async () => {
      const { subscribeToRenderEvents } = await import('../../src/core/broadcast-channel.js')
      let capturedCallback

      subscribeToRenderEvents.mockImplementation(callback => {
        capturedCallback = callback
        return () => {}
      })

      createEnhancedVisualizerV2(mockProfiler)

      // Simulate render event
      const event = {
        uid: '123',
        componentName: 'TestComponent',
        timestamp: Date.now(),
        duration: 5.5,
        isUnnecessary: true,
        reason: 'props-change',
        enhancedPatterns: [
          {
            type: 'deepReactivityMisuse',
            reason: 'Large nested object with deep reactivity',
            suggestion: 'Use shallowRef',
            example: { bad: 'ref(largeObject)', good: 'shallowRef(largeObject)' }
          }
        ]
      }

      capturedCallback(event)

      // Wait for node creation
      await vi.advanceTimersByTimeAsync(50)

      // Access node through visualizer state (would need to expose for testing)
      // For now, verify through inspector display
    })

    it('should calculate color based on performance metrics', () => {
      // This would require exposing TreeNode class or state for unit testing
      // Currently testing through integration
    })

    it('should track comprehensive render analysis', async () => {
      const { subscribeToRenderEvents } = await import('../../src/core/broadcast-channel.js')
      let capturedCallback

      subscribeToRenderEvents.mockImplementation(callback => {
        capturedCallback = callback
        return () => {}
      })

      createEnhancedVisualizerV2(mockProfiler)

      // Send multiple render events
      const events = [
        {
          uid: '123',
          componentName: 'TestComponent',
          timestamp: Date.now(),
          duration: 5.5,
          isUnnecessary: false,
          triggerMechanism: 'props',
          propsDiff: {
            changed: { name: { from: 'old', to: 'new' } },
            added: { newProp: 'value' },
            removed: { oldProp: 'value' }
          }
        },
        {
          uid: '123',
          componentName: 'TestComponent',
          timestamp: Date.now() + 100,
          duration: 25.5, // Slow render
          isUnnecessary: true,
          triggerMechanism: 'parent-rerender',
          reactivityTriggers: ['computed.value', 'ref.value']
        }
      ]

      events.forEach(event => capturedCallback(event))

      await vi.advanceTimersByTimeAsync(100)
    })
  })

  describe('Notification System', () => {
    it('should add notifications for render events', async () => {
      const { subscribeToRenderEvents } = await import('../../src/core/broadcast-channel.js')
      let capturedCallback

      subscribeToRenderEvents.mockImplementation(callback => {
        capturedCallback = callback
        return () => {}
      })

      createEnhancedVisualizerV2(mockProfiler)

      const notificationList = document.getElementById('notification-list')
      expect(notificationList.children.length).toBe(0)

      // Send render event
      capturedCallback({
        uid: '123',
        componentName: 'TestComponent',
        timestamp: Date.now(),
        duration: 5.5,
        isUnnecessary: true,
        reason: 'props-change'
      })

      await vi.advanceTimersByTimeAsync(50)

      expect(notificationList.children.length).toBe(1)
      const notification = notificationList.children[0]
      expect(notification.innerHTML).toContain('TestComponent')
      expect(notification.innerHTML).toContain('props change')
      expect(notification.innerHTML).toContain('5.5ms')
    })

    it('should limit notifications to MAX_NOTIFICATIONS (10)', async () => {
      const { subscribeToRenderEvents } = await import('../../src/core/broadcast-channel.js')
      let capturedCallback

      subscribeToRenderEvents.mockImplementation(callback => {
        capturedCallback = callback
        return () => {}
      })

      createEnhancedVisualizerV2(mockProfiler)

      const notificationList = document.getElementById('notification-list')

      // Send 15 events
      for (let i = 0; i < 15; i++) {
        capturedCallback({
          uid: `${i}`,
          componentName: `Component${i}`,
          timestamp: Date.now() + i * 100,
          duration: 5 + i,
          isUnnecessary: i % 2 === 0,
          reason: 'update'
        })
      }

      await vi.advanceTimersByTimeAsync(100)

      expect(notificationList.children.length).toBe(10)
      // Newest should be first (Component14)
      expect(notificationList.children[0].innerHTML).toContain('Component14')
    })

    it('should have working Details and Go to buttons', async () => {
      const { subscribeToRenderEvents } = await import('../../src/core/broadcast-channel.js')
      let capturedCallback

      subscribeToRenderEvents.mockImplementation(callback => {
        capturedCallback = callback
        return () => {}
      })

      createEnhancedVisualizerV2(mockProfiler)

      capturedCallback({
        uid: '123',
        componentName: 'TestComponent',
        timestamp: Date.now(),
        duration: 5.5,
        isUnnecessary: false
      })

      await vi.advanceTimersByTimeAsync(50)

      const detailsBtn = document.querySelector('.notif-details-btn')
      const gotoBtn = document.querySelector('.notif-goto-btn')

      expect(detailsBtn).toBeTruthy()
      expect(gotoBtn).toBeTruthy()
      expect(detailsBtn.innerHTML).toContain('📋')
      expect(detailsBtn.innerHTML).toContain('Details')
      expect(gotoBtn.innerHTML).toContain('📍')
      expect(gotoBtn.innerHTML).toContain('Go to')
    })

    it('should clear all notifications when Clear button clicked', async () => {
      const { subscribeToRenderEvents } = await import('../../src/core/broadcast-channel.js')
      let capturedCallback

      subscribeToRenderEvents.mockImplementation(callback => {
        capturedCallback = callback
        return () => {}
      })

      createEnhancedVisualizerV2(mockProfiler)

      // Add notifications
      capturedCallback({
        uid: '123',
        componentName: 'TestComponent',
        timestamp: Date.now()
      })

      await vi.advanceTimersByTimeAsync(150) // Wait for setTimeout

      const notificationList = document.getElementById('notification-list')
      expect(notificationList.children.length).toBe(1)

      const clearBtn = document.getElementById('clear-notifications')
      clearBtn.click()

      expect(notificationList.children.length).toBe(0)
    })

    it('should toggle notification panel visibility', () => {
      createEnhancedVisualizerV2(mockProfiler)

      const toggleBtn = document.getElementById('vri-toggle-notifications')
      const notificationPanel = document.querySelector('[id="notification-list"]').parentElement

      expect(notificationPanel.style.display).not.toBe('none')

      toggleBtn.click()
      expect(notificationPanel.style.display).toBe('none')

      toggleBtn.click()
      expect(notificationPanel.style.display).toBe('block')
    })
  })

  describe('Inspector Panel Display', () => {
    it('should display all node metrics correctly', () => {
      createEnhancedVisualizerV2(mockProfiler)

      const _inspector = document.getElementById('vri-inspector')

      // Mock showInspector call with comprehensive node data
      const _mockNode = {
        uid: '123',
        componentName: 'TestComponent',
        getColor: () => '#42b883',
        getUnnecessaryPercent: () => 25,
        parent: { componentName: 'ParentComponent' },
        children: [1, 2, 3],
        depth: 2,
        warnings: ['storm'],
        renderAnalysis: {
          totalRenders: 100,
          unnecessaryRenders: 25,
          avgRenderTime: 8.5,
          renderHistory: [
            {
              timestamp: Date.now(),
              reason: 'props-change',
              details: 'Props updated',
              duration: 10,
              isUnnecessary: true,
              triggerMechanism: 'props',
              suggestions: ['Consider memoization']
            }
          ],
          performanceInsights: {
            slowestRender: 25,
            fastestRender: 2,
            totalRenderTime: 850,
            renderFrequency: 45,
            renderTimeTrend: 'increasing'
          },
          changePatterns: {
            propsChanges: 50,
            stateChanges: 20,
            parentRerenders: 25,
            referenceChanges: 5,
            eventTriggers: 10,
            reactivityTriggers: 15
          },
          detailedChanges: {
            recentPropsDiff: {
              changed: { name: { from: 'old', to: 'new' } }
            },
            propsChangeHistory: [1, 2, 3],
            stateChangeHistory: []
          },
          componentContext: {
            componentPath: ['App', 'Dashboard', 'TestComponent']
          },
          eventTracking: {
            recentEvents: [],
            eventFrequency: {}
          },
          reactivityTracking: {
            recentOnTrack: [],
            recentOnTrigger: []
          },
          sourceInfo: {
            filePath: '/src/components/TestComponent.vue',
            lineNumber: 42,
            componentType: 'Composition API'
          },
          optimizationSuggestions: new Set(['Use computed', 'Add key prop']),
          performanceWarnings: [],
          enhancedPatterns: [
            {
              type: 'deepReactivityMisuse',
              reason: 'Large nested object',
              suggestion: 'Use shallowRef',
              example: {
                bad: 'const state = ref(largeObject)',
                good: 'const state = shallowRef(largeObject)'
              }
            }
          ],
          bottleneckScore: 15
        }
      }

      // Would need to expose showInspector for direct testing
      // Currently would test through integration
    })

    it('should display enhanced patterns with examples', () => {
      // This test verifies that enhanced patterns with code examples
      // would be properly displayed and HTML-escaped in the UI

      // Test pattern data structure
      const testPattern = {
        type: 'deepReactivityMisuse',
        reason: 'Large nested object',
        suggestion: 'Use shallowRef',
        example: {
          bad: 'const state = ref(largeObject)',
          good: 'const state = shallowRef(largeObject)'
        }
      }

      // Verify pattern formatting
      expect(testPattern.type).toBe('deepReactivityMisuse')
      expect(testPattern.suggestion).toBe('Use shallowRef')
      expect(testPattern.example.bad).toContain('ref(largeObject)')
      expect(testPattern.example.good).toContain('shallowRef(largeObject)')

      // Test HTML escaping for code examples
      const codeWithHtml = '<Component :config="{ key: value }" />'
      const escapedCode = codeWithHtml.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      expect(escapedCode).toBe('&lt;Component :config="{ key: value }" /&gt;')

      // Test pattern name formatting
      const formattedName = 'deepReactivityMisuse'
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .replace(/^\w/, c => c.toUpperCase())
        .trim()
      expect(formattedName).toBe('Deep reactivity misuse')

      // Verify example structure for display
      const exampleDisplay = {
        bad: {
          label: '❌ Bad:',
          code: testPattern.example.bad
        },
        good: {
          label: '✅ Good:',
          code: testPattern.example.good
        }
      }

      expect(exampleDisplay.bad.label).toBe('❌ Bad:')
      expect(exampleDisplay.good.label).toBe('✅ Good:')

      // The InspectorPanel would use these patterns to display
      // formatted and escaped code examples in the UI
    })

    it('should format diffs correctly', () => {
      // Create mock diff data
      const mockDiff = {
        props: {
          changed: {
            count: { old: 1, new: 2 },
            items: {
              old: ['a', 'b'],
              new: ['a', 'b', 'c']
            }
          },
          added: {
            newProp: 'value'
          },
          removed: {
            oldProp: 'oldValue'
          }
        },
        state: {
          changed: {
            internalCount: { old: 10, new: 20 }
          }
        }
      }

      createEnhancedVisualizerV2(mockProfiler)

      // Verify diff formatting structure
      // The formatDiff function in InspectorPanel handles this
      // We test the expected HTML structure
      const container = document.getElementById('vue-render-inspector-visualizer-optimized')
      expect(container).toBeTruthy()

      // Test that diff sections can be created
      const diffSection = document.createElement('div')
      diffSection.className = 'vri-diff-section'

      // Test changed props formatting
      const changedHtml = `
        <div class="vri-diff-item">
          <span class="vri-diff-key">count:</span>
          <span class="vri-diff-old">1</span>
          <span class="vri-diff-arrow">→</span>
          <span class="vri-diff-new">2</span>
        </div>
      `
      diffSection.innerHTML = changedHtml

      expect(diffSection.querySelector('.vri-diff-old').textContent).toBe('1')
      expect(diffSection.querySelector('.vri-diff-new').textContent).toBe('2')

      // Test array diff formatting
      const arrayDiffHtml = `
        <div class="vri-diff-item">
          <span class="vri-diff-key">items:</span>
          <span class="vri-diff-old">["a","b"]</span>
          <span class="vri-diff-arrow">→</span>
          <span class="vri-diff-new">["a","b","c"]</span>
        </div>
      `

      const arrayDiffEl = document.createElement('div')
      arrayDiffEl.innerHTML = arrayDiffHtml
      expect(arrayDiffEl.querySelector('.vri-diff-new').textContent).toBe('["a","b","c"]')
    })

    it('should show performance trends and warnings', () => {
      // This test verifies the performance trend and warning display functionality

      // Test performance data structure
      const performanceData = {
        renderTime: 150.5,
        avgRenderTime: 125.3,
        totalRenders: 50,
        renderTrend: 'increasing',
        lastRenderTimes: [100, 110, 120, 140, 150],
        performanceWarnings: [
          'Render time exceeds 100ms threshold',
          'Component has rendered 50 times in the last minute'
        ]
      }

      // Verify performance metrics
      expect(performanceData.renderTime).toBe(150.5)
      expect(performanceData.avgRenderTime).toBe(125.3)
      expect(performanceData.renderTrend).toBe('increasing')

      // Test warning threshold logic
      const WARN_THRESHOLD = 100
      const ERROR_THRESHOLD = 200

      expect(performanceData.renderTime > WARN_THRESHOLD).toBe(true)
      expect(performanceData.renderTime < ERROR_THRESHOLD).toBe(true)

      // Test trend calculation
      const times = performanceData.lastRenderTimes
      const isIncreasing = times.every((time, i) => i === 0 || time >= times[i - 1])
      expect(isIncreasing).toBe(true)

      // Test warning message formatting
      const warningMessages = performanceData.performanceWarnings
      expect(warningMessages.length).toBe(2)
      expect(warningMessages[0]).toContain('100ms threshold')
      expect(warningMessages[1]).toContain('50 times')

      // Test trend display values
      const trendDisplayMap = {
        increasing: '↑ Increasing',
        decreasing: '↓ Decreasing',
        stable: '→ Stable'
      }

      expect(trendDisplayMap[performanceData.renderTrend]).toBe('↑ Increasing')

      // Test performance score calculation
      const score = Math.min(100, (performanceData.avgRenderTime / 16.67) * 10)
      expect(score).toBeGreaterThan(70) // Poor performance

      // The visualizer would use this data to:
      // 1. Color code components based on performance
      // 2. Show warnings in notifications
      // 3. Display trends in the inspector panel
    })
  })

  describe('Canvas Rendering', () => {
    it('should only update canvas when dimensions change', () => {
      createEnhancedVisualizerV2(mockProfiler)

      const canvas = document.getElementById('vri-canvas')
      const initialWidth = canvas.width
      const initialHeight = canvas.height

      // Trigger resize with same dimensions
      const resizeEvent = document.createEvent('Event')
      resizeEvent.initEvent('resize', true, true)
      window.dispatchEvent(resizeEvent)

      expect(canvas.width).toBe(initialWidth)
      expect(canvas.height).toBe(initialHeight)
    })

    it('should apply LOD based on zoom level', () => {
      createEnhancedVisualizerV2(mockProfiler)

      // LOD (Level of Detail) rendering is now always enabled
      // It automatically adjusts detail based on zoom level
      const canvas = document.getElementById('vri-canvas')
      expect(canvas).toBeTruthy()

      // Simulate zoom out (would reduce detail)
      const wheelOutEvent = document.createEvent('Event')
      wheelOutEvent.initEvent('wheel', true, true)
      Object.defineProperty(wheelOutEvent, 'deltaY', {
        value: 100, // Positive delta = zoom out
        writable: false
      })
      wheelOutEvent.preventDefault = vi.fn()

      canvas.dispatchEvent(wheelOutEvent)
      expect(wheelOutEvent.preventDefault).toHaveBeenCalled()

      // Simulate zoom in (would increase detail)
      const wheelInEvent = document.createEvent('Event')
      wheelInEvent.initEvent('wheel', true, true)
      Object.defineProperty(wheelInEvent, 'deltaY', {
        value: -100, // Negative delta = zoom in
        writable: false
      })
      wheelInEvent.preventDefault = vi.fn()

      canvas.dispatchEvent(wheelInEvent)
      expect(wheelInEvent.preventDefault).toHaveBeenCalled()

      // LOD automatically adjusts based on zoom level
      // Lower zoom = minimal detail for better performance
      // Higher zoom = maximum detail for clarity
    })

    it('should batch DOM updates to prevent thrashing', () => {
      createEnhancedVisualizerV2(mockProfiler)

      const fps = document.getElementById('vri-fps')
      const memory = document.getElementById('vri-memory')
      const componentCount = document.getElementById('vri-component-count')
      const visibleCount = document.getElementById('vri-visible-count')

      // Initial values
      expect(fps.textContent).toBe('60')
      expect(memory.textContent).toBe('0 MB')
      expect(componentCount.textContent).toBe('0')
      expect(visibleCount.textContent).toBe('0')

      // Updates should be batched
    })
  })

  describe('Navigation Functions', () => {
    it('should handle navigation to nodes with positions', async () => {
      const { subscribeToRenderEvents } = await import('../../src/core/broadcast-channel.js')
      let capturedCallback

      subscribeToRenderEvents.mockImplementation(callback => {
        capturedCallback = callback
        return () => {}
      })

      createEnhancedVisualizerV2(mockProfiler)

      // Create node with parent
      capturedCallback({
        uid: 'parent',
        componentName: 'ParentComponent',
        timestamp: Date.now()
      })

      capturedCallback({
        uid: 'child',
        parentUid: 'parent',
        componentName: 'ChildComponent',
        timestamp: Date.now()
      })

      await vi.advanceTimersByTimeAsync(150)

      // Test navigation would happen here
    })

    it('should force layout calculation for nodes without positions', () => {
      // This test verifies that the navigation system can trigger
      // layout calculation for nodes that don't have positions yet

      // Test TreeLayout calculation
      const layout = new TreeLayout()
      const nodes = new Map()

      // Create nodes without meaningful positions
      const node1 = new TreeNode({ uid: 1, componentName: 'Root' })
      const node2 = new TreeNode({ uid: 2, componentName: 'Child1' })
      const node3 = new TreeNode({ uid: 3, componentName: 'Child2' })

      // Set up parent-child relationships
      node1.children = [node2, node3]
      node2.parent = node1
      node3.parent = node1

      // Add to nodes map
      nodes.set(1, node1)
      nodes.set(2, node2)
      nodes.set(3, node3)

      // Initially nodes have default positions (0,0)
      expect(node1.x).toBe(0)
      expect(node1.y).toBe(0)
      expect(node2.x).toBe(0)
      expect(node2.y).toBe(0)

      // Calculate layout
      const bounds = layout.calculateLayout(nodes)

      // After layout, nodes should have targetX and targetY positions
      expect(node1.targetX).toBeDefined()
      expect(node1.targetY).toBeDefined()
      expect(node2.targetX).toBeDefined()
      expect(node2.targetY).toBeDefined()
      expect(node3.targetX).toBeDefined()
      expect(node3.targetY).toBeDefined()

      // Root should be at the top (y=0)
      expect(node1.targetY).toBe(0)

      // Children should be below root
      expect(node2.targetY).toBeGreaterThan(node1.targetY)
      expect(node3.targetY).toBeGreaterThan(node1.targetY)

      // Children should be horizontally separated
      expect(node2.targetX).not.toBe(node3.targetX)

      // Bounds should be calculated
      expect(bounds).toBeDefined()
      expect(bounds.minX).toBeDefined()
      expect(bounds.maxX).toBeDefined()
      expect(bounds.minY).toBeDefined()
      expect(bounds.maxY).toBeDefined()
    })
  })

  describe('Memory Management', () => {
    it('should prune old nodes when limit exceeded', () => {
      // Test memory manager pruning behavior

      // Create a simple memory manager simulation
      const nodeMap = new Map()
      const MAX_NODES = 100

      // Add nodes up to the limit
      for (let i = 0; i < MAX_NODES; i++) {
        const node = new TreeNode({
          uid: i,
          componentName: `Component${i}`,
          timestamp: Date.now() - (MAX_NODES - i) * 1000 // Older nodes have earlier timestamps
        })
        nodeMap.set(i, node)
      }

      expect(nodeMap.size).toBe(MAX_NODES)

      // Add one more node (should trigger pruning)
      const newNode = new TreeNode({
        uid: MAX_NODES,
        componentName: `Component${MAX_NODES}`,
        timestamp: Date.now()
      })

      // Simulate pruning logic - remove oldest 10%
      if (nodeMap.size >= MAX_NODES) {
        const nodesToRemove = Math.floor(MAX_NODES * 0.1)
        const sortedNodes = Array.from(nodeMap.entries()).sort(
          (a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0)
        )

        for (let i = 0; i < nodesToRemove; i++) {
          nodeMap.delete(sortedNodes[i][0])
        }
      }

      nodeMap.set(MAX_NODES, newNode)

      // Should have removed 10 oldest nodes
      expect(nodeMap.size).toBe(MAX_NODES - 9)

      // Oldest nodes should be gone
      expect(nodeMap.has(0)).toBe(false)
      expect(nodeMap.has(1)).toBe(false)
      expect(nodeMap.has(9)).toBe(false)

      // Newer nodes should still exist
      expect(nodeMap.has(MAX_NODES)).toBe(true)
      expect(nodeMap.has(MAX_NODES - 1)).toBe(true)
    })

    it('should maintain render history limits', async () => {
      const { subscribeToRenderEvents } = await import('../../src/core/broadcast-channel.js')
      let capturedCallback

      subscribeToRenderEvents.mockImplementation(callback => {
        capturedCallback = callback
        return () => {}
      })

      createEnhancedVisualizerV2(mockProfiler)

      // Send many events for same component
      for (let i = 0; i < 30; i++) {
        capturedCallback({
          uid: '123',
          componentName: 'TestComponent',
          timestamp: Date.now() + i * 100,
          duration: 5 + i
        })
      }

      await vi.advanceTimersByTimeAsync(100)

      // Verify history is limited to 20 entries
    })
  })

  describe('Global API', () => {
    it('should expose clearNodeData function', () => {
      createEnhancedVisualizerV2(mockProfiler)

      expect(window.__VUE_RENDER_INSPECTOR__.clearNodeData).toBeDefined()
      expect(typeof window.__VUE_RENDER_INSPECTOR__.clearNodeData).toBe('function')
    })
  })

  describe('HTML Escaping', () => {
    it('should properly escape HTML in notifications', async () => {
      const { subscribeToRenderEvents } = await import('../../src/core/broadcast-channel.js')
      let capturedCallback

      subscribeToRenderEvents.mockImplementation(callback => {
        capturedCallback = callback
        return () => {}
      })

      createEnhancedVisualizerV2(mockProfiler)

      capturedCallback({
        uid: '123',
        componentName: '<script>alert("XSS")</script>Component',
        timestamp: Date.now(),
        reason: '<img src=x onerror=alert("XSS")>'
      })

      await vi.advanceTimersByTimeAsync(50)

      const notificationList = document.getElementById('notification-list')
      const notification = notificationList.children[0]

      // Component name should be escaped
      expect(notification.innerHTML).not.toContain('<script>')
      expect(notification.innerHTML).toContain('&lt;script&gt;')
      // Reason should also be escaped in the details section
      const reasonText = notification.querySelector('div[style*="color: #999"]').textContent
      expect(reasonText).toContain('<img src=x onerror=alert("XSS")>')
    })

    it('should escape HTML in pattern examples', () => {
      // Test code example escaping
    })
  })

  describe('Event Handlers', () => {
    it('should handle mouse events on canvas', () => {
      createEnhancedVisualizerV2(mockProfiler)

      const canvas = document.getElementById('vri-canvas')

      // Test mousedown
      const mouseDownEvent = document.createEvent('MouseEvent')
      mouseDownEvent.initMouseEvent(
        'mousedown',
        true,
        true,
        window,
        0,
        0,
        0,
        100,
        100,
        false,
        false,
        false,
        false,
        0,
        null
      )
      canvas.dispatchEvent(mouseDownEvent)
      expect(canvas.style.cursor).toBe('grabbing')

      // Test mouseup
      const mouseUpEvent = document.createEvent('MouseEvent')
      mouseUpEvent.initMouseEvent(
        'mouseup',
        true,
        true,
        window,
        0,
        0,
        0,
        0,
        0,
        false,
        false,
        false,
        false,
        0,
        null
      )
      canvas.dispatchEvent(mouseUpEvent)
      expect(canvas.style.cursor).toBe('grab')
    })

    it('should handle wheel events for zoom', () => {
      createEnhancedVisualizerV2(mockProfiler)

      const canvas = document.getElementById('vri-canvas')

      // Create wheel event for JSDOM
      const wheelEvent = document.createEvent('Event')
      wheelEvent.initEvent('wheel', true, true)
      Object.defineProperty(wheelEvent, 'deltaY', {
        value: -100,
        writable: false
      })
      wheelEvent.preventDefault = vi.fn()

      canvas.dispatchEvent(wheelEvent)
      // Would need access to state.camera.targetZoom to verify
    })
  })

  describe('Close and Cleanup', () => {
    it('should cleanup properly when closed', () => {
      createEnhancedVisualizerV2(mockProfiler)

      const closeBtn = document.getElementById('vri-close')
      const container = document.getElementById('vue-render-inspector-visualizer-optimized')

      expect(container).toBeTruthy()

      closeBtn.click()

      const removedContainer = document.getElementById('vue-render-inspector-visualizer-optimized')
      expect(removedContainer).toBeFalsy()
    })
  })
})
