/**
 * ComponentTreeView - File/Folder-style component hierarchy tree
 * 
 * Displays Vue components in a file explorer-like tree structure:
 * - 📁 Folder icon for components with children (expandable)
 * - 📄 File icon for leaf components (no children)
 * - Expand/collapse functionality with ▶/▼ indicators
 * - Visual tree lines showing parent-child relationships
 * - Color-coded component names based on performance (green/yellow/orange/red)
 * - Badges showing render counts
 * - Click to select component and open insights drawer
 * 
 * This is used exclusively in the Split View's center column.
 * The tree structure makes it easy to understand component relationships.
 */
export class ComponentTreeView {
  constructor(state, options = {}) {
    this.state = state
    this.onSelect = options.onSelect || (() => {})
    this.container = null
    this.treeRoot = null
    this.nodeElements = new Map() // Maps node UIDs to DOM elements for quick lookup
    this.selectedUid = null
  }

  mount(container) {
    this.container = container
    this.treeRoot = document.createElement('div')
    this.treeRoot.className = 'vri-file-tree'
    this.container.innerHTML = ''
    this.container.appendChild(this.treeRoot)
    this.render()
  }

  render() {
    if (!this.treeRoot) return

    const roots = this.state.getRootNodes()
    this.nodeElements.clear()

    if (!roots.length) {
      this.treeRoot.innerHTML = `
        <div class="vri-tree-empty-state">
          No component activity yet. Interact with your app to populate the tree.
        </div>
      `
      return
    }

    const fragment = document.createDocumentFragment()
    roots.forEach((node, index) => {
      const nodeElement = this._renderNode(node, 0, index === roots.length - 1)
      fragment.appendChild(nodeElement)
    })
    this.treeRoot.innerHTML = ''
    this.treeRoot.appendChild(fragment)
    this._syncSelection()
  }

  setSelectedNode(node) {
    this.selectedUid = node ? String(node.uid) : null
    this._syncSelection()
  }

  revealNode(node) {
    if (!node) return

    // Expand parents so the node becomes visible
    let current = node.parent
    while (current) {
      current.expanded = true
      current = current.parent
    }
    node.expanded = true

    this.render()

    requestAnimationFrame(() => {
      const element = this.nodeElements.get(String(node.uid))
      if (element) {
        element.scrollIntoView({ block: 'center', behavior: 'smooth' })
        element.classList.add('pulse')
        setTimeout(() => element.classList.remove('pulse'), 600)
      }
    })
  }

  /**
   * Render a single node in the tree structure
   * Creates a file/folder item with:
   * - Expand/collapse toggle (▶/▼) for components with children
   * - Folder (📁) or file (📄) icon based on whether it has children
   * - Component name color-coded by performance
   * - Badge showing total render count
   * - Visual indentation based on depth
   * 
   * @param {TreeNode} node - The component node to render
   * @param {number} depth - Current depth in the tree (for indentation)
   * @param {boolean} isLast - Whether this is the last child (for tree line rendering)
   * @returns {HTMLElement} The rendered node wrapper element
   */
  _renderNode(node, depth, isLast) {
    const wrapper = document.createElement('div')
    wrapper.className = 'vri-file-item-wrapper'
    wrapper.dataset.uid = node.uid
    wrapper.style.marginLeft = `${depth * 20}px` // Indent based on depth

    if (node.selected) {
      wrapper.classList.add('selected')
      this.selectedUid = String(node.uid)
    }

    const fileItem = document.createElement('div')
    fileItem.className = 'vri-file-item'
    if (node.selected) {
      fileItem.classList.add('selected')
    }

    // Expand/collapse toggle for components with children
    if (node.children.length > 0) {
      const toggle = document.createElement('div')
      toggle.className = `vri-folder-toggle ${node.expanded ? 'expanded' : ''}`
      toggle.innerHTML = '▶' // Rotates to ▼ when expanded
      toggle.addEventListener('click', e => {
        e.stopPropagation() // Prevent triggering parent click
        node.expanded = !node.expanded
        this.render() // Re-render to show/hide children
      })
      fileItem.appendChild(toggle)
    } else {
      // Spacer for leaf nodes (no toggle needed)
      const spacer = document.createElement('div')
      spacer.style.width = '20px'
      fileItem.appendChild(spacer)
    }

    // File/folder icon: 📁 for components with children, 📄 for leaf components
    const icon = document.createElement('div')
    icon.className = 'vri-file-icon'
    icon.innerHTML = node.children.length > 0 ? '📁' : '📄'
    fileItem.appendChild(icon)

    // Component name - color-coded by performance (green/yellow/orange/red)
    const fileName = document.createElement('div')
    fileName.className = 'vri-file-name'
    fileName.textContent = node.componentName
    fileName.style.color = node.getColor() // Performance-based color
    fileItem.appendChild(fileName)

    // Badge showing total render count (warn class if > 25% unnecessary)
    const badge = document.createElement('div')
    badge.className = `vri-file-badge ${node.getUnnecessaryPercent() > 25 ? 'warn' : ''}`
    badge.textContent = `${node.renderAnalysis.totalRenders}`
    fileItem.appendChild(badge)

    // Click handler: select component and open insights drawer
    fileItem.addEventListener('click', () => {
      if (typeof this.onSelect === 'function') {
        this.onSelect(node)
      }
    })

    wrapper.appendChild(fileItem)

    // Render children if expanded (recursive)
    if (node.children.length > 0 && node.expanded) {
      const childrenContainer = document.createElement('div')
      childrenContainer.className = 'vri-file-children'
      
      // Recursively render all children
      node.children.forEach((child, index) => {
        const isChildLast = index === node.children.length - 1
        childrenContainer.appendChild(this._renderNode(child, depth + 1, isChildLast))
      })

      wrapper.appendChild(childrenContainer)
    }

    // Store element reference for quick lookup (used in revealNode)
    this.nodeElements.set(String(node.uid), wrapper)
    return wrapper
  }

  _syncSelection() {
    this.nodeElements.forEach((element, uid) => {
      const fileItem = element.querySelector('.vri-file-item')
      if (this.selectedUid && uid === this.selectedUid) {
        element.classList.add('selected')
        if (fileItem) {
          fileItem.classList.add('selected')
        }
      } else {
        element.classList.remove('selected')
        if (fileItem) {
          fileItem.classList.remove('selected')
        }
      }
    })
  }
}
