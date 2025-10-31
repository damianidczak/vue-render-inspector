/**
 * Missing v-memo Pattern Detection
 * Detects expensive components that could benefit from v-memo optimization
 */

import {
  getTemplateString,
  findTemplateMatches,
  isSlowRender,
  createPatternResult
} from '../helpers/detection-utils.js'

import { generateVMemoFix } from '../helpers/code-generation.js'

/**
 * Main pattern detection for missing v-memo opportunities
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Detection result
 */
export function detect(instance, snapshot, renderTime) {
  const result = createPatternResult({
    detectionMethod: '',
    complexityMetrics: {},
    codeGeneration: null
  })

  const metrics = {
    renderTime,
    componentComplexity: 0,
    hasExpensiveChildren: false,
    hasLists: false,
    hasComputedProps: false,
    hasMethodCalls: false,
    unnecessaryRenderPercent: snapshot?.unnecessaryRenderPercent || 0,
    renderFrequency: snapshot?.renderFrequency || 0,
    isInList: false,
    hasMemo: false
  }

  // Method 1: Template analysis for v-memo opportunities
  const template = getTemplateString(instance)
  let templateAnalysis = null
  if (template) {
    templateAnalysis = analyzeTemplateForVMemo(template)
    metrics.hasLists = templateAnalysis.hasLists
    metrics.hasMethodCalls = templateAnalysis.hasMethodCalls
    metrics.hasMemo = templateAnalysis.hasMemo
    metrics.componentComplexity += templateAnalysis.complexityScore
  }

  // Method 2: Component context analysis
  const contextAnalysis = analyzeComponentContextForVMemo(snapshot, instance)
  metrics.isInList = contextAnalysis.isInList
  metrics.hasExpensiveChildren = contextAnalysis.hasExpensiveChildren
  metrics.hasComputedProps = contextAnalysis.hasComputedProps
  metrics.componentComplexity += contextAnalysis.complexityScore

  // Method 3: Performance pattern analysis
  const performanceAnalysis = analyzePerformanceForVMemo(metrics, renderTime)

  // Detect v-memo opportunities
  if (performanceAnalysis.shouldUseMemo) {
    result.detected = true
    result.complexityMetrics = metrics
    result.detectionMethod = performanceAnalysis.detectionMethod
    result.severity = performanceAnalysis.severity
    result.reason = performanceAnalysis.reason
    result.suggestion = performanceAnalysis.suggestion
    result.codeGeneration = generateVMemoCodeFix(metrics, templateAnalysis)
  }

  return result
}

/**
 * Analyze template for v-memo opportunities
 * @param {string} template - Component template string
 * @returns {Object} Analysis result
 */
function analyzeTemplateForVMemo(template) {
  const result = {
    hasLists: false,
    hasMethodCalls: false,
    hasMemo: false,
    complexityScore: 0,
    listElements: [],
    expensivePatterns: []
  }

  // Check if already has v-memo
  result.hasMemo = /v-memo\s*=/.test(template)
  if (result.hasMemo) {
    return result // Already optimized
  }

  // Look for v-for loops (potential v-memo candidates)
  const vForMatches = findTemplateMatches(template, /v-for\s*=\s*["'][^"']*["'][^>]*>/g)
  result.hasLists = vForMatches.length > 0
  result.complexityScore += vForMatches.length * 2

  vForMatches.forEach(match => {
    // Analyze complexity of v-for elements
    const elementContext = extractVForElementContext(template, match)
    result.listElements.push(elementContext)
    result.complexityScore += elementContext.complexityScore
  })

  // Look for expensive patterns that benefit from v-memo
  const expensivePatterns = [
    { pattern: /{{[^}]*\w+\([^)]*\)[^}]*}}/g, name: 'methodCalls', score: 3 },
    { pattern: /<component[^>]*:is\s*=/g, name: 'dynamicComponents', score: 4 },
    { pattern: /v-html\s*=/g, name: 'vHtml', score: 2 },
    { pattern: /:class\s*=\s*["'][^"']*\{[^}]*\}[^"']*["']/g, name: 'complexClass', score: 1 },
    { pattern: /:style\s*=\s*["'][^"']*\{[^}]*\}[^"']*["']/g, name: 'complexStyle', score: 1 },
    { pattern: /v-if\s*=\s*["'][^"']*&&[^"']*["']/g, name: 'complexConditions', score: 1 }
  ]

  expensivePatterns.forEach(({ pattern, name, score }) => {
    const matches = findTemplateMatches(template, pattern)
    if (matches.length > 0) {
      result.expensivePatterns.push({ name, count: matches.length })
      result.complexityScore += matches.length * score
      if (name === 'methodCalls') result.hasMethodCalls = true
    }
  })

  return result
}

/**
 * Extract context information for v-for elements
 * @param {string} template - Template string
 * @param {string} vForMatch - v-for match string
 * @returns {Object} Element context
 */
function extractVForElementContext(template, vForMatch) {
  const matchIndex = template.indexOf(vForMatch)
  const elementStart = template.lastIndexOf('<', matchIndex)
  const elementEnd = template.indexOf('>', matchIndex) + 1
  const elementHTML = template.substring(elementStart, elementEnd)

  // Extract element tag
  const tagMatch = elementHTML.match(/<(\w+)/)
  const tag = tagMatch ? tagMatch[1] : 'unknown'

  // Calculate complexity based on attributes and content
  let complexityScore = 1 // Base score

  // Count attributes
  const attrCount = (elementHTML.match(/\s+[\w:-]+\s*=/g) || []).length
  complexityScore += Math.floor(attrCount / 2)

  // Check for expensive attributes
  if (/:class\s*=/.test(elementHTML)) complexityScore += 1
  if (/:style\s*=/.test(elementHTML)) complexityScore += 1
  if (/@\w+/.test(elementHTML)) complexityScore += 1
  if (/:[\w-]+/.test(elementHTML)) complexityScore += 1

  // Check for transitions
  const hasTransition = /transition/i.test(elementHTML)
  if (hasTransition) complexityScore += 2

  return {
    tag,
    complexityScore,
    hasTransition,
    attributeCount: attrCount,
    hasEvents: /@\w+/.test(elementHTML),
    hasDynamicAttrs: /:[\w-]+/.test(elementHTML)
  }
}

/**
 * Analyze component context for v-memo opportunities
 * @param {Object} snapshot - Component snapshot data
 * @param {Object} instance - Vue component instance
 * @returns {Object} Analysis result
 */
function analyzeComponentContextForVMemo(snapshot, instance) {
  const result = {
    isInList: false,
    hasExpensiveChildren: false,
    hasComputedProps: false,
    complexityScore: 0
  }

  // Check if component is in a list context
  result.isInList =
    snapshot?.componentName &&
    (/Item|Row|Card|Element|Entry/i.test(snapshot.componentName) ||
      snapshot.reason?.includes('parent') ||
      snapshot.triggerMechanism === 'parent-rerender')

  if (result.isInList) {
    result.complexityScore += 2
  }

  // Analyze props complexity
  if (snapshot?.props) {
    const propCount = Object.keys(snapshot.props).length
    result.complexityScore += Math.floor(propCount / 3)

    // Check for complex prop types
    Object.values(snapshot.props).forEach(value => {
      if (Array.isArray(value) && value.length > 10) {
        result.complexityScore += 2
      } else if (typeof value === 'object' && value && Object.keys(value).length > 5) {
        result.complexityScore += 1
      }
    })
  }

  // Check for computed properties (would benefit from v-memo)
  if (instance?.type?.computed) {
    result.hasComputedProps = Object.keys(instance.type.computed).length > 0
    result.complexityScore += Object.keys(instance.type.computed).length
  }

  // Check for expensive children
  if (instance?.subTree?.children?.length > 5) {
    result.hasExpensiveChildren = true
    result.complexityScore += 2
  }

  return result
}

/**
 * Analyze performance patterns for v-memo recommendations
 * @param {Object} metrics - Component metrics
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Analysis result
 */
function analyzePerformanceForVMemo(metrics, renderTime) {
  const result = {
    shouldUseMemo: false,
    detectionMethod: '',
    severity: 'medium',
    reason: '',
    suggestion: ''
  }

  // Scoring system for v-memo recommendation
  let score = 0
  const reasons = []

  // Performance-based scoring
  if (isSlowRender(renderTime, 16)) {
    score += 4
    reasons.push(`slow render (${renderTime.toFixed(1)}ms)`)
  } else if (isSlowRender(renderTime, 10)) {
    score += 2
    reasons.push(`moderate render time (${renderTime.toFixed(1)}ms)`)
  }

  // Unnecessary render frequency
  if (metrics.unnecessaryRenderPercent > 50) {
    score += 3
    reasons.push(`${metrics.unnecessaryRenderPercent.toFixed(0)}% unnecessary renders`)
  } else if (metrics.unnecessaryRenderPercent > 25) {
    score += 1
    reasons.push(`${metrics.unnecessaryRenderPercent.toFixed(0)}% unnecessary renders`)
  }

  // Render frequency
  if (metrics.renderFrequency > 30) {
    score += 2
    reasons.push(`high render frequency (${metrics.renderFrequency.toFixed(0)}/min)`)
  }

  // Component complexity
  if (metrics.componentComplexity > 8) {
    score += 3
    reasons.push('high component complexity')
  } else if (metrics.componentComplexity > 4) {
    score += 1
    reasons.push('moderate component complexity')
  }

  // Context-based scoring
  if (metrics.isInList && metrics.hasLists) {
    score += 2
    reasons.push('list item with nested lists')
  } else if (metrics.isInList) {
    score += 1
    reasons.push('list item component')
  }

  if (metrics.hasMethodCalls) {
    score += 2
    reasons.push('template method calls')
  }

  if (metrics.hasExpensiveChildren) {
    score += 1
    reasons.push('expensive child components')
  }

  // Determine if v-memo should be recommended
  if (score >= 4 && !metrics.hasMemo) {
    result.shouldUseMemo = true
    result.reason = `Component would benefit from v-memo: ${reasons.join(', ')}`

    // Determine detection method and severity
    if (isSlowRender(renderTime, 16) || metrics.unnecessaryRenderPercent > 60) {
      result.detectionMethod = 'performance-critical'
      result.severity = 'high'
      result.suggestion =
        'Critical: Use v-memo to prevent expensive re-renders. Focus on frequently changing dependencies.'
    } else if (metrics.isInList && score >= 6) {
      result.detectionMethod = 'list-optimization'
      result.severity = 'medium'
      result.suggestion =
        'Use v-memo for list items to optimize parent re-renders. Include item-specific dependencies.'
    } else {
      result.detectionMethod = 'complexity-based'
      result.severity = 'medium'
      result.suggestion =
        'Consider v-memo to optimize complex component re-renders based on specific dependencies.'
    }
  }

  return result
}

/**
 * Generate v-memo implementation code
 * @param {Object} metrics - Component metrics
 * @param {Object} templateAnalysis - Template analysis results
 * @returns {string} Generated fix code
 */
function generateVMemoCodeFix(metrics, templateAnalysis) {
  let fix = generateVMemoFix('ExpensiveComponent')

  // Add specific examples based on detected patterns
  if (metrics.isInList) {
    fix += `\n\n${`
// For list items, use item-specific dependencies:
<template>
  <div v-for="item in items" :key="item.id"
       v-memo="[item.lastModified, item.status, item.isSelected]">
    <!-- Component content -->
    <ExpensiveChild :item="item" />
  </div>
</template>

// Tips for list items:
// - Include properties that determine visual changes
// - Avoid parent state in v-memo dependencies
// - Use computed properties for complex dependencies
    `.trim()}`
  }

  if (metrics.hasMethodCalls || metrics.componentComplexity > 6) {
    fix += `\n\n${`
// For complex components with method calls:
<template>
  <div v-memo="[criticalProp1, criticalProp2, localState]">
    <!-- Expensive content with method calls -->
    <p>{{ expensiveCalculation(data) }}</p>
    <ChildComponent :config="complexConfig" />
  </div>
</template>

<script setup>
// Convert expensive calculations to computed properties
const computedResult = computed(() => expensiveCalculation(data.value))

// Use minimal dependencies in v-memo
// Only include props/state that affect the visual output
</script>
    `.trim()}`
  }

  if (templateAnalysis?.hasLists && templateAnalysis.listElements?.length > 0) {
    fix += `\n\n${`
// For nested lists, consider v-memo on outer elements:
<template>
  <section v-memo="[section.id, section.lastUpdate]">
    <h3>{{ section.title }}</h3>
    <div v-for="item in section.items" :key="item.id"
         v-memo="[item.modified, item.visible]">
      {{ item.content }}
    </div>
  </section>
</template>
    `.trim()}`
  }

  fix += `\n\n${`
// v-memo best practices:
// 1. Use primitive values when possible
// 2. Keep dependency arrays short (2-4 items ideal)
// 3. Avoid objects/arrays as dependencies
// 4. Test performance impact - v-memo has overhead
// 5. Consider computed properties for complex logic
  `.trim()}`

  return fix
}

// Pattern metadata for integration with main patterns object
export const metadata = {
  reason: 'Expensive component without v-memo',
  suggestion: "Use v-memo directive to skip re-renders when specific values haven't changed.",
  example: {
    bad: `
<!-- ❌ Expensive list without optimization -->
<template>
  <ExpensiveComponent 
    v-for="item in items" 
    :key="item.id"
    :item="item"
    @update="handleUpdate"
  />
</template>
    `,
    good: `
<!-- ✅ Using v-memo for performance -->
<template>
  <ExpensiveComponent 
    v-for="item in items" 
    :key="item.id"
    :item="item"
    @update="handleUpdate"
    v-memo="[item.lastModified, item.status]"
  />
</template>

<script setup>
// Component only re-renders when lastModified or status changes
// Even if parent re-renders or other items change
</script>
    `
  }
}

// Simple detection function for basic pattern object
export const simpleDetect = (instance, renderTime) => {
  // Check if component has expensive children without v-memo
  const hasExpensiveChildren = instance.$.subTree?.children?.some(
    child => child.type?.name && renderTime > 5
  )
  const template = getTemplateString(instance)
  const hasVMemo = template.includes('v-memo')

  return hasExpensiveChildren && !hasVMemo && renderTime > 10
}

// Main pattern export
export default {
  detect,
  ...metadata
}
