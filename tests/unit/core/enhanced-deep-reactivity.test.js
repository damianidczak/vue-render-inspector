import { describe, it, expect, beforeEach } from 'vitest'
import { detectEnhancedPatterns } from '../../../src/patterns/index.js'

describe('Enhanced Deep Reactivity Detection', () => {
  let mockInstance, mockSnapshot

  beforeEach(() => {
    mockInstance = {
      uid: 'test-123',
      type: {
        name: 'TestComponent'
      }
    }

    mockSnapshot = {
      componentName: 'TestComponent',
      props: null
    }
  })

  describe('Large Object Detection', () => {
    it('should detect large objects with many properties', () => {
      // Create a large object with >50 properties
      const largeObject = {}
      for (let i = 0; i < 60; i++) {
        largeObject[`prop${i}`] = `value${i}`
      }

      mockSnapshot.props = {
        userData: largeObject,
        config: { theme: 'dark' } // Small object
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const deepReactivityPattern = patterns.find(p => p.type === 'deepReactivityMisuse')

      expect(deepReactivityPattern).toBeDefined()
      expect(deepReactivityPattern.metrics.largeObjects).toBe(1)
      expect(deepReactivityPattern.metrics.estimatedNodes).toBeGreaterThan(50)
      expect(deepReactivityPattern.reason).toContain('1 large objects (>50 properties)')
    })

    it('should detect deeply nested objects', () => {
      const deeplyNested = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  data: 'deep value'
                }
              }
            }
          }
        }
      }

      mockSnapshot.props = {
        complexData: deeplyNested
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const deepReactivityPattern = patterns.find(p => p.type === 'deepReactivityMisuse')

      expect(deepReactivityPattern).toBeDefined()
      expect(deepReactivityPattern.metrics.deepNesting).toBeGreaterThan(0)
      expect(deepReactivityPattern.metrics.objectDepth).toBeGreaterThan(4)
      expect(deepReactivityPattern.reason).toContain('deeply nested objects')
    })

    it('should detect large arrays', () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        metadata: { created: new Date() }
      }))

      mockSnapshot.props = {
        items: largeArray,
        categories: ['a', 'b', 'c']
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const deepReactivityPattern = patterns.find(p => p.type === 'deepReactivityMisuse')

      expect(deepReactivityPattern).toBeDefined()
      expect(deepReactivityPattern.metrics.arrayProperties).toBeGreaterThanOrEqual(2)
      expect(deepReactivityPattern.reason).toContain('array properties')
    })

    it('should detect mixed complexity indicators', () => {
      const complexData = {
        users: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          profile: {
            personal: { name: `User ${i}`, age: 20 + i },
            settings: { theme: 'dark', notifications: true }
          }
        })),
        metadata: {
          deep: {
            nested: {
              config: {
                values: { setting1: true, setting2: false }
              }
            }
          }
        }
      }

      mockSnapshot.props = {
        complexData,
        simpleString: 'hello'
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 15)
      const deepReactivityPattern = patterns.find(p => p.type === 'deepReactivityMisuse')

      expect(deepReactivityPattern).toBeDefined()
      expect(deepReactivityPattern.severity).toBe('medium') // Should be medium due to render time
      expect(deepReactivityPattern.metrics.arrayProperties).toBeGreaterThan(0)
      expect(deepReactivityPattern.metrics.deepNesting).toBeGreaterThan(0)
      expect(deepReactivityPattern.metrics.estimatedNodes).toBeGreaterThan(100)
    })
  })

  describe('Performance Impact Analysis', () => {
    it('should escalate severity based on render time and complexity', () => {
      const complexObject = {}
      for (let i = 0; i < 100; i++) {
        complexObject[`field${i}`] = { data: Array.from({ length: 10 }, (_, j) => j) }
      }

      mockSnapshot.props = {
        massiveData: complexObject
      }

      // High render time + high complexity = high severity
      let patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 25)
      let pattern = patterns.find(p => p.type === 'deepReactivityMisuse')
      expect(pattern.severity).toBe('high')

      // Medium render time + high complexity = still high severity due to estimated nodes
      patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 12)
      pattern = patterns.find(p => p.type === 'deepReactivityMisuse')
      expect(pattern.severity).toBe('high') // Still high due to estimated nodes > 500

      // Low render time + low complexity = low severity
      mockSnapshot.props = { simple: { data: 'test' } }
      patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 3)
      pattern = patterns.find(p => p.type === 'deepReactivityMisuse')
      if (pattern) {
        expect(pattern.severity).toBe('low')
      }
    })

    it('should consider render time in performance impact assessment', () => {
      const moderatelyComplexData = {}
      for (let i = 0; i < 30; i++) {
        moderatelyComplexData[`prop${i}`] = { value: i }
      }

      mockSnapshot.props = {
        data: moderatelyComplexData
      }

      // Should trigger due to slow render + moderate complexity
      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const pattern = patterns.find(p => p.type === 'deepReactivityMisuse')

      expect(pattern).toBeDefined()
      expect(pattern.reason).toContain('slow render time (8.0ms)')
    })
  })

  describe('Immutable Data Detection', () => {
    it('should detect immutable objects being recreated', () => {
      mockSnapshot.propsDiff = {
        changed: {
          config: {
            from: { theme: 'dark', locale: 'en' },
            to: { theme: 'dark', locale: 'en' },
            deepEqual: true,
            sameReference: false
          },
          settings: {
            from: { notifications: true, privacy: 'public' },
            to: { notifications: true, privacy: 'public' },
            deepEqual: true,
            sameReference: false
          },
          metadata: {
            from: { version: '1.0', build: 123 },
            to: { version: '1.0', build: 123 },
            deepEqual: true,
            sameReference: false
          }
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const pattern = patterns.find(p => p.type === 'deepReactivityMisuse')

      expect(pattern).toBeDefined()
      expect(pattern.reason).toContain('Immutable objects being re-created')
      expect(pattern.reason).toContain('config, settings, metadata')
      expect(pattern.suggestion).toContain('shallowRef for immutable data')
      expect(pattern.metrics.immutableProps).toBe(3)
    })

    it('should not trigger for small number of immutable objects', () => {
      mockSnapshot.propsDiff = {
        changed: {
          config: {
            from: { theme: 'dark' },
            to: { theme: 'dark' },
            deepEqual: true,
            sameReference: false
          }
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const pattern = patterns.find(p => p.type === 'deepReactivityMisuse')

      expect(pattern).toBeUndefined()
    })
  })

  describe('Suggestion Generation', () => {
    it('should generate specific suggestions based on data patterns', () => {
      // Test different scenarios and their specific suggestions
      const scenarios = [
        {
          props: {
            largeArray: Array.from({ length: 100 }, (_, i) => i),
            largeObject: Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`key${i}`, i]))
          },
          expectedSuggestion: 'Use shallowRef for large objects and arrays'
        },
        {
          props: {
            items: Array.from({ length: 200 }, (_, i) => ({ id: i }))
          },
          expectedSuggestion: 'Use shallowRef for large objects and arrays' // Because complex array has nested objects
        },
        {
          props: {
            deepData: {
              level1: { level2: { level3: { level4: { level5: 'deep' } } } }
            }
          },
          expectedSuggestion: 'Use shallowReactive for deeply nested objects'
        }
      ]

      scenarios.forEach(({ props, expectedSuggestion }) => {
        mockSnapshot.props = props
        const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
        const pattern = patterns.find(p => p.type === 'deepReactivityMisuse')

        expect(pattern).toBeDefined()
        expect(pattern.suggestion).toContain(expectedSuggestion.split('.')[0])
      })
    })
  })

  describe('Code Generation', () => {
    it('should generate appropriate code for different scenarios', () => {
      const scenarios = [
        {
          name: 'Large arrays',
          props: {
            items: Array.from({ length: 100 }, (_, i) => ({ id: i }))
          },
          expectedCode: ['shallowRef([', 'largeArray.value = [...largeArray.value, newItem]']
        },
        {
          name: 'Large objects',
          props: {
            data: Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`key${i}`, i]))
          },
          expectedCode: ['shallowReactive({', 'users: [],', 'settings: {}']
        },
        {
          name: 'Deep nesting',
          props: {
            nested: {
              level1: { level2: { level3: { level4: { level5: 'data' } } } }
            }
          },
          expectedCode: ['shallowRef({', '...state.value,', 'nested: {']
        }
      ]

      scenarios.forEach(({ name, props, expectedCode }) => {
        mockSnapshot.props = props
        const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
        const pattern = patterns.find(p => p.type === 'deepReactivityMisuse')

        expect(pattern, `${name} should be detected`).toBeDefined()
        expect(pattern.codeGeneration, `${name} should have code generation`).toBeDefined()

        expectedCode.forEach(codeSnippet => {
          expect(pattern.codeGeneration, `${name} should contain: ${codeSnippet}`).toContain(
            codeSnippet
          )
        })
      })
    })

    it('should include import statements in generated code', () => {
      mockSnapshot.props = {
        largeData: Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`prop${i}`, i]))
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const pattern = patterns.find(p => p.type === 'deepReactivityMisuse')

      expect(pattern.codeGeneration).toContain('import { shallowRef, shallowReactive, triggerRef }')
      expect(pattern.codeGeneration).toContain(
        '// Convert to shallow reactivity for better performance'
      )
    })
  })

  describe('Threshold Testing', () => {
    it('should not trigger for simple objects', () => {
      mockSnapshot.props = {
        simple: { name: 'test', value: 123 },
        config: { theme: 'dark' }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 2)
      const pattern = patterns.find(p => p.type === 'deepReactivityMisuse')

      expect(pattern).toBeUndefined()
    })

    it('should trigger when exceeding prop count threshold', () => {
      // Create exactly 16 props to exceed the 15-prop threshold
      const manyProps = {}
      for (let i = 0; i < 16; i++) {
        manyProps[`prop${i}`] = `value${i}`
      }

      mockSnapshot.props = manyProps

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 3)
      const pattern = patterns.find(p => p.type === 'deepReactivityMisuse')

      expect(pattern).toBeDefined()
      expect(pattern.metrics.totalProps).toBe(16)
    })

    it('should handle edge cases gracefully', () => {
      // Test with null/undefined props
      mockSnapshot.props = null

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      }).not.toThrow()

      // Test with empty props
      mockSnapshot.props = {}
      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const pattern = patterns.find(p => p.type === 'deepReactivityMisuse')

      expect(pattern).toBeUndefined()
    })

    it('should handle circular references in props', () => {
      const circularObj = { name: 'test' }
      circularObj.self = circularObj

      mockSnapshot.props = {
        circular: circularObj
      }

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      }).not.toThrow()
    })
  })

  describe('Metrics Accuracy', () => {
    it('should accurately count nested objects', () => {
      const testObject = {
        users: [
          { id: 1, profile: { name: 'John', settings: { theme: 'dark' } } },
          { id: 2, profile: { name: 'Jane', settings: { theme: 'light' } } }
        ],
        config: {
          app: { name: 'Test', version: '1.0' },
          ui: { theme: 'auto', lang: 'en' }
        }
      }

      mockSnapshot.props = {
        data: testObject
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const pattern = patterns.find(p => p.type === 'deepReactivityMisuse')

      expect(pattern).toBeDefined()
      expect(pattern.metrics.estimatedNodes).toBeGreaterThan(10)
      expect(pattern.metrics.arrayProperties).toBe(1)
      expect(pattern.metrics.objectDepth).toBeGreaterThan(2)
    })

    it('should count arrays in nested objects recursively', () => {
      // This test targets lines 196-198 (hasArrays tracking in recursive analysis)
      const deepNestedWithArrays = {
        level1: {
          items: [1, 2, 3],
          level2: {
            tags: ['a', 'b', 'c'],
            level3: {
              values: [10, 20, 30]
            }
          }
        }
      }

      mockSnapshot.props = {
        data: deepNestedWithArrays
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const pattern = patterns.find(p => p.type === 'deepReactivityMisuse')

      expect(pattern).toBeDefined()
      expect(pattern.metrics.arrayProperties).toBeGreaterThan(0)
      expect(pattern.metrics.estimatedNodes).toBeGreaterThan(5)
    })
  })

  describe('simpleDetect Function', () => {
    it('should detect large reactive data with many children', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/deep-reactivity-misuse.js')

      // Create a single object with > 50 nested properties
      const largeObject = {}
      for (let i = 0; i < 60; i++) {
        largeObject[`prop${i}`] = { value: i, metadata: { created: Date.now() } }
      }

      const instance = {
        $: {
          data: {
            userData: largeObject // This single value has > 50 properties
          },
          subTree: {
            children: new Array(15).fill({}) // > 10 children
          }
        }
      }

      const result = simpleDetect(instance, null)

      expect(result).toBe(true)
    })

    it('should not detect when property count is below threshold', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/deep-reactivity-misuse.js')

      const instance = {
        $: {
          data: {
            prop1: { value: 1 },
            prop2: { value: 2 },
            prop3: { value: 3 }
          },
          subTree: {
            children: new Array(15).fill({})
          }
        }
      }

      const result = simpleDetect(instance, null)

      expect(result).toBe(false)
    })

    it('should not detect when children count is below threshold', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/deep-reactivity-misuse.js')

      const largeObject = {}
      for (let i = 0; i < 60; i++) {
        largeObject[`prop${i}`] = { value: i }
      }

      const instance = {
        $: {
          data: {
            userData: largeObject // > 50 properties
          },
          subTree: {
            children: new Array(5).fill({}) // < 10 children
          }
        }
      }

      const result = simpleDetect(instance, null)

      expect(result).toBe(false)
    })

    it('should handle deeply nested objects (depth > 3)', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/deep-reactivity-misuse.js')

      // Create object with depth > 3 (should stop counting at depth 3)
      const deepData = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep'
                }
              }
            }
          }
        }
      }

      // Add more properties to reach > 50 count
      for (let i = 0; i < 60; i++) {
        deepData[`prop${i}`] = i
      }

      const instance = {
        $: {
          data: deepData,
          subTree: {
            children: new Array(15).fill({})
          }
        }
      }

      const result = simpleDetect(instance, null)

      expect(result).toBe(true)
    })

    it('should handle missing data gracefully', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/deep-reactivity-misuse.js')

      const instance = {
        $: {
          subTree: {
            children: new Array(15).fill({})
          }
        }
      }

      const result = simpleDetect(instance, null)

      expect(result).toBe(false)
    })

    it('should handle non-object data values', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/deep-reactivity-misuse.js')

      const instance = {
        $: {
          data: {
            count: 42,
            name: 'test',
            active: true,
            items: null
          },
          subTree: {
            children: new Array(15).fill({})
          }
        }
      }

      const result = simpleDetect(instance, null)

      expect(result).toBe(false)
    })

    it('should stop counting at max (100 properties)', async () => {
      const { simpleDetect } = await import('../../../src/patterns/core/deep-reactivity-misuse.js')

      // Create a single object with way more than 100 nested properties
      const massiveObject = {}
      for (let i = 0; i < 200; i++) {
        massiveObject[`prop${i}`] = { nested: { value: i } }
      }

      const instance = {
        $: {
          data: {
            massiveData: massiveObject // This single value has > 100 properties
          },
          subTree: {
            children: new Array(15).fill({})
          }
        }
      }

      const result = simpleDetect(instance, null)

      // Should still detect (count stops at 100 but that's > 50)
      expect(result).toBe(true)
    })
  })
})
