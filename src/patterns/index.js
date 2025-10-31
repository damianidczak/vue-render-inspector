/**
 * Enhanced Pattern Detection - Complete Modular Implementation
 * Single entry point for all pattern detection functionality
 */

// Import individual patterns
import watcherMisusePattern from './core/watcher-misuse.js'
import arrayIndexKeyPattern from './core/array-index-key.js'
import deepReactivityMisusePattern from './core/deep-reactivity-misuse.js'
import missingVMemoPattern from './core/missing-vmemo.js'
import computedNoDepsPattern from './core/computed-no-deps.js'
import templateMethodCallsPattern from './core/template-method-calls.js'
import deepWatchersPattern from './core/deep-watchers.js'
import arrayMutationsPattern from './core/array-mutations.js'
import eventListenerLeaksPattern from './core/event-listener-leaks.js'
import largeListNoVirtualizationPattern from './core/large-list-no-virtualization.js'

// Create pattern registry for detection
const patternModules = {
  watcherMisuse: watcherMisusePattern,
  arrayIndexKey: arrayIndexKeyPattern,
  deepReactivityMisuse: deepReactivityMisusePattern,
  missingVMemo: missingVMemoPattern,
  computedNoDeps: computedNoDepsPattern,
  templateMethodCalls: templateMethodCallsPattern,
  deepWatchers: deepWatchersPattern,
  arrayMutations: arrayMutationsPattern,
  eventListenerLeaks: eventListenerLeaksPattern,
  largeListNoVirtualization: largeListNoVirtualizationPattern
}

// Export enhanced patterns object (preserving original structure)
export const enhancedPatterns = {
  watcherMisuse: watcherMisusePattern,
  arrayIndexKey: arrayIndexKeyPattern,
  deepReactivityMisuse: deepReactivityMisusePattern,
  missingVMemo: missingVMemoPattern,
  computedNoDeps: computedNoDepsPattern,
  templateMethodCalls: templateMethodCallsPattern,
  deepWatchers: deepWatchersPattern,
  arrayMutations: arrayMutationsPattern,
  eventListenerLeaks: eventListenerLeaksPattern,
  largeListNoVirtualization: largeListNoVirtualizationPattern
}

/**
 * Main enhanced pattern detection function
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Array} Array of detected patterns
 */
export function detectEnhancedPatterns(instance, snapshot, renderTime) {
  const detectedPatterns = []

  try {
    // Run each modular pattern and transform results to expected format
    Object.entries(patternModules).forEach(([patternType, patternModule]) => {
      try {
        const result = patternModule.detect(instance, snapshot, renderTime)

        // Only add if pattern was detected
        if (result && result.detected) {
          // Transform modular pattern result to expected format
          const transformedPattern = {
            type: patternType,
            reason: result.reason || patternModule.reason,
            severity: result.severity || 'medium',
            suggestion: result.suggestion || patternModule.suggestion,
            detectionMethod: result.detectionMethod || 'modular-analysis',

            // Include additional data from modular patterns
            ...result // This will include affectedElements, codeGeneration, etc.
          }

          detectedPatterns.push(transformedPattern)
        }
      } catch (patternError) {
        console.debug(`[VRI] Pattern ${patternType} detection error:`, patternError)
      }
    })

    // Add inline object creation detection (original logic)
    const inlineObjectDetection = detectInlineObjectCreation(instance, snapshot)
    if (inlineObjectDetection.detected) {
      detectedPatterns.push({
        type: 'inlineObjectCreation',
        reason: inlineObjectDetection.reason,
        severity: inlineObjectDetection.severity,
        affectedProps: inlineObjectDetection.props,
        suggestion: inlineObjectDetection.suggestion,
        codeGeneration: inlineObjectDetection.codeGeneration,
        detectionMethod: 'static-analysis'
      })
    }
  } catch (error) {
    console.debug('[VRI] Enhanced pattern detection error:', error)
  }

  return detectedPatterns
}

/**
 * Get optimization priority for detected patterns
 * @param {Array} patterns - Array of detected patterns
 * @returns {Array} Patterns sorted by priority
 */
export function getOptimizationPriority(patterns) {
  // Priority scoring for detected patterns
  const priorities = {
    deepReactivityMisuse: 10,
    largeListNoVirtualization: 9,
    deepWatchers: 8,
    watcherMisuse: 7,
    templateMethodCalls: 6,
    arrayMutations: 5,
    missingVMemo: 4,
    arrayIndexKey: 3,
    computedNoDeps: 2,
    eventListenerLeaks: 1,
    inlineObjectCreation: 6
  }

  return patterns
    .map(p => ({ ...p, priority: priorities[p.type] || 0 }))
    .sort((a, b) => b.priority - a.priority)
}

// Export individual patterns for direct import
export {
  watcherMisusePattern,
  arrayIndexKeyPattern,
  deepReactivityMisusePattern,
  missingVMemoPattern,
  computedNoDepsPattern,
  templateMethodCallsPattern,
  deepWatchersPattern,
  arrayMutationsPattern,
  eventListenerLeaksPattern,
  largeListNoVirtualizationPattern
}

// Re-export detection utilities for external use
export * from './helpers/detection-utils.js'
export * from './helpers/code-generation.js'

// Enhanced inline object creation detection with template analysis
function detectInlineObjectCreation(instance, _snapshot) {
  const result = {
    detected: false,
    reason: '',
    severity: 'medium',
    props: [],
    suggestion: '',
    codeGeneration: null
  }

  // Method 1: Analyze props diff for reference changes with same content
  if (_snapshot?.propsDiff?.changed) {
    const inlineObjectProps = []
    const functionalProps = []

    Object.entries(_snapshot.propsDiff.changed).forEach(([key, change]) => {
      // Skip null/undefined entries
      if (!change || typeof change !== 'object') return

      // Enhanced detection: different reference but same deep content
      if (change.deepEqual === true && change.sameReference === false) {
        if (typeof change.from === 'function' || typeof change.to === 'function') {
          functionalProps.push(key)
        } else {
          inlineObjectProps.push(key)
        }
      }
      // Additional check: object/array props with frequent changes
      else if (
        Array.isArray(change.from) ||
        Array.isArray(change.to) ||
        (change.from && typeof change.from === 'object' && change.from.constructor === Object)
      ) {
        inlineObjectProps.push(key)
      }
    })

    if (inlineObjectProps.length > 0 || functionalProps.length > 0) {
      result.detected = true
      result.props = [...inlineObjectProps, ...functionalProps]

      if (functionalProps.length > 0) {
        result.severity = 'high'
        result.reason = `Inline functions detected: ${functionalProps.join(', ')}. Objects: ${inlineObjectProps.join(', ')}`
        result.suggestion =
          'Move inline functions and objects to stable references. Functions especially cause child re-renders.'
      } else {
        result.severity = 'medium'
        result.reason = `Inline objects creating new references: ${inlineObjectProps.join(', ')}`
        result.suggestion =
          'Move objects/arrays to stable references (data, computed, or outside component)'
      }

      // Generate fix code
      result.codeGeneration = generateInlineObjectFix(result.props, functionalProps)
    }
  }

  // Method 2: Template pattern analysis (if template is available)
  const template = instance?.type?.template || instance?.render?.toString() || ''
  if (template && !result.detected) {
    const templatePatterns = analyzeTemplateForInlineCreation(template)
    if (templatePatterns.hasInlineCreation) {
      result.detected = true
      result.severity = templatePatterns.severity
      result.reason = templatePatterns.reason
      result.suggestion = 'Template contains inline object/function creation patterns'
      result.props = templatePatterns.detectedProps
    }
  }

  // Method 3: Frequency-based heuristic for child components
  if (!result.detected && _snapshot?.componentName && _snapshot?.isUnnecessary) {
    const isChildComponent =
      _snapshot.componentName.includes('Child') ||
      _snapshot.componentName.includes('Item') ||
      _snapshot.componentName.includes('Card') ||
      _snapshot.componentName.endsWith('Component')

    if (isChildComponent && _snapshot.unnecessaryRenderPercent > 50) {
      result.detected = true
      result.severity = 'medium'
      result.reason = 'Child component re-rendering frequently - likely receiving unstable props'
      result.suggestion = 'Check parent component for inline object/function creation in props'
    }
  }

  return result
}

// Template analysis for inline object patterns
function analyzeTemplateForInlineCreation(template) {
  const patterns = {
    inlineObjects: /:([a-zA-Z]+)="\{[^}]+\}"/g, // :prop="{ key: value }"
    inlineArrays: /:([a-zA-Z]+)="\[[^\]]+\]"/g, // :prop="[item1, item2]"
    inlineArrowFunctions: /@([a-zA-Z]+)="\([^)]*\)\s*=>/g, // @event="() => handler()"
    inlineFunctions: /@([a-zA-Z]+)="\$event\s*=>/g, // @event="$event => handler()"
    methodCalls: /{{[^}]*\w+\([^)]*\)[^}]*}}/g, // {{ method() }} in template
    complexBindings: /:([a-zA-Z]+)="[^"]*\?[^"]*:[^"]*"/g // :prop="condition ? obj1 : obj2"
  }

  const detectedProps = []
  let severityScore = 0
  const reasons = []

  // Check each pattern
  Object.entries(patterns).forEach(([patternName, regex]) => {
    const matches = template.match(regex) || []
    if (matches.length > 0) {
      matches.forEach(match => {
        const propMatch = match.match(/[:@]([a-zA-Z]+)=/) || match.match(/{{([^}]+)}}/)
        if (propMatch) {
          detectedProps.push(propMatch[1])
        }
      })

      switch (patternName) {
        case 'inlineArrowFunctions':
        case 'inlineFunctions':
          severityScore += matches.length * 3 // Functions are worst
          reasons.push(`${matches.length} inline functions`)
          break
        case 'inlineObjects':
          severityScore += matches.length * 2
          reasons.push(`${matches.length} inline objects`)
          break
        case 'inlineArrays':
          severityScore += matches.length * 2
          reasons.push(`${matches.length} inline arrays`)
          break
        case 'methodCalls':
          severityScore += matches.length * 1
          reasons.push(`${matches.length} template method calls`)
          break
        case 'complexBindings':
          severityScore += matches.length * 1
          reasons.push(`${matches.length} complex conditional bindings`)
          break
      }
    }
  })

  return {
    hasInlineCreation: severityScore > 0,
    severity: severityScore >= 4 ? 'high' : severityScore >= 3 ? 'medium' : 'low',
    reason: reasons.join(', '),
    detectedProps: [...new Set(detectedProps)]
  }
}

// Generate code to fix inline object issues
function generateInlineObjectFix(props, functionalProps) {
  const objectProps = props.filter(p => !functionalProps.includes(p))

  let fix = '// Move to stable references in <script setup>\n'

  // Generate object fixes
  objectProps.forEach(prop => {
    if (prop.includes('style') || prop.includes('Style')) {
      fix += `const ${prop} = computed(() => ({ /* your styles */ }))\n`
    } else if (prop.includes('config') || prop.includes('Config')) {
      fix += `const ${prop} = { /* your config object */ }\n`
    } else if (prop.includes('data') || prop.includes('Data') || prop.includes('items')) {
      fix += `const ${prop} = [/* your array data */]\n`
    } else {
      fix += `const ${prop} = { /* move inline object here */ }\n`
    }
  })

  // Generate function fixes
  functionalProps.forEach(prop => {
    if (prop.includes('click') || prop.includes('Click')) {
      fix += `const ${prop} = () => { /* your click handler */ }\n`
    } else if (prop.includes('change') || prop.includes('Change')) {
      fix += `const ${prop} = (value) => { /* your change handler */ }\n`
    } else {
      fix += `const ${prop} = (...args) => { /* your event handler */ }\n`
    }
  })

  return fix
}
