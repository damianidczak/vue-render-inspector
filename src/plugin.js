/* global URLSearchParams, URL */
/* eslint-disable no-unused-vars */
import { ComponentProfiler } from './core/profiler.js'
let globalProfiler = null
export const VueRenderInspector = {
  install(app, options = {}) {
    const shouldEnable =
      options.enabled !== undefined
        ? options.enabled
        : typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production'
    if (!shouldEnable) {
      app.config.globalProperties.$renderInspector = {
        getSummary: () => ({}),
        printSummary: () => {},
        clear: () => {},
        enabled: false
      }
      return
    }
    globalProfiler = new ComponentProfiler(options)
    app.mixin({
      created() {
        if (this.$ && this.$.onRenderTracked) {
          this.$.onRenderTracked(event => {
            if (globalProfiler && globalProfiler.reactivityTracker) {
              globalProfiler.reactivityTracker.onTrack(event)
            }
          })
          this.$.onRenderTriggered(event => {
            if (globalProfiler && globalProfiler.reactivityTracker) {
              globalProfiler.reactivityTracker.onTrigger(event)
            }
          })
        }
      }
    })
    const originalMount = app.mount
    app.mount = function (...args) {
      const result = originalMount.apply(this, args)
      setTimeout(() => {
        try {
          walkComponentTree(app._instance, instance => {
            globalProfiler.profileComponent(instance)
          })
        } catch (_error) {
          console.error('[PLUGIN] Error during tree walk:', _error)
        }
        let checkCount = 0
        const checkInterval = setInterval(() => {
          try {
            walkComponentTree(app._instance, instance => {
              globalProfiler.profileComponent(instance)
            })
            checkCount++
            if (checkCount > 20) {
              clearInterval(checkInterval)
            }
          } catch (_error) {}
        }, 500)
      }, 0)
      return result
    }
    const originalCreateComponent = app._createComponent
    if (originalCreateComponent) {
      app._createComponent = function (...args) {
        const component = originalCreateComponent.apply(this, args)
        if (component && component.update) {
          setTimeout(() => {
            globalProfiler.profileComponent(component)
          }, 0)
        }
        return component
      }
    }
    const originalComponent = app.component
    app.component = function (name, component) {
      const result = originalComponent.apply(this, arguments)
      if (component && typeof name === 'string') {
        console.log(`[PLUGIN] Component '${name}' registered, will be tracked when instantiated`)
      }
      return result
    }
    const _originalCreateApp = app._context.app
    patchComponentCreation(app)
    app.config.globalProperties.$renderInspector = {
      getSummary: () => globalProfiler.getSummary(),
      getTopOffenders: limit => globalProfiler.getTopOffenders(limit),
      getSlowestComponents: limit => globalProfiler.getSlowestComponents(limit),
      printSummary: () => globalProfiler.printSummary(),
      clear: () => globalProfiler.clear(),
      enabled: true,
      profiler: globalProfiler
    }
    let panelInstance = null
    let panelMountTimeout = null
    const mountPanel = () => {
      if (panelInstance) return panelInstance
      if (typeof document === 'undefined') return null
      const panelContainer = document.createElement('div')
      panelContainer.id = 'vri-panel-container'
      document.body.appendChild(panelContainer)
      import('./components/RenderInspectorPanel.vue')
        .then(({ default: RenderInspectorPanel }) => {
          import('vue')
            .then(({ createApp }) => {
              const panelApp = createApp(RenderInspectorPanel, {
                profiler: globalProfiler
              })
              panelInstance = panelApp.mount(panelContainer)
            })
            .catch(error => {
              console.error('[VRI] Failed to import Vue for panel:', error)
            })
        })
        .catch(error => {
          console.error('[VRI] Failed to load inspector panel:', error)
        })
      return panelInstance
    }
    if (typeof document !== 'undefined') {
      panelMountTimeout = setTimeout(() => {
        mountPanel()
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('vri-visualizer') === 'true') {
          setTimeout(() => {
            if (window.__VUE_RENDER_INSPECTOR__?.visualizer) {
              window.__VUE_RENDER_INSPECTOR__.visualizer()
              const url = new URL(window.location.href)
              url.searchParams.delete('vri-visualizer')
              window.history.replaceState({}, document.title, url.toString())
            }
          }, 1000)
        }
      }, 500)
    }
    if (typeof window !== 'undefined') {
      window.__VUE_RENDER_INSPECTOR__ = {
        profiler: globalProfiler,
        summary: () => {
          globalProfiler.printSummary()
          return globalProfiler.getSummary()
        },
        top: (limit = 10) => {
          const offenders = globalProfiler.getTopOffenders(limit)
          console.table(offenders.map(s => s.toJSON()))
          return offenders.map(s => s.toJSON())
        },
        slow: (limit = 10) => {
          const slow = globalProfiler.getSlowestComponents(limit)
          console.table(slow.map(s => s.toJSON()))
          return slow.map(s => s.toJSON())
        },
        getAllStats: () => {
          const stats = globalProfiler.renderTracker.getAllStats()
          return stats.map(s => s.toJSON())
        },
        clear: () => globalProfiler.clear(),
        panel: () => {
          if (typeof document === 'undefined') {
            console.error('[VRI] Panel requires a browser environment')
            return
          }
          const existingPanel = document.getElementById('vri-panel-container')
          if (existingPanel) {
            if (panelInstance && typeof panelInstance.toggle === 'function') {
              panelInstance.toggle()
              console.log(
                `%c🔍 Panel ${panelInstance.isVisible() ? 'shown' : 'hidden'}%c`,
                'color: #42b883; font-weight: bold',
                ''
              )
            }
            return
          }
          console.log('%c🔍 Opening Inspector Panel...%c', 'color: #42b883; font-weight: bold', '')
          mountPanel()
        },
        visualizer: () => {
          if (typeof document === 'undefined') {
            console.error('[VRI] Visualizer requires a browser environment')
            return
          }
          const existingVisualizer = document.getElementById('vue-render-inspector-visualizer')
          if (existingVisualizer) {
            console.log('[VRI] Visualizer is already open')
            existingVisualizer.scrollIntoView()
            return
          }
          console.log(
            '%c🌊 Opening Render Flow Visualizer...%c',
            'color: #42b883; font-weight: bold',
            ''
          )
          import('./visualizer/visualizer.js')
            .then(({ createEnhancedVisualizerV2 }) => {
              createEnhancedVisualizerV2(globalProfiler)
            })
            .catch(error => {
              console.error('[VRI] Failed to load visualizer:', error)
            })
        },
        help: () => {
          console.log(
            `
% cVue Render Inspector - Available Commands%c
% c__VUE_RENDER_INSPECTOR__.summary()%c
   Displays summary of all renders
% c__VUE_RENDER_INSPECTOR__.top(limit)%c
   Shows components with most unnecessary renders
% c__VUE_RENDER_INSPECTOR__.slow(limit)%c
   Shows slowest rendering components
% c__VUE_RENDER_INSPECTOR__.panel()%c
   Toggles the inspector control panel visibility
% c__VUE_RENDER_INSPECTOR__.visualizer()%c
   Opens the interactive render flow visualizer
% c__VUE_RENDER_INSPECTOR__.clear()%c
   Clears all tracking data
% c__VUE_RENDER_INSPECTOR__.help()%c
   Shows this help message
           `,
            'color: #42b883; font-size: 16px; font-weight: bold',
            '',
            'color: #ffd700',
            '',
            'color: #ffd700',
            '',
            'color: #ffd700',
            '',
            'color: #ffd700',
            '',
            'color: #ffd700',
            '',
            'color: #ffd700',
            '',
            'color: #ffd700',
            ''
          )
        }
      }
      if (options.showWelcome !== false) {
        console.log(
          '%c🎯 Vue Render Inspector%c is active. Control panel is visible - use %c__VUE_RENDER_INSPECTOR__.panel()%c to toggle it or %c__VUE_RENDER_INSPECTOR__.help()%c for all commands.',
          'color: #42b883; font-weight: bold; font-size: 14px',
          'color: inherit',
          'color: #ffd700; font-family: monospace',
          'color: inherit',
          'color: #ffd700; font-family: monospace',
          'color: inherit'
        )
      }
    }
    const originalUnmount = app.unmount
    app.unmount = function () {
      if (panelMountTimeout) {
        clearTimeout(panelMountTimeout)
        panelMountTimeout = null
      }
      if (globalProfiler) {
        globalProfiler.destroy()
        globalProfiler = null
      }
      return originalUnmount.apply(this)
    }
  }
}
function _patchVueReactivity() {
  try {
    import('@vue/reactivity')
      .then(({ track, trigger }) => {
        const originalTrack = track
        const originalTrigger = trigger
        globalThis.track = function (target, type, key) {
          const profiler = getProfiler()
          if (
            profiler &&
            profiler.reactivityTracker &&
            profiler.reactivityTracker.isCurrentlyTracking()
          ) {
            const event = { target, type, key, effect: {} }
            profiler.reactivityTracker.onTrack(event)
          }
          return originalTrack.call(this, target, type, key)
        }
        globalThis.trigger = function (target, type, key, newValue, oldValue) {
          const profiler = getProfiler()
          if (
            profiler &&
            profiler.reactivityTracker &&
            profiler.reactivityTracker.isCurrentlyTracking()
          ) {
            const event = { target, type, key, newValue, oldValue, effect: {} }
            profiler.reactivityTracker.onTrigger(event)
          }
          return originalTrigger.call(this, target, type, key, newValue, oldValue)
        }
        console.log('[PLUGIN] Vue reactivity system patched for automatic tracking')
      })
      .catch(error => {
        console.warn('[PLUGIN] Could not patch Vue reactivity system:', error)
      })
  } catch (_error) {
    console.warn('[PLUGIN] Could not set up automatic reactivity tracking:', _error)
  }
}
function patchComponentCreation(app) {
  const _originalRender = app._instance?.render
}
function walkComponentTree(instance, callback, visited = new Set()) {
  if (!instance) return
  if (visited.has(instance)) return
  visited.add(instance)
  callback(instance)
  if (instance.subTree) {
    walkVNode(instance.subTree, callback, visited)
  }
}
function walkVNode(vnode, callback, visited) {
  if (!vnode) return
  if (vnode.component) {
    walkComponentTree(vnode.component, callback, visited)
  }
  if (vnode.children) {
    if (Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        if (typeof child === 'object') {
          walkVNode(child, callback, visited)
        }
      })
    }
  }
  if (vnode.dynamicChildren) {
    vnode.dynamicChildren.forEach(child => walkVNode(child, callback, visited))
  }
}
export function getProfiler() {
  return globalProfiler
}
export default VueRenderInspector
