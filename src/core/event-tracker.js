export class EventTrigger {
  constructor(event, target) {
    this.type = event.type
    this.target = this.getElementDescription(target)
    this.timestamp = Date.now()
    this.eventPhase = event.eventPhase
    this.isTrusted = event.isTrusted
  }
  getElementDescription(element) {
    if (!element) return 'unknown'
    const tagName = element.tagName?.toLowerCase() || 'unknown'
    const id = element.id ? `#${element.id}` : ''
    const className = element.className ? String(element.className) : ''
    const classes = className ? `.${className.split(' ').join('.')}` : ''
    const text = element.textContent?.trim().substring(0, 20) || ''
    let description = tagName
    if (id) description += id
    if (classes) description += classes
    if (text) description += ` "${text}"`
    return description
  }
  toJSON() {
    return {
      type: this.type,
      target: this.target,
      timestamp: this.timestamp,
      eventPhase: this.eventPhase,
      isTrusted: this.isTrusted
    }
  }
}
export class EventTracker {
  constructor(options = {}) {
    this.enabled = options.enabled !== false
    this.eventContextTimeout = options.eventContextTimeout || 100
    this.debug = options.debug || false
    this.componentEventContexts = new WeakMap()
    this.wrappedListeners = new WeakMap()
    this.currentEventContext = null
    this.eventContextTimer = null
    this.recentGlobalEvents = []
    this.maxRecentEvents = 10
  }
  startTracking(instance) {
    if (!this.enabled || !instance) return
    this.setupGlobalEventTracking()
  }
  setupGlobalEventTracking() {
    if (typeof window === 'undefined' || window.__VRI_EVENT_TRACKER__) return
    window.__VRI_EVENT_TRACKER__ = this
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
    eventTypes.forEach(eventType => {
      document.addEventListener(eventType, this.handleGlobalEvent.bind(this), {
        capture: true,
        passive: true
      })
    })
  }
  handleGlobalEvent(event) {
    if (!event.isTrusted) return
    const eventTrigger = new EventTrigger(event, event.target)
    if (this.debug) {
      console.log(
        '[VRI-EVENT] Captured global event:',
        eventTrigger.type,
        'on',
        eventTrigger.target
      )
    }
    this.recentGlobalEvents.push({
      eventTrigger,
      timestamp: Date.now()
    })
    if (this.recentGlobalEvents.length > this.maxRecentEvents) {
      this.recentGlobalEvents.shift()
    }
    this.setEventContext(eventTrigger, null)
    this.scheduleEventContextClear()
  }
  recordEvent(event, instance) {
    if (!this.enabled || !event) return
    this.setEventContext(event, instance)
    this.scheduleEventContextClear()
  }
  wrapElementEventListeners(element, instance) {
    if (!element || this.wrappedListeners.has(element)) return
    this.wrappedListeners.set(element, true)
    const originalAddEventListener = element.addEventListener
    element.addEventListener = (type, listener, options) => {
      const wrappedListener = this.wrapEventListener(listener, type, instance)
      return originalAddEventListener.call(element, type, wrappedListener, options)
    }
  }
  wrapEventListener(listener, instance) {
    return event => {
      try {
        this.setEventContext(event, instance)
        const result = listener.call(this, event)
        this.scheduleEventContextClear()
        return result
      } catch (_error) {
        this.clearEventContext()
        throw _error
      }
    }
  }
  setEventContext(event, instance) {
    if (!event) return
    const eventTrigger = new EventTrigger(event, event.target)
    this.currentEventContext = {
      eventTrigger,
      instance,
      timestamp: Date.now()
    }
    if (instance) {
      this.componentEventContexts.set(instance, eventTrigger)
    }
  }
  scheduleEventContextClear() {
    if (this.eventContextTimer) {
      clearTimeout(this.eventContextTimer)
    }
    this.eventContextTimer = setTimeout(() => {
      this.clearEventContext()
    }, this.eventContextTimeout)
  }
  clearEventContext() {
    this.currentEventContext = null
    if (this.eventContextTimer) {
      clearTimeout(this.eventContextTimer)
      this.eventContextTimer = null
    }
  }
  getLastEventTrigger(instance) {
    if (!instance) return null
    const componentName = instance?.type?.__name || 'Unknown'
    if (
      this.currentEventContext &&
      this.currentEventContext.instance === instance &&
      Date.now() - this.currentEventContext.timestamp < this.eventContextTimeout
    ) {
      if (this.debug) {
        console.log(
          `[VRI-EVENT] Found current context event for ${componentName}:`,
          this.currentEventContext.eventTrigger.type
        )
      }
      return this.currentEventContext.eventTrigger
    }
    const stored = this.componentEventContexts.get(instance)
    if (stored) {
      if (this.debug) {
        console.log(`[VRI-EVENT] Found stored context event for ${componentName}:`, stored.type)
      }
      return stored
    }
    const now = Date.now()
    const recentThreshold = 500
    for (let i = this.recentGlobalEvents.length - 1; i >= 0; i--) {
      const recentEvent = this.recentGlobalEvents[i]
      if (now - recentEvent.timestamp < recentThreshold) {
        if (this.debug) {
          console.log(
            `[VRI-EVENT] Found recent global event for ${componentName}:`,
            recentEvent.eventTrigger.type,
            `(${now - recentEvent.timestamp}ms ago)`
          )
        }
        return recentEvent.eventTrigger
      }
    }
    const extendedThreshold = 1000
    for (let i = this.recentGlobalEvents.length - 1; i >= 0; i--) {
      const recentEvent = this.recentGlobalEvents[i]
      if (now - recentEvent.timestamp < extendedThreshold) {
        const extendedEvent = Object.assign({}, recentEvent.eventTrigger)
        extendedEvent._extendedContext = true
        if (this.debug) {
          console.log(
            `[VRI-EVENT] Found extended context event for ${componentName}:`,
            recentEvent.eventTrigger.type,
            `(${now - recentEvent.timestamp}ms ago - extended)`
          )
        }
        return extendedEvent
      }
    }
    if (this.debug) {
      console.log(
        `[VRI-EVENT] No event found for ${componentName}. Recent events:`,
        this.recentGlobalEvents.length
      )
      if (this.recentGlobalEvents.length > 0) {
        const lastEvent = this.recentGlobalEvents[this.recentGlobalEvents.length - 1]
        console.log(
          `[VRI-EVENT] Last event was ${now - lastEvent.timestamp}ms ago:`,
          lastEvent.eventTrigger.type,
          'on',
          lastEvent.eventTrigger.target
        )
      }
    }
    return null
  }
  hasActiveEventContext() {
    return this.currentEventContext !== null
  }
  getCurrentEventContext() {
    return this.currentEventContext
  }
  clear() {
    this.componentEventContexts = new WeakMap()
    this.wrappedListeners = new WeakMap()
    this.recentGlobalEvents = []
    this.clearEventContext()
  }
}
