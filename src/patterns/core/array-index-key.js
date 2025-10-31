/**
 * Array Index Key Pattern Detection
 * Detects usage of array indices as v-for keys, which causes performance issues
 */

import {
  getTemplateString,
  findTemplateMatches,
  isSlowRender,
  createPatternResult
} from '../helpers/detection-utils.js'

import { generateArrayKeyFix } from '../helpers/code-generation.js'

/**
 * Main pattern detection for array index keys
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Detection result
 */
export function detect(instance, snapshot, renderTime) {
  const result = createPatternResult({
    detectionMethod: '',
    affectedElements: [],
    codeGeneration: ''
  })

  // Method 1: Template analysis (primary detection)
  const templateAnalysis = analyzeTemplateForIndexKeys(instance)

  // Method 2: Heuristic analysis for non-template cases
  const heuristicAnalysis = analyzeComponentForIndexKeyHeuristics(instance, snapshot)

  // Method 3: Performance analysis
  const performanceAnalysis = analyzePerformanceForIndexKeys(snapshot, renderTime)

  // Combine analysis results with priority: template > heuristic > performance
  let allElements = []

  if (templateAnalysis.elements.length > 0) {
    // Template analysis found evidence - use only template elements
    allElements = [...templateAnalysis.elements]
  } else if (heuristicAnalysis.elements.length > 0) {
    // No template evidence, use heuristic elements
    allElements = [...heuristicAnalysis.elements]
  } else {
    // No template or heuristic evidence, use performance elements
    allElements = [...performanceAnalysis.elements]
  }

  if (allElements.length > 0) {
    result.detected = true
    result.affectedElements = allElements

    // Determine detection method based on primary source
    if (templateAnalysis.elements.length > 0) {
      result.detectionMethod = 'template-analysis'
      result.reason = 'Template uses array indices as keys'
    } else if (heuristicAnalysis.elements.length > 0) {
      result.detectionMethod = 'heuristic-analysis'
      const element = heuristicAnalysis.elements[0]
      const componentName = element.context?.componentName || 'Component'
      const unnecessaryPercent = element.context?.unnecessaryRenderPercent || 0

      if (element.pattern === 'heuristic-array-props') {
        result.reason = `${componentName} component with array props has ${unnecessaryPercent}% unnecessary renders`
      } else {
        result.reason = `${componentName} component has ${unnecessaryPercent}% unnecessary renders, suggesting index key issues`
      }
    } else {
      result.detectionMethod = 'performance-analysis'
      const element = performanceAnalysis.elements[0]
      if (element.pattern === 'performance-slow-transition') {
        result.reason = `Slow render (${element.context.renderTime.toFixed(1)}ms) in transition context suggests index key issues`
      } else if (element.pattern === 'performance-high-frequency-list') {
        result.reason = `High render frequency (${element.context.renderFrequency}/min) in list component suggests v-for key issues`
      } else {
        result.reason = 'Performance patterns suggest index key issues'
      }
    }

    // Determine severity based on risk levels, count, and analysis type
    const highRiskElements = allElements.filter(el => el.riskLevel === 'high')
    const mediumRiskElements = allElements.filter(el => el.riskLevel === 'medium')
    const elementCount = allElements.length

    // Performance analysis elements should have higher base severity
    const hasPerformanceAnalysis = performanceAnalysis.elements.length > 0

    if (highRiskElements.length > 0 || elementCount > 3) {
      result.severity = 'high'
      result.suggestion =
        'Critical: Array index keys with transitions cause severe performance issues. Use stable unique IDs immediately.'
    } else if (elementCount > 1 || mediumRiskElements.length > 0 || hasPerformanceAnalysis) {
      result.severity = 'medium'

      // Set appropriate suggestion based on detection method
      if (result.detectionMethod === 'performance-analysis') {
        const element = performanceAnalysis.elements[0]
        if (element.pattern === 'performance-high-frequency-list') {
          result.suggestion = 'Review v-for key usage in list components for better performance'
        } else {
          result.suggestion =
            'Multiple array index keys detected. Replace with stable unique IDs for better performance.'
        }
      } else {
        result.suggestion =
          'Multiple array index keys detected. Replace with stable unique IDs for better performance.'
      }
    } else {
      result.severity = 'low'
      result.suggestion =
        'Array index used as key. Use stable unique IDs to prevent unnecessary re-renders and maintain component state.'
    }

    result.codeGeneration = generateArrayKeyFix(allElements, templateAnalysis.elements)
  }

  return result
}

/**
 * Analyze template for array index key patterns
 * @param {Object} instance - Vue component instance
 * @returns {Object} Analysis result with detected elements
 */
function analyzeTemplateForIndexKeys(instance) {
  const template = getTemplateString(instance)
  const elements = []

  if (!template) {
    return { elements }
  }

  // Define patterns for detecting array index keys
  const patterns = {
    vForWithIndex:
      /v-for=["']?\s*\([^,)]+,\s*(index|idx|i)\s*\)\s+in\s+[^"']+["']?\s+:key=["']\s*\2\s*["']/g,
    keyWithIndex: /:key=["']\s*(index|idx|i|_index)\s*["']/g,
    keyWithIndexVar: /:key=["']\s*\$\{(index|idx|i)\}\s*["']/g,
    keyWithIndexProp: /key:\s*(index|idx|i)\b/g,
    keyWithIndexExpression: /:key=["'][^"']*\+\s*(index|idx|i)\b[^"']*["']/g,
    keyWithPrefixedIndex: /:key=["'][^"']*\$\{(index|idx|i)\}[^"']*["']/g
  }

  // Search for each pattern
  Object.entries(patterns).forEach(([patternName, regex]) => {
    const matches = findTemplateMatches(template, regex)

    matches.forEach(match => {
      const context = extractElementContext(match, template)
      const element = {
        pattern: patternName,
        match: match.trim(),
        indexVariable: extractIndexVariable(match),
        riskLevel: calculateRiskLevel(match, template),
        context,
        line: findLineNumber(template, match),
        // Add element type and hasTransition at the top level for easier access
        element: context.elementType,
        hasTransition: context.hasTransition
      }

      elements.push(element)
    })
  })

  return { elements }
}

/**
 * Extract the index variable name from a match
 * @param {string} match - Matched string
 * @returns {string} Index variable name
 */
function extractIndexVariable(match) {
  const indexMatch = match.match(/(index|idx|i|_index)/)
  return indexMatch ? indexMatch[1] : 'index'
}

/**
 * Calculate risk level based on pattern and context
 * @param {string} match - Matched string
 * @param {string} template - Full template string
 * @returns {string} Risk level (low/medium/high)
 */
function calculateRiskLevel(match, template) {
  // High risk: Transitions with index keys cause severe performance issues
  const hasTransition = /transition|TransitionGroup|transition-group/i.test(template)
  const isComplexExpression = /\+|\$\{/.test(match)

  if (hasTransition) {
    return 'high'
  } else if (isComplexExpression) {
    return 'medium'
  } else {
    return 'low'
  }
}

/**
 * Extract context around the matched element
 * @param {string} match - Matched string
 * @param {string} template - Full template string
 * @returns {Object} Element context
 */
function extractElementContext(match, template) {
  const matchIndex = template.indexOf(match)
  if (matchIndex === -1) return {}

  // Extract a larger context around the match to find the complete element
  const start = Math.max(0, matchIndex - 200)
  const end = Math.min(template.length, matchIndex + match.length + 200)
  const context = template.slice(start, end)

  // Find the element that has the v-for by looking for the opening tag that contains both v-for and the key
  // Look backwards from match position to find the start of the element
  let elementStart = matchIndex
  while (elementStart > 0 && template[elementStart] !== '<') {
    elementStart--
  }

  // Look forward from element start to find the closing >
  let elementEnd = elementStart
  while (elementEnd < template.length && template[elementEnd] !== '>') {
    elementEnd++
  }

  // Extract the full element tag
  const elementTag = template.slice(elementStart, elementEnd + 1)

  // Extract element type
  const elementMatch = elementTag.match(/<(\w+)/)
  const elementType = elementMatch ? elementMatch[1] : 'unknown'

  // Check for transitions in the broader context
  const hasTransition = /transition/i.test(template) || /TransitionGroup/i.test(template)

  return {
    elementType,
    context: context.trim(),
    hasTransition,
    isListItem: /v-for/.test(elementTag) || /v-for/.test(context)
  }
}

/**
 * Find line number of match in template
 * @param {string} template - Template string
 * @param {string} match - Matched string
 * @returns {number} Line number (1-based)
 */
function findLineNumber(template, match) {
  const matchIndex = template.indexOf(match)
  if (matchIndex === -1) return 0

  const beforeMatch = template.slice(0, matchIndex)
  const lineCount = beforeMatch.split('\n').length
  return lineCount
}

/**
 * Analyze component behavior for index key heuristics
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Component snapshot data
 * @returns {Object} Analysis result
 */
function analyzeComponentForIndexKeyHeuristics(instance, snapshot) {
  const elements = []

  // Get component name from snapshot or instance (prioritize snapshot for tests)
  const componentName = snapshot?.componentName || instance?.type?.name || 'Unknown'

  // Check for list-like components with frequent unnecessary renders
  const isListComponent =
    componentName.toLowerCase().includes('list') ||
    componentName.toLowerCase().includes('item') ||
    componentName.toLowerCase().includes('card') ||
    componentName.toLowerCase().includes('row') ||
    componentName.toLowerCase().includes('element')

  const hasFrequentRenders = snapshot?.renderFrequency > 30
  const hasUnnecessaryRenders = snapshot?.isUnnecessary === true
  const hasHighUnnecessaryPercent = snapshot?.unnecessaryRenderPercent > 50

  // Check for components with array props (additional heuristic)
  const hasArrayProps =
    snapshot?.props && Object.values(snapshot.props).some(prop => Array.isArray(prop))

  if (
    isListComponent &&
    (hasFrequentRenders || hasHighUnnecessaryPercent) &&
    hasUnnecessaryRenders
  ) {
    elements.push({
      pattern: 'heuristic-list-behavior',
      match: 'Component behavior suggests index key usage',
      indexVariable: 'unknown',
      riskLevel: 'medium',
      context: {
        componentName,
        renderFrequency: snapshot?.renderFrequency || 0,
        isUnnecessary: hasUnnecessaryRenders,
        unnecessaryRenderPercent: snapshot?.unnecessaryRenderPercent || 0
      }
    })
  } else if (hasArrayProps && hasUnnecessaryRenders && hasHighUnnecessaryPercent) {
    // Additional check for components with array props
    elements.push({
      pattern: 'heuristic-array-props',
      match: 'Component with array props and unnecessary renders',
      indexVariable: 'unknown',
      riskLevel: 'low',
      context: {
        componentName,
        hasArrayProps: true,
        unnecessaryRenderPercent: snapshot?.unnecessaryRenderPercent || 0
      }
    })
  }

  return { elements }
}

/**
 * Analyze performance patterns for index key issues
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Analysis result
 */
function analyzePerformanceForIndexKeys(snapshot, renderTime) {
  const elements = []

  // Get component name for context
  const componentName = snapshot?.componentName || 'Unknown'

  // Pattern 1: Slow renders in transition contexts
  const hasSlowRenders = isSlowRender(renderTime, 16)
  const hasTransitionContext =
    snapshot?.warnings?.includes('transition') ||
    componentName.toLowerCase().includes('transition') ||
    snapshot?.reason?.includes('transition')

  if (hasSlowRenders && hasTransitionContext) {
    elements.push({
      pattern: 'performance-slow-transition',
      match: `Slow render (${renderTime.toFixed(1)}ms) in transition context`,
      indexVariable: 'unknown',
      riskLevel: 'high',
      context: {
        renderTime,
        componentName,
        hasTransitions: true,
        reason: snapshot?.reason || ''
      }
    })
  }

  // Pattern 2: High render frequency in list contexts
  const hasHighFrequency = snapshot?.renderFrequency > 30
  const isListLikeComponent =
    componentName.toLowerCase().includes('list') ||
    componentName.toLowerCase().includes('item') ||
    componentName.toLowerCase().includes('grid')

  if (hasHighFrequency && isListLikeComponent) {
    elements.push({
      pattern: 'performance-high-frequency-list',
      match: `High render frequency (${snapshot.renderFrequency}/min) in list context`,
      indexVariable: 'unknown',
      riskLevel: 'medium',
      context: {
        renderFrequency: snapshot?.renderFrequency || 0,
        componentName,
        isListComponent: true
      }
    })
  }

  return { elements }
}

// Pattern metadata for integration with main patterns object
export const metadata = {
  reason: 'Array index used as v-for key',
  suggestion:
    'Use stable, unique IDs as keys. Index keys cause unnecessary re-renders when list order changes.',
  example: {
    bad: `
<!-- ❌ Array index as key -->
<template>
  <TransitionGroup>
    <div v-for="(item, index) in items" :key="index">
      {{ item.name }}
    </div>
  </TransitionGroup>
</template>
    `,
    good: `
<!-- ✅ Stable unique ID as key -->
<template>
  <TransitionGroup>
    <div v-for="item in items" :key="item.id">
      {{ item.name }}
    </div>
  </TransitionGroup>
</template>

<script setup>
// Ensure items have stable IDs
const items = ref(data.map(item => ({
  ...item,
  id: item.id || crypto.randomUUID()
})))
</script>
    `
  }
}

// Main pattern export
export default {
  detect,
  ...metadata
}
