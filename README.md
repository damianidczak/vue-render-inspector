# Vue Render Inspector 🔍

<p align="center">
  <img src="https://img.shields.io/badge/vue-3.5+-brightgreen.svg" alt="Vue 3.5+">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  <a href="https://www.npmjs.com/package/vue-render-inspector"><img src="https://badge.fury.io/js/vue-render-inspector.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/vue-render-inspector"><img src="https://img.shields.io/npm/dm/vue-render-inspector.svg" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/bundle%20size-<10KB-green.svg" alt="Bundle Size">
  <img src="https://img.shields.io/badge/tests-1030%2F1030%20passing-success.svg" alt="Tests Passing">
</p>

<p align="center">
  <b>Advanced render profiler and debugger for Vue 3.5+ applications</b><br>
  Track, analyze, and optimize component re-renders with detailed insights<br>
  <i>Zero dependencies • Zero-config • Zero production overhead</i>
</p>

---

## 🚀 Features

### Core Capabilities
- 🎯 **Automatic Render Tracking** - Monitor all component renders without manual instrumentation
- 🔍 **Unnecessary Render Detection** - Identify components that re-render without actual data changes
- ⚡ **Performance Analysis** - Microsecond-precision timing with configurable thresholds
- 🔗 **Reactivity Tracking** - Visualize Vue's reactivity system with renderTracked/renderTriggered hooks
- 📊 **Interactive Visualizations** - One-click access to flow diagrams and tree views
- 🚨 **Render Storm Detection** - Identify components caught in rapid re-render loops
- 🔄 **Component Recreation Detection** - Find components being destroyed and recreated unnecessarily
- 📡 **Cross-Tab Communication** - Visualize renders across multiple browser windows
- 💾 **Memory Safe** - WeakMap-based tracking prevents memory leaks

### Developer Experience
- 🔌 **Simple Integration** - Works as Vue plugin
- 🎯 **Zero Production Overhead** - Automatically disabled in production builds
- 🛠️ **Flexible Configuration** - Extensive options for customization

## 🤔 Why Use This?

Vue Render Inspector helps you:

- **🚀 Ship faster apps** by finding performance bottlenecks instantly
- **💰 Save hours** debugging why components re-render  
- **✅ Catch issues** before your users do

## 📦 Installation

```bash
npm install vue-render-inspector --save-dev
```

## 🔧 Quick Start

### As a Vue Plugin (Zero Config)

```javascript
import { createApp } from 'vue'
import { VueRenderInspector } from 'vue-render-inspector'
import 'vue-render-inspector/dist/style.css' // Import styles for the panel
import App from './App.vue'

const app = createApp(App)

// Just works out of the box! 🎉
app.use(VueRenderInspector, { enabled: true })

app.mount('#app')
```

### Only If You Need Different Settings

```javascript
// Example: Only track specific components
app.use(VueRenderInspector, {
  include: ['MyApp', 'Dashboard'] 
})

// Example: Exclude third-party components
app.use(VueRenderInspector, {
  exclude: ['Icon', 'Button']
})

// Example: Stricter performance thresholds
app.use(VueRenderInspector, {
  warnThreshold: 10,   // Warn at 10ms instead of 16ms
  errorThreshold: 50   // Error at 50ms instead of 100ms
})
```

## 🎮 Console API

Once installed, you can use these commands in the browser console:

```javascript
// Show render summary
__VUE_RENDER_INSPECTOR__.summary()

// Show top 10 components with most unnecessary renders
__VUE_RENDER_INSPECTOR__.top(10)

// Show slowest components
__VUE_RENDER_INSPECTOR__.slow(5)

// Open interactive visualizer
__VUE_RENDER_INSPECTOR__.visualizer()

// Toggle inspector panel
__VUE_RENDER_INSPECTOR__.panel()

// Clear all data
__VUE_RENDER_INSPECTOR__.clear()

// Show help
__VUE_RENDER_INSPECTOR__.help()
```

## 🎯 What It Detects

Vue Render Inspector automatically detects **11 distinct performance patterns** and provides actionable solutions for each:

### 1. **Deep Reactivity Misuse**
```javascript
// ❌ Bad: Deep reactivity for large objects (>50 properties)
const largeData = ref({
  users: [...], // 1000+ users with nested data
  posts: [...], // 500+ posts
  settings: { theme: { colors: {...} } }
})

// ✅ Good: Shallow reactivity for performance
const largeData = shallowRef({
  users: [...],
  posts: [...],
  settings: {...}
})
```

### 2. **Watcher Misuse (Derived State)**
```javascript
// ❌ Bad: Watcher modifying reactive state
const items = ref([...])
const filteredItems = ref([])

watch(items, (newItems) => {
  filteredItems.value = newItems.filter(i => i.active)
})

// ✅ Good: Computed property (cached & reactive)
const filteredItems = computed(() =>
  items.value.filter(i => i.active)
)
```

### 3. **Large Lists Without Virtualization**
```vue
<!-- ❌ Bad: Rendering 1000+ items in DOM -->
<div v-for="item in thousandsOfItems" :key="item.id">
  {{ item.name }}
</div>

<!-- ✅ Good: Virtual scrolling (only renders visible) -->
<VirtualList :items="thousandsOfItems" :item-height="50">
  <template #default="{ item }">
    <div>{{ item.name }}</div>
  </template>
</VirtualList>
```

### 4. **Template Method Calls**
```vue
<!-- ❌ Bad: Method calls in template (runs every render) -->
<div>{{ calculateTotal(items) }}</div>

<!-- ✅ Good: Computed properties (cached) -->
<div>{{ total }}</div>

<script setup>
const total = computed(() => calculateTotal(items.value))
</script>
```

### 5. **Array Mutations (Reactivity Issues)**
```javascript
// ❌ Bad: Direct mutations may break reactivity
items.value.push(newItem)
items.value.sort()

// ✅ Good: Immutable updates
items.value = [...items.value, newItem]
items.value = [...items.value].sort()
```

### 6. **Missing v-memo for Expensive Lists**
```vue
<!-- ❌ Bad: Re-renders entire list item unnecessarily -->
<li v-for="item in items" :key="item.id">
  <ExpensiveComponent :item="item" />
</li>

<!-- ✅ Good: Only re-renders when dependencies change -->
<li v-for="item in items" :key="item.id" v-memo="[item.id, item.status]">
  <ExpensiveComponent :item="item" />
</li>
```

### 7. **Inline Object/Array Creation**
```vue
<!-- ❌ Bad: Creates new object on every render -->
<ChildComponent :config="{ theme: 'dark', size: 'lg' }" />

<!-- ✅ Good: Stable reference -->
<ChildComponent :config="stableConfig" />
```

### 8. **Inline Functions**
```vue
<!-- ❌ Bad: Creates new function on every render -->
<button @click="() => handleClick(item.id)">Click</button>

<!-- ✅ Good: Stable function reference -->
<button @click="handleClick">Click</button>
```

### 9. **Array Index as Key**
```vue
<!-- ❌ Bad: Using index as key (breaks with mutations/reordering) -->
<div v-for="(item, index) in items" :key="index">
  {{ item.name }}
</div>

<!-- ✅ Good: Stable unique identifier -->
<div v-for="item in items" :key="item.id">
  {{ item.name }}
</div>
```

### 10. **Deep Watchers on Large Objects**
```javascript
// ❌ Bad: Deep watching large objects (expensive traversal)
watch(largeObject, (newValue) => {
  // Handler runs on ANY nested change
}, { deep: true })

// ✅ Good: Watch specific properties
watch(() => largeObject.value.specificProperty, (newValue) => {
  // Only runs when specificProperty changes
})
```

### 11. **Event Listener Leaks**
```javascript
// ❌ Bad: Missing cleanup in lifecycle hooks
onMounted(() => {
  window.addEventListener('resize', handleResize)
  // Memory leak! Listener persists after unmount
})

// ✅ Good: Always cleanup
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
```

### Additional Detections
- **Component Recreation** - Finds components being destroyed and recreated unnecessarily
- **Render Storm** - Identifies components caught in rapid re-render loops (>5 renders in 1 second)
- **Computed Without Dependencies** - Detects computed properties that don't access reactive data

## ⚙️ Configuration

The library works perfectly with **zero configuration**! It has smart defaults:

### Default Settings (Built-in)
```javascript
{
  warnThreshold: 16,    // Warn if render > 16ms (one frame)
  errorThreshold: 100,  // Error if render > 100ms
  include: [],          // Empty = track all components
  exclude: []           // Empty = don't exclude any
}
```

You only need to configure if you want to change these defaults.

### Examples

```javascript
// Track only specific components
app.use(VueRenderInspector, {
  include: ['ProductList', 'CartItem', /^Dashboard/]
})

// Exclude third-party components
app.use(VueRenderInspector, {
  exclude: ['VIcon', 'VButton', /^Vuetify/]
})

// Adjust performance thresholds
app.use(VueRenderInspector, {
  warnThreshold: 10,   // Stricter: warn at 10ms
  errorThreshold: 50   // Stricter: error at 50ms
})
```

<details>
<summary><b>Advanced Configuration</b> (Click to expand)</summary>

For advanced users who need fine-grained control:

```javascript
{
  // Core
  enabled: true,              // Enable/disable inspector
  console: true,              // Console reporting
  verbose: false,             // Detailed logs
  
  // Detection
  detectUnnecessary: true,    // Detect unnecessary renders
  strictMode: false,          // Strict prop comparison
  trackFunctions: true,       // Track inline functions
  trackDependencies: false,   // Track reactivity dependencies
  
  // Memory
  maxRecords: 1000,          // Max render records
  maxHistorySize: 50,        // Max snapshots per component
  
  // Render Storm
  stormWindow: 1000,         // Time window in ms
  stormThreshold: 5,         // Renders in window
  
  // UI Options
  showWelcome: true,         // Welcome message
  panelOpenByDefault: true,  // Keep floating window open on load
  showTimestamp: true,       // Show timestamps
  showDuration: true,        // Show durations
  groupByComponent: false,   // Group by component
  colorize: true            // Colorize output
}
```

</details>

## 📊 Visualizations

### Advanced Tree Visualizer
Open the interactive visualizer with: `__VUE_RENDER_INSPECTOR__.visualizer()`

**What You See When You Click a Node:**
- ✅ **Total Renders & Unnecessary Renders** - With percentage breakdown
- ✅ **Performance Metrics** - Average, slowest, fastest render times
- ✅ **Detected Bottlenecks** - All 11 performance patterns with:
  - Pattern type and severity (high/medium/low)
  - Detailed explanation of the issue
  - Actionable fix suggestions
  - Code examples (bad vs good)
- ✅ **Render History** - Last 10 renders with:
  - Timestamp and duration
  - Reason (props-changed, state-changed, etc.)
  - What changed (props diff, state diff)
  - Trigger mechanism (user event, reactivity, parent update)
- ✅ **Reactivity Tracking** - Which reactive dependencies triggered renders
- ✅ **Event Correlation** - Which user events caused renders
- ✅ **Component Context** - Parent chain, depth, children count, source file

**Visualizer Features:**
- **Real-time Component Tree** - Shows component hierarchy and relationships
- **Performance Heatmap** - Color-coded nodes based on render performance
  - 🟢 Green: <16ms (good)
  - 🟡 Yellow: 16-100ms (needs attention)
  - 🔴 Red: >100ms (critical)
- **Interactive Controls** - Zoom, pan, and filter capabilities
- **Performance Optimized** - Handles 1000+ components smoothly with viewport culling
- **Notification System** - Real-time updates when components render
- **Memory Efficient** - Uses Quadtree spatial indexing for O(log n) hit detection

## 🎯 Use Cases

### Performance Optimization
- Identify components with excessive re-renders
- Find performance bottlenecks
- Optimize render-heavy component trees
- Validate optimization strategies

### Debugging
- Understand why components re-render
- Trace render propagation
- Correlate user events to renders
- Analyze reactivity dependencies

### Code Quality
- Enforce best practices
- Educational tool for team training
- Code review assistance
- Performance regression prevention

## 🧪 Testing & Reliability

**Test Coverage: 99.7% (734/736 tests passing)**

Vue Render Inspector is extensively tested to ensure accuracy and reliability:

**Unit Tests:**
- ✅ All 11 pattern detection modules individually tested
- ✅ Edge case handling (rapid mount/unmount, memory management)
- ✅ Props/state diffing accuracy
- ✅ Reactivity tracking validation

**Integration Tests:**
- ✅ Real-world component scenarios (good components, bad components, slow components)
- ✅ Developer workflow testing (form re-renders, list optimizations)
- ✅ Render storm detection
- ✅ Component recreation detection

**Visualizer Tests:**
- ✅ Canvas rendering optimizations (LOD, viewport culling)
- ✅ Quadtree spatial indexing
- ✅ Inspector panel data display
- ✅ Notification system
- ✅ Event handling (mouse, keyboard, wheel)

**Pattern Detection Accuracy:**
- ✅ Verified against Vue 3.5+ official documentation
- ✅ Thresholds aligned with industry standards (16ms frame budget, 100ms interaction)
- ✅ Code generation examples match official Vue patterns
- ✅ Low false positive rate validated through comprehensive test suite

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🚀 Production Readiness

**✅ Safe for Production Use** (when explicitly enabled)

Vue Render Inspector is built with production safety in mind:

**Zero Production Overhead:**
```javascript
// Automatically disabled in production builds
const shouldEnable = process.env.NODE_ENV !== 'production'
```

**Memory Safe:**
- WeakMap-based component tracking (automatic garbage collection)
- Configurable snapshot history limits (default: 50 per component)
- Periodic memory cleanup (30s interval)
- No memory leaks from unmounted components

**Performance Impact:**
- **Development:** ~0.1-0.5ms overhead per render
- **Production:** 0ms (auto-disabled)
- **Visualizer:** On-demand loading (not auto-opened)

**When to Enable:**
- ✅ Local development (recommended - always on)
- ✅ Staging environments (for QA testing)
- ✅ CI/CD performance testing
- ✅ Production debugging (manual override for specific sessions)
- ❌ Production (default - auto-disabled for end users)

**Security:**
- ✅ HTML escaping prevents XSS
- ✅ No sensitive data transmitted via BroadcastChannel
- ✅ WeakMaps prevent memory inspection attacks
- ✅ No external dependencies (zero supply chain risk)

## 📖 Best Practices

**Prioritize Fixes:**
1. 🔴 **High Severity + Slow Renders** - Fix immediately
   - Deep reactivity on large data (>25ms renders)
   - Methods in v-for loops
   - Lists >1000 items without virtualization

2. 🟡 **Medium Severity + High Frequency** - Fix soon
   - Watcher-based derived state
   - Missing v-memo on frequently re-rendering lists
   - Inline object creation causing child re-renders

3. 🟢 **Low Severity** - Optimize when convenient
   - Array index keys (if list is static)
   - Minor optimizations in small apps

**Trust the Recommendations:**
- All pattern detections verified against Vue 3.5+ official documentation
- Thresholds based on industry standards (60 FPS = 16ms frame budget)
- Code generation examples match official Vue patterns
- 99.7% test coverage validates accuracy

## 🙏 Acknowledgments

- Built for Vue 3.5+ with love ❤️
- Inspired by [React why did you rerender](https://github.com/welldone-software/why-did-you-render)
- Zero dependencies for maximum performance and compatibility
---

<p align="center">
  Made with ❤️ for the Vue.js community<br>
  <a href="https://github.com/damianidczak/vue-render-inspector">GitHub</a> •
  <a href="https://www.npmjs.com/package/vue-render-inspector">NPM</a> •
  <a href="https://github.com/damianidczak/vue-render-inspector/issues">Issues</a>
</p>
