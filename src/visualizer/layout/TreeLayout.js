// Tree layout algorithm for component hierarchy visualization

export class TreeLayout {
  constructor(options = {}) {
    this.levelHeight = options.levelHeight || 180
    this.minNodeSpacing = options.minNodeSpacing || 220
    this.multiRootSpacing = options.multiRootSpacing || 500
  }

  /**
   * Calculate positions for all nodes in the tree
   * @param {Map} nodes - Map of all nodes
   * @param {Function} onLayoutComplete - Callback when layout is complete
   */
  calculateLayout(nodes, onLayoutComplete) {
    const nodeArray = Array.from(nodes.values())
    const rootNodes = nodeArray.filter(node => !node.parent)

    if (rootNodes.length === 0) {
      if (onLayoutComplete) onLayoutComplete()
      return
    }

    if (rootNodes.length === 1) {
      // Single root tree
      const root = rootNodes[0]
      root.targetX = 0
      root.targetY = 0
      this._layoutSubtree(root, 0)
    } else {
      // Multiple roots (forest)
      this._layoutForest(rootNodes)
    }

    // Calculate bounds
    const bounds = this._calculateBounds(nodeArray)

    if (onLayoutComplete) {
      onLayoutComplete(bounds)
    }

    return bounds
  }

  /**
   * Layout multiple root nodes (forest)
   * @private
   */
  _layoutForest(rootNodes) {
    rootNodes.forEach((root, index) => {
      root.targetX = (index - (rootNodes.length - 1) / 2) * this.multiRootSpacing
      root.targetY = 0
      this._layoutSubtree(root, 0)
    })
  }

  /**
   * Recursively layout a subtree
   * @private
   */
  _layoutSubtree(node, depth) {
    node.depth = depth
    node.targetY = depth * this.levelHeight

    if (!node.children || node.children.length === 0) return

    const childCount = node.children.length
    const totalWidth = (childCount - 1) * this.minNodeSpacing
    const startX = node.targetX - totalWidth / 2

    node.children.forEach((child, index) => {
      child.targetX = startX + index * this.minNodeSpacing
      this._layoutSubtree(child, depth + 1)
    })
  }

  /**
   * Calculate the bounding box of all nodes
   * @private
   */
  _calculateBounds(nodes) {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
    }

    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    nodes.forEach(node => {
      const x = node.targetX
      const y = node.targetY
      const halfWidth = node.width / 2
      const halfHeight = node.height / 2

      minX = Math.min(minX, x - halfWidth)
      maxX = Math.max(maxX, x + halfWidth)
      minY = Math.min(minY, y - halfHeight)
      maxY = Math.max(maxY, y + halfHeight)
    })

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  /**
   * Find the optimal zoom level to fit all nodes in viewport
   * @param {Object} bounds - The bounds of all nodes
   * @param {number} viewportWidth - Width of the viewport
   * @param {number} viewportHeight - Height of the viewport
   * @param {number} padding - Padding around the tree
   * @param {number} maxZoom - Maximum zoom level
   */
  calculateFitZoom(bounds, viewportWidth, viewportHeight, padding = 100, maxZoom = 1.2) {
    const treeWidth = bounds.width + padding * 2
    const treeHeight = bounds.height + padding * 2

    const zoomX = viewportWidth / treeWidth
    const zoomY = viewportHeight / treeHeight

    return Math.min(zoomX, zoomY, maxZoom)
  }

  /**
   * Calculate camera position to center the tree
   * @param {Object} bounds - The bounds of all nodes
   * @param {number} viewportWidth - Width of the viewport
   * @param {number} viewportHeight - Height of the viewport
   * @param {number} zoom - Current zoom level
   */
  calculateCameraPosition(bounds, viewportWidth, viewportHeight, zoom) {
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2

    return {
      x: viewportWidth / 2 - centerX * zoom,
      y: viewportHeight / 2 - centerY * zoom
    }
  }

  /**
   * Update layout settings
   * @param {Object} settings - New settings
   */
  updateSettings(settings) {
    if (settings.levelHeight !== undefined) {
      this.levelHeight = settings.levelHeight
    }
    if (settings.minNodeSpacing !== undefined) {
      this.minNodeSpacing = settings.minNodeSpacing
    }
    if (settings.multiRootSpacing !== undefined) {
      this.multiRootSpacing = settings.multiRootSpacing
    }
  }
}
