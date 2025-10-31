import { describe, it, expect, beforeEach } from 'vitest'
import { TreeNode } from '../../../src/visualizer/nodes/TreeNode.js'

describe('TreeNode', () => {
  let node
  let mockEvent

  beforeEach(() => {
    mockEvent = {
      uid: '123',
      componentName: 'TestComponent',
      timestamp: Date.now(),
      duration: 5.5,
      isUnnecessary: false,
      reason: 'props-change'
    }

    node = new TreeNode(mockEvent)
  })

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      expect(node.uid).toBe('123')
      expect(node.componentName).toBe('TestComponent')
      expect(node.parent).toBe(null)
      expect(node.children).toEqual([])
      expect(node.x).toBe(0)
      expect(node.y).toBe(0)
      expect(node.width).toBe(180)
      expect(node.height).toBe(80)
      expect(node.state).toBe('idle')
      expect(node.warnings).toEqual([])
    })

    it('should initialize render analysis structure', () => {
      expect(node.renderAnalysis).toBeDefined()
      expect(node.renderAnalysis.totalRenders).toBe(0)
      expect(node.renderAnalysis.unnecessaryRenders).toBe(0)
      expect(node.renderAnalysis.avgRenderTime).toBe(0)
      expect(node.renderAnalysis.renderHistory).toEqual([])
      expect(node.renderAnalysis.performanceInsights).toBeDefined()
      expect(node.renderAnalysis.changePatterns).toBeDefined()
      expect(node.renderAnalysis.enhancedPatterns).toEqual([])
      expect(node.renderAnalysis.bottleneckScore).toBe(0)
    })
  })

  describe('getColor()', () => {
    it('should return purple when rendering', () => {
      node.state = 'rendering'
      expect(node.getColor()).toBe('#9c27b0')
    })

    it('should return red for render storm', () => {
      node.warnings.push('storm')
      expect(node.getColor()).toBe('#ff5722')
    })

    it('should return green for optimized component', () => {
      expect(node.getColor()).toBe('#4caf50')
    })

    it('should return red for >50% unnecessary renders', () => {
      node.renderAnalysis.totalRenders = 10
      node.renderAnalysis.unnecessaryRenders = 6
      expect(node.getColor()).toBe('#f44336')
    })

    it('should prioritize bottleneck score over unnecessary renders', () => {
      node.renderAnalysis.totalRenders = 10
      node.renderAnalysis.unnecessaryRenders = 2 // 20%
      node.renderAnalysis.bottleneckScore = 25 // Severe
      expect(node.getColor()).toBe('#d32f2f')
    })

    it('should cache color for 1 second', () => {
      const firstCall = node.getColor()
      node.state = 'rendering' // Change state
      const secondCall = node.getColor()
      expect(secondCall).toBe(firstCall) // Still cached

      // Simulate time passing
      node._cachedColorTimestamp = Date.now() - 1001
      const thirdCall = node.getColor()
      expect(thirdCall).toBe('#9c27b0') // New color
    })
  })

  describe('getUnnecessaryPercent()', () => {
    it('should return 0 when no renders', () => {
      expect(node.getUnnecessaryPercent()).toBe(0)
    })

    it('should calculate percentage correctly', () => {
      node.renderAnalysis.totalRenders = 10
      node.renderAnalysis.unnecessaryRenders = 3
      expect(node.getUnnecessaryPercent()).toBe(30)
    })
  })

  describe('updateMetrics()', () => {
    it('should increment render counters', () => {
      node.updateMetrics(mockEvent)
      expect(node.renderAnalysis.totalRenders).toBe(1)
      expect(node.renderAnalysis.unnecessaryRenders).toBe(0)

      node.updateMetrics({ ...mockEvent, isUnnecessary: true })
      expect(node.renderAnalysis.totalRenders).toBe(2)
      expect(node.renderAnalysis.unnecessaryRenders).toBe(1)
    })

    it('should calculate average render time', () => {
      node.updateMetrics({ ...mockEvent, duration: 10 })
      expect(node.renderAnalysis.avgRenderTime).toBe(10)

      node.updateMetrics({ ...mockEvent, duration: 20 })
      expect(node.renderAnalysis.avgRenderTime).toBe(15)
    })

    it('should track performance insights', () => {
      node.updateMetrics({ ...mockEvent, duration: 5 })
      node.updateMetrics({ ...mockEvent, duration: 15 })
      node.updateMetrics({ ...mockEvent, duration: 10 })

      const perf = node.renderAnalysis.performanceInsights
      expect(perf.slowestRender).toBe(15)
      expect(perf.fastestRender).toBe(5)
      expect(perf.totalRenderTime).toBe(30)
    })

    it('should track change patterns', () => {
      const patterns = node.renderAnalysis.changePatterns

      node.updateMetrics({ ...mockEvent, triggerMechanism: 'props' })
      expect(patterns.propsChanges).toBe(1)

      node.updateMetrics({ ...mockEvent, triggerMechanism: 'state' })
      expect(patterns.stateChanges).toBe(1)

      node.updateMetrics({ ...mockEvent, eventTrigger: { type: 'click' } })
      expect(patterns.eventTriggers).toBe(1)
    })

    it('should track props diff', () => {
      const propsDiff = {
        changed: { name: { from: 'old', to: 'new' } },
        added: { newProp: 'value' },
        removed: {}
      }

      node.updateMetrics({ ...mockEvent, propsDiff })
      expect(node.renderAnalysis.detailedChanges.recentPropsDiff).toEqual(propsDiff)
      expect(node.renderAnalysis.detailedChanges.propsChangeHistory).toHaveLength(1)
    })

    it('should limit render history to 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        node.updateMetrics({ ...mockEvent, timestamp: Date.now() + i })
      }
      expect(node.renderAnalysis.renderHistory).toHaveLength(20)
    })

    it('should add performance warning for slow renders', () => {
      node.updateMetrics({ ...mockEvent, duration: 20 })
      expect(node.renderAnalysis.performanceWarnings).toHaveLength(1)
      expect(node.renderAnalysis.performanceWarnings[0].type).toBe('slow-render')
    })

    it('should handle render storm', () => {
      node.updateMetrics({ ...mockEvent, isStorm: true })
      expect(node.warnings).toContain('storm')
      expect(node.renderAnalysis.performanceWarnings).toHaveLength(1)
      expect(node.renderAnalysis.performanceWarnings[0].type).toBe('render-storm')
    })

    it('should handle enhanced patterns', () => {
      const patterns = [
        {
          type: 'deepReactivityMisuse',
          reason: 'Large nested object',
          suggestion: 'Use shallowRef'
        }
      ]

      node.updateMetrics({ ...mockEvent, enhancedPatterns: patterns })
      expect(node.renderAnalysis.enhancedPatterns).toHaveLength(1)
      expect(node.renderAnalysis.bottleneckScore).toBe(10)
    })

    it('should auto-detect render storm pattern', () => {
      // Simulate high frequency renders
      for (let i = 0; i < 10; i++) {
        node.updateMetrics({ ...mockEvent, timestamp: Date.now() + i * 10 })
      }

      // Force high frequency calculation
      node.renderAnalysis.performanceInsights.renderFrequency = 70
      node.updateMetrics(mockEvent)

      const stormPattern = node.renderAnalysis.enhancedPatterns.find(p => p.type === 'renderStorm')
      expect(stormPattern).toBeDefined()
      expect(node.renderAnalysis.bottleneckScore).toBeGreaterThanOrEqual(6)
    })

    it('should invalidate color cache after update', () => {
      node.getColor() // Cache color
      expect(node._cachedColor).toBeDefined()

      node.updateMetrics(mockEvent)
      expect(node._cachedColor).toBe(null)
    })
  })

  describe('Event tracking', () => {
    it('should track event details', () => {
      const eventTrigger = {
        type: 'click',
        target: 'button'
      }

      node.updateMetrics({ ...mockEvent, eventTrigger })

      const tracking = node.renderAnalysis.eventTracking
      expect(tracking.recentEvents).toHaveLength(1)
      expect(tracking.lastEventTrigger).toEqual(eventTrigger)
      expect(tracking.eventFrequency.click).toBe(1)
    })

    it('should limit event history to 10', () => {
      for (let i = 0; i < 15; i++) {
        node.updateMetrics({
          ...mockEvent,
          eventTrigger: { type: `event${i}` }
        })
      }
      expect(node.renderAnalysis.eventTracking.recentEvents).toHaveLength(10)
    })
  })

  describe('Reactivity tracking', () => {
    it('should track reactivity events', () => {
      const reactivityTracking = ['ref.value', 'computed.dep1']
      const reactivityTriggers = ['ref.value']

      node.updateMetrics({
        ...mockEvent,
        reactivityTracking,
        reactivityTriggers
      })

      const tracking = node.renderAnalysis.reactivityTracking
      expect(tracking.recentOnTrack).toEqual(reactivityTracking)
      expect(tracking.recentOnTrigger).toEqual(reactivityTriggers)
    })
  })

  describe('Trend calculation', () => {
    it('should detect increasing render time trend', () => {
      // Add renders with increasing duration
      for (let i = 0; i < 10; i++) {
        node.updateMetrics({
          ...mockEvent,
          duration: 5 + i,
          timestamp: Date.now() + i * 100
        })
      }

      expect(node.renderAnalysis.performanceInsights.renderTimeTrend).toBe('increasing')
    })

    it('should detect stable trend', () => {
      // Add renders with consistent duration
      for (let i = 0; i < 10; i++) {
        node.updateMetrics({
          ...mockEvent,
          duration: 5 + (i % 2), // Alternates between 5 and 6
          timestamp: Date.now() + i * 100
        })
      }

      expect(node.renderAnalysis.performanceInsights.renderTimeTrend).toBe('stable')
    })
  })
})
