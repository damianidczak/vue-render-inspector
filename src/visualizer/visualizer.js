import { subscribeToRenderEvents } from '../core/broadcast-channel.js'
import { TreeNode } from './nodes/TreeNode.js'
import { Quadtree } from './spatial/Quadtree.js'
import { NotificationSystem } from './ui/NotificationSystem.js'
import { InspectorPanel } from './ui/InspectorPanel.js'
import { ComponentTreeView } from './ui/ComponentTreeView.js'
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
      <div style="display: flex; gap: 10px; align-items: center;">
        <div class="vri-view-toggle" style="display: flex; background: #111; border-radius: 6px; padding: 2px;">
          <button class="vri-view-btn active" data-view="canvas" style="flex: 1; border: none; background: #42b883; color: #000; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Canvas View</button>
          <button class="vri-view-btn" data-view="structured" style="flex: 1; border: none; background: transparent; color: #fff; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Split View</button>
        </div>
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
    
    <div class="vri-content" style="flex: 1; position: relative; overflow: hidden;">
      <div id="vri-canvas-view" class="vri-view" style="width: 100%; height: 100%;">
        <canvas id="vri-canvas" style="width: 100%; height: 100%; cursor: grab;"></canvas>
      </div>
      <!-- 
        SPLIT VIEW: Clean 2-column layout with sliding drawer
        This view is completely isolated from the canvas view and provides:
        - Left column: Real-time component changes list with performance color coding
        - Center column: File/folder-style component hierarchy tree
        - Right drawer: Detailed component insights (slides in from right when component selected)
      -->
      <div id="vri-structured-view" class="vri-view" style="display: none; width: 100%; height: 100%; position: relative; overflow: hidden;">
        <div class="vri-split-layout" style="display: flex; width: 100%; height: 100%; position: relative;">
          <!-- 
            LEFT COLUMN: Component Changes List
            Displays recent render events sorted by timestamp.
            Each item is color-coded based on performance:
            - Green: Good performance (< 10% unnecessary renders)
            - Yellow: Moderate issues (10-30% unnecessary renders)
            - Orange: High issues (30-50% unnecessary renders or bottleneck score > 10)
            - Red: Critical issues (> 50% unnecessary renders or bottleneck score > 20)
            Clicking an item selects the component and opens the insights drawer.
          -->
          <div class="vri-split-left" id="vri-split-left" style="width: 320px; background: #1a1a1a; border-right: 1px solid rgba(66, 184, 131, 0.15); display: flex; flex-direction: column; overflow: hidden;">
            <div style="padding: 20px; border-bottom: 1px solid rgba(66, 184, 131, 0.15);">
              <h3 style="margin: 0; color: #42b883; font-size: 14px; font-weight: 600;">Component Changes</h3>
              <p style="margin: 5px 0 0 0; color: #666; font-size: 11px;">Recent render events</p>
            </div>
            <div id="vri-changes-list" style="flex: 1; overflow-y: auto; padding: 10px;">
              <div style="color: #666; font-size: 12px; text-align: center; padding: 40px 20px;">
                No component changes yet
              </div>
            </div>
          </div>
          
          <!-- 
            CENTER COLUMN: Component Hierarchy Tree
            Displays components in a file/folder tree structure using ComponentTreeView.
            Features:
            - 📁 folder icon for components with children
            - 📄 file icon for leaf components
            - Expand/collapse functionality with ▶/▼ indicators
            - Visual tree lines showing parent-child relationships
            - Color-coded component names based on performance
            - Badges showing render counts
            - Click to select and open insights drawer
          -->
          <div class="vri-split-center" id="vri-tree-column-wrapper" style="flex: 1; background: #151515; display: flex; flex-direction: column; overflow: hidden; position: relative;">
            <div style="padding: 20px; border-bottom: 1px solid rgba(66, 184, 131, 0.15);">
              <h3 style="margin: 0; color: #42b883; font-size: 14px; font-weight: 600;">Component Hierarchy</h3>
              <p style="margin: 5px 0 0 0; color: #666; font-size: 11px;">Tree structure of your components</p>
            </div>
            <div id="vri-tree-column" class="vri-tree-scroll" style="flex: 1; overflow-y: auto; padding: 20px;"></div>
          </div>
        </div>
        
        <!-- 
          RIGHT DRAWER: Component Insights Panel
          Slides in from the right (right: -420px → right: 0) when a component is selected.
          Displays comprehensive component insights using InspectorPanel._generateHTML():
          - Performance metrics (avg render time, slowest, fastest)
          - Render triggers (props changes, state changes, parent re-renders, events)
          - Change details (props/state diffs)
          - Reactivity tracking
          - Event history
          - Performance bottlenecks
          - Optimization suggestions
          - Component details
          The drawer is completely isolated from the canvas view's inspector panel.
        -->
        <div id="vri-drawer" class="vri-drawer" style="
          position: fixed;
          top: 0;
          right: -420px;
          width: 400px;
          height: 100%;
          background: #1a1a1a;
          border-left: 1px solid rgba(66, 184, 131, 0.15);
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
          transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        ">
          <div style="padding: 20px; border-bottom: 1px solid rgba(66, 184, 131, 0.15); display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; color: #42b883; font-size: 14px; font-weight: 600;">Component Insights</h3>
            <button id="vri-drawer-close" style="
              background: transparent;
              border: 1px solid rgba(66, 184, 131, 0.3);
              color: #42b883;
              width: 28px;
              height: 28px;
              border-radius: 4px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              transition: all 0.2s;
            ">×</button>
          </div>
          <div id="vri-drawer-content" style="flex: 1; overflow-y: auto; padding: 20px;">
            <div style="color: #666; font-size: 12px; text-align: center; padding: 40px 20px;">
              Select a component to view insights
            </div>
          </div>
        </div>
      </div>
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
      .vri-view-toggle .vri-view-btn.active {
        background: #42b883 !important;
        color: #0a0a0a !important;
      }
      .vri-view-toggle .vri-view-btn {
        transition: background 0.2s ease, color 0.2s ease;
      }
      .vri-tree-view {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .vri-tree-node {
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        background: rgba(12, 12, 12, 0.6);
        transition: border-color 0.2s ease, background 0.2s ease;
      }
      .vri-tree-node.pulse {
        box-shadow: 0 0 10px rgba(66, 184, 131, 0.4);
      }
      .vri-tree-node.selected {
        border-color: rgba(66, 184, 131, 0.8);
        background: rgba(66, 184, 131, 0.08);
      }
      .vri-tree-node-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        cursor: pointer;
      }
      .vri-tree-node-left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
      }
      .vri-tree-node-title {
        font-weight: 600;
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .vri-tree-badges {
        display: flex;
        gap: 8px;
        font-size: 11px;
        color: #aaa;
      }
      .vri-tree-badges .warn {
        color: #ff9800;
      }
      .vri-tree-toggle {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: transparent;
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }
      .vri-tree-toggle.spacer {
        border-color: transparent;
        cursor: default;
      }
      .vri-tree-children {
        padding-left: 10px;
        padding-bottom: 8px;
      }
      .vri-tree-empty-state {
        padding: 20px;
        color: #777;
        text-align: center;
        border: 1px dashed rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        font-size: 13px;
      }
      /* Drawer Styles */
      .vri-drawer.open {
        right: 0 !important;
      }
      #vri-drawer-close:hover {
        background: rgba(66, 184, 131, 0.1);
        border-color: rgba(66, 184, 131, 0.5);
      }
      
      /* Component Changes List */
      .vri-change-item {
        padding: 12px;
        margin-bottom: 8px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(66, 184, 131, 0.1);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .vri-change-item:hover {
        background: rgba(66, 184, 131, 0.05);
        border-color: rgba(66, 184, 131, 0.3);
      }
      .vri-change-item.selected {
        background: rgba(66, 184, 131, 0.1);
        border-color: rgba(66, 184, 131, 0.4);
      }
      .vri-change-name {
        color: #42b883;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .vri-change-time {
        color: #666;
        font-size: 10px;
      }
      
      /* File/Folder Tree Styles */
      .vri-file-tree {
        font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
        font-size: 13px;
      }
      .vri-file-item {
        display: flex;
        align-items: center;
        padding: 6px 8px;
        margin: 2px 0;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s;
        user-select: none;
      }
      .vri-file-item:hover {
        background: rgba(66, 184, 131, 0.08);
      }
      .vri-file-item.selected {
        background: rgba(66, 184, 131, 0.15);
        border-left: 2px solid #42b883;
      }
      .vri-file-icon {
        width: 16px;
        height: 16px;
        margin-right: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: #42b883;
      }
      .vri-file-name {
        color: #ccc;
        flex: 1;
      }
      .vri-file-badge {
        font-size: 10px;
        color: #888;
        margin-left: 8px;
        padding: 2px 6px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
      }
      .vri-file-badge.warn {
        color: #ff9800;
        background: rgba(255, 152, 0, 0.1);
      }
      .vri-folder-toggle {
        width: 16px;
        height: 16px;
        margin-right: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
        font-size: 10px;
        transition: transform 0.2s;
      }
      .vri-folder-toggle.expanded {
        transform: rotate(90deg);
      }
      .vri-file-children {
        margin-left: 20px;
        border-left: 1px solid rgba(66, 184, 131, 0.1);
        padding-left: 12px;
      }
      
      /* Drawer Content Styles */
      #vri-drawer-content {
        font-size: 12px;
      }
      #vri-drawer-content h3 {
        margin-top: 20px;
        margin-bottom: 10px;
      }
      #vri-drawer-content pre {
        max-width: 100%;
        overflow-x: auto;
        word-break: break-all;
      }
      #vri-drawer-content details {
        margin-top: 8px;
      }
      #vri-drawer-content button {
        margin-top: 15px;
      }
    </style>
  `

  document.body.appendChild(container)

  const header = container.querySelector('.vri-header')
  const canvasView = container.querySelector('#vri-canvas-view')
  const structuredView = container.querySelector('#vri-structured-view')
  const viewButtons = container.querySelectorAll('.vri-view-btn')
  const drawer = container.querySelector('#vri-drawer')
  const drawerContent = container.querySelector('#vri-drawer-content')
  const drawerClose = container.querySelector('#vri-drawer-close')
  const treeColumn = container.querySelector('#vri-tree-column')
  const changesList = container.querySelector('#vri-changes-list')

  // Create notification panel and position it under the header
  const notificationPanel = notificationSystem.createPanel()
  notificationPanel.style.zIndex = '10'
  notificationSystem.setLayout('overlay')

  // Insert notification panel after the header
  header.parentNode.insertBefore(notificationPanel, header.nextSibling)

  // Append inspector panel
  container.appendChild(inspectorElement)

  let currentView = 'canvas'

  function syncViewButtons(targetView) {
    viewButtons.forEach(btn => {
      if (btn.getAttribute('data-view') === targetView) {
        btn.classList.add('active')
      } else {
        btn.classList.remove('active')
      }
    })
  }

  function openDrawer() {
    if (drawer) {
      drawer.classList.add('open')
    }
  }

  function closeDrawer() {
    if (drawer) {
      drawer.classList.remove('open')
    }
  }

  /**
   * Switch between Canvas View and Split View
   * Ensures complete isolation between views:
   * - Split View: Uses left column (changes list), center column (tree), and drawer (insights)
   * - Canvas View: Uses notification panel and inspector panel (original behavior)
   * Each view manages its own UI elements independently.
   */
  function switchView(targetView) {
    if (!targetView || targetView === currentView) return

    currentView = targetView
    syncViewButtons(targetView)

    if (targetView === 'structured') {
      // SPLIT VIEW: Show split layout, hide canvas
      canvasView.style.display = 'none'
      structuredView.style.display = 'block'
      
      // Hide notification panel in split view (left column replaces it)
      if (notificationPanel && notificationPanel.parentNode) {
        notificationPanel.style.display = 'none'
      }
      
      // Hide inspector panel in split view (drawer replaces it)
      inspectorPanel.hideInspector()
      closeDrawer()
    } else {
      // CANVAS VIEW: Show canvas, hide split layout
      canvasView.style.display = 'block'
      structuredView.style.display = 'none'
      
      // Show notification panel in canvas view (original behavior)
      notificationSystem.setLayout('overlay')
      if (notificationPanel) {
        notificationPanel.style.display = 'block'
        if (!notificationPanel.parentNode || notificationPanel.parentNode !== header.parentNode) {
          header.parentNode.insertBefore(notificationPanel, header.nextSibling)
        }
      }
      
      // Close drawer in canvas view (inspector panel replaces it)
      closeDrawer()
      
      // If there's a selected node, show it in inspector panel (canvas view behavior)
      if (state && state.selectedNode) {
        inspectorPanel.showInspector(state.selectedNode)
      }
    }
  }

  // Drawer close handler
  if (drawerClose) {
    drawerClose.addEventListener('click', () => {
      closeDrawer()
      if (state) {
        state.selectNode(null)
      }
    })
  }
  
  /**
   * Populate drawer with comprehensive component insights
   * Uses InspectorPanel._generateHTML() to ensure all insights are displayed:
   * This ensures the drawer shows the same comprehensive data as the canvas view's inspector panel.
   */
  function updateDrawerContent(node) {
    if (!drawerContent) return

    if (!node) {
      drawerContent.innerHTML = `
        <div style="color: #666; font-size: 12px; text-align: center; padding: 40px 20px;">
          Select a component to view insights
        </div>
      `
      return
    }

    // Extract all necessary data from node's render analysis
    const analysis = node.renderAnalysis
    const unnecessaryPercent = node.getUnnecessaryPercent()
    const perf = analysis.performanceInsights || {}
    const patterns = analysis.changePatterns || {}
    const renderHistory = analysis.renderHistory || []
    const recentRenders = renderHistory.slice(-10).reverse()
    const detailedChanges = analysis.detailedChanges || {}
    const eventTracking = analysis.eventTracking || {}
    const reactivityTracking = analysis.reactivityTracking || {}
    const sourceInfo = analysis.sourceInfo || {}

    // Use InspectorPanel's HTML generation to ensure consistency with canvas view
    // This method generates all sections: performance, patterns, changes, reactivity, etc.
    const content = inspectorPanel._generateHTML(node, {
      unnecessaryPercent,
      perf,
      patterns,
      recentRenders,
      detailedChanges,
      eventTracking,
      reactivityTracking,
      sourceInfo
    })

    drawerContent.innerHTML = content
  }

  // Helper function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-view')
      switchView(target)
    })
  })

  // Notification system already handles the clear button internally

  // Notification functions
  function addNotification(event) {
    notificationSystem.addNotification(event)
    updateChangesList()
  }

  /**
   * Update the component changes list in the left column
   * Displays the 50 most recent component render events, sorted by timestamp.
   * Each item is color-coded based on performance metrics:
   * Clicking an item selects the component, reveals it in the tree, and opens the insights drawer.
   */
  function updateChangesList() {
    if (!changesList || !state) return

    // Get all nodes, sort by most recent update, limit to 50
    const nodes = Array.from(state.nodes.values())
      .sort((a, b) => b.lastUpdateTime - a.lastUpdateTime)
      .slice(0, 50)

    if (nodes.length === 0) {
      changesList.innerHTML = `
        <div style="color: #666; font-size: 12px; text-align: center; padding: 40px 20px;">
          No component changes yet
        </div>
      `
      return
    }

    const fragment = document.createDocumentFragment()
    nodes.forEach(node => {
      const item = document.createElement('div')
      item.className = 'vri-change-item'
      item.dataset.uid = node.uid
      
      // Calculate performance-based color coding
      const unnecessaryPercent = node.getUnnecessaryPercent()
      const bottleneckScore = node.renderAnalysis.bottleneckScore || 0
      let borderColor = '#42b883' // green (default - good performance)
      
      // Determine color based on performance metrics (matches canvas view color logic)
      if (bottleneckScore > 20 || unnecessaryPercent > 50) {
        borderColor = '#f44336' // red - critical issues
      } else if (bottleneckScore > 10 || unnecessaryPercent > 30) {
        borderColor = '#ff9800' // orange - high issues
      } else if (unnecessaryPercent > 10) {
        borderColor = '#ffc107' // yellow - moderate issues
      }
      
      item.style.borderColor = borderColor
      
      // Format relative time (just now, Xs ago, Xm ago)
      const timeAgo = Date.now() - node.lastUpdateTime
      const timeText = timeAgo < 1000 ? 'just now' : 
                       timeAgo < 60000 ? `${Math.floor(timeAgo / 1000)}s ago` :
                       `${Math.floor(timeAgo / 60000)}m ago`

      item.innerHTML = `
        <div class="vri-change-name" style="color: ${borderColor};">${escapeHtml(node.componentName)}</div>
        <div class="vri-change-time">${timeText} • ${node.renderAnalysis.totalRenders} renders</div>
      `

      // Click handler: select component, reveal in tree, open drawer
      item.addEventListener('click', () => {
        selectNode(node)
        if (treeView) {
          treeView.revealNode(node) // Expand parents and scroll to node
        }
      })

      fragment.appendChild(item)
    })

    changesList.innerHTML = ''
    changesList.appendChild(fragment)
  }

  // Need to define this after state is created
  let renderNotifications = () => {}
  let calculateTreeLayout = () => {}
  let state = null
  let treeView = null

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
  state = new VisualizerState()

  if (treeColumn) {
    treeView = new ComponentTreeView(state, {
      onSelect: node => selectNode(node)
    })
    treeView.mount(treeColumn)
  }

  // Initialize canvas renderer for main canvas
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
  function handleNavigateFromNotification(uid) {
    const node = state.getNode(uid)
    if (!node) return

    if (currentView === 'structured') {
      if (treeView) {
        treeView.revealNode(node)
      }
      selectNode(node)
    } else {
      navigateToNode(node)
    }
  }

  function handleSelectFromNotification(uid) {
    const node = state.getNode(uid)
    if (!node) return
    if (currentView === 'structured' && treeView) {
      treeView.revealNode(node)
    }
    selectNode(node)
  }

  notificationSystem.setCallbacks(handleNavigateFromNotification, handleSelectFromNotification)

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

    if (treeView) {
      treeView.render()
    }
    
    // Update changes list
    updateChangesList()
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

  /**
   * Handle node selection - routes to appropriate UI based on current view
   * This ensures complete isolation between split view and canvas view:
   * 
   * Split View (structured):
   *   - Updates drawer content with full insights
   *   - Opens drawer (slides in from right)
   *   - Updates tree view selection
   * 
   * Canvas View:
   *   - Uses original InspectorPanel (overlay panel)
   *   - Updates tree view selection (if tree view exists)
   * 
   * This separation ensures the two views don't interfere with each other.
   */
  function selectNode(node) {
    state.selectNode(node)

    if (node) {
      if (currentView === 'structured') {
        // SPLIT VIEW: Use drawer for insights
        updateDrawerContent(node)
        openDrawer()
      } else {
        // CANVAS VIEW: Use inspector panel (original behavior)
        inspectorPanel.showInspector(node)
      }
    } else {
      // Deselect: clear and close appropriate UI
      if (currentView === 'structured') {
        updateDrawerContent(null)
        closeDrawer()
      } else {
        inspectorPanel.hideInspector()
      }
    }

    // Update tree view selection (works in both views)
    if (treeView) {
      treeView.setSelectedNode(node)
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
