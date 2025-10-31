/**
 * Shared detection utilities for enhanced patterns
 * Zero dependencies, performance-first implementations
 */

/**
 * Safe string analysis for component functions and templates
 * @param {any} input - Input to convert to string
 * @returns {string} Safe string for pattern matching
 */
export function safeStringify(input) {
  if (!input) return ''
  try {
    if (typeof input === 'string') return input
    if (typeof input === 'function') return input.toString()
    if (typeof input === 'object') return JSON.stringify(input)
    return String(input)
  } catch {
    return ''
  }
}

/**
 * Extract template string from Vue component instance
 * @param {Object} instance - Vue component instance
 * @returns {string} Template string
 */
export function getTemplateString(instance) {
  return (
    instance?.type?.template ||
    instance?.$?.type?.template ||
    instance?.$?.render?.toString() ||
    instance?.render?.toString() ||
    ''
  )
}

/**
 * Extract component effects (watchers) from Vue instance
 * @param {Object} instance - Vue component instance
 * @returns {Array} Array of effects/watchers
 */
export function getComponentEffects(instance) {
  return instance?.$?.scope?.effects || []
}

/**
 * Extract options-style watchers from component
 * @param {Object} instance - Vue component instance
 * @returns {Object} Watchers object
 */
export function getComponentWatchers(instance) {
  return instance?.type?.watch || instance?.$?.type?.watch || {}
}

/**
 * Extract setup function from component
 * @param {Object} instance - Vue component instance
 * @returns {Function|null} Setup function
 */
export function getSetupFunction(instance) {
  return instance?.type?.setup || instance?.$?.type?.setup || null
}

/**
 * Check if component has unnecessary renders based on snapshot
 * @param {Object} snapshot - Component snapshot data
 * @returns {boolean} True if component has unnecessary renders
 */
export function hasUnnecessaryRenders(snapshot) {
  return snapshot?.isUnnecessary === true
}

/**
 * Get unnecessary render percentage from snapshot
 * @param {Object} snapshot - Component snapshot data
 * @returns {number} Percentage of unnecessary renders
 */
export function getUnnecessaryRenderPercent(snapshot) {
  return snapshot?.unnecessaryRenderPercent || 0
}

/**
 * Get trigger mechanism from snapshot
 * @param {Object} snapshot - Component snapshot data
 * @returns {string} Trigger mechanism (e.g., 'state', 'props')
 */
export function getTriggerMechanism(snapshot) {
  return snapshot?.triggerMechanism || ''
}

/**
 * Check if render time is considered slow
 * @param {number} renderTime - Render time in milliseconds
 * @param {number} threshold - Threshold for slow renders (default: 16ms)
 * @returns {boolean} True if render is slow
 */
export function isSlowRender(renderTime, threshold = 16) {
  return renderTime > threshold
}

/**
 * Count properties in object with depth limit for performance
 * @param {Object} obj - Object to count
 * @param {number} depth - Current depth
 * @param {number} maxDepth - Maximum depth to traverse
 * @param {number} maxCount - Maximum count before stopping
 * @returns {number} Property count
 */
export function countObjectProperties(obj, depth = 0, maxDepth = 3, maxCount = 100) {
  if (depth > maxDepth || !obj || typeof obj !== 'object') return 0

  let count = 0
  for (const key in obj) {
    count++
    if (count > maxCount) return maxCount

    if (typeof obj[key] === 'object' && obj[key]) {
      count += countObjectProperties(obj[key], depth + 1, maxDepth, maxCount - count)
    }
  }
  return count
}

/**
 * Safe template pattern matching with regex
 * @param {string} template - Template string
 * @param {RegExp} pattern - Pattern to match
 * @returns {Array} Array of matches
 */
export function findTemplateMatches(template, pattern) {
  try {
    return template.match(pattern) || []
  } catch {
    return []
  }
}

/**
 * Check if function string contains specific patterns
 * @param {Function|string} fn - Function to analyze
 * @param {Array<string>} patterns - Patterns to look for
 * @returns {boolean} True if any pattern found
 */
export function hasPatterns(fn, patterns) {
  const fnString = safeStringify(fn)
  return patterns.some(pattern => fnString.includes(pattern))
}

/**
 * Check if function represents derived state computation
 * @param {Function|string} fn - Function to analyze
 * @returns {boolean} True if function appears to create derived state
 */
export function isDerivedStateFunction(fn) {
  const derivedPatterns = [
    '.filter(',
    '.map(',
    '.reduce(',
    '.sort(',
    '.value =',
    'this.',
    '.computed('
  ]

  const sideEffectPatterns = [
    '$emit',
    'console.',
    'fetch',
    'axios',
    'localStorage',
    'sessionStorage',
    'window.',
    'document.'
  ]

  const fnString = safeStringify(fn)

  // Has derived state patterns but no side effects
  const hasDerived = derivedPatterns.some(pattern => fnString.includes(pattern))
  const hasSideEffects = sideEffectPatterns.some(pattern => fnString.includes(pattern))

  return hasDerived && !hasSideEffects
}

/**
 * Generate severity level based on score
 * @param {number} score - Numerical score
 * @param {Object} thresholds - Score thresholds for severity levels
 * @returns {string} Severity level
 */
export function getSeverityLevel(score, thresholds = { low: 3, medium: 6, high: 9 }) {
  if (score >= thresholds.high) return 'high'
  if (score >= thresholds.medium) return 'medium'
  if (score >= thresholds.low) return 'low'
  return 'none'
}

/**
 * Get component methods for Options API components
 * @param {Object} instance - Vue component instance
 * @returns {Object} Component methods object
 */
export function getComponentMethods(instance) {
  return instance?.type?.methods || instance?.$?.type?.methods || instance?.$options?.methods || {}
}

/**
 * Get component lifecycle methods
 * @param {Object} instance - Vue component instance
 * @returns {Object} Lifecycle methods object
 */
export function getComponentLifecycle(instance) {
  const type = instance?.type || instance?.$?.type || instance?.$options || {}

  return {
    mounted: type.mounted,
    unmounted: type.unmounted || type.beforeDestroy,
    created: type.created,
    beforeMount: type.beforeMount,
    beforeUpdate: type.beforeUpdate,
    updated: type.updated,
    beforeUnmount: type.beforeUnmount || type.beforeDestroy,
    activated: type.activated,
    deactivated: type.deactivated,
    errorCaptured: type.errorCaptured
  }
}

/**
 * Create standardized pattern result object
 * @param {Object} options - Pattern result options
 * @returns {Object} Standardized pattern result
 */
export function createPatternResult({
  detected = false,
  reason = '',
  severity = 'medium',
  suggestion = '',
  codeGeneration = null,
  detectionMethod = 'heuristic',
  metrics = {},
  ...additionalProps
}) {
  return {
    detected,
    reason,
    severity,
    suggestion,
    codeGeneration,
    detectionMethod,
    metrics,
    ...additionalProps
  }
}
