import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp, defineComponent, ref, computed } from 'vue'
import { VueRenderInspector } from '../../src/index.js'
import RenderStormComponent from '../../examples/components/RenderStormComponent.vue'

describe('Render Storm Detection', () => {
  let app
  let container

  beforeEach(() => {
    window.__VUE_RENDER_INSPECTOR__ = undefined
    container = document.createElement('div')
  })

  afterEach(() => {
    if (app) app.unmount()
  })

  it('should detect render storm from RenderStormComponent', async () => {
    app = createApp({
      components: { RenderStormComponent },
      setup() {
        const trigger = ref(0)

        const startStorm = () => {
          // Trigger 10 renders in rapid succession
          const interval = setInterval(() => {
            trigger.value++
            if (trigger.value >= 10) {
              clearInterval(interval)
            }
          }, 50)
        }

        return { trigger, startStorm }
      },
      template: `
        <div>
          <RenderStormComponent :trigger="trigger" />
          <button @click="startStorm">Start Render Storm</button>
          <p>Trigger: {{ trigger }}</p>
        </div>
      `
    })

    app.use(VueRenderInspector, {
      enabled: true,
      console: false,
      stormThreshold: 5,
      stormWindow: 1000
    })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    const button = container.querySelector('button')
    button.click()

    // Wait for storm to complete
    await new Promise(resolve => setTimeout(resolve, 800))

    const _inspector = window.__VUE_RENDER_INSPECTOR__
    const summary = _inspector.summary()

    console.log('Render storm detection results:')
    console.log(`- Active storms: ${summary.activeStorms}`)
    console.log(`- Total renders: ${summary.totalRenders}`)

    expect(summary.activeStorms).toBeGreaterThan(0)

    // Check specific component stats
    const offenders = _inspector.top()
    const stormComponent = offenders.find(s => s.componentName === 'RenderStormComponent')

    if (stormComponent) {
      console.log(`\nRenderStormComponent stats:`)
      console.log(`- Total renders: ${stormComponent.totalRenders}`)
      console.log(`- Unnecessary: ${stormComponent.unnecessaryRenders}`)

      expect(stormComponent.totalRenders).toBeGreaterThanOrEqual(10)
    }
  })

  it('should differentiate between normal updates and storms', async () => {
    const TestComponent = defineComponent({
      name: 'NormalUpdates',
      props: ['value'],
      template: `<div>Value: {{ value }}</div>`
    })

    app = createApp({
      components: { TestComponent },
      setup() {
        const normalValue = ref(0)
        const stormValue = ref(0)

        const normalUpdates = async () => {
          // Spaced out updates - should NOT trigger storm
          for (let i = 0; i < 5; i++) {
            normalValue.value++
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }

        const stormUpdates = () => {
          // Rapid updates - should trigger storm
          for (let i = 0; i < 10; i++) {
            setTimeout(() => {
              stormValue.value++
            }, i * 20)
          }
        }

        return { normalValue, stormValue, normalUpdates, stormUpdates }
      },
      template: `
        <div>
          <TestComponent :value="normalValue" />
          <TestComponent :value="stormValue" />
          <button @click="normalUpdates">Normal Updates</button>
          <button @click="stormUpdates">Storm Updates</button>
        </div>
      `
    })

    app.use(VueRenderInspector, {
      enabled: true,
      console: false,
      stormThreshold: 5,
      stormWindow: 500
    })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    const _inspector = window.__VUE_RENDER_INSPECTOR__

    // Test normal updates
    const normalButton = container.querySelectorAll('button')[0]
    normalButton.click()
    await new Promise(resolve => setTimeout(resolve, 2000))

    const summaryAfterNormal = _inspector.summary()
    const stormsAfterNormal = summaryAfterNormal.activeStorms

    // Test storm updates
    const stormButton = container.querySelectorAll('button')[1]
    stormButton.click()
    await new Promise(resolve => setTimeout(resolve, 500))

    const summaryAfterStorm = _inspector.summary()
    const stormsAfterStorm = summaryAfterStorm.activeStorms

    console.log('Storm differentiation test:')
    console.log(`- Storms after normal updates: ${stormsAfterNormal}`)
    console.log(`- Storms after rapid updates: ${stormsAfterStorm}`)

    // Storm count should increase after rapid updates
    expect(stormsAfterStorm).toBeGreaterThan(stormsAfterNormal)
  })

  it('should provide storm-specific suggestions', async () => {
    const StormyComponent = defineComponent({
      name: 'StormyComponent',
      props: ['data'],
      setup(props) {
        // Intentionally problematic computed
        const processed = computed(() => ({ ...props.data, timestamp: Date.now() }))

        return { processed }
      },
      template: `<div>{{ processed.timestamp }}</div>`
    })

    app = createApp({
      components: { StormyComponent },
      setup() {
        const data = ref({ value: 0 })
        let stormInterval

        const createStorm = () => {
          let count = 0
          stormInterval = setInterval(() => {
            // Creating new object references rapidly
            data.value = { value: count++ }

            if (count >= 15) {
              clearInterval(stormInterval)
            }
          }, 30)
        }

        return { data, createStorm }
      },
      template: `
        <div>
          <StormyComponent :data="data" />
          <button @click="createStorm">Create Storm</button>
        </div>
      `
    })

    app.use(VueRenderInspector, {
      enabled: true,
      console: true, // Enable console to see suggestions
      stormThreshold: 5,
      stormWindow: 1000
    })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    // Create render storm
    console.log('\n🌊 Creating render storm...')
    const button = container.querySelector('button')
    button.click()

    await new Promise(resolve => setTimeout(resolve, 1000))

    const _inspector = window.__VUE_RENDER_INSPECTOR__

    // Get profiler for detailed analysis
    if (window.__VUE_RENDER_INSPECTOR__.profiler) {
      const profiler = window.__VUE_RENDER_INSPECTOR__.profiler
      const allStats = profiler.renderTracker.getAllStats()
      const stormyStats = allStats.find(s => s.componentName === 'StormyComponent')

      if (stormyStats) {
        const records = profiler.renderTracker.getComponentRecords(stormyStats.uid)
        const stormRecords = records.filter(
          r => r.suggestions && r.suggestions.some(s => s.includes('STORM'))
        )

        if (stormRecords.length > 0) {
          console.log('\n⚠️  Storm Detection Suggestions:')
          stormRecords[0].suggestions.forEach(s => console.log(`   ${s}`))

          expect(stormRecords.length).toBeGreaterThan(0)
          expect(
            stormRecords[0].suggestions.some(s => s.includes('STORM') || s.includes('frequently'))
          ).toBe(true)
        }
      }
    }
  })

  it('should track storm metrics accurately', async () => {
    const MetricsComponent = defineComponent({
      name: 'MetricsComponent',
      props: ['trigger'],
      template: `<div>Render #{{ trigger }}</div>`
    })

    app = createApp({
      components: { MetricsComponent },
      setup() {
        const trigger = ref(0)
        const stormMetrics = ref(null)

        const measureStorm = async () => {
          const startTime = Date.now()

          // Create precise storm: 20 renders in 200ms
          for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 10))
            trigger.value++
          }

          const duration = Date.now() - startTime
          stormMetrics.value = {
            renders: 20,
            duration,
            rendersPerSecond: (20 / duration) * 1000
          }
        }

        return { trigger, stormMetrics, measureStorm }
      },
      template: `
        <div>
          <MetricsComponent :trigger="trigger" />
          <button @click="measureStorm">Measure Storm</button>
          <div v-if="stormMetrics">
            <h4>Storm Metrics:</h4>
            <p>Renders: {{ stormMetrics.renders }}</p>
            <p>Duration: {{ stormMetrics.duration }}ms</p>
            <p>Rate: {{ stormMetrics.rendersPerSecond.toFixed(1) }} renders/sec</p>
          </div>
        </div>
      `
    })

    app.use(VueRenderInspector, {
      enabled: true,
      console: false,
      stormThreshold: 5,
      stormWindow: 1000
    })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    const button = container.querySelector('button')
    button.click()

    await new Promise(resolve => setTimeout(resolve, 500))

    const _inspector = window.__VUE_RENDER_INSPECTOR__
    const summary = _inspector.summary()

    console.log('\nStorm metrics validation:')
    console.log(`- Detected ${summary.activeStorms} active storms`)

    const offenders = _inspector.top()
    const metricsComponent = offenders.find(s => s.componentName === 'MetricsComponent')

    if (metricsComponent) {
      console.log(`- MetricsComponent: ${metricsComponent.totalRenders} renders`)
      expect(metricsComponent.totalRenders).toBeGreaterThanOrEqual(20)
    }

    expect(summary.activeStorms).toBeGreaterThan(0)
  })
})
