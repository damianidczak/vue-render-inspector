// Event handlers for the visualizer UI
export class EventHandlers {
  constructor(state, canvasRenderer, treeLayout, notificationSystem, container) {
    this.state = state
    this.canvasRenderer = canvasRenderer
    this.treeLayout = treeLayout
    this.notificationSystem = notificationSystem
    this.container = container

    this.cleanupCallback = null
    this.centerTreeCallback = null
  }

  /**
   * Initialize all event handlers
   */
  initialize() {
    this._setupButtonHandlers()
  }

  /**
   * Setup button click handlers
   */
  _setupButtonHandlers() {
    // Center tree button
    const centerTreeBtn = this.container.querySelector('#vri-center-tree')
    if (centerTreeBtn) {
      centerTreeBtn.onclick = () => {
        if (this.centerTreeCallback) {
          this.centerTreeCallback()
        }
      }
    }

    // Toggle notifications
    const notificationsBtn = this.container.querySelector('#vri-toggle-notifications')
    if (notificationsBtn) {
      notificationsBtn.onclick = () => {
        this.notificationSystem.toggleVisibility()
      }
    }

    // Close button
    const closeBtn = this.container.querySelector('#vri-close')
    if (closeBtn) {
      closeBtn.onclick = () => {
        if (this.cleanupCallback) {
          this.cleanupCallback()
        }
        this.container.remove()
      }
    }
  }

  /**
   * Set callback for cleanup action
   * @param {Function} callback - Function to call when close button is clicked
   */
  setCleanupCallback(callback) {
    this.cleanupCallback = callback
  }

  /**
   * Set callback for center tree action
   * @param {Function} callback - Function to call when center tree button is clicked
   */
  setCenterTreeCallback(callback) {
    this.centerTreeCallback = callback
  }

  /**
   * Cleanup event handlers
   */
  cleanup() {
    // Remove all event handlers
    const elements = ['#vri-center-tree', '#vri-toggle-notifications', '#vri-close']

    elements.forEach(selector => {
      const element = this.container.querySelector(selector)
      if (element) {
        element.onclick = null
        element.onchange = null
        element.oninput = null
      }
    })

    this.cleanupCallback = null
    this.centerTreeCallback = null
  }
}
