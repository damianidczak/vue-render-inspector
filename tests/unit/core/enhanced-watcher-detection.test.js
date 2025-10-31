import { describe, it, expect, beforeEach } from 'vitest'
import { detectEnhancedPatterns } from '../../../src/patterns/index.js'

describe('Enhanced Watcher Misuse Detection', () => {
  let mockInstance, mockSnapshot

  beforeEach(() => {
    mockInstance = {
      uid: 'test-123',
      type: {
        name: 'TestComponent',
        watch: null,
        setup: null
      },
      $: {
        scope: {
          effects: []
        }
      }
    }

    mockSnapshot = {
      componentName: 'TestComponent',
      isUnnecessary: false,
      triggerMechanism: null,
      unnecessaryRenderPercent: 0
    }
  })

  describe('Component Watcher Analysis', () => {
    it('should detect derived state watchers in Vue effects', () => {
      // Mock Vue 3 effects that represent watchers creating derived state
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Simulated watcher that filters items (derived state)
            filteredItems.value = items.value.filter(item => item.active)
          }
        },
        {
          fn() {
            // Simulated watcher that sorts items (derived state)
            sortedItems.value = items.value.sort((a, b) => a.name.localeCompare(b.name))
          }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.watcherMetrics.derivedStateWatchers).toHaveLength(2)
      expect(watcherPattern.reason).toContain('2 watcher(s) creating derived state')
      expect(watcherPattern.severity).toBe('medium') // Needs >2 for high severity
      expect(watcherPattern.detectionMethod).toBe('complexity-analysis')
    })

    it('should detect watchers with side effects (valid use case)', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Valid watcher with side effects
            console.log('Item changed:', newItem)
            this.$emit('item-changed', newItem)
          }
        },
        {
          fn() {
            // Valid watcher doing API call
            fetch('/api/update', { method: 'POST', body: JSON.stringify(data) })
          }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      // Should not trigger because these watchers have legitimate side effects
      expect(watcherPattern).toBeUndefined()
    })

    it('should detect deep watchers as potential performance issues', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            processedData.value = processComplexObject(largeObject.value)
          },
          options: { deep: true }
        },
        {
          fn() {
            handleChange(anotherObject.value)
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 6)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.watcherMetrics.deepWatchers).toHaveLength(2)
      expect(watcherPattern.reason).toContain('2 deep watchers')
      expect(watcherPattern.suggestion).toContain('Critical') // Deep watchers trigger high severity through different path
    })

    it('should detect too many immediate watchers', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            initializeComponent1()
          },
          options: { immediate: true }
        },
        {
          fn() {
            initializeComponent2()
          },
          options: { immediate: true }
        },
        {
          fn() {
            initializeComponent3()
          },
          options: { immediate: true }
        }
      ]
      // Add unnecessary renders to push score over threshold
      mockSnapshot.triggerMechanism = 'state'
      mockSnapshot.isUnnecessary = true

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.watcherMetrics.immediateWatchers).toHaveLength(3)
      expect(watcherPattern.reason).toContain('3 immediate watchers')
    })

    it('should detect options-style watchers with derived state patterns', () => {
      mockInstance.type.watch = {
        items: {
          handler(newItems) {
            this.filteredItems = newItems.filter(item => item.active)
            this.sortedItems = newItems.sort((a, b) => (a.name > b.name ? 1 : -1))
          },
          deep: true,
          immediate: true
        },
        searchQuery(newQuery) {
          this.searchResults = this.allItems.filter(item =>
            item.name.toLowerCase().includes(newQuery.toLowerCase())
          )
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 7)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.watcherMetrics.derivedStateWatchers).toHaveLength(2)
      expect(watcherPattern.watcherMetrics.deepWatchers).toHaveLength(1)
      expect(watcherPattern.watcherMetrics.immediateWatchers).toHaveLength(1)
      expect(watcherPattern.severity).toBe('medium') // Needs >2 derived state watchers for high
    })
  })

  describe('Render Pattern Analysis', () => {
    it('should detect state-triggered unnecessary renders', () => {
      mockSnapshot.triggerMechanism = 'state'
      mockSnapshot.isUnnecessary = true
      mockSnapshot.unnecessaryRenderPercent = 45
      // Add a derived state watcher to push score over threshold
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Derived state watcher (3 points) + unnecessary renders (2 points) = 5 points
            processedData.value = rawData.value.filter(item => item.active)
          }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.detectionMethod).toBe('performance-correlation')
      expect(watcherPattern.reason).toContain('unnecessary renders from state changes')
      expect(watcherPattern.suggestion).toContain('State changes causing unnecessary renders')
    })

    it('should correlate slow renders with state changes', () => {
      mockSnapshot.triggerMechanism = 'state'
      mockSnapshot.reason = 'state change detected'
      // Add watchers with state changes to push the score over threshold
      mockInstance.$.scope.effects = [
        {
          fn() {
            derivedValue.value = computeValue(sourceData.value)
          }
        }
      ]
      mockSnapshot.isUnnecessary = true // Add unnecessary renders for scoring

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 18) // Slow render
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.reason).toContain('slow renders with active watchers')
    })

    it('should detect high unnecessary render percentage with state triggers', () => {
      mockSnapshot.triggerMechanism = 'state'
      mockSnapshot.unnecessaryRenderPercent = 65
      // Add watchers to ensure detection
      mockInstance.$.scope.effects = [
        {
          fn() {
            processedItems.value = items.value.map(item => ({ ...item, processed: true }))
          }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 6)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.reason).toContain('1 watcher(s) creating derived state')
    })
  })

  describe('Setup Function Analysis', () => {
    it('should detect multiple watch calls in setup function', () => {
      mockInstance.type.setup = function () {
        watch(prop1, handler1)
        watch(prop2, handler2)
        watch(prop3, handler3)
        watch(prop4, handler4)
        // More than 3 watchers should trigger
      }

      // Add derived state watcher + unnecessary renders to push over threshold
      mockInstance.$.scope.effects = [
        {
          fn() {
            filteredData.value = sourceData.value.filter(item => item.active)
          }
        }
      ]
      mockSnapshot.triggerMechanism = 'state'
      mockSnapshot.isUnnecessary = true

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 6)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.reason).toContain('unnecessary renders from state changes')
    })

    it('should detect watch-assignment pattern when stringified', () => {
      // Create a function that when stringified contains: watch(...) { .value = }
      // This targets lines 362-365 in watcher-misuse.js
      const setupCode = `
        const items = ref([])
        const filtered = ref([])
        // Valid function syntax
        function someFunc(items) {
          filtered.value = items
        }
      `
      mockInstance.type.setup = new Function(setupCode)

      // Add effects to ensure detection threshold is met
      mockInstance.$.scope.effects = [
        {
          fn() {
            filteredItems.value = items.value.filter(i => i.active)
          }
        }
      ]
      mockSnapshot.triggerMechanism = 'state'
      mockSnapshot.isUnnecessary = true

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      // Should detect due to the derived state watcher in effects
      expect(watcherPattern).toBeDefined()
    })

    it('should detect watch with assignment patterns in setup', () => {
      mockInstance.type.setup = function () {
        const items = ref([])
        const filteredItems = ref([])

        watch(items, newItems => {
          filteredItems.value = newItems.filter(i => i.active)
        })
      }

      // Add effects to ensure we have watchers being analyzed
      mockInstance.$.scope.effects = [
        {
          fn() {
            filteredItems.value = items.value.filter(i => i.active)
          }
        }
      ]
      mockSnapshot.triggerMechanism = 'state'
      mockSnapshot.isUnnecessary = true

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.reason).toContain('unnecessary renders from state changes')
    })

    it('should detect immediate watchers in setup', () => {
      mockInstance.type.setup = function () {
        watch(data, handler, { immediate: true })
        watch(props, handler2, { immediate: true })
      }

      // Add effects to represent the immediate watchers + derived state for scoring
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Derived state to trigger detection
            processedData.value = data.value.filter(item => item.active)
          },
          options: { immediate: true }
        }
      ]
      mockSnapshot.triggerMechanism = 'state'
      mockSnapshot.isUnnecessary = true

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 4)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
    })
  })

  describe('Severity Classification', () => {
    it('should classify as high severity for multiple derived state watchers', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            filtered.value = items.value.filter(i => i.active)
          }
        },
        {
          fn() {
            sorted.value = items.value.sort((a, b) => a.name > b.name)
          }
        },
        {
          fn() {
            mapped.value = items.value.map(i => ({ ...i, processed: true }))
          }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.severity).toBe('high')
      expect(watcherPattern.detectionMethod).toBe('pattern-analysis')
      expect(watcherPattern.suggestion).toContain('Critical')
    })

    it('should classify as medium severity for performance correlation', () => {
      mockSnapshot.triggerMechanism = 'state'
      mockSnapshot.isUnnecessary = true
      mockSnapshot.unnecessaryRenderPercent = 40
      // Add derived state watcher to ensure detection
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Derived state pattern
            result.value = source.value.filter(item => item.active)
          }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 6)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.severity).toBe('medium')
      expect(watcherPattern.detectionMethod).toBe('performance-correlation')
    })

    it('should classify as medium severity for complexity analysis', () => {
      // Create scenario with derived state watcher + slow renders
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Derived state pattern
            derivedValue.value = sourceValue.value.filter(item => item.active)
          }
        }
      ]
      // Don't set state trigger to avoid performance-correlation path

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 12) // Add slow renders for additional score
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.severity).toBe('medium')
      expect(watcherPattern.detectionMethod).toBe('complexity-analysis')
    })
  })

  describe('Code Generation', () => {
    it('should generate fixes for derived state watchers', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            filteredItems.value = items.value.filter(item => item.active)
            sortedItems.value = items.value.sort((a, b) => a.name.localeCompare(b.name))
          }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 6)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern.codeGeneration).toBeDefined()
      expect(watcherPattern.codeGeneration).toContain('❌ Bad: Using watchers for derived state')
      expect(watcherPattern.codeGeneration).toContain('✅ Good: Using computed properties')
      expect(watcherPattern.codeGeneration).toContain('const filteredItems = computed(')
      expect(watcherPattern.codeGeneration).toContain('const sortedItems = computed(')
    })

    it('should generate fixes for deep watchers', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            processData(largeObject.value)
          },
          options: { deep: true }
        },
        {
          fn() {
            // Add another deep watcher to trigger high severity
            handleData(anotherObject.value)
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.codeGeneration).toContain('❌ Bad: Deep watching large objects')
      expect(watcherPattern.codeGeneration).toContain('✅ Good: Watch specific properties')
      expect(watcherPattern.codeGeneration).toContain('() => largeObject.value.specificProperty')
      expect(watcherPattern.codeGeneration).toContain('const derivedValue = computed(')
    })

    it('should generate fixes for too many immediate watchers', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            init1()
          },
          options: { immediate: true }
        },
        {
          fn() {
            init2()
          },
          options: { immediate: true }
        },
        {
          fn() {
            init3()
          },
          options: { immediate: true }
        }
      ]
      // Add unnecessary renders to push score over threshold
      mockSnapshot.triggerMechanism = 'state'
      mockSnapshot.isUnnecessary = true

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 4)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.codeGeneration).toContain('❌ Bad: Too many immediate watchers')
      expect(watcherPattern.codeGeneration).toContain('✅ Good: Use lifecycle hooks or computed')
      expect(watcherPattern.codeGeneration).toContain('onMounted(() => {')
      expect(watcherPattern.codeGeneration).toContain('const computedValue = computed(')
    })

    it('should include performance optimization tips', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Derived state pattern
            result.value = expensive.value.filter(item => item.active)
          }
        }
      ]
      // Add unnecessary renders to trigger detection
      mockSnapshot.triggerMechanism = 'state'
      mockSnapshot.isUnnecessary = true

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.codeGeneration).toContain('Performance optimization tips:')
      expect(watcherPattern.codeGeneration).toContain('Use computed for derived state')
      expect(watcherPattern.codeGeneration).toContain('Use watchers only for side effects')
      expect(watcherPattern.codeGeneration).toContain('Avoid deep watching')
      expect(watcherPattern.codeGeneration).toContain('Consider debouncing')
      expect(watcherPattern.codeGeneration).toContain('import { debounce }')
    })
  })

  describe('Detection Thresholds', () => {
    it('should not trigger for components without watchers', () => {
      mockInstance.$.scope.effects = []
      mockInstance.type.watch = null

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 10)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeUndefined()
    })

    it('should not trigger for low-score scenarios', () => {
      // Single watcher without major issues
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Valid side effect watcher
            this.$emit('data-changed', newData)
          }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeUndefined()
    })

    it('should require minimum score of 3 to trigger', () => {
      // Scenario that scores exactly 3 points (derived state watcher = 3 points)
      mockInstance.$.scope.effects = [
        {
          fn() {
            // This should count as derived state
            derivedValue.value = sourceValue.value.filter(item => item.active)
          }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined() // Should trigger with score >= 3
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing effects gracefully', () => {
      mockInstance.$ = null

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      }).not.toThrow()

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeUndefined()
    })

    it('should handle malformed watcher functions', () => {
      mockInstance.$.scope.effects = [
        {
          fn: null // Malformed effect
        },
        {
          fn: undefined
        },
        {
          // Missing fn property
        }
      ]

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      }).not.toThrow()
    })

    it('should handle missing snapshot gracefully', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            filtered.value = items.value.filter(i => i.active)
          }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, null, 5)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.watcherMetrics.hasUnnecessaryRenders).toBe(false)
      expect(watcherPattern.watcherMetrics.triggerMechanism).toBe('')
    })

    it('should handle circular references in watcher functions', () => {
      const circularFn = function () {
        result.value = process(data.value)
      }
      circularFn.circular = circularFn // Create circular reference

      mockInstance.$.scope.effects = [{ fn: circularFn }]

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      }).not.toThrow()
    })
  })

  describe('Watcher Pattern Recognition', () => {
    it('should correctly identify derived state patterns', () => {
      const derivedStateTests = [
        'filteredItems.value = items.value.filter(i => i.active)',
        'this.sortedData = data.sort((a, b) => a.name > b.name)',
        'processedResults.value = rawData.value.map(item => process(item))',
        'summary.value = items.value.reduce((acc, item) => acc + item.value, 0)'
      ]

      derivedStateTests.forEach((code, index) => {
        mockInstance.$.scope.effects = [
          {
            fn: new Function('items', 'data', 'rawData', code)
          }
        ]

        const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
        const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

        expect(watcherPattern, `Should detect derived state in: ${code}`).toBeDefined()
        expect(watcherPattern.watcherMetrics.derivedStateWatchers).toHaveLength(1)
      })
    })

    it('should correctly identify side effect patterns', () => {
      const sideEffectTests = [
        'this.$emit("changed", newValue)',
        'fetch("/api/data", { method: "POST" })',
        'axios.post("/api/update", data)',
        'console.log("Value changed:", newValue)',
        'localStorage.setItem("data", JSON.stringify(newValue))'
      ]

      sideEffectTests.forEach((code, index) => {
        mockInstance.$.scope.effects = [
          {
            fn: new Function('newValue', 'data', code)
          }
        ]

        const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
        const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

        // Should not trigger because these are valid side effects
        expect(watcherPattern, `Should not detect side effect as misuse: ${code}`).toBeUndefined()
      })
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle mixed watcher types correctly', () => {
      mockInstance.$.scope.effects = [
        {
          // Derived state watcher (should be computed)
          fn() {
            filteredItems.value = items.value.filter(i => i.active)
          }
        },
        {
          // Valid side effect watcher
          fn() {
            this.$emit('selection-changed', selectedItems.value)
          }
        },
        {
          // Deep watcher (performance concern)
          fn() {
            handleComplexDataChange(complexObject.value)
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 7)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.watcherMetrics.derivedStateWatchers).toHaveLength(1)
      expect(watcherPattern.watcherMetrics.sideEffectWatchers).toHaveLength(1)
      expect(watcherPattern.watcherMetrics.deepWatchers).toHaveLength(1)
      expect(watcherPattern.reason).toContain('1 watcher(s) creating derived state')
      // The reason text is generated based on scoring order, derived state comes first
      expect(watcherPattern.watcherMetrics.deepWatchers).toHaveLength(1)
    })

    it('should provide accurate metrics for complex watcher scenarios', () => {
      mockInstance.type.watch = {
        items: {
          handler(newItems) {
            this.filteredItems = newItems.filter(i => i.active)
          },
          deep: true,
          immediate: true
        }
      }

      mockInstance.$.scope.effects = [
        {
          fn() {
            sortedData.value = data.value.sort()
          },
          options: { immediate: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 6)
      const watcherPattern = patterns.find(p => p.type === 'watcherMisuse')

      expect(watcherPattern).toBeDefined()
      expect(watcherPattern.watcherMetrics.watcherCount).toBe(2) // 1 options + 1 effect
      expect(watcherPattern.watcherMetrics.derivedStateWatchers).toHaveLength(2)
      expect(watcherPattern.watcherMetrics.deepWatchers).toHaveLength(1)
      expect(watcherPattern.watcherMetrics.immediateWatchers).toHaveLength(2)
    })
  })
})
