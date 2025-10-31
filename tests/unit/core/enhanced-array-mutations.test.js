import { describe, it, expect, beforeEach } from 'vitest'
import { detectEnhancedPatterns } from '../../../src/patterns/index.js'

describe('Enhanced Array Mutations Detection', () => {
  let mockInstance, mockSnapshot

  beforeEach(() => {
    mockInstance = {
      uid: 'test-123',
      type: {
        name: 'TestComponent',
        methods: {},
        computed: {},
        watch: {},
        setup: null
      }
    }

    mockSnapshot = {
      componentName: 'TestComponent',
      isUnnecessary: false,
      unnecessaryRenderPercent: 0,
      triggerMechanism: null
    }
  })

  describe('Component Methods Analysis', () => {
    it('should detect array mutations in component methods', () => {
      mockInstance.type.methods = {
        addItem(item) {
          this.items.push(item)
          this.tags.unshift('new')
        },
        removeItem(index) {
          this.items.splice(index, 1)
          this.backup.pop()
        },
        sortItems() {
          this.items.sort((a, b) => a.name.localeCompare(b.name))
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.mutationCount).toBe(5)
      expect(arrayMutationPattern.mutationMetrics.mutativeOperations).toHaveLength(5)
      expect(
        arrayMutationPattern.mutationMetrics.mutativeOperations.some(m => m.mutationType === 'push')
      ).toBe(true)
      expect(
        arrayMutationPattern.mutationMetrics.mutativeOperations.some(
          m => m.mutationType === 'splice'
        )
      ).toBe(true)
      expect(
        arrayMutationPattern.mutationMetrics.mutativeOperations.some(m => m.mutationType === 'sort')
      ).toBe(true)
    })

    it('should calculate performance impact correctly', () => {
      mockInstance.type.methods = {
        massUpdate() {
          this.items.splice(0, 5, 'new1', 'new2', 'new3') // High impact
          this.data.sort() // Medium impact
          this.values.push('item') // Low impact
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 12) // High render time
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.performanceImpact).toBeGreaterThan(5)
      expect(arrayMutationPattern.reason).toContain('moderate performance impact')
    })

    it('should ignore non-array mutations', () => {
      mockInstance.type.methods = {
        logData() {
          console.log('test') // Should be ignored
          Math.max(1, 2) // Should be ignored
          JSON.stringify(this.data) // Should be ignored
        },
        updateString() {
          this.text.push // Property access, not method call
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeUndefined()
    })
  })

  describe('Setup Function Analysis', () => {
    it('should detect mutations in setup function', () => {
      mockInstance.type.setup = function () {
        const items = ref([])
        const tags = ref(['initial'])

        function addItem(item) {
          items.value.push(item)
          tags.value.unshift('tag')
        }

        function updateItems() {
          items.value.splice(1, 1)
          items.value[0] = 'updated'
        }

        return { items, tags, addItem, updateItems }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.mutationCount).toBe(4)
      expect(
        arrayMutationPattern.mutationMetrics.mutativeOperations.some(
          m => m.mutationType === 'indexAssignment'
        )
      ).toBe(true)
    })

    it('should detect reactivity issues with index assignment', () => {
      mockInstance.type.setup = function () {
        const items = ref(['a', 'b', 'c'])

        function updateItem(index, value) {
          items.value[index] = value // Reactivity issue
          items.value.length = 2 // Length assignment issue
        }

        return { items, updateItem }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.reactivityIssues).toHaveLength(2)
      expect(
        arrayMutationPattern.mutationMetrics.reactivityIssues.some(
          issue => issue.type === 'index-assignment-reactivity'
        )
      ).toBe(true)
      expect(
        arrayMutationPattern.mutationMetrics.reactivityIssues.some(
          issue => issue.type === 'length-assignment-reactivity'
        )
      ).toBe(true)
    })
  })

  describe('Computed Properties Analysis', () => {
    it('should detect mutations in computed properties', () => {
      mockInstance.type.computed = {
        processedItems: {
          get() {
            const items = this.rawItems.slice()
            items.push('computed-added') // Mutation in computed!
            return items.sort()
          }
        },
        filteredData() {
          const data = this.sourceData
          data.splice(0, 1) // Direct mutation
          return data.filter(item => item.active)
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.mutationCount).toBe(3)
      expect(
        arrayMutationPattern.mutationMetrics.antiPatterns.some(
          pattern => pattern.type === 'computed-mutations'
        )
      ).toBe(true)
      expect(arrayMutationPattern.severity).toBe('high') // Computed mutations are critical
    })
  })

  describe('Watchers Analysis', () => {
    it('should detect mutations in watchers', () => {
      mockInstance.type.watch = {
        sourceData: {
          handler(newData) {
            this.processedData.push(...newData)
            this.history.unshift(Date.now())
          },
          deep: true
        },
        settings(newSettings) {
          this.cache.splice(0, this.cache.length)
          this.queue.pop()
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.mutationCount).toBe(4)
      expect(
        arrayMutationPattern.mutationMetrics.mutativeOperations.some(m => m.source === 'watcher')
      ).toBe(true)
    })
  })

  describe('Anti-Pattern Detection', () => {
    it('should detect excessive mutations on same array', () => {
      mockInstance.type.methods = {
        processArray() {
          this.items.push('1')
          this.items.push('2')
          this.items.push('3')
          this.items.splice(0, 1)
          this.items.sort() // 5 mutations on same array
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(
        arrayMutationPattern.mutationMetrics.antiPatterns.some(
          pattern => pattern.type === 'excessive-mutations'
        )
      ).toBe(true)
      expect(arrayMutationPattern.reason).toContain('anti-patterns detected')
    })

    it('should detect computed mutations anti-pattern', () => {
      mockInstance.type.computed = {
        badComputed() {
          this.items.push('bad') // Mutation in computed
          return this.items.length
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(
        arrayMutationPattern.mutationMetrics.antiPatterns.some(
          pattern => pattern.type === 'computed-mutations'
        )
      ).toBe(true)
      expect(arrayMutationPattern.severity).toBe('high')
    })
  })

  describe('Severity Classification', () => {
    it('should classify as high severity for multiple mutations', () => {
      mockInstance.type.methods = {
        method1() {
          this.arr1.push(1)
          this.arr2.splice(0, 1)
        },
        method2() {
          this.arr3.pop()
          this.arr4.sort()
        },
        method3() {
          this.arr5.reverse()
          this.arr6.unshift(1)
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.severity).toBe('high')
      expect(arrayMutationPattern.detectionMethod).toBe('reactivity-analysis')
    })

    it('should classify as high severity for anti-patterns', () => {
      mockInstance.type.computed = {
        badComputed() {
          this.items.push('bad')
          return this.items
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 15) // High render time
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.severity).toBe('high')
      expect(arrayMutationPattern.detectionMethod).toBe('performance-analysis')
    })

    it('should classify as medium severity for reactivity issues', () => {
      mockInstance.type.methods = {
        updateItem() {
          this.items[0] = 'new' // Index assignment
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.severity).toBe('medium')
      expect(arrayMutationPattern.detectionMethod).toBe('mutation-analysis')
    })
  })

  describe('Performance Correlation', () => {
    it('should correlate mutations with slow renders', () => {
      mockInstance.type.methods = {
        slowUpdate() {
          this.largeArray.splice(100, 50) // Expensive operation
          this.data.sort()
          this.items.push('additional') // Add more mutations
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 20) // Very slow render
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.performanceImpact).toBeGreaterThanOrEqual(4)
      expect(arrayMutationPattern.mutationMetrics.mutationCount).toBeGreaterThan(1)
    })

    it('should correlate with unnecessary renders', () => {
      mockInstance.type.methods = {
        triggerUpdate() {
          this.items.push('trigger')
        }
      }
      mockSnapshot.unnecessaryRenderPercent = 65

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.reason).toContain('65% unnecessary renders')
    })
  })

  describe('Immutable Alternatives', () => {
    it('should suggest correct immutable alternatives', () => {
      mockInstance.type.methods = {
        mutateArrays() {
          this.items.push('new')
          this.data.splice(1, 1)
          this.sorted.sort()
          this.list[0] = 'updated'
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.immutableAlternatives).toHaveLength(4)
      expect(
        arrayMutationPattern.mutationMetrics.immutableAlternatives.some(alt =>
          alt.suggestion.includes('[...items, newItem]')
        )
      ).toBe(true)
      expect(
        arrayMutationPattern.mutationMetrics.immutableAlternatives.some(alt =>
          alt.suggestion.includes('toSpliced()')
        )
      ).toBe(true)
    })
  })

  describe('Code Generation', () => {
    it('should generate basic mutation fixes', () => {
      mockInstance.type.methods = {
        updateArray() {
          this.items.push('new')
          this.data.splice(0, 1)
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern.codeGeneration).toBeDefined()
      expect(arrayMutationPattern.codeGeneration).toContain('❌ Bad: Direct array mutations')
      expect(arrayMutationPattern.codeGeneration).toContain('✅ Good: Immutable updates')
      expect(arrayMutationPattern.codeGeneration).toContain('[...items.value, 4]')
      expect(arrayMutationPattern.codeGeneration).toContain('filter((_, i) => i !== 1)')
    })

    it('should generate index assignment fixes', () => {
      mockInstance.type.methods = {
        updateItem() {
          this.items[0] = 'updated'
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern.codeGeneration).toContain(
        'Fix index assignment reactivity issues'
      )
      expect(arrayMutationPattern.codeGeneration).toContain('array.with()')
      expect(arrayMutationPattern.codeGeneration).toContain('Spread syntax')
      expect(arrayMutationPattern.codeGeneration).toContain('Array.from with mapping')
    })

    it('should generate batch update patterns for excessive mutations', () => {
      mockInstance.type.methods = {
        excessiveMutations() {
          this.items.push('1')
          this.items.push('2')
          this.items.push('3')
          this.items.push('4') // Triggers excessive mutations
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern.codeGeneration).toContain(
        'Fix excessive mutations with batch updates'
      )
      expect(arrayMutationPattern.codeGeneration).toContain('Single batch update')
      expect(arrayMutationPattern.codeGeneration).toContain('[...items.value, ...newItems]')
    })

    it('should generate computed property fixes', () => {
      mockInstance.type.computed = {
        badComputed() {
          this.items.push('mutation')
          return this.items
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern.codeGeneration).toContain('Fix mutations in computed properties')
      expect(arrayMutationPattern.codeGeneration).toContain(
        'Pure computed with immutable operations'
      )
      expect(arrayMutationPattern.codeGeneration).toContain('reactive transforms')
    })

    it('should include Vue 3 best practices', () => {
      mockInstance.type.methods = {
        updateArray() {
          this.items.push('item')
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern.codeGeneration).toContain('Vue 3 array reactivity best practices')
      expect(arrayMutationPattern.codeGeneration).toContain('Always use immutable array methods')
      expect(arrayMutationPattern.codeGeneration).toContain('array.with() for single item updates')
      expect(arrayMutationPattern.codeGeneration).toContain('Consider using Pinia')
    })

    it('should include performance optimization patterns', () => {
      mockInstance.type.methods = {
        updateLargeArray() {
          this.largeData.push('item')
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern.codeGeneration).toContain(
        'Performance optimization for large arrays'
      )
      expect(arrayMutationPattern.codeGeneration).toContain('shallowRef')
      expect(arrayMutationPattern.codeGeneration).toContain('triggerRef')
    })
  })

  describe('Detection Thresholds', () => {
    it('should not trigger for components without mutations', () => {
      mockInstance.type.methods = {
        safeMethod() {
          return this.items.map(item => item.name)
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeUndefined()
    })

    it('should require minimum score threshold to trigger', () => {
      mockInstance.type.methods = {
        singleMutation() {
          this.items.push('single') // Low impact, should not trigger
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 3) // Low render time
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined() // Should trigger with score of 2
      expect(arrayMutationPattern.severity).toBe('medium')
    })

    it('should trigger with sufficient mutation count', () => {
      mockInstance.type.methods = {
        multipleMutations() {
          this.items.push('1')
          this.items.push('2')
          this.data.pop()
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.mutationCount).toBe(3)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing component methods gracefully', () => {
      mockInstance.type.methods = null

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      }).not.toThrow()

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeUndefined()
    })

    it('should handle malformed methods gracefully', () => {
      mockInstance.type.methods = {
        invalidMethod: null,
        validMethod() {
          this.items.push('test')
        }
      }

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      }).not.toThrow()

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.mutationCount).toBe(1)
    })

    it('should handle missing snapshot gracefully', () => {
      mockInstance.type.methods = {
        updateArray() {
          this.items.push('test')
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, null, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(
        arrayMutationPattern.mutationMetrics.reactivityIssues.filter(
          issue => issue.type === 'unnecessary-render-correlation'
        )
      ).toHaveLength(0)
    })

    it('should handle complex function strings', () => {
      mockInstance.type.methods = {
        complexMethod() {
          // Complex method with comments and formatting
          const items = this.data.items
          if (items && items.length > 0) {
            items.push('new item') // This should be detected
          }
          return items.map(item => item.name)
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.mutationCount).toBe(1)
    })

    it('should handle setup function parsing errors', () => {
      mockInstance.type.setup = 'invalid function string'

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      }).not.toThrow()
    })
  })

  describe('Mutation Type Coverage', () => {
    it('should detect all mutation types', () => {
      mockInstance.type.methods = {
        allMutations() {
          this.arr1.push('item') // push
          this.arr2.pop() // pop
          this.arr3.shift() // shift
          this.arr4.unshift('item') // unshift
          this.arr5.splice(1, 1) // splice
          this.arr6.sort() // sort
          this.arr7.reverse() // reverse
          this.arr8[0] = 'new' // index assignment
          this.arr9.length = 5 // length assignment
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.mutationCount).toBe(9)

      const mutationTypes = arrayMutationPattern.mutationMetrics.mutativeOperations.map(
        m => m.mutationType
      )
      expect(mutationTypes).toContain('push')
      expect(mutationTypes).toContain('pop')
      expect(mutationTypes).toContain('shift')
      expect(mutationTypes).toContain('unshift')
      expect(mutationTypes).toContain('splice')
      expect(mutationTypes).toContain('sort')
      expect(mutationTypes).toContain('reverse')
      expect(mutationTypes).toContain('indexAssignment')
      expect(mutationTypes).toContain('lengthAssignment')
    })

    it('should assign correct severity levels to mutations', () => {
      mockInstance.type.methods = {
        severityTest() {
          this.arr1.push('item') // medium
          this.arr2.splice(1, 1) // high
          this.arr3[0] = 'new' // high
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()

      const highSeverityMutations = arrayMutationPattern.mutationMetrics.mutativeOperations.filter(
        m => m.severity === 'high'
      )
      const mediumSeverityMutations =
        arrayMutationPattern.mutationMetrics.mutativeOperations.filter(m => m.severity === 'medium')

      expect(highSeverityMutations).toHaveLength(2)
      expect(mediumSeverityMutations).toHaveLength(1)
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle Vue 3 composition API patterns', () => {
      mockInstance.type.setup = function () {
        const items = ref([])
        const filteredItems = ref([])

        const addItem = item => {
          items.value.push(item) // Mutation
        }

        const removeItem = index => {
          items.value.splice(index, 1) // Mutation
        }

        watch(items, newItems => {
          filteredItems.value.splice(0, filteredItems.value.length) // Clear array
          filteredItems.value.push(...newItems.filter(item => item.active)) // Add filtered
        })

        return { items, filteredItems, addItem, removeItem }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.mutationCount).toBe(4)
      expect(arrayMutationPattern.severity).toBe('high') // Multiple mutations
    })

    it('should handle options API with mixed patterns', () => {
      mockInstance.type.methods = {
        updateData() {
          this.items.push(this.newItem)
          this.sortItems()
        },
        sortItems() {
          this.items.sort((a, b) => a.name.localeCompare(b.name))
        }
      }

      mockInstance.type.computed = {
        processedItems() {
          // Bad: mutation in computed
          const items = this.rawItems.slice()
          items.push('computed-item')
          return items
        }
      }

      mockInstance.type.watch = {
        filter(newFilter) {
          // Update filtered items
          this.filteredItems.splice(0, this.filteredItems.length)
          this.filteredItems.push(...this.items.filter(item => item.category === newFilter))
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayMutationPattern = patterns.find(p => p.type === 'arrayMutations')

      expect(arrayMutationPattern).toBeDefined()
      expect(arrayMutationPattern.mutationMetrics.mutationCount).toBe(5)
      expect(
        arrayMutationPattern.mutationMetrics.antiPatterns.some(p => p.type === 'computed-mutations')
      ).toBe(true)
      expect(arrayMutationPattern.severity).toBe('high')
    })
  })

  describe('simpleDetect Function', () => {
    it('should detect array mutations from propsDiff', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/array-mutations.js')

      const snapshot = {
        propsDiff: {
          changed: {
            items: {
              from: [1, 2, 3],
              to: [1, 2, 4], // Same length but different content = in-place mutation
              sameReference: true // Same array reference = mutation
            }
          }
        }
      }

      const result = simpleDetect(null, snapshot)

      expect(result).toBe(true)
    })

    it('should not detect when arrays have different references', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/array-mutations.js')

      const snapshot = {
        propsDiff: {
          changed: {
            items: {
              from: [1, 2, 3],
              to: [1, 2, 3, 4],
              sameReference: false // Different reference = no mutation
            }
          }
        }
      }

      const result = simpleDetect(null, snapshot)

      expect(result).toBe(false)
    })

    it('should not detect when values are not arrays', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/array-mutations.js')

      const snapshot = {
        propsDiff: {
          changed: {
            count: {
              from: 5,
              to: 10,
              sameReference: false
            }
          }
        }
      }

      const result = simpleDetect(null, snapshot)

      expect(result).toBe(false)
    })

    it('should handle missing snapshot gracefully', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/array-mutations.js')

      const result = simpleDetect(null, null)

      expect(result).toBe(false)
    })

    it('should handle missing propsDiff gracefully', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/array-mutations.js')

      const snapshot = {}

      const result = simpleDetect(null, snapshot)

      expect(result).toBe(false)
    })
  })
})
