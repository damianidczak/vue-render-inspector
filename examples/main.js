/**
 * Vue Application Entry Point with Render Inspector
 */

console.log('[MAIN] 1. Starting application...')

import { createApp } from 'vue'
// import { VueRenderInspector } from '../src/index.js';
import { VueRenderInspector } from '../src/plugin.js'
import App from './App.vue'

console.log('[MAIN] 2. Imports successful')

// Create Vue app
const app = createApp(App)

console.log('[MAIN] 3. Vue app created')

console.log('[MAIN] 4. Installing VueRenderInspector plugin...')

// Install Vue Render Inspector
app.use(VueRenderInspector, {
  // Enable/disable (auto-detects environment)
  enabled: true, // Force enable for debugging

  // Console output
  console: true,
  verbose: false, // Set to true for detailed logs
  colorize: true,
  showTimestamp: true,
  showDuration: true,
  groupByComponent: false, // Set to true to group logs by component

  // Performance thresholds (in milliseconds)
  warnThreshold: 16, // Warn if render takes longer than 16ms (one frame)
  errorThreshold: 100, // Error if render takes longer than 100ms

  // Detection settings
  detectUnnecessary: true, // Detect unnecessary renders
  strictMode: true, // More strict unnecessary render detection
  trackFunctions: true, // Track inline function changes

  // Component filtering
  // Only track these components (empty = track all)
  include: [], // e.g., [/^App/, /Dashboard/, /^User/]

  // Don't track these components
  exclude: [
    /^Transition/, // Vue built-in transitions
    /^KeepAlive/, // Vue built-in keep-alive
    /Icon$/, // Icon components (usually simple)
    /^Base/ // Base components (if they're simple)
  ],

  // History settings
  maxRecords: 1000, // Maximum number of render records to store
  maxHistorySize: 50, // Maximum snapshots per component

  // Render storm detection
  stormWindow: 1000, // Time window in ms to detect storms
  stormThreshold: 5, // Number of renders in window to trigger storm alert

  // Enhanced tracking features
  trackEvents: true, // Track DOM events that trigger renders
  trackReactivity: true, // Track reactivity dependencies and triggers
  eventContextTimeout: 100, // How long to associate events with renders (ms)
  maxReactivityEvents: 100, // Maximum reactivity events to track per component

  // UI settings
  showWelcome: true // Show welcome message in console
})

console.log('[MAIN] 5. VueRenderInspector plugin installed')

// Mount the app
console.log('[MAIN] 6. Mounting app...')
app.mount('#app')
console.log('[MAIN] 7. App mounted successfully!')

// Export app for testing or other purposes
export default app
