/**
 * Template Method Calls Pattern Detection
 * Detects method calls in templates that should be computed properties for performance
 */

import {
  getTemplateString,
  findTemplateMatches,
  isSlowRender,
  createPatternResult
} from '../helpers/detection-utils.js'

import { generateMethodCallFix } from '../helpers/code-generation.js'

/**
 * Main pattern detection for template method calls
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Detection result
 */
export function detect(instance, snapshot, renderTime) {
  const result = createPatternResult({
    detectionMethod: '',
    methodMetrics: {},
    codeGeneration: null
  })

  // Initialize methodMetrics with expected structure
  const methodMetrics = {
    // Expected arrays for tests
    methodCalls: [],
    expensiveMethods: [],
    nestedCalls: [],
    methodsInLoops: [],
    methodsInConditionals: [],

    // Counters
    totalCalls: 0,
    expensiveCalls: 0,
    callsInLoops: 0,
    callsInConditionals: 0,
    repetitiveCalls: 0,

    // Performance correlation data
    renderTime: renderTime || 0,
    unnecessaryRenderPercent: snapshot?.unnecessaryRenderPercent || 0,
    renderFrequency: snapshot?.renderFrequency || 0,
    hasUnnecessaryRenders: snapshot?.isUnnecessary || false,
    performanceImpact: 0,

    // Legacy field for backwards compatibility
    methodCallDetails: []
  }

  // Method 1: Template analysis (primary detection)
  const template = getTemplateString(instance)
  let templateAnalysis = null
  if (template) {
    templateAnalysis = analyzeTemplateMethodPatterns(template)
    Object.assign(methodMetrics, templateAnalysis)
  }

  // Method 2: Heuristic analysis for components without templates
  if (!template || methodMetrics.totalCalls === 0) {
    const heuristicAnalysis = analyzeHeuristicIndicators(instance, snapshot, renderTime)
    if (heuristicAnalysis.detected) {
      methodMetrics.totalCalls = heuristicAnalysis.estimatedCalls
      methodMetrics.performanceImpact = heuristicAnalysis.impactScore

      // Add heuristic method calls if no template analysis found any
      if (methodMetrics.methodCalls.length === 0) {
        methodMetrics.methodCalls.push({
          method: 'heuristicDetection',
          context: 'heuristic',
          match: 'render patterns suggest method calls',
          isExpensive: true,
          hasNestedCalls: false,
          isInLoop: false,
          isInConditional: false
        })
      }

      // Ensure heuristic reason is included
      methodMetrics.heuristicMessage = 'render patterns suggest method calls'
    }
  }

  // Method 3: Performance correlation analysis
  const performanceAnalysis = analyzeMethodCallContext(methodMetrics, renderTime, snapshot)

  // Set performance impact score
  methodMetrics.performanceImpact = calculatePerformanceImpact(
    methodMetrics,
    performanceAnalysis,
    renderTime,
    snapshot
  )

  // Determine if pattern should be reported
  const shouldReport = determineShouldReport(
    methodMetrics,
    performanceAnalysis,
    renderTime,
    snapshot
  )

  if (shouldReport.detected) {
    result.detected = true
    result.methodMetrics = methodMetrics
    result.detectionMethod = shouldReport.detectionMethod
    result.severity = shouldReport.severity
    result.reason = shouldReport.reason
    result.suggestion = shouldReport.suggestion
    result.codeGeneration = generateMethodCallCodeFix(methodMetrics, templateAnalysis)
  }

  return result
}

/**
 * Analyze template for method call patterns
 * @param {string} template - Component template string
 * @returns {Object} Analysis result
 */
function analyzeTemplateMethodPatterns(template) {
  const metrics = {
    // Expected arrays for tests
    methodCalls: [],
    expensiveMethods: [],
    nestedCalls: [],
    methodsInLoops: [],
    methodsInConditionals: [],

    // Counters
    totalCalls: 0,
    expensiveCalls: 0,
    callsInLoops: 0,
    callsInConditionals: 0,
    repetitiveCalls: 0,

    // Legacy field
    methodCallDetails: []
  }

  // Pattern 1: Method calls in interpolations {{ methodName() }}
  const interpolationCalls = findTemplateMatches(template, /{{[^}]*\w+\([^)]*\)[^}]*}}/g)

  interpolationCalls.forEach(match => {
    const methodCall = analyzeMethodCallCharacteristics(match, template)
    const fullMethodCall = {
      ...methodCall,
      method: methodCall.methodName, // Add method property for test compatibility
      context: 'interpolation',
      match: match.trim()
    }

    metrics.methodCallDetails.push(fullMethodCall)
    metrics.methodCalls.push(fullMethodCall)
  })

  // Pattern 2: Method calls in directive values v-bind, v-if, etc.
  const directiveCalls = findTemplateMatches(
    template,
    /:[\w-]+\s*=\s*["'][^"']*\w+\([^)]*\)[^"']*["']/g
  )

  directiveCalls.forEach(match => {
    const methodCall = analyzeMethodCallCharacteristics(match, template)
    const fullMethodCall = {
      ...methodCall,
      method: methodCall.methodName, // Add method property for test compatibility
      context: 'directive',
      match: match.trim()
    }

    metrics.methodCallDetails.push(fullMethodCall)
    metrics.methodCalls.push(fullMethodCall)
  })

  // Pattern 3: Event handler method calls @event="method()" and arrow functions
  const eventCalls = findTemplateMatches(
    template,
    /@[\w-]+\s*=\s*["'][^"']*\w+\([^)]*\)[^"']*["']/g
  )

  eventCalls.forEach(match => {
    const methodCall = analyzeMethodCallCharacteristics(match, template)
    const fullMethodCall = {
      ...methodCall,
      method: methodCall.methodName, // Add method property for test compatibility
      context: 'event',
      match: match.trim()
    }

    metrics.methodCallDetails.push(fullMethodCall)
    metrics.methodCalls.push(fullMethodCall)
  })

  // Pattern 3b: Arrow function method calls in event handlers
  const arrowFunctionCalls = findTemplateMatches(
    template,
    /@[\w-]+\s*=\s*["'][^"']*=>\s*[^"']*\w+\([^)]*\)[^"']*["']/g
  )

  arrowFunctionCalls.forEach(match => {
    const methodCall = analyzeMethodCallCharacteristics(match, template)
    const fullMethodCall = {
      ...methodCall,
      method: methodCall.methodName, // Add method property for test compatibility
      context: 'event',
      match: match.trim()
    }

    metrics.methodCallDetails.push(fullMethodCall)
    metrics.methodCalls.push(fullMethodCall)
  })

  // Pattern 4: Method calls in conditional directives (v-if, v-show, etc.)
  const conditionalCalls = findTemplateMatches(
    template,
    /v-(if|else-if|show)\s*=\s*["'][^"']*\w+\([^)]*\)[^"']*["']/g
  )

  conditionalCalls.forEach(match => {
    const methodCall = analyzeMethodCallCharacteristics(match, template)
    const fullMethodCall = {
      ...methodCall,
      method: methodCall.methodName, // Add method property for test compatibility
      context: 'conditional',
      match: match.trim()
    }

    metrics.methodCallDetails.push(fullMethodCall)
    metrics.methodCalls.push(fullMethodCall)
  })

  // Pattern 5: Method calls in v-for expressions
  const vForCalls = findTemplateMatches(template, /v-for\s*=\s*["'][^"']*\w+\([^)]*\)[^"']*["']/g)

  vForCalls.forEach(match => {
    const methodCall = analyzeMethodCallCharacteristics(match, template)
    const fullMethodCall = {
      ...methodCall,
      method: methodCall.methodName, // Add method property for test compatibility
      context: 'v-for',
      match: match.trim(),
      isInLoop: true
    }

    metrics.methodCallDetails.push(fullMethodCall)
    metrics.methodCalls.push(fullMethodCall)
  })

  // Analyze each method call for additional characteristics
  metrics.methodCallDetails.forEach(methodCall => {
    metrics.totalCalls++

    // Check if method is expensive and add to appropriate arrays
    if (methodCall.isExpensive) {
      metrics.expensiveCalls++
      metrics.expensiveMethods.push({
        method: methodCall.methodName,
        context: methodCall.context,
        complexity: methodCall.complexity || 1
      })
    }

    // Check if method has nested calls
    if (methodCall.hasNestedCalls) {
      metrics.nestedCalls.push({
        method: methodCall.methodName,
        context: methodCall.context,
        nestedCount: methodCall.complexity || 1
      })
    }

    // Check if method is in loop
    if (methodCall.isInLoop || detectMethodInLoop(methodCall.match, template)) {
      metrics.callsInLoops++
      methodCall.isInLoop = true
      metrics.methodsInLoops.push({
        method: methodCall.methodName,
        context: methodCall.context,
        loopType: methodCall.context === 'v-for' ? 'v-for' : 'nested-loop'
      })
    }

    // Check if method is in conditional
    if (detectMethodInConditional(methodCall.match, template)) {
      metrics.callsInConditionals++
      methodCall.isInConditional = true
      metrics.methodsInConditionals.push({
        method: methodCall.methodName,
        context: methodCall.context,
        conditionalType: getConditionalType(methodCall.match, template)
      })
    }
  })

  // Detect repeated method calls
  const methodNames = metrics.methodCallDetails.map(call => call.methodName)
  const uniqueMethods = new Set(methodNames)
  metrics.repetitiveCalls = methodNames.length - uniqueMethods.size

  return metrics
}

/**
 * Analyze characteristics of individual method call
 * @param {string} methodCallMatch - Matched method call string
 * @param {string} template - Full template string
 * @returns {Object} Method call analysis
 */
function analyzeMethodCallCharacteristics(methodCallMatch, _template) {
  const analysis = {
    methodName: 'unknown',
    hasArguments: false,
    argumentCount: 0,
    hasNestedCalls: false,
    isExpensive: false,
    complexity: 0
  }

  // Extract method name - improved to handle arrow functions and complex patterns
  const methodMatch = methodCallMatch.match(/(\w+)\s*\(/g)
  if (methodMatch && methodMatch.length > 0) {
    analysis.methodName = methodMatch[0].replace(/\s*\(/, '')
  } else {
    // Fallback for complex patterns like arrow functions
    const arrowMatch = methodCallMatch.match(/=>\s*\w+\(|\w+\(/g)
    if (arrowMatch && arrowMatch.length > 0) {
      const lastMatch = arrowMatch[arrowMatch.length - 1]
      analysis.methodName = lastMatch.replace(/.*\s*(\w+)\(/, '$1')
    }
  }

  // Count arguments
  const argMatch = methodCallMatch.match(/\(([^)]*)\)/)
  if (argMatch && argMatch[1]) {
    const args = argMatch[1].split(',').filter(arg => arg.trim())
    analysis.hasArguments = args.length > 0
    analysis.argumentCount = args.length
    analysis.complexity += args.length
  }

  // Detect nested method calls - improved detection
  // Look for method calls that contain other method calls
  const allMethodMatches = methodCallMatch.match(/\w+\(/g) || []
  analysis.hasNestedCalls = allMethodMatches.length > 1
  if (analysis.hasNestedCalls) {
    analysis.complexity += allMethodMatches.length - 1

    // Store all method names found for better counting
    analysis.allMethodNames = allMethodMatches.map(match => match.replace(/\s*\(/, ''))
  } else {
    analysis.allMethodNames = [analysis.methodName]
  }

  // Detect expensive method patterns
  const expensivePatterns = [
    'calculate',
    'compute',
    'process',
    'transform',
    'convert',
    'format',
    'filter',
    'sort',
    'reduce',
    'map',
    'find',
    'search',
    'validate',
    'parse',
    'generate',
    'analyze',
    'expensive',
    'complex',
    'statistics',
    'report'
  ]

  analysis.isExpensive = expensivePatterns.some(pattern =>
    analysis.methodName.toLowerCase().includes(pattern)
  )

  if (analysis.isExpensive) {
    analysis.complexity += 2
  }

  return analysis
}

/**
 * Detect if method call is inside a v-for loop
 * @param {string} methodCall - Method call string
 * @param {string} template - Full template string
 * @returns {boolean} True if in loop
 */
function detectMethodInLoop(methodCall, template) {
  // Extract the method name from the call to search more broadly
  const methodNameMatch = methodCall.match(/(\w+)\s*\(/)
  if (!methodNameMatch) return false

  const methodName = methodNameMatch[1]

  // Find all v-for elements and check if the method call is inside any of them
  const vForElementRegex = /<(\w+)([^>]*v-for\s*=[^>]*)>/g
  let vForMatch

  while ((vForMatch = vForElementRegex.exec(template)) !== null) {
    const tagName = vForMatch[1]
    const vForStartIndex = vForMatch.index
    const vForOpenTag = vForMatch[0]

    // Skip self-closing tags
    if (vForOpenTag.endsWith('/>')) {
      continue
    }

    // Find the matching closing tag
    const closingTagRegex = new RegExp(`</${tagName}>`, 'g')
    closingTagRegex.lastIndex = vForStartIndex + vForOpenTag.length

    // Count nesting level to find the correct closing tag
    let depth = 1
    let searchPos = vForStartIndex + vForOpenTag.length
    let contentEnd = template.length

    while (depth > 0 && searchPos < template.length) {
      const nextOpenTag = template.indexOf(`<${tagName}`, searchPos)
      const nextCloseTag = template.indexOf(`</${tagName}>`, searchPos)

      if (nextCloseTag === -1) {
        // No more closing tags found
        break
      }

      if (nextOpenTag !== -1 && nextOpenTag < nextCloseTag) {
        // Found nested opening tag
        depth++
        searchPos = nextOpenTag + tagName.length + 1
      } else {
        // Found closing tag
        depth--
        if (depth === 0) {
          contentEnd = nextCloseTag
        }
        searchPos = nextCloseTag + tagName.length + 3
      }
    }

    // Extract content between the v-for tags
    const vForContentStart = vForStartIndex + vForOpenTag.length
    const vForContent = template.slice(vForContentStart, contentEnd)

    // Check if this v-for content contains our method call
    if (vForContent.includes(`${methodName}(`)) {
      return true
    }
  }

  return false
}

/**
 * Detect if method call is inside a conditional directive
 * @param {string} methodCall - Method call string
 * @param {string} template - Full template string
 * @returns {boolean} True if in conditional
 */
function detectMethodInConditional(methodCall, template) {
  // Extract the method name from the call
  const methodNameMatch = methodCall.match(/(\w+)\s*\(/)
  if (!methodNameMatch) return false

  const methodName = methodNameMatch[1]

  // Check if the method call itself is in a conditional directive value
  const conditionalDirectives = ['v-if', 'v-else-if', 'v-show']

  for (const directive of conditionalDirectives) {
    // Check if method call is directly in conditional directive
    const directPattern = new RegExp(
      `${directive}\\s*=\\s*["'][^"']*${escapeRegExp(methodName)}\\([^"']*["']`
    )
    if (directPattern.test(template)) {
      return true
    }
  }

  // Find all conditional elements and check if the method call is inside any of them
  const conditionalElementRegex = /<(\w+)([^>]*(?:v-if|v-else-if|v-show)\s*=[^>]*)>/g
  let conditionalMatch

  while ((conditionalMatch = conditionalElementRegex.exec(template)) !== null) {
    const tagName = conditionalMatch[1]
    const conditionalStartIndex = conditionalMatch.index
    const conditionalOpenTag = conditionalMatch[0]

    // Skip self-closing tags
    if (conditionalOpenTag.endsWith('/>')) {
      continue
    }

    // Find the matching closing tag
    let depth = 1
    let searchPos = conditionalStartIndex + conditionalOpenTag.length
    let contentEnd = template.length

    while (depth > 0 && searchPos < template.length) {
      const nextOpenTag = template.indexOf(`<${tagName}`, searchPos)
      const nextCloseTag = template.indexOf(`</${tagName}>`, searchPos)

      if (nextCloseTag === -1) {
        // No more closing tags found
        break
      }

      if (nextOpenTag !== -1 && nextOpenTag < nextCloseTag) {
        // Found nested opening tag
        depth++
        searchPos = nextOpenTag + tagName.length + 1
      } else {
        // Found closing tag
        depth--
        if (depth === 0) {
          contentEnd = nextCloseTag
        }
        searchPos = nextCloseTag + tagName.length + 3
      }
    }

    // Extract content between the conditional tags
    const conditionalContentStart = conditionalStartIndex + conditionalOpenTag.length
    const conditionalContent = template.slice(conditionalContentStart, contentEnd)

    // Check if this conditional content contains our method call
    if (conditionalContent.includes(`${methodName}(`)) {
      return true
    }
  }

  return false
}

/**
 * Get type of conditional context for method call
 * @param {string} methodCall - Method call string
 * @param {string} template - Full template string
 * @returns {string} Type of conditional
 */
function getConditionalType(methodCall, template) {
  const conditionalDirectives = ['v-if', 'v-else-if', 'v-show']

  for (const directive of conditionalDirectives) {
    const pattern = new RegExp(
      `${directive}\\s*=\\s*["'][^"']*${escapeRegExp(methodCall)}[^"']*["']`
    )
    if (pattern.test(template)) {
      return directive
    }
  }

  return 'unknown'
}

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Analyze heuristic indicators for template method calls
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Analysis result
 */
function analyzeHeuristicIndicators(instance, snapshot, renderTime) {
  const analysis = {
    detected: false,
    estimatedCalls: 0,
    impactScore: 0
  }

  // Heuristic 1: Component name suggests method-heavy usage
  const componentName = instance?.type?.name || snapshot?.componentName || ''
  const methodHeavyPatterns = [
    'Calculator',
    'Formatter',
    'Processor',
    'Transformer',
    'Display',
    'Calculation'
  ]

  if (methodHeavyPatterns.some(pattern => componentName.includes(pattern))) {
    analysis.estimatedCalls += 2
    analysis.impactScore += 2
  }

  // Heuristic 2: High render frequency suggests method calls
  const renderFreq = snapshot?.renderFrequency || 0
  if (renderFreq > 30) {
    analysis.estimatedCalls += Math.floor(renderFreq / 15)
    analysis.impactScore += 2
  }

  // Heuristic 3: Total renders suggest component re-renders often
  if (snapshot?.totalRenders > 20) {
    analysis.estimatedCalls += 1
    analysis.impactScore += 1
  }

  // Heuristic 4: State changes with unnecessary renders
  if (snapshot?.changePatterns?.stateChanges > 10) {
    analysis.estimatedCalls += 1
    analysis.impactScore += 1
  }

  // Heuristic 5: Unnecessary renders percentage
  if (snapshot?.unnecessaryRenderPercent > 30) {
    analysis.estimatedCalls += 1
    analysis.impactScore += 2
  }

  // Heuristic 6: Slow renders without obvious causes
  if (renderTime > 8 && !snapshot?.propsDiff?.changed) {
    analysis.estimatedCalls += 1
    analysis.impactScore += 1
  }

  // Heuristic 7: Render function instead of template (may have inline expressions)
  const hasRenderFunction = instance?.render && !instance?.type?.template
  if (hasRenderFunction) {
    analysis.estimatedCalls += 1
    analysis.impactScore += 1
  }

  analysis.detected = analysis.estimatedCalls > 0 || analysis.impactScore >= 2
  return analysis
}

/**
 * Analyze method call context for performance impact
 * @param {Object} methodMetrics - Method call metrics
 * @param {number} renderTime - Render time in milliseconds
 * @param {Object} snapshot - Component snapshot data
 * @returns {Object} Analysis result
 */
function analyzeMethodCallContext(methodMetrics, renderTime, snapshot) {
  return {
    hasPerformanceCorrelation: isSlowRender(renderTime, 8) && methodMetrics.totalCalls > 0,
    hasComputedAlternatives: methodMetrics.expensiveCalls > 0,
    hasUnnecessaryRenders: snapshot?.isUnnecessary === true,
    renderFrequency: snapshot?.renderFrequency || 0
  }
}

/**
 * Calculate performance impact score
 * @param {Object} methodMetrics - Method call metrics
 * @param {Object} performanceAnalysis - Performance analysis result
 * @param {number} renderTime - Render time in milliseconds
 * @param {Object} snapshot - Component snapshot data
 * @returns {number} Performance impact score
 */
function calculatePerformanceImpact(methodMetrics, performanceAnalysis, renderTime, snapshot) {
  let score = 0

  // Base score from method calls
  score += methodMetrics.totalCalls * 0.5

  // Expensive methods have higher impact
  score += methodMetrics.expensiveCalls * 2

  // Methods in loops have exponential impact
  score += methodMetrics.callsInLoops * 5

  // Nested calls increase complexity
  score += methodMetrics.nestedCalls.length * 1.5

  // Render time correlation
  if (renderTime > 10) {
    score += 3
  } else if (renderTime > 5) {
    score += 1
  }

  // Unnecessary render correlation
  if (snapshot?.unnecessaryRenderPercent > 50) {
    score += 2
  }

  // High render frequency
  if (snapshot?.renderFrequency > 30) {
    score += 2
  }

  return Math.min(score, 10) // Cap at 10
}

/**
 * Determine if pattern should be reported
 * @param {Object} methodMetrics - Method call metrics
 * @param {Object} performanceAnalysis - Performance analysis result
 * @param {number} renderTime - Render time in milliseconds
 * @param {Object} snapshot - Component snapshot data
 * @returns {Object} Reporting decision
 */
function determineShouldReport(methodMetrics, performanceAnalysis, renderTime, snapshot) {
  const result = {
    detected: false,
    detectionMethod: '',
    severity: 'medium',
    reason: '',
    suggestion: ''
  }

  // Scoring system
  let score = 0
  const reasons = []

  // Method call count scoring
  if (methodMetrics.totalCalls > 5) {
    score += 4
    reasons.push(`${methodMetrics.totalCalls} method calls`)
  } else if (methodMetrics.totalCalls > 2) {
    score += 2
    reasons.push(`${methodMetrics.totalCalls} method calls`)
  } else if (methodMetrics.totalCalls > 0) {
    score += 1
    reasons.push(`${methodMetrics.totalCalls} method calls`)
  }

  // Expensive methods scoring
  if (methodMetrics.expensiveMethods && methodMetrics.expensiveMethods.length > 0) {
    score += methodMetrics.expensiveMethods.length * 2
    reasons.push(`${methodMetrics.expensiveMethods.length} expensive method patterns`)
  }

  // Context scoring
  if (methodMetrics.methodsInLoops && methodMetrics.methodsInLoops.length > 0) {
    score += methodMetrics.methodsInLoops.length * 3
    reasons.push(`${methodMetrics.methodsInLoops.length} method calls in v-for loops`)
  }

  if (methodMetrics.nestedCalls && methodMetrics.nestedCalls.length > 0) {
    score += 2
    reasons.push(`${methodMetrics.nestedCalls.length} nested method calls`)
  }

  if (methodMetrics.repetitiveCalls > 0) {
    score += 2
    reasons.push(`repetitive method calls`)
  }

  if (methodMetrics.methodsInConditionals && methodMetrics.methodsInConditionals.length > 0) {
    score += 1
    reasons.push(
      `${methodMetrics.methodsInConditionals.length} method calls in conditional contexts`
    )
  }

  // Performance correlation
  if (performanceAnalysis.hasPerformanceCorrelation) {
    score += 3
    reasons.push(`slow render time (${renderTime.toFixed(1)}ms)`)
  }

  if (performanceAnalysis.hasUnnecessaryRenders) {
    score += 2
    reasons.push('unnecessary renders detected')
  }

  // High render frequency correlation
  if (snapshot?.renderFrequency > 30) {
    score += 2
    reasons.push('high render frequency')
  }

  // Unnecessary render percentage correlation
  if (snapshot?.unnecessaryRenderPercent > 50) {
    score += 2
    reasons.push(`${snapshot.unnecessaryRenderPercent}% unnecessary renders`)
  }

  // Heuristic detection (component naming, trigger mechanisms)
  if (snapshot?.componentName) {
    const name = snapshot.componentName.toLowerCase()
    if (name.includes('calculation') || name.includes('formatter') || name.includes('processor')) {
      score += 2
      reasons.push('component name suggests calculations')
    }
  }

  if (snapshot?.triggerMechanism === 'state' && snapshot?.isUnnecessary) {
    score += 2
    reasons.push('state changes triggering unnecessary renders')
  }

  if (snapshot?.propsDiff?.changed && Object.keys(snapshot.propsDiff.changed).length > 2) {
    score += 1
    reasons.push('multiple prop changes')
  }

  // Add heuristic message if present
  if (methodMetrics.heuristicMessage) {
    reasons.push(methodMetrics.heuristicMessage)
  }

  // Determine if should report (lowered threshold to be more sensitive)
  if (score >= 2) {
    result.detected = true
    result.reason = `Template method calls detected: ${reasons.join(', ')}`

    // Determine severity and detection method based on priority
    if (renderTime > 15 && snapshot?.unnecessaryRenderPercent > 50) {
      result.severity = 'high'
      result.detectionMethod = 'performance-correlation'
      result.suggestion =
        'Critical: Slow renders detected with method calls. Convert to computed properties immediately.'
    } else if (methodMetrics.methodsInLoops && methodMetrics.methodsInLoops.length > 0) {
      result.severity = 'high'
      result.detectionMethod = 'performance-critical'
      result.suggestion =
        'Critical: Method calls in loops cause exponential performance degradation. Convert to computed properties immediately.'
    } else if (renderTime > 15 || score >= 10) {
      result.severity = 'high'
      result.detectionMethod = 'performance-correlation'
      result.suggestion =
        'Critical: Slow renders detected with method calls. Convert to computed properties immediately.'
    } else if (
      (methodMetrics.totalCalls === 0 && score >= 2) ||
      methodMetrics.methodCalls.some(call => call.context === 'heuristic')
    ) {
      result.severity = 'medium'
      result.detectionMethod = 'heuristic'
      result.suggestion =
        'Render patterns suggest method calls in template. Consider using computed properties for better performance.'
    } else if (
      performanceAnalysis.hasUnnecessaryRenders &&
      (snapshot?.unnecessaryRenderPercent > 50 || snapshot?.renderFrequency > 30)
    ) {
      result.severity = 'medium'
      result.detectionMethod = 'performance-correlation'
      result.suggestion =
        'Performance correlation detected. Consider converting method calls to computed properties.'
    } else if (
      methodMetrics.expensiveMethods &&
      methodMetrics.expensiveMethods.length > 2 &&
      renderTime > 8
    ) {
      result.severity = 'medium'
      result.detectionMethod = 'performance-correlation'
      result.suggestion =
        'Multiple expensive method calls detected. Convert to computed properties for better performance and caching.'
    } else {
      result.severity = renderTime > 4 ? 'medium' : 'low'
      result.detectionMethod = 'template-analysis'
      result.suggestion =
        'Replace template method calls with computed properties to avoid recalculation on every render.'
    }
  }

  return result
}

/**
 * Generate method call optimization code
 * @param {Object} methodMetrics - Method call metrics
 * @param {Object} templateAnalysis - Template analysis results
 * @returns {string} Generated fix code
 */
function generateMethodCallCodeFix(methodMetrics, _templateAnalysis) {
  const methodNames = methodMetrics.methodCallDetails
    .map(call => call.methodName)
    .filter((name, index, arr) => arr.indexOf(name) === index) // unique names
    .slice(0, 3) // max 3 examples

  let fix = generateMethodCallFix(methodNames)

  // Add specific examples for detected patterns
  if (methodMetrics.callsInLoops > 0 || methodMetrics.methodsInLoops?.length > 0) {
    fix += `\n\n❌ Bad: Method calls inside v-for
<template>
  <div v-for="item in items" :key="item.id">
    {{ formatPrice(item.price) }} <!-- Called for EVERY item! -->
  </div>
</template>

✅ Good: Pre-computed list data
<template>
  <div v-for="item in formattedItems" :key="item.id">
    {{ item.formattedPrice }}
  </div>
</template>

<script setup>
const formattedItems = computed(() => 
  items.value.map(item => ({
    ...item,
    formattedPrice: formatPrice(item.price)
  }))
)
</script>`
  }

  if (methodMetrics.nestedCalls?.length > 0) {
    fix += `\n\nBreak down nested calls:
❌ Bad: Nested calls (expensive)
<template>
  <p>{{ formatCurrency(calculateTotal(getActiveItems(items))) }}</p>
</template>

✅ Good: Chain computed properties
<script setup>
const activeItems = computed(() => getActiveItems(items.value))
const total = computed(() => calculateTotal(activeItems.value))
const formattedTotal = computed(() => formatCurrency(total.value))
</script>

<template>
  <p>{{ formattedTotal }}</p>
</template>`
  }

  // Add expensive method optimization tips
  if (methodMetrics.expensiveMethods?.length > 0) {
    fix += `\n\nFor expensive calculations, consider memoization:
<script setup>
import { useMemo } from 'vue'

const expensiveResult = useMemo(() => {
  return expensiveCalculation(data.value)
}, [data])
</script>`
  }

  // Add performance optimization tips
  fix += `\n\nPerformance optimization tips:
• Use computed properties for any calculation in templates
• Computed properties are cached until dependencies change
• Extract complex expressions into computed properties
• For expensive operations, consider useMemo or memo patterns`

  return fix
}

// Pattern metadata for integration with main patterns object
export const metadata = {
  reason: 'Multiple method calls in template',
  suggestion:
    'Replace template method calls with computed properties to avoid recalculation on every render.',
  example: {
    bad: `
<!-- ❌ Method calls in template (runs every render) -->
<template>
  <div class="summary">
    <p>Total: {{ calculateTotal(items) }}</p>
    <p>Formatted: {{ formatCurrency(calculateTotal(items)) }}</p>
    <p>With Tax: {{ addTax(calculateTotal(items)) }}</p>
  </div>
</template>
    `,
    good: `
<!-- ✅ Computed properties (cached) -->
<template>
  <div class="summary">
    <p>Total: {{ total }}</p>
    <p>Formatted: {{ formattedTotal }}</p>
    <p>With Tax: {{ totalWithTax }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const total = computed(() => calculateTotal(items.value))
const formattedTotal = computed(() => formatCurrency(total.value))
const totalWithTax = computed(() => addTax(total.value))
</script>
    `
  }
}

// Simple detection function for basic pattern object
export const simpleDetect = instance => {
  const template = getTemplateString(instance)
  // Look for method calls with parentheses in templates (not event handlers)
  const methodCalls = findTemplateMatches(template, /{{[^}]*\w+\([^)]*\)[^}]*}}/g)
  return methodCalls.length > 2 // More than 2 method calls in template
}

// Main pattern export
export default {
  detect,
  ...metadata
}
