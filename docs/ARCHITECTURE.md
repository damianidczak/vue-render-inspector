# Vue Render Inspector - Architecture & Codebase Structure

**Last Updated:** October 30, 2025
**Version:** 1.0.0
**For:** Contributors and developers wanting to understand the codebase

---

## 📁 Project Structure Overview

```
vue-render-inspector/
├── src/                    # Source code
│   ├── core/              # Core profiling engine
│   ├── patterns/          # Pattern detection modules
│   ├── visualizer/        # Interactive UI components
│   ├── reporters/         # Console/logging reporters
│   ├── utils/             # Shared utilities
│   ├── components/        # Vue components (panel UI)
│   ├── plugin.js          # Main Vue plugin entry
│   └── index.js           # Public API exports
├── tests/                  # Test suites (777 tests)
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── visualizer/        # Visualizer tests
│   └── helpers/           # Test utilities
├── examples/              # Example components
├── docs/                  # Documentation
└── package.json           # Project metadata
```

---

## 🏗️ Core Architecture

### High-Level Flow

```
User App
   ↓ (app.use)
Plugin (plugin.js)
   ↓ (creates)
ComponentProfiler (core/profiler.js)
   ↓ (tracks)
Component Lifecycle Hooks
   ↓ (detects)
RenderDetector + Pattern Detection
   ↓ (reports)
ConsoleReporter + Visualizer
   ↓ (displays)
Developer
```

---

## 📂 Detailed Folder Structure

### `src/` - Main Source Code

#### `src/core/` - Profiling Engine Core

| File | Purpose | Key Classes/Functions |
|------|---------|----------------------|
| **profiler.js** | Main orchestrator | `ComponentProfiler` - Coordinates all tracking |
| **detector.js** | Unnecessary render detection | `RenderDetector` - Compares props/state |
| **tracker.js** | Render statistics tracking | `RenderTracker` - Stores render records |
| **reactivity-tracker.js** | Vue reactivity hook integration | `ReactivityTracker` - Tracks onTrack/onTrigger |
| **event-tracker.js** | User event correlation | `EventTracker` - Links events to renders |
| **recreation-detector.js** | Component recreation detection | `RecreationDetector` - Finds unmount→mount |
| **broadcast-channel.js** | Cross-tab communication | `initBroadcastChannel()` - BroadcastChannel API |

**Purpose:** These files implement the core profiling logic - hooking into Vue's lifecycle, tracking renders, detecting patterns.

**Data Flow:**
1. `profiler.js` creates instances of all trackers
2. Attaches to component lifecycle (mount/update/unmount)
3. On each render, calls `detector.js` to check if unnecessary
4. Stores results in `tracker.js`
5. Broadcasts events via `broadcast-channel.js`

---

#### `src/patterns/` - Pattern Detection System

**Modular Architecture** - Each pattern is self-contained

```
patterns/
├── index.js                # Pattern registry & orchestrator
├── core/                   # Individual pattern detectors
│   ├── deep-reactivity-misuse.js
│   ├── watcher-misuse.js
│   ├── large-list-no-virtualization.js
│   ├── template-method-calls.js
│   ├── array-mutations.js
│   ├── missing-vmemo.js
│   ├── array-index-key.js
│   ├── computed-no-deps.js
│   ├── deep-watchers.js
│   ├── event-listener-leaks.js
│   └── inline-object-creation.js
└── helpers/                # Shared detection utilities
    ├── detection-utils.js  # Common detection helpers
    └── code-generation.js  # Fix code generators
```

**Each Pattern Module Structure:**
```javascript
// Example: deep-reactivity-misuse.js
export function detect(instance, snapshot, renderTime) {
  // 1. Analyze component
  // 2. Detect pattern
  // 3. Generate suggestions
  // 4. Return result
  return {
    detected: true/false,
    severity: 'high'/'medium'/'low',
    reason: 'Why this pattern was detected',
    suggestion: 'How to fix it',
    codeGeneration: { /* generated fix code */ }
  }
}
```

**How Patterns Are Detected:**
```javascript
// patterns/index.js
export function detectEnhancedPatterns(instance, snapshot, renderTime) {
  const patterns = []

  // Run each pattern detector
  const deepReactivity = deepReactivityMisuse.detect(instance, snapshot, renderTime)
  if (deepReactivity.detected) patterns.push(deepReactivity)

  const watcherMisuse = watcherMisusePattern.detect(instance, snapshot, renderTime)
  if (watcherMisuse.detected) patterns.push(watcherMisuse)

  // ... all 11 patterns

  return patterns
}
```

**Adding a New Pattern:**
1. Create `src/patterns/core/your-pattern.js`
2. Implement `export function detect(instance, snapshot, renderTime)`
3. Add to `src/patterns/index.js`
4. Write tests in `tests/unit/core/`
5. Update documentation

---

#### `src/visualizer/` - Interactive UI

**Component-Based Architecture**

```
visualizer/
├── visualizer.js           # Main visualizer entry point
├── nodes/                  # Tree node representation
│   └── TreeNode.js        # Component node class
├── rendering/             # Canvas rendering
│   └── CanvasRenderer.js  # WebGL/Canvas drawing
├── layout/                # Tree layout algorithms
│   └── TreeLayout.js      # Hierarchical layout
├── spatial/               # Spatial data structures
│   └── Quadtree.js        # O(log n) hit detection
├── state/                 # State management
│   └── VisualizerState.js # Centralized state
├── ui/                    # UI components
│   ├── InspectorPanel.js  # Details panel
│   └── NotificationSystem.js # Real-time notifications
├── events/                # Event handling
│   └── EventHandlers.js   # Mouse/keyboard handlers
└── memory/                # Memory management
    └── MemoryManager.js   # Node pruning
```

**Visualizer Data Flow:**
1. **Subscribe** to render events via `broadcast-channel.js`
2. **Create TreeNode** for each component
3. **Calculate layout** using `TreeLayout.js`
4. **Build Quadtree** for spatial indexing
5. **Render canvas** with viewport culling
6. **Handle clicks** → show `InspectorPanel`

**Performance Optimizations:**
- **Viewport Culling:** Only render visible nodes
- **Level of Detail (LOD):** Simplify distant nodes
- **Quadtree:** O(log n) mouse hit detection
- **requestAnimationFrame:** Batch rendering
- **Memory Pruning:** Limit stored nodes

---

#### `src/reporters/` - Output Formatting

| File | Purpose |
|------|---------|
| **console-reporter.js** | Console logging with colors, formatting |

**Purpose:** Format render data for console output

**Features:**
- Color-coded severity (green/yellow/red)
- Timestamp display
- Duration formatting
- Grouping by component
- Queue-based reporting (prevents console spam)

---

#### `src/utils/` - Shared Utilities

| File | Purpose |
|------|---------|
| **snapshot.js** | Component snapshot creation & management |
| **comparison.js** | Deep/shallow equality checks |
| **serialization.js** | Safe JSON serialization (circular refs) |
| **performance.js** | Microsecond-precision timing |
| **helpers.js** | Misc utilities (HTML escape, formatting) |

**Purpose:** Shared utility functions used across the codebase

---

#### `src/components/` - Vue UI Components

| File | Purpose |
|------|---------|
| **RenderInspectorPanel.vue** | Floating control panel (minimal UI) |

**Purpose:** Vue components for the inspector UI

---

#### `src/plugin.js` - Vue Plugin Entry Point

**Main Plugin File** - Integrates inspector into Vue app

**Key Responsibilities:**
1. **Install hook:** `app.use(VueRenderInspector, options)`
2. **Create profiler:** `new ComponentProfiler(options)`
3. **Attach to lifecycle:** Walks component tree, profiles each component
4. **Global API:** Expose `window.__VUE_RENDER_INSPECTOR__`
5. **Auto-disable:** Checks `process.env.NODE_ENV !== 'production'`

**Plugin Installation Flow:**
```javascript
app.use(VueRenderInspector, options)
  ↓
plugin.install(app, options)
  ↓
1. Check if enabled (production check)
2. Create ComponentProfiler
3. Attach to app.mount (walk tree after mount)
4. Set up global mixin (onRenderTracked/onRenderTriggered)
5. Expose global API
6. Mount control panel
```

---

#### `src/index.js` - Public API

**Main Export File**

```javascript
export { VueRenderInspector } from './plugin.js'
export { getProfiler } from './plugin.js'
export default VueRenderInspector
```

**Purpose:** Clean public API for library users

---

### `tests/` - Test Suites (777 tests)

```
tests/
├── unit/                   # Unit tests (pattern detection, core logic)
│   ├── core/              # Core functionality tests
│   │   ├── profiler.test.js
│   │   ├── detector.test.js
│   │   ├── enhanced-*.test.js (pattern tests)
│   ├── utils/             # Utility tests
│   └── *.test.js          # Other unit tests
├── integration/            # Integration tests (real components)
│   ├── good-component.test.js
│   ├── bad-component.test.js
│   ├── slow-component.test.js
│   ├── configuration.test.js
│   ├── all-options.test.js
│   └── developer-workflow.test.js
├── visualizer/             # Visualizer tests
│   ├── visualizer.test.js
│   ├── rendering/
│   ├── layout/
│   ├── spatial/
│   ├── ui/
│   └── events/
└── helpers/                # Test utilities
    └── setup.js           # mountWithInspector()
```

**Test Organization:**
- **Unit:** Test individual functions/classes in isolation
- **Integration:** Test with real Vue components
- **Visualizer:** Test UI rendering and interactions

**Key Test Helpers:**
```javascript
// tests/helpers/setup.js
export async function mountWithInspector(component, options, inspectorOptions)
  // Mounts component with inspector plugin installed
  // Returns { wrapper, inspector }
```

---

### `examples/` - Example Components

```
examples/
├── components/
│   ├── GoodComponent.vue      # Optimized example
│   ├── BadComponent.vue       # Anti-patterns example
│   ├── SlowComponent.vue      # Performance issues
│   ├── ForceUpdateDemo.vue    # Force update demo
│   └── RenderStormComponent.vue
└── App.vue                    # Example app
```

**Purpose:** Demonstrate patterns and test inspector in real scenarios

---

## 🔄 Key Data Structures

### ComponentSnapshot (utils/snapshot.js)
```javascript
{
  uid: 123,
  componentName: 'MyComponent',
  props: { /* current props */ },
  state: { /* current reactive state */ },
  renderCount: 5,
  lastRenderTime: 1234567890,
  // ... metadata
}
```

### RenderRecord (core/tracker.js)
```javascript
{
  uid: 123,
  componentName: 'MyComponent',
  timestamp: 1234567890,
  duration: 5.2, // ms
  isUnnecessary: false,
  reason: 'state-changed',
  changedProps: ['count'],
  trigger: 'click',
  enhancedPatterns: [{ type: 'deepReactivity', ... }]
}
```

### TreeNode (visualizer/nodes/TreeNode.js)
```javascript
class TreeNode {
  uid: number
  componentName: string
  parent: TreeNode | null
  children: TreeNode[]
  x: number // Position
  y: number
  renderAnalysis: {
    totalRenders: number,
    unnecessaryRenders: number,
    avgRenderTime: number,
    renderHistory: RenderRecord[]
  }
  enhancedPatterns: Pattern[]
}
```

---

## 🎯 Core Algorithms

### Unnecessary Render Detection (core/detector.js)

**Algorithm:**
```javascript
function isRenderUnnecessary(prevSnapshot, currentSnapshot) {
  // 1. Compare props
  if (propsChanged(prev, current)) {
    if (deepEqual(prev.props, current.props)) {
      return { unnecessary: true, reason: 'same-props-content' }
    }
    return { unnecessary: false, reason: 'props-changed' }
  }

  // 2. Compare state
  if (stateChanged(prev, current)) {
    return { unnecessary: false, reason: 'state-changed' }
  }

  // 3. Check trigger
  if (trigger === 'force-update') {
    return { unnecessary: true, reason: 'force-update' }
  }

  // 4. Check parent re-render
  if (trigger === 'parent-rerender' && !propsChanged) {
    return { unnecessary: true, reason: 'parent-rerender-same-props' }
  }

  return { unnecessary: false }
}
```

### Tree Layout Algorithm (visualizer/layout/TreeLayout.js)

**Hierarchical Layout:**
```javascript
function calculateLayout(nodes) {
  // 1. Build tree structure
  const roots = nodes.filter(n => !n.parent)

  // 2. Calculate positions recursively
  roots.forEach((root, index) => {
    positionSubtree(root, index * horizontalSpacing, 0)
  })
}

function positionSubtree(node, x, y) {
  node.x = x
  node.y = y

  // Position children
  let childX = x - (node.children.length * nodeWidth) / 2
  node.children.forEach(child => {
    positionSubtree(child, childX, y + levelHeight)
    childX += nodeWidth + nodeSpacing
  })
}
```

### Quadtree Hit Detection (visualizer/spatial/Quadtree.js)

**O(log n) spatial search:**
```javascript
function findNodeAtPoint(x, y) {
  return quadtree.retrieve({ x, y, width: 1, height: 1 })
    .find(node =>
      x >= node.x - nodeWidth/2 &&
      x <= node.x + nodeWidth/2 &&
      y >= node.y - nodeHeight/2 &&
      y <= node.y + nodeHeight/2
    )
}
```

---

## 🔌 Extension Points

### Adding a New Pattern Detector

**Step-by-step guide:**

1. **Create pattern file:** `src/patterns/core/my-pattern.js`

```javascript
export function detect(instance, snapshot, renderTime) {
  // Your detection logic
  const myMetrics = analyzeComponent(instance)

  if (myMetrics.shouldDetect) {
    return {
      detected: true,
      severity: 'high', // or 'medium', 'low'
      reason: 'Why this pattern is an issue',
      suggestion: 'How to fix it',
      detectionMethod: 'template-analysis', // or 'heuristic', 'performance'
      myMetrics,
      codeGeneration: {
        badCode: '// Example of bad code',
        goodCode: '// Example of good code'
      }
    }
  }

  return { detected: false }
}
```

2. **Register in index:** `src/patterns/index.js`

```javascript
import * as myPattern from './core/my-pattern.js'

export function detectEnhancedPatterns(instance, snapshot, renderTime) {
  const patterns = []

  // ... existing patterns

  const myPatternResult = myPattern.detect(instance, snapshot, renderTime)
  if (myPatternResult.detected) {
    patterns.push({ type: 'myPattern', ...myPatternResult })
  }

  return patterns
}
```

3. **Write tests:** `tests/unit/core/my-pattern.test.js`

4. **Update docs:** Add to README.md pattern list

---

### Adding a New Visualizer Feature

**Example: Add a filter button**

1. **Update visualizer.js HTML:**
```javascript
const container = document.createElement('div')
container.innerHTML = `
  <button id="vri-my-filter">🔍 My Filter</button>
`
```

2. **Add event handler:** `src/visualizer/events/EventHandlers.js`
```javascript
_setupButtonHandlers() {
  const myFilterBtn = this.container.querySelector('#vri-my-filter')
  if (myFilterBtn) {
    myFilterBtn.onclick = () => this.myFilterCallback?.()
  }
}

setMyFilterCallback(callback) {
  this.myFilterCallback = callback
}
```

3. **Implement logic:** `src/visualizer/visualizer.js`
```javascript
function applyMyFilter() {
  const filteredNodes = state.nodes.filter(/* your logic */)
  calculateTreeLayout(filteredNodes)
}

eventHandlers.setMyFilterCallback(applyMyFilter)
```

---

## 🧪 Testing Guidelines

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- tests/unit/core/profiler.test.js

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Test Structure

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { mountWithInspector } from '../helpers/setup.js'

describe('My Feature', () => {
  beforeEach(() => {
    // Setup
  })

  it('should do something', async () => {
    const { wrapper, inspector } = await mountWithInspector(Component)

    // Act
    await wrapper.find('button').trigger('click')

    // Assert
    const stats = inspector.getAllStats()
    expect(stats[0].totalRenders).toBe(2)
  })
})
```

---

## 🏛️ Design Principles

### 1. **Modularity**
- Each pattern is self-contained
- Detectors don't depend on each other
- Easy to add/remove patterns

### 2. **Performance**
- WeakMaps for memory safety
- Viewport culling in visualizer
- Lazy loading (visualizer on-demand)
- Minimal overhead (<1ms per render)

### 3. **Testability**
- Pure functions where possible
- Dependency injection (options)
- Test helpers for common scenarios
- 99.7% test coverage

### 4. **Developer Experience**
- Zero-config works out of the box
- Progressive enhancement (add options as needed)
- Clear error messages
- Self-documenting code

### 5. **Production Safety**
- Auto-disable in production
- No external dependencies
- Memory cleanup
- XSS prevention

---

## 📚 Further Reading

- **OPTIONS_REFERENCE.md** - All configuration options
- **COMPREHENSIVE_ANALYSIS.md** - Technical deep dive
- **UNDERSTANDING_UNNECESSARY_RENDERS.md** - Core concepts
- **CONTRIBUTING.md** - How to contribute (if exists)

---

## 💡 Common Development Tasks

### Add a new config option
1. Add to `ComponentProfiler` constructor in `core/profiler.js`
2. Use in relevant detector
3. Add test in `tests/integration/all-options.test.js`
4. Document in `docs/OPTIONS_REFERENCE.md`

### Debug a pattern not detecting
1. Check pattern's `detect()` function logic
2. Verify component has required structure (template, setup, etc.)
3. Check detection thresholds
4. Add console.logs to detection logic
5. Write failing test case

### Optimize visualizer performance
1. Profile with Chrome DevTools
2. Check viewport culling is working
3. Verify Quadtree is built correctly
4. Ensure LOD is applied at distance
5. Check for memory leaks (heap snapshots)

---

**Last Updated:** October 30, 2025
**Maintainer:** Core team
**Questions?** Open an issue or check existing documentation
