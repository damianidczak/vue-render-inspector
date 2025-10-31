import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventTrigger, EventTracker } from '../../../src/core/event-tracker.js'

describe('EventTrigger', () => {
  let mockEvent
  let mockTarget

  beforeEach(() => {
    mockTarget = {
      tagName: 'BUTTON',
      id: 'submit-btn',
      className: 'primary large',
      textContent: 'Click Me!'
    }

    mockEvent = {
      type: 'click',
      eventPhase: 2,
      isTrusted: true,
      target: mockTarget
    }
  })

  describe('Constructor', () => {
    it('should initialize with event properties', () => {
      const trigger = new EventTrigger(mockEvent, mockTarget)

      expect(trigger.type).toBe('click')
      expect(trigger.eventPhase).toBe(2)
      expect(trigger.isTrusted).toBe(true)
      expect(trigger.timestamp).toBeTypeOf('number')
    })

    it('should capture element description', () => {
      const trigger = new EventTrigger(mockEvent, mockTarget)

      expect(trigger.target).toContain('button')
      expect(trigger.target).toContain('#submit-btn')
    })
  })

  describe('getElementDescription', () => {
    it('should return description with tag, id, and classes', () => {
      const trigger = new EventTrigger(mockEvent, mockTarget)
      const description = trigger.getElementDescription(mockTarget)

      expect(description).toContain('button')
      expect(description).toContain('#submit-btn')
      expect(description).toContain('.primary')
      expect(description).toContain('.large')
    })

    it('should include text content', () => {
      const trigger = new EventTrigger(mockEvent, mockTarget)
      const description = trigger.getElementDescription(mockTarget)

      expect(description).toContain('"Click Me!"')
    })

    it('should handle element without ID', () => {
      const element = {
        tagName: 'DIV',
        className: 'container'
      }

      const trigger = new EventTrigger(mockEvent, element)
      const description = trigger.getElementDescription(element)

      expect(description).toContain('div')
      expect(description).not.toContain('#')
    })

    it('should handle element without classes', () => {
      const element = {
        tagName: 'SPAN',
        id: 'label'
      }

      const trigger = new EventTrigger(mockEvent, element)
      const description = trigger.getElementDescription(element)

      expect(description).toContain('span')
      expect(description).toContain('#label')
      expect(description).not.toContain('.')
    })

    it('should handle null element', () => {
      const trigger = new EventTrigger(mockEvent, null)
      const description = trigger.getElementDescription(null)

      expect(description).toBe('unknown')
    })

    it('should handle undefined element', () => {
      const trigger = new EventTrigger(mockEvent, undefined)
      const description = trigger.getElementDescription(undefined)

      expect(description).toBe('unknown')
    })

    it('should truncate long text content to 20 characters', () => {
      const element = {
        tagName: 'P',
        textContent: 'This is a very long text content that should be truncated'
      }

      const trigger = new EventTrigger(mockEvent, element)
      const description = trigger.getElementDescription(element)

      expect(description).toContain('"This is a very long')
      expect(description.length).toBeLessThan(100)
    })

    it('should handle element without tagName', () => {
      const element = {
        id: 'test'
      }

      const trigger = new EventTrigger(mockEvent, element)
      const description = trigger.getElementDescription(element)

      expect(description).toContain('unknown')
    })

    it('should handle className as string', () => {
      const element = {
        tagName: 'DIV',
        className: 'class1 class2 class3'
      }

      const trigger = new EventTrigger(mockEvent, element)
      const description = trigger.getElementDescription(element)

      expect(description).toContain('.class1')
      expect(description).toContain('.class2')
      expect(description).toContain('.class3')
    })
  })

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const trigger = new EventTrigger(mockEvent, mockTarget)
      const json = trigger.toJSON()

      expect(json).toHaveProperty('type', 'click')
      expect(json).toHaveProperty('target')
      expect(json).toHaveProperty('timestamp')
      expect(json).toHaveProperty('eventPhase', 2)
      expect(json).toHaveProperty('isTrusted', true)
    })
  })
})

describe('EventTracker', () => {
  let tracker
  let originalWindow
  let originalDocument

  beforeEach(() => {
    // Save originals
    originalWindow = global.window
    originalDocument = global.document

    // Setup minimal DOM
    global.window = {
      __VRI_EVENT_TRACKER__: undefined
    }

    global.document = {
      addEventListener: vi.fn()
    }

    tracker = new EventTracker({ enabled: true })
  })

  afterEach(() => {
    if (tracker) {
      tracker.clear()
    }

    // Restore originals
    global.window = originalWindow
    global.document = originalDocument
  })

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const defaultTracker = new EventTracker()

      expect(defaultTracker.enabled).toBe(true)
      expect(defaultTracker.eventContextTimeout).toBe(100)
      expect(defaultTracker.debug).toBe(false)
      expect(defaultTracker.maxRecentEvents).toBe(10)
    })

    it('should accept custom options', () => {
      const customTracker = new EventTracker({
        enabled: false,
        eventContextTimeout: 200,
        debug: true
      })

      expect(customTracker.enabled).toBe(false)
      expect(customTracker.eventContextTimeout).toBe(200)
      expect(customTracker.debug).toBe(true)
    })

    it('should initialize empty state', () => {
      expect(tracker.currentEventContext).toBeNull()
      expect(tracker.eventContextTimer).toBeNull()
      expect(tracker.recentGlobalEvents).toEqual([])
    })
  })

  describe('startTracking', () => {
    it('should start tracking when enabled', () => {
      const mockInstance = { uid: 123 }

      tracker.startTracking(mockInstance)

      expect(global.window.__VRI_EVENT_TRACKER__).toBe(tracker)
    })

    it('should not track when disabled', () => {
      const disabledTracker = new EventTracker({ enabled: false })
      const mockInstance = { uid: 123 }

      disabledTracker.startTracking(mockInstance)

      // Should not set up global tracking
      expect(global.window.__VRI_EVENT_TRACKER__).toBeUndefined()
    })

    it('should not track when instance is null', () => {
      tracker.startTracking(null)

      expect(global.window.__VRI_EVENT_TRACKER__).toBeUndefined()
    })
  })

  describe('setupGlobalEventTracking', () => {
    it('should register event listeners for all event types', () => {
      tracker.setupGlobalEventTracking()

      const eventTypes = [
        'click',
        'input',
        'change',
        'mouseover',
        'mouseout',
        'keydown',
        'keyup',
        'submit'
      ]

      expect(global.document.addEventListener).toHaveBeenCalledTimes(eventTypes.length)

      eventTypes.forEach(type => {
        expect(global.document.addEventListener).toHaveBeenCalledWith(type, expect.any(Function), {
          capture: true,
          passive: true
        })
      })
    })

    it('should not setup twice if already initialized', () => {
      tracker.setupGlobalEventTracking()
      global.document.addEventListener.mockClear()

      tracker.setupGlobalEventTracking()

      expect(global.document.addEventListener).not.toHaveBeenCalled()
    })

    it('should not setup when window is undefined', () => {
      const originalWindow = global.window
      delete global.window

      tracker.setupGlobalEventTracking()

      // Should not throw error
      expect(true).toBe(true)

      global.window = originalWindow
    })
  })

  describe('handleGlobalEvent', () => {
    it('should record trusted events', () => {
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        isTrusted: true,
        eventPhase: 2
      }

      tracker.handleGlobalEvent(mockEvent)

      expect(tracker.recentGlobalEvents.length).toBe(1)
      expect(tracker.recentGlobalEvents[0].eventTrigger.type).toBe('click')
    })

    it('should ignore untrusted events', () => {
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        isTrusted: false,
        eventPhase: 2
      }

      tracker.handleGlobalEvent(mockEvent)

      expect(tracker.recentGlobalEvents.length).toBe(0)
    })

    it('should limit recent events to maxRecentEvents', () => {
      for (let i = 0; i < 15; i++) {
        const mockEvent = {
          type: 'click',
          target: { tagName: 'BUTTON' },
          isTrusted: true,
          eventPhase: 2
        }
        tracker.handleGlobalEvent(mockEvent)
      }

      expect(tracker.recentGlobalEvents.length).toBe(tracker.maxRecentEvents)
      expect(tracker.recentGlobalEvents.length).toBe(10)
    })

    it('should set event context', () => {
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        isTrusted: true,
        eventPhase: 2
      }

      tracker.handleGlobalEvent(mockEvent)

      expect(tracker.currentEventContext).not.toBeNull()
      expect(tracker.currentEventContext.eventTrigger.type).toBe('click')
    })
  })

  describe('setEventContext and clearEventContext', () => {
    it('should set event context', () => {
      const mockEvent = {
        type: 'input',
        target: { tagName: 'INPUT' },
        eventPhase: 2,
        isTrusted: true
      }
      const mockInstance = { uid: 123 }

      tracker.setEventContext(mockEvent, mockInstance)

      expect(tracker.currentEventContext).not.toBeNull()
      expect(tracker.currentEventContext.eventTrigger.type).toBe('input')
      expect(tracker.currentEventContext.instance).toBe(mockInstance)
    })

    it('should handle null event', () => {
      tracker.setEventContext(null, {})

      expect(tracker.currentEventContext).toBeNull()
    })

    it('should clear event context', () => {
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        eventPhase: 2,
        isTrusted: true
      }

      tracker.setEventContext(mockEvent, null)
      expect(tracker.currentEventContext).not.toBeNull()

      tracker.clearEventContext()
      expect(tracker.currentEventContext).toBeNull()
    })

    it('should clear timeout when clearing context', () => {
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        eventPhase: 2,
        isTrusted: true
      }

      tracker.setEventContext(mockEvent, null)
      tracker.scheduleEventContextClear()

      expect(tracker.eventContextTimer).not.toBeNull()

      tracker.clearEventContext()
      expect(tracker.eventContextTimer).toBeNull()
    })
  })

  describe('scheduleEventContextClear', () => {
    it('should schedule context clear after timeout', async () => {
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        eventPhase: 2,
        isTrusted: true
      }

      tracker.setEventContext(mockEvent, null)
      tracker.scheduleEventContextClear()

      expect(tracker.currentEventContext).not.toBeNull()

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, tracker.eventContextTimeout + 50))

      expect(tracker.currentEventContext).toBeNull()
    })

    it('should cancel previous timeout when called again', () => {
      tracker.scheduleEventContextClear()
      const firstTimer = tracker.eventContextTimer

      tracker.scheduleEventContextClear()
      const secondTimer = tracker.eventContextTimer

      expect(firstTimer).not.toBe(secondTimer)
    })
  })

  describe('getLastEventTrigger', () => {
    it('should return current context event for matching instance', () => {
      const mockInstance = { uid: 123, type: { __name: 'TestComponent' } }
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        eventPhase: 2,
        isTrusted: true
      }

      tracker.setEventContext(mockEvent, mockInstance)

      const result = tracker.getLastEventTrigger(mockInstance)

      expect(result).not.toBeNull()
      expect(result.type).toBe('click')
    })

    it('should return null when no instance provided', () => {
      const result = tracker.getLastEventTrigger(null)

      expect(result).toBeNull()
    })

    it('should return stored context for instance', () => {
      const mockInstance = { uid: 123, type: { __name: 'TestComponent' } }
      const mockEvent = {
        type: 'input',
        target: { tagName: 'INPUT' },
        eventPhase: 2,
        isTrusted: true
      }

      tracker.setEventContext(mockEvent, mockInstance)
      tracker.clearEventContext() // Clear current but keep stored

      const result = tracker.getLastEventTrigger(mockInstance)

      expect(result).not.toBeNull()
      expect(result.type).toBe('input')
    })

    it('should return recent global event within threshold', () => {
      const mockInstance = { uid: 123, type: { __name: 'TestComponent' } }
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        isTrusted: true,
        eventPhase: 2
      }

      tracker.handleGlobalEvent(mockEvent)

      const result = tracker.getLastEventTrigger(mockInstance)

      expect(result).not.toBeNull()
      expect(result.type).toBe('click')
    })

    it('should return null when no matching event found', async () => {
      const mockInstance = { uid: 123, type: { __name: 'TestComponent' } }

      // Add old event
      const oldEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        isTrusted: true,
        eventPhase: 2
      }
      tracker.handleGlobalEvent(oldEvent)

      // Wait past extended threshold
      await new Promise(resolve => setTimeout(resolve, 1100))

      const result = tracker.getLastEventTrigger(mockInstance)

      expect(result).toBeNull()
    })
  })

  describe('hasActiveEventContext', () => {
    it('should return true when context is active', () => {
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        eventPhase: 2,
        isTrusted: true
      }

      tracker.setEventContext(mockEvent, null)

      expect(tracker.hasActiveEventContext()).toBe(true)
    })

    it('should return false when no context', () => {
      expect(tracker.hasActiveEventContext()).toBe(false)
    })
  })

  describe('getCurrentEventContext', () => {
    it('should return current context', () => {
      const mockEvent = {
        type: 'change',
        target: { tagName: 'SELECT' },
        eventPhase: 2,
        isTrusted: true
      }
      const mockInstance = { uid: 456 }

      tracker.setEventContext(mockEvent, mockInstance)

      const context = tracker.getCurrentEventContext()

      expect(context).not.toBeNull()
      expect(context.eventTrigger.type).toBe('change')
      expect(context.instance).toBe(mockInstance)
    })

    it('should return null when no context', () => {
      const context = tracker.getCurrentEventContext()

      expect(context).toBeNull()
    })
  })

  describe('recordEvent', () => {
    it('should record event and schedule clear', () => {
      const mockEvent = {
        type: 'submit',
        target: { tagName: 'FORM' },
        eventPhase: 2,
        isTrusted: true
      }
      const mockInstance = { uid: 789 }

      tracker.recordEvent(mockEvent, mockInstance)

      expect(tracker.currentEventContext).not.toBeNull()
      expect(tracker.eventContextTimer).not.toBeNull()
    })

    it('should not record when disabled', () => {
      const disabledTracker = new EventTracker({ enabled: false })
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        eventPhase: 2,
        isTrusted: true
      }

      disabledTracker.recordEvent(mockEvent, {})

      expect(disabledTracker.currentEventContext).toBeNull()
    })

    it('should not record null event', () => {
      tracker.recordEvent(null, {})

      expect(tracker.currentEventContext).toBeNull()
    })
  })

  describe('clear', () => {
    it('should reset all state', () => {
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        isTrusted: true,
        eventPhase: 2
      }

      tracker.handleGlobalEvent(mockEvent)
      tracker.setEventContext(mockEvent, { uid: 1 })

      tracker.clear()

      expect(tracker.recentGlobalEvents).toEqual([])
      expect(tracker.currentEventContext).toBeNull()
      expect(tracker.componentEventContexts).toBeDefined()
      expect(tracker.wrappedListeners).toBeDefined()
    })
  })

  describe('wrapEventListener', () => {
    it('should wrap listener and set context on execution', () => {
      const mockInstance = { uid: 123 }
      const mockListener = vi.fn()
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        eventPhase: 2,
        isTrusted: true
      }

      const wrappedListener = tracker.wrapEventListener(mockListener, mockInstance)
      wrappedListener(mockEvent)

      expect(mockListener).toHaveBeenCalledWith(mockEvent)
      expect(tracker.currentEventContext).not.toBeNull()
    })

    it('should clear context on listener error', () => {
      const mockInstance = { uid: 123 }
      const mockListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        eventPhase: 2,
        isTrusted: true
      }

      const wrappedListener = tracker.wrapEventListener(mockListener, mockInstance)

      expect(() => wrappedListener(mockEvent)).toThrow('Listener error')
      expect(tracker.currentEventContext).toBeNull()
    })
  })
})
