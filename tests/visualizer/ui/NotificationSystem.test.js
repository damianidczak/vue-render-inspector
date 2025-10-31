import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationSystem } from '../../../src/visualizer/ui/NotificationSystem.js'

describe('NotificationSystem', () => {
  let notificationSystem

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = ''
    notificationSystem = new NotificationSystem()
  })

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(notificationSystem.MAX_NOTIFICATIONS).toBe(10)
      expect(notificationSystem.notifications).toEqual([])
      expect(notificationSystem.notificationsVisible).toBe(true)
      expect(notificationSystem.panel).toBe(null)
      expect(notificationSystem.listElement).toBe(null)
      expect(notificationSystem.navigateCallback).toBe(null)
      expect(notificationSystem.selectCallback).toBe(null)
    })
  })

  describe('createPanel()', () => {
    it('should create notification panel with proper structure', () => {
      const panel = notificationSystem.createPanel()

      expect(panel).toBeDefined()
      expect(panel.tagName).toBe('DIV')
      expect(notificationSystem.panel).toBe(panel)

      // Check title exists
      const title = panel.querySelector('h4')
      expect(title).toBeDefined()
      expect(title.textContent).toContain('Component Changes')

      // Check clear button exists
      const clearBtn = panel.querySelector('#clear-notifications')
      expect(clearBtn).toBeDefined()
      expect(clearBtn.textContent).toContain('Clear')

      // Check list element exists
      const list = panel.querySelector('#notification-list')
      expect(list).toBeDefined()
      expect(notificationSystem.listElement).toBe(list)
    })

    it('should set up clear button handler', async () => {
      const panel = notificationSystem.createPanel()
      document.body.appendChild(panel)

      // Add some notifications
      notificationSystem.addNotification({
        uid: '1',
        componentName: 'TestComponent',
        timestamp: Date.now()
      })

      expect(notificationSystem.notifications).toHaveLength(1)

      // Wait for setTimeout in _setupClearHandler
      await new Promise(resolve => setTimeout(resolve, 10))

      // Click clear button
      const clearBtn = document.getElementById('clear-notifications')
      expect(clearBtn).toBeDefined()
      clearBtn.click()

      expect(notificationSystem.notifications).toHaveLength(0)
    })
  })

  describe('setCallbacks()', () => {
    it('should set navigation and selection callbacks', () => {
      const navigateFn = vi.fn()
      const selectFn = vi.fn()

      notificationSystem.setCallbacks(navigateFn, selectFn)

      expect(notificationSystem.navigateCallback).toBe(navigateFn)
      expect(notificationSystem.selectCallback).toBe(selectFn)
    })
  })

  describe('addNotification()', () => {
    it('should add notification to the beginning of array', () => {
      notificationSystem.createPanel()

      const event1 = {
        uid: '1',
        componentName: 'Component1',
        timestamp: Date.now(),
        reason: 'props-changed',
        isUnnecessary: false,
        duration: 5.5
      }

      const event2 = {
        uid: '2',
        componentName: 'Component2',
        timestamp: Date.now() + 1000,
        reason: 'state-updated',
        isUnnecessary: true,
        duration: 16.5
      }

      notificationSystem.addNotification(event1)
      expect(notificationSystem.notifications).toHaveLength(1)
      expect(notificationSystem.notifications[0].componentName).toBe('Component1')

      notificationSystem.addNotification(event2)
      expect(notificationSystem.notifications).toHaveLength(2)
      expect(notificationSystem.notifications[0].componentName).toBe('Component2')
      expect(notificationSystem.notifications[1].componentName).toBe('Component1')
    })

    it('should limit notifications to MAX_NOTIFICATIONS', () => {
      notificationSystem.createPanel()

      // Add more than MAX_NOTIFICATIONS
      for (let i = 1; i <= 15; i++) {
        notificationSystem.addNotification({
          uid: String(i),
          componentName: `Component${i}`,
          timestamp: Date.now() + i
        })
      }

      expect(notificationSystem.notifications).toHaveLength(10)
      // Should keep newest 10 (15 down to 6)
      expect(notificationSystem.notifications[0].componentName).toBe('Component15')
      expect(notificationSystem.notifications[9].componentName).toBe('Component6')
    })

    it('should format notification data correctly', () => {
      notificationSystem.createPanel()

      const timestamp = Date.now()
      const event = {
        uid: '123',
        componentName: 'TestComponent',
        timestamp,
        reason: 'props-changed',
        isUnnecessary: true,
        duration: 12.345
      }

      notificationSystem.addNotification(event)

      const notif = notificationSystem.notifications[0]
      expect(notif.uid).toBe('123')
      expect(notif.componentName).toBe('TestComponent')
      expect(notif.timestamp).toBe(timestamp)
      expect(notif.reason).toBe('props-changed')
      expect(notif.isUnnecessary).toBe(true)
      expect(notif.duration).toBe(12.345)
      expect(notif.time).toBeDefined()
    })
  })

  describe('render()', () => {
    it('should render notifications with proper HTML structure', () => {
      notificationSystem.createPanel()
      document.body.appendChild(notificationSystem.panel)

      notificationSystem.addNotification({
        uid: '1',
        componentName: 'TestComponent',
        timestamp: Date.now(),
        reason: 'props-changed',
        isUnnecessary: false,
        duration: 5.5
      })

      const items = notificationSystem.listElement.querySelectorAll('.notification-item')
      expect(items).toHaveLength(1)

      const item = items[0]
      expect(item.getAttribute('data-uid')).toBe('1')
      expect(item.textContent).toContain('TestComponent')
      expect(item.textContent).toContain('props changed')
      expect(item.textContent).toContain('5.5ms')
      expect(item.textContent).toContain('✓') // Not unnecessary
    })

    it('should render unnecessary notifications differently', () => {
      notificationSystem.createPanel()
      document.body.appendChild(notificationSystem.panel)

      notificationSystem.addNotification({
        uid: '1',
        componentName: 'TestComponent',
        timestamp: Date.now(),
        reason: 'no-props-changed',
        isUnnecessary: true,
        duration: 20
      })

      const item = notificationSystem.listElement.querySelector('.notification-item')
      expect(item.textContent).toContain('⚠️') // Unnecessary icon
      expect(item.innerHTML).toContain('#ff9800') // Warning color
      expect(item.innerHTML).toContain('#ff5722') // Slow render color
    })

    it('should update notification count', () => {
      notificationSystem.createPanel()
      document.body.appendChild(notificationSystem.panel)

      const countElement = document.getElementById('notif-count')
      expect(countElement.textContent).toBe('(0)')

      notificationSystem.addNotification({
        uid: '1',
        componentName: 'Test',
        timestamp: Date.now()
      })

      expect(countElement.textContent).toBe('(1)')
    })

    it('should escape HTML in component names and reasons', () => {
      notificationSystem.createPanel()
      document.body.appendChild(notificationSystem.panel)

      notificationSystem.addNotification({
        uid: '1',
        componentName: '<script>alert("XSS")</script>',
        timestamp: Date.now(),
        reason: '<img onerror="alert(\'XSS\')" src="x">'
      })

      const item = notificationSystem.listElement.querySelector('.notification-item')
      expect(item.innerHTML).not.toContain('<script>')
      expect(item.innerHTML).not.toContain('<img')
      expect(item.textContent).toContain('<script>alert("XSS")</script>')
    })
  })

  describe('Event handlers', () => {
    it('should call selectCallback when details button is clicked', async () => {
      const selectFn = vi.fn()
      notificationSystem.setCallbacks(null, selectFn)
      notificationSystem.createPanel()
      document.body.appendChild(notificationSystem.panel)

      notificationSystem.addNotification({
        uid: '123',
        componentName: 'Test',
        timestamp: Date.now()
      })

      const detailsBtn = notificationSystem.listElement.querySelector('.notif-details-btn')
      detailsBtn.click()

      expect(selectFn).toHaveBeenCalledWith('123')
    })

    it('should call navigateCallback when go-to button is clicked', async () => {
      const navigateFn = vi.fn()
      notificationSystem.setCallbacks(navigateFn, null)
      notificationSystem.createPanel()
      document.body.appendChild(notificationSystem.panel)

      notificationSystem.addNotification({
        uid: '456',
        componentName: 'Test',
        timestamp: Date.now()
      })

      const gotoBtn = notificationSystem.listElement.querySelector('.notif-goto-btn')
      gotoBtn.click()

      expect(navigateFn).toHaveBeenCalledWith('456')
    })
  })

  describe('updateBadge()', () => {
    it('should show badge count when notifications exist and panel is hidden', () => {
      // Create toggle button
      const toggleBtn = document.createElement('button')
      toggleBtn.id = 'vri-toggle-notifications'
      document.body.appendChild(toggleBtn)

      notificationSystem.createPanel()
      notificationSystem.notificationsVisible = false

      notificationSystem.addNotification({
        uid: '1',
        componentName: 'Test',
        timestamp: Date.now()
      })

      expect(toggleBtn.innerHTML).toContain('🔔 Notifications')
      expect(toggleBtn.innerHTML).toContain('>1<') // Badge with count
    })

    it('should not show badge when panel is visible', () => {
      const toggleBtn = document.createElement('button')
      toggleBtn.id = 'vri-toggle-notifications'
      document.body.appendChild(toggleBtn)

      notificationSystem.createPanel()
      notificationSystem.notificationsVisible = true

      notificationSystem.addNotification({
        uid: '1',
        componentName: 'Test',
        timestamp: Date.now()
      })

      expect(toggleBtn.innerHTML).toBe('🔔 Notifications')
    })
  })

  describe('toggleVisibility()', () => {
    it('should toggle panel visibility', () => {
      const panel = notificationSystem.createPanel()
      document.body.appendChild(panel)

      expect(notificationSystem.notificationsVisible).toBe(true)
      expect(panel.style.display).not.toBe('none')

      notificationSystem.toggleVisibility()
      expect(notificationSystem.notificationsVisible).toBe(false)
      expect(panel.style.display).toBe('none')

      notificationSystem.toggleVisibility()
      expect(notificationSystem.notificationsVisible).toBe(true)
      expect(panel.style.display).toBe('block')
    })

    it('should update toggle button style', () => {
      const toggleBtn = document.createElement('button')
      toggleBtn.id = 'vri-toggle-notifications'
      document.body.appendChild(toggleBtn)

      notificationSystem.createPanel()

      notificationSystem.toggleVisibility()
      expect(toggleBtn.style.background).toBe('#666')

      notificationSystem.toggleVisibility()
      expect(toggleBtn.style.background).toBe('#42b883')
    })
  })

  describe('setVisibility()', () => {
    it('should set panel visibility to specific value', () => {
      const panel = notificationSystem.createPanel()
      document.body.appendChild(panel)

      notificationSystem.setVisibility(false)
      expect(notificationSystem.notificationsVisible).toBe(false)
      expect(panel.style.display).toBe('none')

      notificationSystem.setVisibility(true)
      expect(notificationSystem.notificationsVisible).toBe(true)
      expect(panel.style.display).toBe('block')
    })
  })

  describe('clear()', () => {
    it('should clear all notifications', () => {
      notificationSystem.createPanel()

      // Add notifications
      for (let i = 1; i <= 5; i++) {
        notificationSystem.addNotification({
          uid: String(i),
          componentName: `Component${i}`,
          timestamp: Date.now() + i
        })
      }

      expect(notificationSystem.notifications).toHaveLength(5)

      notificationSystem.clear()

      expect(notificationSystem.notifications).toHaveLength(0)
      expect(notificationSystem.listElement.innerHTML).toBe('')
    })
  })

  describe('getCount()', () => {
    it('should return current notification count', () => {
      expect(notificationSystem.getCount()).toBe(0)

      notificationSystem.addNotification({
        uid: '1',
        componentName: 'Test',
        timestamp: Date.now()
      })

      expect(notificationSystem.getCount()).toBe(1)

      notificationSystem.clear()
      expect(notificationSystem.getCount()).toBe(0)
    })
  })

  describe('Edge cases', () => {
    it('should handle render without panel created', () => {
      expect(() => {
        notificationSystem.render()
      }).not.toThrow()
    })

    it('should handle missing callbacks gracefully', () => {
      notificationSystem.createPanel()
      document.body.appendChild(notificationSystem.panel)

      notificationSystem.addNotification({
        uid: '1',
        componentName: 'Test',
        timestamp: Date.now()
      })

      const detailsBtn = notificationSystem.listElement.querySelector('.notif-details-btn')
      const gotoBtn = notificationSystem.listElement.querySelector('.notif-goto-btn')

      expect(() => {
        detailsBtn.click()
        gotoBtn.click()
      }).not.toThrow()
    })

    it('should handle notification with missing optional fields', () => {
      notificationSystem.createPanel()

      notificationSystem.addNotification({
        uid: '1',
        componentName: 'Test',
        timestamp: Date.now()
        // No reason, isUnnecessary, or duration
      })

      const notif = notificationSystem.notifications[0]
      expect(notif.reason).toBe('update')
      expect(notif.isUnnecessary).toBeUndefined()
      expect(notif.duration).toBeUndefined()
    })
  })
})
