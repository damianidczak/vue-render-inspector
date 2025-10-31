// TreeNode class with memory management and performance tracking
export class TreeNode {
  constructor(data) {
    this.uid = data.uid
    this.componentName = data.componentName
    this.parent = null
    this.children = []
    this.x = 0
    this.y = 0
    this.width = 180
    this.height = 80
    this.depth = 0
    this.targetX = 0
    this.targetY = 0
    this.animX = 0
    this.animY = 0
    this.expanded = true
    this.selected = false
    this.hovering = false
    this.glowIntensity = 0
    this.pulsePhase = 0
    this.lastUpdateTime = Date.now()
    this.visible = true
    this.lod = 'full' // Level of detail: minimal, basic, standard, full

    // Comprehensive render analysis with ALL debugging data
    this.renderAnalysis = {
      totalRenders: 0,
      unnecessaryRenders: 0,
      avgRenderTime: 0,
      lastRenderTime: 0,
      renderHistory: [], // Limited to 20 entries
      performanceInsights: {
        slowestRender: 0,
        fastestRender: Infinity,
        totalRenderTime: 0,
        renderFrequency: 0,
        lastActivity: 0,
        renderTimeVariance: 0,
        renderTimeTrend: 'stable', // 'increasing', 'decreasing', 'stable'
        frequencyTrend: 'stable'
      },
      changePatterns: {
        propsChanges: 0,
        stateChanges: 0,
        referenceChanges: 0,
        parentRerenders: 0,
        eventTriggers: 0,
        reactivityTriggers: 0
      },
      detailedChanges: {
        propsChangeHistory: [], // Limited to 10
        stateChangeHistory: [], // Limited to 10
        recentPropsDiff: null,
        recentStateDiff: null
      },
      componentContext: {
        parentComponent: null,
        childComponents: [],
        componentDepth: 0,
        componentPath: [this.componentName]
      },
      eventTracking: {
        recentEvents: [], // Limited to 10
        eventFrequency: {},
        lastEventTrigger: null
      },
      reactivityTracking: {
        recentOnTrack: [], // Limited to 5
        recentOnTrigger: [], // Limited to 5
        reactivityPatterns: {}
      },
      sourceInfo: {
        filePath: null,
        lineNumber: null,
        componentType: 'unknown'
      },
      optimizationSuggestions: new Set(),
      performanceWarnings: [],
      detailedHistory: [], // Limited to 10 entries
      enhancedPatterns: [], // Advanced bottleneck detection
      bottleneckScore: 0 // Overall bottleneck severity score
    }

    this.state = 'idle'
    this.warnings = []

    // Cached rendering data
    this._cachedColor = null
    this._cachedColorTimestamp = 0
  }

  getColor() {
    // Cache color calculation for 1 second
    const now = Date.now()
    if (this._cachedColor && now - this._cachedColorTimestamp < 1000) {
      return this._cachedColor
    }

    if (this.state === 'rendering') {
      this._cachedColor = '#9c27b0'
    } else if (this.warnings.includes('storm')) {
      this._cachedColor = '#ff5722'
    } else {
      const unnecessaryPercent = this.getUnnecessaryPercent()
      const bottleneckScore = this.renderAnalysis.bottleneckScore || 0

      // Priority: bottleneck score > unnecessary renders
      if (bottleneckScore > 20)
        this._cachedColor = '#d32f2f' // Dark red for severe bottlenecks
      else if (bottleneckScore > 10)
        this._cachedColor = '#f44336' // Red for high bottlenecks
      else if (unnecessaryPercent > 50) this._cachedColor = '#f44336'
      else if (unnecessaryPercent > 30) this._cachedColor = '#ff9800'
      else if (unnecessaryPercent > 10) this._cachedColor = '#ffc107'
      else if (bottleneckScore > 5)
        this._cachedColor = '#ff9800' // Orange for moderate bottlenecks
      else this._cachedColor = '#4caf50'
    }

    this._cachedColorTimestamp = now
    return this._cachedColor
  }

  getUnnecessaryPercent() {
    if (this.renderAnalysis.totalRenders === 0) return 0
    return (this.renderAnalysis.unnecessaryRenders / this.renderAnalysis.totalRenders) * 100
  }

  updateMetrics(event) {
    const analysis = this.renderAnalysis
    const duration = event.duration || 0.01

    // Update counters
    analysis.totalRenders++
    if (event.isUnnecessary) {
      analysis.unnecessaryRenders++
    }

    // Update average render time
    const currentAvg = analysis.avgRenderTime
    analysis.avgRenderTime =
      (currentAvg * (analysis.totalRenders - 1) + duration) / analysis.totalRenders
    analysis.lastRenderTime = event.timestamp

    // Update performance insights
    const perf = analysis.performanceInsights
    perf.slowestRender = Math.max(perf.slowestRender, duration)
    perf.fastestRender = Math.min(perf.fastestRender, duration)
    perf.totalRenderTime += duration
    perf.lastActivity = event.timestamp

    // Calculate render frequency
    if (analysis.renderHistory.length >= 5) {
      const recentRenders = analysis.renderHistory.slice(-5)
      const timeSpan = event.timestamp - recentRenders[0].timestamp
      if (timeSpan > 0) {
        perf.renderFrequency = (recentRenders.length / timeSpan) * 60000 // renders per minute
      }
    }

    // Update change patterns
    const patterns = analysis.changePatterns
    if (event.triggerMechanism === 'props') patterns.propsChanges++
    if (event.triggerMechanism === 'state') patterns.stateChanges++
    if (event.triggerMechanism === 'reference-changes') patterns.referenceChanges++
    if (event.triggerMechanism === 'parent-rerender') patterns.parentRerenders++
    if (event.eventTrigger) patterns.eventTriggers++
    if (event.reactivityTriggers?.length > 0) patterns.reactivityTriggers++

    // Track detailed changes
    if (event.propsDiff) {
      this._trackPropsDiff(event.propsDiff, event)
    }

    if (event.stateDiff) {
      this._trackStateDiff(event.stateDiff, event)
    }

    // Track events
    if (event.eventTrigger) {
      this._trackEvent(event.eventTrigger, event)
    }

    // Track reactivity
    if (event.reactivityTracking?.length > 0) {
      analysis.reactivityTracking.recentOnTrack = event.reactivityTracking.slice(-5)
    }
    if (event.reactivityTriggers?.length > 0) {
      analysis.reactivityTracking.recentOnTrigger = event.reactivityTriggers.slice(-5)
    }

    // Store source info
    if (event.sourceInfo) {
      analysis.sourceInfo = { ...analysis.sourceInfo, ...event.sourceInfo }
    }

    // Add suggestions
    if (event.suggestions) {
      event.suggestions.forEach(suggestion => analysis.optimizationSuggestions.add(suggestion))
    }

    // Add performance warnings
    if (duration > 16) {
      analysis.performanceWarnings.push({
        type: 'slow-render',
        duration,
        timestamp: event.timestamp,
        suggestion: `Render took ${duration.toFixed(1)}ms - consider optimizing`
      })
    }

    if (event.isStorm) {
      analysis.performanceWarnings.push({
        type: 'render-storm',
        timestamp: event.timestamp,
        suggestion: 'Render storm detected - component re-rendering too frequently'
      })
      this.warnings.push('storm')
    }

    // Calculate trends
    this._calculateTrends()

    // Add to render history
    this._addToHistory(event)

    // Handle enhanced patterns
    this._handleEnhancedPatterns(event, perf)

    // Invalidate color cache
    this._cachedColor = null
  }

  _trackPropsDiff(propsDiff, event) {
    const analysis = this.renderAnalysis

    // Store the diff only if there are actual changes
    const hasChanges =
      (propsDiff.changed && Object.keys(propsDiff.changed).length > 0) ||
      (propsDiff.added && Object.keys(propsDiff.added).length > 0) ||
      (propsDiff.removed && Object.keys(propsDiff.removed).length > 0)

    if (hasChanges) {
      analysis.detailedChanges.recentPropsDiff = propsDiff
    }

    analysis.detailedChanges.propsChangeHistory.push({
      timestamp: event.timestamp,
      diff: propsDiff,
      hasRealChange: event.hasRealPropsChange !== false
    })
    if (analysis.detailedChanges.propsChangeHistory.length > 10) {
      analysis.detailedChanges.propsChangeHistory.shift()
    }
  }

  _trackStateDiff(stateDiff, event) {
    const analysis = this.renderAnalysis

    // Store the diff only if there are actual changes
    const hasChanges =
      (stateDiff.changed && Object.keys(stateDiff.changed).length > 0) ||
      (stateDiff.added && Object.keys(stateDiff.added).length > 0) ||
      (stateDiff.removed && Object.keys(stateDiff.removed).length > 0)

    if (hasChanges) {
      analysis.detailedChanges.recentStateDiff = stateDiff
    }

    analysis.detailedChanges.stateChangeHistory.push({
      timestamp: event.timestamp,
      diff: stateDiff,
      hasRealChange: event.hasRealStateChange !== false
    })
    if (analysis.detailedChanges.stateChangeHistory.length > 10) {
      analysis.detailedChanges.stateChangeHistory.shift()
    }
  }

  _trackEvent(eventTrigger, event) {
    const analysis = this.renderAnalysis

    analysis.eventTracking.recentEvents.push({
      timestamp: event.timestamp,
      event: eventTrigger,
      triggerMechanism: event.triggerMechanism
    })
    if (analysis.eventTracking.recentEvents.length > 10) {
      analysis.eventTracking.recentEvents.shift()
    }
    analysis.eventTracking.lastEventTrigger = eventTrigger
    const eventType = eventTrigger.type || 'unknown'
    analysis.eventTracking.eventFrequency[eventType] =
      (analysis.eventTracking.eventFrequency[eventType] || 0) + 1
  }

  _calculateTrends() {
    const analysis = this.renderAnalysis
    const perf = analysis.performanceInsights

    if (analysis.renderHistory.length >= 5) {
      const recentRenders = analysis.renderHistory.slice(-5)
      const avgRecent = recentRenders.reduce((sum, r) => sum + r.duration, 0) / recentRenders.length
      if (avgRecent > analysis.avgRenderTime * 1.1) {
        perf.renderTimeTrend = 'increasing'
      } else if (avgRecent < analysis.avgRenderTime * 0.9) {
        perf.renderTimeTrend = 'decreasing'
      } else {
        perf.renderTimeTrend = 'stable'
      }
    }
  }

  _addToHistory(event) {
    const analysis = this.renderAnalysis

    // Add to render history (max 20 entries)
    analysis.renderHistory.push({
      timestamp: event.timestamp,
      reason: event.reason,
      details: event.details,
      duration: event.duration,
      isUnnecessary: event.isUnnecessary,
      triggerMechanism: event.triggerMechanism,
      triggerSource: event.triggerSource,
      suggestions: event.suggestions || [],
      eventTrigger: event.eventTrigger
    })

    if (analysis.renderHistory.length > 20) {
      analysis.renderHistory.shift()
    }

    // Add to detailed history (max 10 entries)
    analysis.detailedHistory.push({
      timestamp: event.timestamp,
      duration: event.duration,
      reason: event.reason,
      details: event.details,
      isUnnecessary: event.isUnnecessary,
      triggerMechanism: event.triggerMechanism,
      propsDiff: event.propsDiff || null,
      stateDiff: event.stateDiff || null,
      hasRealPropsChange: event.hasRealPropsChange || false,
      hasRealStateChange: event.hasRealStateChange || false,
      isStorm: event.isStorm || false,
      isRecreation: event.isRecreation || false
    })

    if (analysis.detailedHistory.length > 10) {
      analysis.detailedHistory.shift()
    }
  }

  _handleEnhancedPatterns(event, perf) {
    const analysis = this.renderAnalysis

    // Run enhanced pattern detection
    if (event.enhancedPatterns && event.enhancedPatterns.length > 0) {
      // Add new patterns, avoiding duplicates
      event.enhancedPatterns.forEach(pattern => {
        const exists = analysis.enhancedPatterns.some(p => p.type === pattern.type)
        if (!exists) {
          analysis.enhancedPatterns.push(pattern)
        }
      })

      // Calculate bottleneck score (higher = worse)
      const priorityMap = {
        deepReactivityMisuse: 10,
        largeListNoVirtualization: 9,
        deepWatchers: 8,
        watcherMisuse: 7,
        templateMethodCalls: 6,
        renderStorm: 6,
        arrayMutations: 5,
        missingVMemo: 4,
        arrayIndexKey: 3,
        inlineObjectCreation: 5,
        computedNoDeps: 2,
        eventListenerLeaks: 1
      }

      analysis.bottleneckScore = analysis.enhancedPatterns.reduce(
        (score, pattern) => score + (priorityMap[pattern.type] || 0),
        0
      )
    }

    // Force add render storm pattern if detected
    if (
      perf.renderFrequency > 60 &&
      !analysis.enhancedPatterns.some(p => p.type === 'renderStorm')
    ) {
      analysis.enhancedPatterns.push({
        type: 'renderStorm',
        reason: `Component rendering too frequently (${perf.renderFrequency.toFixed(0)} renders/min)`,
        suggestion: 'Debounce state updates, use computed properties, or batch state changes',
        example: {
          bad: 'Multiple setState calls triggering multiple renders',
          good: 'Batch updates or use nextTick for multiple changes'
        }
      })
      analysis.bottleneckScore += 6
    }
  }
}
