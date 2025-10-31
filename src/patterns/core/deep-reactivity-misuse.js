/**
 * Deep Reactivity Misuse Pattern Detection
 * Detects unnecessary deep reactivity on large objects which causes performance issues
 */

import { createPatternResult, isSlowRender } from '../helpers/detection-utils.js'

import { generateShallowReactivityFix } from '../helpers/code-generation.js'

/**
 * Main pattern detection for deep reactivity misuse
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Detection result
 */
export function detect(instance, snapshot, renderTime) {
  const result = createPatternResult({
    metrics: {},
    codeGeneration: null
  })

  const metrics = {
    totalProps: 0,
    largeObjects: 0,
    deepNesting: 0,
    arrayProperties: 0,
    objectDepth: 0,
    estimatedNodes: 0,
    immutableProps: 0
  }

  // Method 1: Analyze component props for large objects
  if (snapshot?.props) {
    metrics.totalProps = Object.keys(snapshot.props).length

    Object.entries(snapshot.props).forEach(([_key, value]) => {
      if (value && typeof value === 'object') {
        const analysis = analyzeObjectComplexity(value)
        metrics.estimatedNodes += analysis.nodeCount
        metrics.objectDepth = Math.max(metrics.objectDepth, analysis.depth)

        // Large object detection: >15 properties or >50 nodes
        if (
          analysis.nodeCount > 50 ||
          (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 15)
        ) {
          metrics.largeObjects++
        }

        // Deep nesting detection: >3 levels deep
        if (analysis.depth > 3) {
          metrics.deepNesting++
        }

        // Array property detection
        if (Array.isArray(value)) {
          metrics.arrayProperties++
        }

        // Also count arrays found during complexity analysis
        if (analysis.hasArrays) {
          metrics.arrayProperties += analysis.arrayCount || 0
        }
      }
    })
  }

  // Method 2: Analyze render performance impact
  const hasPerformanceImpact = isSlowRender(renderTime, 5) && metrics.estimatedNodes > 50
  const hasLargeDataStructures = metrics.largeObjects > 0 || metrics.deepNesting > 0
  const hasManyProps = metrics.totalProps > 15
  const hasLargeArrays = metrics.arrayProperties > 0

  // Method 3: Detect immutable data being made reactive
  let hasImmutableReactivity = false
  let immutableObjectNames = []
  if (snapshot?.propsDiff?.changed) {
    const immutableObjects = Object.entries(snapshot.propsDiff.changed).filter(
      ([_key, change]) =>
        // Objects that never change content but get new references
        change &&
        typeof change.from === 'object' &&
        change.deepEqual === true &&
        change.sameReference === false
    )

    if (immutableObjects.length > 2) {
      hasImmutableReactivity = true
      metrics.immutableProps = immutableObjects.length
      immutableObjectNames = immutableObjects.map(([key]) => key)
    }
  }

  // Detect deep reactivity issues
  if (
    hasLargeDataStructures ||
    hasPerformanceImpact ||
    hasManyProps ||
    hasImmutableReactivity ||
    hasLargeArrays
  ) {
    result.detected = true
    result.metrics = metrics

    // Determine severity
    if (metrics.estimatedNodes > 1000 || renderTime > 25) {
      result.severity = 'high'
    } else if (metrics.estimatedNodes > 100 || renderTime > 10) {
      result.severity = 'medium'
    } else {
      result.severity = 'low'
    }

    // Generate specific reason
    const reasons = []
    if (metrics.largeObjects > 0) {
      reasons.push(`${metrics.largeObjects} large objects (>50 properties)`)
    }
    if (metrics.deepNesting > 0) {
      reasons.push(`${metrics.deepNesting} deeply nested objects (>3 levels)`)
    }
    if (metrics.arrayProperties > 0) {
      reasons.push(`${metrics.arrayProperties} array properties`)
    }
    if (hasPerformanceImpact) {
      reasons.push(`slow render time (${renderTime.toFixed(1)}ms)`)
    }
    if (metrics.estimatedNodes > 100) {
      reasons.push(`~${metrics.estimatedNodes} reactive nodes`)
    }
    if (hasImmutableReactivity) {
      reasons.push(`${metrics.immutableProps} immutable objects being re-created`)
    }

    if (hasImmutableReactivity && !hasLargeDataStructures && !hasPerformanceImpact) {
      result.reason = `Immutable objects being re-created: ${immutableObjectNames.join(', ')}`
    } else {
      result.reason = `Deep reactivity on ${reasons.join(', ')}`
    }

    // Generate specific suggestions
    if (hasImmutableReactivity && !hasLargeDataStructures) {
      result.suggestion = 'Use shallowRef for immutable data that gets replaced entirely.'
    } else if (metrics.largeObjects > 0 && metrics.arrayProperties > 0) {
      result.suggestion =
        'Use shallowRef for large objects and arrays. Consider shallowReactive for complex data structures.'
    } else if (metrics.arrayProperties > 0 && metrics.largeObjects === 0) {
      result.suggestion = 'Use shallowRef for large arrays to avoid deep reactivity overhead.'
    } else if (metrics.deepNesting > 0) {
      result.suggestion =
        'Use shallowReactive for deeply nested objects. Only make specific paths reactive as needed.'
    } else {
      result.suggestion =
        'Consider using shallow reactivity for large data structures to improve performance.'
    }

    // Generate code fix
    result.codeGeneration = generateShallowReactivityCodeFix(metrics, snapshot)
  }

  return result
}

/**
 * Analyze object complexity to estimate reactive node count
 * @param {Object} obj - Object to analyze
 * @param {number} depth - Current depth
 * @param {WeakSet} visited - Visited objects to prevent cycles
 * @returns {Object} Analysis result
 */
function analyzeObjectComplexity(obj, depth = 0, visited = new WeakSet()) {
  if (depth > 10 || !obj || typeof obj !== 'object' || visited.has(obj)) {
    return { nodeCount: 0, depth, hasArrays: false, arrayCount: 0 }
  }

  visited.add(obj)
  let nodeCount = 1 // Count this object
  let maxDepth = depth
  let hasArrays = false
  let arrayCount = 0

  if (Array.isArray(obj)) {
    hasArrays = true
    arrayCount = 1
    // For arrays, sample first few elements to estimate complexity
    const sampleSize = Math.min(obj.length, 10)
    let totalChildNodes = 0

    for (let i = 0; i < sampleSize; i++) {
      if (obj[i] && typeof obj[i] === 'object') {
        const childAnalysis = analyzeObjectComplexity(obj[i], depth + 1, visited)
        totalChildNodes += childAnalysis.nodeCount
        maxDepth = Math.max(maxDepth, childAnalysis.depth)
        if (childAnalysis.hasArrays) {
          hasArrays = true
          arrayCount += childAnalysis.arrayCount
        }
      } else {
        totalChildNodes++
      }
    }

    // Estimate total for large arrays
    if (obj.length > sampleSize && sampleSize > 0) {
      const avgNodesPerElement = totalChildNodes / sampleSize
      nodeCount += Math.floor(avgNodesPerElement * obj.length)
    } else {
      nodeCount += totalChildNodes
    }
  } else {
    // For objects, analyze all properties
    const keys = Object.keys(obj)
    nodeCount += keys.length // Count properties themselves

    for (const key of keys) {
      const value = obj[key]
      if (value && typeof value === 'object') {
        const childAnalysis = analyzeObjectComplexity(value, depth + 1, visited)
        nodeCount += childAnalysis.nodeCount
        maxDepth = Math.max(maxDepth, childAnalysis.depth)
        if (childAnalysis.hasArrays) {
          hasArrays = true
          arrayCount += childAnalysis.arrayCount
        }
      }
    }
  }

  return { nodeCount, depth: maxDepth + 1, hasArrays, arrayCount }
}

/**
 * Generate shallow reactivity optimization code
 * @param {Object} metrics - Deep reactivity metrics
 * @param {Object} snapshot - Component snapshot
 * @returns {string} Generated fix code
 */
function generateShallowReactivityCodeFix(metrics, _snapshot) {
  let fix = ''

  // Always start with import
  fix += "import { shallowRef, shallowReactive, triggerRef } from 'vue'\n\n"
  fix += '// Convert to shallow reactivity for better performance\n'

  // Determine the primary scenario based on metrics
  const hasLargeArraysOnly =
    metrics.arrayProperties > 0 && metrics.largeObjects === 0 && metrics.deepNesting === 0
  const hasLargeObjectsOnly =
    metrics.largeObjects > 0 && metrics.arrayProperties === 0 && metrics.deepNesting === 0
  const hasDeepNestingOnly =
    metrics.deepNesting > 0 && metrics.largeObjects === 0 && metrics.arrayProperties === 0

  if (hasLargeArraysOnly) {
    // Large arrays scenario
    fix += `\n// For large arrays:
const items = shallowRef([/* large array */])

// Efficient updates:
largeArray.value = [...largeArray.value, newItem]      // Add item
items.value = items.value.filter(i => i.id !== removeId)  // Remove item
items.value = [...items.value].sort()       // Sort array

// Instead of:
// items.value.push(newItem)  // May not trigger updates reliably`
  } else if (hasLargeObjectsOnly) {
    // Large objects scenario
    fix += `\n// For large objects:
const data = shallowReactive({
  users: [],
  posts: [],
  settings: {}
})

// Update properties immutably for better performance
data.users = [...data.users, newUser]
data.settings = { ...data.settings, theme: 'dark' }`
  } else if (hasDeepNestingOnly) {
    // Deep nesting scenario
    fix += `\n// For deeply nested objects:
const state = shallowRef({
  nested: {
    level1: { level2: { level3: 'data' } }
  }
})

// Update deep properties immutably:
state.value = {
  ...state.value,
  nested: {
    ...state.value.nested,
    level1: { ...state.value.nested.level1, newProp: 'value' }
  }
}`
  } else {
    // Mixed scenario - use the base example
    fix += generateShallowReactivityFix('largeDataset')

    // Add specific examples based on detected patterns
    if (metrics.arrayProperties > 0) {
      fix += `\n\n// For large arrays specifically:
const items = shallowRef([/* large array */])

// Efficient updates:
largeArray.value = [...largeArray.value, newItem]      // Add item
items.value = items.value.filter(i => i.id !== removeId)  // Remove item
items.value = [...items.value].sort()       // Sort array

// Instead of:
// items.value.push(newItem)  // May not trigger updates reliably`
    }

    if (metrics.deepNesting > 0) {
      fix += `\n\n// For deeply nested data:
const state = shallowRef({
  nested: {
    level1: { level2: { level3: 'data' } }
  }
})

// Update deep properties immutably:
state.value = {
  ...state.value,
  nested: {
    ...state.value.nested,
    level1: { ...state.value.nested.level1, newProp: 'value' }
  }
}

// Or use a helper library like immer for complex updates`
    }

    if (metrics.immutableProps > 0) {
      fix += `\n\n// For immutable data that gets replaced entirely:
const config = shallowRef({ 
  api: { baseUrl: 'https://api.example.com' },
  features: { darkMode: true, notifications: false }
})

// When you receive new config from API:
config.value = newConfigFromAPI  // Efficient replacement

// Vue will detect the reference change and update components`
    }
  }

  return fix
}

// Pattern metadata for integration with main patterns object
export const metadata = {
  reason: 'Deep reactivity on large nested objects',
  suggestion:
    "Use shallowRef or shallowReactive for large objects that don't need deep reactivity. This significantly improves performance.",
  example: {
    bad: `
// ❌ Deep reactivity on large dataset
import { ref } from 'vue'

const state = ref({
  users: [...], // 1000 users with nested data
  posts: [...], // 500 posts with comments  
  settings: { theme: { colors: {...} } }
})
    `,
    good: `
// ✅ Shallow reactivity for performance
import { shallowRef, triggerRef } from 'vue'

const state = shallowRef({
  users: [...],
  posts: [...],
  settings: {...}
})

// Update immutably
state.value = { ...state.value, users: newUsers }
triggerRef(state) // Manually trigger if needed
    `
  }
}

// Simple detection function for basic pattern object
export const simpleDetect = (instance, _snapshot) => {
  const hasLargeReactiveData = Object.entries(instance.$?.data || {}).some(([_key, value]) => {
    if (typeof value !== 'object' || !value) return false

    // Count nested properties
    const countProps = (obj, depth = 0, max = 100) => {
      if (depth > 3) return max // Stop at depth 3
      let count = 0
      for (const key in obj) {
        count++
        if (count > max) return max
        if (typeof obj[key] === 'object' && obj[key]) {
          count += countProps(obj[key], depth + 1, max - count)
        }
      }
      return count
    }

    return countProps(value) > 50
  })

  return hasLargeReactiveData && instance.$.subTree?.children?.length > 10
}

// Main pattern export
export default {
  detect,
  ...metadata
}
