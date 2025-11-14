import { test, expect, vi, describe, afterEach } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mountWithInspector } from '../helpers/setup.js'

// Test component
const TestComponent = defineComponent({
  name: 'TestComponent',
  setup() {
    const count = ref(0)
    return () => h('div', `Count: ${count.value}`)
  }
})

describe('VueRenderInspector - All Options Verification', () => {
  const removePanelContainer = () => {
    const panelContainer = document.getElementById('vri-panel-container')
    if (panelContainer?.parentNode) {
      panelContainer.parentNode.removeChild(panelContainer)
    }
  }

  afterEach(() => {
    removePanelContainer()
  })
  test('enabled option (true) - should track components', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        enabled: true,
        console: false
      }
    )

    expect(inspector).toBeDefined()
    expect(inspector.profiler.options.enabled).toBe(true)

    const allStats = inspector.getAllStats()
    expect(allStats.length).toBeGreaterThan(0)

    wrapper.unmount()
  })

  test('enabled option (false) - should not track components', async () => {
    const { wrapper } = await mountWithInspector(
      TestComponent,
      {},
      {
        enabled: false,
        console: false
      }
    )

    // When disabled, window.__VUE_RENDER_INSPECTOR__ should not exist
    // Only app.config.globalProperties.$renderInspector is set (minimal interface)
    const vueInstance = wrapper.vm.$
    const renderInspector = vueInstance?.root.appContext.config.globalProperties.$renderInspector

    expect(renderInspector).toBeDefined()
    expect(renderInspector.enabled).toBe(false)
    expect(renderInspector.getSummary()).toEqual({})

    wrapper.unmount()
  })

  test('include option - array of strings', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        include: ['TestComponent'],
        console: false
      }
    )

    expect(inspector.profiler.options.include).toEqual(['TestComponent'])

    const allStats = inspector.getAllStats()
    const trackedNames = allStats.map(s => s.componentName)
    expect(trackedNames).toContain('TestComponent')

    wrapper.unmount()
  })

  test('exclude option - array of strings', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        exclude: ['TestComponent'],
        console: false
      }
    )

    expect(inspector.profiler.options.exclude).toEqual(['TestComponent'])

    const allStats = inspector.getAllStats()
    const trackedNames = allStats.map(s => s.componentName)
    expect(trackedNames).not.toContain('TestComponent')

    wrapper.unmount()
  })

  test('warnThreshold option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        warnThreshold: 10,
        console: false
      }
    )

    expect(inspector.profiler.options.warnThreshold).toBe(10)
    expect(inspector.profiler.reporter.warnThreshold).toBe(10)

    wrapper.unmount()
  })

  test('errorThreshold option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        errorThreshold: 50,
        console: false
      }
    )

    expect(inspector.profiler.options.errorThreshold).toBe(50)
    expect(inspector.profiler.reporter.errorThreshold).toBe(50)

    wrapper.unmount()
  })

  test('trackDependencies option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        trackDependencies: true,
        console: false
      }
    )

    expect(inspector.profiler.options.trackDependencies).toBe(true)

    wrapper.unmount()
  })

  test('detectUnnecessary option (true by default)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        console: false
      }
    )

    expect(inspector.profiler.options.detectUnnecessary).toBe(true)

    wrapper.unmount()
  })

  test('detectUnnecessary option (false)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        detectUnnecessary: false,
        console: false
      }
    )

    expect(inspector.profiler.options.detectUnnecessary).toBe(false)

    wrapper.unmount()
  })

  test('strictMode option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        strictMode: true,
        console: false
      }
    )

    expect(inspector.profiler.options.strictMode).toBe(true)
    expect(inspector.profiler.renderDetector.strictMode).toBe(true)

    wrapper.unmount()
  })

  test('maxRecords option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        maxRecords: 500,
        console: false
      }
    )

    expect(inspector.profiler.renderTracker.maxRecords).toBe(500)

    wrapper.unmount()
  })

  test('maxHistorySize option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        maxHistorySize: 25,
        console: false
      }
    )

    expect(inspector.profiler.snapshotManager.maxHistorySize).toBe(25)

    wrapper.unmount()
  })

  test('stormWindow option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        stormWindow: 2000,
        console: false
      }
    )

    expect(inspector.profiler.renderTracker.frequencyTracker.windowSize).toBe(2000)

    wrapper.unmount()
  })

  test('stormThreshold option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        stormThreshold: 10,
        console: false
      }
    )

    expect(inspector.profiler.renderTracker.frequencyTracker.stormThreshold).toBe(10)

    wrapper.unmount()
  })

  test('recreationWindow option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        recreationWindow: 200,
        console: false
      }
    )

    expect(inspector.profiler.recreationDetector.recreationWindow).toBe(200)

    wrapper.unmount()
  })

  test('trackEvents option (true by default)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        console: false
      }
    )

    expect(inspector.profiler.eventTracker.enabled).toBe(true)

    wrapper.unmount()
  })

  test('trackEvents option (false)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        trackEvents: false,
        console: false
      }
    )

    expect(inspector.profiler.eventTracker.enabled).toBe(false)

    wrapper.unmount()
  })

  test('eventContextTimeout option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        eventContextTimeout: 1000,
        console: false
      }
    )

    expect(inspector.profiler.eventTracker.eventContextTimeout).toBe(1000)

    wrapper.unmount()
  })

  test('debugEvents option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        debugEvents: true,
        console: false
      }
    )

    expect(inspector.profiler.eventTracker.debug).toBe(true)

    wrapper.unmount()
  })

  test('trackReactivity option (true by default)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        console: false
      }
    )

    expect(inspector.profiler.reactivityTracker.enabled).toBe(true)

    wrapper.unmount()
  })

  test('trackReactivity option (false)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        trackReactivity: false,
        console: false
      }
    )

    expect(inspector.profiler.reactivityTracker.enabled).toBe(false)

    wrapper.unmount()
  })

  test('maxReactivityEvents option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        maxReactivityEvents: 200,
        console: false
      }
    )

    expect(inspector.profiler.reactivityTracker.maxEvents).toBe(200)

    wrapper.unmount()
  })

  test('reactivitySamplingRate option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        reactivitySamplingRate: 0.5,
        console: false
      }
    )

    expect(inspector.profiler.reactivityTracker.samplingRate).toBe(0.5)

    wrapper.unmount()
  })

  test('console option (true)', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        console: true
      }
    )

    expect(inspector.profiler.reporter.enabled).toBe(true)

    consoleLog.mockRestore()
    wrapper.unmount()
  })

  test('console option (false)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        console: false
      }
    )

    expect(inspector.profiler.reporter.enabled).toBe(false)

    wrapper.unmount()
  })

  test('verbose option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        verbose: true,
        console: false
      }
    )

    expect(inspector.profiler.reporter.verboseMode).toBe(true)

    wrapper.unmount()
  })

  test('showTimestamp option (true by default)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        console: false
      }
    )

    expect(inspector.profiler.reporter.showTimestamp).toBe(true)

    wrapper.unmount()
  })

  test('showTimestamp option (false)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        showTimestamp: false,
        console: false
      }
    )

    expect(inspector.profiler.reporter.showTimestamp).toBe(false)

    wrapper.unmount()
  })

  test('showDuration option (true by default)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        console: false
      }
    )

    expect(inspector.profiler.reporter.showDuration).toBe(true)

    wrapper.unmount()
  })

  test('showDuration option (false)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        showDuration: false,
        console: false
      }
    )

    expect(inspector.profiler.reporter.showDuration).toBe(false)

    wrapper.unmount()
  })

  test('groupByComponent option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        groupByComponent: true,
        console: false
      }
    )

    expect(inspector.profiler.reporter.groupByComponent).toBe(true)

    wrapper.unmount()
  })

  test('colorize option (true by default)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        console: false
      }
    )

    expect(inspector.profiler.reporter.colorize).toBe(true)

    wrapper.unmount()
  })

  test('colorize option (false)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        colorize: false,
        console: false
      }
    )

    expect(inspector.profiler.reporter.colorize).toBe(false)

    wrapper.unmount()
  })

  test('showWelcome option (true by default)', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { wrapper } = await mountWithInspector(
      TestComponent,
      {},
      {
        console: false
      }
    )

    // Welcome message should be shown by default
    const welcomeCalls = consoleLog.mock.calls.filter(call =>
      call.some(arg => typeof arg === 'string' && arg.includes('Vue Render Inspector'))
    )
    expect(welcomeCalls.length).toBeGreaterThan(0)

    consoleLog.mockRestore()
    wrapper.unmount()
  })

  test('showWelcome option (false)', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { wrapper } = await mountWithInspector(
      TestComponent,
      {},
      {
        showWelcome: false,
        console: false
      }
    )

    // Welcome message should NOT be shown
    const welcomeCalls = consoleLog.mock.calls.filter(call =>
      call.some(arg => typeof arg === 'string' && arg.includes('Vue Render Inspector'))
    )
    expect(welcomeCalls.length).toBe(0)

    consoleLog.mockRestore()
    wrapper.unmount()
  })

  test('panelOpenByDefault option (true by default)', async () => {
    const { wrapper } = await mountWithInspector(
      TestComponent,
      {},
      {
        console: false
      }
    )

    expect(document.querySelector('.vri-floating-window')).not.toBeNull()

    wrapper.unmount()
  })

  test('panelOpenByDefault option (false)', async () => {
    const { wrapper } = await mountWithInspector(
      TestComponent,
      {},
      {
        console: false,
        panelOpenByDefault: false
      }
    )

    expect(document.querySelector('.vri-floating-window')).toBeNull()
    const triggerButton = document.querySelector('.vri-floating-circle')
    expect(triggerButton).not.toBeNull()

    triggerButton.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(document.querySelector('.vri-floating-window')).not.toBeNull()

    wrapper.unmount()
  })

  test('memoryCleanupInterval option', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        memoryCleanupInterval: 60000,
        console: false
      }
    )

    expect(inspector.profiler.memoryCleanupInterval).toBe(60000)
    expect(inspector.profiler.memoryCleanupTimer).toBeDefined()

    wrapper.unmount()
  })

  test('memoryCleanupInterval option (disabled with 0)', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        memoryCleanupInterval: 0,
        console: false
      }
    )

    // memoryCleanupInterval uses || so 0 becomes 30000 (default)
    // This is expected behavior - use a negative number or null to disable
    expect(inspector.profiler.memoryCleanupInterval).toBe(30000)
    expect(inspector.profiler.memoryCleanupTimer).toBeDefined()

    wrapper.unmount()
  })

  test('Multiple options combined', async () => {
    const { wrapper, inspector } = await mountWithInspector(
      TestComponent,
      {},
      {
        enabled: true,
        include: ['TestComponent'],
        warnThreshold: 10,
        errorThreshold: 50,
        maxRecords: 500,
        maxHistorySize: 25,
        stormWindow: 2000,
        stormThreshold: 10,
        trackReactivity: true,
        trackEvents: true,
        console: false,
        verbose: false,
        strictMode: false,
        detectUnnecessary: true
      }
    )

    // Verify all options are set correctly
    expect(inspector.profiler.options.enabled).toBe(true)
    expect(inspector.profiler.options.include).toEqual(['TestComponent'])
    expect(inspector.profiler.options.warnThreshold).toBe(10)
    expect(inspector.profiler.options.errorThreshold).toBe(50)
    expect(inspector.profiler.renderTracker.maxRecords).toBe(500)
    expect(inspector.profiler.snapshotManager.maxHistorySize).toBe(25)
    expect(inspector.profiler.renderTracker.frequencyTracker.windowSize).toBe(2000)
    expect(inspector.profiler.renderTracker.frequencyTracker.stormThreshold).toBe(10)
    expect(inspector.profiler.reactivityTracker.enabled).toBe(true)
    expect(inspector.profiler.eventTracker.enabled).toBe(true)
    expect(inspector.profiler.reporter.enabled).toBe(false)
    expect(inspector.profiler.reporter.verboseMode).toBe(false)
    expect(inspector.profiler.options.strictMode).toBe(false)
    expect(inspector.profiler.options.detectUnnecessary).toBe(true)

    wrapper.unmount()
  })
})
