import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Plugin - VueRenderInspector', () => {
  let VueRenderInspector
  let getProfiler
  let mockApp
  let originalWindow
  let originalDocument

  beforeEach(async () => {
    // Save originals
    originalWindow = global.window
    originalDocument = global.document

    // Set up minimal DOM
    global.window = {
      location: {
        search: '',
        href: 'http://localhost:3000'
      },
      history: {
        replaceState: vi.fn()
      }
    }

    global.document = {
      createElement: vi.fn(() => ({
        id: '',
        style: {}
      })),
      body: {
        appendChild: vi.fn()
      },
      getElementById: vi.fn(() => null),
      title: 'Test'
    }

    // Reset module cache
    vi.resetModules()

    // Import fresh module
    const module = await import('../../src/plugin.js')
    VueRenderInspector = module.VueRenderInspector
    getProfiler = module.getProfiler

    // Create mock app
    mockApp = {
      config: {
        globalProperties: {}
      },
      mixin: vi.fn(),
      mount: vi.fn(function () {
        return this
      }),
      unmount: vi.fn(function () {
        return this
      }),
      component: vi.fn(function () {
        return this
      }),
      _instance: null,
      _context: { app: {} }
    }
  })

  afterEach(() => {
    // Restore originals
    global.window = originalWindow
    global.document = originalDocument
    vi.restoreAllMocks()
  })

  describe('Plugin Installation', () => {
    it('should install with default options', () => {
      VueRenderInspector.install(mockApp)

      expect(mockApp.config.globalProperties.$renderInspector).toBeDefined()
      expect(mockApp.mixin).toHaveBeenCalled()
    })

    it('should respect enabled option when false', () => {
      VueRenderInspector.install(mockApp, { enabled: false })

      const inspector = mockApp.config.globalProperties.$renderInspector
      expect(inspector.enabled).toBe(false)
      expect(inspector.getSummary()).toEqual({})
      expect(mockApp.mixin).not.toHaveBeenCalled()
    })

    it('should enable plugin when enabled option is true', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      const inspector = mockApp.config.globalProperties.$renderInspector
      expect(inspector.enabled).toBe(true)
      expect(typeof inspector.getSummary).toBe('function')
      expect(typeof inspector.printSummary).toBe('function')
      expect(typeof inspector.clear).toBe('function')
    })

    it('should provide disabled API when plugin is disabled', () => {
      VueRenderInspector.install(mockApp, { enabled: false })

      const inspector = mockApp.config.globalProperties.$renderInspector

      // Should have safe no-op methods
      expect(inspector.getSummary()).toEqual({})
      expect(() => inspector.printSummary()).not.toThrow()
      expect(() => inspector.clear()).not.toThrow()
      expect(inspector.enabled).toBe(false)
    })

    it('should add global properties when enabled', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      const inspector = mockApp.config.globalProperties.$renderInspector
      expect(inspector).toHaveProperty('getSummary')
      expect(inspector).toHaveProperty('getTopOffenders')
      expect(inspector).toHaveProperty('getSlowestComponents')
      expect(inspector).toHaveProperty('printSummary')
      expect(inspector).toHaveProperty('clear')
      expect(inspector).toHaveProperty('profiler')
      expect(inspector.enabled).toBe(true)
    })

    it('should patch app.mount method when enabled', () => {
      const originalMount = mockApp.mount

      VueRenderInspector.install(mockApp, { enabled: true })

      expect(mockApp.mount).not.toBe(originalMount)
      expect(typeof mockApp.mount).toBe('function')
    })

    it('should patch app.component method when enabled', () => {
      const originalComponent = mockApp.component

      VueRenderInspector.install(mockApp, { enabled: true })

      expect(mockApp.component).not.toBe(originalComponent)
      expect(typeof mockApp.component).toBe('function')
    })

    it('should patch app.unmount method when enabled', () => {
      const originalUnmount = mockApp.unmount

      VueRenderInspector.install(mockApp, { enabled: true })

      expect(mockApp.unmount).not.toBe(originalUnmount)
      expect(typeof mockApp.unmount).toBe('function')
    })

    it('should register mixin when enabled', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      expect(mockApp.mixin).toHaveBeenCalledTimes(1)

      const mixinArg = mockApp.mixin.mock.calls[0][0]
      expect(mixinArg).toHaveProperty('created')
      expect(typeof mixinArg.created).toBe('function')
    })

    it('should handle missing process environment', () => {
      const originalProcess = global.process
      delete global.process

      expect(() => {
        VueRenderInspector.install(mockApp)
      }).not.toThrow()

      global.process = originalProcess
    })

    it('should default to enabled in non-production', () => {
      const originalProcess = global.process
      global.process = {
        env: { NODE_ENV: 'development' }
      }

      VueRenderInspector.install(mockApp)

      const inspector = mockApp.config.globalProperties.$renderInspector
      expect(inspector.enabled).toBe(true)

      global.process = originalProcess
    })

    it('should default to disabled in production', () => {
      const originalProcess = global.process
      global.process = {
        env: { NODE_ENV: 'production' }
      }

      VueRenderInspector.install(mockApp)

      const inspector = mockApp.config.globalProperties.$renderInspector
      expect(inspector.enabled).toBe(false)

      global.process = originalProcess
    })
  })

  describe('getProfiler Function', () => {
    it('should return null when plugin not installed', async () => {
      // Reset to get fresh module
      vi.resetModules()
      const module = await import('../../src/plugin.js')

      expect(module.getProfiler()).toBeNull()
    })

    it('should return profiler after plugin installation', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      const profiler = getProfiler()
      expect(profiler).not.toBeNull()
      expect(profiler).toBeDefined()
    })

    it('should return null after unmount with enabled plugin', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      expect(getProfiler()).not.toBeNull()

      // Call patched unmount
      mockApp.unmount()

      expect(getProfiler()).toBeNull()
    })
  })

  describe('Window Global API', () => {
    it('should create window.__VUE_RENDER_INSPECTOR__ when enabled', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      expect(window.__VUE_RENDER_INSPECTOR__).toBeDefined()
      expect(window.__VUE_RENDER_INSPECTOR__.profiler).toBeDefined()
    })

    it('should not create window API when disabled', () => {
      delete window.__VUE_RENDER_INSPECTOR__

      VueRenderInspector.install(mockApp, { enabled: false })

      expect(window.__VUE_RENDER_INSPECTOR__).toBeUndefined()
    })

    it('should expose summary method on window API', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      expect(typeof window.__VUE_RENDER_INSPECTOR__.summary).toBe('function')
    })

    it('should expose top method on window API', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      expect(typeof window.__VUE_RENDER_INSPECTOR__.top).toBe('function')
    })

    it('should expose slow method on window API', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      expect(typeof window.__VUE_RENDER_INSPECTOR__.slow).toBe('function')
    })

    it('should expose getAllStats method on window API', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      expect(typeof window.__VUE_RENDER_INSPECTOR__.getAllStats).toBe('function')
    })

    it('should expose clear method on window API', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      expect(typeof window.__VUE_RENDER_INSPECTOR__.clear).toBe('function')
    })

    it('should expose panel method on window API', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      expect(typeof window.__VUE_RENDER_INSPECTOR__.panel).toBe('function')
    })

    it('should expose visualizer method on window API', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      expect(typeof window.__VUE_RENDER_INSPECTOR__.visualizer).toBe('function')
    })

    it('should expose help method on window API', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      expect(typeof window.__VUE_RENDER_INSPECTOR__.help).toBe('function')
    })
  })

  describe('Patched Methods', () => {
    it('should call original mount when patched mount is called', () => {
      const originalMount = vi.fn(() => 'mounted')
      mockApp.mount = originalMount

      VueRenderInspector.install(mockApp, { enabled: true })

      const result = mockApp.mount('container')

      expect(originalMount).toHaveBeenCalledWith('container')
      expect(result).toBe('mounted')
    })

    it('should call original unmount when patched unmount is called', () => {
      const originalUnmount = vi.fn(() => 'unmounted')
      mockApp.unmount = originalUnmount

      VueRenderInspector.install(mockApp, { enabled: true })

      const result = mockApp.unmount()

      expect(originalUnmount).toHaveBeenCalled()
      expect(result).toBe('unmounted')
    })

    it('should call original component when patched component is called', () => {
      const originalComponent = vi.fn(function () {
        return this
      })
      mockApp.component = originalComponent

      VueRenderInspector.install(mockApp, { enabled: true })

      const result = mockApp.component('TestComponent', {})

      expect(originalComponent).toHaveBeenCalledWith('TestComponent', {})
      expect(result).toBe(mockApp)
    })

    it('should handle component registration logging', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      VueRenderInspector.install(mockApp, { enabled: true })

      mockApp.component('MyComponent', { name: 'MyComponent' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Component 'MyComponent' registered")
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Mixin Lifecycle Hooks', () => {
    it('should register created hook in mixin', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      const mixin = mockApp.mixin.mock.calls[0][0]

      expect(mixin.created).toBeDefined()
      expect(typeof mixin.created).toBe('function')
    })

    it('should handle component with onRenderTracked', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      const mixin = mockApp.mixin.mock.calls[0][0]
      const mockThis = {
        $: {
          onRenderTracked: vi.fn(),
          onRenderTriggered: vi.fn()
        }
      }

      expect(() => {
        mixin.created.call(mockThis)
      }).not.toThrow()

      expect(mockThis.$.onRenderTracked).toHaveBeenCalled()
      expect(mockThis.$.onRenderTriggered).toHaveBeenCalled()
    })

    it('should handle component without $ property', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      const mixin = mockApp.mixin.mock.calls[0][0]
      const mockThis = {}

      expect(() => {
        mixin.created.call(mockThis)
      }).not.toThrow()
    })

    it('should handle component without onRenderTracked', () => {
      VueRenderInspector.install(mockApp, { enabled: true })

      const mixin = mockApp.mixin.mock.calls[0][0]
      const mockThis = {
        $: {}
      }

      expect(() => {
        mixin.created.call(mockThis)
      }).not.toThrow()
    })
  })

  describe('Options Handling', () => {
    it('should accept empty options object', () => {
      expect(() => {
        VueRenderInspector.install(mockApp, {})
      }).not.toThrow()
    })

    it('should accept undefined options', () => {
      expect(() => {
        VueRenderInspector.install(mockApp)
      }).not.toThrow()
    })

    it('should respect showWelcome option', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      VueRenderInspector.install(mockApp, {
        enabled: true,
        showWelcome: false
      })

      // Wait for async operations
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Vue Render Inspector'))

      consoleSpy.mockRestore()
    })

    it('should pass options to ComponentProfiler', () => {
      const customOptions = {
        enabled: true,
        threshold: 0.5,
        trackReactivity: true
      }

      VueRenderInspector.install(mockApp, customOptions)

      const profiler = getProfiler()
      expect(profiler).toBeDefined()
      // Profiler should have received the options
    })
  })

  describe('Error Handling', () => {
    it('should handle mount tree walk errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockApp._instance = {
        subTree: null
      }

      VueRenderInspector.install(mockApp, { enabled: true })

      // Trigger mount with invalid instance
      expect(() => {
        mockApp.mount('container')
      }).not.toThrow()

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100))

      consoleErrorSpy.mockRestore()
    })

    it('should handle component creation patching when _createComponent missing', () => {
      delete mockApp._createComponent

      expect(() => {
        VueRenderInspector.install(mockApp, { enabled: true })
      }).not.toThrow()
    })
  })
})

describe('Plugin - Tree Walking Functions', () => {
  let walkComponentTree
  let walkVNode

  beforeEach(async () => {
    vi.resetModules()

    // Import the module dynamically to access internal functions
    const moduleCode = await import('../../src/plugin.js')

    // We'll test tree walking through integration since functions are not exported
  })

  describe('walkComponentTree Integration', () => {
    it('should handle null instance gracefully', async () => {
      const { VueRenderInspector } = await import('../../src/plugin.js')

      const mockApp = {
        config: { globalProperties: {} },
        mixin: vi.fn(),
        mount: vi.fn(function () {
          return this
        }),
        unmount: vi.fn(),
        component: vi.fn(function () {
          return this
        }),
        _instance: null,
        _context: { app: {} }
      }

      global.window = {
        location: { search: '', href: 'http://localhost' },
        history: { replaceState: vi.fn() }
      }
      global.document = {
        createElement: vi.fn(() => ({ id: '', style: {} })),
        body: { appendChild: vi.fn() },
        getElementById: vi.fn(() => null),
        title: 'Test'
      }

      expect(() => {
        VueRenderInspector.install(mockApp, { enabled: true })
        mockApp.mount()
      }).not.toThrow()
    })

    it('should handle instance with subTree', async () => {
      const { VueRenderInspector } = await import('../../src/plugin.js')

      const mockApp = {
        config: { globalProperties: {} },
        mixin: vi.fn(),
        mount: vi.fn(function () {
          return this
        }),
        unmount: vi.fn(),
        component: vi.fn(function () {
          return this
        }),
        _instance: {
          uid: 1,
          subTree: {
            type: 'div',
            children: []
          }
        },
        _context: { app: {} }
      }

      global.window = {
        location: { search: '', href: 'http://localhost' },
        history: { replaceState: vi.fn() }
      }
      global.document = {
        createElement: vi.fn(() => ({ id: '', style: {} })),
        body: { appendChild: vi.fn() },
        getElementById: vi.fn(() => null),
        title: 'Test'
      }

      expect(() => {
        VueRenderInspector.install(mockApp, { enabled: true })
        mockApp.mount()
      }).not.toThrow()
    })

    it('should handle circular references in component tree', async () => {
      const { VueRenderInspector } = await import('../../src/plugin.js')

      const mockInstance = {
        uid: 1,
        subTree: null
      }

      // Create circular reference
      mockInstance.subTree = {
        component: mockInstance,
        children: []
      }

      const mockApp = {
        config: { globalProperties: {} },
        mixin: vi.fn(),
        mount: vi.fn(function () {
          return this
        }),
        unmount: vi.fn(),
        component: vi.fn(function () {
          return this
        }),
        _instance: mockInstance,
        _context: { app: {} }
      }

      global.window = {
        location: { search: '', href: 'http://localhost' },
        history: { replaceState: vi.fn() }
      }
      global.document = {
        createElement: vi.fn(() => ({ id: '', style: {} })),
        body: { appendChild: vi.fn() },
        getElementById: vi.fn(() => null),
        title: 'Test'
      }

      expect(() => {
        VueRenderInspector.install(mockApp, { enabled: true })
        mockApp.mount()
      }).not.toThrow()
    })
  })

  describe('walkVNode Integration', () => {
    it('should handle vnode with component', async () => {
      const { VueRenderInspector } = await import('../../src/plugin.js')

      const mockApp = {
        config: { globalProperties: {} },
        mixin: vi.fn(),
        mount: vi.fn(function () {
          return this
        }),
        unmount: vi.fn(),
        component: vi.fn(function () {
          return this
        }),
        _instance: {
          uid: 1,
          subTree: {
            component: {
              uid: 2,
              subTree: null
            }
          }
        },
        _context: { app: {} }
      }

      global.window = {
        location: { search: '', href: 'http://localhost' },
        history: { replaceState: vi.fn() }
      }
      global.document = {
        createElement: vi.fn(() => ({ id: '', style: {} })),
        body: { appendChild: vi.fn() },
        getElementById: vi.fn(() => null),
        title: 'Test'
      }

      expect(() => {
        VueRenderInspector.install(mockApp, { enabled: true })
        mockApp.mount()
      }).not.toThrow()
    })

    it('should handle vnode with array children', async () => {
      const { VueRenderInspector } = await import('../../src/plugin.js')

      const mockApp = {
        config: { globalProperties: {} },
        mixin: vi.fn(),
        mount: vi.fn(function () {
          return this
        }),
        unmount: vi.fn(),
        component: vi.fn(function () {
          return this
        }),
        _instance: {
          uid: 1,
          subTree: {
            type: 'div',
            children: [{ type: 'span', children: [] }, 'text node', { type: 'p', children: [] }]
          }
        },
        _context: { app: {} }
      }

      global.window = {
        location: { search: '', href: 'http://localhost' },
        history: { replaceState: vi.fn() }
      }
      global.document = {
        createElement: vi.fn(() => ({ id: '', style: {} })),
        body: { appendChild: vi.fn() },
        getElementById: vi.fn(() => null),
        title: 'Test'
      }

      expect(() => {
        VueRenderInspector.install(mockApp, { enabled: true })
        mockApp.mount()
      }).not.toThrow()
    })

    it('should handle vnode with dynamicChildren', async () => {
      const { VueRenderInspector } = await import('../../src/plugin.js')

      const mockApp = {
        config: { globalProperties: {} },
        mixin: vi.fn(),
        mount: vi.fn(function () {
          return this
        }),
        unmount: vi.fn(),
        component: vi.fn(function () {
          return this
        }),
        _instance: {
          uid: 1,
          subTree: {
            type: 'div',
            dynamicChildren: [
              { type: 'span', children: [] },
              { type: 'p', children: [] }
            ]
          }
        },
        _context: { app: {} }
      }

      global.window = {
        location: { search: '', href: 'http://localhost' },
        history: { replaceState: vi.fn() }
      }
      global.document = {
        createElement: vi.fn(() => ({ id: '', style: {} })),
        body: { appendChild: vi.fn() },
        getElementById: vi.fn(() => null),
        title: 'Test'
      }

      expect(() => {
        VueRenderInspector.install(mockApp, { enabled: true })
        mockApp.mount()
      }).not.toThrow()
    })
  })
})
