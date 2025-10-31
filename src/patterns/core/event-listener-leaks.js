/**
 * Event Listener Leaks Pattern Detection
 * Detects event listeners that are not properly cleaned up, causing memory leaks
 */

import {
  getSetupFunction,
  getComponentMethods,
  createPatternResult,
  safeStringify,
  isSlowRender,
  hasUnnecessaryRenders
} from '../helpers/detection-utils.js'

import { generateEventListenerFix } from '../helpers/code-generation.js'

/**
 * Main pattern detection for event listener leaks
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Detection result
 */
export function detect(instance, snapshot, renderTime) {
  const result = createPatternResult({
    detectionMethod: '',
    listenerDetails: {
      addedListeners: [],
      removedListeners: [],
      leakedListeners: [],
      addListenerCount: 0,
      removeListenerCount: 0,
      leakRisk: 0,
      memoryImpact: 0
    },
    codeGeneration: ''
  })

  const listenerDetails = result.listenerDetails

  // Method 1: Analyze Options API lifecycle methods
  const optionsAPIAnalysis = analyzeOptionsAPILifecycle(instance)
  if (optionsAPIAnalysis.detected) {
    listenerDetails.addedListeners.push(...optionsAPIAnalysis.addedListeners)
    listenerDetails.removedListeners.push(...optionsAPIAnalysis.removedListeners)
    listenerDetails.leakedListeners.push(...optionsAPIAnalysis.leakedListeners)
  }

  // Method 2: Analyze Composition API setup function
  const compositionAPIAnalysis = analyzeCompositionAPISetup(instance)
  if (compositionAPIAnalysis.detected) {
    listenerDetails.addedListeners.push(...compositionAPIAnalysis.addedListeners)
    listenerDetails.removedListeners.push(...compositionAPIAnalysis.removedListeners)
    listenerDetails.leakedListeners.push(...compositionAPIAnalysis.leakedListeners)
  }

  // Method 3: Analyze component methods for event listener patterns
  const methodsAnalysis = analyzeComponentMethods(instance)
  if (methodsAnalysis.detected) {
    listenerDetails.addedListeners.push(...methodsAnalysis.addedListeners)
    listenerDetails.removedListeners.push(...methodsAnalysis.removedListeners)
  }

  // Calculate metrics
  listenerDetails.addListenerCount = listenerDetails.addedListeners.length
  listenerDetails.removeListenerCount = listenerDetails.removedListeners.length
  listenerDetails.leakRisk = calculateLeakRisk(listenerDetails)
  listenerDetails.memoryImpact = calculateMemoryImpact(listenerDetails)

  // Determine if pattern should be reported
  const shouldReport = determineShouldReportLeaks(listenerDetails, renderTime, snapshot)

  if (shouldReport.detected) {
    result.detected = true
    result.reason = shouldReport.reason
    result.severity = shouldReport.severity
    result.detectionMethod = shouldReport.detectionMethod
    result.suggestion = shouldReport.suggestion
    result.codeGeneration = generateEventListenerCodeFix(listenerDetails, snapshot)
  }

  return result
}

/**
 * Analyze Options API lifecycle methods for event listener patterns
 * @param {Object} instance - Vue component instance
 * @returns {Object} Analysis result
 */
function analyzeOptionsAPILifecycle(instance) {
  const result = {
    detected: false,
    addedListeners: [],
    removedListeners: [],
    leakedListeners: []
  }

  // Get lifecycle methods
  const mounted = instance?.type?.mounted || instance?.$?.type?.mounted
  const unmounted =
    instance?.type?.unmounted ||
    instance?.type?.beforeDestroy ||
    instance?.$?.type?.unmounted ||
    instance?.$?.type?.beforeDestroy

  const mountedString = mounted ? safeStringify(mounted) : ''
  const unmountedString = unmounted ? safeStringify(unmounted) : ''

  if (!mountedString) return result

  // Extract addEventListener calls from mounted
  const addListenerMatches = extractEventListenerCalls(mountedString, 'addEventListener')
  if (addListenerMatches.length > 0) {
    result.detected = true
    result.addedListeners = addListenerMatches.map(match => ({
      type: 'options-api',
      lifecycle: 'mounted',
      eventType: match.eventType,
      target: match.target,
      handler: match.handler,
      context: match.context
    }))
  }

  // Extract removeEventListener calls from unmounted
  const removeListenerMatches = extractEventListenerCalls(unmountedString, 'removeEventListener')
  if (removeListenerMatches.length > 0) {
    result.removedListeners = removeListenerMatches.map(match => ({
      type: 'options-api',
      lifecycle: 'unmounted',
      eventType: match.eventType,
      target: match.target,
      handler: match.handler,
      context: match.context
    }))
  }

  // Find leaked listeners (added but not removed)
  result.leakedListeners = findLeakedListeners(result.addedListeners, result.removedListeners)

  return result
}

/**
 * Analyze Composition API setup function for event listener patterns
 * @param {Object} instance - Vue component instance
 * @returns {Object} Analysis result
 */
function analyzeCompositionAPISetup(instance) {
  const result = {
    detected: false,
    addedListeners: [],
    removedListeners: [],
    leakedListeners: []
  }

  const setupFn = getSetupFunction(instance)
  if (!setupFn) return result

  const setupString = safeStringify(setupFn)

  // Look for onMounted with addEventListener
  const onMountedPattern = /onMounted\s*\(\s*(?:\(\s*\)\s*=>\s*)?\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g
  let onMountedMatch
  while ((onMountedMatch = onMountedPattern.exec(setupString)) !== null) {
    const mountedContent = onMountedMatch[1]
    const addListenerMatches = extractEventListenerCalls(mountedContent, 'addEventListener')

    if (addListenerMatches.length > 0) {
      result.detected = true
      result.addedListeners.push(
        ...addListenerMatches.map(match => ({
          type: 'composition-api',
          lifecycle: 'onMounted',
          eventType: match.eventType,
          target: match.target,
          handler: match.handler,
          context: match.context
        }))
      )
    }
  }

  // Look for onUnmounted with removeEventListener
  const onUnmountedPattern =
    /onUnmounted\s*\(\s*(?:\(\s*\)\s*=>\s*)?\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g
  let onUnmountedMatch
  while ((onUnmountedMatch = onUnmountedPattern.exec(setupString)) !== null) {
    const unmountedContent = onUnmountedMatch[1]
    const removeListenerMatches = extractEventListenerCalls(unmountedContent, 'removeEventListener')

    if (removeListenerMatches.length > 0) {
      result.removedListeners.push(
        ...removeListenerMatches.map(match => ({
          type: 'composition-api',
          lifecycle: 'onUnmounted',
          eventType: match.eventType,
          target: match.target,
          handler: match.handler,
          context: match.context
        }))
      )
    }
  }

  // Check for useEventListener patterns (VueUse)
  const vueUsePattern = /useEventListener\s*\(/g
  const vueUseMatches = setupString.match(vueUsePattern) || []
  if (vueUseMatches.length > 0) {
    // VueUse automatically handles cleanup, so these are safe
    result.addedListeners.push(
      ...vueUseMatches.map((match, index) => ({
        type: 'composition-api',
        lifecycle: 'setup',
        eventType: 'unknown',
        target: 'vueuse-managed',
        handler: 'auto-cleanup',
        context: 'VueUse useEventListener (safe)',
        isSafe: true
      }))
    )
  }

  // Find leaked listeners
  result.leakedListeners = findLeakedListeners(
    result.addedListeners.filter(l => !l.isSafe),
    result.removedListeners
  )

  return result
}

/**
 * Analyze component methods for event listener patterns
 * @param {Object} instance - Vue component instance
 * @returns {Object} Analysis result
 */
function analyzeComponentMethods(instance) {
  const result = {
    detected: false,
    addedListeners: [],
    removedListeners: []
  }

  const methods = getComponentMethods(instance)

  Object.entries(methods).forEach(([methodName, methodFn]) => {
    const methodString = safeStringify(methodFn)

    // Look for addEventListener in methods
    const addListenerMatches = extractEventListenerCalls(methodString, 'addEventListener')
    if (addListenerMatches.length > 0) {
      result.detected = true
      result.addedListeners.push(
        ...addListenerMatches.map(match => ({
          type: 'method',
          methodName,
          eventType: match.eventType,
          target: match.target,
          handler: match.handler,
          context: match.context
        }))
      )
    }

    // Look for removeEventListener in methods
    const removeListenerMatches = extractEventListenerCalls(methodString, 'removeEventListener')
    if (removeListenerMatches.length > 0) {
      result.removedListeners.push(
        ...removeListenerMatches.map(match => ({
          type: 'method',
          methodName,
          eventType: match.eventType,
          target: match.target,
          handler: match.handler,
          context: match.context
        }))
      )
    }
  })

  return result
}

/**
 * Extract event listener calls from code string
 * @param {string} codeString - Code to analyze
 * @param {string} methodType - 'addEventListener' or 'removeEventListener'
 * @returns {Array} Array of listener matches
 */
function extractEventListenerCalls(codeString, methodType) {
  const listeners = []

  // Pattern for addEventListener/removeEventListener calls
  const pattern = new RegExp(
    `(\\w+)\\s*\\.\\s*${methodType}\\s*\\(\\s*['"](\\w+)['"]\\s*,\\s*(\\w+)(?:\\s*,\\s*([^)]+))?\\s*\\)`,
    'g'
  )

  let match
  while ((match = pattern.exec(codeString)) !== null) {
    listeners.push({
      target: match[1],
      eventType: match[2],
      handler: match[3],
      options: match[4] || null,
      context: match[0].trim()
    })
  }

  // Also check for more complex patterns
  const complexPattern = new RegExp(
    `(document|window)\\s*\\.\\s*${methodType}\\s*\\(\\s*['"](\\w+)['"]\\s*,\\s*([^,)]+)(?:\\s*,\\s*([^)]+))?\\s*\\)`,
    'g'
  )

  while ((match = complexPattern.exec(codeString)) !== null) {
    listeners.push({
      target: match[1],
      eventType: match[2],
      handler: match[3],
      options: match[4] || null,
      context: match[0].trim()
    })
  }

  return listeners
}

/**
 * Find listeners that are added but not properly removed
 * @param {Array} addedListeners - Array of added listeners
 * @param {Array} removedListeners - Array of removed listeners
 * @returns {Array} Array of leaked listeners
 */
function findLeakedListeners(addedListeners, removedListeners) {
  const leakedListeners = []

  addedListeners.forEach(added => {
    const isRemoved = removedListeners.some(
      removed =>
        removed.target === added.target &&
        removed.eventType === added.eventType &&
        removed.handler === added.handler
    )

    if (!isRemoved) {
      leakedListeners.push({
        ...added,
        leakType: 'missing-cleanup',
        severity: getLeakSeverity(added)
      })
    }
  })

  return leakedListeners
}

/**
 * Get severity of listener leak
 * @param {Object} listener - Listener object
 * @returns {string} Severity level
 */
function getLeakSeverity(listener) {
  // Global listeners are more severe
  if (listener.target === 'window' || listener.target === 'document') {
    return 'high'
  }

  // Frequent events are more problematic
  const frequentEvents = ['scroll', 'resize', 'mousemove', 'touchmove']
  if (frequentEvents.includes(listener.eventType)) {
    return 'high'
  }

  return 'medium'
}

/**
 * Calculate leak risk score
 * @param {Object} listenerDetails - Listener analysis details
 * @returns {number} Risk score
 */
function calculateLeakRisk(listenerDetails) {
  let risk = 0

  // Risk from leaked listeners
  listenerDetails.leakedListeners.forEach(leak => {
    if (leak.severity === 'high') {
      risk += 3
    } else {
      risk += 1
    }
  })

  // Risk from unmatched add/remove counts
  const unmatchedListeners = Math.abs(
    listenerDetails.addListenerCount - listenerDetails.removeListenerCount
  )
  risk += unmatchedListeners

  return risk
}

/**
 * Calculate memory impact estimate
 * @param {Object} listenerDetails - Listener analysis details
 * @returns {number} Memory impact score
 */
function calculateMemoryImpact(listenerDetails) {
  let impact = 0

  // Each leaked listener has memory impact
  listenerDetails.leakedListeners.forEach(leak => {
    // Global listeners have higher impact
    if (leak.target === 'window' || leak.target === 'document') {
      impact += 10
    } else {
      impact += 5
    }
  })

  return impact
}

/**
 * Determine if event listener leaks should be reported
 * @param {Object} listenerDetails - Listener analysis details
 * @param {number} renderTime - Render time in milliseconds
 * @param {Object} snapshot - Component snapshot data
 * @returns {Object} Reporting decision
 */
function determineShouldReportLeaks(listenerDetails, renderTime, snapshot) {
  const result = {
    detected: false,
    reason: '',
    severity: 'medium',
    detectionMethod: '',
    suggestion: ''
  }

  const reasons = []
  let score = 0

  // Score based on leaked listeners
  if (listenerDetails.leakedListeners.length > 0) {
    score += listenerDetails.leakedListeners.length * 2
    reasons.push(`${listenerDetails.leakedListeners.length} potential memory leak(s)`)
  }

  // Score based on leak risk
  if (listenerDetails.leakRisk > 3) {
    score += 2
    reasons.push('high leak risk detected')
  }

  // Score based on memory impact
  if (listenerDetails.memoryImpact > 15) {
    score += 2
    reasons.push('significant memory impact')
  }

  // Performance correlation
  if (isSlowRender(renderTime, 20) && listenerDetails.addListenerCount > 0) {
    score += 1
    reasons.push('slow renders with event listeners')
  }

  // Unnecessary renders correlation
  if (hasUnnecessaryRenders(snapshot) && listenerDetails.addListenerCount > 0) {
    score += 1
    reasons.push('unnecessary renders with event listeners')
  }

  // Detection threshold
  if (score >= 2) {
    result.detected = true
    result.reason = `Event listener memory leaks detected: ${reasons.join(', ')}`

    // Determine severity and suggestion
    const hasHighSeverityLeaks = listenerDetails.leakedListeners.some(l => l.severity === 'high')

    if (hasHighSeverityLeaks || listenerDetails.leakRisk > 5) {
      result.severity = 'high'
      result.detectionMethod = 'critical-leak-analysis'
      result.suggestion =
        'Critical: Global event listeners not cleaned up. This causes memory leaks and performance degradation. Always remove listeners in unmounted hook.'
    } else if (listenerDetails.leakedListeners.length > 2) {
      result.severity = 'medium'
      result.detectionMethod = 'leak-analysis'
      result.suggestion =
        'Multiple event listeners not properly cleaned up. Use onUnmounted or VueUse for automatic cleanup.'
    } else {
      result.severity = 'medium'
      result.detectionMethod = 'pattern-analysis'
      result.suggestion =
        'Event listeners detected without proper cleanup. Always remove event listeners in unmounted hook to prevent memory leaks.'
    }
  }

  return result
}

/**
 * Generate event listener optimization code
 * @param {Object} listenerDetails - Listener analysis details
 * @param {Object} snapshot - Component snapshot data
 * @returns {string} Generated fix code
 */
function generateEventListenerCodeFix(listenerDetails, snapshot) {
  let fix = generateEventListenerFix()

  // Add specific examples based on detected patterns
  const globalLeaks = listenerDetails.leakedListeners.filter(
    l => l.target === 'window' || l.target === 'document'
  )

  if (globalLeaks.length > 0) {
    fix += `\n\n${`
// ⚠️ CRITICAL: Global event listeners detected!

❌ Bad: Global listeners without cleanup
<script setup>
import { onMounted } from 'vue'

const handleResize = () => {
  console.log('Window resized')
}

const handleScroll = () => {
  console.log('Page scrolled')
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  document.addEventListener('scroll', handleScroll)
  // ❌ No cleanup - MEMORY LEAK!
})
</script>

✅ Good: Proper cleanup with onUnmounted
<script setup>
import { onMounted, onUnmounted } from 'vue'

const handleResize = () => {
  console.log('Window resized')
}

const handleScroll = () => {
  console.log('Page scrolled')
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  document.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('scroll', handleScroll)
})
</script>

✅ Even better: Use VueUse for automatic cleanup
<script setup>
import { useEventListener } from '@vueuse/core'

// Automatically cleaned up when component unmounts
useEventListener(window, 'resize', () => {
  console.log('Window resized')
})

useEventListener(document, 'scroll', () => {
  console.log('Page scrolled')
})
</script>
    `.trim()}`
  }

  return fix
}

// Pattern metadata for integration with main patterns object
export const metadata = {
  reason: 'Event listeners not cleaned up',
  suggestion: 'Always remove event listeners in unmounted hook to prevent memory leaks.',
  example: {
    bad: `
// ❌ Event listener not cleaned up
import { onMounted } from 'vue'

const handleResize = () => {
  console.log('resized')
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  // No cleanup - memory leak!
})
    `,
    good: `
// ✅ Proper cleanup
import { onMounted, onUnmounted } from 'vue'

const handleResize = () => {
  console.log('resized')
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// Or use VueUse for automatic cleanup
import { useEventListener } from '@vueuse/core'
useEventListener(window, 'resize', handleResize)
    `
  }
}

// Simple detection function for basic pattern object
export const simpleDetect = instance => {
  const mounted = instance.$?.type?.mounted?.toString() || ''
  const unmounted = instance.$?.type?.unmounted?.toString() || ''

  // Check if addEventListener without removeEventListener
  const hasAddListener = mounted.includes('addEventListener')
  const hasRemoveListener = unmounted.includes('removeEventListener')

  return hasAddListener && !hasRemoveListener
}

// Main pattern export
export default {
  detect: simpleDetect,
  ...metadata
}
