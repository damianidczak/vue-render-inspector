/* eslint-disable no-undef */
import { describe, it, expect, beforeEach } from 'vitest'
import { detectEnhancedPatterns } from '../../../src/patterns/index.js'

describe('Enhanced Deep Watcher Detection', () => {
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
      unnecessaryRenderPercent: 0,
      triggerMechanism: null
    }
  })

  describe('Vue 3 Effects Analysis', () => {
    it('should detect deep watchers in Vue 3 effects', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Deep watcher effect
            processedData.value = rawData.value.items.filter(item => item.active)
          },
          options: { deep: true }
        },
        {
          fn() {
            // Another deep watcher
            summary.value = complexObject.value.data.reduce((acc, item) => acc + item.value, 0)
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.deepWatchers).toHaveLength(2)
      expect(deepWatcherPattern.watcherMetrics.watcherCount).toBe(2)
      expect(deepWatcherPattern.reason).toContain('2 deep watchers detected')
      expect(deepWatcherPattern.detectionMethod).toBe('complexity-analysis')
    })

    it('should analyze effect complexity correctly', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // High complexity effect with array operations
            results.value = data.value.items
              .filter(item => item.status === 'active')
              .map(item => ({ ...item, processed: true }))
              .reduce((acc, item) => {
                acc[item.category] = acc[item.category] || []
                acc[item.category].push(item)
                return acc
              }, {})
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 12)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.objectComplexity).toBeGreaterThan(50)
      expect(deepWatcherPattern.reason).toContain('watching highly complex objects')
      expect(deepWatcherPattern.severity).toBe('high')
    })

    it('should detect unnecessary deep watchers (derived state)', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // This should be a computed property instead
            filteredItems.value = items.value.filter(item => item.active)
            sortedItems.value = items.value.sort((a, b) => a.name.localeCompare(b.name))
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 6)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.deepWatchers[0].isUnnecessary).toBe(true)
      expect(deepWatcherPattern.watcherMetrics.deepWatchers[0].alternatives).toContain(
        'computed-property'
      )
      expect(deepWatcherPattern.codeGeneration).toContain('computed properties for derived state')
    })

    it('should calculate memory impact correctly', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // High memory impact pattern
            largeDataset.value.forEach(item => {
              item.metadata = processMetadata(item.rawData)
              item.computed = expensiveCalculation(item.values)
            })
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.memoryImpact).toBeGreaterThan(50)
      expect(deepWatcherPattern.reason).toContain('moderate memory impact')
    })
  })

  describe('Options-Style Watchers Analysis', () => {
    it('should detect deep watchers in options-style watch', () => {
      mockInstance.type.watch = {
        complexData: {
          handler(newData, _oldData) {
            this.processedData = newData.items.map(item => ({
              ...item,
              formatted: this.formatItem(item)
            }))
          },
          deep: true,
          immediate: true
        },
        userProfile: {
          handler(newProfile) {
            this.validationErrors = this.validateProfile(newProfile)
          },
          deep: true
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 10)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.deepWatchers).toHaveLength(2)
      expect(deepWatcherPattern.watcherMetrics.deepWatchers[0].watchedProperty).toBe('complexData')
      expect(deepWatcherPattern.watcherMetrics.deepWatchers[1].watchedProperty).toBe('userProfile')
    })

    it('should analyze watched property complexity', () => {
      // Mock complex prop data
      mockInstance.props = {
        largeDataset: {
          users: new Array(100).fill({ profile: { settings: { theme: 'dark' } } }),
          metadata: { version: 1, timestamp: Date.now() },
          config: { features: { advanced: true, beta: false } }
        }
      }

      mockInstance.type.watch = {
        largeDataset: {
          handler(newData) {
            this.summary = this.generateSummary(newData)
          },
          deep: true
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.objectComplexity).toBeGreaterThan(20)
    })

    it('should detect derived state patterns in options watchers', () => {
      mockInstance.type.watch = {
        items: {
          handler(newItems) {
            // Derived state - should be computed
            this.filteredItems = newItems.filter(item => item.active)
            this.itemCount = newItems.length
            this.hasActiveItems = newItems.some(item => item.active)
          },
          deep: true
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 6)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.deepWatchers[0].isUnnecessary).toBe(true)
      expect(deepWatcherPattern.codeGeneration).toContain(
        'Use computed properties for derived state'
      )
    })

    it('should distinguish side effects from derived state', () => {
      mockInstance.type.watch = {
        userData: {
          handler(newUser) {
            // Valid side effects
            this.$emit('user-changed', newUser)
            localStorage.setItem('currentUser', JSON.stringify(newUser))
            fetch('/api/user/update', { method: 'POST', body: JSON.stringify(newUser) })
          },
          deep: true
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 6)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.deepWatchers[0].isUnnecessary).toBe(false)
      // Should still suggest specific property watching even for side effects
      expect(deepWatcherPattern.codeGeneration).toContain('Watch specific properties')
    })
  })

  describe('Setup Function Analysis', () => {
    it('should detect deep watch calls in setup function', () => {
      mockInstance.type.setup = function () {
        const data = ref({ complex: { nested: { structure: true } } })
        const result = ref(null)

        watch(
          data,
          newData => {
            result.value = processComplexData(newData)
          },
          { deep: true }
        )

        watch(
          userState,
          newState => {
            handleUserStateChange(newState)
          },
          { deep: true }
        )
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.deepWatchers).toHaveLength(2)
      expect(
        deepWatcherPattern.watcherMetrics.deepWatchers.some(w => w.watchedSource === 'data')
      ).toBe(true)
      expect(
        deepWatcherPattern.watcherMetrics.deepWatchers.some(w => w.watchedSource === 'userState')
      ).toBe(true)
    })

    it('should detect derived state patterns in setup watchers', () => {
      mockInstance.type.setup = function () {
        const items = ref([])
        const filteredItems = ref([])

        watch(
          items,
          newItems => {
            filteredItems.value = newItems.filter(item => item.active)
          },
          { deep: true }
        )
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 6)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.deepWatchers[0].isUnnecessary).toBe(true)
    })

    it('should handle complex setup functions with multiple patterns', () => {
      mockInstance.type.setup = function () {
        const state = reactive({ user: null, settings: {} })
        const _computed1 = computed(() => state.user?.name || 'Anonymous')

        // Multiple deep watchers
        watch(
          state,
          newState => {
            processedState.value = newState.items.map(item => ({ ...item, processed: true }))
          },
          { deep: true }
        )

        watch(
          () => state.user,
          newUser => {
            userAnalytics.value = analyzeUser(newUser)
          },
          { deep: true }
        )

        watch(
          globalSettings,
          settings => {
            applyGlobalSettings(settings)
          },
          { deep: true }
        )
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 10)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.deepWatchers).toHaveLength(3)
      expect(deepWatcherPattern.watcherMetrics.watcherCount).toBe(3)
    })
  })

  describe('Performance Correlation Analysis', () => {
    it('should correlate slow renders with deep watchers', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            expensiveOperation(complexData.value)
          },
          options: { deep: true }
        },
        {
          fn() {
            anotherExpensiveOperation(moreData.value)
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 18) // Slow render
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.detectionMethod).toBe('performance-correlation')
      expect(deepWatcherPattern.reason).toContain('slow renders')
      expect(deepWatcherPattern.severity).toBe('high')
    })

    it('should correlate unnecessary renders with deep watchers', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            processData(largeObject.value)
          },
          options: { deep: true }
        }
      ]
      mockSnapshot.unnecessaryRenderPercent = 65
      mockSnapshot.isUnnecessary = true

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.reason).toContain('65% unnecessary renders')
    })

    it('should detect state trigger mechanism correlation', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            handleStateChange(appState.value)
          },
          options: { deep: true }
        }
      ]
      mockSnapshot.triggerMechanism = 'state'
      mockSnapshot.isUnnecessary = true

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.reason).toContain('state changes triggering deep watcher overhead')
    })
  })

  describe('Severity Classification', () => {
    it('should classify as high severity for multiple deep watchers', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            process1(data1.value)
          },
          options: { deep: true }
        },
        {
          fn() {
            process2(data2.value)
          },
          options: { deep: true }
        },
        {
          fn() {
            process3(data3.value)
          },
          options: { deep: true }
        },
        {
          fn() {
            process4(data4.value)
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.severity).toBe('high')
      expect(deepWatcherPattern.detectionMethod).toBe('complexity-analysis')
    })

    it('should classify as high severity for highly complex objects', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Simulate highly complex operations
            largeDataset.value.forEach(item => {
              item.metadata.processed = processItem(item.data)
              item.analytics = generateAnalytics(item.history)
              item.recommendations = computeRecommendations(item.preferences)
            })
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.severity).toBe('high')
      expect(deepWatcherPattern.watcherMetrics.objectComplexity).toBeGreaterThan(50)
    })

    it('should classify as medium severity for memory analysis', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Moderate memory impact
            processedData.value = rawData.value.map(item => ({
              ...item,
              processed: new Date()
            }))
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.severity).toBe('medium')
      expect(deepWatcherPattern.detectionMethod).toBe('pattern-analysis')
    })
  })

  describe('Code Generation', () => {
    it('should generate fixes for unnecessary deep watchers', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Derived state pattern
            filteredItems.value = items.value.filter(item => item.active)
            sortedItems.value = items.value.sort((a, b) => a.name.localeCompare(b.name))
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern.codeGeneration).toBeDefined()
      expect(deepWatcherPattern.codeGeneration).toContain('❌ Bad: Deep watching for derived state')
      expect(deepWatcherPattern.codeGeneration).toContain(
        '✅ Good: Use computed properties for derived state'
      )
      expect(deepWatcherPattern.codeGeneration).toContain('const processedData = computed(')
    })

    it('should generate fixes for complex object watching', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Complex object processing
            complexObject.value.users.forEach(user => {
              user.metadata = processUserMetadata(user)
            })
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern.codeGeneration).toContain('❌ Bad: Deep watching complex objects')
      expect(deepWatcherPattern.codeGeneration).toContain('✅ Good: Watch specific properties')
      expect(deepWatcherPattern.codeGeneration).toContain(
        '() => complexObject.value.user.profile.settings.theme'
      )
    })

    it('should generate advanced optimization patterns for memory-intensive scenarios', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // High memory impact
            largeDataset.value.forEach(item => {
              item.computed = expensiveComputation(item)
              item.analytics = generateAnalytics(item)
              item.metadata = processMetadata(item)
            })
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern.codeGeneration).toContain(
        'Advanced optimization for memory-intensive scenarios'
      )
      expect(deepWatcherPattern.codeGeneration).toContain('shallowRef')
      expect(deepWatcherPattern.codeGeneration).toContain('triggerRef')
      expect(deepWatcherPattern.codeGeneration).toContain('watchEffect')
    })

    it('should include performance optimization tips', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            processData(data.value)
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern.codeGeneration).toContain('Performance optimization tips:')
      expect(deepWatcherPattern.codeGeneration).toContain(
        'Use computed properties for derived state'
      )
      expect(deepWatcherPattern.codeGeneration).toContain(
        'Watch specific properties instead of deep watching'
      )
      expect(deepWatcherPattern.codeGeneration).toContain('Use shallowRef for large objects')
      expect(deepWatcherPattern.codeGeneration).toContain('Consider debouncing watchers')
    })

    it('should include memory optimization patterns', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // High memory pattern
            massiveDataset.value.forEach(item => {
              processItem(item)
            })
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern.codeGeneration).toContain('Memory optimization patterns:')
      expect(deepWatcherPattern.codeGeneration).toContain('import { debounce }')
      expect(deepWatcherPattern.codeGeneration).toContain('const debouncedWatcher = debounce')
    })
  })

  describe('Detection Thresholds', () => {
    it('should not trigger for components without deep watchers', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            console.log('normal watcher')
          },
          options: { immediate: true } // Not deep
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeUndefined()
    })

    it('should require minimum score threshold to trigger', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Single simple deep watcher
            simpleData.value = processSimple(input.value)
          },
          options: { deep: true }
        }
      ]

      // Low impact scenario should not trigger
      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 3)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeUndefined()
    })

    it('should trigger with sufficient complexity or performance impact', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            processedData.value = rawData.value.items
              .filter(item => item.active)
              .map(item => processItem(item))
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing effects gracefully', () => {
      mockInstance.$ = null

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      }).not.toThrow()

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeUndefined()
    })

    it('should handle malformed watcher functions', () => {
      mockInstance.$.scope.effects = [
        {
          fn: null,
          options: { deep: true }
        },
        {
          options: { deep: true }
          // Missing fn property
        }
      ]

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      }).not.toThrow()
    })

    it('should handle missing snapshot gracefully', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            processData(data.value)
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, null, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.unnecessaryRenderPercent).toBe(0)
    })

    it('should handle circular references in watched objects', () => {
      const circularData = { name: 'test' }
      circularData.self = circularData

      mockInstance.props = {
        circularData
      }

      mockInstance.type.watch = {
        circularData: {
          handler() {
            /* handler */
          },
          deep: true
        }
      }

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      }).not.toThrow()
    })

    it('should handle setup function parsing errors', () => {
      mockInstance.type.setup = 'invalid function string'

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      }).not.toThrow()
    })
  })

  describe('Metrics Accuracy', () => {
    it('should accurately track watcher types and sources', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            processEffect(data.value)
          },
          options: { deep: true }
        }
      ]

      mockInstance.type.watch = {
        userData: {
          handler() {
            /* handler */
          },
          deep: true
        }
      }

      mockInstance.type.setup = function () {
        watch(state, handler, { deep: true })
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.watcherCount).toBe(3)

      const sources = deepWatcherPattern.watcherMetrics.deepWatchers.map(w => w.source)
      expect(sources).toContain('vue3-effect')
      expect(sources).toContain('options-watch')
      expect(sources).toContain('setup-function')
    })

    it('should provide accurate complexity and memory impact calculations', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Complex operations
            result.value = data.value.items
              .filter(item => item.active)
              .map(item => processItem(item))
              .reduce((acc, item) => ({ ...acc, [item.id]: item }), {})
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.objectComplexity).toBeGreaterThan(0)
      expect(deepWatcherPattern.watcherMetrics.memoryImpact).toBeGreaterThan(0)
      expect(deepWatcherPattern.watcherMetrics.performanceScore).toBeGreaterThan(0)
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle mixed watcher types with different complexity levels', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // High complexity
            processedData.value = largeDataset.value.items
              .filter(item => item.status === 'active')
              .map(item => computeExpensiveMetrics(item))
          },
          options: { deep: true }
        }
      ]

      mockInstance.type.watch = {
        simpleData: {
          handler() {
            // Low complexity
            this.count = this.simpleData.length
          },
          deep: true
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 12)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.watcherMetrics.deepWatchers).toHaveLength(2)
      expect(deepWatcherPattern.severity).toBe('high') // High complexity effect should drive severity
    })

    it('should correlate performance issues with deep watcher complexity', () => {
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Very complex operations
            massiveDataset.value.forEach(section => {
              section.items.forEach(item => {
                item.analytics = computeAnalytics(item.history)
                item.recommendations = generateRecommendations(item.preferences)
                item.metadata = processMetadata(item.rawData)
              })
            })
          },
          options: { deep: true }
        }
      ]

      mockSnapshot.unnecessaryRenderPercent = 75
      mockSnapshot.triggerMechanism = 'state'

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 22) // Very slow render
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      expect(deepWatcherPattern.severity).toBe('high')
      expect(deepWatcherPattern.detectionMethod).toBe('performance-correlation')
      expect(deepWatcherPattern.reason).toContain('slow renders')
      expect(deepWatcherPattern.reason).toContain('75% unnecessary renders')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle errors in detect function gracefully', () => {
      // Malformed instance to trigger error handling (lines 116-117)
      const badInstance = {
        uid: 'test-123',
        $: null // This will cause errors when accessing properties
      }

      // Should not throw, should handle gracefully
      expect(() => {
        detectEnhancedPatterns(badInstance, mockSnapshot, 5)
      }).not.toThrow()
    })

    it('should detect very high memory impact (>200)', () => {
      // Create deep watchers with complex operations (lines 370-371)
      // Need functions with complexity patterns to trigger high memory impact
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Pattern: processComplexData (multiplier: 8) + forEach (multiplier: 5)
            return processComplexData(largeObject.forEach(item => item))
          },
          options: { deep: true }
        },
        {
          fn() {
            // Pattern: processComplexData (multiplier: 8) + map (multiplier: 5)
            return processComplexData(items.map(x => x))
          },
          options: { deep: true }
        },
        {
          fn() {
            // Pattern: expensiveOperation (multiplier: 8) + filter (multiplier: 5)
            return expensiveOperation(data.filter(x => x))
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      // With 3 watchers with high complexity, should get high severity
      expect(deepWatcherPattern.severity).toBe('high')
      expect(deepWatcherPattern.watcherMetrics.memoryImpact).toBeGreaterThan(200)
    })

    it('should detect moderate-high memory impact (100-200)', () => {
      // Create deep watchers with moderate complexity (lines 422-426)
      // Need 2 watchers to lower threshold, and moderate complexity for 100-200 range
      mockInstance.$.scope.effects = [
        {
          fn() {
            // Pattern: processComplexData (multiplier: 8) = 80 complexity, 96 memoryImpact
            return processComplexData(data)
          },
          options: { deep: true }
        },
        {
          fn() {
            // Pattern: expensiveOperation (multiplier: 8) = 80 complexity, 96 memoryImpact
            return expensiveOperation(items)
          },
          options: { deep: true }
        }
      ]

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const deepWatcherPattern = patterns.find(p => p.type === 'deepWatchers')

      expect(deepWatcherPattern).toBeDefined()
      // Total memoryImpact: 96 + 96 = 192 (in range 100-200)
      expect(deepWatcherPattern.watcherMetrics.memoryImpact).toBeGreaterThan(100)
      expect(deepWatcherPattern.watcherMetrics.memoryImpact).toBeLessThan(200)
      expect(deepWatcherPattern.severity).toBe('high')
    })
  })

  describe('simpleDetect Function', () => {
    it('should detect deep watchers on large objects', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/deep-watchers.js')

      const largeObject = { data: new Array(500).fill({ value: 1 }) }

      const instance = {
        $: {
          scope: {
            effects: [
              {
                options: { deep: true },
                getter: {
                  toString() {
                    return 'function() { return this.largeObject }'
                  }
                }
              }
            ]
          }
        },
        largeObject
      }

      const result = simpleDetect(instance)

      expect(result).toBe(true)
    })

    it('should not detect when no deep watchers', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/deep-watchers.js')

      const instance = {
        $: {
          scope: {
            effects: [
              {
                options: { deep: false }
              }
            ]
          }
        }
      }

      const result = simpleDetect(instance)

      expect(result).toBe(false)
    })

    it('should not detect when deep watchers on small objects', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/deep-watchers.js')

      const smallObject = { count: 1, name: 'test' }

      const instance = {
        $: {
          scope: {
            effects: [
              {
                options: { deep: true },
                getter: {
                  toString() {
                    return 'function() { return this.smallObject }'
                  }
                }
              }
            ]
          }
        },
        smallObject
      }

      const result = simpleDetect(instance)

      expect(result).toBe(false)
    })

    it('should handle missing getter gracefully', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/deep-watchers.js')

      const instance = {
        $: {
          scope: {
            effects: [
              {
                options: { deep: true }
                // No getter
              }
            ]
          }
        }
      }

      const result = simpleDetect(instance)

      expect(result).toBe(false)
    })
  })
})
