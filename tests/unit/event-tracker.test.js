/**
 * Unit Tests for EventTracker
 * Tests individual EventTracker functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as EventTrackerModule from '../../src/core/event-tracker.js'

const { EventTracker, EventTrigger } = EventTrackerModule

describe('EventTracker - Unit Tests', () => {
  let eventTracker

  beforeEach(() => {
    eventTracker = new EventTracker({
      enabled: true,
      eventContextTimeout: 100,
      debug: false
    })
  })

  afterEach(() => {
    eventTracker.clear()
    // Clean up global tracker
    if (window.__VRI_EVENT_TRACKER__) {
      delete window.__VRI_EVENT_TRACKER__
    }
  })

  describe('EventTrigger Class', () => {
    it('should create event trigger with correct properties', () => {
      const mockEvent = {
        type: 'click',
        eventPhase: 2,
        isTrusted: true
      }
      const mockTarget = { tagName: 'BUTTON', id: 'test-btn', className: 'btn primary' }

      const trigger = new EventTrigger(mockEvent, mockTarget)

      expect(trigger.type).toBe('click')
      expect(trigger.target).toBe('button#test-btn.btn.primary')
      expect(trigger.eventPhase).toBe(2)
      expect(trigger.isTrusted).toBe(true)
      expect(trigger.timestamp).toBeGreaterThan(0)
    })

    it('should handle elements without id or classes', () => {
      const mockEvent = { type: 'input' }
      const mockTarget = { tagName: 'INPUT' }

      const trigger = new EventTrigger(mockEvent, mockTarget)

      expect(trigger.target).toBe('input')
    })

    it('should handle null target gracefully', () => {
      const mockEvent = { type: 'click' }

      const trigger = new EventTrigger(mockEvent, null)

      expect(trigger.target).toBe('unknown')
    })

    it('should serialize to JSON correctly', () => {
      const mockEvent = { type: 'click' }
      const mockTarget = { tagName: 'BUTTON' }

      const trigger = new EventTrigger(mockEvent, mockTarget)
      const json = trigger.toJSON()

      expect(json.type).toBe('click')
      expect(json.target).toBe('button')
      expect(json.timestamp).toBe(trigger.timestamp)
    })
  })

  describe('EventTracker Core Functionality', () => {
    it('should initialize with correct default options', () => {
      const tracker = new EventTracker()

      expect(tracker.enabled).toBe(true)
      expect(tracker.eventContextTimeout).toBe(100)
      expect(tracker.debug).toBe(false)
    })

    it('should respect custom options', () => {
      const tracker = new EventTracker({
        enabled: false,
        eventContextTimeout: 500,
        debug: true
      })

      expect(tracker.enabled).toBe(false)
      expect(tracker.eventContextTimeout).toBe(500)
      expect(tracker.debug).toBe(true)
    })

    it('should start tracking when enabled', () => {
      const mockInstance = {}

      eventTracker.startTracking(mockInstance)

      // Should have set up global event tracking
      expect(typeof window.__VRI_EVENT_TRACKER__).toBe('object')
    })

    it('should not track when disabled', () => {
      const disabledTracker = new EventTracker({ enabled: false })
      const mockInstance = {}

      disabledTracker.startTracking(mockInstance)

      // Should not have set up global tracking
      expect(window.__VRI_EVENT_TRACKER__).toBeUndefined()
    })
  })

  describe('Event Context Management', () => {
    it('should set and clear event context', () => {
      const mockEvent = { type: 'click' }
      const mockInstance = {}

      eventTracker.setEventContext(mockEvent, mockInstance)

      expect(eventTracker.hasActiveEventContext()).toBe(true)
      expect(eventTracker.getCurrentEventContext()).toBeTruthy()

      eventTracker.clearEventContext()

      expect(eventTracker.hasActiveEventContext()).toBe(false)
      expect(eventTracker.getCurrentEventContext()).toBeNull()
    })

    it('should schedule event context clearing', async () => {
      vi.useFakeTimers()

      const mockEvent = { type: 'click' }
      eventTracker.setEventContext(mockEvent, null)
      eventTracker.scheduleEventContextClear()

      expect(eventTracker.hasActiveEventContext()).toBe(true)

      // Fast-forward time
      vi.advanceTimersByTime(150)

      expect(eventTracker.hasActiveEventContext()).toBe(false)

      vi.useRealTimers()
    })
  })

  describe('Event Association Logic', () => {
    it('should find current context event immediately', () => {
      const mockEvent = { type: 'click' }
      const mockInstance = {}
      const mockTarget = { tagName: 'BUTTON' }

      eventTracker.setEventContext(mockEvent, mockInstance)

      const foundTrigger = eventTracker.getLastEventTrigger(mockInstance)

      expect(foundTrigger).toBeTruthy()
      expect(foundTrigger.type).toBe('click')
    })

    it('should find stored context event', () => {
      const mockEvent = { type: 'input' }
      const mockInstance = {}

      eventTracker.setEventContext(mockEvent, mockInstance)

      // Clear current context but keep stored
      eventTracker.currentEventContext = null

      const foundTrigger = eventTracker.getLastEventTrigger(mockInstance)

      expect(foundTrigger).toBeTruthy()
      expect(foundTrigger.type).toBe('input')
    })

    it('should find recent global events within threshold', () => {
      const mockTarget = { tagName: 'DIV' }

      // Simulate global event capture
      eventTracker.handleGlobalEvent({
        type: 'mouseover',
        target: mockTarget,
        eventPhase: 2,
        isTrusted: true
      })

      const foundTrigger = eventTracker.getLastEventTrigger({})

      expect(foundTrigger).toBeTruthy()
      expect(foundTrigger.type).toBe('mouseover')
    })

    it('should return null when no events found', () => {
      const foundTrigger = eventTracker.getLastEventTrigger({})

      expect(foundTrigger).toBeNull()
    })
  })

  describe('Global Event Tracking', () => {
    it('should set up global event listeners for tracked event types', () => {
      // Mock window.addEventListener
      const addEventListenerSpy = vi
        .spyOn(document, 'addEventListener')
        .mockImplementation(() => {})

      eventTracker.setupGlobalEventTracking()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        expect.objectContaining({ capture: true, passive: true })
      )
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'input',
        expect.any(Function),
        expect.objectContaining({ capture: true, passive: true })
      )

      addEventListenerSpy.mockRestore()
    })

    it('should only track trusted events', () => {
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' },
        isTrusted: false
      }

      eventTracker.handleGlobalEvent(mockEvent)

      // Should not have stored the untrusted event
      expect(eventTracker.recentGlobalEvents.length).toBe(0)
    })

    it('should limit recent events storage', () => {
      // Add more events than the limit
      for (let i = 0; i < 15; i++) {
        eventTracker.handleGlobalEvent({
          type: 'click',
          target: { tagName: 'BUTTON' },
          isTrusted: true
        })
      }

      expect(eventTracker.recentGlobalEvents.length).toBe(10) // maxRecentEvents
    })
  })

  describe('Memory Management', () => {
    it('should clear all tracking data', () => {
      const mockEvent = { type: 'click' }
      const mockInstance = {}

      eventTracker.setEventContext(mockEvent, mockInstance)
      eventTracker.handleGlobalEvent({
        type: 'input',
        target: { tagName: 'INPUT' },
        isTrusted: true
      })

      eventTracker.clear()

      expect(eventTracker.componentEventContexts).toEqual(new WeakMap())
      expect(eventTracker.wrappedListeners).toEqual(new WeakMap())
      expect(eventTracker.recentGlobalEvents).toEqual([])
      expect(eventTracker.currentEventContext).toBeNull()
    })
  })
})
