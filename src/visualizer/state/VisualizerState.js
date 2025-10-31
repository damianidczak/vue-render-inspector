// State management for the visualizer
import { MemoryManager } from '../memory/MemoryManager.js'

export class VisualizerState {
  constructor() {
    this.nodes = new Map()
    this.rootNode = null
    this.selectedNode = null
    this.hoveredNode = null

    this.camera = {
      x: 0,
      y: 0,
      zoom: 1,
      targetZoom: 1
    }

    this.mouse = {
      x: 0,
      y: 0,
      dragStart: null
    }

    this.settings = {
      viewportCulling: true,
      lodRendering: true,
      showMetrics: true,
      performanceMode: true,
      quality: 2, // 1 = low, 2 = medium, 3 = high
      clusterAsync: false
    }

    this.stats = {
      visibleNodes: 0,
      renderedNodes: 0,
      culledNodes: 0,
      fps: 60,
      memory: 0
    }

    this.quadtree = null
    this.memoryManager = new MemoryManager()
    this.asyncClusters = new Map()
  }

  /**
   * Add a node to the state
   * @param {number|string} uid - Node unique identifier
   * @param {Object} node - Node instance
   */
  addNode(uid, node) {
    this.nodes.set(uid, node)

    // Set root node if this is the first parentless node
    if (!node.parent && !this.rootNode) {
      this.rootNode = node
    }
  }

  /**
   * Remove a node from the state
   * @param {number|string} uid - Node unique identifier
   */
  removeNode(uid) {
    const node = this.nodes.get(uid)
    if (!node) return

    // Update root node if necessary
    if (node === this.rootNode) {
      this.rootNode = Array.from(this.nodes.values()).find(n => !n.parent && n !== node) || null
    }

    // Clear selections if necessary
    if (node === this.selectedNode) {
      this.selectedNode = null
    }
    if (node === this.hoveredNode) {
      this.hoveredNode = null
    }

    this.nodes.delete(uid)
  }

  /**
   * Get a node by UID
   * @param {number|string} uid - Node unique identifier
   * @returns {Object|null} Node instance or null
   */
  getNode(uid) {
    // Try direct lookup first
    let node = this.nodes.get(uid)

    // If not found, try parsing as integer
    if (!node && typeof uid === 'string') {
      node = this.nodes.get(parseInt(uid))
    }

    return node || null
  }

  /**
   * Clear all nodes
   */
  clearNodes() {
    this.nodes.clear()
    this.rootNode = null
    this.selectedNode = null
    this.hoveredNode = null
    this.asyncClusters.clear()
  }

  /**
   * Select a node
   * @param {Object} node - Node to select
   */
  selectNode(node) {
    // Deselect previous node
    if (this.selectedNode) {
      this.selectedNode.selected = false
    }

    this.selectedNode = node

    if (node) {
      node.selected = true
    }
  }

  /**
   * Set hovered node
   * @param {Object} node - Node to hover
   */
  setHoveredNode(node) {
    // Clear previous hover
    if (this.hoveredNode && this.hoveredNode !== node) {
      this.hoveredNode.hovering = false
    }

    this.hoveredNode = node

    if (node) {
      node.hovering = true
    }
  }

  /**
   * Update camera position
   * @param {Object} position - New camera position
   */
  updateCamera(position) {
    if (position.x !== undefined) this.camera.x = position.x
    if (position.y !== undefined) this.camera.y = position.y
    if (position.zoom !== undefined) this.camera.zoom = position.zoom
    if (position.targetZoom !== undefined) this.camera.targetZoom = position.targetZoom
  }

  /**
   * Update mouse position
   * @param {Object} position - New mouse position
   */
  updateMouse(position) {
    if (position.x !== undefined) this.mouse.x = position.x
    if (position.y !== undefined) this.mouse.y = position.y
    if (position.dragStart !== undefined) this.mouse.dragStart = position.dragStart
  }

  /**
   * Update settings
   * @param {Object} newSettings - Settings to update
   */
  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings)
  }

  /**
   * Update stats
   * @param {Object} newStats - Stats to update
   */
  updateStats(newStats) {
    Object.assign(this.stats, newStats)
  }

  /**
   * Get all root nodes (nodes without parents)
   * @returns {Array} Array of root nodes
   */
  getRootNodes() {
    return Array.from(this.nodes.values()).filter(node => !node.parent)
  }

  /**
   * Get nodes as array
   * @returns {Array} Array of all nodes
   */
  getNodesArray() {
    return Array.from(this.nodes.values())
  }

  /**
   * Check if should prune memory
   * @returns {boolean} True if memory pruning is needed
   */
  shouldPruneMemory() {
    return this.memoryManager.shouldPrune()
  }

  /**
   * Prune memory by removing old nodes
   */
  pruneMemory() {
    this.memoryManager.pruneNodes(this.nodes)
  }

  /**
   * Get state summary for debugging
   * @returns {Object} State summary
   */
  getSummary() {
    return {
      nodeCount: this.nodes.size,
      hasRootNode: !!this.rootNode,
      selectedNode: this.selectedNode?.componentName || null,
      hoveredNode: this.hoveredNode?.componentName || null,
      camera: { ...this.camera },
      settings: { ...this.settings },
      stats: { ...this.stats }
    }
  }
}
