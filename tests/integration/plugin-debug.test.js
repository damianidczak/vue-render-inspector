import { describe, it, expect } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { VueRenderInspector, getProfiler } from '../../src/index.js'

describe('Plugin Debug - Component Detection', () => {
  it('should track basic component', async () => {
    const TestComponent = defineComponent({
      name: 'TestComponent',
      setup() {
        console.log('TestComponent setup called')
        return {}
      },
      render() {
        console.log('TestComponent render called')
        return h('div', 'Test')
      }
    })

    const app = createApp(TestComponent)

    // Add debugging to understand what's happening
    const originalUse = app.use
    app.use = function (plugin, options) {
      console.log('app.use called with plugin:', plugin)
      return originalUse.call(this, plugin, options)
    }

    app.use(VueRenderInspector, {
      enabled: true,
      console: false,
      verbose: true
    })

    const container = document.createElement('div')
    document.body.appendChild(container)

    console.log('Mounting app...')
    const instance = app.mount(container)
    console.log('App mounted, instance:', instance)

    // Wait for plugin to walk tree
    console.log('Waiting for plugin to walk tree...')
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Check if profiler exists
    const profiler = getProfiler()
    console.log('Global profiler:', profiler)

    if (profiler) {
      console.log('Tracked components:', profiler.trackedComponents)
      console.log('Render tracker stats:', profiler.renderTracker.getAllStats())
    }

    // Check global inspector
    const inspector = window.__VUE_RENDER_INSPECTOR__
    console.log('Global inspector:', inspector)

    if (inspector) {
      const summary = inspector.summary()
      console.log('Summary:', summary)
    }

    // Clean up
    app.unmount()
    document.body.removeChild(container)
  })
})
