// Canvas rendering functionality for the visualizer
export class CanvasRenderer {
  constructor(container, state) {
    this.container = container
    this.state = state
    this.canvas = null
    this.ctx = null
    this.animationId = null
    this.lastTime = performance.now()
    this.frameCount = 0

    // Canvas size tracking
    this.lastCanvasWidth = 0
    this.lastCanvasHeight = 0
    this.lastDpr = 0

    // Callbacks
    this.onNodeHover = null
    this.onNodeClick = null
  }

  initialize() {
    this.canvas = this.container.querySelector('#vri-canvas')
    if (!this.canvas) {
      console.error('[CanvasRenderer] Canvas element not found')
      return
    }

    this.ctx = this.canvas.getContext('2d', { alpha: false })

    this.setupCanvas()
    window.addEventListener('resize', this.setupCanvas.bind(this))

    // Setup mouse event handlers
    this._setupEventHandlers()

    // Start render loop
    this.start()
  }

  setupCanvas() {
    const rect = this.canvas.getBoundingClientRect()
    const dpr =
      this.state.settings.quality === 3
        ? window.devicePixelRatio || 1
        : this.state.settings.quality === 2
          ? Math.min(1.5, window.devicePixelRatio || 1)
          : 1

    // Only update canvas if dimensions actually changed
    const newWidth = rect.width * dpr
    const newHeight = rect.height * dpr

    if (
      newWidth === this.lastCanvasWidth &&
      newHeight === this.lastCanvasHeight &&
      dpr === this.lastDpr
    ) {
      return // No need to update
    }

    this.lastCanvasWidth = newWidth
    this.lastCanvasHeight = newHeight
    this.lastDpr = dpr

    this.canvas.width = newWidth
    this.canvas.height = newHeight
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`
    this.ctx.scale(dpr, dpr)
  }

  getVisibleNodes() {
    if (!this.state.settings.viewportCulling) {
      return Array.from(this.state.nodes.values())
    }

    const padding = 100
    const viewBounds = {
      x: -this.state.camera.x / this.state.camera.zoom - padding,
      y: -this.state.camera.y / this.state.camera.zoom - padding,
      width: (this.canvas.width / window.devicePixelRatio + padding * 2) / this.state.camera.zoom,
      height: (this.canvas.height / window.devicePixelRatio + padding * 2) / this.state.camera.zoom
    }

    if (this.state.quadtree) {
      return this.state.quadtree.retrieve(viewBounds)
    }

    // Fallback to linear search
    return Array.from(this.state.nodes.values()).filter(node => {
      const x = node.animX || node.targetX
      const y = node.animY || node.targetY

      return (
        x + node.width / 2 >= viewBounds.x &&
        x - node.width / 2 <= viewBounds.x + viewBounds.width &&
        y + node.height / 2 >= viewBounds.y &&
        y - node.height / 2 <= viewBounds.y + viewBounds.height
      )
    })
  }

  getNodeLOD(zoom) {
    if (!this.state.settings.lodRendering) return 'full'

    if (zoom < 0.3) return 'minimal' // Just dots
    if (zoom < 0.5) return 'basic' // Boxes only
    if (zoom < 0.8) return 'standard' // + names
    return 'full' // Everything
  }

  drawNodeMinimal(node, x, y) {
    this.ctx.fillStyle = node.getColor()
    this.ctx.beginPath()
    this.ctx.arc(x, y, 5, 0, Math.PI * 2)
    this.ctx.fill()
  }

  drawNodeBasic(node, x, y) {
    this.ctx.fillStyle = '#2a2a2a'
    this.ctx.fillRect(x - 40, y - 15, 80, 30)

    this.ctx.strokeStyle = node.getColor()
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x - 40, y - 15, 80, 30)
  }

  drawNodeStandard(node, x, y) {
    this.drawNodeBasic(node, x, y)

    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = '11px sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'

    // Truncate long names
    const name =
      node.componentName.length > 12 ? `${node.componentName.slice(0, 10)}...` : node.componentName
    this.ctx.fillText(name, x, y)
  }

  drawNodeFull(node, x, y) {
    const color = node.getColor()

    // Shadow for selected/hovering
    if (node.selected || node.hovering) {
      this.ctx.shadowBlur = 15
      this.ctx.shadowColor = `${color}80`
    }

    // Background
    this.ctx.fillStyle = '#2a2a2a'
    this.ctx.fillRect(x - node.width / 2, y - node.height / 2, node.width, node.height)

    // Border
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x - node.width / 2, y - node.height / 2, node.width, node.height)

    // Reset shadow
    this.ctx.shadowBlur = 0

    // Title
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = 'bold 13px sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'top'
    this.ctx.fillText(node.componentName, x, y - node.height / 2 + 10)

    // Metrics
    if (this.state.settings.showMetrics) {
      this.ctx.font = '11px sans-serif'
      this.ctx.fillStyle = '#888'
      this.ctx.textBaseline = 'middle'

      const metrics = [
        `Renders: ${node.renderAnalysis.totalRenders}`,
        `Unnecessary: ${node.renderAnalysis.unnecessaryRenders} (${node.getUnnecessaryPercent().toFixed(0)}%)`
      ]

      if (node.renderAnalysis.avgRenderTime > 0) {
        metrics.push(`Avg: ${node.renderAnalysis.avgRenderTime.toFixed(1)}ms`)
      }

      metrics.forEach((text, i) => {
        this.ctx.fillText(text, x, y + (i - 0.5) * 14)
      })
    }
  }

  drawConnection(fromNode, toNode, lod) {
    const from = {
      x: fromNode.animX || fromNode.targetX,
      y: (fromNode.animY || fromNode.targetY) + fromNode.height / 2
    }
    const to = {
      x: toNode.animX || toNode.targetX,
      y: (toNode.animY || toNode.targetY) - toNode.height / 2
    }

    if (lod === 'minimal' || lod === 'basic') {
      // Simple straight line for performance
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      this.ctx.lineWidth = 1
      this.ctx.beginPath()
      this.ctx.moveTo(from.x, from.y)
      this.ctx.lineTo(to.x, to.y)
      this.ctx.stroke()
    } else {
      // Bezier curve for higher quality
      const controlY = from.y + (to.y - from.y) * 0.5

      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.moveTo(from.x, from.y)
      this.ctx.bezierCurveTo(from.x, controlY, to.x, controlY, to.x, to.y)
      this.ctx.stroke()
    }
  }

  render(currentTime) {
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    // Update FPS
    this.frameCount++
    if (this.frameCount % 30 === 0) {
      // Batch DOM updates to avoid layout thrashing
      this.state.stats.fps = Math.round(1000 / deltaTime)

      // Update memory usage
      if (performance.memory) {
        this.state.stats.memory = (performance.memory.usedJSHeapSize / 1048576).toFixed(1)
      }

      // Batch all DOM updates together
      requestAnimationFrame(() => {
        const fpsEl = document.getElementById('vri-fps')
        const memoryEl = document.getElementById('vri-memory')
        const countEl = document.getElementById('vri-component-count')
        const visibleEl = document.getElementById('vri-visible-count')

        if (fpsEl) fpsEl.textContent = this.state.stats.fps
        if (performance.memory && memoryEl) {
          memoryEl.textContent = `${this.state.stats.memory} MB`
        }
        if (countEl) countEl.textContent = this.state.nodes.size
        if (visibleEl) visibleEl.textContent = this.state.stats.visibleNodes
      })
    }

    // Clear canvas
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Apply camera transform
    this.ctx.save()
    this.ctx.translate(this.state.camera.x, this.state.camera.y)
    this.ctx.scale(this.state.camera.zoom, this.state.camera.zoom)

    // Smooth camera animation
    const zoomDiff = this.state.camera.targetZoom - this.state.camera.zoom
    this.state.camera.zoom += zoomDiff * 0.1

    // Get LOD for current zoom
    const lod = this.getNodeLOD(this.state.camera.zoom)

    // Get visible nodes
    const visibleNodes = this.getVisibleNodes()
    this.state.stats.visibleNodes = visibleNodes.length
    this.state.stats.culledNodes = this.state.nodes.size - visibleNodes.length

    // Animate node positions
    visibleNodes.forEach(node => {
      const dx = node.targetX - (node.animX || node.targetX)
      const dy = node.targetY - (node.animY || node.targetY)
      node.animX = (node.animX || node.targetX) + dx * 0.15
      node.animY = (node.animY || node.targetY) + dy * 0.15
      node.lod = lod
    })

    // Draw connections (only for visible nodes)
    visibleNodes.forEach(node => {
      if (node.parent && visibleNodes.includes(node.parent)) {
        this.drawConnection(node.parent, node, lod)
      }
    })

    // Draw nodes
    visibleNodes.forEach(node => {
      const x = node.animX || node.targetX
      const y = node.animY || node.targetY

      switch (lod) {
        case 'minimal':
          this.drawNodeMinimal(node, x, y)
          break
        case 'basic':
          this.drawNodeBasic(node, x, y)
          break
        case 'standard':
          this.drawNodeStandard(node, x, y)
          break
        case 'full':
          this.drawNodeFull(node, x, y)
          break
      }
    })

    this.ctx.restore()

    this.animationId = requestAnimationFrame(this.render.bind(this))
  }

  _setupEventHandlers() {
    this.canvas.addEventListener('mousedown', e => {
      const rect = this.canvas.getBoundingClientRect()
      this.state.mouse.dragStart = {
        x: e.clientX - rect.left - this.state.camera.x,
        y: e.clientY - rect.top - this.state.camera.y
      }
      this.canvas.style.cursor = 'grabbing'
    })

    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect()
      this.state.mouse.x = e.clientX - rect.left
      this.state.mouse.y = e.clientY - rect.top

      if (this.state.mouse.dragStart) {
        this.state.camera.x = this.state.mouse.x - this.state.mouse.dragStart.x
        this.state.camera.y = this.state.mouse.y - this.state.mouse.dragStart.y
      } else {
        // Check hover
        const worldX = (this.state.mouse.x - this.state.camera.x) / this.state.camera.zoom
        const worldY = (this.state.mouse.y - this.state.camera.y) / this.state.camera.zoom

        let hoveredNode = null
        const visibleNodes = this.getVisibleNodes()

        for (const node of visibleNodes) {
          const x = node.animX || node.targetX
          const y = node.animY || node.targetY

          if (Math.abs(worldX - x) < node.width / 2 && Math.abs(worldY - y) < node.height / 2) {
            hoveredNode = node
            break
          }
        }

        if (this.state.hoveredNode !== hoveredNode) {
          if (this.state.hoveredNode) this.state.hoveredNode.hovering = false
          if (hoveredNode) hoveredNode.hovering = true
          this.state.hoveredNode = hoveredNode
          this.canvas.style.cursor = hoveredNode ? 'pointer' : 'grab'

          if (this.onNodeHover) {
            this.onNodeHover(hoveredNode)
          }
        }
      }
    })

    this.canvas.addEventListener('mouseup', () => {
      this.state.mouse.dragStart = null
      this.canvas.style.cursor = 'grab'
    })

    this.canvas.addEventListener('click', () => {
      if (this.onNodeClick) {
        this.onNodeClick(this.state.hoveredNode)
      }
    })

    this.canvas.addEventListener('wheel', e => {
      e.preventDefault()
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
      this.state.camera.targetZoom = Math.max(
        0.1,
        Math.min(3, this.state.camera.targetZoom * zoomFactor)
      )
    })
  }

  start() {
    if (!this.animationId) {
      this.animationId = requestAnimationFrame(this.render.bind(this))
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  destroy() {
    this.stop()
    window.removeEventListener('resize', this.setupCanvas.bind(this))
  }
}
