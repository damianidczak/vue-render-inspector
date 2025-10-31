export class ReactivityTrackEvent {
  constructor(event) {
    this.type = 'track'
    this.effect = event.effect
    this.target = event.target
    this.operation = event.type
    this.key = event.key
    this.timestamp = Date.now()
  }
  getDescription() {
    const targetDesc = this.getTargetDescription()
    const operation = this.operation
    const key = this.key !== undefined ? `[${this.formatKey(this.key)}]` : ''
    return `${operation} ${targetDesc}${key}`
  }
  formatKey(key) {
    if (typeof key === 'symbol') {
      return `Symbol(${key.description || ''})`
    }
    return String(key)
  }
  getTargetDescription() {
    if (!this.target) return 'unknown'
    if (this.target.__v_isRef === true) {
      return 'ref'
    }
    if (this.target.__v_isReactive === true) {
      return 'reactive'
    }
    if (this.target.__v_isReadonly === true) {
      return 'readonly'
    }
    if (this.target.__v_isShallow === true) {
      return 'shallow'
    }
    if (this.target._isComputed === true) {
      return 'computed'
    }
    if (this.target._isEffect === true) {
      return 'effect'
    }
    if (this.target.constructor) {
      const constructorName = this.target.constructor.name
      if (constructorName === 'Object') {
        return 'object'
      }
      if (constructorName === 'Array') {
        return 'array'
      }
      if (constructorName === 'Map') {
        return 'map'
      }
      if (constructorName === 'Set') {
        return 'set'
      }
      return constructorName.toLowerCase()
    }
    return 'unknown'
  }
  toJSON() {
    return {
      type: this.type,
      operation: this.operation,
      key: this.key,
      targetType: this.getTargetDescription(),
      timestamp: this.timestamp
    }
  }
}
export class ReactivityTriggerEvent {
  constructor(event) {
    this.type = 'trigger'
    this.effect = event.effect
    this.target = event.target
    this.operation = event.type
    this.key = event.key
    this.newValue = event.newValue
    this.oldValue = event.oldValue
    this.oldTarget = event.oldTarget
    this.timestamp = Date.now()
  }
  getDescription() {
    const targetDesc = this.getTargetDescription()
    const operation = this.operation
    const key = this.key !== undefined ? `[${this.formatKey(this.key)}]` : ''
    let desc = `${operation} ${targetDesc}${key}`
    if (this.operation === 'set' && this.key !== undefined) {
      desc += `: ${this.formatValue(this.oldValue)} → ${this.formatValue(this.newValue)}`
    }
    return desc
  }
  formatKey(key) {
    if (typeof key === 'symbol') {
      return `Symbol(${key.description || ''})`
    }
    return String(key)
  }
  getTargetDescription() {
    if (!this.target) return 'unknown'
    if (this.target.__v_isRef === true) {
      return 'ref'
    }
    if (this.target.__v_isReactive === true) {
      return 'reactive'
    }
    if (this.target.__v_isReadonly === true) {
      return 'readonly'
    }
    if (this.target.__v_isShallow === true) {
      return 'shallow'
    }
    if (this.target._isComputed === true) {
      return 'computed'
    }
    if (this.target._isEffect === true) {
      return 'effect'
    }
    if (this.target.constructor) {
      const constructorName = this.target.constructor.name
      if (constructorName === 'Object') {
        return 'object'
      }
      if (constructorName === 'Array') {
        return 'array'
      }
      if (constructorName === 'Map') {
        return 'map'
      }
      if (constructorName === 'Set') {
        return 'set'
      }
      return constructorName.toLowerCase()
    }
    return 'unknown'
  }
  formatValue(value) {
    if (value === undefined) return 'undefined'
    if (value === null) return 'null'
    if (typeof value === 'string') {
      return `"${value.length > 20 ? `${value.substring(0, 20)}...` : value}"`
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    if (Array.isArray(value)) {
      return `Array(${value.length})`
    }
    if (typeof value === 'object') {
      return `{${Object.keys(value).length} keys}`
    }
    return typeof value
  }
  toJSON() {
    return {
      type: this.type,
      operation: this.operation,
      key: this.key,
      targetType: this.getTargetDescription(),
      oldValue: this.formatValue(this.oldValue),
      newValue: this.formatValue(this.newValue),
      timestamp: this.timestamp
    }
  }
}
export class ReactivityTracker {
  constructor(options = {}) {
    this.enabled = options.enabled !== false
    this.maxEvents = options.maxEvents || 100
    this.samplingRate = options.samplingRate || 1
    this.eventCount = 0
    this.componentTracking = new WeakMap()
    this.componentTriggers = new WeakMap()
    this.currentInstance = null
    this.isTracking = false
  }
  startTracking(instance) {
    if (!this.enabled || !instance) return
    this.currentInstance = instance
    this.isTracking = true
    this.componentTracking.set(instance, [])
    this.componentTriggers.set(instance, [])
  }
  stopTracking() {
    this.currentInstance = null
    this.isTracking = false
  }
  onTrack(event) {
    if (!this.isTracking || !this.currentInstance) return
    this.eventCount++
    if (this.samplingRate < 1 && Math.random() > this.samplingRate) {
      return
    }
    const trackingEvents = this.componentTracking.get(this.currentInstance)
    if (!trackingEvents) return
    const trackEvent = new ReactivityTrackEvent(event)
    trackingEvents.push(trackEvent)
    if (trackingEvents.length > this.maxEvents) {
      trackingEvents.shift()
    }
  }
  onTrigger(event) {
    if (!this.isTracking || !this.currentInstance) return
    if (this.samplingRate < 1 && Math.random() > this.samplingRate) {
      return
    }
    const triggerEvents = this.componentTriggers.get(this.currentInstance)
    if (!triggerEvents) return
    const triggerEvent = new ReactivityTriggerEvent(event)
    triggerEvents.push(triggerEvent)
    if (triggerEvents.length > this.maxEvents) {
      triggerEvents.shift()
    }
  }
  getTrackingEvents(instance) {
    return this.componentTracking.get(instance) || []
  }
  getTriggerEvents(instance) {
    return this.componentTriggers.get(instance) || []
  }
  clearInstance(instance) {
    this.componentTracking.delete(instance)
    this.componentTriggers.delete(instance)
  }
  clear() {
    this.componentTracking = new WeakMap()
    this.componentTriggers = new WeakMap()
    this.currentInstance = null
    this.isTracking = false
  }
  optimizeMemory(_maxAge = 30000) {}
  getMemoryStats() {
    return {
      instanceCount: 'unknown (WeakMap)',
      totalTrackingEvents: 'unknown (WeakMap)',
      totalTriggerEvents: 'unknown (WeakMap)',
      maxEventsPerInstance: this.maxEvents,
      samplingRate: this.samplingRate,
      enabled: this.enabled
    }
  }
  isCurrentlyTracking() {
    return this.isTracking
  }
  getCurrentInstance() {
    return this.currentInstance
  }
  analyzeComputedAccess(instance) {
    const trackingEvents = this.getTrackingEvents(instance)
    const triggerEvents = this.getTriggerEvents(instance)
    const analysis = {
      hasComputedAccess: false,
      computedAccessCount: 0,
      computedTriggers: [],
      computedDependencies: new Set(),
      potentialComputedReruns: []
    }
    for (const event of trackingEvents) {
      const targetType = event.getTargetDescription()
      if (targetType === 'computed') {
        analysis.hasComputedAccess = true
        analysis.computedAccessCount++
        if (event.key) {
          analysis.computedDependencies.add(event.key)
        }
      }
    }
    for (const event of triggerEvents) {
      const targetType = event.getTargetDescription()
      if (targetType === 'computed') {
        analysis.computedTriggers.push({
          key: event.key,
          operation: event.operation,
          oldValue: event.formatValue(event.oldValue),
          newValue: event.formatValue(event.newValue),
          timestamp: event.timestamp
        })
      }
    }
    if (analysis.hasComputedAccess && triggerEvents.length === 0) {
      analysis.potentialComputedReruns.push({
        reason: 'computed-access-without-triggers',
        description: 'Computed properties accessed but no reactive triggers detected',
        suggestion:
          'Check if computed dependencies are stable or if computed is being accessed unnecessarily'
      })
    }
    return analysis
  }
  isLikelyComputedTrigger(instance) {
    const analysis = this.analyzeComputedAccess(instance)
    if (analysis.computedTriggers.length > 0) {
      return true
    }
    if (analysis.hasComputedAccess && analysis.computedAccessCount > 2) {
      return true
    }
    return false
  }
}
