import { VueRenderInspector as Plugin } from './plugin.js'

export { VueRenderInspector, default as default, getProfiler } from './plugin.js'
export { ComponentProfiler, createProfiler } from './core/profiler.js'
export { SnapshotManager, ComponentSnapshot } from './utils/snapshot.js'
export { RenderDetector } from './core/detector.js'
export { RenderTracker, RenderRecord, ComponentStats } from './core/tracker.js'
export { ConsoleReporter } from './reporters/console-reporter.js'
export {
  shallowEqual,
  computeDiff,
  isDeepEqual,
  hasDifferentReferenceButSameContent
} from './utils/comparison.js'
export {
  safeSerialize,
  captureProps,
  captureState,
  formatForConsole
} from './utils/serialization.js'
export {
  RenderTimer,
  RenderFrequencyTracker,
  MovingAverage,
  measurePerformance
} from './utils/performance.js'
export const VERSION = '1.0.0'
export function setupRenderInspector(app, options = {}) {
  const isDev =
    typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production'
  const defaultOptions = {
    enabled: isDev,
    console: isDev,
    verbose: false,
    warnThreshold: 16,
    errorThreshold: 100,
    detectUnnecessary: true,
    showWelcome: true,
    ...options
  }
  return app.use(Plugin, defaultOptions)
}
