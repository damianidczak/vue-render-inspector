import { SnapshotManager } from '../utils/snapshot.js'
import { RenderDetector } from './detector.js'
import { RenderTracker } from './tracker.js'
import { RenderTimer } from '../utils/performance.js'
import { ConsoleReporter } from '../reporters/console-reporter.js'
import { RecreationDetector } from './recreation-detector.js'
import { initBroadcastChannel, broadcastRenderEvent } from './broadcast-channel.js'
import { EventTracker } from './event-tracker.js'
import { ReactivityTracker } from './reactivity-tracker.js'
import { shallowEqual as _shallowEqual } from '../utils/comparison.js'
import { detectEnhancedPatterns } from '../patterns/index.js'
export class ComponentProfiler {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      include: options.include || [],
      exclude: options.exclude || [],
      warnThreshold: options.warnThreshold || 16,
      errorThreshold: options.errorThreshold || 100,
      trackDependencies: options.trackDependencies || false,
      detectUnnecessary: options.detectUnnecessary !== false,
      strictMode: options.strictMode || false,
      ...options
    }
    this.snapshotManager = new SnapshotManager({
      maxHistorySize: options.maxHistorySize || 50
    })
    this.renderDetector = new RenderDetector({
      strictMode: this.options.strictMode,
      trackFunctions: true,
      reactivityTracker: this.reactivityTracker
    })
    this.renderTracker = new RenderTracker({
      maxRecords: options.maxRecords || 1000,
      stormWindow: options.stormWindow || 1000,
      stormThreshold: options.stormThreshold || 5
    })
    this.renderTimer = new RenderTimer()
    this.recreationDetector = new RecreationDetector({
      recreationWindow: options.recreationWindow || 100,
      maxTracked: 100
    })
    this.eventTracker = new EventTracker({
      enabled: options.trackEvents !== false,
      eventContextTimeout: options.eventContextTimeout || 500,
      debug: options.debugEvents || false
    })
    this.reactivityTracker = new ReactivityTracker({
      enabled: options.trackReactivity !== false,
      maxEvents: options.maxReactivityEvents || 100,
      samplingRate: options.reactivitySamplingRate || 1
    })
    this.reporter = new ConsoleReporter({
      enabled: options.console !== false,
      verbose: options.verbose || false,
      showTimestamp: options.showTimestamp !== false,
      showDuration: options.showDuration !== false,
      groupByComponent: options.groupByComponent || false,
      colorize: options.colorize !== false,
      warnThreshold: this.options.warnThreshold,
      errorThreshold: this.options.errorThreshold
    })
    this.isAttached = false
    this.trackedComponents = new WeakSet()
    this.componentTimers = new WeakMap()
    this.activeTrackingSet = new WeakSet()
    this.componentEventContexts = new WeakMap()
    this.enabledComponents = new Set()
    this.dynamicFilteringEnabled = false
    this.onBeforeUpdate = this.onBeforeUpdate.bind(this)
    this.onUpdated = this.onUpdated.bind(this)
    this.onBeforeMount = this.onBeforeMount.bind(this)
    this.onMounted = this.onMounted.bind(this)
    this.broadcastChannel = initBroadcastChannel()
    this.memoryCleanupInterval = options.memoryCleanupInterval || 30000
    this.memoryCleanupTimer = null
    if (this.memoryCleanupInterval > 0) {
      this.startMemoryCleanup()
    }
  }
  startMemoryCleanup() {
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer)
    }
    this.memoryCleanupTimer = setInterval(() => {
      this.optimizeMemory()
    }, this.memoryCleanupInterval)
  }
  stopMemoryCleanup() {
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer)
      this.memoryCleanupTimer = null
    }
  }
  optimizeMemory() {}
  getMemoryStats() {
    const reactivityStats = this.reactivityTracker ? this.reactivityTracker.getMemoryStats() : {}
    return {
      reactivity: reactivityStats,
      totalInstances: 'unknown (WeakMap)',
      totalEvents: 'unknown (WeakMap)',
      reactivityEnabled: reactivityStats.enabled,
      maxEventsPerInstance: reactivityStats.maxEventsPerInstance,
      samplingRate: reactivityStats.samplingRate
    }
  }
  profileComponent(instance) {
    if (!this.shouldTrackComponent(instance)) {
      return
    }
    if (this.trackedComponents.has(instance)) {
      return
    }
    this.trackedComponents.add(instance)
    this.eventTracker.startTracking(instance)
    this.setupReactivityHooks(instance)
    this.attachMountHooks(instance)
    this.attachUpdateHooks(instance)
    this.attachUnmountHooks(instance)
  }
  attachMountHooks(instance) {
    const originalBeforeMount = instance.bm
    const originalMounted = instance.m
    instance.bm = [...(originalBeforeMount || []), () => this.onBeforeMount(instance)]
    instance.m = [...(originalMounted || []), () => this.onMounted(instance)]
    if (instance.isMounted) {
      this.onMounted(instance)
    }
    this.attachUpdateHooks(instance)
    this.attachUnmountHooks(instance)
  }
  attachUpdateHooks(instance) {
    const originalBeforeUpdate = instance.bu
    const originalUpdated = instance.u
    instance.bu = [...(originalBeforeUpdate || []), () => this.onBeforeUpdate(instance)]
    instance.u = [...(originalUpdated || []), () => this.onUpdated(instance)]
  }
  attachUnmountHooks(instance) {
    const originalBeforeUnmount = instance.bum
    instance.bum = [...(originalBeforeUnmount || []), () => this.onBeforeUnmount(instance)]
  }
  onBeforeMount(instance) {
    if (this.activeTrackingSet.has(instance)) {
      return
    }
    const measurementId = this.renderTimer.start(instance.uid)
    this.componentTimers.set(instance, measurementId)
  }
  onMounted(instance) {
    if (this.activeTrackingSet.has(instance)) {
      return
    }
    try {
      this.activeTrackingSet.add(instance)
      const measurementId = this.componentTimers.get(instance)
      const duration = measurementId ? this.renderTimer.end(measurementId) : null
      const snapshot = this.snapshotManager.capture(instance, duration)
      const recreationInfo = this.recreationDetector.checkForRecreation(instance, snapshot)
      if (recreationInfo && recreationInfo.isRecreation) {
        this.trackRender(instance, {
          ...recreationInfo,
          isUnnecessary: true,
          duration
        })
      } else {
        this.trackRender(instance, {
          reason: 'initial-render',
          details: 'Component mounted',
          isUnnecessary: false,
          duration
        })
      }
      this.profileChildComponents(instance)
    } finally {
      this.activeTrackingSet.delete(instance)
    }
  }
  setupReactivityHooks(instance) {
    if (!this.reactivityTracker.enabled) return
    if (instance.__vri_reactivity_hooked) return
    instance.__vri_reactivity_hooked = true
    const effect = instance.effect || instance.renderEffect || instance.updateEffect
    if (effect) {
      const originalOnTrack = effect.onTrack
      const originalOnTrigger = effect.onTrigger
      effect.onTrack = event => {
        this.reactivityTracker.onTrack(event)
        if (originalOnTrack) originalOnTrack(event)
      }
      effect.onTrigger = event => {
        this.reactivityTracker.onTrigger(event)
        if (originalOnTrigger) originalOnTrigger(event)
      }
    }
    if (instance.ctx) {
      if (instance.ctx.rtc) {
        const originalRtc = instance.ctx.rtc
        instance.ctx.rtc = [
          ...(Array.isArray(originalRtc) ? originalRtc : [originalRtc]),
          event => this.reactivityTracker.onTrack(event)
        ]
      }
      if (instance.ctx.rtg) {
        const originalRtg = instance.ctx.rtg
        instance.ctx.rtg = [
          ...(Array.isArray(originalRtg) ? originalRtg : [originalRtg]),
          event => this.reactivityTracker.onTrigger(event)
        ]
      }
    }
    if (instance.update) {
      const originalUpdate = instance.update
      instance.update = (...args) => {
        this.reactivityTracker.startTracking(instance)
        const result = originalUpdate.apply(instance, args)
        this.reactivityTracker.stopTracking()
        return result
      }
    }
  }
  profileChildComponents(instance) {
    if (!instance.subTree) {
      return
    }
    const walkVNode = vnode => {
      if (!vnode) return
      if (vnode.component && vnode.component !== instance) {
        this.profileComponent(vnode.component)
      }
      if (vnode.children && Array.isArray(vnode.children)) {
        vnode.children.forEach(child => {
          if (typeof child === 'object') {
            walkVNode(child)
          }
        })
      }
      if (vnode.dynamicChildren) {
        vnode.dynamicChildren.forEach(child => walkVNode(child))
      }
    }
    walkVNode(instance.subTree)
  }
  onBeforeUpdate(instance) {
    if (this.activeTrackingSet.has(instance)) {
      return
    }
    const measurementId = this.renderTimer.start(instance.uid)
    this.componentTimers.set(instance, measurementId)
    this.reactivityTracker.startTracking(instance)
  }
  onUpdated(instance) {
    if (this.activeTrackingSet.has(instance)) {
      return
    }
    try {
      this.activeTrackingSet.add(instance)
      const measurementId = this.componentTimers.get(instance)
      const duration = measurementId ? this.renderTimer.end(measurementId) : null
      const prevSnapshot = this.snapshotManager.getLatest(instance.uid)
      const currentSnapshot = this.snapshotManager.capture(instance, duration)
      const reactivityTracking = this.reactivityTracker.getTrackingEvents(instance)
      const reactivityTriggers = this.reactivityTracker.getTriggerEvents(instance)
      const reactivityData = { reactivityTracking, reactivityTriggers }
      let analysis = {
        isUnnecessary: false,
        reason: 'update',
        details: 'Component updated',
        triggerMechanism: 'unknown',
        triggerSource: 'unknown'
      }
      if (this.options.detectUnnecessary && prevSnapshot) {
        const _hasReactivityEvents =
          (reactivityData.reactivityTracking && reactivityData.reactivityTracking.length > 0) ||
          (reactivityData.reactivityTriggers && reactivityData.reactivityTriggers.length > 0)
        const detectorAnalysis = this.renderDetector.analyze(
          prevSnapshot,
          currentSnapshot,
          null,
          reactivityData,
          instance
        )
        analysis = { ...analysis, ...detectorAnalysis }
        if (analysis.isUnnecessary) {
          if (analysis.reason === 'reference-changes-only') {
            analysis.triggerMechanism = 'reference-changes'
            analysis.triggerSource = 'parent-new-references'
            analysis.details =
              'Parent component created new object/array references with same content'
          } else {
            analysis.triggerMechanism = 'parent-rerender'
            analysis.triggerSource = 'same-props'
            analysis.details = 'Parent component re-rendered with identical props'
          }
        } else {
          const hasRealPropsChange = detectorAnalysis.propsHasRealChange
          const hasRealStateChange = detectorAnalysis.stateHasRealChange
          if (hasRealPropsChange && hasRealStateChange) {
            analysis.triggerMechanism = 'props-and-state'
            analysis.triggerSource = 'multiple'
          } else if (hasRealPropsChange) {
            analysis.triggerMechanism = 'props'
            analysis.triggerSource =
              Object.keys(detectorAnalysis.propsDiff.changed).find(key => {
                const change = detectorAnalysis.propsDiff.changed[key]
                return !change.deepEqual
              }) ||
              Object.keys(detectorAnalysis.propsDiff.added)[0] ||
              Object.keys(detectorAnalysis.propsDiff.removed)[0] ||
              'unknown'
          } else if (hasRealStateChange) {
            analysis.triggerMechanism = 'state'
            analysis.triggerSource =
              Object.keys(detectorAnalysis.stateDiff.changed).find(key => {
                const change = detectorAnalysis.stateDiff.changed[key]
                return !change.deepEqual
              }) || 'unknown'
          } else {
            analysis.triggerMechanism = 'unknown'
            analysis.triggerSource = 'unknown'
          }
          analysis.reason = `${analysis.triggerMechanism}-changed`
          analysis.details = `${analysis.triggerMechanism} changed`
        }
      }
      const isStorm = this.renderTracker.isRenderStorm(instance.uid, currentSnapshot.componentName)
      if (isStorm) {
        analysis.isStorm = true
        if (!analysis.suggestions) analysis.suggestions = []
        analysis.suggestions.unshift(
          '🚨 RENDER STORM DETECTED: This component is re-rendering too frequently!'
        )
      }
      const eventTrigger = this.eventTracker.getLastEventTrigger(instance)
      this.reactivityTracker.stopTracking()
      this.trackRender(instance, {
        ...analysis,
        duration,
        eventTrigger,
        reactivityTracking,
        reactivityTriggers
      })
    } finally {
      this.activeTrackingSet.delete(instance)
    }
  }
  onBeforeUnmount(instance) {
    const snapshot = this.snapshotManager.getLatest(instance.uid)
    if (snapshot) {
      this.recreationDetector.recordUnmount(instance, snapshot)
    }
  }
  trackRender(instance, data) {
    const snapshot = this.snapshotManager.getLatest(instance.uid)
    const renderData = {
      uid: instance.uid,
      componentName: snapshot?.componentName || 'Unknown',
      timestamp: Date.now(),
      ...data
    }
    const record = this.renderTracker.trackRender(renderData)
    if (!this.dynamicFilteringEnabled || this.enabledComponents.has(instance.uid)) {
      this.reporter.report(record)
    }
    let parentUid = null
    let parent = instance.parent
    let depth = 0
    const maxDepth = 50
    while (parent && !parentUid && depth < maxDepth) {
      if (parent.uid !== undefined) {
        parentUid = parent.uid
        break
      }
      parent = parent.parent
      depth++
    }
    if (depth >= maxDepth && parent) {
      console.warn('[VRI] Deep component nesting detected for:', snapshot?.componentName)
    }
    const serializedReactivityTracking =
      renderData.reactivityTracking?.map(track =>
        track.getDescription ? track.getDescription() : String(track)
      ) || []
    const serializedReactivityTriggers =
      renderData.reactivityTriggers?.map(trigger =>
        trigger.getDescription ? trigger.getDescription() : String(trigger)
      ) || []
    const sourceInfo = {
      filePath: instance.type?.__file || null,
      componentType: instance.type?.__name
        ? 'Composition API'
        : instance.type?.name
          ? 'Options API'
          : 'Unknown'
    }

    // Run enhanced pattern detection
    let enhancedPatterns = []
    try {
      // Pass all available data for pattern detection
      const detectionData = {
        ...snapshot,
        ...renderData,
        renderFrequency: record?.renderFrequency || 0,
        componentName: renderData.componentName
      }
      enhancedPatterns = detectEnhancedPatterns(instance, detectionData, renderData.duration)

      // Log only if patterns detected
      if (enhancedPatterns.length > 0) {
        console.log(
          `[VRI] ✅ Detected ${enhancedPatterns.length} patterns for ${renderData.componentName}:`,
          enhancedPatterns.map(p => p.type)
        )
      }
    } catch (e) {
      console.debug('[VRI] Enhanced pattern detection error:', e)
    }

    broadcastRenderEvent({
      uid: instance.uid,
      parentUid,
      componentName: renderData.componentName,
      timestamp: renderData.timestamp,
      duration: renderData.duration,
      reason: renderData.reason,
      details: renderData.details,
      isUnnecessary: renderData.isUnnecessary,
      isRecreation: renderData.reason === 'component-recreation',
      triggerMechanism: renderData.triggerMechanism,
      triggerSource: renderData.triggerSource,
      suggestions: renderData.suggestions || [],
      eventTrigger: renderData.eventTrigger,
      reactivityTracking: serializedReactivityTracking,
      reactivityTriggers: serializedReactivityTriggers,
      reactivityTrackingCount: serializedReactivityTracking.length,
      reactivityTriggersCount: serializedReactivityTriggers.length,
      propsDiff: renderData.propsDiff || null,
      stateDiff: renderData.stateDiff || null,
      hasRealPropsChange: renderData.hasRealPropsChange || false,
      hasRealStateChange: renderData.hasRealStateChange || false,
      sourceInfo,
      enhancedPatterns: enhancedPatterns || []
    })
  }
  recordEvent(event, instance) {
    if (!instance) return
    const eventTrigger = {
      type: event.type,
      target: event.target?.tagName?.toLowerCase() || 'unknown',
      timestamp: Date.now(),
      isTrusted: event.isTrusted
    }
    this.componentEventContexts.set(instance, eventTrigger)
  }
  shouldTrackComponent(instance) {
    if (!this.options.enabled) {
      return false
    }
    if (!instance || !instance.type) {
      return false
    }
    const componentName = this.getComponentName(instance)
    if (this.options.exclude.length > 0) {
      for (const pattern of this.options.exclude) {
        if (this.matchPattern(componentName, pattern)) {
          return false
        }
      }
    }
    if (this.options.include.length > 0) {
      for (const pattern of this.options.include) {
        if (this.matchPattern(componentName, pattern)) {
          return true
        }
      }
      return false
    }
    if (this.dynamicFilteringEnabled && instance.uid !== undefined) {
      return this.enabledComponents.has(instance.uid)
    }
    return true
  }
  matchPattern(name, pattern) {
    if (pattern instanceof RegExp) {
      return pattern.test(name)
    }
    return name.includes(pattern)
  }
  getComponentName(instance) {
    if (!instance || !instance.type) return 'Unknown'
    const name =
      instance.type.__name ||
      instance.type.name ||
      instance.type.__file?.split('/').pop()?.replace('.vue', '') ||
      'Anonymous'
    if (name === 'Component') {
      return (
        instance.type.__file?.split('/').pop()?.replace('.vue', '') ||
        `Component_${instance.uid}` ||
        'Component'
      )
    }
    return name
  }
  getSummary() {
    return this.renderTracker.getSummary()
  }
  getTopOffenders(limit = 10) {
    return this.renderTracker.getTopOffenders(limit)
  }
  getSlowestComponents(limit = 10) {
    return this.renderTracker.getSlowestComponents(limit)
  }
  printSummary() {
    const summary = this.getSummary()
    this.reporter.reportSummary(summary)
    if (summary.totalUnnecessary > 0) {
      const offenders = this.getTopOffenders(5)
      this.reporter.reportTopOffenders(offenders)
    }
  }
  clear() {
    this.snapshotManager.clear()
    this.renderTracker.clear()
    this.renderTimer.clear()
    this.eventTracker.clear()
    this.reactivityTracker.clear()
    this.reporter.closeAllGroups()
  }
  enableDynamicFiltering() {
    this.dynamicFilteringEnabled = true
    this.disableAllComponents()
  }
  disableDynamicFiltering() {
    this.dynamicFilteringEnabled = false
  }
  enableComponent(uid) {
    this.enabledComponents.add(uid)
  }
  disableComponent(uid) {
    this.enabledComponents.delete(uid)
  }
  enableAllComponents() {
    const allStats = this.renderTracker.getAllStats()
    allStats.forEach(stat => {
      this.enabledComponents.add(stat.uid)
    })
  }
  disableAllComponents() {
    this.enabledComponents.clear()
  }
  getEnabledComponents() {
    return new Set(this.enabledComponents)
  }
  destroy() {
    this.clear()
    this.isAttached = false
    this.trackedComponents = new WeakSet()
    this.componentTimers = new WeakMap()
  }
}
export function createProfiler(options) {
  return new ComponentProfiler(options)
}
