import { subscribeToRenderEvents } from '../core/broadcast-channel.js'
import { TreeNode } from './nodes/TreeNode.js'
import { Quadtree } from './spatial/Quadtree.js'
import { NotificationSystem } from './ui/NotificationSystem.js'
import { InspectorPanel } from './ui/InspectorPanel.js'
import { CanvasRenderer } from './rendering/CanvasRenderer.js'
import { TreeLayout } from './layout/TreeLayout.js'
import { VisualizerState } from './state/VisualizerState.js'
import { EventHandlers } from './events/EventHandlers.js'

// Import version from package.json
import { version } from '../../package.json'

// Main visualizer function
export function createEnhancedVisualizerV2(profiler) {
  console.log('[VRI-Visualizer] Initializing with performance optimizations...')

  // Create container
  const container = document.createElement('div')
  container.id = 'vue-render-inspector-visualizer-optimized'
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
    z-index: 99999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `

  // Initialize notification system (will be added after header)
  const notificationSystem = new NotificationSystem()

  // Initialize inspector panel
  const inspectorPanel = new InspectorPanel()
  const inspectorElement = inspectorPanel.createPanel()

  // Create HTML structure
  container.innerHTML = `
    <div class="vri-header" style="
      background: rgba(26, 26, 26, 0.95);
      backdrop-filter: blur(10px);
      padding: 15px 20px;
      border-bottom: 1px solid rgba(66, 184, 131, 0.3);
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
    ">
      <div style="display: flex; align-items: center; gap: 20px;">
        <h1 style="margin: 0; color: #42b883; font-size: 20px; display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 28px;">⚡</span>
          VRI-Visualizer <span style="font-size: 14px; color: #666;">v${version}</span>
        </h1>
        <div style="display: flex; gap: 10px; font-size: 12px;">
          <div style="color: #888;">
            Components: <span id="vri-component-count" style="color: #42b883; font-weight: bold;">0</span>
          </div>
          <div style="color: #888;">
            Visible: <span id="vri-visible-count" style="color: #42b883; font-weight: bold;">0</span>
          </div>
          <div style="color: #888;">
            FPS: <span id="vri-fps" style="color: #42b883; font-weight: bold;">60</span>
          </div>
          <div style="color: #888;">
            Memory: <span id="vri-memory" style="color: #42b883; font-weight: bold;">0 MB</span>
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="vri-center-tree" class="vri-action-btn" title="Center and fit tree to view">🎯 Center Tree</button>
        <button id="vri-toggle-notifications" class="vri-action-btn">🔔 Notifications</button>
        <button id="vri-close" style="
          background: #ff4444;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 13px;
        ">✕ Close</button>
      </div>
    </div>
    
    <div style="flex: 1; position: relative; overflow: hidden;">
      <canvas id="vri-canvas" style="width: 100%; height: 100%; cursor: grab;"></canvas>
      
    </div>
    
    <style>
      .vri-action-btn {
        background: #333;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
      }
      .vri-action-btn:hover {
        background: #444;
        transform: translateY(-1px);
      }
      #vri-canvas {
        image-rendering: optimizeSpeed;
      }
    </style>
  `

  document.body.appendChild(container)

  // Create notification panel and position it under the header
  const notificationPanel = notificationSystem.createPanel()
  notificationPanel.style.cssText = `
    position: absolute;
    left: 20px;
    top: 80px;
    width: 400px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 10;
  `

  // Insert notification panel after the header
  const header = container.querySelector('.vri-header')
  header.parentNode.insertBefore(notificationPanel, header.nextSibling)

  // Append inspector panel
  container.appendChild(inspectorElement)

  // Notification system already handles the clear button internally

  // Notification functions
  function addNotification(event) {
    notificationSystem.addNotification(event)
  }

  // Need to define this after state is created
  let renderNotifications = () => {}
  let calculateTreeLayout = () => {}

  function navigateToNode(node) {
    if (!node) return

    console.log(
      '[VRI] Navigating to node:',
      node.componentName,
      'UID:',
      node.uid,
      'Position:',
      node.x,
      node.y,
      'Target:',
      node.targetX,
      node.targetY
    )

    // Force layout calculation if not done yet
    if (node.x === 0 && node.y === 0 && node.targetX === 0 && node.targetY === 0) {
      console.log('[VRI] Node has no position. Forcing layout calculation...')
      calculateTreeLayout()
    }

    // Use targetX/targetY if x/y not set (node is still animating)
    const nodeX = node.x || node.targetX
    const nodeY = node.y || node.targetY

    // If still no position, wait and retry
    if (nodeX === 0 && nodeY === 0) {
      console.warn('[VRI] Node still has no position after layout. Retrying...')
      setTimeout(() => navigateToNode(node), 200)
      return
    }

    // Calculate position to center the node in view
    const canvas = container.querySelector('#vri-canvas')
    const rect = canvas.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Set zoom level to focus on the node
    // If already zoomed out, zoom to 1.5x, if already zoomed in, maintain or increase slightly
    const currentZoom = state.camera.zoom
    const targetZoom = currentZoom < 1.2 ? 1.5 : Math.min(currentZoom * 1.2, 2.5)
    state.updateCamera({ targetZoom })

    // Immediately update zoom for instant feedback
    state.camera.zoom = targetZoom

    // Set camera to center on node with the new zoom
    state.updateCamera({ x: centerX - nodeX * targetZoom, y: centerY - nodeY * targetZoom })

    console.log(
      '[VRI] Camera positioned at:',
      state.camera.x,
      state.camera.y,
      'Zoom:',
      targetZoom,
      'Node at:',
      nodeX,
      nodeY
    )

    // Select the new node
    state.selectNode(node)

    // Update hover state to match selection
    state.setHoveredNode(node)

    // Update inspector
    inspectorPanel.showInspector(node)

    // Flash the node for visibility with a longer glow
    node.glowIntensity = 1
    setTimeout(() => {
      node.glowIntensity = 0.5 // Keep some glow for selected node
    }, 2000)

    // Immediately update node position to target if animating
    if (node.x === 0 && node.y === 0) {
      node.x = node.targetX
      node.y = node.targetY
    }
  }

  // State management
  const state = new VisualizerState()

  // Initialize canvas renderer
  const canvasRenderer = new CanvasRenderer(container, state)

  // Set canvas renderer callbacks and initialize
  canvasRenderer.onNodeClick = node => selectNode(node)
  canvasRenderer.initialize()

  // Initialize tree layout
  const treeLayout = new TreeLayout({
    levelHeight: 180,
    minNodeSpacing: 220,
    multiRootSpacing: 500
  })

  // Initialize event handlers
  const eventHandlers = new EventHandlers(
    state,
    canvasRenderer,
    treeLayout,
    notificationSystem,
    container
  )

  // Now define renderNotifications with access to state
  renderNotifications = function () {
    notificationSystem.render()
  }

  // Set callbacks for navigation and selection after state is created
  notificationSystem.setCallbacks(
    uid => {
      // Navigate callback
      const node = state.getNode(uid)
      if (node) {
        navigateToNode(node)
      }
    },
    uid => {
      // Select callback
      const node = state.getNode(uid)
      if (node) {
        selectNode(node)
      }
    }
  )

  // Optimized tree layout
  calculateTreeLayout = function () {
    treeLayout.calculateLayout(state.nodes, bounds => {
      // Rebuild quadtree after layout
      rebuildQuadtree()
    })
  }

  // Rebuild spatial index
  function rebuildQuadtree() {
    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    state.nodes.forEach(node => {
      const x = node.targetX
      const y = node.targetY
      minX = Math.min(minX, x - 1000)
      maxX = Math.max(maxX, x + 1000)
      minY = Math.min(minY, y - 1000)
      maxY = Math.max(maxY, y + 1000)
    })

    state.quadtree = new Quadtree({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    })

    state.nodes.forEach(node => state.quadtree.insert(node))
  }

  // Handle render events
  function handleRenderEvent(event) {
    // Debug: Log if event has patterns
    if (event.enhancedPatterns && event.enhancedPatterns.length > 0) {
      console.log(
        '[VRI Visualizer] Patterns in event:',
        event.componentName,
        event.enhancedPatterns
      )
    }

    let node = state.getNode(event.uid)

    if (!node) {
      node = new TreeNode(event)
      state.addNode(event.uid, node)

      // Connect to parent
      if (event.parentUid !== null && event.parentUid !== undefined) {
        const parent = state.getNode(event.parentUid)
        if (parent) {
          node.parent = parent
          parent.children.push(node)
        }
      } else if (!state.rootNode) {
        state.rootNode = node
      }

      // Request layout update
      requestLayoutUpdate()
    }

    node.updateMetrics(event)
    node.lastUpdateTime = Date.now()
    node.state = 'rendering'

    // Add notification for this render event
    addNotification(event)

    setTimeout(() => {
      node.state = 'idle'
    }, 300)

    // Memory management
    if (state.shouldPruneMemory()) {
      state.pruneMemory()
    }
  }

  // Layout update throttling
  let layoutTimeout = null
  function requestLayoutUpdate() {
    if (layoutTimeout) return
    layoutTimeout = setTimeout(() => {
      calculateTreeLayout()
      fitToScreen()
      layoutTimeout = null
    }, 100)
  }

  // Fit to screen
  function fitToScreen() {
    if (state.nodes.size === 0) return
    if (!canvasRenderer || !canvasRenderer.canvas) return

    // Calculate bounds
    const nodes = state.getNodesArray()
    const bounds = treeLayout._calculateBounds(nodes)

    const canvas = canvasRenderer.canvas
    const canvasWidth = canvas.width / window.devicePixelRatio
    const canvasHeight = canvas.height / window.devicePixelRatio

    // Calculate optimal zoom
    state.updateCamera({
      targetZoom: treeLayout.calculateFitZoom(
        bounds,
        canvasWidth,
        canvasHeight,
        100, // padding
        1.2 // maxZoom
      )
    })

    // Calculate camera position to center tree
    const cameraPos = treeLayout.calculateCameraPosition(
      bounds,
      canvasWidth,
      canvasHeight,
      state.camera.targetZoom
    )

    state.updateCamera({ x: cameraPos.x, y: cameraPos.y })
  }

  // Node selection
  function selectNode(node) {
    state.selectNode(node)

    if (node) {
      inspectorPanel.showInspector(node)
    } else {
      inspectorPanel.hideInspector()
    }
  }

  // showInspector function removed - now handled by InspectorPanel

  // Initialize all event handlers
  eventHandlers.setCleanupCallback(cleanup)
  eventHandlers.setCenterTreeCallback(fitToScreen)
  eventHandlers.initialize()

  // Update notification badge function removed - not used

  // Subscribe to render events
  const unsubscribe = subscribeToRenderEvents(handleRenderEvent)

  // Cleanup function
  function cleanup() {
    if (eventHandlers) {
      eventHandlers.cleanup()
    }
    if (canvasRenderer) {
      canvasRenderer.destroy()
    }
    if (unsubscribe) {
      unsubscribe()
    }
  }

  // Global API
  window.__VUE_RENDER_INSPECTOR__.clearNodeData = uid => {
    const node = state.getNode(uid)
    if (node) {
      node.renderAnalysis = {
        totalRenders: 0,
        unnecessaryRenders: 0,
        avgRenderTime: 0,
        lastRenderTime: 0,
        renderHistory: [],
        performanceInsights: {
          slowestRender: 0,
          fastestRender: Infinity,
          totalRenderTime: 0,
          renderFrequency: 0,
          lastActivity: 0
        },
        changePatterns: {
          propsChanges: 0,
          stateChanges: 0,
          referenceChanges: 0,
          parentRerenders: 0,
          eventTriggers: 0,
          reactivityTriggers: 0
        },
        componentContext: {
          parentComponent: null,
          childComponents: [],
          componentDepth: 0,
          componentPath: [node.componentName]
        },
        optimizationSuggestions: new Set(),
        detailedHistory: []
      }
      node.warnings = []
      if (state.selectedNode === node) {
        inspectorPanel.showInspector(node)
      }
    }
  }

  console.log('[VRI-Visualizer] Ready! Using viewport culling and LOD rendering.')
}
