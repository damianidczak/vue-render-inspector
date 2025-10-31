import { describe, it, expect, beforeEach } from 'vitest'
import { detectEnhancedPatterns } from '../../../src/patterns/index.js'

describe('Enhanced Template Method Call Detection', () => {
  let mockInstance, mockSnapshot

  beforeEach(() => {
    mockInstance = {
      uid: 'test-123',
      type: {
        name: 'TestComponent',
        template: null
      }
    }

    mockSnapshot = {
      componentName: 'TestComponent',
      isUnnecessary: false,
      unnecessaryRenderPercent: 0,
      triggerMechanism: null
    }
  })

  describe('Template Pattern Analysis', () => {
    it('should detect interpolation method calls', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <p>{{ calculateTotal(items) }}</p>
            <span>{{ formatCurrency(price) }}</span>
            <div>{{ processData(rawData) }}</div>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.methodMetrics.methodCalls).toHaveLength(3)
      expect(
        templateMethodPattern.methodMetrics.methodCalls.some(
          call => call.method === 'calculateTotal'
        )
      ).toBe(true)
      expect(
        templateMethodPattern.methodMetrics.methodCalls.some(
          call => call.method === 'formatCurrency'
        )
      ).toBe(true)
      expect(
        templateMethodPattern.methodMetrics.methodCalls.some(call => call.method === 'processData')
      ).toBe(true)
      expect(templateMethodPattern.reason).toContain('3 method calls')
      expect(templateMethodPattern.detectionMethod).toBe('template-analysis')
    })

    it('should detect directive method calls', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <input :value="getValue(item)" />
            <button :class="getButtonClass(status)" />
            <component :is="getComponent(type)" />
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 6)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.methodMetrics.methodCalls).toHaveLength(3)
      expect(
        templateMethodPattern.methodMetrics.methodCalls.some(call => call.context === 'directive')
      ).toBe(true)
    })

    it('should detect event handler method calls', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <button @click="handleClick(item.id)">Click</button>
            <input @input="validateInput($event.target.value)" />
            <form @submit="processForm(formData)" />
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 7)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.methodMetrics.methodCalls).toHaveLength(3)
      expect(
        templateMethodPattern.methodMetrics.methodCalls.some(call => call.context === 'event')
      ).toBe(true)
    })

    it('should detect expensive method patterns', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <p>{{ calculateComplexValue(data) }}</p>
            <span>{{ formatExpensiveData(items) }}</span>
            <div>{{ validateComplexForm(form) }}</div>
            <section>{{ computeStatistics(dataset) }}</section>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 12)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.methodMetrics.expensiveMethods).toHaveLength(4)
      expect(templateMethodPattern.reason).toContain('4 expensive method patterns')
      expect(templateMethodPattern.severity).toBe('high') // Multiple expensive methods + slower render
    })

    it('should detect nested method calls', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <p>{{ formatCurrency(calculateTotal(getItems(data))) }}</p>
            <span>{{ processResult(validateInput(getValue(item))) }}</span>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 9)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.methodMetrics.nestedCalls).toHaveLength(2)
      expect(templateMethodPattern.reason).toContain('2 nested method calls')
    })

    it('should detect method calls in v-for loops', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <div v-for="item in items" :key="item.id">
              <p>{{ calculateItemTotal(item) }}</p>
              <span>{{ formatItemData(item) }}</span>
            </div>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 10)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.methodMetrics.methodsInLoops).toHaveLength(2)
      expect(templateMethodPattern.reason).toContain('2 method calls in v-for loops')
      expect(templateMethodPattern.severity).toBe('high') // Loop methods are high severity
    })

    it('should detect method calls in conditional contexts', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <p v-if="validateCondition(data)">{{ processData(item) }}</p>
            <span v-show="checkPermission(user)">{{ formatDisplay(content) }}</span>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.methodMetrics.methodsInConditionals).toHaveLength(4)
      expect(templateMethodPattern.reason).toContain('4 method calls in conditional contexts')
    })

    it('should handle repetitive method calls', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <p>{{ formatData(item1) }}</p>
            <p>{{ formatData(item2) }}</p>
            <p>{{ formatData(item3) }}</p>
            <span>{{ processValue(val1) }}</span>
            <span>{{ processValue(val2) }}</span>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 7)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.methodMetrics.repetitiveCalls).toBeGreaterThan(0)
      expect(templateMethodPattern.reason).toContain('repetitive method calls')
    })
  })

  describe('Performance Correlation Analysis', () => {
    it('should correlate slow renders with method calls', () => {
      mockInstance.type.template = `
        <template>
          <div>{{ expensiveCalculation(data) }}</div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 18) // Very slow render
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.detectionMethod).toBe('performance-correlation')
      expect(templateMethodPattern.reason).toContain('slow render time')
      expect(templateMethodPattern.severity).toBe('high')
    })

    it('should correlate frequent unnecessary renders with method calls', () => {
      mockInstance.type.template = `
        <template>
          <div>{{ calculateValue(props) }}</div>
        </template>
      `
      mockSnapshot.isUnnecessary = true
      mockSnapshot.unnecessaryRenderPercent = 70

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.reason).toContain('70% unnecessary renders')
      expect(templateMethodPattern.detectionMethod).toBe('performance-correlation')
    })

    it('should consider render frequency in analysis', () => {
      mockInstance.type.template = `
        <template>
          <div>{{ formatDisplay(content) }}</div>
        </template>
      `
      mockSnapshot.renderFrequency = 45

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 6)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.reason).toContain('high render frequency')
    })

    it('should detect method calls with state trigger mechanism', () => {
      mockInstance.type.template = `
        <template>
          <div>{{ processState(currentState) }}</div>
        </template>
      `
      mockSnapshot.triggerMechanism = 'state'
      mockSnapshot.isUnnecessary = true

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.reason).toContain('state changes triggering unnecessary renders')
    })
  })

  describe('Heuristic Detection', () => {
    it('should detect components with high render counts and method patterns', () => {
      mockSnapshot.totalRenders = 25
      mockSnapshot.changePatterns = { stateChanges: 15 }
      // No template but based on render patterns
      mockInstance.type.template = null

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 12)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.detectionMethod).toBe('heuristic')
      expect(templateMethodPattern.reason).toContain('render patterns suggest method calls')
    })

    it('should detect components with naming patterns suggesting calculations', () => {
      mockSnapshot.componentName = 'CalculationDisplay'
      mockSnapshot.isUnnecessary = true
      mockSnapshot.unnecessaryRenderPercent = 40

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 10)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.reason).toContain('component name suggests calculations')
    })

    it('should detect props changes suggesting method dependencies', () => {
      mockSnapshot.propsDiff = {
        changed: {
          data: { from: { a: 1 }, to: { a: 2 } },
          config: { from: { x: 1 }, to: { x: 2 } },
          items: { from: [1, 2], to: [1, 2, 3] }
        }
      }
      mockSnapshot.isUnnecessary = true

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 9)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.reason).toContain('multiple prop changes')
    })
  })

  describe('Severity Classification', () => {
    it('should classify as high severity for slow renders + method calls', () => {
      mockInstance.type.template = `
        <template>
          <div v-for="item in items" :key="item.id">
            {{ expensiveCalculation(item) }}
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 18) // Slow render
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.severity).toBe('high')
      expect(templateMethodPattern.suggestion).toContain('Critical')
    })

    it('should classify as high severity for methods in loops', () => {
      mockInstance.type.template = `
        <template>
          <div v-for="item in items" :key="item.id">
            {{ calculateValue(item) }}
            {{ formatData(item) }}
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.severity).toBe('high')
    })

    it('should classify as medium severity for performance correlation', () => {
      mockInstance.type.template = `
        <template>
          <div>{{ calculateTotal(items) }}</div>
        </template>
      `
      mockSnapshot.unnecessaryRenderPercent = 50

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 6)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.severity).toBe('medium')
    })

    it('should classify as low severity for simple method calls', () => {
      mockInstance.type.template = `
        <template>
          <div>{{ formatDate(date) }}</div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 4)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.severity).toBe('low')
    })
  })

  describe('Code Generation', () => {
    it('should generate computed property fixes for simple method calls', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <p>{{ calculateTotal(items) }}</p>
            <span>{{ formatCurrency(price) }}</span>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern.codeGeneration).toBeDefined()
      expect(templateMethodPattern.codeGeneration).toContain('❌ Bad: Method calls in template')
      expect(templateMethodPattern.codeGeneration).toContain('✅ Good: Computed properties')
      expect(templateMethodPattern.codeGeneration).toContain('const calculatedTotal = computed(')
      expect(templateMethodPattern.codeGeneration).toContain('const formattedPrice = computed(')
    })

    it('should generate fixes for expensive method calls', () => {
      mockInstance.type.template = `
        <template>
          <div>{{ calculateComplexStatistics(largeDataset) }}</div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 15)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern.codeGeneration).toContain('For expensive calculations')
      expect(templateMethodPattern.codeGeneration).toContain('import { useMemo }')
      expect(templateMethodPattern.codeGeneration).toContain('useMemo(() => {')
    })

    it('should generate fixes for nested method calls', () => {
      mockInstance.type.template = `
        <template>
          <div>{{ formatCurrency(calculateTotal(getItems(data))) }}</div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 9)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern.codeGeneration).toContain('Break down nested calls')
      expect(templateMethodPattern.codeGeneration).toContain('const total = computed(')
      expect(templateMethodPattern.codeGeneration).toContain('const formattedTotal = computed(')
    })

    it('should generate fixes for method calls in loops', () => {
      mockInstance.type.template = `
        <template>
          <div v-for="item in items" :key="item.id">
            {{ formatItem(item) }}
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 10)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern.codeGeneration).toContain('❌ Bad: Method calls inside v-for')
      expect(templateMethodPattern.codeGeneration).toContain('✅ Good: Pre-computed list data')
      expect(templateMethodPattern.codeGeneration).toContain('const formattedItems = computed(')
      expect(templateMethodPattern.codeGeneration).toContain('items.value.map(item => ({')
    })

    it('should include performance optimization tips', () => {
      mockInstance.type.template = `
        <template>
          <div>{{ processData(complexObject) }}</div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 11)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern.codeGeneration).toContain('Performance optimization tips')
      expect(templateMethodPattern.codeGeneration).toContain(
        'Use computed properties for any calculation'
      )
      expect(templateMethodPattern.codeGeneration).toContain('Computed properties are cached')
      expect(templateMethodPattern.codeGeneration).toContain('Extract complex expressions')
      expect(templateMethodPattern.codeGeneration).toContain(
        'For expensive operations, consider useMemo'
      )
    })
  })

  describe('Detection Thresholds', () => {
    it('should not trigger for components without method calls', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <p>{{ simpleValue }}</p>
            <span>{{ anotherValue }}</span>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeUndefined()
    })

    it('should require minimum score threshold (>=3) to trigger', () => {
      mockInstance.type.template = `
        <template>
          <div>{{ simpleMethod() }}</div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 3) // Low render time
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeUndefined() // Should not trigger with low score
    })

    it('should trigger with sufficient complexity score', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <p>{{ calculateValue(data) }}</p>
            <span>{{ formatResult(result) }}</span>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing template gracefully', () => {
      mockInstance.type.template = null
      mockSnapshot.totalRenders = 5 // Low renders
      mockSnapshot.changePatterns = { stateChanges: 1 } // Low changes

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeUndefined()
    })

    it('should handle malformed template without crashing', () => {
      mockInstance.type.template = '<div {{ incomplete template'

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      }).not.toThrow()
    })

    it('should handle missing snapshot gracefully', () => {
      mockInstance.type.template = `
        <template>
          <div>{{ calculateValue(data) }}</div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, null, 10)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.methodMetrics.unnecessaryRenderPercent).toBe(0)
    })

    it('should handle render function instead of template', () => {
      mockInstance.type.template = null
      mockInstance.render = function () {
        return h('div', expensiveCalculation(data))
      }
      mockSnapshot.unnecessaryRenderPercent = 50

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 12)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      // Should detect based on render function string or heuristics
      expect(templateMethodPattern).toBeDefined()
    })
  })

  describe('Method Pattern Recognition', () => {
    it('should correctly identify expensive method patterns', () => {
      const expensivePatterns = [
        'calculateComplexValue',
        'formatExpensiveData',
        'validateComplexForm',
        'computeStatistics',
        'processLargeDataset',
        'generateReport',
        'analyzeMetrics'
      ]

      expensivePatterns.forEach(methodName => {
        mockInstance.type.template = `
          <template>
            <div>{{ ${methodName}(data) }}</div>
          </template>
        `

        const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
        const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

        expect(templateMethodPattern, `Should detect expensive method: ${methodName}`).toBeDefined()
        expect(templateMethodPattern.methodMetrics.expensiveMethods).toHaveLength(1)
      })
    })

    it('should correctly identify loop contexts', () => {
      const loopPatterns = [
        'v-for="item in items"',
        'v-for="(item, index) in list"',
        'v-for="user in users"'
      ]

      loopPatterns.forEach(vForPattern => {
        mockInstance.type.template = `
          <template>
            <div ${vForPattern} :key="item.id">
              {{ processItem(item) }}
            </div>
          </template>
        `

        const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
        const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

        expect(templateMethodPattern, `Should detect loop pattern: ${vForPattern}`).toBeDefined()
        expect(templateMethodPattern.methodMetrics.methodsInLoops).toHaveLength(1)
      })
    })

    it('should correctly identify conditional contexts', () => {
      const conditionalPatterns = [
        'v-if="checkCondition(data)"',
        'v-show="validateState(item)"',
        'v-else-if="processCheck(value)"'
      ]

      conditionalPatterns.forEach(directive => {
        mockInstance.type.template = `
          <template>
            <div ${directive}>
              {{ displayValue(content) }}
            </div>
          </template>
        `

        const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
        const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

        expect(templateMethodPattern, `Should detect conditional: ${directive}`).toBeDefined()
        expect(
          templateMethodPattern.methodMetrics.methodsInConditionals.length
        ).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('Metrics Accuracy', () => {
    it('should accurately count method calls by context', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <!-- Interpolation contexts -->
            <p>{{ formatTitle(title) }}</p>
            <span>{{ calculateValue(data) }}</span>
            
            <!-- Directive contexts -->
            <input :value="getValue(item)" />
            <button :class="getClass(status)" />
            
            <!-- Event contexts -->
            <button @click="handleClick(id)">Click</button>
            <form @submit="processForm(data)">Submit</form>
            
            <!-- Loop context -->
            <div v-for="item in items" :key="item.id">
              {{ processItem(item) }}
            </div>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 12)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.methodMetrics.methodCalls).toHaveLength(7)

      const interpolationCalls = templateMethodPattern.methodMetrics.methodCalls.filter(
        call => call.context === 'interpolation'
      )
      const directiveCalls = templateMethodPattern.methodMetrics.methodCalls.filter(
        call => call.context === 'directive'
      )
      const eventCalls = templateMethodPattern.methodMetrics.methodCalls.filter(
        call => call.context === 'event'
      )

      expect(interpolationCalls).toHaveLength(3) // formatTitle, calculateValue, processItem
      expect(directiveCalls).toHaveLength(2) // getValue, getClass
      expect(eventCalls).toHaveLength(2) // handleClick, processForm
      expect(templateMethodPattern.methodMetrics.methodsInLoops).toHaveLength(1) // processItem
    })

    it('should provide accurate performance correlation metrics', () => {
      mockInstance.type.template = `
        <template>
          <div>{{ expensiveMethod(data) }}</div>
        </template>
      `
      mockSnapshot.isUnnecessary = true
      mockSnapshot.unnecessaryRenderPercent = 65
      mockSnapshot.renderFrequency = 30

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 15)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.methodMetrics.renderTime).toBe(15)
      expect(templateMethodPattern.methodMetrics.unnecessaryRenderPercent).toBe(65)
      expect(templateMethodPattern.methodMetrics.renderFrequency).toBe(30)
      expect(templateMethodPattern.methodMetrics.hasUnnecessaryRenders).toBe(true)
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle mixed template patterns correctly', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <!-- Simple method calls -->
            <p>{{ formatDate(date) }}</p>
            
            <!-- Expensive nested calls -->
            <span>{{ formatCurrency(calculateTotal(getItems(data))) }}</span>
            
            <!-- Methods in loops -->
            <div v-for="item in items" :key="item.id">
              <p v-if="validateItem(item)">{{ processItem(item) }}</p>
            </div>
            
            <!-- Event handlers -->
            <button @click="() => handleComplexAction(item.id, metadata)">Action</button>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 14)
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.severity).toBe('high') // Complex patterns + loop methods

      expect(templateMethodPattern.methodMetrics.methodCalls.length).toBeGreaterThan(5)
      expect(templateMethodPattern.methodMetrics.nestedCalls).toHaveLength(1)
      expect(templateMethodPattern.methodMetrics.methodsInLoops).toHaveLength(2) // validateItem, processItem
      expect(templateMethodPattern.methodMetrics.methodsInConditionals.length).toBeGreaterThan(0)
    })

    it('should provide comprehensive analysis for performance-critical scenarios', () => {
      mockInstance.type.template = `
        <template>
          <div v-for="section in sections" :key="section.id">
            <h3>{{ formatSectionTitle(section.title) }}</h3>
            <div v-for="item in section.items" :key="item.id">
              <p v-if="validateItemAccess(item, user)">
                {{ calculateItemScore(item, metrics, config) }}
              </p>
              <button @click="() => processComplexAction(item, section, metadata)">
                {{ getActionLabel(item.type, user.permissions) }}
              </button>
            </div>
          </div>
        </template>
      `
      mockSnapshot.unnecessaryRenderPercent = 80
      mockSnapshot.renderFrequency = 45

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 22) // Very slow
      const templateMethodPattern = patterns.find(p => p.type === 'templateMethodCalls')

      expect(templateMethodPattern).toBeDefined()
      expect(templateMethodPattern.severity).toBe('high')
      expect(templateMethodPattern.detectionMethod).toBe('performance-correlation')

      // Should detect the performance-critical nature
      expect(templateMethodPattern.reason).toContain('80% unnecessary renders')
      expect(templateMethodPattern.reason).toContain('slow render time')
      expect(templateMethodPattern.suggestion).toContain('Critical')
    })
  })
})
