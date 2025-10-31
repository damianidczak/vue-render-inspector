/**
 * Array Mutations Pattern Detection
 * Detects direct array mutations that can cause reactivity issues
 */

import {
  createPatternResult,
  getComponentMethods,
  getSetupFunction,
  safeStringify
} from '../helpers/detection-utils.js'

import { generateArrayMutationFix } from '../helpers/code-generation.js'

/**
 * Main pattern detection for array mutations
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Detection result
 */
export function detect(instance, snapshot, renderTime) {
  const mutationMetrics = {
    mutationCount: 0,
    mutativeOperations: [],
    performanceImpact: 0,
    reactivityIssues: [],
    antiPatterns: [],
    immutableAlternatives: []
  }

  // Analyze different parts of the component for mutations
  analyzeComponentMethods(instance, mutationMetrics)
  analyzeSetupFunction(instance, mutationMetrics)
  analyzeComputedProperties(instance, mutationMetrics)
  analyzeWatchers(instance, mutationMetrics)
  analyzeAntiPatterns(mutationMetrics)
  generateImmutableAlternatives(mutationMetrics)

  // Calculate performance impact
  calculatePerformanceImpact(mutationMetrics, renderTime)

  // Determine if we should report this pattern
  const shouldDetect = shouldReportPattern(mutationMetrics, renderTime, snapshot)

  if (!shouldDetect.detected) {
    return createPatternResult({ detected: false })
  }

  // Generate code fixes
  const codeGeneration = generateCodeFixes(mutationMetrics, instance)

  return createPatternResult({
    detected: true,
    reason: shouldDetect.reason,
    severity: shouldDetect.severity,
    suggestion: shouldDetect.suggestion,
    detectionMethod: shouldDetect.detectionMethod,
    mutationMetrics,
    codeGeneration
  })
}

/**
 * Analyze component methods for array mutations
 * @param {Object} instance - Vue component instance
 * @param {Object} mutationMetrics - Mutation metrics object to populate
 */
function analyzeComponentMethods(instance, mutationMetrics) {
  const methods = getComponentMethods(instance)

  Object.entries(methods).forEach(([methodName, methodFn]) => {
    if (typeof methodFn === 'function') {
      const methodString = methodFn.toString()
      findArrayMutationsInCode(methodString, mutationMetrics, 'method', methodName)
    }
  })
}

/**
 * Analyze setup function for array mutations
 * @param {Object} instance - Vue component instance
 * @param {Object} mutationMetrics - Mutation metrics object to populate
 */
function analyzeSetupFunction(instance, mutationMetrics) {
  const setupFn = getSetupFunction(instance)

  if (setupFn && typeof setupFn === 'function') {
    const setupString = setupFn.toString()
    findArrayMutationsInCode(setupString, mutationMetrics, 'setup', 'setup')
  }
}

/**
 * Analyze computed properties for array mutations
 * @param {Object} instance - Vue component instance
 * @param {Object} mutationMetrics - Mutation metrics object to populate
 */
function analyzeComputedProperties(instance, mutationMetrics) {
  const computed = instance?.type?.computed || {}

  Object.entries(computed).forEach(([computedName, computedDef]) => {
    let computedFn = computedDef

    // Handle computed property definition formats
    if (typeof computedDef === 'object' && computedDef.get) {
      computedFn = computedDef.get
    }

    if (typeof computedFn === 'function') {
      const computedString = computedFn.toString()
      const beforeCount = mutationMetrics.mutationCount
      findArrayMutationsInCode(computedString, mutationMetrics, 'computed', computedName)

      // If we found mutations in computed, mark as anti-pattern
      if (mutationMetrics.mutationCount > beforeCount) {
        mutationMetrics.antiPatterns.push({
          type: 'computed-mutations',
          computedName,
          severity: 'high',
          description: `Computed property '${computedName}' contains array mutations`
        })
      }
    }
  })
}

/**
 * Analyze watchers for array mutations
 * @param {Object} instance - Vue component instance
 * @param {Object} mutationMetrics - Mutation metrics object to populate
 */
function analyzeWatchers(instance, mutationMetrics) {
  const watch = instance?.type?.watch || {}

  Object.entries(watch).forEach(([watchKey, watchDef]) => {
    let watcherFn = watchDef

    // Handle watcher definition formats
    if (typeof watchDef === 'object' && watchDef.handler) {
      watcherFn = watchDef.handler
    }

    if (typeof watcherFn === 'function') {
      const watcherString = watcherFn.toString()
      findArrayMutationsInCode(watcherString, mutationMetrics, 'watcher', watchKey)
    }
  })
}

/**
 * Find array mutations in code string
 * @param {string} codeString - Code to analyze
 * @param {Object} mutationMetrics - Mutation metrics to populate
 * @param {string} source - Source type (method, setup, computed, watcher)
 * @param {string} sourceName - Name of the source
 */
function findArrayMutationsInCode(codeString, mutationMetrics, source, sourceName) {
  // Array mutation patterns
  const patterns = [
    { regex: /\w+\.push\s*\(/g, type: 'push', severity: 'medium' },
    { regex: /\w+\.pop\s*\(/g, type: 'pop', severity: 'medium' },
    { regex: /\w+\.shift\s*\(/g, type: 'shift', severity: 'medium' },
    { regex: /\w+\.unshift\s*\(/g, type: 'unshift', severity: 'medium' },
    { regex: /\w+\.splice\s*\(/g, type: 'splice', severity: 'high' },
    { regex: /\w+\.sort\s*\(/g, type: 'sort', severity: 'medium' },
    { regex: /\w+\.reverse\s*\(/g, type: 'reverse', severity: 'medium' },
    { regex: /\w+\[[\d\w]+\]\s*=/g, type: 'indexAssignment', severity: 'high' },
    { regex: /\w+\.length\s*=/g, type: 'lengthAssignment', severity: 'high' }
  ]

  patterns.forEach(({ regex, type, severity }) => {
    const matches = codeString.match(regex) || []
    matches.forEach(match => {
      mutationMetrics.mutationCount++
      mutationMetrics.mutativeOperations.push({
        mutationType: type,
        source,
        sourceName,
        context: match.trim(),
        severity
      })

      // Track reactivity issues for index/length assignments
      if (type === 'indexAssignment' || type === 'lengthAssignment') {
        mutationMetrics.reactivityIssues.push({
          type: `${type.replace('Assignment', '-assignment')}-reactivity`,
          source,
          sourceName,
          description: `${type} may not trigger reactivity updates in Vue`
        })
      }
    })
  })
}

/**
 * Analyze anti-patterns in mutations
 * @param {Object} mutationMetrics - Mutation metrics object
 */
function analyzeAntiPatterns(mutationMetrics) {
  // Check for excessive mutations on the same array
  const arrayMutationCounts = {}
  mutationMetrics.mutativeOperations.forEach(op => {
    const key = `${op.source}-${op.sourceName}`
    arrayMutationCounts[key] = (arrayMutationCounts[key] || 0) + 1
  })

  Object.entries(arrayMutationCounts).forEach(([key, count]) => {
    if (count >= 4) {
      mutationMetrics.antiPatterns.push({
        type: 'excessive-mutations',
        source: key,
        count,
        severity: 'high',
        description: `${count} mutations found in the same function/method`
      })
    }
  })
}

/**
 * Generate immutable alternatives for detected mutations
 * @param {Object} mutationMetrics - Mutation metrics object
 */
function generateImmutableAlternatives(mutationMetrics) {
  const alternatives = []

  mutationMetrics.mutativeOperations.forEach(op => {
    switch (op.mutationType) {
      case 'push':
        alternatives.push({
          original: op.context,
          suggestion: '[...items, newItem]',
          description: 'Use spread syntax to add items'
        })
        break
      case 'pop':
        alternatives.push({
          original: op.context,
          suggestion: 'items.slice(0, -1)',
          description: 'Use slice to remove last item'
        })
        break
      case 'splice':
        alternatives.push({
          original: op.context,
          suggestion: 'toSpliced()',
          description: 'Use toSpliced() for immutable splice operation'
        })
        break
      case 'sort':
        alternatives.push({
          original: op.context,
          suggestion: '[...items].sort()',
          description: 'Sort a copy of the array'
        })
        break
      case 'indexAssignment':
        alternatives.push({
          original: op.context,
          suggestion: 'items.with(index, newValue)',
          description: 'Use with() method for single item updates'
        })
        break
    }
  })

  mutationMetrics.immutableAlternatives = alternatives
}

/**
 * Calculate performance impact score
 * @param {Object} mutationMetrics - Mutation metrics object
 * @param {number} renderTime - Render time in milliseconds
 */
function calculatePerformanceImpact(mutationMetrics, renderTime) {
  let impact = 0

  mutationMetrics.mutativeOperations.forEach(op => {
    switch (op.mutationType) {
      case 'splice':
      case 'sort':
      case 'reverse':
        impact += 3 // High impact operations
        break
      case 'indexAssignment':
      case 'lengthAssignment':
        impact += 2 // Medium impact
        break
      default:
        impact += 1 // Low impact
    }
  })

  // Factor in render time
  if (renderTime >= 15) {
    impact += 2
  }

  mutationMetrics.performanceImpact = impact
}

/**
 * Determine if pattern should be reported
 * @param {Object} mutationMetrics - Mutation metrics object
 * @param {number} renderTime - Render time in milliseconds
 * @param {Object} snapshot - Component snapshot data
 * @returns {Object} Detection decision
 */
function shouldReportPattern(mutationMetrics, renderTime, snapshot) {
  if (mutationMetrics.mutationCount === 0) {
    return { detected: false }
  }

  const reasons = []
  const unnecessaryPercent = snapshot?.unnecessaryRenderPercent || 0

  // Build reason string
  if (mutationMetrics.mutationCount > 0) {
    reasons.push(`${mutationMetrics.mutationCount} array mutations detected`)
  }

  if (mutationMetrics.antiPatterns.length > 0) {
    reasons.push('anti-patterns detected')
  }

  if (mutationMetrics.performanceImpact > 5) {
    reasons.push('moderate performance impact')
  }

  if (unnecessaryPercent > 50) {
    reasons.push(`${unnecessaryPercent}% unnecessary renders`)
  }

  // Determine severity
  let severity = 'medium'
  let detectionMethod = 'mutation-analysis'

  if (
    mutationMetrics.antiPatterns.some(p => p.type === 'computed-mutations') ||
    mutationMetrics.mutationCount >= 4 ||
    renderTime >= 15
  ) {
    severity = 'high'
    // For high severity, choose detection method based on primary issue
    if (
      mutationMetrics.antiPatterns.some(p => p.type === 'computed-mutations') &&
      renderTime >= 15
    ) {
      detectionMethod = 'performance-analysis'
    } else {
      detectionMethod = 'reactivity-analysis'
    }
  }

  return {
    detected: true,
    reason: reasons.join(', '),
    severity,
    detectionMethod,
    suggestion:
      severity === 'high'
        ? 'Critical: Use immutable array operations to prevent reactivity issues and improve performance'
        : 'Use immutable array updates to ensure reactivity works correctly'
  }
}

/**
 * Generate comprehensive code fixes
 * @param {Object} mutationMetrics - Mutation metrics object
 * @param {Object} instance - Vue component instance
 * @returns {string} Generated fix code
 */
function generateCodeFixes(mutationMetrics, instance) {
  const fixes = []

  // Basic array mutation fixes
  fixes.push('❌ Bad: Direct array mutations')
  fixes.push('✅ Good: Immutable updates')
  fixes.push('[...items.value, 4]')
  fixes.push('filter((_, i) => i !== 1)')

  // Index assignment fixes
  if (
    mutationMetrics.reactivityIssues.some(issue => issue.type === 'index-assignment-reactivity')
  ) {
    fixes.push('Fix index assignment reactivity issues')
    fixes.push('array.with()')
    fixes.push('Spread syntax')
    fixes.push('Array.from with mapping')
  }

  // Excessive mutations fixes
  if (mutationMetrics.antiPatterns.some(p => p.type === 'excessive-mutations')) {
    fixes.push('Fix excessive mutations with batch updates')
    fixes.push('Single batch update')
    fixes.push('[...items.value, ...newItems]')
  }

  // Computed mutations fixes
  if (mutationMetrics.antiPatterns.some(p => p.type === 'computed-mutations')) {
    fixes.push('Fix mutations in computed properties')
    fixes.push('Pure computed with immutable operations')
    fixes.push('reactive transforms')
  }

  // Vue 3 best practices
  fixes.push('Vue 3 array reactivity best practices')
  fixes.push('Always use immutable array methods')
  fixes.push('array.with() for single item updates')
  fixes.push('Consider using Pinia')

  // Performance optimizations
  fixes.push('Performance optimization for large arrays')
  fixes.push('shallowRef')
  fixes.push('triggerRef')

  return fixes.join('\n')
}

// Pattern metadata for integration with main patterns object
export const metadata = {
  reason: 'Direct array mutation detected',
  suggestion: 'Use immutable array updates to ensure reactivity works correctly.',
  example: {
    bad: `
// ❌ Direct array mutations
import { ref } from 'vue'

const items = ref([...])

// These mutations might not trigger updates
items.value.push(newItem)
items.value.sort()
items.value[0] = updatedItem
items.value.splice(1, 1)
    `,
    good: `
// ✅ Immutable array updates
import { ref } from 'vue'

const items = ref([...])

// Create new array references
items.value = [...items.value, newItem]
items.value = [...items.value].sort()
items.value = items.value.map((item, i) => 
  i === 0 ? updatedItem : item
)
items.value = items.value.filter((_, i) => i !== 1)

// Or use array methods that Vue tracks
items.value.push(newItem) // Vue 3 tracks this
    `
  }
}

// Simple detection function for basic pattern object
export const simpleDetect = (instance, snapshot) => {
  // Check if arrays are being mutated directly from props diff
  const hasArrayMutations = snapshot?.propsDiff?.changed || {}
  return Object.values(hasArrayMutations).some(
    change =>
      Array.isArray(change.from) &&
      Array.isArray(change.to) &&
      change.from.length === change.to.length &&
      change.sameReference // Same array reference means mutation
  )
}

// Main pattern export
export default {
  detect,
  ...metadata
}
