import { RenderFrequencyTracker, MovingAverage } from '../utils/performance.js'
export class RenderRecord {
  constructor(data) {
    this.id = `${data.uid}-${Date.now()}-${Math.random()}`
    this.timestamp = data.timestamp || Date.now()
    this.uid = data.uid
    this.componentName = data.componentName
    this.reason = data.reason
    this.details = data.details
    this.isUnnecessary = data.isUnnecessary || false
    this.duration = data.duration || null
    this.propsDiff = data.propsDiff || null
    this.stateDiff = data.stateDiff || null
    this.suggestions = data.suggestions || []
    this.triggerMechanism = data.triggerMechanism || 'unknown'
    this.triggerSource = data.triggerSource || 'unknown'
    this.eventTrigger = data.eventTrigger || null
    this.reactivityTracking = data.reactivityTracking || []
    this.reactivityTriggers = data.reactivityTriggers || []
  }
  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      uid: this.uid,
      componentName: this.componentName,
      reason: this.reason,
      details: this.details,
      isUnnecessary: this.isUnnecessary,
      duration: this.duration,
      hasPropsDiff: !!this.propsDiff,
      hasStateDiff: !!this.stateDiff,
      suggestionsCount: this.suggestions.length,
      triggerMechanism: this.triggerMechanism,
      triggerSource: this.triggerSource,
      eventTrigger: this.eventTrigger,
      reactivityTrackingCount: this.reactivityTracking.length,
      reactivityTriggersCount: this.reactivityTriggers.length
    }
  }
}
export class ComponentStats {
  constructor(componentName, uid) {
    this.componentName = componentName
    this.uid = uid
    this.totalRenders = 0
    this.unnecessaryRenders = 0
    this.avgRenderTime = new MovingAverage(20)
    this.lastRender = null
    this.firstRender = null
  }
  recordRender(record) {
    if (!this.firstRender) {
      this.firstRender = record.timestamp
    }
    this.totalRenders++
    if (record.isUnnecessary) {
      this.unnecessaryRenders++
    }
    if (record.duration !== null) {
      this.avgRenderTime.add(record.duration)
    }
    this.lastRender = record.timestamp
  }
  getUnnecessaryPercentage() {
    if (this.totalRenders === 0) return 0
    return (this.unnecessaryRenders / this.totalRenders) * 100
  }
  getAvgRenderTime() {
    return this.avgRenderTime.get()
  }
  toJSON() {
    return {
      componentName: this.componentName,
      uid: this.uid,
      totalRenders: this.totalRenders,
      unnecessaryRenders: this.unnecessaryRenders,
      unnecessaryPercentage: this.getUnnecessaryPercentage().toFixed(1),
      avgRenderTime: this.getAvgRenderTime().toFixed(2),
      firstRender: this.firstRender,
      lastRender: this.lastRender
    }
  }
}
export class RenderTracker {
  constructor(options = {}) {
    this.maxRecords = options.maxRecords || 1000
    this.records = []
    this.componentStats = new Map()
    this.frequencyTracker = new RenderFrequencyTracker({
      windowSize: options.stormWindow || 1000,
      stormThreshold: options.stormThreshold || 5
    })
  }
  trackRender(renderData) {
    const record = new RenderRecord(renderData)
    this.records.push(record)
    if (this.records.length > this.maxRecords) {
      this.records.shift()
    }
    if (!this.componentStats.has(record.uid)) {
      this.componentStats.set(record.uid, new ComponentStats(record.componentName, record.uid))
    }
    this.componentStats.get(record.uid).recordRender(record)
    this.frequencyTracker.recordRender(this.getComponentKey(record), record.timestamp)
    return record
  }
  getRecentRecords(limit = 20) {
    return this.records.slice(-limit)
  }
  getComponentRecords(uid, limit = 50) {
    return this.records.filter(r => r.uid === uid).slice(-limit)
  }
  getUnnecessaryRenders(limit = 50) {
    return this.records.filter(r => r.isUnnecessary).slice(-limit)
  }
  getComponentStats(uid) {
    return this.componentStats.get(uid) || null
  }
  getAllStats() {
    return Array.from(this.componentStats.values())
  }
  getTopOffenders(limit = 10) {
    return this.getAllStats()
      .filter(stats => stats.unnecessaryRenders > 0)
      .sort((a, b) => b.unnecessaryRenders - a.unnecessaryRenders)
      .slice(0, limit)
  }
  getSlowestComponents(limit = 10) {
    return this.getAllStats()
      .filter(stats => stats.getAvgRenderTime() > 0)
      .sort((a, b) => b.getAvgRenderTime() - a.getAvgRenderTime())
      .slice(0, limit)
  }
  isRenderStorm(uid, componentName) {
    const key = this.getComponentKey({ uid, componentName })
    return this.frequencyTracker.isRenderStorm(key)
  }
  getActiveStorms() {
    return this.frequencyTracker.getActiveStorms()
  }
  getSummary() {
    const allStats = this.getAllStats()
    const totalRenders = allStats.reduce((sum, s) => sum + s.totalRenders, 0)
    const totalUnnecessary = allStats.reduce((sum, s) => sum + s.unnecessaryRenders, 0)
    return {
      totalComponents: allStats.length,
      totalRenders,
      totalUnnecessary,
      unnecessaryPercentage:
        totalRenders > 0 ? ((totalUnnecessary / totalRenders) * 100).toFixed(1) : 0,
      recordsStored: this.records.length,
      activeStorms: this.getActiveStorms().length
    }
  }
  clear(uid) {
    if (uid !== undefined) {
      this.records = this.records.filter(r => r.uid !== uid)
      this.componentStats.delete(uid)
    } else {
      this.records = []
      this.componentStats.clear()
      this.frequencyTracker.clear()
    }
  }
  getComponentKey(record) {
    return `${record.componentName}-${record.uid}`
  }
}
