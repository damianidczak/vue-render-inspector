<template>
  <div class="app">
    <h1>🎯 Vue Render Inspector Demo</h1>

    <div class="controls">
      <button @click="showSummary">Show Summary</button>
      <button @click="showTopOffenders">Top Offenders</button>
      <button @click="clearData">Clear Data</button>
    </div>

    <div class="demos">
      <!-- Demo 1: Good Component (no unnecessary renders) -->
      <section class="demo-section">
        <h2>✅ Good Component (Optimized)</h2>
        <GoodComponent :count="count" />
        <button @click="count++">Increment Count</button>
      </section>

      <!-- Demo 2: Bad Component (unnecessary renders) -->
      <section class="demo-section">
        <h2>⚠️ Bad Component (Unnecessary Renders)</h2>
        <BadComponent
          :user="createUserObject()"
          :callback="stableCallback"
          :config="{ theme: 'dark', mode: 'full' }"
          :items="['item1', 'item2', 'item3']"
        />
        <button @click="triggerBadRender">Trigger Parent Render</button>
        <p class="hint">Each click creates new object/function references</p>
        <p class="hint">Parent render count: {{ parentRenderTrigger }}</p>
      </section>

      <!-- Demo 3: Render Storm Demo -->
      <section class="demo-section">
        <h2>🌊 Render Storm Demo</h2>
        <RenderStormComponent :trigger="stormTrigger" />
        <button @click="startRenderStorm">Start Render Storm</button>
        <button @click="startUnnecessaryStorm">Start Unnecessary Storm</button>
      </section>

      <!-- Demo 4: Slow Component Demo -->
      <section class="demo-section">
        <h2>🐢 Slow Render Demo</h2>
        <SlowComponent :items="items" />
        <button @click="addItems">Add 1000 Items</button>
      </section>

      <!-- Demo 5: Enhanced Features Demo -->
      <section class="demo-section">
        <h2>✨ Enhanced Features Demo</h2>
        <p>
          <strong>New Features:</strong>
          Event triggers and reactivity information in console reports
        </p>
        <EnhancedDemo />
      </section>

      <!-- Demo 6: Diff Display Demo -->
      <section class="demo-section" style="grid-column: 1 / -1">
        <h2>🔍 Diff Display in Visualizer</h2>
        <p>
          <strong>New Feature:</strong>
          Click on nodes in the visualizer to see props/state diffs
        </p>
        <TestDiffComponent />
      </section>
    </div>

    <!-- Vue 3.5+ Optimization Patterns Demo -->
    <section class="demo-section" style="grid-column: 1 / -1">
      <h2>🚀 Vue 3.5+ Optimization Patterns</h2>
      <p>
        <strong>Advanced:</strong>
        Learn modern Vue optimization techniques including v-memo, markRaw, shallowReactive, and
        more
      </p>
      <Vue3OptimizationDemo />
    </section>

    <!-- Unnecessary Render Demo -->
    <section class="demo-section" style="grid-column: 1 / -1">
      <h2>🔍 Unnecessary Render Detection</h2>
      <UnnecessaryRenderDemo />
    </section>

    <!-- Good Components Only Demo -->
    <section class="demo-section perfect" style="grid-column: 1 / -1">
      <h2>🎯 Good Components Only (Optimized)</h2>
      <p>This section contains optimized components that only re-render when their props change</p>
      <div class="good-components-grid">
        <div class="good-component">
          <h4>✅ Good Component (Optimized)</h4>
          <GoodComponent :count="goodCount" />
          <button @click="goodCount++">Increment (should NOT cause warnings)</button>
          <p>Count: {{ goodCount }}</p>
          <p class="note">ℹ️ This component only re-renders when count changes</p>
        </div>

        <div class="good-component">
          <h4>✅ Optimized Child (Stable Props)</h4>
          <OptimizedChild :onClick="stableCallback" :config="stableConfig" :items="stableItems" />
          <button @click="triggerGoodRender">Trigger Parent Render</button>
          <p class="note">ℹ️ Vue re-renders children when parent updates (expected behavior)</p>
        </div>

        <div class="good-component">
          <h4>✅ Static Component (No Props)</h4>
          <StaticGoodComponent />
          <p>This component has no props and only re-renders when parent does</p>
          <p class="note">ℹ️ Parent re-renders cause child re-renders in Vue (by design)</p>
        </div>
      </div>
      <div class="verification">
        <p>
          <strong>Expected Result:</strong>
          Components only re-render when their props actually change
        </p>
        <p>
          <strong>Note:</strong>
          Parent re-renders cause child re-renders in Vue (this is expected behavior)
        </p>
        <p>
          <strong>Test:</strong>
          Click "Increment" button - should see normal renders. Click "Trigger Parent Render" - will
          cause child re-renders (expected)
        </p>
        <button @click="showGoodStats" class="verify-btn">Show Stats</button>
      </div>
    </section>

    <!-- Perfect Components Demo (Optimized) -->
    <section class="demo-section ultimate" style="grid-column: 1 / -1">
      <h2>💎 Perfect Components (Optimized)</h2>
      <p>These components demonstrate advanced optimization patterns for minimal re-renders</p>
      <div class="perfect-components-grid">
        <div class="perfect-component">
          <h4>💎 Optimized Good Component</h4>
          <MemoizedGoodComponent :count="perfectCount" />
          <button @click="perfectCount++">Increment Count</button>
          <button @click="triggerPerfectRender" class="secondary-btn">Trigger Parent Render</button>
          <p>Count: {{ perfectCount }}</p>
          <p class="note">✅ Only re-renders when count prop changes (optimized)</p>
        </div>

        <div class="perfect-component">
          <h4>💎 Optimized Static Component</h4>
          <MemoizedStaticComponent />
          <button @click="triggerPerfectRender" class="secondary-btn">Trigger Parent Render</button>
          <p>This component only re-renders when its internal state changes</p>
          <p class="note">✅ Only re-renders on internal state changes (optimized)</p>
        </div>

        <div class="perfect-component">
          <h4>💎 Computed Optimized Component</h4>
          <ComputedOptimizedComponent :items="computedItems" />
          <button @click="addComputedItem">Add Item</button>
          <button @click="triggerPerfectRender" class="secondary-btn">Trigger Parent Render</button>
          <p>Items: {{ computedItems.length }}</p>
          <p class="note">✅ Uses computed properties to prevent unnecessary recalculations</p>
        </div>
      </div>
      <div class="verification">
        <p>
          <strong>Expected Result:</strong>
          Components only re-render when their props/state actually change
        </p>
        <p>
          <strong>Test:</strong>
          Click "Trigger Parent Render" - components should NOT re-render. Click "Increment Count"
          or "Add Item" - should see normal renders
        </p>
        <button @click="showPerfectStats" class="verify-btn">Show Perfect Stats</button>
      </div>
    </section>

    <!-- Force Update Demo -->
    <section class="demo-section">
      <h2>🔄 Force Update Demo</h2>
      <ForceUpdateDemo />
    </section>

    <!-- Component Lifecycle Demo -->
    <section class="demo-section">
      <h2>🔄 Component Lifecycle</h2>
      <LifecycleDemo />
    </section>

    <!-- Case 1-10: Inline Object/Array Creation -->
    <section class="demo-section">
      <h2>📦 Case 1-10: Inline Object/Array Creation</h2>
      <p>
        <strong>Problem:</strong>
        Creating new objects/arrays in templates triggers unnecessary renders.
      </p>
      <p>
        <strong>Tips:</strong>
        Move to reactive state, use computed, separate props.
      </p>
      <button @click="triggerInlineObject">Trigger Inline Object Render</button>
      <p class="hint">
        Creates new object each time - watch console for unnecessary render warnings.
      </p>
    </section>

    <!-- Case 11-20: Inline Functions -->
    <section class="demo-section">
      <h2>⚡ Case 11-20: Inline Functions</h2>
      <p>
        <strong>Problem:</strong>
        Anonymous functions in templates cause new references.
      </p>
      <p>
        <strong>Tips:</strong>
        Define functions in script, use refs.
      </p>
      <button @click="triggerInlineFunction">Trigger Inline Function Render</button>
      <p class="hint">New function each render - inspector detects unnecessary.</p>
    </section>

    <!-- Case 21-30: Reactivity Issues -->
    <section class="demo-section">
      <h2>🔄 Case 21-30: Unnecessary Reactivity</h2>
      <p>
        <strong>Problem:</strong>
        Over-reactive objects or deep mutations.
      </p>
      <p>
        <strong>Tips:</strong>
        Use shallowReactive, shallowRef for non-deep data.
      </p>
      <button @click="triggerReactivityIssue">Trigger Reactivity Issue</button>
      <p class="hint">Deep changes causing full re-renders.</p>
    </section>

    <!-- Case 31-40: Watchers/Computed -->
    <section class="demo-section">
      <h2>👀 Case 31-40: Watchers/Computed Problems</h2>
      <p>
        <strong>Problem:</strong>
        Watchers triggering unrelated changes or computed with side effects.
      </p>
      <p>
        <strong>Tips:</strong>
        Watch specific props, keep computed pure.
      </p>
      <WatcherIssueDemo :trigger="watcherTrigger" />
      <button @click="triggerWatcherIssue">Trigger Watcher Issue</button>
      <p class="hint">Watcher on broad deps or computed with API calls.</p>
    </section>

    <!-- Case 41-50: List Rendering -->
    <section class="demo-section">
      <h2>📋 Case 41-50: List Rendering Issues</h2>
      <p>
        <strong>Problem:</strong>
        v-for without keys or large lists without memo.
      </p>
      <p>
        <strong>Tips:</strong>
        Proper keys, v-memo, virtual scrolling.
      </p>
      <button @click="triggerListIssue">Trigger List Render Issue</button>
      <p class="hint">Random keys or no memo causing recreations.</p>
    </section>

    <!-- Case 51-60: Performance Bottlenecks -->
    <section class="demo-section">
      <h2>🐌 Case 51-60: Performance Bottlenecks</h2>
      <p>
        <strong>Problem:</strong>
        Heavy computations or sync async in render.
      </p>
      <p>
        <strong>Tips:</strong>
        Move to computed, use Suspense, lazy load.
      </p>
      <button @click="triggerPerformanceIssue">Trigger Performance Issue</button>
      <p class="hint">Expensive logic in templates or blocking operations.</p>
    </section>

    <!-- Case 61-70: Additional Cases -->
    <section class="demo-section">
      <h2>📋 Case 61-70: Additional Cases</h2>
      <p>
        <strong>Problem:</strong>
        v-memo missing, event delegation, computed deps, etc.
      </p>
      <p>
        <strong>Tips:</strong>
        Use v-memo, delegation, watchEffect, shallowReactive.
      </p>
      <button @click="triggerVmemoIssue">Trigger v-memo Issue</button>
      <button @click="triggerEventDelegationIssue">Trigger Event Delegation Issue</button>
      <button @click="triggerComputedDepIssue">Trigger Computed Dep Issue</button>
      <p class="hint">Various optimization issues with reports.</p>
    </section>
    <section class="demo-section">
      <h2>Test bootlenecks</h2>
      <TestBottlenecks />
    </section>
    <!-- Nested Components Demo -->
    <!-- <SimpleNested /> -->

    <!-- Stats Display -->
    <div class="stats" v-if="stats">
      <h3>Current Stats</h3>
      <pre>{{ JSON.stringify(stats, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GoodComponent from './components/GoodComponent.vue'
import BadComponent from './components/BadComponent.vue'
import RenderStormComponent from './components/RenderStormComponent.vue'
import SlowComponent from './components/SlowComponent.vue'
import UnnecessaryRenderDemo from './components/UnnecessaryRenderDemo.vue'
import ForceUpdateDemo from './components/ForceUpdateDemo.vue'
import LifecycleDemo from './components/LifecycleDemo.vue'
import WatcherIssueDemo from './components/WatcherIssueDemo.vue'
import StaticGoodComponent from './components/StaticGoodComponent.vue'
import OptimizedChild from './components/demo/OptimizedChild.vue'
import MemoizedGoodComponent from './components/MemoizedGoodComponent.vue'
import MemoizedStaticComponent from './components/MemoizedStaticComponent.vue'
import ComputedOptimizedComponent from './components/ComputedOptimizedComponent.vue'
import EnhancedDemo from './components/EnhancedDemo.vue'
import TestDiffComponent from './src/components/TestDiffComponent.vue'
import Vue3OptimizationDemo from './components/Vue3OptimizationDemo.vue'
import TestBottlenecks from './components/TestBottlenecks.vue'
// import SimpleNested from './SimpleNested.vue';

// No need for local reference - we'll use window.__VUE_RENDER_INSPECTOR__ directly

// State
const count = ref(0)
const stormTrigger = ref(0)
const items = ref(Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })))
const stats = ref(null)

// Good components state (should not cause warnings)
const goodCount = ref(0)
const goodRenderTrigger = ref(0)

// Stable props that won't change (should not cause re-renders)
const stableConfig = ref({ theme: 'light', size: 'medium' })
const stableItems = ref(['apple', 'banana', 'cherry'])

// Perfect components state (memoized - should never re-render unnecessarily)
const perfectCount = ref(0)
const perfectRenderTrigger = ref(0)
const computedItems = ref(['item1', 'item2'])

// Case triggers
const inlineObjectTrigger = ref(0)
const inlineFunctionTrigger = ref(0)
const reactivityTrigger = ref(0)
const watcherTrigger = ref(0)
const listTrigger = ref(0)
const performanceTrigger = ref(0)
const vmemoTrigger = ref(0)
const eventDelegationTrigger = ref(0)
const computedDepTrigger = ref(0)

// Stable callback for BadComponent (to avoid real prop changes)
const stableCallback = () => console.log('inline')

// Creates new object reference every time (BAD!)
function createUserObject() {
  return { id: 1, name: 'John Doe', email: 'john@example.com' }
}

// Trigger bad render - this counter is NOT passed to BadComponent
const parentRenderTrigger = ref(0)

function triggerBadRender() {
  // Force parent to re-render WITHOUT changing any actual data
  parentRenderTrigger.value++ // This triggers parent render but isn't passed as prop
  console.log(`[App] Parent render triggered #${parentRenderTrigger.value}`)
}

// Start render storm
function startRenderStorm() {
  let iterations = 0
  const interval = setInterval(() => {
    stormTrigger.value++
    iterations++
    if (iterations >= 10) {
      clearInterval(interval)
    }
  }, 50) // 10 renders in 500ms = render storm!
}

// Start unnecessary render storm
function startUnnecessaryStorm() {
  let iterations = 0
  const interval = setInterval(() => {
    // Force parent re-render which will cause BadComponent to re-render
    // with new object references (createUserObject creates new object each time)
    parentRenderTrigger.value++ // Force parent re-render
    iterations++
    if (iterations >= 10) {
      clearInterval(interval)
      console.log('🌊 Unnecessary render storm completed!')
    }
  }, 50) // 10 unnecessary renders in 500ms!
}

// Add items
function addItems() {
  const newItems = Array.from({ length: 1000 }, (_, i) => ({
    id: items.value.length + i,
    name: `Item ${items.value.length + i}`
  }))
  items.value = [...items.value, ...newItems]
}

// Case trigger functions
function triggerInlineObject() {
  inlineObjectTrigger.value++
  // This will create new object each time
  const obj = { id: inlineObjectTrigger.value, data: 'test' }
  console.log('Inline object created:', obj)
}

function triggerInlineFunction() {
  inlineFunctionTrigger.value++
  // Inline function
  const fn = () => console.log('Inline function:', inlineFunctionTrigger.value)
  fn()
}

function triggerReactivityIssue() {
  reactivityTrigger.value++
  // Deep mutation
  if (!items.value[0]) return
  items.value[0].nested = { deep: reactivityTrigger.value }
}

function triggerWatcherIssue() {
  watcherTrigger.value++
  // Trigger BadComponent render to demonstrate watcher issues
  // The BadComponent has a watchEffect that watches all props,
  // causing unnecessary renders when parent creates new object references
  triggerBadRender()
  console.log("👀 Watcher Issue: BadComponent's watchEffect triggers on prop reference changes")
}

function triggerListIssue() {
  listTrigger.value++
  // Random key simulation
  items.value = items.value.map(item => ({ ...item, randomKey: Math.random() }))
}

function triggerPerformanceIssue() {
  performanceTrigger.value++
  // Heavy computation
  let result = 0
  for (let i = 0; i < 100000; i++) {
    result += i
  }
  console.log('Heavy computation result:', result)
}

function triggerVmemoIssue() {
  vmemoTrigger.value++
  // Simulate list without v-memo
  items.value = items.value.map(item => ({ ...item, updated: vmemoTrigger.value }))
}

function triggerEventDelegationIssue() {
  eventDelegationTrigger.value++
  // Simulate handlers in v-for
  console.log('Event delegation issue:', eventDelegationTrigger.value)
}

function triggerComputedDepIssue() {
  computedDepTrigger.value++
  // Simulate computed not updating
  console.log('Computed dep issue:', computedDepTrigger.value)
}

// Console commands using global window object
function showSummary() {
  if (window.__VUE_RENDER_INSPECTOR__) {
    stats.value = window.__VUE_RENDER_INSPECTOR__.summary()
  } else {
    console.warn('Vue Render Inspector not ready yet')
  }
}

function showTopOffenders() {
  if (window.__VUE_RENDER_INSPECTOR__) {
    window.__VUE_RENDER_INSPECTOR__.top(5)
  } else {
    console.warn('Vue Render Inspector not ready yet')
  }
}

function clearData() {
  if (window.__VUE_RENDER_INSPECTOR__) {
    window.__VUE_RENDER_INSPECTOR__.clear()
    stats.value = null
    console.log('✅ All tracking data cleared')
  } else {
    console.warn('Vue Render Inspector not ready yet')
  }
}

function triggerGoodRender() {
  goodRenderTrigger.value++
  console.log(
    `Good render triggered #${goodRenderTrigger.value} (should not cause child re-renders)`
  )
}

function showGoodStats() {
  if (window.__VUE_RENDER_INSPECTOR__) {
    console.log('=== GOOD COMPONENTS ANALYSIS ===')
    console.log('These components demonstrate optimized render patterns:')
    console.log('• GoodComponent: Only re-renders when count prop changes')
    console.log('• OptimizedChild: Uses stable prop references')
    console.log('• StaticGoodComponent: No props, minimal re-renders')
    console.log('')
    console.log('Note: Parent re-renders cause child re-renders in Vue (expected)')
    console.log('The "unnecessary" renders you see are actually correct Vue behavior')
    console.log('')
    window.__VUE_RENDER_INSPECTOR__.summary()
    console.log('=== END GOOD COMPONENTS ANALYSIS ===')
  }
}

function triggerPerfectRender() {
  perfectRenderTrigger.value++
  console.log(
    `Perfect render triggered #${perfectRenderTrigger.value} (memoized components should NOT re-render)`
  )
}

function addComputedItem() {
  computedItems.value.push(`item${computedItems.value.length + 1}`)
  console.log('Added computed item, component should re-render')
}

function showPerfectStats() {
  if (window.__VUE_RENDER_INSPECTOR__) {
    console.log('=== PERFECT COMPONENTS ANALYSIS ===')
    console.log('These components demonstrate advanced optimization patterns:')
    console.log('• MemoizedGoodComponent: Only re-renders when count prop changes')
    console.log('• MemoizedStaticComponent: Only re-renders when internal state changes')
    console.log('• ComputedOptimizedComponent: Uses computed properties for efficiency')
    console.log('')
    console.log('Expected: Clicking "Trigger Parent Render" should NOT cause component re-renders')
    console.log('Expected: Clicking "Increment Count" or "Add Item" should show normal renders')
    console.log('')
    window.__VUE_RENDER_INSPECTOR__.summary()
    console.log('=== END PERFECT COMPONENTS ANALYSIS ===')
  }
}
</script>

<style scoped>
.app {
  font-family: Arial, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #42b883;
  text-align: center;
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 20px 0;
}

button {
  padding: 10px 20px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #35a372;
}

.demos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.demo-section {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
}

.demo-section h2 {
  margin-top: 0;
  font-size: 18px;
}

.demo-section.perfect {
  border-color: #4caf50;
  background: linear-gradient(135deg, #f1f8e9, #e8f5e8);
}

.good-components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.good-component {
  background: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #4caf50;
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.1);
}

.good-component h4 {
  margin: 0 0 10px 0;
  color: #2e7d32;
}

.verification {
  background: #e8f5e8;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #4caf50;
  margin-top: 20px;
}

.verify-btn {
  background: #4caf50 !important;
  margin-top: 10px;
}

.verify-btn:hover {
  background: #45a049 !important;
}

.note {
  font-size: 11px;
  color: #666;
  font-style: italic;
  margin: 5px 0 0 0;
  background: rgba(76, 175, 80, 0.1);
  padding: 4px 8px;
  border-radius: 3px;
  border-left: 2px solid #4caf50;
}

.perfect-components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.perfect-component {
  background: linear-gradient(135deg, #fff8e1, #fff3e0);
  padding: 15px;
  border-radius: 8px;
  border: 2px solid #ff9800;
  box-shadow: 0 4px 8px rgba(255, 152, 0, 0.15);
}

.perfect-component h4 {
  margin: 0 0 10px 0;
  color: #e65100;
  font-size: 16px;
}

.secondary-btn {
  background: #ff9800 !important;
  margin-left: 8px;
}

.secondary-btn:hover {
  background: #f57c00 !important;
}

/* Component styles moved to individual component files */

.hint {
  margin-top: 10px;
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.stats {
  margin-top: 30px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.stats h3 {
  margin-top: 0;
}

.stats pre {
  background: #fff;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
}
</style>
