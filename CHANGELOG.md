# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.5] - 2025-11-16

### ✨ Added

- New `panelOpenByDefault` UI option to control whether the floating inspector window is shown automatically or stays minimized until the launcher circle is clicked. (Files: `src/plugin.js`, `src/components/RenderInspectorPanel.vue`, `src/index.js`, `index.d.ts`, docs & tests)

---

## [1.0.4] - 2025-10-31

### 🐛 Bug Fixes

#### Fixed Window Access in Node.js Test Environment
- **Fixed:** `ReferenceError: window is not defined` in test environment
- **Issue:** Plugin code accessed `window.location` in setTimeout without checking if `window` exists
- **Solution:** Added proper `window` existence checks before accessing browser APIs
- **Impact:** All 1030 tests now pass without unhandled errors
- **Files Changed:** `src/plugin.js`

---

## [1.0.2] - 2025-10-31

### 🐛 Bug Fixes

#### Fixed CSS Export Configuration
- **Fixed:** CSS file not exportable from package
- **Issue:** `import 'vue-render-inspector/dist/style.css'` failed with error: "Missing ./dist/style.css specifier in package"
- **Solution:**
  - Added `"./dist/style.css": "./dist/style.css"` to `exports` field in package.json
  - Updated `sideEffects` to include CSS file for proper bundler handling
- **Impact:** CSS can now be imported correctly in all bundlers (Vite, Webpack, Rollup)

### 📚 Documentation

#### Added CSS Import Instruction
- **Added:** CSS import instruction to Quick Start guide in README
- **Solution:** Added `import 'vue-render-inspector/dist/style.css'` to installation example
- **Impact:** Panel now displays correctly when users follow the Quick Start guide

### Example
```javascript
import { VueRenderInspector } from 'vue-render-inspector'
import 'vue-render-inspector/dist/style.css' // ← Required for panel styles
app.use(VueRenderInspector)
```

---

## [1.0.1] - 2025-10-31

### 🐛 Bug Fixes

#### Fixed Vite Optimization Error
- **Fixed:** Vite dependency pre-bundling error when installing package in Vue projects
- **Issue:** Package was publishing raw `.vue` source files, causing Vite to fail with "dependency might not be compatible" error
- **Solution:**
  - Removed `src/` directory from published package (only `dist/` is now published)
  - Updated Vite config to properly compile Vue components into the bundle
  - Added Vue plugin to build configuration
  - Removed `/\.vue$/` from external dependencies
- **Impact:** Package now works correctly when installed in any Vite-based Vue project
- **Bundle Changes:**
  - Added `dist/style.css` (6.95 KB, gzipped: 1.78 KB) - Compiled component styles
  - Vue components now properly compiled into JavaScript chunks
  - Total bundle size: ~210 KB (gzipped: ~55 KB)

### 📦 Package Changes
- Removed source files from published package (only compiled `dist/` included)
- Package size reduced (no raw source files)
- Improved compatibility with Vite-based projects

---

## [1.0.0] - 2025-10-31

### 🎉 Initial Release

First stable release of Vue Render Inspector - Advanced render profiler and debugger for Vue 3.5+ applications.

### ✨ Added

#### Core Features
- **Automatic Render Tracking** - Monitor all component renders without manual instrumentation
- **Unnecessary Render Detection** - Identify components that re-render without actual data changes
- **Performance Analysis** - Microsecond-precision timing with configurable thresholds
- **Reactivity Tracking** - Visualize Vue's reactivity system with renderTracked/renderTriggered hooks
- **Render Storm Detection** - Identify components caught in rapid re-render loops (>5 renders/second)
- **Component Recreation Detection** - Find components being destroyed and recreated unnecessarily
- **Cross-Tab Communication** - Visualize renders across multiple browser windows via BroadcastChannel API
- **Memory Safe Implementation** - WeakMap-based tracking prevents memory leaks

#### Pattern Detection System (11 Patterns)
1. **Deep Reactivity Misuse** - Detects large objects (>50 properties) with unnecessary deep reactivity
2. **Watcher Misuse** - Identifies watchers that should be computed properties (derived state pattern)
3. **Large List No Virtualization** - Flags lists >100 items without virtual scrolling
4. **Template Method Calls** - Finds method calls in templates that should be computed properties
5. **Array Mutations** - Detects direct array mutations that may break reactivity
6. **Missing v-memo** - Identifies expensive list items that would benefit from v-memo optimization
7. **Array Index as Key** - Warns about using array index as v-for :key
8. **Computed No Dependencies** - Finds computed properties that don't access reactive dependencies
9. **Deep Watchers** - Detects expensive deep watchers on large objects
10. **Event Listener Leaks** - Identifies missing cleanup in lifecycle hooks
11. **Inline Object Creation** - Finds inline objects/functions in props causing unnecessary child re-renders

#### Interactive Visualizer
- **Real-time Component Tree** - Interactive canvas-based visualization
- **Performance Heatmap** - Color-coded nodes (green <16ms, yellow 16-100ms, red >100ms)
- **Inspector Panel** - Detailed component analysis on click
  - Total renders & unnecessary renders with percentages
  - Performance metrics (avg/slowest/fastest render times)
  - Detected bottlenecks with severity scores
  - Render history with timestamps and reasons
  - Props/state diff tracking
  - Reactivity event correlation
  - User event correlation
  - Component context (parent chain, depth, children)
- **Viewport Culling** - Only renders visible nodes for performance
- **Level of Detail (LOD)** - Simplifies distant nodes
- **Quadtree Spatial Indexing** - O(log n) mouse hit detection
- **Notification System** - Real-time render notifications with auto-dismiss

#### Console API
- `__VUE_RENDER_INSPECTOR__.summary()` - Show render summary
- `__VUE_RENDER_INSPECTOR__.top(n)` - Show top N components with most unnecessary renders
- `__VUE_RENDER_INSPECTOR__.slow(n)` - Show N slowest components
- `__VUE_RENDER_INSPECTOR__.visualizer()` - Open interactive visualizer
- `__VUE_RENDER_INSPECTOR__.panel()` - Toggle inspector panel
- `__VUE_RENDER_INSPECTOR__.clear()` - Clear all data
- `__VUE_RENDER_INSPECTOR__.help()` - Show help

#### Developer Experience
- **Zero-config Installation** - Works out of the box with sensible defaults
- **Vue Plugin Integration** - Simple `app.use(VueRenderInspector)`
- **Flexible Configuration** - 33+ configurable options for advanced use cases
- **Auto-disable in Production** - Automatically disabled when `NODE_ENV === 'production'`
- **Zero Dependencies** - No external runtime dependencies

#### Configuration Options
- Core: `enabled`, `console`, `verbose`
- Filtering: `include`, `exclude` (string/regex patterns)
- Performance: `warnThreshold` (16ms), `errorThreshold` (100ms)
- Detection: `detectUnnecessary`, `strictMode`, `trackDependencies`
- Memory: `maxRecords` (1000), `maxHistorySize` (50), `memoryCleanupInterval` (30s)
- Storm: `stormWindow` (1000ms), `stormThreshold` (5 renders)
- Recreation: `recreationWindow` (100ms)
- Events: `trackEvents`, `eventContextTimeout` (500ms), `debugEvents`
- Reactivity: `trackReactivity`, `maxReactivityEvents` (100), `reactivitySamplingRate` (1.0)
- Console: `showTimestamp`, `showDuration`, `groupByComponent`, `colorize`
- UI: `showWelcome`

#### Security Features
- **XSS Prevention** - All user-controlled strings escaped in visualizer
- **Memory Safety** - WeakMaps allow garbage collection of unmounted components
- **No Sensitive Data** - BroadcastChannel only transmits render events
- **Production Safety** - Auto-disabled by default, manual override available

#### Documentation
- **README.md** - Comprehensive user guide with quick start, features, and examples
- **ARCHITECTURE.md** - Complete codebase structure and design patterns
- **OPTIONS_REFERENCE.md** - Detailed configuration reference with 33+ options
- **COMPREHENSIVE_ANALYSIS.md** - Technical deep dive and accuracy verification
- **UNDERSTANDING_UNNECESSARY_RENDERS.md** - Conceptual guide for developers
- **CONTRIBUTING.md** - Contribution guidelines and development setup
- **VERIFICATION_PROOF.md** - Accuracy verification against real-world tests

#### Testing
- **1030 Tests Passing** - Comprehensive test suite (100% pass rate)
- **99.7% Code Coverage** - Extensively tested for reliability
- **Unit Tests** - All pattern detectors individually tested
- **Integration Tests** - Real-world component scenarios
- **Visualizer Tests** - Canvas rendering, layout, spatial indexing
- **Edge Case Coverage** - Rapid mount/unmount, memory management

### 🏗️ Technical Details

#### Bundle Size
- ES Module entry: 0.87 KB (gzipped: 0.45 KB)
- Core library: 173 KB (gzipped: 42 KB)
- Visualizer (lazy-loaded): 70 KB (gzipped: 16 KB)
- UMD bundle: 198 KB (gzipped: 52 KB)

#### Browser Support
- Modern browsers with ES2015+ support
- Vue 3.5.0 or higher required
- BroadcastChannel API for cross-tab communication (optional)
- Canvas API for visualizer

#### Performance Impact
- **Development:** ~0.1-0.5ms overhead per render
- **Production:** 0ms (auto-disabled)
- **Memory:** ~50MB with default settings (1000 max records)

### 📚 Resources

- **GitHub Repository:** https://github.com/damianidczak/vue-render-inspector
- **NPM Package:** https://www.npmjs.com/package/vue-render-inspector
- **Issues:** https://github.com/damianidczak/vue-render-inspector/issues

### 🙏 Acknowledgments

- Built for Vue 3.5+ with love ❤️
- Inspired by [React why did you render](https://github.com/welldone-software/why-did-you-render)
- Zero dependencies for maximum performance and compatibility

---

## [Unreleased]

### Planned Features
- [ ] Performance regression detection
- [ ] Baseline comparison mode
- [ ] Enhanced AST analysis for watchers
- [ ] SSR-specific pattern detection
- [ ] VS Code extension for one-click fixes
- [ ] Chrome DevTools integration

---

**Legend:**
- 🎉 Major release
- ✨ New features
- 🐛 Bug fixes
- 🔒 Security fixes
- 📚 Documentation
- ⚡ Performance improvements
- 🔧 Configuration changes
- ⚠️ Deprecations
- 💥 Breaking changes
