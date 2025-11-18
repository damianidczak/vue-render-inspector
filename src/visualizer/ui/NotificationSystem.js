// Notification system for the visualizer
import { escapeHtml } from '../utils/helpers.js'

export class NotificationSystem {
  constructor() {
    this.MAX_NOTIFICATIONS = 10
    this.notifications = []
    this.notificationsVisible = true
    this.panel = null
    this.listElement = null
    this.navigateCallback = null
    this.selectCallback = null
    this.layout = 'overlay'
  }

  createPanel() {
    // Create notification panel
    const notificationPanel = document.createElement('div')
    Object.assign(notificationPanel.style, {
      background: 'rgba(30, 30, 30, 0.95)',
      border: '1px solid rgba(66, 184, 131, 0.3)',
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(10px)',
      willChange: 'opacity',
      transition: 'opacity 0.3s ease',
      overflowY: 'auto'
    })

    const notificationTitle = document.createElement('h4')
    notificationTitle.style.cssText = `
      margin: 0 0 10px 0;
      color: #42b883;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(66, 184, 131, 0.2);
    `
    notificationTitle.innerHTML = `
      <span style="display: flex; align-items: center; gap: 6px;">
        🔔 Component Changes
        <span id="notif-count" style="font-size: 10px; color: #666;">(0)</span>
      </span>
      <div>
        <button id="clear-notifications" style="
          background: transparent;
          border: 1px solid rgba(255, 87, 34, 0.5);
          color: #ff5722;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='rgba(255, 87, 34, 0.2)'"
           onmouseout="this.style.background='transparent'">
          Clear
        </button>
      </div>
    `
    notificationPanel.appendChild(notificationTitle)

    const notificationList = document.createElement('div')
    notificationList.id = 'notification-list'
    notificationList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `
    notificationPanel.appendChild(notificationList)

    this.panel = notificationPanel
    this.listElement = notificationList
    this._applyLayoutStyles()

    // Clear notifications handler
    this._setupClearHandler()

    return notificationPanel
  }
  setLayout(layout) {
    this.layout = layout
    this._applyLayoutStyles()
  }

  _setupClearHandler() {
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const clearBtn = document.getElementById('clear-notifications')
      if (clearBtn) {
        clearBtn.onclick = () => {
          this.notifications.length = 0
          this.render()
          this.updateBadge()
        }
      }
    }, 0)
  }

  setCallbacks(navigateCallback, selectCallback) {
    this.navigateCallback = navigateCallback
    this.selectCallback = selectCallback
  }

  addNotification(event) {
    const timestamp = new Date(event.timestamp)
    const timeStr = timestamp.toLocaleTimeString()

    const notification = {
      uid: event.uid,
      componentName: event.componentName,
      time: timeStr,
      timestamp: event.timestamp,
      reason: event.reason || 'update',
      isUnnecessary: event.isUnnecessary,
      duration: event.duration
    }

    // Add to beginning of array (newest first)
    this.notifications.unshift(notification)

    // Keep only latest MAX_NOTIFICATIONS
    if (this.notifications.length > this.MAX_NOTIFICATIONS) {
      this.notifications.pop()
    }

    this.render()
    this.updateBadge()
  }

  render() {
    if (!this.listElement) return

    // Update count
    const countElement = document.getElementById('notif-count')
    if (countElement) {
      countElement.textContent = `(${this.notifications.length})`
    }

    this.listElement.innerHTML = this.notifications
      .map((notif, index) => {
        const color = notif.isUnnecessary ? '#ff9800' : '#42b883'
        const icon = notif.isUnnecessary ? '⚠️' : '✓'
        const fadeOpacity = 1 - (index / this.MAX_NOTIFICATIONS) * 0.5 // Fade older notifications

        return `
        <div class="notification-item" data-uid="${notif.uid}" style="
          background: rgba(40, 40, 40, 0.8);
          border: 1px solid ${color}40;
          border-radius: 6px;
          padding: 10px;
          transition: background-color 0.2s ease, border-color 0.2s ease;
          opacity: ${fadeOpacity};
          position: relative;
          overflow: hidden;
        " 
        onmouseover="this.style.background='rgba(50, 50, 50, 0.9)'; this.style.borderColor='${color}80';"
        onmouseout="this.style.background='rgba(40, 40, 40, 0.8)'; this.style.borderColor='${color}40';">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
            <span style="color: ${color}; font-weight: 500; font-size: 12px;">
              ${icon} ${escapeHtml(notif.componentName)}
            </span>
            <span style="color: #666; font-size: 9px;">
              ${notif.time}
            </span>
          </div>
          <div style="color: #999; font-size: 10px; margin-bottom: 2px;">
            ${escapeHtml(notif.reason.replace(/[-_]/g, ' '))}
          </div>
          ${
            notif.duration
              ? `
            <div style="color: ${notif.duration > 16 ? '#ff5722' : '#42b883'}; font-size: 9px; margin-bottom: 6px;">
              ${notif.duration.toFixed(1)}ms
            </div>
          `
              : ''
          }
          
          <!-- Action buttons -->
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            <button class="notif-details-btn" data-uid="${notif.uid}" style="
              background: rgba(66, 184, 131, 0.2);
              border: 1px solid #42b883;
              color: #42b883;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 10px;
              cursor: pointer;
              flex: 1;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
            " onmouseover="this.style.background='rgba(66, 184, 131, 0.4)'"
               onmouseout="this.style.background='rgba(66, 184, 131, 0.2)'">
              <span>📋</span> Details
            </button>
            <button class="notif-goto-btn" data-uid="${notif.uid}" style="
              background: rgba(33, 150, 243, 0.2);
              border: 1px solid #2196f3;
              color: #2196f3;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 10px;
              cursor: pointer;
              flex: 1;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
            " onmouseover="this.style.background='rgba(33, 150, 243, 0.4)'"
               onmouseout="this.style.background='rgba(33, 150, 243, 0.2)'">
              <span>📍</span> Go to
            </button>
          </div>
          
          <div style="
            position: absolute;
            bottom: 0;
            left: 0;
            height: 2px;
            width: 100%;
            background: linear-gradient(90deg, ${color} 0%, transparent 100%);
            opacity: 0.5;
          "></div>
        </div>
      `
      })
      .join('')

    this._attachEventHandlers()
  }

  _attachEventHandlers() {
    // Add click handlers for details buttons
    this.listElement.querySelectorAll('.notif-details-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const uid = btn.getAttribute('data-uid')
        if (this.selectCallback) {
          this.selectCallback(uid)
        }
      })
    })

    // Add click handlers for go-to buttons
    this.listElement.querySelectorAll('.notif-goto-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const uid = btn.getAttribute('data-uid')
        if (this.navigateCallback) {
          this.navigateCallback(uid)
        }
      })
    })
  }

  updateBadge() {
    const btn = document.getElementById('vri-toggle-notifications')
    if (!btn) return

    if (!this.notificationsVisible && this.notifications.length > 0) {
      btn.innerHTML = `🔔 Notifications <span style="
        background: #ff5722;
        color: white;
        padding: 1px 5px;
        border-radius: 10px;
        font-size: 10px;
        margin-left: 4px;
      ">${this.notifications.length}</span>`
    } else {
      btn.innerHTML = '🔔 Notifications'
    }
  }

  toggleVisibility() {
    this.notificationsVisible = !this.notificationsVisible
    if (this.panel) {
      this.panel.style.display = this.notificationsVisible ? 'block' : 'none'
    }

    const btn = document.getElementById('vri-toggle-notifications')
    if (btn) {
      btn.style.background = this.notificationsVisible ? '#42b883' : '#666'
    }

    this.updateBadge()
  }

  setVisibility(visible) {
    this.notificationsVisible = visible
    if (this.panel) {
      this.panel.style.display = visible ? 'block' : 'none'
    }
    this.updateBadge()
  }

  clear() {
    this.notifications.length = 0
    this.render()
    this.updateBadge()
  }

  _applyLayoutStyles() {
    if (!this.panel) return
    const wasHidden = this.panel.style.display === 'none'

    // NotificationSystem is only used in overlay mode (canvas view)
    // Split view uses its own component changes list, not this panel
    Object.assign(this.panel.style, {
      position: 'absolute',
      left: '20px',
      top: '80px',
      width: '400px',
      maxHeight: '300px',
      height: 'auto',
      display: wasHidden ? 'none' : 'block'
    })
  }

  getCount() {
    return this.notifications.length
  }
}
