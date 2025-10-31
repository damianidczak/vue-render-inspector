import { describe, it, expect, beforeEach } from 'vitest'
import { detectEnhancedPatterns } from '../../../src/patterns/index.js'

describe('Enhanced Array Index Key Detection', () => {
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
      unnecessaryRenderPercent: 0
    }
  })

  describe('Template Analysis Detection', () => {
    it('should detect basic v-for with index as key', () => {
      mockInstance.type.template = `
        <template>
          <div v-for="(item, index) in items" :key="index">
            {{ item.name }}
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeDefined()
      expect(arrayKeyPattern.detectionMethod).toBe('template-analysis')
      expect(arrayKeyPattern.affectedElements).toHaveLength(1)
      expect(arrayKeyPattern.reason).toContain('Template uses array indices as keys')
      expect(arrayKeyPattern.severity).toBe('low') // Single occurrence
    })

    it('should detect multiple array index patterns with increasing severity', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <li v-for="(item, index) in items" :key="index">{{ item.name }}</li>
            <span v-for="(tag, idx) in tags" :key="idx">{{ tag }}</span>
            <p v-for="(comment, i) in comments" :key="i">{{ comment }}</p>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeDefined()
      expect(arrayKeyPattern.affectedElements).toHaveLength(3)
      expect(arrayKeyPattern.severity).toBe('medium') // Multiple occurrences
      expect(arrayKeyPattern.suggestion).toContain('Multiple array index keys detected')
    })

    it('should detect high-risk patterns with transitions', () => {
      mockInstance.type.template = `
        <template>
          <TransitionGroup name="list">
            <div v-for="(item, index) in items" :key="index" class="list-item">
              {{ item.name }}
            </div>
          </TransitionGroup>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeDefined()
      expect(arrayKeyPattern.severity).toBe('high') // Transitions make it high risk
      expect(arrayKeyPattern.affectedElements[0].hasTransition).toBe(true)
      expect(arrayKeyPattern.suggestion).toContain('Critical: Array index keys with transitions')
      expect(arrayKeyPattern.codeGeneration).toContain('TransitionGroup')
    })

    it('should detect various index variable names', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <div v-for="(item, index) in items" :key="index">A</div>
            <div v-for="(item, idx) in items" :key="idx">B</div>
            <div v-for="(item, i) in items" :key="i">C</div>
            <div v-for="(item, _index) in items" :key="_index">D</div>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeDefined()
      expect(arrayKeyPattern.affectedElements).toHaveLength(4)
      expect(arrayKeyPattern.affectedElements.map(e => e.match)).toEqual(
        expect.arrayContaining([
          expect.stringContaining('index'),
          expect.stringContaining('idx'),
          expect.stringContaining('i'),
          expect.stringContaining('_index')
        ])
      )
    })

    it('should detect complex index expressions', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <div v-for="(item, index) in items" :key="'item-' + index">A</div>
            <div v-for="(item, i) in items" :key="\`prefix-\${i}\`">B</div>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeDefined()
      expect(arrayKeyPattern.affectedElements.length).toBeGreaterThan(0)
    })

    it('should extract element context correctly', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <ul>
              <li v-for="(item, index) in items" :key="index">{{ item.name }}</li>
            </ul>
            <TransitionGroup>
              <div v-for="(card, idx) in cards" :key="idx" class="card">{{ card.title }}</div>
            </TransitionGroup>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeDefined()
      expect(arrayKeyPattern.affectedElements).toHaveLength(2)

      const liElement = arrayKeyPattern.affectedElements.find(e => e.element === 'li')
      const divElement = arrayKeyPattern.affectedElements.find(e => e.element === 'div')

      expect(liElement).toBeDefined()
      expect(divElement).toBeDefined()
      expect(divElement.hasTransition).toBe(true)
    })
  })

  describe('Heuristic Detection', () => {
    it('should detect list item components with frequent re-renders', () => {
      mockSnapshot.componentName = 'UserListItem'
      mockSnapshot.isUnnecessary = true
      mockSnapshot.unnecessaryRenderPercent = 75
      mockSnapshot.reason = 'parent component re-render'
      mockSnapshot.triggerMechanism = 'parent-rerender'

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeDefined()
      expect(arrayKeyPattern.detectionMethod).toBe('heuristic-analysis')
      expect(arrayKeyPattern.reason).toContain('UserListItem')
      expect(arrayKeyPattern.reason).toContain('75%')
      expect(arrayKeyPattern.suggestion).toContain('stable unique IDs')
    })

    it('should detect various list item component naming patterns', () => {
      const listComponentNames = ['TodoItem', 'ProductCard', 'TableRow', 'ListElement', 'GridItem']

      listComponentNames.forEach(componentName => {
        mockSnapshot.componentName = componentName
        mockSnapshot.isUnnecessary = true
        mockSnapshot.unnecessaryRenderPercent = 70
        mockSnapshot.triggerMechanism = 'parent-rerender'

        const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
        const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

        expect(arrayKeyPattern, `Should detect ${componentName}`).toBeDefined()
        expect(arrayKeyPattern.reason).toContain(componentName)
      })
    })

    it('should detect components with array props and frequent renders', () => {
      mockSnapshot.componentName = 'DataDisplay'
      mockSnapshot.isUnnecessary = true
      mockSnapshot.unnecessaryRenderPercent = 65
      mockSnapshot.props = {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' }
        ],
        categories: ['A', 'B', 'C'],
        metadata: { title: 'Data' }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeDefined()
      expect(arrayKeyPattern.severity).toBe('low') // Lower confidence
      expect(arrayKeyPattern.reason).toContain('array props')
    })

    it('should not trigger for components without list characteristics', () => {
      mockSnapshot.componentName = 'HeaderComponent'
      mockSnapshot.isUnnecessary = true
      mockSnapshot.unnecessaryRenderPercent = 80
      mockSnapshot.props = { title: 'Header', showNav: true }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeUndefined()
    })
  })

  describe('Performance Analysis Detection', () => {
    it('should detect slow renders in transition contexts', () => {
      mockSnapshot.componentName = 'TransitionListItem'
      mockSnapshot.warnings = ['transition']

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 20) // Slow render
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeDefined()
      expect(arrayKeyPattern.detectionMethod).toBe('performance-analysis')
      expect(arrayKeyPattern.severity).toBe('high')
      expect(arrayKeyPattern.reason).toContain('Slow render (20.0ms)')
      expect(arrayKeyPattern.reason).toContain('transition context')
    })

    it('should detect high render frequency in list contexts', () => {
      mockSnapshot.componentName = 'GridItem'
      mockSnapshot.renderFrequency = 45 // High frequency

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 8)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeDefined()
      expect(arrayKeyPattern.severity).toBe('medium')
      expect(arrayKeyPattern.reason).toContain('High render frequency (45/min)')
      expect(arrayKeyPattern.suggestion).toContain('Review v-for key usage')
    })

    it('should not trigger for non-list contexts even with slow renders', () => {
      mockSnapshot.componentName = 'SlowComponent'

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 25)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeUndefined()
    })
  })

  describe('Code Generation', () => {
    it('should generate basic array key fixes', () => {
      mockSnapshot.componentName = 'ListItem'
      mockSnapshot.isUnnecessary = true
      mockSnapshot.unnecessaryRenderPercent = 70
      mockSnapshot.triggerMechanism = 'parent-rerender'

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern.codeGeneration).toBeDefined()
      expect(arrayKeyPattern.codeGeneration).toContain('// ❌ Bad: Using array index as key')
      expect(arrayKeyPattern.codeGeneration).toContain('// ✅ Good: Using stable unique ID')
      expect(arrayKeyPattern.codeGeneration).toContain(':key="item.id"')
      expect(arrayKeyPattern.codeGeneration).toContain('const itemsWithIds = computed(() =>')
    })

    it('should generate specific fixes for detected template patterns', () => {
      mockInstance.type.template = `
        <template>
          <TransitionGroup>
            <div v-for="(item, index) in items" :key="index">{{ item.name }}</div>
          </TransitionGroup>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern.codeGeneration).toContain('// Detected problematic patterns:')
      expect(arrayKeyPattern.codeGeneration).toContain('TransitionGroup')
      expect(arrayKeyPattern.codeGeneration).toContain('// Special consideration for transitions:')
      expect(arrayKeyPattern.codeGeneration).toContain(
        '// Stable keys are critical for smooth transitions!'
      )
    })

    it('should handle multiple detected elements in code generation', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <li v-for="(item, index) in items" :key="index">A</li>
            <span v-for="(tag, idx) in tags" :key="idx">B</span>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern.codeGeneration).toContain('// 1.')
      expect(arrayKeyPattern.codeGeneration).toContain('// 2.')
      expect(arrayKeyPattern.codeGeneration).toContain('keyWithIndex')
    })
  })

  describe('Severity Classification', () => {
    it('should classify severity correctly based on risk factors', () => {
      const testCases = [
        {
          template: '<div v-for="(item, index) in items" :key="index">A</div>',
          expectedSeverity: 'low', // Single occurrence
          description: 'single index usage'
        },
        {
          template: `
            <div v-for="(item, index) in items" :key="index">A</div>
            <div v-for="(item, idx) in items" :key="idx">B</div>
            <div v-for="(item, i) in items" :key="i">C</div>
          `,
          expectedSeverity: 'medium', // Multiple occurrences
          description: 'multiple index usage'
        },
        {
          template: `
            <TransitionGroup>
              <div v-for="(item, index) in items" :key="index">A</div>
            </TransitionGroup>
          `,
          expectedSeverity: 'high', // Transition context
          description: 'index usage with transitions'
        }
      ]

      testCases.forEach(({ template, expectedSeverity, description }) => {
        mockInstance.type.template = template

        const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
        const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

        expect(arrayKeyPattern, `Should detect ${description}`).toBeDefined()
        expect(
          arrayKeyPattern.severity,
          `${description} should have ${expectedSeverity} severity`
        ).toBe(expectedSeverity)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing template gracefully', () => {
      mockInstance.type.template = null
      mockSnapshot.componentName = 'SimpleComponent'

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeUndefined()
    })

    it('should handle render function strings', () => {
      mockInstance.type.template = null
      mockInstance.render = function () {
        return h(
          'div',
          items.map((item, index) => h('span', { key: index }, item.name))
        )
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      // Should not crash, and might detect patterns in render function string
      expect(patterns).toBeDefined()
    })

    it('should handle complex template structures without false positives', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <div v-for="item in items" :key="item.id">{{ item.name }}</div>
            <component :is="dynamicComponent" :key="componentKey" />
            <div :class="{ highlight: true }">Not a v-for</div>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeUndefined() // Should not trigger false positive
    })

    it('should handle malformed template gracefully', () => {
      mockInstance.type.template = '<div v-for="incomplete'

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      }).not.toThrow()
    })
  })

  describe('Detection Method Priority', () => {
    it('should prioritize template analysis over heuristics', () => {
      // Set up both template evidence and heuristic evidence
      mockInstance.type.template = `
        <template>
          <div v-for="(item, index) in items" :key="index">{{ item.name }}</div>
        </template>
      `
      mockSnapshot.componentName = 'ListItem'
      mockSnapshot.isUnnecessary = true
      mockSnapshot.unnecessaryRenderPercent = 80
      mockSnapshot.triggerMechanism = 'parent-rerender'

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const arrayKeyPattern = patterns.find(p => p.type === 'arrayIndexKey')

      expect(arrayKeyPattern).toBeDefined()
      expect(arrayKeyPattern.detectionMethod).toBe('template-analysis') // Should prefer template analysis
      expect(arrayKeyPattern.affectedElements).toHaveLength(1)
    })
  })
})
