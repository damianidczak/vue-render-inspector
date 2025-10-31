import { describe, it, expect, beforeEach, vi } from 'vitest'
import { InspectorPanel } from '../../../src/visualizer/ui/InspectorPanel.js'
import { TreeNode } from '../../../src/visualizer/nodes/TreeNode.js'

describe('InspectorPanel', () => {
  let inspectorPanel
  let mockNode

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = ''
    inspectorPanel = new InspectorPanel()

    // Create mock TreeNode with data
    mockNode = new TreeNode({
      uid: '123',
      componentName: 'TestComponent',
      timestamp: Date.now()
    })

    // Set up mock data
    mockNode.renderAnalysis.totalRenders = 10
    mockNode.renderAnalysis.unnecessaryRenders = 3
    mockNode.renderAnalysis.avgRenderTime = 5.5
    mockNode.renderAnalysis.performanceInsights.slowestRender = 12
    mockNode.renderAnalysis.performanceInsights.fastestRender = 2
    mockNode.renderAnalysis.performanceInsights.totalRenderTime = 55

    // Mock the getColor method
    mockNode.getColor = vi.fn(() => '#42b883')
    mockNode.getUnnecessaryPercent = vi.fn(() => 30)
  })

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(inspectorPanel.panel).toBe(null)
      expect(inspectorPanel.selectedNode).toBe(null)
    })
  })

  describe('createPanel()', () => {
    it('should create inspector panel element', () => {
      const panel = inspectorPanel.createPanel()

      expect(panel).toBeDefined()
      expect(panel.tagName).toBe('DIV')
      expect(panel.id).toBe('vri-inspector')
      expect(inspectorPanel.panel).toBe(panel)
    })

    it('should set proper styles', () => {
      const panel = inspectorPanel.createPanel()

      expect(panel.style.position).toBe('absolute')
      expect(panel.style.display).toBe('none')
      expect(panel.style.right).toBe('20px')
      expect(panel.style.width).toBe('350px')
    })
  })

  describe('showInspector()', () => {
    it('should display panel and render node details', () => {
      const panel = inspectorPanel.createPanel()
      document.body.appendChild(panel)

      // Mock console.log to verify debug output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      inspectorPanel.showInspector(mockNode)

      expect(panel.style.display).toBe('block')
      expect(inspectorPanel.selectedNode).toBe(mockNode)
      expect(panel.innerHTML).toContain('TestComponent')
      expect(panel.innerHTML).toContain('UID: 123')
      expect(panel.innerHTML).toContain('Total Renders')
      expect(panel.innerHTML).toContain('10')
      expect(panel.innerHTML).toContain('Unnecessary')
      expect(panel.innerHTML).toContain('3')

      // Verify debug log was called
      expect(consoleSpy).toHaveBeenCalledWith(
        '[VRI Inspector] Node data:',
        expect.objectContaining({
          componentName: 'TestComponent'
        })
      )

      consoleSpy.mockRestore()
    })

    it('should not render if panel not created', () => {
      expect(() => {
        inspectorPanel.showInspector(mockNode)
      }).not.toThrow()
    })

    it('should render performance metrics', () => {
      const panel = inspectorPanel.createPanel()
      document.body.appendChild(panel)

      inspectorPanel.showInspector(mockNode)

      expect(panel.innerHTML).toContain('Performance Metrics')
      expect(panel.innerHTML).toContain('Avg Render Time:')
      expect(panel.innerHTML).toContain('5.50ms')
      expect(panel.innerHTML).toContain('Slowest Render:')
      expect(panel.innerHTML).toContain('12.0ms')
    })
  })

  describe('hideInspector()', () => {
    it('should hide panel and clear selected node', () => {
      const panel = inspectorPanel.createPanel()
      document.body.appendChild(panel)

      inspectorPanel.showInspector(mockNode)
      expect(panel.style.display).toBe('block')

      inspectorPanel.hideInspector()
      expect(panel.style.display).toBe('none')
      expect(inspectorPanel.selectedNode).toBe(null)
    })
  })

  describe('selectNode()', () => {
    it('should show inspector when node provided', () => {
      const panel = inspectorPanel.createPanel()
      document.body.appendChild(panel)

      inspectorPanel.selectNode(mockNode)
      expect(panel.style.display).toBe('block')
      expect(inspectorPanel.selectedNode).toBe(mockNode)
    })

    it('should hide inspector when null provided', () => {
      const panel = inspectorPanel.createPanel()
      document.body.appendChild(panel)

      inspectorPanel.selectNode(mockNode)
      inspectorPanel.selectNode(null)

      expect(panel.style.display).toBe('none')
      expect(inspectorPanel.selectedNode).toBe(null)
    })
  })

  describe('Rendering sections', () => {
    beforeEach(() => {
      const panel = inspectorPanel.createPanel()
      document.body.appendChild(panel)
    })

    it('should render change patterns when present', () => {
      mockNode.renderAnalysis.changePatterns.propsChanges = 5
      mockNode.renderAnalysis.changePatterns.stateChanges = 3
      mockNode.renderAnalysis.changePatterns.eventTriggers = 2

      inspectorPanel.showInspector(mockNode)

      expect(inspectorPanel.panel.innerHTML).toContain('Render Triggers')
      expect(inspectorPanel.panel.innerHTML).toContain('Props Changes:')
      expect(inspectorPanel.panel.innerHTML).toContain('5')
      expect(inspectorPanel.panel.innerHTML).toContain('State Changes:')
      expect(inspectorPanel.panel.innerHTML).toContain('3')
    })

    it('should render event tracking when events present', () => {
      mockNode.renderAnalysis.eventTracking.recentEvents = [
        {
          timestamp: Date.now(),
          event: { type: 'click' },
          triggerMechanism: 'user-action'
        }
      ]
      mockNode.renderAnalysis.eventTracking.eventFrequency = {
        click: 5,
        input: 3
      }

      inspectorPanel.showInspector(mockNode)

      expect(inspectorPanel.panel.innerHTML).toContain('Event History')
      expect(inspectorPanel.panel.innerHTML).toContain('click')
      expect(inspectorPanel.panel.innerHTML).toContain('user-action')
      expect(inspectorPanel.panel.innerHTML).toContain('Event Frequency')
      expect(inspectorPanel.panel.innerHTML).toContain('click: 5x')
    })

    it('should render bottleneck detection when patterns detected', () => {
      mockNode.renderAnalysis.enhancedPatterns = [
        {
          type: 'deepReactivityMisuse',
          reason: 'Large nested object causing deep reactive tracking',
          suggestion: 'Use shallowRef for large objects',
          example: {
            bad: 'const state = ref(largeObject)',
            good: 'const state = shallowRef(largeObject)'
          }
        }
      ]
      mockNode.renderAnalysis.bottleneckScore = 15

      inspectorPanel.showInspector(mockNode)

      expect(inspectorPanel.panel.innerHTML).toContain('Detected Performance Bottlenecks')
      expect(inspectorPanel.panel.innerHTML).toContain('Score: 15')
      expect(inspectorPanel.panel.innerHTML).toContain('Deep Reactivity Misuse')
      expect(inspectorPanel.panel.innerHTML).toContain('Use shallowRef')
      expect(inspectorPanel.panel.innerHTML).toContain('See Example')
    })

    it('should render optimization suggestions when present', () => {
      mockNode.renderAnalysis.optimizationSuggestions.add('Use v-memo for list items')
      mockNode.renderAnalysis.optimizationSuggestions.add('Consider computed properties')

      inspectorPanel.showInspector(mockNode)

      expect(inspectorPanel.panel.innerHTML).toContain('General Suggestions')
      expect(inspectorPanel.panel.innerHTML).toContain('Use v-memo for list items')
      expect(inspectorPanel.panel.innerHTML).toContain('Consider computed properties')
    })

    it('should render warnings when present', () => {
      mockNode.warnings = ['storm', 'Custom warning']

      inspectorPanel.showInspector(mockNode)

      expect(inspectorPanel.panel.innerHTML).toContain('Render storm detected')
      expect(inspectorPanel.panel.innerHTML).toContain('Custom warning')
    })

    it('should render clear data button', () => {
      inspectorPanel.showInspector(mockNode)

      expect(inspectorPanel.panel.innerHTML).toContain('Clear Component Data')
      expect(inspectorPanel.panel.innerHTML).toContain(`clearNodeData('123')`)
    })
  })

  describe('_formatDiff()', () => {
    beforeEach(() => {
      inspectorPanel.createPanel()
    })

    it('should format change diff correctly', () => {
      const diff = {
        changed: {
          name: { from: 'old', to: 'new' },
          count: { from: 1, to: 2, sameReference: true }
        },
        added: {
          newProp: 'value'
        },
        removed: {
          oldProp: 'removed'
        }
      }

      const result = inspectorPanel._formatDiff(diff)

      expect(result).toContain('Changed:')
      expect(result).toContain('name:')
      expect(result).toContain('old')
      expect(result).toContain('new')
      expect(result).toContain('(same ref)')
      expect(result).toContain('Added:')
      expect(result).toContain('newProp')
      expect(result).toContain('Removed:')
      expect(result).toContain('oldProp')
    })

    it('should return no changes message for null diff', () => {
      const result = inspectorPanel._formatDiff(null)
      expect(result).toContain('No changes detected')
    })

    it('should return no changes message for empty diff', () => {
      const diff = {
        changed: {},
        added: {},
        removed: {}
      }

      const result = inspectorPanel._formatDiff(diff)
      expect(result).toContain('No changes detected')
    })
  })

  describe('_formatValue()', () => {
    beforeEach(() => {
      inspectorPanel.createPanel()
    })

    it('should format different value types correctly', () => {
      expect(inspectorPanel._formatValue(null)).toBe('null')
      expect(inspectorPanel._formatValue(undefined)).toBe('undefined')
      expect(inspectorPanel._formatValue(() => {})).toBe('[Function]')
      expect(inspectorPanel._formatValue('short')).toBe('"short"')
      expect(inspectorPanel._formatValue('a very long string that exceeds twenty chars')).toBe(
        '"a very long string t..."'
      )
      expect(inspectorPanel._formatValue([1, 2, 3])).toBe('Array(3)')
      expect(inspectorPanel._formatValue({ a: 1, b: 2 })).toBe('{2 keys}')
      expect(inspectorPanel._formatValue(123)).toBe('123')
      expect(inspectorPanel._formatValue(true)).toBe('true')
    })
  })

  describe('Complex rendering scenarios', () => {
    it('should render complete inspector with all sections', () => {
      const panel = inspectorPanel.createPanel()
      document.body.appendChild(panel)

      // Set up comprehensive mock data
      mockNode.renderAnalysis.changePatterns.propsChanges = 5
      mockNode.renderAnalysis.renderHistory = [
        {
          timestamp: Date.now(),
          reason: 'props-change',
          duration: 5.5,
          isUnnecessary: true,
          details: 'Props changed: name, value',
          triggerMechanism: 'props',
          suggestions: ['Use memo()']
        }
      ]
      mockNode.renderAnalysis.detailedChanges.recentPropsDiff = {
        changed: { name: { from: 'old', to: 'new' } }
      }
      mockNode.renderAnalysis.performanceInsights.renderTimeTrend = 'increasing'
      mockNode.renderAnalysis.performanceWarnings = [{ suggestion: 'Render time increasing' }]
      mockNode.parent = { componentName: 'ParentComponent' }
      mockNode.children = [1, 2, 3]
      mockNode.depth = 2

      inspectorPanel.showInspector(mockNode)

      const html = panel.innerHTML

      // Verify all major sections are rendered
      expect(html).toContain('TestComponent')
      expect(html).toContain('Total Renders')
      expect(html).toContain('Performance Metrics')
      expect(html).toContain('Render Triggers')
      expect(html).toContain('Change Details')
      expect(html).toContain('Recent Render Details')
      expect(html).toContain('Performance Analysis')
      expect(html).toContain('Component Details')
      expect(html).toContain('ParentComponent')
      expect(html).toContain('3 components')
    })
  })

  describe('Edge cases', () => {
    it('should handle node with minimal data', () => {
      const minimalNode = new TreeNode({
        uid: '1',
        componentName: 'Minimal',
        timestamp: Date.now()
      })
      minimalNode.getColor = vi.fn(() => '#000')
      minimalNode.getUnnecessaryPercent = vi.fn(() => 0)

      const panel = inspectorPanel.createPanel()
      document.body.appendChild(panel)

      expect(() => {
        inspectorPanel.showInspector(minimalNode)
      }).not.toThrow()

      expect(panel.innerHTML).toContain('Minimal')
    })

    it('should escape HTML in component names', () => {
      mockNode.componentName = '<script>alert("XSS")</script>'
      mockNode.renderAnalysis.enhancedPatterns = [
        {
          type: 'test',
          reason: '<img src=x onerror="alert(1)">',
          suggestion: '<div onclick="alert(2)">Click</div>'
        }
      ]

      const panel = inspectorPanel.createPanel()
      document.body.appendChild(panel)

      inspectorPanel.showInspector(mockNode)

      expect(panel.innerHTML).toContain('&lt;script&gt;alert("XSS")&lt;/script&gt;')
      expect(panel.innerHTML).not.toContain('<script>')
      expect(panel.innerHTML).toContain('&lt;img src=x onerror="alert(1)"&gt;')
      expect(panel.innerHTML).toContain('&lt;div onclick="alert(2)"&gt;Click&lt;/div&gt;')
    })
  })
})
