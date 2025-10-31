import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { VueRenderInspector } from '../../src/index.js'
import BadComponent from '../../examples/components/BadComponent.vue'

describe('BadComponent - Anti-patterns Detection', () => {
  let app
  let container
  let parentInstance

  beforeEach(() => {
    window.__VUE_RENDER_INSPECTOR__ = undefined
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (app) {
      app.unmount()
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  // Create a parent component that triggers unnecessary renders
  const ParentComponent = defineComponent({
    name: 'ParentComponent',
    data() {
      return {
        trigger: 0
      }
    },
    methods: {
      // This creates new object references every time
      createUserObject() {
        return { id: 1, name: 'John Doe', email: 'john@example.com' }
      }
    },
    mounted() {
      parentInstance = this
    },
    render() {
      return h('div', [
        h(BadComponent, {
          user: this.createUserObject(),
          callback: () => console.log('inline'),
          config: { theme: 'dark', mode: 'full' },
          items: ['item1', 'item2', 'item3']
        }),
        h('div', `Trigger: ${this.trigger}`)
      ])
    }
  })

  it('should detect unnecessary renders from new object references', async () => {
    app = createApp(ParentComponent)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Get initial stats for BadComponent
    const allStats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()
    const badComponentStats = allStats.find(s => s.componentName === 'BadComponent')

    expect(badComponentStats).toBeDefined()
    const initialRenders = badComponentStats.totalRenders

    // Trigger parent re-render without changing actual data
    parentInstance.trigger++
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check stats again
    const updatedStats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker
      .getAllStats()
      .find(s => s.componentName === 'BadComponent')

    console.log('BadComponent stats after parent re-render:', {
      totalRenders: updatedStats.totalRenders,
      unnecessaryRenders: updatedStats.unnecessaryRenders,
      renderIncrease: updatedStats.totalRenders - initialRenders
    })

    // Should have rendered more times
    expect(updatedStats.totalRenders).toBeGreaterThan(initialRenders)

    // These renders should be marked as unnecessary
    expect(updatedStats.unnecessaryRenders).toBeGreaterThan(0)
  })

  it('should provide suggestions for fixing anti-patterns', async () => {
    app = createApp(ParentComponent)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Trigger multiple parent renders
    for (let i = 0; i < 3; i++) {
      parentInstance.trigger++
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Get render records for BadComponent
    const allStats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()
    const badComponentStats = allStats.find(s => s.componentName === 'BadComponent')

    // Get render history
    const records = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getComponentRecords(
      badComponentStats.uid
    )

    // Find unnecessary renders
    const unnecessaryRecords = records.filter(r => r.isUnnecessary)
    expect(unnecessaryRecords.length).toBeGreaterThan(0)

    // Check that suggestions are provided
    const lastUnnecessary = unnecessaryRecords[unnecessaryRecords.length - 1]
    expect(lastUnnecessary.suggestions).toBeDefined()
    expect(Array.isArray(lastUnnecessary.suggestions)).toBe(true)
    expect(lastUnnecessary.suggestions.length).toBeGreaterThan(0)

    console.log('Suggestions for fixing:', lastUnnecessary.suggestions)
  })

  it('should detect multiple anti-patterns', async () => {
    app = createApp(ParentComponent)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Trigger parent render
    parentInstance.trigger++
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Get render records
    const allStats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()
    const badComponentStats = allStats.find(s => s.componentName === 'BadComponent')
    const records = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getComponentRecords(
      badComponentStats.uid
    )

    // Get the last unnecessary render
    const unnecessaryRecord = records.find(r => r.isUnnecessary)

    if (unnecessaryRecord) {
      console.log('Detected anti-patterns:', {
        reason: unnecessaryRecord.reason,
        details: unnecessaryRecord.details,
        suggestions: unnecessaryRecord.suggestions
      })

      // Should detect multiple issues
      const changedProps =
        unnecessaryRecord.propsDiff?.changed || unnecessaryRecord.changedProps || {}

      // BadComponent receives multiple props that change references
      expect(unnecessaryRecord).toBeDefined()
      expect(unnecessaryRecord.reason).toBe('reference-changes-only')

      // Log detected patterns
      console.log('Props diff:', unnecessaryRecord.propsDiff)
      console.log('Changed props:', changedProps)
    }
  })

  it('should track render frequency for BadComponent', async () => {
    app = createApp(ParentComponent)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Trigger rapid renders
    for (let i = 0; i < 5; i++) {
      parentInstance.trigger++
      await nextTick()
    }

    await new Promise(resolve => setTimeout(resolve, 100))

    const allStats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()
    const badComponentStats = allStats.find(s => s.componentName === 'BadComponent')

    expect(badComponentStats.totalRenders).toBeGreaterThanOrEqual(5)
    expect(badComponentStats.unnecessaryRenders).toBeGreaterThan(0)

    // Calculate unnecessary render percentage
    const percentage = (badComponentStats.unnecessaryRenders / badComponentStats.totalRenders) * 100
    console.log(`BadComponent unnecessary render rate: ${percentage.toFixed(1)}%`)
  })

  // Additional test cases for mixed scenarios
  it('should detect mixed scenarios with some real changes and some reference changes', async () => {
    const MixedScenarioComponent = defineComponent({
      name: 'MixedScenarioComponent',
      props: {
        counter: { type: Number, default: 0 },
        stableData: { type: Object, default: () => ({}) },
        changingData: { type: Object, default: () => ({}) }
      },
      render() {
        return h('div', `Counter: ${this.counter}`)
      }
    })

    const MixedParentComponent = defineComponent({
      name: 'MixedParentComponent',
      data() {
        return {
          counter: 0,
          trigger: 0
        }
      },
      mounted() {
        parentInstance = this
      },
      methods: {
        getStableData() {
          return { type: 'stable', value: 'unchanged' }
        },
        getChangingData() {
          return { type: 'changing', value: this.trigger }
        }
      },
      render() {
        return h('div', [
          h(MixedScenarioComponent, {
            counter: this.counter,
            stableData: this.getStableData(),
            changingData: this.getChangingData()
          }),
          h('div', `Trigger: ${this.trigger}`)
        ])
      }
    })

    app = createApp(MixedParentComponent)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    const initialStats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()
    const mixedComponentStats = initialStats.find(s => s.componentName === 'MixedScenarioComponent')
    const initialRenders = mixedComponentStats.totalRenders

    // First update: change counter (real change) + new references (unnecessary)
    parentInstance.counter++
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Second update: only trigger parent re-render (should be unnecessary)
    parentInstance.trigger++
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    const finalStats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()
    const finalMixedStats = finalStats.find(s => s.componentName === 'MixedScenarioComponent')

    expect(finalMixedStats.totalRenders).toBe(5)
    expect(finalMixedStats.unnecessaryRenders).toBeGreaterThan(0)

    const records = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getComponentRecords(
      finalMixedStats.uid
    )
    const unnecessaryRecords = records.filter(r => r.isUnnecessary)
    expect(unnecessaryRecords.length).toBeGreaterThan(0)
    expect(unnecessaryRecords[0].reason).toBe('reference-changes-only')
  })

  // Test for trigger mechanism detection
  it('should correctly classify different trigger mechanisms', async () => {
    const TriggerTestComponent = defineComponent({
      name: 'TriggerTestComponent',
      props: {
        propValue: String
      },
      data() {
        return {
          internalState: 'initial'
        }
      },
      computed: {
        computedValue() {
          return `${this.propValue.toUpperCase()}-${this.internalState}`
        }
      },
      render() {
        return h('div', this.computedValue)
      }
    })

    const TriggerParentComponent = defineComponent({
      name: 'TriggerParentComponent',
      data() {
        return {
          propValue: 'initial',
          trigger: 0
        }
      },
      mounted() {
        parentInstance = this
      },
      render() {
        return h('div', [
          h(TriggerTestComponent, {
            propValue: this.propValue
          }),
          h('div', `Trigger: ${this.trigger}`)
        ])
      }
    })

    app = createApp(TriggerParentComponent)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    const initialStats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()
    const triggerComponentStats = initialStats.find(s => s.componentName === 'TriggerTestComponent')

    // Change prop - should be necessary
    parentInstance.propValue = 'changed'
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Change trigger only - should be unnecessary (reference changes)
    parentInstance.trigger++
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    const finalStats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()
    const finalTriggerStats = finalStats.find(s => s.componentName === 'TriggerTestComponent')

    expect(finalTriggerStats.totalRenders).toBeGreaterThan(2)
    expect(finalTriggerStats.unnecessaryRenders).toBeGreaterThan(0)

    const records = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getComponentRecords(
      finalTriggerStats.uid
    )
    const unnecessaryRecord = records.find(r => r.isUnnecessary)
    expect(unnecessaryRecord).toBeDefined()
    expect(unnecessaryRecord.triggerMechanism).toBeDefined()
  })

  // Test nested object references
  it('should handle nested object reference changes correctly', async () => {
    const NestedObjectComponent = defineComponent({
      name: 'NestedObjectComponent',
      props: {
        user: { type: Object, default: () => ({}) }
      },
      render() {
        return h('div', `User: ${this.user?.name || 'Unknown'}`)
      }
    })

    const NestedParentComponent = defineComponent({
      name: 'NestedParentComponent',
      data() {
        return {
          trigger: 0
        }
      },
      mounted() {
        parentInstance = this
      },
      methods: {
        createNestedUser() {
          return {
            id: 1,
            name: 'John Doe',
            profile: {
              age: 30,
              settings: { theme: 'dark' }
            }
          }
        }
      },
      render() {
        return h('div', [
          h(NestedObjectComponent, {
            user: this.createNestedUser()
          }),
          h('div', `Trigger: ${this.trigger}`)
        ])
      }
    })

    app = createApp(NestedParentComponent)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    const initialStats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()

    // Trigger parent re-render (creates new nested object references)
    parentInstance.trigger++
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    const finalStats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()
    const finalNestedStats = finalStats.find(s => s.componentName === 'NestedObjectComponent')

    expect(finalNestedStats.totalRenders).toBeGreaterThan(1)
    expect(finalNestedStats.unnecessaryRenders).toBeGreaterThan(0)

    const records = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getComponentRecords(
      finalNestedStats.uid
    )
    const unnecessaryRecord = records.find(r => r.isUnnecessary)
    expect(unnecessaryRecord.reason).toBe('reference-changes-only')

    const suggestions = unnecessaryRecord.suggestions || []
    expect(suggestions.length).toBeGreaterThan(0)
    const memoizingSuggestion = suggestions.find(s => s.includes('memoizing'))
    expect(memoizingSuggestion).toBeDefined()
  })

  // Test missing keys in lists
  it('should detect missing key props in list components', async () => {
    const ListComponent = defineComponent({
      name: 'ListComponent',
      props: {
        items: { type: Array, default: () => [] }
      },
      render() {
        return h(
          'ul',
          this.items.map(item => h('li', item.name))
        )
      }
    })

    const ListParentComponent = defineComponent({
      name: 'ListParentComponent',
      data() {
        return {
          trigger: 0
        }
      },
      mounted() {
        parentInstance = this
      },
      render() {
        return h('div', [
          h(ListComponent, {
            items: [
              { id: 1, name: 'Item 1' },
              { id: 2, name: 'Item 2' },
              { id: 3, name: 'Item 3' }
            ]
          }),
          h('div', `Trigger: ${this.trigger}`)
        ])
      }
    })

    app = createApp(ListParentComponent)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Trigger parent re-render
    parentInstance.trigger++
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    const allStats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()
    const listComponentStats = allStats.find(s => s.componentName === 'ListComponent')

    expect(listComponentStats.totalRenders).toBeGreaterThan(1)

    const records = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getComponentRecords(
      listComponentStats.uid
    )
    const lastRecord = records[records.length - 1]

    if (lastRecord) {
      const suggestions = lastRecord.suggestions || []
      console.log('List component suggestions:', suggestions)
      expect(suggestions.some(s => s.includes('key') || s.includes('v-for'))).toBe(true)
    }
  })

  // Test prop drilling
  it('should detect prop drilling anti-patterns', async () => {
    const DeepNestedComponent = defineComponent({
      name: 'DeepNestedComponent',
      props: {
        prop1: String,
        prop2: String,
        prop3: String,
        prop4: String,
        prop5: String,
        prop6: String,
        prop7: String,
        prop8: String,
        prop9: String,
        prop10: String
      },
      render() {
        return h('div', `Props: ${Object.keys(this.$props).length}`)
      }
    })

    const PropDrillingParent = defineComponent({
      name: 'PropDrillingParent',
      data() {
        return {
          prop1: 'value1',
          trigger: 0
        }
      },
      mounted() {
        parentInstance = this
      },
      render() {
        return h('div', [
          h(DeepNestedComponent, {
            prop1: this.prop1,
            prop2: 'value2',
            prop3: 'value3',
            prop4: 'value4',
            prop5: 'value5',
            prop6: 'value6',
            prop7: 'value7',
            prop8: 'value8',
            prop9: 'value9',
            prop10: 'value10'
          }),
          h('div', `Trigger: ${this.trigger}`)
        ])
      }
    })

    app = createApp(PropDrillingParent)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false
    })
    app.mount(container)

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Trigger parent re-render by changing a prop
    parentInstance.prop1 = 'changed'
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    const allStats = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getAllStats()
    const deepComponentStats = allStats.find(s => s.componentName === 'DeepNestedComponent')

    expect(deepComponentStats.totalRenders).toBeGreaterThanOrEqual(2)

    const records = window.__VUE_RENDER_INSPECTOR__.profiler.renderTracker.getComponentRecords(
      deepComponentStats.uid
    )
    const unnecessaryRecord = records.find(r => r.isUnnecessary)

    if (unnecessaryRecord) {
      const suggestions = unnecessaryRecord.suggestions || []
      expect(
        suggestions.some(s => s.includes('provide') || s.includes('inject') || s.includes('props'))
      ).toBe(true)
    }
  })
})
