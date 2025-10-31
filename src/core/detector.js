import {
  shallowEqual,
  computeDiff,
  hasDifferentReferenceButSameContent as _hasDifferentReferenceButSameContent,
  isDeepEqual
} from '../utils/comparison.js'
export class RenderDetector {
  constructor(options = {}) {
    this.strictMode = options.strictMode || false
    this.trackFunctions = options.trackFunctions !== undefined ? options.trackFunctions : true
    this.reactivityTracker = options.reactivityTracker || null
  }
  analyze(prevSnapshot, currentSnapshot, trigger = null, reactivityData = null, instance = null) {
    if (!prevSnapshot) {
      return {
        isUnnecessary: false,
        reason: 'initial-render',
        details: 'First render of component'
      }
    }
    const result = {
      isUnnecessary: false,
      reason: null,
      details: null,
      propsDiff: null,
      stateDiff: null,
      propsHasRealChange: false,
      stateHasRealChange: false,
      suggestions: []
    }
    const propsAnalysis = this.analyzeProps(prevSnapshot.props, currentSnapshot.props)
    result.propsDiff = propsAnalysis.diff
    result.propsHasRealChange = propsAnalysis.hasRealChange
    const stateAnalysis = this.analyzeState(prevSnapshot.state, currentSnapshot.state)
    result.stateDiff = stateAnalysis.diff
    result.stateHasRealChange = stateAnalysis.hasRealChange
    const hasRealPropsChange = propsAnalysis.hasRealChange
    const hasRealStateChange = stateAnalysis.hasRealChange
    const duration = currentSnapshot.duration || 0
    if (duration > 50) {
      this.addPerformanceSuggestions(result, duration, currentSnapshot)
    }
    const architecturalTips = [
      ...this.detectMissingKeys(currentSnapshot),
      ...this.detectInefficientWatchers(currentSnapshot),
      ...this.detectPropDrilling(currentSnapshot),
      ...this.detectVueSpecificAntiPatterns(currentSnapshot, prevSnapshot),
      ...this.detectExpensiveTemplateExpressions(currentSnapshot),
      ...this.detectMissingOptimizationDirectives(currentSnapshot)
    ]
    if (architecturalTips.length > 0) {
      result.suggestions.push(...architecturalTips)
    }
    const hasUnnecessaryChanges = propsAnalysis.unnecessaryChanges.length > 0
    if (!hasRealPropsChange && !hasRealStateChange) {
      result.isUnnecessary = true
      if (hasUnnecessaryChanges) {
        result.reason = 'reference-changes-only'
        result.details = 'Props have new references but same content'
        result.suggestions.push(...propsAnalysis.unnecessaryChanges.map(c => c.suggestion))
      } else {
        const reactivityReason = this.analyzeReactivityTrigger(reactivityData, instance)
        if (reactivityReason) {
          result.reason = reactivityReason.reason
          result.details = reactivityReason.details
          result.isUnnecessary = reactivityReason.isUnnecessary
          if (reactivityReason.suggestions) {
            result.suggestions.push(...reactivityReason.suggestions)
          }
          if (process.env.NODE_ENV === 'development') {
            console.log(
              `[VRI-DETECTOR] Found reactivity reason: ${reactivityReason.reason} for component with ${reactivityData.reactivityTracking?.length || 0} tracking events`
            )
          }
        } else {
          result.reason = 'no-changes-detected'
          result.details = 'Props and state are identical to previous render'
          this.addSuggestions(result, propsAnalysis, stateAnalysis)
        }
      }
    } else {
      result.isUnnecessary = false
      result.reason = this.determineReason(hasRealPropsChange, hasRealStateChange, trigger)
      result.details = this.createDetails(propsAnalysis, stateAnalysis)
      if (hasUnnecessaryChanges) {
        result.suggestions.push(
          ...propsAnalysis.unnecessaryChanges.map(c => c.suggestion),
          'Note: This component also has unnecessary reference changes that could be optimized'
        )
      }
    }
    return result
  }
  analyzeProps(prevProps, currentProps) {
    const diff = computeDiff(prevProps, currentProps)
    const hasShallowChange = !shallowEqual(prevProps, currentProps)
    const analysis = {
      diff,
      hasShallowChange,
      hasRealChange: false,
      unnecessaryChanges: []
    }
    if (hasShallowChange) {
      let hasActualChange = false
      for (const key in prevProps) {
        if (!(key in currentProps)) continue
        const prevValue = prevProps[key]
        const currentValue = currentProps[key]
        if (prevValue === currentValue) continue
        if (this.isReferenceChangeWithSameContent(prevValue, currentValue)) {
          analysis.unnecessaryChanges.push({
            prop: key,
            issue: 'reference-changed-but-content-equal',
            suggestion: 'Consider memoizing this prop or using a stable reference'
          })
        } else {
          hasActualChange = true
        }
      }
      for (const key in diff.changed) {
        const change = diff.changed[key]
        const fromIsFunc = typeof change.from === 'string' && change.from.startsWith('[Function:')
        const toIsFunc = typeof change.to === 'string' && change.to.startsWith('[Function:')
        if (fromIsFunc && toIsFunc) {
          analysis.unnecessaryChanges.push({
            prop: key,
            issue: 'inline-function-created',
            suggestion: 'Define this function outside render or use useCallback/computed'
          })
        } else if (!change.deepEqual) {
          hasActualChange = true
        }
        if (this.isInlineObjectOrArray(change.from, change.to)) {
          analysis.unnecessaryChanges.push({
            prop: key,
            issue: 'inline-object-or-array-created',
            suggestion: 'Define this object/array outside render or use a stable reference'
          })
        }

        // Check for default prop factories
        if (key.startsWith('default') && typeof change.to === 'object') {
          analysis.unnecessaryChanges.push({
            prop: key,
            issue: 'default-prop-factory',
            suggestion: 'Use a factory function for default object/array props'
          })
        }

        // Check for slot props that are functions
        if (key.startsWith('slot') && (fromIsFunc || toIsFunc)) {
          analysis.unnecessaryChanges.push({
            prop: key,
            issue: 'slot-prop-function',
            suggestion: 'Memoize slot prop functions to prevent child re-renders'
          })
        }

        // Check for style/class objects
        if ((key === 'style' || key === 'class') && typeof change.to === 'object') {
          analysis.unnecessaryChanges.push({
            prop: key,
            issue: 'dynamic-style-object',
            suggestion: 'Use computed properties for dynamic styles/classes'
          })
        }
      }
      analysis.hasRealChange =
        hasActualChange ||
        Object.keys(diff.added).length > 0 ||
        Object.keys(diff.removed).length > 0
    } else {
      analysis.hasRealChange = false
    }
    return analysis
  }
  analyzeState(prevState, currentState) {
    const diff = computeDiff(prevState, currentState)
    const hasShallowChange = !shallowEqual(prevState, currentState)
    const analysis = {
      diff,
      hasShallowChange,
      hasRealChange: false,
      unnecessaryChanges: []
    }
    if (hasShallowChange) {
      let hasActualChange = false
      for (const key in diff.changed) {
        const change = diff.changed[key]
        if (!change.deepEqual) {
          hasActualChange = true
        }
      }
      analysis.hasRealChange =
        hasActualChange ||
        Object.keys(diff.added).length > 0 ||
        Object.keys(diff.removed).length > 0
    }
    return analysis
  }
  determineReason(hasPropsChange, hasStateChange, trigger) {
    if (trigger?.type === 'force-update') {
      return 'force-update'
    }
    if (hasPropsChange && hasStateChange) {
      return 'props-and-state-changed'
    }
    if (hasPropsChange) {
      return 'props-changed'
    }
    if (hasStateChange) {
      return 'state-changed'
    }
    return 'parent-updated'
  }
  createDetails(propsAnalysis, stateAnalysis) {
    const details = []
    if (propsAnalysis.hasShallowChange) {
      const changedProps = Object.keys(propsAnalysis.diff.changed)
      const addedProps = Object.keys(propsAnalysis.diff.added)
      const removedProps = Object.keys(propsAnalysis.diff.removed)
      if (changedProps.length > 0) {
        details.push(`Props changed: ${changedProps.join(', ')}`)
      }
      if (addedProps.length > 0) {
        details.push(`Props added: ${addedProps.join(', ')}`)
      }
      if (removedProps.length > 0) {
        details.push(`Props removed: ${removedProps.join(', ')}`)
      }
    }
    if (stateAnalysis.hasShallowChange) {
      const changedState = Object.keys(stateAnalysis.diff.changed)
      if (changedState.length > 0) {
        details.push(`State changed: ${changedState.join(', ')}`)
      }
    }
    return details.join('; ') || 'Component updated'
  }
  addSuggestions(result, propsAnalysis, stateAnalysis) {
    if (propsAnalysis.unnecessaryChanges.length > 0) {
      result.suggestions.push(...propsAnalysis.unnecessaryChanges.map(c => c.suggestion))
    }
    if (result.isUnnecessary) {
      result.suggestions.push(
        'Consider wrapping component with memo() or adding shouldComponentUpdate logic',
        'Check if parent component is creating new props references on every render',
        'Use shallowRef/shallowReactive for large objects that change reference but not content',
        "Consider using v-memo directive to skip re-renders when specific values haven't changed",
        'Use defineProps with default factories for object/array defaults'
      )

      // Add Vue 3.5+ specific suggestions
      const hasObjectProps = Object.values(propsAnalysis.diff.changed || {}).some(
        change => typeof change.to === 'object' && change.to !== null
      )

      if (hasObjectProps) {
        result.suggestions.push(
          '🏷️ Use markRaw() for non-reactive objects like configs or external libraries',
          '📦 Consider toRaw() to pass non-reactive versions of reactive objects'
        )
      }

      // Check for specific prop patterns
      const propKeys = Object.keys(propsAnalysis.diff.changed || {})
      if (propKeys.some(k => k.includes('handler') || k.startsWith('on'))) {
        result.suggestions.push(
          '🎯 Event handlers are being recreated - define them in setup() or use useCallback pattern',
          '📌 Consider using @event.once or @event.passive modifiers when applicable'
        )
      }

      if (propKeys.some(k => k === 'items' || k === 'options' || k === 'data')) {
        result.suggestions.push(
          '📊 List/data props detected - ensure stable references or use v-memo',
          '🔑 Use proper :key bindings in v-for to optimize list updates'
        )
      }
    }
  }
  addPerformanceSuggestions(result, duration, snapshot) {
    const performanceTips = []
    if (duration > 200) {
      performanceTips.push('⚠️ CRITICAL: This component takes over 200ms to render!')
    } else if (duration > 100) {
      performanceTips.push('⚠️ WARNING: This component takes over 100ms to render')
    }
    const hasItemsProp =
      snapshot.props &&
      (snapshot.props.items || snapshot.props.data || snapshot.props.list || snapshot.props.rows)
    if (hasItemsProp) {
      const itemCount = Array.isArray(snapshot.props.items)
        ? snapshot.props.items.length
        : Array.isArray(snapshot.props.data)
          ? snapshot.props.data.length
          : Array.isArray(snapshot.props.list)
            ? snapshot.props.list.length
            : Array.isArray(snapshot.props.rows)
              ? snapshot.props.rows.length
              : 0
      if (itemCount > 100) {
        performanceTips.push(
          '🚀 Use virtual scrolling for large lists (vue-virtual-scroller or similar)',
          '📊 Consider pagination or lazy loading for better performance'
        )
      }
      if (itemCount > 10) {
        performanceTips.push(
          '💡 Use v-memo directive to skip unnecessary re-renders of list items',
          '🔑 Ensure each list item has a stable, unique :key attribute',
          '🎯 Consider using :key with item.id instead of index for dynamic lists'
        )
      }
    }

    // Check for v-model usage on expensive inputs
    if (snapshot.props && snapshot.props.modelValue !== undefined) {
      performanceTips.push(
        '📝 Consider using v-model.lazy for expensive input operations',
        '⏰ Debounce input handlers to reduce re-render frequency'
      )
    }

    if (duration > 50) {
      performanceTips.push(
        '🧮 Move expensive computations to computed properties or useMemo',
        '⏱️ Debounce or throttle frequent updates that trigger re-renders',
        '🔄 Split large components into smaller, focused sub-components',
        "📦 Use Object.freeze() for large data sets that don't change",
        '🏷️ Use markRaw() for non-reactive large objects (e.g., chart configs)',
        '📌 Use v-once directive for content that never changes'
      )
    }

    // Check for potential slot props issues
    if (snapshot.slots && Object.keys(snapshot.slots).length > 0) {
      performanceTips.push(
        '🎰 Ensure slot props are memoized to prevent child re-renders',
        '📦 Use stable references for slot scope data'
      )
    }

    if (snapshot.state && Object.keys(snapshot.state).length > 10) {
      performanceTips.push(
        '🏗️ Consider using shallowRef/shallowReactive for large nested data structures',
        '🎯 Use watchEffect with specific dependencies instead of watching entire objects',
        '🚫 Avoid toRefs() on large objects - it creates reactive connections for all properties',
        '👁️ Use watch with specific paths: watch(() => state.specific.path)'
      )
    }

    // Check for async component patterns
    if (snapshot.componentName && snapshot.componentName.includes('Async')) {
      performanceTips.push(
        '⚡ Use defineAsyncComponent with proper loading/error states',
        '🔄 Consider Suspense for better async component handling'
      )
    }

    if (duration > 150) {
      performanceTips.push(
        '🔍 Use Vue DevTools Performance tab to profile this component',
        '👷 Consider using Web Workers for CPU-intensive calculations',
        '🚦 Implement progressive rendering for complex UI',
        '🎬 Use requestIdleCallback for non-critical updates'
      )
    }

    if (performanceTips.length > 0) {
      result.suggestions.unshift(...performanceTips)
    }
  }
  detectMissingKeys(snapshot) {
    const suggestions = []
    const arrayProps = Object.keys(snapshot.props || {}).filter(key => {
      const value = snapshot.props[key]
      return Array.isArray(value) && value.length > 0
    })
    if (arrayProps.length > 0) {
      suggestions.push(
        '🔑 Ensure v-for lists have unique :key attributes',
        '📊 Consider using item index as key only for static lists',
        '🎯 Use stable, unique identifiers as keys when possible'
      )
    }
    return suggestions
  }
  detectInefficientWatchers(snapshot) {
    const suggestions = []
    if (snapshot.props) {
      const largeObjects = Object.keys(snapshot.props).filter(key => {
        const value = snapshot.props[key]
        return (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          Object.keys(value).length > 5
        )
      })
      if (largeObjects.length > 0) {
        suggestions.push(
          '👁️ Avoid watching large objects - use specific paths instead',
          '🎯 Use watch with specific property paths: watch(() => obj.property)',
          '⚡ Consider watchEffect for multiple related dependencies'
        )
      }
    }
    return suggestions
  }
  detectPropDrilling(snapshot) {
    const suggestions = []
    const componentName = snapshot.componentName || ''
    const nestingIndicators = (componentName.match(/[A-Z]/g) || []).length
    if (nestingIndicators > 2) {
      suggestions.push(
        '🏗️ Deep component nesting detected - consider using provide/inject',
        '📦 Use Vuex/Pinia for global state instead of prop drilling',
        '🎯 Consider component composition patterns'
      )
    }
    const propCount = Object.keys(snapshot.props || {}).length
    if (propCount > 8) {
      suggestions.push(
        '📊 Many props detected - consider grouping related props',
        '🔄 Use object destructuring for cleaner prop interfaces',
        '🏪 Consider using provide/inject for shared dependencies'
      )
    }
    return suggestions
  }
  isInlineFunction(value) {
    if (typeof value === 'string' && value.startsWith('[Function:')) {
      return value.includes('anonymous')
    }
    return false
  }
  isInlineObjectOrArray(from, to) {
    if (typeof from === 'object' && typeof to === 'object' && from !== null && to !== null) {
      try {
        return JSON.stringify(from) === JSON.stringify(to)
      } catch (_e) {
        return false
      }
    }
    return false
  }
  isReferenceChangeWithSameContent(prev, current) {
    if (prev === current) return false
    if (typeof prev !== 'object' || typeof current !== 'object') return false
    if (prev === null || current === null) return false
    return isDeepEqual(prev, current)
  }
  analyzeReactivityTrigger(reactivityData, instance = null) {
    if (!reactivityData) return null
    const { reactivityTracking = [], reactivityTriggers = [] } = reactivityData
    if (reactivityTriggers.length > 0) {
      const lastTrigger = reactivityTriggers[reactivityTriggers.length - 1]
      if (lastTrigger.operation === 'set') {
        return {
          reason: 'reactive-data-changed',
          details: `Reactive data changed: ${lastTrigger.getDescription()}`,
          isUnnecessary: false,
          suggestions: []
        }
      }
    }
    if (reactivityTracking.length > 0) {
      const accessPatterns = this.analyzeReactiveAccessPatterns(reactivityTracking)
      let computedAnalysis = null
      if (instance && this.reactivityTracker) {
        computedAnalysis = this.reactivityTracker.analyzeComputedAccess(instance)
      }
      if (computedAnalysis?.hasComputedAccess || accessPatterns.hasComputedAccess) {
        const computedDetails = computedAnalysis
          ? `Component accessed ${computedAnalysis.computedAccessCount} computed properties during render`
          : 'Component accessed computed properties during render'
        return {
          reason: 'computed-property-access',
          details: computedDetails,
          isUnnecessary: true,
          suggestions: [
            'Computed properties should be stable - check dependencies',
            'Consider memoizing expensive computed properties',
            'Use shallowRef for computed dependencies if appropriate',
            'Check if computed properties are being accessed unnecessarily in template'
          ]
        }
      }
      if (accessPatterns.hasRefAccess) {
        return {
          reason: 'reactive-ref-access',
          details: 'Component accessed reactive refs during render without changes',
          isUnnecessary: true,
          suggestions: [
            'Check if ref access in template/render function is necessary',
            'Consider using computed properties for derived ref values',
            'Use v-memo to prevent unnecessary re-renders from ref access'
          ]
        }
      }
      if (accessPatterns.hasReactiveObjectAccess) {
        return {
          reason: 'reactive-object-access',
          details: 'Component accessed reactive objects during render without changes',
          isUnnecessary: true,
          suggestions: [
            'Check if reactive object access in template is necessary',
            'Consider using computed properties for derived object values',
            'Use shallowReactive for large objects if deep reactivity not needed'
          ]
        }
      }
      if (accessPatterns.hasReactiveAccess) {
        return {
          reason: 'reactive-data-access',
          details: 'Component accessed reactive data during render without changes',
          isUnnecessary: true,
          suggestions: [
            'Check if reactive data access in template is necessary',
            'Consider using computed properties for derived data',
            'Use v-memo to prevent unnecessary re-renders'
          ]
        }
      }
      if (accessPatterns.hasArrayAccess) {
        return {
          reason: 'array-access-during-render',
          details: 'Component accessed array properties during render',
          isUnnecessary: true,
          suggestions: [
            'Array access in render can cause unnecessary re-renders',
            'Consider caching array length or using computed properties',
            'Use v-memo for list rendering optimization'
          ]
        }
      }
    }
    return null
  }
  analyzeReactiveAccessPatterns(trackingEvents) {
    const patterns = {
      hasComputedAccess: false,
      hasReactiveAccess: false,
      hasArrayAccess: false,
      hasObjectAccess: false,
      hasRefAccess: false,
      hasReactiveObjectAccess: false,
      accessCount: trackingEvents.length
    }
    for (const event of trackingEvents) {
      const targetType = event.targetType || event.getTargetDescription()
      const operation = event.operation
      if (targetType === 'computed') {
        patterns.hasComputedAccess = true
      }
      if (
        targetType === 'ref' ||
        (operation === 'get' && event.key === 'value' && targetType === 'refimpl')
      ) {
        patterns.hasRefAccess = true
        patterns.hasReactiveAccess = true
      }
      if (targetType === 'reactive' || targetType === 'readonly' || targetType === 'shallow') {
        patterns.hasReactiveObjectAccess = true
        patterns.hasReactiveAccess = true
      }
      if (targetType === 'array' || (operation === 'get' && event.key === 'length')) {
        patterns.hasArrayAccess = true
      }
      if (targetType === 'object') {
        patterns.hasObjectAccess = true
      }
      if (operation === 'get' && (targetType.includes('reactive') || targetType.includes('ref'))) {
        patterns.hasReactiveAccess = true
      }
    }
    return patterns
  }
  calculateSeverity(analysis, renderCount = 1) {
    if (!analysis.isUnnecessary) return 'none'
    if (renderCount >= 10) return 'critical'
    if (renderCount >= 5) return 'high'
    if (renderCount >= 2) return 'medium'
    return 'low'
  }

  detectVueSpecificAntiPatterns(currentSnapshot, prevSnapshot) {
    const suggestions = []

    // Check for v-if/v-show misuse
    if (
      currentSnapshot.conditionalRendering &&
      prevSnapshot &&
      currentSnapshot.conditionalRendering.count > 5
    ) {
      suggestions.push(
        '🔀 Consider v-show instead of v-if for frequently toggled elements',
        '⚡ v-if destroys/recreates components, v-show only toggles display'
      )
    }

    // Check for template refs issues
    if (currentSnapshot.refs && prevSnapshot?.refs) {
      const refsChanged = !shallowEqual(currentSnapshot.refs, prevSnapshot.refs)
      if (refsChanged) {
        suggestions.push(
          '🎯 Template refs are being recreated - ensure stable ref definitions',
          '📌 Use shallowRef for DOM element refs to avoid deep reactivity'
        )
      }
    }

    // Check for event handler patterns
    const eventHandlerProps = Object.keys(currentSnapshot.props || {}).filter(
      key => key.startsWith('on') && typeof currentSnapshot.props[key] === 'function'
    )

    if (eventHandlerProps.length > 5) {
      suggestions.push(
        '🎪 Many event handlers detected - consider event delegation',
        '📡 Use a single handler with event.target detection for lists'
      )
    }

    // Check for teleport usage
    if (currentSnapshot.hasTeleport) {
      suggestions.push(
        '🚀 Teleport target changes can cause re-renders',
        '📍 Use stable teleport targets and avoid dynamic selectors'
      )
    }

    // Check for provide/inject patterns
    if (currentSnapshot.provides && Object.keys(currentSnapshot.provides).length > 3) {
      suggestions.push(
        '💉 Many provided values detected - consider consolidating',
        '📦 Group related provides into a single reactive object'
      )
    }

    return suggestions
  }

  detectExpensiveTemplateExpressions(snapshot) {
    const suggestions = []

    // Check for complex expressions in template (heuristic based on snapshot data)
    if (snapshot.templateComplexity && snapshot.templateComplexity.expressionCount > 10) {
      suggestions.push(
        '🧮 Complex template expressions detected',
        '💡 Move expressions to computed properties for better caching',
        '📊 Template expressions run on every render - optimize them'
      )
    }

    // Check for method calls in template
    if (snapshot.templateComplexity && snapshot.templateComplexity.methodCalls > 0) {
      suggestions.push(
        '📞 Method calls in template detected',
        '🔄 Methods are called on every render - use computed properties instead',
        '💾 Computed properties cache results until dependencies change'
      )
    }

    // Check for filters or complex transformations
    if (snapshot.props) {
      const transformProps = Object.keys(snapshot.props).filter(
        key => key.includes('filter') || key.includes('transform') || key.includes('map')
      )

      if (transformProps.length > 0) {
        suggestions.push(
          '🔧 Data transformation in props detected',
          '💡 Pre-transform data in parent or use computed properties',
          '📊 Avoid inline transformations that create new arrays/objects'
        )
      }
    }

    return suggestions
  }

  detectMissingOptimizationDirectives(snapshot) {
    const suggestions = []

    // Check for static content without v-once
    if (snapshot.hasStaticContent && !snapshot.hasVOnce) {
      suggestions.push(
        '📌 Static content detected without v-once directive',
        '🎯 Use v-once for content that never changes to skip updates'
      )
    }

    // Check for lists without v-memo
    if (snapshot.hasVFor && !snapshot.hasVMemo && snapshot.listSize > 20) {
      suggestions.push(
        '📝 Large list without v-memo directive detected',
        '⚡ Use v-memo="[item.id]" to skip unchanged list items',
        '🎯 v-memo can significantly improve list rendering performance'
      )
    }

    // Check for missing key in transitions
    if (snapshot.hasTransition && !snapshot.hasTransitionKey) {
      suggestions.push(
        '🎬 Transition without proper key detected',
        '🔑 Use unique keys in transition groups for smooth animations'
      )
    }

    // Check for defineExpose usage
    if (snapshot.exposedProperties && Object.keys(snapshot.exposedProperties).length > 5) {
      suggestions.push(
        '📤 Many exposed properties detected via defineExpose',
        '🎯 Limit exposed properties to reduce parent-child coupling',
        '📦 Consider using provide/inject for deeply nested data'
      )
    }

    // Check for missing lazy modifiers
    if (snapshot.hasVModel && !snapshot.hasLazyModifier && snapshot.isExpensiveInput) {
      suggestions.push(
        '⌨️ v-model without .lazy modifier on expensive input',
        '🔄 Use v-model.lazy to update on blur instead of input',
        '⏱️ Consider debouncing for real-time but expensive operations'
      )
    }

    return suggestions
  }
}
