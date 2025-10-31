/**
 * Deep Watchers Pattern Detection
 * Detects deep watchers on large objects that cause performance issues
 */

import {
  getComponentEffects,
  getComponentWatchers,
  getSetupFunction,
  safeStringify,
  isSlowRender,
  hasUnnecessaryRenders,
  getTriggerMechanism,
  createPatternResult
} from '../helpers/detection-utils.js'

import { generateDeepWatcherFix } from '../helpers/code-generation.js'

/**
 * Main pattern detection for deep watchers
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Detection result
 */
export function detect(instance, snapshot, renderTime) {
  const result = createPatternResult({
    detectionMethod: '',
    watcherMetrics: {
      deepWatchers: [],
      watcherCount: 0,
      objectComplexity: 0,
      memoryImpact: 0,
      performanceScore: 0,
      unnecessaryRenderPercent: snapshot?.unnecessaryRenderPercent || 0,
      renderTime: renderTime || 0
    },
    codeGeneration: ''
  })

  const metrics = result.watcherMetrics

  try {
    // Method 1: Analyze Vue 3 effects for deep watchers
    const effects = getComponentEffects(instance)
    effects.forEach(effect => {
      if (effect && effect.options?.deep === true) {
        const analysis = analyzeDeepWatcherEffect(effect, instance)
        metrics.deepWatchers.push(analysis)
        metrics.objectComplexity += analysis.complexity
        metrics.memoryImpact += analysis.memoryImpact
      }
    })

    // Method 2: Analyze options-style watchers
    const optionsWatchers = getComponentWatchers(instance)
    Object.entries(optionsWatchers).forEach(([key, watcherConfig]) => {
      if (
        watcherConfig?.deep === true ||
        (typeof watcherConfig === 'object' && watcherConfig.deep === true)
      ) {
        const analysis = analyzeOptionsDeepWatcher(key, watcherConfig, instance)
        metrics.deepWatchers.push(analysis)
        metrics.objectComplexity += analysis.complexity
        metrics.memoryImpact += analysis.memoryImpact
      }
    })

    // Method 3: Analyze setup function for deep watch calls
    const setupFn = getSetupFunction(instance)
    if (setupFn) {
      const setupString = safeStringify(setupFn)
      const setupAnalysis = analyzeSetupDeepWatchers(setupString, instance)
      setupAnalysis.forEach(analysis => {
        metrics.deepWatchers.push(analysis)
        metrics.objectComplexity += analysis.complexity
        metrics.memoryImpact += analysis.memoryImpact
      })

      // Fallback detection for edge cases
      if (
        setupAnalysis.length === 0 &&
        (setupString.includes('deep: true') ||
          (setupString.includes('deep') && setupString.includes('true')))
      ) {
        const fallbackAnalysis = {
          type: 'setup',
          source: 'setup-function',
          watchedSource: 'detected',
          complexity: 30,
          memoryImpact: 36,
          isUnnecessary: false,
          alternatives: []
        }
        metrics.deepWatchers.push(fallbackAnalysis)
        metrics.objectComplexity += fallbackAnalysis.complexity
        metrics.memoryImpact += fallbackAnalysis.memoryImpact
      }
    }

    metrics.watcherCount = metrics.deepWatchers.length

    // Scoring and detection logic
    const scoringResult = scoreDeepWatcherIssues(metrics, renderTime, snapshot)

    if (scoringResult.detected) {
      result.detected = true
      result.reason = scoringResult.reason
      result.severity = scoringResult.severity
      result.detectionMethod = scoringResult.detectionMethod
      result.suggestion = scoringResult.suggestion
      result.codeGeneration = generateDeepWatcherCodeFix(metrics, snapshot)
      metrics.performanceScore = scoringResult.totalScore
    }
  } catch (error) {
    console.debug('[VRI] Deep watcher detection error:', error)
  }

  return result
}

/**
 * Analyze deep watcher effect from Vue 3
 * @param {Object} effect - Vue effect object
 * @param {Object} instance - Vue component instance
 * @returns {Object} Analysis result
 */
function analyzeDeepWatcherEffect(effect, _instance) {
  const analysis = {
    type: 'effect',
    source: 'vue3-effect',
    complexity: 0,
    memoryImpact: 0,
    isUnnecessary: false,
    alternatives: []
  }

  try {
    const effectString = safeStringify(effect.fn)

    // Estimate complexity based on effect function patterns
    const complexityPatterns = [
      { pattern: /\.value\./, multiplier: 2 }, // Nested reactive access
      { pattern: /\[.*\]\./, multiplier: 1.5 }, // Array/object indexing
      { pattern: /forEach|map|filter|reduce/, multiplier: 5 }, // Array operations
      { pattern: /JSON\.stringify/, multiplier: 3 }, // Serialization
      { pattern: /Object\.keys|Object\.values/, multiplier: 2 }, // Object iteration
      {
        pattern:
          /processData|processComplexData|expensiveOperation|expensiveCalculation|processMetadata|generateAnalytics|computeAnalytics|generateRecommendations|processItem|computeRecommendations|analyzeUser|processUserMetadata|processComplexData|expensiveComputation/,
        multiplier: 8
      } // Heavy operations
    ]

    complexityPatterns.forEach(({ pattern, multiplier }) => {
      const matches = effectString.match(pattern) || []
      analysis.complexity += matches.length * multiplier * 10
    })

    // Minimum complexity for any deep watcher
    if (analysis.complexity === 0) {
      analysis.complexity = 20
    }

    // Estimate memory impact
    analysis.memoryImpact = analysis.complexity * 1.2

    // Check if this looks like derived state (should be computed instead)
    const derivedStatePatterns = [
      /\.value\s*=.*\.filter\(/,
      /\.value\s*=.*\.map\(/,
      /\.value\s*=.*\.reduce\(/,
      /\.value\s*=.*\.sort\(/,
      /\.value\s*=.*\+/,
      /\.value\s*=.*\*/,
      /filteredItems\.value\s*=/,
      /sortedItems\.value\s*=/,
      /processedData\.value\s*=/
    ]

    analysis.isUnnecessary = derivedStatePatterns.some(pattern => pattern.test(effectString))

    if (analysis.isUnnecessary) {
      analysis.alternatives.push('computed-property')
    }
  } catch {
    // Fallback values if analysis fails
    analysis.complexity = 30
    analysis.memoryImpact = 36
  }

  return analysis
}

/**
 * Analyze options-style deep watcher
 * @param {string} key - Watched property key
 * @param {Object} watcherConfig - Watcher configuration
 * @param {Object} instance - Vue component instance
 * @returns {Object} Analysis result
 */
function analyzeOptionsDeepWatcher(key, watcherConfig, instance) {
  const analysis = {
    type: 'options',
    source: 'options-watch',
    watchedProperty: key,
    complexity: 0,
    memoryImpact: 0,
    isUnnecessary: false,
    alternatives: []
  }

  // Estimate complexity based on watched property
  const propValue = instance?.props?.[key] || instance?.$?.data?.[key]
  if (propValue && typeof propValue === 'object') {
    analysis.complexity = calculateObjectComplexity(propValue)
    analysis.memoryImpact = analysis.complexity * 1.2
  } else {
    // Default complexity for unknown properties
    analysis.complexity = 30
    analysis.memoryImpact = 36
  }

  // Check handler function for derived state patterns
  const handler = watcherConfig.handler || watcherConfig
  const handlerString = safeStringify(handler)

  const derivedStatePatterns = [
    /this\.\w+\s*=.*\.filter\(/,
    /this\.\w+\s*=.*\.map\(/,
    /this\.\w+\s*=.*\.reduce\(/,
    /this\.\w+\s*=.*\.sort\(/
  ]

  analysis.isUnnecessary = derivedStatePatterns.some(pattern => pattern.test(handlerString))

  if (analysis.isUnnecessary) {
    analysis.alternatives.push('computed-property')
  }

  // Check for side effects
  const sideEffectPatterns = [/\$emit\(/, /fetch\(/, /axios\./, /console\./, /localStorage\./]

  const hasSideEffects = sideEffectPatterns.some(pattern => pattern.test(handlerString))
  if (!hasSideEffects && analysis.isUnnecessary) {
    analysis.alternatives.push('shallow-watch-specific-property')
  }

  return analysis
}

/**
 * Analyze setup function for deep watchers
 * @param {string} setupString - Setup function string
 * @param {Object} instance - Vue component instance
 * @returns {Array} Array of watcher analyses
 */
function analyzeSetupDeepWatchers(setupString, _instance) {
  const watchers = []

  // Enhanced pattern to find watch calls with deep: true option
  const deepWatchPatterns = [
    // Standard watch: watch(ref, handler, { deep: true })
    /watch\s*\(\s*([^,\s()]+)\s*,\s*[^,]*?,\s*\{[^}]*deep\s*:\s*true[^}]*\}/g,
    // Arrow function: watch(() => ref.something, handler, { deep: true })
    /watch\s*\(\s*\(\s*\)\s*=>\s*([^,)]+)\s*,\s*[^,]*?,\s*\{[^}]*deep\s*:\s*true[^}]*\}/g,
    // Multi-line watch calls - more flexible
    /watch\s*\(\s*([^,]+?)\s*,\s*[\s\S]*?\{\s*[\s\S]*?deep\s*:\s*true[\s\S]*?\}/g,
    // Simpler pattern for basic cases
    /watch\s*\(\s*([^\s,]+)\s*,[\s\S]*?\{\s*[\s\S]*?deep:\s*true/g,
    // Even more permissive pattern
    /watch\s*\(\s*([^,)]+),\s*[^,}]*,\s*\{[^}]*deep\s*:\s*true/g
  ]

  const seenWatchers = new Set() // Track seen watchers to avoid duplicates

  deepWatchPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(setupString)) !== null) {
      let watchSource = match[1].trim()

      // Extract the actual watched source from arrow functions
      if (watchSource.includes('=>')) {
        const arrowMatch = watchSource.match(/\(\s*\)\s*=>\s*(.+)/)
        if (arrowMatch) {
          watchSource = arrowMatch[1].trim()
        }
      }

      // Create unique key based on source and position to avoid duplicates
      const watchKey = `${watchSource}:${match.index}`
      if (seenWatchers.has(watchKey)) {
        continue // Skip duplicate
      }
      seenWatchers.add(watchKey)

      const analysis = {
        type: 'setup',
        source: 'setup-function',
        watchedSource: watchSource,
        complexity: 30,
        memoryImpact: 36,
        isUnnecessary: false,
        alternatives: []
      }

      // Check the context around this match for derived state
      const contextArea = setupString.substring(Math.max(0, match.index - 200), match.index + 300)
      const derivedStatePatterns = [
        /\.value\s*=.*\.filter\(/,
        /\.value\s*=.*\.map\(/,
        /\.value\s*=.*\.reduce\(/,
        /\.value\s*=.*\.sort\(/,
        /\.value\s*=.*computed\(/,
        /filteredItems\.value\s*=/,
        /processedData\.value\s*=/,
        /processedState\.value\s*=/,
        /userAnalytics\.value\s*=/
      ]

      analysis.isUnnecessary = derivedStatePatterns.some(pattern => pattern.test(contextArea))

      if (analysis.isUnnecessary) {
        analysis.alternatives.push('computed-property')
      }

      watchers.push(analysis)
    }
  })

  return watchers
}

/**
 * Score deep watcher issues and determine if should report
 * @param {Object} metrics - Watcher metrics
 * @param {number} renderTime - Render time in milliseconds
 * @param {Object} snapshot - Component snapshot data
 * @returns {Object} Scoring result
 */
function scoreDeepWatcherIssues(metrics, renderTime, snapshot) {
  const result = {
    detected: false,
    totalScore: 0,
    reason: '',
    severity: 'medium',
    detectionMethod: '',
    suggestion: ''
  }

  const reasons = []

  // Score based on number of deep watchers - always give points if we have watchers
  if (metrics.watcherCount > 0) {
    result.totalScore += metrics.watcherCount * 2
    reasons.push(`${metrics.watcherCount} deep watchers detected`)
  }

  // Score based on object complexity
  if (metrics.objectComplexity > 50) {
    result.totalScore += 3
    reasons.push('watching highly complex objects')
  } else if (metrics.objectComplexity > 20) {
    result.totalScore += 2
    reasons.push('watching moderately complex objects')
  }

  // Score based on memory impact
  if (metrics.memoryImpact > 200) {
    result.totalScore += 3
    reasons.push('high memory impact from deep watching')
  } else if (metrics.memoryImpact > 100) {
    result.totalScore += 2
    reasons.push('moderate memory impact from deep watching')
  } else if (metrics.memoryImpact > 30) {
    result.totalScore += 1
    reasons.push('some memory impact from deep watching')
  }

  // Performance correlation scoring
  if (isSlowRender(renderTime, 15) && metrics.watcherCount > 0) {
    result.totalScore += 3
    reasons.push(`slow renders (${renderTime.toFixed(1)}ms) with deep watchers`)
  }

  if (
    (hasUnnecessaryRenders(snapshot) || snapshot?.unnecessaryRenderPercent > 40) &&
    snapshot?.unnecessaryRenderPercent > 40 &&
    metrics.watcherCount > 0
  ) {
    result.totalScore += 2
    reasons.push(`${snapshot.unnecessaryRenderPercent}% unnecessary renders with deep watchers`)
  }

  // State trigger correlation
  if (
    getTriggerMechanism(snapshot) === 'state' &&
    metrics.watcherCount > 0 &&
    (hasUnnecessaryRenders(snapshot) || snapshot?.unnecessaryRenderPercent > 0)
  ) {
    result.totalScore += 2
    reasons.push('state changes triggering deep watcher overhead')
  }

  // Detect if we should report deep watcher issues
  const threshold = metrics.watcherCount > 1 ? 3 : 4 // Higher threshold for single watchers
  if (result.totalScore >= threshold) {
    result.detected = true
    result.reason = `Deep watcher performance issues: ${reasons.join(', ')}`

    // Determine severity and detection method
    if (isSlowRender(renderTime, 15) && metrics.watcherCount > 0) {
      result.severity = 'high'
      result.detectionMethod = 'performance-correlation'
      result.suggestion =
        'Critical: Deep watchers correlating with slow renders. Use shallow watching with manual triggering or computed properties.'
    } else if (metrics.watcherCount > 3 || metrics.objectComplexity > 80) {
      result.severity = 'high'
      result.detectionMethod = 'complexity-analysis'
      result.suggestion =
        'Critical: Multiple deep watchers or highly complex objects causing performance degradation. Convert to specific property watching or computed properties.'
    } else if (metrics.memoryImpact > 100) {
      result.severity = 'high'
      result.detectionMethod = 'pattern-analysis'
      result.suggestion =
        'Critical: Deep watchers consuming significant memory. Consider watching specific properties or using computed properties for derived state.'
    } else if (metrics.memoryImpact > 40) {
      result.severity = 'medium'
      result.detectionMethod = 'pattern-analysis'
      result.suggestion =
        'Deep watchers consuming moderate memory. Consider watching specific properties or using computed properties for derived state.'
    } else {
      result.severity = 'medium'
      result.detectionMethod = 'pattern-analysis'
      result.suggestion =
        'Deep watchers detected. Consider more specific watching patterns for better performance.'
    }
  }

  return result
}

/**
 * Calculate object complexity for memory impact estimation
 * @param {Object} obj - Object to analyze
 * @param {number} depth - Current depth
 * @param {number} maxDepth - Maximum depth to analyze
 * @returns {number} Complexity score
 */
function calculateObjectComplexity(obj, depth = 0, maxDepth = 5) {
  if (depth >= maxDepth || !obj || typeof obj !== 'object') return 1

  let complexity = 1
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      complexity += calculateObjectComplexity(obj[key], depth + 1, maxDepth)
    }
  }

  return Math.min(complexity, 100) // Cap complexity at 100
}

/**
 * Generate deep watcher optimization code
 * @param {Object} metrics - Watcher metrics
 * @param {Object} snapshot - Component snapshot data
 * @returns {string} Generated fix code
 */
function generateDeepWatcherCodeFix(metrics, _snapshot) {
  let fix = generateDeepWatcherFix('largeObject')

  // Add specific examples based on detected patterns
  const unnecessaryWatchers = metrics.deepWatchers.filter(w => w.isUnnecessary)
  if (unnecessaryWatchers.length > 0) {
    fix += `\n\n${`
// ❌ Bad: Deep watching for derived state
<script setup>
import { watch, ref } from 'vue'

const data = ref({ /* large object */ })
const processedData = ref([])

// Expensive deep watcher
watch(data, (newData) => {
  processedData.value = newData.items.filter(item => item.active)
}, { deep: true })
</script>

✅ Good: Use computed properties for derived state
<script setup>
import { computed, ref } from 'vue'

const data = ref({ /* large object */ })

// Cached and efficient
const processedData = computed(() => 
  data.value.items?.filter(item => item.active) || []
)
</script>
    `.trim()}`
  }

  const complexWatchers = metrics.deepWatchers.filter(w => w.complexity > 30)
  if (complexWatchers.length > 0) {
    fix += `\n\n${`
// ❌ Bad: Deep watching complex objects
<script setup>
import { watch, ref } from 'vue'

const complexObject = ref({
  user: { profile: { settings: { theme: 'dark' } } },
  data: { items: [...], metadata: {...} }
})

watch(complexObject, (newObj) => {
  console.log('Object changed', newObj)
}, { deep: true }) // Expensive!
</script>

✅ Good: Watch specific properties
<script setup>
import { watch, ref } from 'vue'

const complexObject = ref({ /* large object */ })

// Watch only what you need
watch(
  () => complexObject.value.user.profile.settings.theme,
  (newTheme) => {
    console.log('Theme changed', newTheme)
  }
)

// Or watch multiple specific properties
watch(
  [() => complexObject.value.data.items.length,
   () => complexObject.value.user.isActive],
  ([itemCount, isActive]) => {
    console.log('Relevant properties changed', { itemCount, isActive })
  }
)
</script>
    `.trim()}`
  }

  // Advanced memory optimization patterns (for high memory impact scenarios)
  const highMemoryWatchers = metrics.deepWatchers.filter(w => w.memoryImpact > 100)
  if (highMemoryWatchers.length > 0) {
    fix += `\n\n${`
Advanced optimization for memory-intensive scenarios:

// ❌ Bad: Deep watching massive datasets
<script setup>
import { ref, watch } from 'vue'

const massiveDataset = ref({
  users: new Array(1000).fill({}),
  analytics: { /* complex nested data */ }
})

watch(massiveDataset, (newData) => {
  processData(newData)
}, { deep: true }) // Memory intensive!
</script>

✅ Good: Use shallowRef with manual triggering
<script setup>
import { shallowRef, triggerRef, watchEffect } from 'vue'

const massiveDataset = shallowRef({
  users: new Array(1000).fill({}),
  analytics: { /* complex nested data */ }
})

// Option 1: Manual triggering when needed
const updateDataset = (newData) => {
  massiveDataset.value = { ...massiveDataset.value, ...newData }
  triggerRef(massiveDataset)
}

// Option 2: Use watchEffect for specific dependencies
watchEffect(() => {
  // Only re-runs when specific values change
  const userCount = massiveDataset.value.users.length
  const analyticsVersion = massiveDataset.value.analytics.version
  processSpecificData(userCount, analyticsVersion)
})
</script>
    `.trim()}`
  }

  // Performance optimization tips
  fix += `\n\nPerformance optimization tips:
• Use computed properties for derived state
• Watch specific properties instead of deep watching
• Use shallowRef for large objects
• Consider debouncing watchers for expensive operations`

  // Memory optimization patterns (for debouncing)
  fix += `\n\nMemory optimization patterns:

<script setup>
import { debounce } from 'lodash-es'
import { watch, ref } from 'vue'

const largeState = ref({})

// Debounce expensive operations
const debouncedWatcher = debounce((newState) => {
  // Expensive processing here
  processLargeState(newState)
}, 300)

watch(largeState, debouncedWatcher, { deep: true })
</script>`

  return fix
}

// Pattern metadata for integration with main patterns object
export const metadata = {
  reason: 'Deep watcher on large object',
  suggestion:
    'Avoid deep watchers on large objects. Watch specific properties or use computed properties.',
  example: {
    bad: `
// ❌ Deep watcher on large object
import { watch, ref } from 'vue'

const userProfile = ref({ 
  personal: { name, email, ... },
  settings: { theme, language, ... },
  preferences: { ... }
})

watch(userProfile, (newVal) => {
  saveToLocalStorage(newVal) // Runs on ANY nested change
}, { deep: true })
    `,
    good: `
// ✅ Watch specific properties
import { watch, computed } from 'vue'

// Option 1: Watch specific path
const theme = computed(() => userProfile.value.settings.theme)
watch(theme, (newTheme) => {
  applyTheme(newTheme)
})

// Option 2: Use watchEffect for multiple deps
watchEffect(() => {
  // Only runs when these specific values change
  const { theme, language } = userProfile.value.settings
  updateUI(theme, language)
})
    `
  }
}

// Simple detection function for basic pattern object
export const simpleDetect = instance => {
  const watchers = getComponentEffects(instance)
  const deepWatchers = watchers.filter(effect => {
    const options = effect.options || {}
    return options.deep === true
  })

  // Check if watching large objects
  return deepWatchers.some(watcher => {
    const watchedKey = watcher.getter?.toString().match(/this\.(\w+)/)?.[1]
    if (watchedKey && instance[watchedKey]) {
      const size = JSON.stringify(instance[watchedKey]).length
      return size > 1000 // Large object
    }
    return false
  })
}

// Main pattern export - use enhanced detect function
export default {
  detect,
  ...metadata
}
