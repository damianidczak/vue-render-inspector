/**
 * Computed Properties Without Dependencies Pattern Detection
 * Detects computed properties that use non-reactive sources (Date, Math.random, etc.)
 */

import { createPatternResult, safeStringify } from '../helpers/detection-utils.js'

/**
 * Main pattern detection for computed properties without reactive dependencies
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Component snapshot data
 * @param {number} renderTime - Render time in milliseconds
 * @returns {Object} Detection result
 */
export function detect(instance, _snapshot, _renderTime) {
  const result = createPatternResult({
    properties: [],
    codeGeneration: null
  })

  const analysis = analyzeComputedNoDeps(instance)

  if (analysis.detected) {
    result.detected = true
    result.properties = analysis.properties
    result.reason = `${analysis.properties.length} computed propert${analysis.properties.length === 1 ? 'y' : 'ies'} without reactive dependencies`
    result.suggestion =
      analysis.properties.length === 1
        ? 'Convert computed property to a method or add reactive dependencies'
        : 'Convert computed properties to methods or add reactive dependencies for proper caching'
    result.codeGeneration = generateComputedNoDepsCodeFix(analysis.properties)
  }

  return result
}

/**
 * Analyze component for computed properties without reactive dependencies
 * @param {Object} instance - Vue component instance
 * @returns {Object} Analysis result
 */
function analyzeComputedNoDeps(instance) {
  const result = {
    detected: false,
    properties: []
  }

  // Check component computed properties
  const computed = instance?.type?.computed || {}

  Object.entries(computed).forEach(([key, value]) => {
    const analysis = analyzeComputedProperty(key, value)
    if (analysis.hasNonReactiveDeps) {
      result.properties.push(analysis)
    }
  })

  result.detected = result.properties.length > 0
  return result
}

/**
 * Analyze individual computed property for non-reactive dependencies
 * @param {string} key - Property key
 * @param {Function|Object} value - Computed property definition
 * @returns {Object} Analysis result
 */
function analyzeComputedProperty(key, value) {
  const analysis = {
    key,
    hasNonReactiveDeps: false,
    nonReactivePatterns: [],
    confidence: 0
  }

  // Extract function string (handle getter/setter format)
  const fnString = safeStringify(value?.get || value)

  // Check for non-reactive patterns
  const nonReactivePatterns = [
    { pattern: 'new Date', type: 'temporal', severity: 'high' },
    { pattern: 'Date.now', type: 'temporal', severity: 'high' },
    { pattern: 'Math.random', type: 'random', severity: 'high' },
    { pattern: 'Math.floor(Math.random', type: 'random', severity: 'high' },
    { pattern: 'window.', type: 'global', severity: 'medium' },
    { pattern: 'document.', type: 'dom', severity: 'medium' },
    { pattern: 'localStorage.', type: 'storage', severity: 'medium' },
    { pattern: 'sessionStorage.', type: 'storage', severity: 'medium' },
    { pattern: 'navigator.', type: 'browser', severity: 'low' },
    { pattern: 'location.', type: 'browser', severity: 'low' },
    { pattern: 'performance.now', type: 'performance', severity: 'medium' },
    { pattern: 'crypto.getRandomValues', type: 'random', severity: 'high' }
  ]

  nonReactivePatterns.forEach(({ pattern, type, severity }) => {
    if (fnString.includes(pattern)) {
      analysis.nonReactivePatterns.push({ pattern, type, severity })
      analysis.hasNonReactiveDeps = true

      // Increase confidence based on severity
      analysis.confidence += severity === 'high' ? 0.8 : severity === 'medium' ? 0.5 : 0.3
    }
  })

  // Cap confidence at 1.0
  analysis.confidence = Math.min(analysis.confidence, 1.0)

  return analysis
}

/**
 * Generate code fix for computed properties without reactive dependencies
 * @param {Array} properties - Array of problematic properties
 * @returns {string} Generated fix code
 */
function generateComputedNoDepsCodeFix(properties) {
  let fix = '// Fix computed properties without reactive dependencies\n\n'

  properties.forEach(prop => {
    const hasDatePattern = prop.nonReactivePatterns.some(p => p.type === 'temporal')
    const hasRandomPattern = prop.nonReactivePatterns.some(p => p.type === 'random')
    const hasGlobalPattern = prop.nonReactivePatterns.some(
      p => p.type === 'global' || p.type === 'dom'
    )

    if (hasDatePattern) {
      fix += `// ❌ Bad: Computed property with Date (never caches)\n`
      fix += `const ${prop.key} = computed(() => {\n`
      fix += `  return new Date().toLocaleString() // No reactive deps!\n`
      fix += `})\n\n`

      fix += `// ✅ Good: Use methods for non-reactive calculations\n`
      fix += `const get${prop.key.charAt(0).toUpperCase() + prop.key.slice(1)} = () => {\n`
      fix += `  return new Date().toLocaleString()\n`
      fix += `}\n\n`

      fix += `// Or use a reactive timer if you need reactive time\n`
      fix += `const ${prop.key} = ref(new Date().toLocaleString())\n`
      fix += `const timer = setInterval(() => {\n`
      fix += `  ${prop.key}.value = new Date().toLocaleString()\n`
      fix += `}, 1000)\n`
      fix += `onUnmounted(() => clearInterval(timer))\n\n`
    }

    if (hasRandomPattern) {
      fix += `// ❌ Bad: Computed property with random (caches random value)\n`
      fix += `const ${prop.key} = computed(() => {\n`
      fix += `  return Math.random() // Returns same value until dependency changes!\n`
      fix += `})\n\n`

      fix += `// ✅ Good: Use method for new random value each call\n`
      fix += `const get${prop.key.charAt(0).toUpperCase() + prop.key.slice(1)} = () => {\n`
      fix += `  return Math.random()\n`
      fix += `}\n\n`

      fix += `// Or trigger updates manually when needed\n`
      fix += `const ${prop.key} = ref(Math.random())\n`
      fix += `const regenerate${prop.key.charAt(0).toUpperCase() + prop.key.slice(1)} = () => {\n`
      fix += `  ${prop.key}.value = Math.random()\n`
      fix += `}\n\n`
    }

    if (hasGlobalPattern) {
      fix += `// ❌ Bad: Computed property accessing global objects\n`
      fix += `const ${prop.key} = computed(() => {\n`
      fix += `  return window.innerWidth // Not reactive to resize!\n`
      fix += `})\n\n`

      fix += `// ✅ Good: Create reactive wrapper\n`
      fix += `const ${prop.key} = ref(window.innerWidth)\n`
      fix += `const updateSize = () => {\n`
      fix += `  ${prop.key}.value = window.innerWidth\n`
      fix += `}\n`
      fix += `window.addEventListener('resize', updateSize)\n`
      fix += `onUnmounted(() => window.removeEventListener('resize', updateSize))\n\n`
    }
  })

  fix += `// Key principles:\n`
  fix += `// 1. Computed properties should only depend on reactive sources\n`
  fix += `// 2. Use methods for calculations that should run every time\n`
  fix += `// 3. Create reactive wrappers for external state\n`
  fix += `// 4. Consider if the value actually needs to be reactive\n\n`

  fix += `// When to use computed vs methods:\n`
  fix += `// - Computed: Expensive calculations with reactive dependencies\n`
  fix += `// - Methods: Calculations that should run every time (Date, random, etc.)\n`

  return fix
}

// Pattern metadata for integration with main patterns object
export const metadata = {
  reason: 'Computed property without reactive dependencies',
  suggestion:
    'Use methods for non-reactive calculations, or ensure computed properties have reactive dependencies.',
  example: {
    bad: `
// ❌ Computed without reactive dependencies
import { computed } from 'vue'

const currentTime = computed(() => {
  return new Date().toLocaleString() // No reactive deps!
})

// This will cache but never update!
const random = computed(() => Math.random())
    `,
    good: `
// ✅ Use methods for non-reactive calculations
import { ref } from 'vue'

const getCurrentTime = () => {
  return new Date().toLocaleString()
}

// Or use a reactive timer
const currentTime = ref(new Date().toLocaleString())
const timer = setInterval(() => {
  currentTime.value = new Date().toLocaleString()
}, 1000)

onUnmounted(() => clearInterval(timer))
    `
  }
}

// Simple detection function for basic pattern object
export const simpleDetect = instance => {
  const computed = instance?.type?.computed || {}
  const suspicious = Object.entries(computed).filter(([_key, value]) => {
    const fnString = safeStringify(value?.get || value)
    // Check for computed that use Date, Math.random, or external variables
    return (
      fnString.includes('new Date') ||
      fnString.includes('Math.random') ||
      fnString.includes('window.') ||
      fnString.includes('document.')
    )
  })
  return suspicious.length > 0
}

// Main pattern export
export default {
  detect: simpleDetect,
  ...metadata
}
