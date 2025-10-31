/* global Event */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp, defineComponent, h, ref, computed, nextTick, watchEffect } from 'vue'
import { VueRenderInspector } from '../../src/index.js'

describe('Developer Workflow - Real-world debugging scenarios', () => {
  let app
  let container

  beforeEach(() => {
    window.__VUE_RENDER_INSPECTOR__ = undefined
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (app) {
      app.unmount()
    }
    if (container) {
      document.body.removeChild(container)
    }
  })

  it('should help developer identify form re-render issues', async () => {
    // Simulate a common form component with performance issues
    const FormComponent = defineComponent({
      name: 'FormComponent',
      props: {
        initialData: Object,
        onSubmit: Function
      },
      setup(props) {
        // Common mistake: creating new refs from props
        const formData = ref({ ...props.initialData })

        // Another mistake: computed that returns new object
        const validation = computed(() => ({
          isValid: formData.value.name && formData.value.email,
          errors: []
        }))

        return { formData, validation }
      },
      render() {
        console.log('FormComponent rendering')
        return h('form', [
          h('input', {
            value: this.formData.name,
            onInput: e => {
              this.formData.name = e.target.value
            },
            placeholder: 'Name'
          }),
          h('input', {
            value: this.formData.email,
            onInput: e => {
              this.formData.email = e.target.value
            },
            placeholder: 'Email'
          }),
          this.validation.isValid ? h('div', '✓ Valid') : null
        ])
      }
    })

    // Parent that incorrectly passes props
    app = createApp({
      name: 'FormApp',
      components: { FormComponent },
      setup() {
        const submitCount = ref(0)

        // Mistake: creating new object on every render
        const getInitialData = () => ({
          name: '',
          email: ''
        })

        // Mistake: inline function
        return {
          getInitialData,
          submitCount
        }
      },
      render() {
        console.log('FormApp rendering, submitCount:', this.submitCount)
        return h('div', [
          h(FormComponent, {
            initialData: this.getInitialData(),
            onSubmit: () => this.submitCount++
          }),
          h(
            'button',
            {
              onClick: () => {
                console.log('Button clicked!')
                this.submitCount++
              }
            },
            'Force Update'
          )
        ])
      }
    })

    app.use(VueRenderInspector, { enabled: true, console: false })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    const inspector = window.__VUE_RENDER_INSPECTOR__

    // Check initial state
    let summary = inspector.summary()
    console.log('Initial summary:', summary)

    // Trigger parent updates
    const button = container.querySelector('button')
    for (let i = 0; i < 3; i++) {
      console.log(`\nClicking button ${i + 1}...`)
      button.click()
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check state after each click
      summary = inspector.summary()
      console.log(`After click ${i + 1}:`, summary)
    }

    // Get insights
    const offenders = inspector.top(10)
    console.log(
      '\nTop offenders:',
      offenders.map(s => ({
        name: s.componentName,
        renders: s.totalRenders,
        unnecessary: s.unnecessaryRenders,
        percentage: `${((s.unnecessaryRenders / s.totalRenders) * 100).toFixed(1)}%`
      }))
    )

    // Developer should see:
    // 1. High unnecessary render percentage
    expect(parseFloat(summary.unnecessaryPercentage)).toBeGreaterThan(30)

    // 2. Specific component causing issues
    const formIssues = offenders.find(s => s.componentName === 'FormComponent')
    expect(formIssues).toBeDefined()
    expect(formIssues.unnecessaryRenders).toBeGreaterThan(0)

    // This helps developers understand that FormComponent is re-rendering unnecessarily
    console.log(
      `Developer insight: FormComponent has ${formIssues.unnecessaryRenders} unnecessary renders!`
    )
  })

  it('should detect list rendering performance issues', async () => {
    // Common list component with performance problems
    const ListItem = defineComponent({
      name: 'ListItem',
      props: {
        item: Object,
        onSelect: Function,
        isSelected: Boolean
      },
      template: `
        <li :class="{ selected: isSelected }" @click="onSelect(item)">
          {{ item.name }} - {{ item.value }}
        </li>
      `
    })

    const ListView = defineComponent({
      name: 'ListView',
      components: { ListItem },
      setup() {
        const items = ref([])
        const selectedId = ref(null)

        // Populate list
        for (let i = 0; i < 20; i++) {
          items.value.push({
            id: i,
            name: `Item ${i}`,
            value: Math.random()
          })
        }

        // Mistake: creating new function for each item
        const handleSelect = item => {
          selectedId.value = item.id
        }

        // Mistake: computed that always returns new array
        const processedItems = computed(() =>
          items.value.map(item => ({
            ...item,
            displayName: item.name.toUpperCase()
          }))
        )

        return {
          processedItems,
          selectedId,
          handleSelect
        }
      },
      template: `
        <ul>
          <ListItem
            v-for="item in processedItems"
            :key="item.id"
            :item="item"
            :is-selected="selectedId === item.id"
            :on-select="handleSelect"
          />
        </ul>
      `
    })

    app = createApp(ListView)
    app.use(VueRenderInspector, { enabled: true, console: false })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    const inspector = window.__VUE_RENDER_INSPECTOR__

    // Simulate user interactions
    const listItems = container.querySelectorAll('li')

    // Click different items
    listItems[0].click()
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    listItems[5].click()
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check performance
    const summary = inspector.summary()
    const offenders = inspector.top()

    console.log('List rendering analysis:')
    console.log('- Total renders:', summary.totalRenders)
    console.log('- Unnecessary:', summary.totalUnnecessary)

    // Developer should see that many ListItems are re-rendering
    const listItemStats = offenders.find(s => s.componentName === 'ListItem')
    if (listItemStats) {
      console.log(`Warning: ListItem components are re-rendering excessively!`)
      console.log(`- ${listItemStats.totalRenders} total renders`)
      console.log(`- ${listItemStats.unnecessaryRenders} were unnecessary`)
    }

    expect(summary.totalRenders).toBeGreaterThan(20) // Many list items rendering
  })

  it('should track slow component renders with detailed timing', async () => {
    // Component with expensive computation
    const DataProcessor = defineComponent({
      name: 'DataProcessor',
      props: {
        data: Array,
        filter: String
      },
      setup(props) {
        // Intentionally slow computation
        const processedData = computed(() => {
          const start = performance.now()
          const result = []

          // Simulate expensive operation
          for (let i = 0; i < 1000000; i++) {
            if (i % 100000 === 0) {
              result.push(i)
            }
          }

          const duration = performance.now() - start
          console.log(`DataProcessor computation took ${duration}ms`)

          return props.data.filter(item => item.toLowerCase().includes(props.filter.toLowerCase()))
        })

        return { processedData }
      },
      template: `
        <div>
          <h3>Processed Data ({{ processedData.length }} items)</h3>
          <ul>
            <li v-for="item in processedData" :key="item">{{ item }}</li>
          </ul>
        </div>
      `
    })

    app = createApp({
      components: { DataProcessor },
      setup() {
        const data = ref(['apple', 'banana', 'cherry', 'date', 'elderberry'])
        const filter = ref('')

        return { data, filter }
      },
      template: `
        <div>
          <input v-model="filter" placeholder="Filter..." />
          <DataProcessor :data="data" :filter="filter" />
        </div>
      `
    })

    app.use(VueRenderInspector, {
      enabled: true,
      console: false,
      warnThreshold: 10, // Lower threshold for testing
      errorThreshold: 50
    })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    const inspector = window.__VUE_RENDER_INSPECTOR__

    // Trigger slow renders by typing
    const input = container.querySelector('input')
    input.value = 'a'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Get performance data
    const slow = inspector.slow(5)
    console.log('Slow components detected:')
    slow.forEach(stats => {
      console.log(`- ${stats.componentName}: avg ${stats.avgRenderTime}ms`)
    })

    // Developer should see slow component
    const slowComponent = slow.find(s => s.componentName === 'DataProcessor')
    expect(slowComponent).toBeDefined()

    // Get detailed timing from the profiler
    if (window.__VUE_RENDER_INSPECTOR__.profiler) {
      const profiler = window.__VUE_RENDER_INSPECTOR__.profiler
      const allStats = profiler.renderTracker.getAllStats()
      const dpStats = allStats.find(s => s.componentName === 'DataProcessor')

      if (dpStats) {
        console.log(`\nPerformance Alert for DataProcessor:`)
        console.log(`- Average render time: ${parseFloat(dpStats.avgRenderTime).toFixed(2)}ms`)
        console.log(`- Total renders: ${dpStats.totalRenders}`)
        console.log(`- Suggestion: Consider memoizing expensive computations`)
      }
    }
  })

  it('should provide actionable insights for component optimization', async () => {
    // Component with multiple performance issues
    const ProblematicComponent = defineComponent({
      name: 'ProblematicComponent',
      props: {
        config: Object,
        items: Array,
        callback: Function
      },
      setup(props) {
        // Issue 1: Watching props that create new references
        watchEffect(() => {
          console.log('Config changed:', props.config)
        })

        // Issue 2: Creating new objects in computed
        const stats = computed(() => ({
          total: props.items.length,
          average: props.items.reduce((a, b) => a + b, 0) / props.items.length
        }))

        return { stats }
      },
      template: `
        <div>
          <h3>Stats</h3>
          <p>Total: {{ stats.total }}</p>
          <p>Average: {{ stats.average.toFixed(2) }}</p>
          <button @click="callback">Action</button>
        </div>
      `
    })

    app = createApp({
      components: { ProblematicComponent },
      setup() {
        const trigger = ref(0)

        return {
          trigger,
          // These create new references every render
          getConfig: () => ({ theme: 'dark', size: 'large' }),
          getItems: () => [1, 2, 3, 4, 5],
          handleClick: () => console.log('clicked')
        }
      },
      template: `
        <div>
          <ProblematicComponent
            :config="getConfig()"
            :items="getItems()"
            :callback="handleClick"
          />
          <button @click="trigger++">Update ({{ trigger }})</button>
        </div>
      `
    })

    app.use(VueRenderInspector, { enabled: true, console: false })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    const inspector = window.__VUE_RENDER_INSPECTOR__

    // Trigger multiple unnecessary renders
    const button = container.querySelectorAll('button')[1]
    for (let i = 0; i < 5; i++) {
      button.click()
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Analyze the issues
    const summary = inspector.summary()
    const offenders = inspector.top()

    console.log('\n🔍 PERFORMANCE ANALYSIS REPORT:')
    console.log('================================')
    console.log(`Total Components: ${summary.totalComponents}`)
    console.log(`Total Renders: ${summary.totalRenders}`)
    console.log(
      `Unnecessary Renders: ${summary.totalUnnecessary} (${summary.unnecessaryPercentage}%)`
    )

    console.log('\n📊 TOP PERFORMANCE OFFENDERS:')
    offenders.forEach((stats, index) => {
      console.log(`\n${index + 1}. ${stats.componentName}`)
      console.log(`   - Total renders: ${stats.totalRenders}`)
      console.log(`   - Unnecessary: ${stats.unnecessaryRenders}`)
      console.log(`   - Avg render time: ${stats.avgRenderTime}ms`)

      // Get specific render records for detailed analysis
      if (window.__VUE_RENDER_INSPECTOR__.profiler) {
        const profiler = window.__VUE_RENDER_INSPECTOR__.profiler
        const records = profiler.renderTracker.getComponentRecords(stats.uid)
        const lastUnnecessary = records.filter(r => r.isUnnecessary).pop()

        if (lastUnnecessary && lastUnnecessary.suggestions) {
          console.log(`   - Suggestions:`)
          lastUnnecessary.suggestions.forEach(s => console.log(`     • ${s}`))
        }
      }
    })

    // Verify the tool is providing useful insights
    const problematic = offenders.find(s => s.componentName === 'ProblematicComponent')
    expect(problematic).toBeDefined()
    expect(problematic.unnecessaryRenders).toBeGreaterThan(0)

    console.log('\n✅ RECOMMENDED FIXES:')
    console.log('1. Move getConfig() and getItems() outside render function')
    console.log('2. Use useCallback or stable references for callbacks')
    console.log('3. Consider using shallowRef for large objects')
    console.log('4. Implement proper memoization for expensive computations')
  })
})
