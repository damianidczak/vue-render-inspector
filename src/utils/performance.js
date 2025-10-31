export class RenderTimer {
  constructor() {
    this.measurements = new Map()
  }
  start(componentId) {
    const measurementId = `${componentId}-${Date.now()}-${Math.random()}`
    if (typeof performance !== 'undefined') {
      const startTime = performance.now()
      this.measurements.set(measurementId, { startTime, componentId })
    }
    return measurementId
  }
  end(measurementId) {
    if (typeof performance === 'undefined') return null
    const measurement = this.measurements.get(measurementId)
    if (!measurement) return null
    const endTime = performance.now()
    const duration = endTime - measurement.startTime
    this.measurements.delete(measurementId)
    return Math.max(duration, 0.01)
  }
  clear() {
    this.measurements.clear()
  }
}
export class RenderFrequencyTracker {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 1000
    this.stormThreshold = options.stormThreshold || 5
    this.renderTimestamps = new Map()
  }
  recordRender(componentId, timestamp = Date.now()) {
    if (!this.renderTimestamps.has(componentId)) {
      this.renderTimestamps.set(componentId, [])
    }
    const timestamps = this.renderTimestamps.get(componentId)
    timestamps.push(timestamp)
    const cutoff = timestamp - this.windowSize
    const validTimestamps = timestamps.filter(ts => ts > cutoff)
    this.renderTimestamps.set(componentId, validTimestamps)
  }
  getRenderCount(componentId, windowSize = this.windowSize) {
    const timestamps = this.renderTimestamps.get(componentId)
    if (!timestamps) return 0
    const cutoff = Date.now() - windowSize
    return timestamps.filter(ts => ts > cutoff).length
  }

  getFrequency(componentId, windowSize = this.windowSize) {
    return this.getRenderCount(componentId, windowSize)
  }
  isRenderStorm(componentId) {
    return this.getRenderCount(componentId) >= this.stormThreshold
  }
  getActiveStorms() {
    const storms = []
    for (const [componentId, _timestamps] of this.renderTimestamps) {
      const count = this.getRenderCount(componentId)
      if (count >= this.stormThreshold) {
        storms.push({
          componentId,
          count,
          severity: this.calculateSeverity(count)
        })
      }
    }
    return storms
  }
  calculateSeverity(renderCount) {
    if (renderCount < this.stormThreshold * 2) return 'warning'
    if (renderCount < this.stormThreshold * 4) return 'error'
    return 'critical'
  }
  clear(componentId) {
    if (componentId) {
      this.renderTimestamps.delete(componentId)
    } else {
      this.renderTimestamps.clear()
    }
  }
}
export class MovingAverage {
  constructor(windowSize = 10) {
    this.windowSize = windowSize
    this.values = []
  }
  add(value) {
    this.values.push(value)
    if (this.values.length > this.windowSize) {
      this.values.shift()
    }
  }
  get() {
    if (this.values.length === 0) return 0
    const sum = this.values.reduce((acc, val) => acc + val, 0)
    return sum / this.values.length
  }
  reset() {
    this.values = []
  }

  clear() {
    this.values = []
  }
}
export async function measurePerformance(fn) {
  const start = performance.now()
  let result
  try {
    result = await fn()
  } catch (error) {
    const duration = performance.now() - start
    const errorResult = { result: null, duration, error }
    throw errorResult
  }
  const duration = performance.now() - start
  return {
    result,
    duration
  }
}
