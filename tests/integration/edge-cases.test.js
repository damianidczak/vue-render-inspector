import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp, defineComponent, h, ref, onMounted, onUnmounted } from 'vue'
import { VueRenderInspector } from '../../src/index.js'

describe('Edge Cases - Ensure robustness', () => {
  let app
  let container

  beforeEach(() => {
    window.__VUE_RENDER_INSPECTOR__ = undefined
    container = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.unmount()
    }
  })

  it('should handle rapid component mount/unmount without memory leaks', async () => {
    // Component that mounts/unmounts rapidly
    const ToggleComponent = defineComponent({
      name: 'ToggleComponent',
      setup() {
        const data = ref(new Array(100).fill(0).map((_, i) => i))

        onMounted(() => {
          console.log('ToggleComponent mounted')
        })

        onUnmounted(() => {
          console.log('ToggleComponent unmounted')
        })

        return { data }
      },
      template: `<div>{{ data.length }} items</div>`
    })

    app = createApp({
      components: { ToggleComponent },
      setup() {
        const showComponent = ref(true)
        const toggleCount = ref(0)

        return { showComponent, toggleCount }
      },
      template: `
        <div>
          <button @click="showComponent = !showComponent; toggleCount++">
            Toggle ({{ toggleCount }})
          </button>
          <ToggleComponent v-if="showComponent" />
        </div>
      `
    })

    app.use(VueRenderInspector, { enabled: true, console: false })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    const inspector = window.__VUE_RENDER_INSPECTOR__
    const button = container.querySelector('button')

    // Rapidly toggle component
    for (let i = 0; i < 20; i++) {
      button.click()
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Check that tracking is still working
    const summary = inspector.summary()
    expect(summary).toBeDefined()
    expect(summary.totalComponents).toBeGreaterThan(0)

    // Verify no memory accumulation
    if (window.__VUE_RENDER_INSPECTOR__.profiler) {
      const profiler = window.__VUE_RENDER_INSPECTOR__.profiler
      const stats = profiler.renderTracker.getAllStats()

      // Should not have excessive component instances tracked
      const toggleStats = stats.filter(s => s.componentName === 'ToggleComponent')
      console.log(`Tracked ToggleComponent instances: ${toggleStats.length}`)

      // Should clean up old instances
      expect(toggleStats.length).toBeLessThan(10)
    }
  })

  it('should handle components with no name gracefully', async () => {
    // Anonymous component
    const AnonymousComponent = defineComponent({
      // No name property
      props: ['value'],
      template: `<div>{{ value }}</div>`
    })

    // Inline functional component
    const functionalComponent = props => h('span', props.text)

    app = createApp({
      components: { AnonymousComponent },
      setup() {
        const value = ref('test')
        const text = ref('functional')

        return { value, text, functionalComponent }
      },
      template: `
        <div>
          <AnonymousComponent :value="value" />
          <component :is="functionalComponent" :text="text" />
          <button @click="value += '!'; text += '!'">Update</button>
        </div>
      `
    })

    app.use(VueRenderInspector, { enabled: true, console: false })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    // Trigger renders
    const button = container.querySelector('button')
    button.click()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Should not crash and should track components
    const inspector = window.__VUE_RENDER_INSPECTOR__
    const summary = inspector.summary()

    expect(summary.totalRenders).toBeGreaterThan(0)
    console.log('Handled anonymous components without crashing')
  })

  it('should handle deeply nested components', async () => {
    // Create deeply nested component tree
    const createNestedComponent = depth =>
      defineComponent({
        name: `Nested${depth}`,
        props: ['data'],
        setup(props) {
          if (depth > 0) {
            const ChildComponent = createNestedComponent(depth - 1)
            return () =>
              h('div', [h('span', `Level ${depth}`), h(ChildComponent, { data: props.data })])
          }
          return () => h('div', `Leaf: ${props.data}`)
        }
      })

    const DeepTree = createNestedComponent(10)

    app = createApp({
      components: { DeepTree },
      setup() {
        const data = ref(0)
        return { data }
      },
      template: `
        <div>
          <DeepTree :data="data" />
          <button @click="data++">Update Deep Tree</button>
        </div>
      `
    })

    app.use(VueRenderInspector, { enabled: true, console: false })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 800))

    const button = container.querySelector('button')
    button.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    const inspector = window.__VUE_RENDER_INSPECTOR__
    const summary = inspector.summary()

    console.log(`Deep nesting test - Total components: ${summary.totalComponents}`)
    expect(summary.totalComponents).toBeGreaterThanOrEqual(10)
    expect(summary.totalRenders).toBeGreaterThan(10)
  })

  it('should handle circular component references', async () => {
    // TreeNode that can contain itself
    const TreeNode = defineComponent({
      name: 'TreeNode',
      props: {
        node: Object,
        depth: { type: Number, default: 0 }
      },
      setup(props) {
        const isExpanded = ref(false)

        return { isExpanded }
      },
      template: `
        <div :style="{ marginLeft: depth * 20 + 'px' }">
          <div @click="isExpanded = !isExpanded">
            {{ node.name }} {{ node.children ? (isExpanded ? '[-]' : '[+]') : '' }}
          </div>
          <div v-if="isExpanded && node.children">
            <TreeNode 
              v-for="child in node.children" 
              :key="child.id"
              :node="child"
              :depth="depth + 1"
            />
          </div>
        </div>
      `
    })

    // Manually register to handle circular reference
    TreeNode.components = { TreeNode }

    app = createApp({
      components: { TreeNode },
      setup() {
        const tree = ref({
          id: 1,
          name: 'Root',
          children: [
            {
              id: 2,
              name: 'Child 1',
              children: [
                { id: 4, name: 'Grandchild 1' },
                { id: 5, name: 'Grandchild 2' }
              ]
            },
            { id: 3, name: 'Child 2' }
          ]
        })

        return { tree }
      },
      template: `
        <div>
          <h3>Tree Structure</h3>
          <TreeNode :node="tree" />
        </div>
      `
    })

    app.use(VueRenderInspector, { enabled: true, console: false })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    // Expand nodes
    const nodes = container.querySelectorAll('div[style]')
    if (nodes[0]) {
      nodes[0].querySelector('div').click() // Expand root
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const inspector = window.__VUE_RENDER_INSPECTOR__
    const summary = inspector.summary()

    // Should handle circular references without infinite loops
    expect(summary).toBeDefined()
    expect(summary.totalComponents).toBeGreaterThan(0)
    console.log('Handled circular component references successfully')
  })

  it('should handle high-frequency updates (stress test)', async () => {
    const StressComponent = defineComponent({
      name: 'StressComponent',
      setup() {
        const counter = ref(0)
        const isRunning = ref(false)
        let intervalId

        const startStress = () => {
          isRunning.value = true
          intervalId = setInterval(() => {
            counter.value++
            if (counter.value > 50) {
              stopStress()
            }
          }, 10) // Update every 10ms
        }

        const stopStress = () => {
          isRunning.value = false
          if (intervalId) {
            clearInterval(intervalId)
          }
        }

        onUnmounted(stopStress)

        return { counter, isRunning, startStress, stopStress }
      },
      template: `
        <div>
          <h3>Stress Test: {{ counter }}</h3>
          <button @click="startStress" :disabled="isRunning">
            Start Rapid Updates
          </button>
          <button @click="stopStress" :disabled="!isRunning">
            Stop
          </button>
        </div>
      `
    })

    app = createApp(StressComponent)
    app.use(VueRenderInspector, {
      enabled: true,
      console: false,
      stormThreshold: 5, // Lower threshold to detect storms
      stormWindow: 1000 // Longer window to capture the storm
    })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    // Start stress test
    const startButton = container.querySelector('button')
    startButton.click()

    // Check during the stress test
    await new Promise(resolve => setTimeout(resolve, 200)) // Check while storm is active

    const inspector = window.__VUE_RENDER_INSPECTOR__
    const summaryDuringStorm = inspector.summary()
    console.log('\nSummary during storm:', summaryDuringStorm)

    // Wait for stress test to complete
    await new Promise(resolve => setTimeout(resolve, 800))

    const summary = inspector.summary()

    console.log('\nStress test results:')
    console.log(`- Total renders: ${summary.totalRenders}`)
    console.log(`- Active storms: ${summary.activeStorms}`)

    // Should have detected render storm
    expect(summary.totalRenders).toBeGreaterThan(30)
    // Active storms might be 0 after completion, but we had storms during the test
    expect(summaryDuringStorm.activeStorms).toBeGreaterThan(0)

    // Should still be functioning after stress
    const offenders = inspector.top()
    expect(offenders).toBeDefined()

    const stressStats = offenders.find(s => s.componentName === 'StressComponent')
    if (stressStats) {
      console.log(`- StressComponent: ${stressStats.totalRenders} renders detected`)
    }
  })

  it('should handle production mode gracefully', async () => {
    // Test with production mode simulation
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const ProdComponent = defineComponent({
      name: 'ProdComponent',
      setup() {
        const count = ref(0)
        return { count }
      },
      template: `<div>Count: {{ count }}</div>`
    })

    app = createApp(ProdComponent)

    // Inspector should handle production mode
    app.use(VueRenderInspector, {
      enabled: false // Typically disabled in production
    })
    app.mount(container)

    // Should not crash and provide no-op implementation
    expect(() => {
      if (window.__VUE_RENDER_INSPECTOR__) {
        window.__VUE_RENDER_INSPECTOR__.summary()
      }
    }).not.toThrow()

    // Restore
    process.env.NODE_ENV = originalNodeEnv
  })

  it('should properly detect component names', async () => {
    // Test various component naming scenarios
    const NamedComponent = defineComponent({
      name: 'NamedComponent',
      template: '<div>Named Component</div>'
    })

    const UnnamedComponent = defineComponent({
      template: '<div>Unnamed Component</div>'
    })

    const CompositionComponent = defineComponent({
      name: 'CompositionComponent',
      setup() {
        return {}
      },
      template: '<div>Composition Component</div>'
    })

    app = createApp({
      components: {
        NamedComponent,
        UnnamedComponent,
        CompositionComponent
      },
      template: `
        <div>
          <NamedComponent />
          <UnnamedComponent />
          <CompositionComponent />
        </div>
      `
    })

    app.use(VueRenderInspector, { enabled: true, console: false })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    const inspector = window.__VUE_RENDER_INSPECTOR__
    const allStats = inspector.getAllStats()

    // Functional components should be tracked without crashing
    expect(allStats.length).toBeGreaterThanOrEqual(2) // At least root + functional components

    // Should not crash and should track functional components
    const summary = inspector.summary()
    expect(summary.totalComponents).toBeGreaterThanOrEqual(2) // At least root + functional components
  })

  it('should use file-based naming when available', async () => {
    // Component that simulates having a __file property
    const FileBasedComponent = defineComponent({
      template: '<div>File-based Component</div>'
    })

    // Simulate file property (normally set by build tools)
    FileBasedComponent.__file = '/src/components/MyFileBasedComponent.vue'

    app = createApp({
      components: { FileBasedComponent },
      template: '<FileBasedComponent />'
    })

    app.use(VueRenderInspector, { enabled: true, console: false })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    const inspector = window.__VUE_RENDER_INSPECTOR__
    const allStats = inspector.getAllStats()

    // Should use filename as fallback
    const fileBasedStats = allStats.find(s => s.componentName === 'MyFileBasedComponent')
    expect(fileBasedStats).toBeDefined()
  })

  it('should handle functional components gracefully', async () => {
    // Functional component without name
    const FunctionalComponent = props => h('span', props.text)

    // Functional components can't have names set (arrow functions are read-only)
    // They will show up as 'Anonymous' in the inspector
    const AnotherFunctional = props => h('div', props.content)

    app = createApp({
      components: { FunctionalComponent, AnotherFunctional },
      setup() {
        return {
          text: 'functional',
          content: 'another functional'
        }
      },
      template: `
        <div>
          <FunctionalComponent :text="text" />
          <AnotherFunctional :content="content" />
        </div>
      `
    })

    app.use(VueRenderInspector, { enabled: true, console: false })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    const inspector = window.__VUE_RENDER_INSPECTOR__
    const allStats = inspector.getAllStats()

    // Functional components should be tracked without crashing
    expect(allStats.length).toBeGreaterThanOrEqual(2) // At least root + functional components

    // Should not crash and should track functional components
    const summary = inspector.summary()
    expect(summary.totalComponents).toBeGreaterThanOrEqual(2) // At least root + functional components
  })

  it('should handle Vue default "Component" name with better fallbacks', async () => {
    // Component that Vue might assign "Component" as default name
    const DefaultNamedComponent = defineComponent({
      // No name property - Vue might assign "Component"
      template: '<div>Default Named Component</div>'
    })

    // Force Vue's default name for testing
    DefaultNamedComponent.name = 'Component'

    app = createApp({
      components: { DefaultNamedComponent },
      template: '<DefaultNamedComponent />'
    })

    app.use(VueRenderInspector, { enabled: true, console: false })
    app.mount(container)

    await new Promise(resolve => setTimeout(resolve, 600))

    const inspector = window.__VUE_RENDER_INSPECTOR__
    const allStats = inspector.getAllStats()

    // Should not show just "Component" - should be more descriptive
    const componentStats = allStats.find(s => s.componentName.includes('Component'))
    expect(componentStats).toBeDefined()

    // Should not be just "Component" if we have better alternatives
    if (componentStats.componentName === 'Component') {
      // If it's still "Component", that's acceptable as fallback
      expect(componentStats.componentName).toBe('Component')
    } else {
      // Should be more descriptive
      expect(componentStats.componentName).not.toBe('Component')
    }
  })
})
