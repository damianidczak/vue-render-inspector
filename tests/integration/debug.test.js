import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VueRenderInspector from '../../src/index.js'
import GoodComponent from '../../examples/components/GoodComponent.vue'

describe('Debug Test', () => {
  it('should install inspector correctly', async () => {
    console.log('Starting debug test...')

    // Mount with plugin directly
    const wrapper = mount(GoodComponent, {
      props: { count: 0 },
      global: {
        plugins: [[VueRenderInspector, { enabled: true, console: true }]]
      }
    })

    // Wait for plugin to initialize
    await new Promise(resolve => setTimeout(resolve, 500))

    console.log('Window inspector:', window.__VUE_RENDER_INSPECTOR__)
    console.log('Has profiler?', !!window.__VUE_RENDER_INSPECTOR__?.profiler)

    if (window.__VUE_RENDER_INSPECTOR__?.profiler) {
      const profiler = window.__VUE_RENDER_INSPECTOR__.profiler
      console.log('Profiler:', profiler)
      console.log('Render tracker:', profiler.renderTracker)

      const allStats = profiler.renderTracker.getAllStats()
      console.log('All stats:', allStats)
      console.log(
        'Component names:',
        allStats.map(s => s.componentName)
      )
    }

    expect(window.__VUE_RENDER_INSPECTOR__).toBeDefined()

    wrapper.unmount()
  })
})
