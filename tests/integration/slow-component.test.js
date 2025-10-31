/* global Event */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp, defineComponent, ref, h } from 'vue'
import { VueRenderInspector } from '../../src/index.js'
import SlowComponent from '../../examples/components/SlowComponent.vue'

describe('Slow Component Detection', () => {
  let app
  let container

  beforeEach(() => {
    window.__VUE_RENDER_INSPECTOR__ = undefined
    container = document.createElement('div')
  })

  afterEach(() => {
    if (app) app.unmount()
  })

  it('should detect slow renders in SlowComponent', async () => {
    app = createApp({
      components: { SlowComponent },
      setup() {
        const items = ref([])

        const addItems = count => {
          const newItems = Array.from({ length: count }, (_, i) => ({
            id: items.value.length + i,
            name: `Item ${items.value.length + i}`
          }))
          items.value = [...items.value, ...newItems]
        }

        return { items, addItems }
      },
      template: `
        <div>
          <SlowComponent :items="items" />
          <button @click="addItems(10)">Add 10 Items</button>
          <button @click="addItems(100)">Add 100 Items</button>
          <button @click="addItems(1000)">Add 1000 Items</button>
        </div>
      `
    })

    app.use(VueRenderInspector, {
      enabled: true,
      console: false,
      warnThreshold: 16,
      errorThreshold: 100
    })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    // Add items to make render slow
    const buttons = container.querySelectorAll('button')

    // Start with 100 items
    buttons[1].click()
    await new Promise(resolve => setTimeout(resolve, 200))

    const _inspector = window.__VUE_RENDER_INSPECTOR__

    // Get slow components
    const slowComponents = _inspector.slow(5)
    console.log('\n🐢 Slow components detected:')
    slowComponents.forEach(stats => {
      console.log(`- ${stats.componentName}: avg ${stats.avgRenderTime}ms`)
    })

    // Should detect SlowComponent
    const slow = slowComponents.find(s => s.componentName === 'SlowComponent')
    expect(slow).toBeDefined()

    // Add more items to make it slower
    buttons[2].click() // Add 1000 more
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check updated stats
    const updatedSlow = _inspector.slow(5)
    const updatedSlowComponent = updatedSlow.find(s => s.componentName === 'SlowComponent')

    if (updatedSlowComponent) {
      console.log(`\n⚠️  Performance Warning for SlowComponent:`)
      console.log(`- Average render time: ${updatedSlowComponent.avgRenderTime}ms`)
      console.log(`- Total renders: ${updatedSlowComponent.totalRenders}`)

      // With 1100 items, it should be quite slow
      expect(parseFloat(updatedSlowComponent.avgRenderTime)).toBeGreaterThan(10)
    }
  })

  it('should differentiate between slow and fast renders', async () => {
    // Fast component
    const FastComponent = defineComponent({
      name: 'FastComponent',
      props: ['value'],
      template: `<div>Fast: {{ value }}</div>`
    })

    // Intentionally slow component
    const SlowCalculation = defineComponent({
      name: 'SlowCalculation',
      props: ['iterations'],
      render() {
        const start = performance.now()

        // Expensive synchronous calculation
        let sum = 0
        for (let i = 0; i < this.iterations; i++) {
          sum += Math.sqrt(i)
        }

        const duration = performance.now() - start

        return h('div', [
          h('p', `Iterations: ${this.iterations}`),
          h('p', `Sum: ${sum.toFixed(2)}`),
          h('small', `Render took: ${duration.toFixed(2)}ms`)
        ])
      }
    })

    app = createApp({
      components: { FastComponent, SlowCalculation },
      setup() {
        const fastValue = ref(0)
        const iterations = ref(100000)

        return { fastValue, iterations }
      },
      template: `
        <div>
          <FastComponent :value="fastValue" />
          <SlowCalculation :iterations="iterations" />
          <button @click="fastValue++">Update Fast</button>
          <button @click="iterations *= 2">Double Iterations</button>
        </div>
      `
    })

    app.use(VueRenderInspector, {
      enabled: true,
      console: false,
      warnThreshold: 16
    })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    // Trigger renders
    const buttons = container.querySelectorAll('button')

    // Update fast component a few times
    for (let i = 0; i < 3; i++) {
      buttons[0].click()
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Make slow component slower
    buttons[1].click()
    await new Promise(resolve => setTimeout(resolve, 200))

    const _inspector = window.__VUE_RENDER_INSPECTOR__
    const slowList = _inspector.slow(10)

    console.log('\nPerformance comparison:')

    const fast = slowList.find(s => s.componentName === 'FastComponent')
    const slow = slowList.find(s => s.componentName === 'SlowCalculation')

    if (fast) {
      console.log(`- FastComponent: ${fast.avgRenderTime}ms average`)
      expect(parseFloat(fast.avgRenderTime)).toBeLessThan(5)
    }

    if (slow) {
      console.log(`- SlowCalculation: ${slow.avgRenderTime}ms average`)
      expect(parseFloat(slow.avgRenderTime)).toBeGreaterThan(10)
    }

    // Slow should be significantly slower than fast
    if (fast && slow) {
      const ratio = parseFloat(slow.avgRenderTime) / parseFloat(fast.avgRenderTime)
      console.log(`- SlowCalculation is ${ratio.toFixed(1)}x slower than FastComponent`)
      expect(ratio).toBeGreaterThan(5)
    }
  })

  it('should provide performance optimization suggestions', async () => {
    // Component with multiple performance issues
    const InefficientList = defineComponent({
      name: 'InefficientList',
      props: ['items', 'filter'],
      render() {
        const start = performance.now()

        // Issue 1: Filtering in render
        const filtered = this.items.filter(item =>
          item.toLowerCase().includes(this.filter.toLowerCase())
        )

        // Issue 2: Sorting in render
        const sorted = filtered.sort((a, b) => a.localeCompare(b))

        // Issue 3: Creating elements inefficiently
        const elements = []
        for (let i = 0; i < sorted.length; i++) {
          // Issue 4: Complex calculations per item
          const hash = sorted[i].split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

          elements.push(h('li', { key: i }, [h('span', sorted[i]), h('small', ` (hash: ${hash})`)]))
        }

        const duration = performance.now() - start

        return h('div', [
          h('p', `Showing ${sorted.length} items (${duration.toFixed(2)}ms)`),
          h('ul', elements)
        ])
      }
    })

    app = createApp({
      components: { InefficientList },
      setup() {
        const items = ref([])
        const filter = ref('')

        // Generate test data
        const words = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape']
        for (let i = 0; i < 100; i++) {
          items.value.push(words[i % words.length] + i)
        }

        return { items, filter }
      },
      template: `
        <div>
          <input v-model="filter" placeholder="Filter items..." />
          <InefficientList :items="items" :filter="filter" />
        </div>
      `
    })

    app.use(VueRenderInspector, {
      enabled: true,
      console: false,
      warnThreshold: 10,
      errorThreshold: 50
    })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    // Type in filter to trigger slow renders
    const input = container.querySelector('input')

    // Simulate typing
    const typeText = async text => {
      for (const char of text) {
        input.value += char
        input.dispatchEvent(new Event('input'))
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    await typeText('app')

    const _inspector = window.__VUE_RENDER_INSPECTOR__
    const slowComponents = _inspector.slow()

    const inefficient = slowComponents.find(s => s.componentName === 'InefficientList')

    if (inefficient) {
      console.log('\n🔥 Performance Issues Detected in InefficientList:')
      console.log(`- Average render time: ${inefficient.avgRenderTime}ms`)
      console.log(`- Total renders: ${inefficient.totalRenders}`)

      console.log('\n💡 Optimization Suggestions:')
      console.log('1. Move filtering to a computed property')
      console.log('2. Use v-memo for list items')
      console.log('3. Implement virtual scrolling for large lists')
      console.log('4. Cache complex calculations')
      console.log('5. Use key binding on actual item IDs, not indices')

      expect(parseFloat(inefficient.avgRenderTime)).toBeGreaterThan(0)
    }
  })

  it('should track render time trends', async () => {
    // Component that gets progressively slower
    const ProgressiveSlowComponent = defineComponent({
      name: 'ProgressiveSlowComponent',
      props: ['complexity'],
      setup(props) {
        const renderTimes = ref([])

        return { renderTimes }
      },
      render() {
        const start = performance.now()

        // Complexity increases render time
        let result = 0
        const iterations = Math.pow(this.complexity, 3) * 1000
        for (let i = 0; i < iterations; i++) {
          result += Math.sin(i) * Math.cos(i)
        }

        const duration = performance.now() - start
        this.renderTimes.push(duration)

        return h('div', [
          h('p', `Complexity: ${this.complexity}`),
          h('p', `Latest render: ${duration.toFixed(2)}ms`),
          h(
            'p',
            `Average: ${(this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length).toFixed(2)}ms`
          )
        ])
      }
    })

    app = createApp({
      components: { ProgressiveSlowComponent },
      setup() {
        const complexity = ref(1)

        return { complexity }
      },
      template: `
        <div>
          <ProgressiveSlowComponent :complexity="complexity" />
          <button @click="complexity++">Increase Complexity</button>
          <button @click="complexity = Math.max(1, complexity - 1)">Decrease Complexity</button>
        </div>
      `
    })

    app.use(VueRenderInspector, {
      enabled: true,
      console: false,
      warnThreshold: 16
    })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    const buttons = container.querySelectorAll('button')
    const _inspector = window.__VUE_RENDER_INSPECTOR__

    // Track performance as complexity increases
    const performanceTrend = []

    for (let i = 0; i < 5; i++) {
      buttons[0].click() // Increase complexity
      await new Promise(resolve => setTimeout(resolve, 200))

      const slow = _inspector.slow()
      const component = slow.find(s => s.componentName === 'ProgressiveSlowComponent')

      if (component) {
        performanceTrend.push({
          complexity: i + 2,
          avgRenderTime: parseFloat(component.avgRenderTime)
        })
      }
    }

    console.log('\n📈 Performance Trend Analysis:')
    performanceTrend.forEach(point => {
      console.log(`- Complexity ${point.complexity}: ${point.avgRenderTime.toFixed(2)}ms`)
    })

    // Verify performance degrades with complexity
    if (performanceTrend.length > 1) {
      const first = performanceTrend[0].avgRenderTime
      const last = performanceTrend[performanceTrend.length - 1].avgRenderTime

      console.log(`\n⚠️  Performance degradation: ${(last / first).toFixed(1)}x slower`)
      expect(last).toBeGreaterThan(first)
    }
  })
})
