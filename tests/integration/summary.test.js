import { describe, it, expect } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { VueRenderInspector } from '../../src/index.js'
import GoodComponent from '../../examples/components/GoodComponent.vue'
import BadComponent from '../../examples/components/BadComponent.vue'

describe('Vue Render Inspector - Summary Test', () => {
  it('should correctly identify and report render patterns', async () => {
    // Create a test app with both good and bad components
    const app = createApp({
      name: 'TestApp',
      data() {
        return {
          count: 0,
          trigger: 0
        }
      },
      methods: {
        createUserObject() {
          return { id: 1, name: 'John Doe' }
        }
      },
      render() {
        return h('div', [
          h('h1', 'Test App'),
          h(GoodComponent, { count: this.count }),
          h(BadComponent, {
            user: this.createUserObject(),
            callback: () => {},
            config: { theme: 'dark' },
            items: [1, 2, 3]
          }),
          h(
            'button',
            {
              onClick: () => {
                this.trigger++
              }
            },
            'Trigger Render'
          )
        ])
      }
    })

    // Install the inspector plugin
    app.use(VueRenderInspector, {
      enabled: true,
      console: false,
      verbose: false
    })

    // Mount the app
    const container = document.createElement('div')
    app.mount(container)

    // Wait for initial render tracking
    await new Promise(resolve => setTimeout(resolve, 600))

    // Get the global inspector
    const inspector = window.__VUE_RENDER_INSPECTOR__
    expect(inspector).toBeDefined()

    // Get summary
    let summary = inspector.summary()
    console.log('Initial summary:', summary)

    // Trigger renders by changing parent state (not affecting GoodComponent)
    const vm = app._instance.proxy
    for (let i = 0; i < 5; i++) {
      vm.trigger++
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Get updated summary
    summary = inspector.summary()
    console.log('\nAfter 5 parent renders:', summary)

    // Now change the count prop (should trigger GoodComponent)
    for (let i = 1; i <= 3; i++) {
      vm.count = i
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Final summary
    summary = inspector.summary()
    console.log('\nFinal summary after prop changes:', summary)

    // Get top offenders AFTER all renders are done
    const offenders = inspector.top(5)
    console.log('\nTop offenders:')
    offenders.forEach(stats => {
      const percentage = ((stats.unnecessaryRenders / stats.totalRenders) * 100).toFixed(1)
      console.log(
        `- ${stats.componentName}: ${stats.totalRenders} renders, ${stats.unnecessaryRenders} unnecessary (${percentage}%)`
      )
    })

    // Verify results
    expect(summary.totalComponents).toBeGreaterThan(0)
    expect(summary.totalRenders).toBeGreaterThan(0)
    expect(summary.totalUnnecessary).toBeGreaterThan(0)
    expect(parseFloat(summary.unnecessaryPercentage)).toBeGreaterThan(0)

    // Check that we detected render issues
    expect(offenders.length).toBeGreaterThan(0)
    const badComponentStats = offenders.find(s => s.componentName === 'BadComponent')
    if (badComponentStats) {
      expect(badComponentStats.unnecessaryRenders).toBeGreaterThan(0)
      console.log('\n✅ BadComponent correctly identified as having unnecessary renders')
    }

    // Cleanup
    app.unmount()
    window.__VUE_RENDER_INSPECTOR__ = undefined
  })
})
