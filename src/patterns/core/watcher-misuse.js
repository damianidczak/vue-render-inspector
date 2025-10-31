/**
 * Watcher Misuse Pattern Detection
 * Detects watchers that should be computed properties or other optimizations
 */

import {
  getComponentEffects,
  getComponentWatchers,
  getSetupFunction,
  hasUnnecessaryRenders,
  getTriggerMechanism,
  safeStringify,
  createPatternResult,
  isSlowRender
} from '../helpers/detection-utils.js'

import { generateWatcherToComputedFix } from '../helpers/code-generation.js'

/**
 * Main pattern detection for watcher misuse
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Detection result
 */
export function detect(instance, snapshot, renderTime) {
  const result = createPatternResult({
    detectionMethod: '',
    watcherMetrics: {},
    codeGeneration: ''
  })

  // Initialize metrics
  const metrics = {
    watcherCount: 0,
    suspiciousWatchers: [],
    derivedStateWatchers: [],
    sideEffectWatchers: [],
    immediateWatchers: [],
    deepWatchers: [],
    performanceScore: 0,
    hasUnnecessaryRenders: hasUnnecessaryRenders(snapshot),
    triggerMechanism: getTriggerMechanism(snapshot)
  }

  // Method 1: Analyze Vue component watchers directly
  const componentWatchers = analyzeComponentWatchers(instance)
  metrics.watcherCount = componentWatchers.totalWatchers
  metrics.suspiciousWatchers = componentWatchers.suspiciousWatchers
  metrics.derivedStateWatchers = componentWatchers.derivedStateWatchers
  metrics.sideEffectWatchers = componentWatchers.sideEffectWatchers
  metrics.immediateWatchers = componentWatchers.immediateWatchers
  metrics.deepWatchers = componentWatchers.deepWatchers

  // Method 2: Analyze render patterns for watcher-related issues
  const renderPatterns = analyzeRenderPatternsForWatchers(snapshot, renderTime)
  metrics.performanceScore += renderPatterns.score

  // Method 3: Analyze code patterns in template and setup
  const codePatterns = analyzeCodePatternsForWatchers(instance)
  metrics.performanceScore += codePatterns.score

  // Scoring and detection logic
  let totalScore = 0
  const reasons = []

  // Score based on suspicious watchers
  if (metrics.derivedStateWatchers.length > 0) {
    totalScore += metrics.derivedStateWatchers.length * 3
    reasons.push(`${metrics.derivedStateWatchers.length} watcher(s) creating derived state`)
  }

  // Score based on performance impact
  if (metrics.hasUnnecessaryRenders && metrics.triggerMechanism === 'state') {
    totalScore += 2
    reasons.push('unnecessary renders from state changes')
  }

  // Score based on watcher complexity
  if (metrics.immediateWatchers.length > 2) {
    totalScore += 2
    reasons.push(`${metrics.immediateWatchers.length} immediate watchers`)
  }

  if (metrics.deepWatchers.length > 1) {
    totalScore += 3
    reasons.push(`${metrics.deepWatchers.length} deep watchers`)
  }

  // Performance correlation
  if (isSlowRender(renderTime, 10) && metrics.watcherCount > 0) {
    totalScore += 1
    reasons.push('slow renders with active watchers')
  }

  // Determine if we should report watcher misuse
  if (totalScore >= 3) {
    result.detected = true
    result.watcherMetrics = metrics
    result.reason = `Watcher misuse detected: ${reasons.join(', ')}`

    // Determine severity and detection method
    if (metrics.derivedStateWatchers.length > 2 || metrics.deepWatchers.length > 1) {
      result.severity = 'high'
      result.detectionMethod = 'pattern-analysis'
      result.suggestion =
        'Critical: Multiple watchers creating derived state. Replace with computed properties for better performance and reactivity.'
    } else if (metrics.hasUnnecessaryRenders && metrics.triggerMechanism === 'state') {
      result.severity = 'medium'
      result.detectionMethod = 'performance-correlation'
      result.suggestion =
        'State changes causing unnecessary renders. Check if watchers should be computed properties instead.'
    } else {
      result.severity = 'medium'
      result.detectionMethod = 'complexity-analysis'
      result.suggestion =
        'Optimize watchers for better performance. Consider using computed properties for derived state.'
    }

    result.codeGeneration = generateWatcherFix(metrics)
  }

  return result
}

/**
 * Analyze component watchers for misuse patterns
 * @param {Object} instance - Vue component instance
 * @returns {Object} Analysis result
 */
function analyzeComponentWatchers(instance) {
  const result = {
    totalWatchers: 0,
    suspiciousWatchers: [],
    derivedStateWatchers: [],
    sideEffectWatchers: [],
    immediateWatchers: [],
    deepWatchers: []
  }

  // Check Vue 3 effects/watchers
  const effects = getComponentEffects(instance)
  result.totalWatchers = effects.length

  effects.forEach((effect, index) => {
    const watcherAnalysis = analyzeWatcherEffect(effect, index)

    if (watcherAnalysis.isDerivedState) {
      result.derivedStateWatchers.push(watcherAnalysis)
    }

    if (watcherAnalysis.hasSideEffects) {
      result.sideEffectWatchers.push(watcherAnalysis)
    }

    if (watcherAnalysis.isImmediate) {
      result.immediateWatchers.push(watcherAnalysis)
    }

    if (watcherAnalysis.isDeep) {
      result.deepWatchers.push(watcherAnalysis)
    }

    if (watcherAnalysis.isSuspicious) {
      result.suspiciousWatchers.push(watcherAnalysis)
    }
  })

  // Also check component options-style watchers
  const componentWatchers = getComponentWatchers(instance)
  if (componentWatchers && Object.keys(componentWatchers).length > 0) {
    Object.entries(componentWatchers).forEach(([key, watcherConfig]) => {
      const watcherAnalysis = analyzeOptionsWatcher(key, watcherConfig)
      result.totalWatchers++

      if (watcherAnalysis.isDerivedState) {
        result.derivedStateWatchers.push(watcherAnalysis)
      }

      if (watcherAnalysis.isDeep) {
        result.deepWatchers.push(watcherAnalysis)
      }

      if (watcherAnalysis.isImmediate) {
        result.immediateWatchers.push(watcherAnalysis)
      }
    })
  }

  return result
}

/**
 * Analyze individual watcher effect
 * @param {Object} effect - Vue effect object
 * @param {number} index - Effect index
 * @returns {Object} Analysis result
 */
function analyzeWatcherEffect(effect, index) {
  const analysis = {
    index,
    isDerivedState: false,
    hasSideEffects: false,
    isImmediate: false,
    isDeep: false,
    isSuspicious: false,
    confidence: 0,
    patterns: []
  }

  const effectString = safeStringify(effect.fn)

  // Detect derived state patterns
  const derivedStatePatterns = [
    /this\.\w+\s*=.*\.filter\(/,
    /this\.\w+\s*=.*\.map\(/,
    /this\.\w+\s*=.*\.reduce\(/,
    /this\.\w+\s*=.*\.sort\(/,
    /\.value\s*=.*\.filter\(/,
    /\.value\s*=.*\.map\(/,
    /\.value\s*=.*\.reduce\(/,
    /\.value\s*=.*\.sort\(/
  ]

  derivedStatePatterns.forEach(pattern => {
    if (pattern.test(effectString)) {
      analysis.isDerivedState = true
      analysis.patterns.push('derived-state')
      analysis.confidence += 0.3
    }
  })

  // Detect side effects
  const sideEffectPatterns = [
    /\$emit\s*\(/,
    /fetch\s*\(/,
    /axios\./,
    /console\./,
    /localStorage\./,
    /sessionStorage\./,
    /document\./,
    /window\./
  ]

  sideEffectPatterns.forEach(pattern => {
    if (pattern.test(effectString)) {
      analysis.hasSideEffects = true
      analysis.patterns.push('side-effects')
      analysis.confidence += 0.2
    }
  })

  // Check for immediate/deep flags
  if (effect.options?.immediate) {
    analysis.isImmediate = true
    analysis.patterns.push('immediate')
  }

  if (effect.options?.deep) {
    analysis.isDeep = true
    analysis.patterns.push('deep')
  }

  // Determine if suspicious (likely should be computed)
  analysis.isSuspicious =
    analysis.isDerivedState && !analysis.hasSideEffects && analysis.confidence > 0.5

  return analysis
}

/**
 * Analyze options-style watchers
 * @param {string} key - Watcher key
 * @param {Object|Function} watcherConfig - Watcher configuration
 * @returns {Object} Analysis result
 */
function analyzeOptionsWatcher(key, watcherConfig) {
  const analysis = {
    key,
    isDerivedState: false,
    isDeep: false,
    isImmediate: false,
    patterns: []
  }

  const isFunction = typeof watcherConfig === 'function'
  const config = isFunction ? { handler: watcherConfig } : watcherConfig

  const handlerString = safeStringify(config.handler)

  // Check for derived state patterns
  if (/this\.\w+\s*=/.test(handlerString) && !/\$emit|\$api|fetch|axios/.test(handlerString)) {
    analysis.isDerivedState = true
    analysis.patterns.push('derived-state')
  }

  // Check configuration flags
  if (config.deep) {
    analysis.isDeep = true
    analysis.patterns.push('deep')
  }

  if (config.immediate) {
    analysis.isImmediate = true
    analysis.patterns.push('immediate')
  }

  return analysis
}

/**
 * Analyze render patterns for watcher-related performance issues
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Analysis result
 */
function analyzeRenderPatternsForWatchers(snapshot, renderTime) {
  const analysis = { score: 0, patterns: [] }

  // Pattern 1: Frequent state changes causing unnecessary renders
  if (getTriggerMechanism(snapshot) === 'state' && hasUnnecessaryRenders(snapshot)) {
    analysis.score += 2
    analysis.patterns.push('state-trigger-unnecessary')
  }

  // Pattern 2: High unnecessary render percentage with state triggers
  const unnecessaryPercent = snapshot?.unnecessaryRenderPercent || 0
  if (unnecessaryPercent > 30 && getTriggerMechanism(snapshot) === 'state') {
    analysis.score += 1
    analysis.patterns.push('high-unnecessary-state-renders')
  }

  // Pattern 3: Slow renders with reactive state changes
  if (isSlowRender(renderTime, 15) && snapshot?.reason?.includes('state')) {
    analysis.score += 1
    analysis.patterns.push('slow-state-renders')
  }

  return analysis
}

/**
 * Analyze code patterns in component for watcher misuse
 * @param {Object} instance - Vue component instance
 * @returns {Object} Analysis result
 */
function analyzeCodePatternsForWatchers(instance) {
  const analysis = { score: 0, patterns: [] }

  // Check component setup function for watch patterns
  const setup = getSetupFunction(instance)
  const setupString = safeStringify(setup)

  // Pattern 1: Multiple watch calls in setup
  const watchMatches = setupString.match(/watch\s*\(/g) || []
  if (watchMatches.length > 3) {
    analysis.score += 1
    analysis.patterns.push('multiple-watchers')
  }

  // Pattern 2: Watch with assignment inside (likely derived state)
  if (/watch\s*\([^)]+\)\s*{[^}]*\.value\s*=/.test(setupString)) {
    analysis.score += 2
    analysis.patterns.push('watch-assignment')
  }

  // Pattern 3: Immediate watchers for derived state
  if (/watch\s*\([^)]+{[^}]*immediate:\s*true[^}]*}/.test(setupString)) {
    analysis.score += 1
    analysis.patterns.push('immediate-watchers')
  }

  return analysis
}

/**
 * Generate watcher optimization code
 * @param {Object} metrics - Watcher metrics
 * @returns {string} Generated fix code
 */
function generateWatcherFix(metrics) {
  const watcherNames =
    metrics.derivedStateWatchers.length > 0 ? ['filteredItems', 'sortedItems'] : ['derivedValue']

  let fix = generateWatcherToComputedFix(watcherNames)

  // Add specific fixes for deep watchers
  if (metrics.deepWatchers.length > 0) {
    fix += `\n\n${`
❌ Bad: Deep watching large objects
watch(largeObject, (newValue) => {
  // Handler runs on ANY nested change
}, { deep: true })

✅ Good: Watch specific properties
watch(() => largeObject.value.specificProperty, (newValue) => {
  // Only runs when specificProperty changes
})

// Or use computed for derived values
const derivedValue = computed(() => {
  return largeObject.value.specificProperty.toUpperCase()
})
    `.trim()}`
  }

  // Add fixes for immediate watchers
  if (metrics.immediateWatchers.length > 2) {
    fix += `\n\n${`
❌ Bad: Too many immediate watchers
watch(prop1, handler1, { immediate: true })
watch(prop2, handler2, { immediate: true })
watch(prop3, handler3, { immediate: true })

✅ Good: Use lifecycle hooks or computed
onMounted(() => {
  // Initialize logic here instead of immediate watchers
  initializeComponent()
})

const computedValue = computed(() => {
  // Automatically reactive to dependencies
  return prop1.value + prop2.value + prop3.value
})
    `.trim()}`
  }

  return fix
}

// Pattern metadata for integration with main patterns object
export const metadata = {
  reason: 'Watcher used for derived state',
  suggestion:
    'Use computed properties instead of watchers for derived state. Computed properties are cached and only re-evaluate when dependencies change.',
  example: {
    bad: `
// ❌ Watcher modifying reactive state
const items = ref([...])
const filteredItems = ref([])

watch(items, (newItems) => {
  filteredItems.value = newItems.filter(i => i.active)
})
    `,
    good: `
// ✅ Computed property (cached & reactive)
const items = ref([...])
const filteredItems = computed(() => 
  items.value.filter(i => i.active)
)
    `
  }
}

// Main pattern export
export default {
  detect,
  ...metadata
}
