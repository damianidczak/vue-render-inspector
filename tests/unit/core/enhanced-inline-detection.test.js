import { describe, it, expect, beforeEach } from 'vitest'
import { detectEnhancedPatterns } from '../../../src/patterns/index.js'

describe('Enhanced Inline Object Detection', () => {
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
      isUnnecessary: true,
      unnecessaryRenderPercent: 0,
      propsDiff: null
    }
  })

  describe('Props Diff Analysis', () => {
    it('should detect inline objects with same content but different references', () => {
      mockSnapshot.propsDiff = {
        changed: {
          config: {
            from: { theme: 'dark', size: 'lg' },
            to: { theme: 'dark', size: 'lg' },
            deepEqual: true,
            sameReference: false
          },
          styles: {
            from: { color: 'red', padding: '10px' },
            to: { color: 'red', padding: '10px' },
            deepEqual: true,
            sameReference: false
          }
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeDefined()
      expect(inlinePattern.severity).toBe('medium')
      expect(inlinePattern.affectedProps).toContain('config')
      expect(inlinePattern.affectedProps).toContain('styles')
      expect(inlinePattern.reason).toContain('config, styles')
      expect(inlinePattern.codeGeneration).toContain('const config')
      expect(inlinePattern.codeGeneration).toContain('const styles')
    })

    it('should detect inline functions and mark as high severity', () => {
      mockSnapshot.propsDiff = {
        changed: {
          onClick: {
            from: () => console.log('click'),
            to: () => console.log('click'),
            deepEqual: true,
            sameReference: false
          },
          onSubmit: {
            from: () => console.log('submit'),
            to: () => console.log('submit'),
            deepEqual: true,
            sameReference: false
          }
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeDefined()
      expect(inlinePattern.severity).toBe('high')
      expect(inlinePattern.reason).toContain('Inline functions detected')
      expect(inlinePattern.reason).toContain('onClick, onSubmit')
      expect(inlinePattern.suggestion).toContain('Functions especially cause child re-renders')
    })

    it('should detect mixed inline objects and functions', () => {
      mockSnapshot.propsDiff = {
        changed: {
          config: {
            from: { theme: 'dark' },
            to: { theme: 'dark' },
            deepEqual: true,
            sameReference: false
          },
          onClick: {
            from: () => console.log('click'),
            to: () => console.log('click'),
            deepEqual: true,
            sameReference: false
          }
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeDefined()
      expect(inlinePattern.severity).toBe('high') // Functions make it high severity
      expect(inlinePattern.reason).toContain('onClick')
      expect(inlinePattern.reason).toContain('config')
      expect(inlinePattern.affectedProps).toContain('config')
      expect(inlinePattern.affectedProps).toContain('onClick')
    })

    it('should detect array props creating new references', () => {
      mockSnapshot.propsDiff = {
        changed: {
          items: {
            from: [1, 2, 3],
            to: [1, 2, 3],
            deepEqual: false, // Arrays often fail deep equal
            sameReference: false
          }
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeDefined()
      expect(inlinePattern.affectedProps).toContain('items')
    })
  })

  describe('Template Analysis', () => {
    it('should detect inline objects in template', () => {
      mockInstance.type.template = `
        <template>
          <ChildComponent 
            :config="{ theme: 'dark', size: 'lg' }"
            :styles="{ color: primary, padding: '10px' }"
          />
        </template>
      `
      mockSnapshot.propsDiff = null // No props diff

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeDefined()
      expect(inlinePattern.reason).toContain('inline objects')
      expect(inlinePattern.suggestion).toContain(
        'Template contains inline object/function creation patterns'
      )
    })

    it('should detect inline arrays in template', () => {
      mockInstance.type.template = `
        <template>
          <ListComponent :items="[item1, item2, item3]" />
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeDefined()
      expect(inlinePattern.reason).toContain('inline arrays')
    })

    it('should detect inline arrow functions in template', () => {
      mockInstance.type.template = `
        <template>
          <button @click="() => handleClick(item.id)">Click</button>
          <input @input="($event) => handleInput($event.target.value)" />
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeDefined()
      expect(inlinePattern.severity).toBe('high') // Functions are high severity
      expect(inlinePattern.reason).toContain('inline functions')
    })

    it('should detect template method calls', () => {
      mockInstance.type.template = `
        <template>
          <div>
            <p>Total: {{ calculateTotal(items) }}</p>
            <p>Formatted: {{ formatCurrency(total) }}</p>
          </div>
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeDefined()
      expect(inlinePattern.reason).toContain('template method calls')
    })

    it('should detect complex conditional bindings', () => {
      mockInstance.type.template = `
        <template>
          <Component :config="user.isAdmin ? adminConfig : userConfig" />
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeDefined()
      expect(inlinePattern.reason).toContain('complex conditional bindings')
    })

    it('should assign correct severity based on template complexity', () => {
      // High severity: multiple inline functions
      mockInstance.type.template = `
        <template>
          <div>
            <button @click="() => action1()">1</button>
            <button @click="() => action2()">2</button>
            <button @click="() => action3()">3</button>
          </div>
        </template>
      `

      let patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      let inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')
      expect(inlinePattern.severity).toBe('high')

      // Medium severity: some inline objects
      mockInstance.type.template = `
        <template>
          <Component :config="{ theme: 'dark' }" />
        </template>
      `

      patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')
      expect(inlinePattern.severity).toBe('low') // Only one inline object

      // Low severity: single method call
      mockInstance.type.template = `
        <template>
          <div>{{ formatDate(date) }}</div>
        </template>
      `

      patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')
      expect(inlinePattern.severity).toBe('low')
    })
  })

  describe('Heuristic Detection for Child Components', () => {
    it('should detect child components with frequent unnecessary renders', () => {
      mockSnapshot.componentName = 'UserCardComponent'
      mockSnapshot.isUnnecessary = true
      mockSnapshot.unnecessaryRenderPercent = 75
      mockSnapshot.propsDiff = null // No direct props diff evidence

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeDefined()
      expect(inlinePattern.severity).toBe('medium')
      expect(inlinePattern.reason).toContain('Child component re-rendering frequently')
      expect(inlinePattern.suggestion).toContain(
        'Check parent component for inline object/function creation'
      )
    })

    it('should detect components ending with "Component"', () => {
      mockSnapshot.componentName = 'DataTableComponent'
      mockSnapshot.unnecessaryRenderPercent = 60

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeDefined()
    })

    it('should detect components with "Item" in name', () => {
      mockSnapshot.componentName = 'ListItem'
      mockSnapshot.unnecessaryRenderPercent = 80

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeDefined()
    })

    it('should not trigger for components with low unnecessary render rate', () => {
      mockSnapshot.componentName = 'ChildComponent'
      mockSnapshot.unnecessaryRenderPercent = 20 // Below threshold

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeUndefined()
    })
  })

  describe('Code Generation', () => {
    it('should generate appropriate fixes for different prop types', () => {
      mockSnapshot.propsDiff = {
        changed: {
          styles: {
            from: { color: 'red' },
            to: { color: 'red' },
            deepEqual: true,
            sameReference: false
          },
          config: {
            from: { theme: 'dark' },
            to: { theme: 'dark' },
            deepEqual: true,
            sameReference: false
          },
          listData: {
            from: [1, 2, 3],
            to: [1, 2, 3],
            deepEqual: true,
            sameReference: false
          },
          onClick: {
            from: () => {},
            to: () => {},
            deepEqual: true,
            sameReference: false
          }
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern.codeGeneration).toBeDefined()
      expect(inlinePattern.codeGeneration).toContain(
        'const styles = computed(() => ({ /* your styles */ }))'
      )
      expect(inlinePattern.codeGeneration).toContain('const config = { /* your config object */ }')
      expect(inlinePattern.codeGeneration).toContain('const listData = [/* your array data */]')
      expect(inlinePattern.codeGeneration).toContain(
        'const onClick = () => { /* your click handler */ }'
      )
    })

    it('should generate specific handlers for different event types', () => {
      mockSnapshot.propsDiff = {
        changed: {
          onClick: {
            from: () => {},
            to: () => {},
            deepEqual: true,
            sameReference: false
          },
          onChange: {
            from: () => {},
            to: () => {},
            deepEqual: true,
            sameReference: false
          }
        }
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern.codeGeneration).toContain(
        'const onClick = () => { /* your click handler */ }'
      )
      expect(inlinePattern.codeGeneration).toContain(
        'const onChange = (value) => { /* your change handler */ }'
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing template gracefully', () => {
      mockInstance.type.template = null
      mockSnapshot.propsDiff = null

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePattern = patterns.find(p => p.type === 'inlineObjectCreation')

      expect(inlinePattern).toBeUndefined()
    })

    it('should handle malformed props diff', () => {
      mockSnapshot.propsDiff = {
        changed: {
          invalidProp: null,
          anotherInvalid: undefined
        }
      }

      expect(() => {
        detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      }).not.toThrow()
    })

    it('should handle render function instead of template', () => {
      mockInstance.type.template = null
      mockInstance.render = function () {
        return h('div', { onClick: () => console.log('click') })
      }

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      // Should not crash and might detect patterns in render function string
      expect(patterns).toBeDefined()
    })

    it('should not duplicate patterns when multiple detection methods trigger', () => {
      // Set up both props diff and template to detect same issue
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

      mockInstance.type.template = `
        <template>
          <Component :config="{ theme: 'dark' }" />
        </template>
      `

      const patterns = detectEnhancedPatterns(mockInstance, mockSnapshot, 5)
      const inlinePatterns = patterns.filter(p => p.type === 'inlineObjectCreation')

      // Should only have one pattern, not duplicate detections
      expect(inlinePatterns).toHaveLength(1)
    })
  })
})
