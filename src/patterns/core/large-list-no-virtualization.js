/**
 * Large List No Virtualization Pattern Detection
 * Detects large lists without virtual scrolling that cause performance issues
 */

import {
  getTemplateString,
  findTemplateMatches,
  createPatternResult,
  isSlowRender,
  hasUnnecessaryRenders
} from '../helpers/detection-utils.js'

import { generateVirtualListFix } from '../helpers/code-generation.js'

/**
 * Main pattern detection for large lists without virtualization
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Detection result
 */
export function detect(instance, snapshot, renderTime) {
  const result = createPatternResult({
    detectionMethod: '',
    listMetrics: {
      vForLoops: [],
      estimatedItemCount: 0,
      hasVirtualization: false,
      listComplexity: 0,
      performanceImpact: 0,
      virtualizationLibraries: []
    },
    codeGeneration: ''
  })

  const listMetrics = result.listMetrics

  // Method 1: Analyze template for v-for loops
  const templateAnalysis = analyzeTemplateForLists(instance)
  if (templateAnalysis.detected) {
    listMetrics.vForLoops = templateAnalysis.vForLoops
    listMetrics.hasVirtualization = templateAnalysis.hasVirtualization
    listMetrics.virtualizationLibraries = templateAnalysis.virtualizationLibraries
  }

  // Method 2: Estimate item count from snapshot data
  const snapshotAnalysis = analyzeSnapshotForListSize(snapshot)
  if (snapshotAnalysis.detected) {
    listMetrics.estimatedItemCount = Math.max(
      listMetrics.estimatedItemCount,
      snapshotAnalysis.itemCount
    )
  }

  // Method 3: Analyze component props for large arrays
  const propsAnalysis = analyzePropsForLargeArrays(instance)
  if (propsAnalysis.detected) {
    listMetrics.estimatedItemCount = Math.max(
      listMetrics.estimatedItemCount,
      propsAnalysis.largestArraySize
    )
  }

  // Method 4: Performance correlation analysis
  const performanceAnalysis = analyzePerformanceCorrelation(renderTime, listMetrics)
  listMetrics.performanceImpact = performanceAnalysis.impact
  listMetrics.listComplexity = calculateListComplexity(listMetrics)

  // Determine if pattern should be reported
  const shouldReport = determineShouldReportVirtualization(listMetrics, renderTime, snapshot)

  if (shouldReport.detected) {
    result.detected = true
    result.reason = shouldReport.reason
    result.severity = shouldReport.severity
    result.detectionMethod = shouldReport.detectionMethod
    result.suggestion = shouldReport.suggestion
    result.codeGeneration = generateVirtualListCodeFix(listMetrics, snapshot)
  }

  return result
}

/**
 * Analyze template for v-for loops and virtualization
 * @param {Object} instance - Vue component instance
 * @returns {Object} Analysis result
 */
function analyzeTemplateForLists(instance) {
  const result = {
    detected: false,
    vForLoops: [],
    hasVirtualization: false,
    virtualizationLibraries: []
  }

  const template = getTemplateString(instance)
  if (!template) return result

  // Find v-for loops
  const vForMatches = findTemplateMatches(template, /v-for\s*=\s*["'][^"']*["']/g)

  if (vForMatches.length > 0) {
    result.detected = true

    vForMatches.forEach((match, index) => {
      const vForAnalysis = analyzeVForLoop(match, template, index)
      result.vForLoops.push(vForAnalysis)
    })
  }

  // Check for virtualization libraries
  const virtualizationPatterns = [
    { pattern: /virtual-list/gi, library: 'vue-virtual-scroller' },
    { pattern: /VirtualList/g, library: '@tanstack/vue-virtual' },
    { pattern: /RecycleScroller/g, library: 'vue-virtual-scroller' },
    { pattern: /DynamicScroller/g, library: 'vue-virtual-scroller' },
    { pattern: /FixedSizeList/g, library: 'react-window (adapted)' },
    { pattern: /WindowedList/g, library: 'vue-virtual-scrolling' }
  ]

  virtualizationPatterns.forEach(({ pattern, library }) => {
    if (pattern.test(template)) {
      result.hasVirtualization = true
      result.virtualizationLibraries.push(library)
    }
  })

  return result
}

/**
 * Analyze individual v-for loop
 * @param {string} vForMatch - v-for match string
 * @param {string} template - Full template string
 * @param {number} index - Loop index
 * @returns {Object} v-for analysis
 */
function analyzeVForLoop(vForMatch, template, _index) {
  const analysis = {
    match: vForMatch.trim(),
    loopVariable: 'unknown',
    iterableSource: 'unknown',
    complexity: 1,
    hasNestedLoops: false,
    estimatedNesting: 1,
    hasComplexContent: false
  }

  // Extract loop variable and source
  const vForContent = vForMatch.match(/v-for\s*=\s*["']([^"']*)["']/)?.[1] || ''
  const parts = vForContent.split(' in ')

  if (parts.length === 2) {
    analysis.loopVariable = parts[0].trim()
    analysis.iterableSource = parts[1].trim()
  }

  // Find the element this v-for is on
  const matchIndex = template.indexOf(vForMatch)
  const elementStart = template.lastIndexOf('<', matchIndex)
  const elementEnd = template.indexOf('>', matchIndex)

  if (elementStart !== -1 && elementEnd !== -1) {
    const elementTag = template.slice(elementStart, elementEnd + 1)

    // Look for nested content complexity
    const closingTagPattern = new RegExp(`</${elementTag.match(/<(\w+)/)?.[1]}>`)
    const closingTagIndex = template.indexOf(closingTagPattern, elementEnd)

    if (closingTagIndex !== -1) {
      const elementContent = template.slice(elementEnd + 1, closingTagIndex)

      // Check for nested v-for
      const nestedVFor = /v-for/g
      const nestedMatches = elementContent.match(nestedVFor) || []
      analysis.hasNestedLoops = nestedMatches.length > 0
      analysis.estimatedNesting += nestedMatches.length

      // Check for complex content
      const complexityIndicators = [
        /v-if/g,
        /v-show/g,
        /{{.*}}/g,
        /<\w+/g // nested elements
      ]

      complexityIndicators.forEach(pattern => {
        const matches = elementContent.match(pattern) || []
        analysis.complexity += matches.length
      })

      analysis.hasComplexContent = analysis.complexity > 3
    }
  }

  return analysis
}

/**
 * Analyze snapshot data for list size indicators
 * @param {Object} snapshot - Component snapshot data
 * @returns {Object} Analysis result
 */
function analyzeSnapshotForListSize(snapshot) {
  const result = {
    detected: false,
    itemCount: 0
  }

  // Check snapshot lists data
  if (snapshot?.lists?.maxSize) {
    result.detected = true
    result.itemCount = snapshot.lists.maxSize
  }

  // Check for props changes indicating large arrays
  const propsDiff = snapshot?.propsDiff?.changed || {}

  Object.values(propsDiff).forEach(change => {
    if (Array.isArray(change.to) && change.to.length > result.itemCount) {
      result.detected = true
      result.itemCount = change.to.length
    }
  })

  return result
}

/**
 * Analyze component props for large arrays
 * @param {Object} instance - Vue component instance
 * @returns {Object} Analysis result
 */
function analyzePropsForLargeArrays(instance) {
  const result = {
    detected: false,
    largestArraySize: 0,
    arrayProps: []
  }

  const props = instance?.props || {}

  Object.entries(props).forEach(([propName, propValue]) => {
    if (Array.isArray(propValue)) {
      result.detected = true
      result.arrayProps.push({
        name: propName,
        size: propValue.length
      })

      if (propValue.length > result.largestArraySize) {
        result.largestArraySize = propValue.length
      }
    }
  })

  return result
}

/**
 * Analyze performance correlation with large lists
 * @param {number} renderTime - Render time in milliseconds
 * @param {Object} listMetrics - List metrics
 * @returns {Object} Performance analysis
 */
function analyzePerformanceCorrelation(renderTime, listMetrics) {
  let impact = 0

  // Base impact from list size
  if (listMetrics.estimatedItemCount > 1000) {
    impact += 5
  } else if (listMetrics.estimatedItemCount > 500) {
    impact += 3
  } else if (listMetrics.estimatedItemCount > 100) {
    impact += 2
  }

  // Impact from list complexity
  listMetrics.vForLoops.forEach(loop => {
    impact += loop.complexity * 0.5
    if (loop.hasNestedLoops) {
      impact += loop.estimatedNesting
    }
  })

  // Impact from slow renders
  if (isSlowRender(renderTime, 20)) {
    impact += 2
  }

  return { impact }
}

/**
 * Calculate overall list complexity score
 * @param {Object} listMetrics - List metrics
 * @returns {number} Complexity score
 */
function calculateListComplexity(listMetrics) {
  let complexity = 0

  // Base complexity from item count
  complexity += Math.log10(Math.max(listMetrics.estimatedItemCount, 1))

  // Complexity from v-for loops
  listMetrics.vForLoops.forEach(loop => {
    complexity += loop.complexity
    if (loop.hasNestedLoops) {
      complexity += loop.estimatedNesting * 2
    }
  })

  // Reduce complexity if virtualization is already present
  if (listMetrics.hasVirtualization) {
    complexity *= 0.3
  }

  return Math.round(complexity * 10) / 10
}

/**
 * Determine if large list virtualization should be reported
 * @param {Object} listMetrics - List analysis metrics
 * @param {number} renderTime - Render time in milliseconds
 * @param {Object} snapshot - Component snapshot data
 * @returns {Object} Reporting decision
 */
function determineShouldReportVirtualization(listMetrics, renderTime, snapshot) {
  const result = {
    detected: false,
    reason: '',
    severity: 'medium',
    detectionMethod: '',
    suggestion: ''
  }

  const reasons = []
  let score = 0

  // Score based on list size
  if (listMetrics.estimatedItemCount > 1000) {
    score += 4
    reasons.push(`${listMetrics.estimatedItemCount} items without virtualization`)
  } else if (listMetrics.estimatedItemCount > 500) {
    score += 3
    reasons.push(`${listMetrics.estimatedItemCount} items without virtualization`)
  } else if (listMetrics.estimatedItemCount > 100) {
    score += 2
    reasons.push(`${listMetrics.estimatedItemCount} items without virtualization`)
  }

  // Score based on v-for complexity
  if (listMetrics.vForLoops.length > 0 && !listMetrics.hasVirtualization) {
    score += 1
    reasons.push(`${listMetrics.vForLoops.length} unvirtualized list(s)`)
  }

  // Score based on nested loops
  const hasNestedLoops = listMetrics.vForLoops.some(loop => loop.hasNestedLoops)
  if (hasNestedLoops) {
    score += 2
    reasons.push('nested v-for loops detected')
  }

  // Score based on performance correlation
  if (isSlowRender(renderTime, 20) && listMetrics.vForLoops.length > 0) {
    score += 2
    reasons.push(`slow renders (${renderTime.toFixed(1)}ms) with large lists`)
  }

  // Score based on unnecessary renders
  if (hasUnnecessaryRenders(snapshot) && listMetrics.estimatedItemCount > 100) {
    score += 1
    reasons.push('unnecessary renders with large lists')
  }

  // Reduce score if virtualization already present
  if (listMetrics.hasVirtualization) {
    score = Math.max(0, score - 3)
  }

  // Detection threshold
  if (score >= 3) {
    result.detected = true
    result.reason = `Large list performance issues: ${reasons.join(', ')}`

    // Determine severity and suggestion
    if (listMetrics.estimatedItemCount > 1000 || hasNestedLoops) {
      result.severity = 'high'
      result.detectionMethod = 'performance-critical'
      result.suggestion =
        'Critical: Large lists without virtualization cause severe performance issues. Implement virtual scrolling immediately for lists with 1000+ items.'
    } else if (listMetrics.estimatedItemCount > 500 || isSlowRender(renderTime, 20)) {
      result.severity = 'high'
      result.detectionMethod = 'performance-correlation'
      result.suggestion =
        'High: Large lists detected with performance impact. Implement virtual scrolling to render only visible items.'
    } else if (listMetrics.estimatedItemCount > 100) {
      result.severity = 'medium'
      result.detectionMethod = 'list-analysis'
      result.suggestion =
        'Consider virtual scrolling for lists with 100+ items to improve performance and user experience.'
    } else {
      result.severity = 'medium'
      result.detectionMethod = 'pattern-analysis'
      result.suggestion =
        'Large list patterns detected. Consider implementing virtual scrolling for better performance.'
    }
  }

  return result
}

/**
 * Generate virtual list optimization code
 * @param {Object} listMetrics - List analysis metrics
 * @param {Object} snapshot - Component snapshot data
 * @returns {string} Generated fix code
 */
function generateVirtualListCodeFix(listMetrics, snapshot) {
  let fix = generateVirtualListFix(listMetrics.estimatedItemCount)

  // Add specific examples based on detected patterns
  const hasNestedLoops = listMetrics.vForLoops.some(loop => loop.hasNestedLoops)
  if (hasNestedLoops) {
    fix += `\n\n${`
// ⚠️ CRITICAL: Nested v-for loops detected!

❌ Bad: Nested loops create exponential DOM nodes
<template>
  <div v-for="category in categories" :key="category.id">
    <h3>{{ category.name }}</h3>
    <div v-for="item in category.items" :key="item.id">
      {{ item.name }}
    </div>
  </div>
</template>

✅ Good: Flatten data structure and use virtual scrolling
<template>
  <VirtualList 
    :items="flattenedItems" 
    :item-height="50"
    :overscan="10">
    <template #default="{ item }">
      <div v-if="item.type === 'category'" class="category-header">
        {{ item.name }}
      </div>
      <div v-else class="list-item">
        {{ item.name }}
      </div>
    </template>
  </VirtualList>
</template>

<script setup>
import { computed } from 'vue'
import { VirtualList } from '@tanstack/vue-virtual'

const flattenedItems = computed(() => {
  const result = []
  categories.value.forEach(category => {
    result.push({ ...category, type: 'category' })
    result.push(...category.items.map(item => ({ ...item, type: 'item' })))
  })
  return result
})
</script>
    `.trim()}`
  }

  const hasComplexItems = listMetrics.vForLoops.some(loop => loop.hasComplexContent)
  if (hasComplexItems) {
    fix += `\n\n${`
// Complex list items optimization:

❌ Bad: Complex content without optimization
<template>
  <div v-for="item in items" :key="item.id" class="complex-item">
    <img :src="item.image" alt="item.name">
    <div class="content">
      <h3>{{ item.title }}</h3>
      <p>{{ item.description }}</p>
      <div v-for="tag in item.tags" :key="tag" class="tag">
        {{ tag }}
      </div>
    </div>
  </div>
</template>

✅ Good: Virtual scrolling with component optimization
<template>
  <VirtualList 
    :items="items" 
    :item-height="120"
    :overscan="5">
    <template #default="{ item }">
      <ComplexListItem 
        :item="item" 
        v-memo="[item.id, item.lastModified]"
      />
    </template>
  </VirtualList>
</template>

<script setup>
import { VirtualList } from '@tanstack/vue-virtual'
import ComplexListItem from './ComplexListItem.vue'

// ComplexListItem.vue uses v-memo to prevent unnecessary re-renders
// Only updates when item.id or item.lastModified changes
</script>
    `.trim()}`
  }

  return fix
}

// Pattern metadata for integration with main patterns object
export const metadata = {
  reason: 'Large list without virtualization',
  suggestion: 'Use virtual scrolling for lists with 100+ items to render only visible elements.',
  packages: ['@tanstack/vue-virtual', 'vue-virtual-scroller'],
  example: {
    bad: `
<!-- ❌ Rendering 1000+ items in DOM -->
<template>
  <div class="list-container">
    <div v-for="item in thousandsOfItems" 
         :key="item.id"
         class="list-item">
      {{ item.name }}
    </div>
  </div>
</template>
    `,
    good: `
<!-- ✅ Virtual scrolling (only renders visible) -->
<template>
  <VirtualList 
    :items="thousandsOfItems" 
    :item-height="50"
    :overscan="5">
    <template #default="{ item, index }">
      <div class="list-item">{{ item.name }}</div>
    </template>
  </VirtualList>
</template>

<script setup>
import { VirtualList } from '@tanstack/vue-virtual'
// Only ~20 DOM nodes for 10,000 items!
</script>
    `
  }
}

// Simple detection function for basic pattern object
export const simpleDetect = (instance, snapshot) => {
  // Check for large v-for without virtual scrolling
  const template = instance.$?.type?.template || ''
  const hasVFor = template.includes('v-for')
  const itemCount = snapshot?.lists?.maxSize || 0

  return hasVFor && itemCount > 100 && !template.includes('virtual-list')
}

// Main pattern export
export default {
  detect: simpleDetect,
  ...metadata
}
