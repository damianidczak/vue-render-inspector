/**
 * Unit Tests for RenderDetector
 * Tests render analysis and unnecessary render detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RenderDetector } from '../../../src/core/detector.js'

describe('RenderDetector - Unit Tests', () => {
  let detector
  let prevSnapshot, currentSnapshot

  beforeEach(() => {
    detector = new RenderDetector({
      strictMode: false,
      trackFunctions: true
    })

    prevSnapshot = {
      uid: 123,
      componentName: 'TestComponent',
      timestamp: Date.now() - 100,
      props: { message: 'Hello', count: 1 },
      state: { internal: 'value' },
      duration: 5
    }

    currentSnapshot = {
      uid: 123,
      componentName: 'TestComponent',
      timestamp: Date.now(),
      props: { message: 'Hello', count: 1 },
      state: { internal: 'value' },
      duration: 3
    }
  })

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const defaultDetector = new RenderDetector()

      expect(defaultDetector.strictMode).toBe(false)
      expect(defaultDetector.trackFunctions).toBe(true)
    })

    it('should respect custom options', () => {
      const customDetector = new RenderDetector({
        strictMode: true,
        trackFunctions: false
      })

      expect(customDetector.strictMode).toBe(true)
      expect(customDetector.trackFunctions).toBe(false)
    })
  })

  describe('Initial Render Analysis', () => {
    it('should identify initial render correctly', () => {
      const result = detector.analyze(null, currentSnapshot)

      expect(result.isUnnecessary).toBe(false)
      expect(result.reason).toBe('initial-render')
      expect(result.details).toBe('First render of component')
    })
  })

  describe('Props Analysis', () => {
    it('should detect no prop changes', () => {
      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.propsDiff).toBeDefined()
      expect(result.propsHasRealChange).toBe(false)
    })

    it('should detect real prop changes', () => {
      currentSnapshot.props.count = 2

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.propsHasRealChange).toBe(true)
      expect(result.propsDiff.changed).toHaveProperty('count')
    })

    it('should detect prop additions', () => {
      currentSnapshot.props.newProp = 'added'

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.propsHasRealChange).toBe(true)
      expect(result.propsDiff.added).toHaveProperty('newProp')
    })

    it('should detect prop removals', () => {
      delete currentSnapshot.props.count

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.propsHasRealChange).toBe(true)
      expect(result.propsDiff.removed).toHaveProperty('count')
    })

    it('should detect inline object creation', () => {
      // Create objects with same content but different references
      const config1 = { theme: 'dark' }
      const config2 = { theme: 'dark' }

      prevSnapshot.props.config = config1
      currentSnapshot.props.config = config2

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.propsDiff.changed).toHaveProperty('config')
      expect(result.propsDiff.changed.config.deepEqual).toBe(true)
    })

    it('should detect inline function creation', () => {
      // Create different function instances
      const func1 = () => 'test'
      const func2 = () => 'test'

      prevSnapshot.props.onClick = func1
      currentSnapshot.props.onClick = func2

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.propsDiff.changed).toHaveProperty('onClick')
    })
  })

  describe('State Analysis', () => {
    it('should detect no state changes', () => {
      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.stateDiff).toBeDefined()
      expect(result.stateHasRealChange).toBe(false)
    })

    it('should detect real state changes', () => {
      currentSnapshot.state.internal = 'changed'

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.stateHasRealChange).toBe(true)
      expect(result.stateDiff.changed).toHaveProperty('internal')
    })
  })

  describe('Unnecessary Render Detection', () => {
    it('should mark render as unnecessary when no changes detected', () => {
      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.isUnnecessary).toBe(true)
      expect(result.reason).toBe('no-changes-detected')
      expect(result.details).toBe('Props and state are identical to previous render')
    })

    it('should mark render as necessary when props changed', () => {
      currentSnapshot.props.count = 2

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.isUnnecessary).toBe(false)
      expect(result.reason).toBe('props-changed')
    })

    it('should mark render as necessary when state changed', () => {
      currentSnapshot.state.internal = 'changed'

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.isUnnecessary).toBe(false)
      expect(result.reason).toBe('state-changed')
    })

    it('should detect reference-only changes', () => {
      prevSnapshot.props.items = [1, 2, 3]
      currentSnapshot.props.items = [1, 2, 3] // Same content, different reference

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.isUnnecessary).toBe(true)
      expect(result.reason).toBe('reference-changes-only')
      expect(result.details).toBe('Props have new references but same content')
    })
  })

  describe('Reactivity Analysis', () => {
    it('should analyze reactivity triggers', () => {
      const reactivityData = {
        reactivityTracking: [],
        reactivityTriggers: [
          {
            operation: 'set',
            key: 'count',
            getDescription: () => 'count property set'
          }
        ]
      }

      const result = detector.analyze(prevSnapshot, currentSnapshot, null, reactivityData)

      // Should not be unnecessary if there are reactivity triggers
      expect(result.isUnnecessary).toBe(false)
    })

    it('should handle computed property access', () => {
      const reactivityData = {
        reactivityTracking: [
          {
            targetType: 'computed',
            operation: 'get',
            key: 'computedValue',
            getDescription: () => 'computed value accessed'
          }
        ],
        reactivityTriggers: []
      }

      const result = detector.analyze(prevSnapshot, currentSnapshot, null, reactivityData)

      // Computed access without changes might be unnecessary
      expect(result.isUnnecessary).toBe(true)
    })
  })

  describe('Suggestion Generation', () => {
    it('should provide suggestions for unnecessary renders', () => {
      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.suggestions.length).toBeGreaterThan(0)
      const suggestionText = result.suggestions.join(' ')
      expect(suggestionText).toMatch(/memo|shouldComponentUpdate|shallowRef|memoizing|references/)
    })

    it('should provide performance suggestions for slow renders', () => {
      currentSnapshot.duration = 60 // Slow render

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.suggestions.length).toBeGreaterThan(0)
      expect(result.suggestions.some(s => s.includes('computed') || s.includes('expensive'))).toBe(
        true
      )
    })

    it('should suggest optimizations for large lists', () => {
      currentSnapshot.props.items = new Array(150).fill(0).map((_, i) => ({ id: i }))
      currentSnapshot.duration = 120

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.suggestions.some(s => s.includes('virtual') || s.includes('memo'))).toBe(true)
    })
  })

  describe('Severity Calculation', () => {
    it('should calculate severity based on render count', () => {
      const analysis = { isUnnecessary: true }

      expect(detector.calculateSeverity(analysis, 1)).toBe('low')
      expect(detector.calculateSeverity(analysis, 3)).toBe('medium')
      expect(detector.calculateSeverity(analysis, 7)).toBe('high')
      expect(detector.calculateSeverity(analysis, 15)).toBe('critical')
    })

    it('should return none for necessary renders', () => {
      const analysis = { isUnnecessary: false }

      expect(detector.calculateSeverity(analysis, 10)).toBe('none')
    })
  })

  describe('Vue-Specific Pattern Detection', () => {
    it('should detect v-if/v-show misuse', () => {
      currentSnapshot.conditionalRendering = { count: 10 }

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.suggestions.some(s => s.includes('v-show'))).toBe(true)
    })

    it('should detect event handler recreation', () => {
      prevSnapshot.props.onSubmit = '[Function: onSubmit]'
      currentSnapshot.props.onSubmit = '[Function: onSubmit]'

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      // Should detect function recreation and suggest optimization
      expect(result.suggestions.length).toBeGreaterThan(0)
    })

    it('should detect missing optimization directives', () => {
      currentSnapshot.hasVFor = true
      currentSnapshot.listSize = 50
      currentSnapshot.hasVMemo = false

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      expect(result.suggestions.some(s => s.includes('v-memo'))).toBe(true)
    })
  })

  describe('Reference Change Detection', () => {
    it('should detect reference changes with same content', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1, b: 2 }

      const result = detector.isReferenceChangeWithSameContent(obj1, obj2)
      expect(result).toBe(true)
    })

    it('should detect different content', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1, b: 3 }

      const result = detector.isReferenceChangeWithSameContent(obj1, obj2)
      expect(result).toBe(false)
    })

    it('should handle primitive values', () => {
      const result = detector.isReferenceChangeWithSameContent('hello', 'hello')
      expect(result).toBe(false) // Same value, not a reference change
    })

    it('should handle null values', () => {
      const result = detector.isReferenceChangeWithSameContent(null, null)
      expect(result).toBe(false)
    })
  })

  describe('detectMissingOptimizationDirectives - Uncovered Branches', () => {
    it('should suggest v-once for static content', () => {
      currentSnapshot.hasStaticContent = true
      currentSnapshot.hasVOnce = false

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasVOnceWarning = result.suggestions.some(
        s => s.includes('v-once') || s.includes('Static content')
      )

      expect(hasVOnceWarning).toBe(true)
    })

    it('should not suggest v-once when already present', () => {
      currentSnapshot.hasStaticContent = true
      currentSnapshot.hasVOnce = true // Already has v-once

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasVOnceWarning = result.suggestions.some(
        s => s.includes('v-once') && s.includes('Static content')
      )

      expect(hasVOnceWarning).toBe(false)
    })

    it('should suggest v-memo for large lists', () => {
      currentSnapshot.hasVFor = true
      currentSnapshot.hasVMemo = false
      currentSnapshot.listSize = 25 // > 20

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasVMemoWarning = result.suggestions.some(
        s => s.includes('v-memo') || s.includes('Large list')
      )

      expect(hasVMemoWarning).toBe(true)
    })

    it('should not suggest v-memo for small lists', () => {
      currentSnapshot.hasVFor = true
      currentSnapshot.hasVMemo = false
      currentSnapshot.listSize = 15 // <= 20

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasVMemoWarning = result.suggestions.some(
        s => s.includes('v-memo') && s.includes('Large list')
      )

      expect(hasVMemoWarning).toBe(false)
    })

    it('should suggest transition key when missing', () => {
      currentSnapshot.hasTransition = true
      currentSnapshot.hasTransitionKey = false

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasTransitionKeyWarning = result.suggestions.some(
        s => s.includes('Transition') && (s.includes('key') || s.includes('unique keys'))
      )

      expect(hasTransitionKeyWarning).toBe(true)
    })

    it('should not suggest transition key when present', () => {
      currentSnapshot.hasTransition = true
      currentSnapshot.hasTransitionKey = true // Has key

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasTransitionKeyWarning = result.suggestions.some(
        s => s.includes('Transition') && s.includes('proper key')
      )

      expect(hasTransitionKeyWarning).toBe(false)
    })

    it('should suggest limiting exposed properties when many are defined', () => {
      currentSnapshot.exposedProperties = {
        prop1: 'value1',
        prop2: 'value2',
        prop3: 'value3',
        prop4: 'value4',
        prop5: 'value5',
        prop6: 'value6' // More than 5 properties
      }

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasExposeWarning = result.suggestions.some(
        s =>
          s.includes('Many exposed properties') ||
          s.includes('defineExpose') ||
          s.includes('Limit exposed properties')
      )

      expect(hasExposeWarning).toBe(true)
    })

    it('should not suggest limiting exposed properties when few are defined', () => {
      currentSnapshot.exposedProperties = {
        prop1: 'value1',
        prop2: 'value2',
        prop3: 'value3' // Only 3 properties, under threshold
      }

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasExposeWarning = result.suggestions.some(
        s => s.includes('Many exposed properties') || s.includes('defineExpose')
      )

      expect(hasExposeWarning).toBe(false)
    })

    it('should suggest using .lazy modifier for v-model on expensive inputs', () => {
      currentSnapshot.hasVModel = true
      currentSnapshot.hasLazyModifier = false
      currentSnapshot.isExpensiveInput = true

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasLazyWarning = result.suggestions.some(
        s =>
          s.includes('lazy modifier') || s.includes('v-model.lazy') || s.includes('update on blur')
      )

      expect(hasLazyWarning).toBe(true)
    })

    it('should not suggest .lazy modifier when already present', () => {
      currentSnapshot.hasVModel = true
      currentSnapshot.hasLazyModifier = true // Already has .lazy
      currentSnapshot.isExpensiveInput = true

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasLazyWarning = result.suggestions.some(
        s => s.includes('lazy modifier') || s.includes('v-model.lazy')
      )

      expect(hasLazyWarning).toBe(false)
    })

    it('should not suggest .lazy modifier when input is not expensive', () => {
      currentSnapshot.hasVModel = true
      currentSnapshot.hasLazyModifier = false
      currentSnapshot.isExpensiveInput = false // Not expensive

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasLazyWarning = result.suggestions.some(
        s => s.includes('lazy modifier') || s.includes('v-model.lazy')
      )

      expect(hasLazyWarning).toBe(false)
    })

    it('should not suggest .lazy modifier when no v-model is present', () => {
      currentSnapshot.hasVModel = false // No v-model
      currentSnapshot.hasLazyModifier = false
      currentSnapshot.isExpensiveInput = true

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasLazyWarning = result.suggestions.some(
        s => s.includes('lazy modifier') || s.includes('v-model.lazy')
      )

      expect(hasLazyWarning).toBe(false)
    })
  })

  describe('detectExpensiveTemplateExpressions - Template Complexity', () => {
    it('should suggest computed properties for complex template expressions', () => {
      currentSnapshot.templateComplexity = {
        expressionCount: 15 // > 10
      }

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasComplexityWarning = result.suggestions.some(
        s =>
          s.includes('Complex template expressions') ||
          s.includes('computed properties') ||
          s.includes('expressions run on every render')
      )

      expect(hasComplexityWarning).toBe(true)
    })

    it('should not warn about template expressions when count is low', () => {
      currentSnapshot.templateComplexity = {
        expressionCount: 5 // <= 10
      }

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasComplexityWarning = result.suggestions.some(s =>
        s.includes('Complex template expressions')
      )

      expect(hasComplexityWarning).toBe(false)
    })

    it('should warn about method calls in template', () => {
      currentSnapshot.templateComplexity = {
        methodCalls: 3 // > 0
      }

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasMethodCallWarning = result.suggestions.some(
        s =>
          s.includes('Method calls in template') || s.includes('Methods are called on every render')
      )

      expect(hasMethodCallWarning).toBe(true)
    })

    it('should not warn when no method calls in template', () => {
      currentSnapshot.templateComplexity = {
        methodCalls: 0
      }

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasMethodCallWarning = result.suggestions.some(s =>
        s.includes('Method calls in template')
      )

      expect(hasMethodCallWarning).toBe(false)
    })

    it('should detect data transformation props', () => {
      currentSnapshot.props = {
        items: [1, 2, 3],
        filterData: () => {},
        transformResult: 'value',
        mapItems: []
      }

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasTransformWarning = result.suggestions.some(
        s =>
          s.includes('Data transformation') ||
          s.includes('Pre-transform data') ||
          s.includes('inline transformations')
      )

      expect(hasTransformWarning).toBe(true)
    })

    it('should not warn when no transformation props present', () => {
      currentSnapshot.props = {
        items: [1, 2, 3],
        count: 5,
        message: 'hello'
      }

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasTransformWarning = result.suggestions.some(s => s.includes('Data transformation'))

      expect(hasTransformWarning).toBe(false)
    })
  })

  describe('detectVueSpecificAntiPatterns - Additional Patterns', () => {
    it('should warn about teleport usage', () => {
      currentSnapshot.hasTeleport = true

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasTeleportWarning = result.suggestions.some(
        s => s.includes('Teleport') || s.includes('stable teleport targets')
      )

      expect(hasTeleportWarning).toBe(true)
    })

    it('should not warn when no teleport present', () => {
      currentSnapshot.hasTeleport = false

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasTeleportWarning = result.suggestions.some(s => s.includes('Teleport'))

      expect(hasTeleportWarning).toBe(false)
    })

    it('should warn about many provided values', () => {
      currentSnapshot.provides = {
        value1: 'a',
        value2: 'b',
        value3: 'c',
        value4: 'd' // > 3
      }

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasProvidesTooManyWarning = result.suggestions.some(
        s => s.includes('Many provided values') || s.includes('consolidating')
      )

      expect(hasProvidesTooManyWarning).toBe(true)
    })

    it('should not warn when few provided values', () => {
      currentSnapshot.provides = {
        value1: 'a',
        value2: 'b' // <= 3
      }

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasProvidesTooManyWarning = result.suggestions.some(s =>
        s.includes('Many provided values')
      )

      expect(hasProvidesTooManyWarning).toBe(false)
    })
  })

  describe('detectPropDrilling - Deep Nesting Tests', () => {
    it('should detect deep component nesting from component name', () => {
      const nestedSnapshot = {
        ...currentSnapshot,
        componentName: 'ParentContainerItemDetailRow' // 5 capital letters = deep nesting
      }

      const result = detector.analyze(prevSnapshot, nestedSnapshot)

      const hasNestingWarning = result.suggestions.some(
        s =>
          s.includes('Deep component nesting') ||
          s.includes('provide/inject') ||
          s.includes('component composition')
      )

      expect(hasNestingWarning).toBe(true)
    })

    it('should detect many props scenario', () => {
      currentSnapshot.props = {
        prop1: 1,
        prop2: 2,
        prop3: 3,
        prop4: 4,
        prop5: 5,
        prop6: 6,
        prop7: 7,
        prop8: 8,
        prop9: 9 // More than 8 props
      }

      const result = detector.analyze(prevSnapshot, currentSnapshot)

      const hasPropWarning = result.suggestions.some(
        s =>
          s.includes('Many props detected') ||
          s.includes('grouping related props') ||
          s.includes('object destructuring')
      )

      expect(hasPropWarning).toBe(true)
    })
  })
})
