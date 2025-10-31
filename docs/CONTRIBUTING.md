# Contributing to Vue Render Inspector

Thank you for your interest in contributing to Vue Render Inspector! This guide will help you get started.

---

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Adding New Features](#adding-new-features)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v18+ recommended
- **npm:** v9+
- **Git:** Latest version
- **Code Editor:** VS Code recommended

### Fork & Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vue-render-inspector.git
   cd vue-render-inspector
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/damianidczak/vue-render-inspector.git
   ```

---

## 💻 Development Setup

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/unit/core/profiler.test.js

# Run with coverage
npm test -- --coverage
```

### Run Examples

```bash
# Start example app (if available)
npm run dev
```

### Build

```bash
# Build the library
npm run build
```

---

## 📁 Project Structure

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for detailed codebase structure.

**Quick Overview:**
```
vue-render-inspector/
├── src/                    # Source code
│   ├── core/              # Core profiling engine
│   ├── patterns/          # Pattern detection (11 patterns)
│   ├── visualizer/        # Interactive UI
│   └── plugin.js          # Vue plugin
├── tests/                  # 777 tests
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── visualizer/        # UI tests
├── docs/                   # Documentation
└── examples/              # Example components
```

---

## 🛠️ Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/bug-description
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `test/` - Test additions/updates
- `refactor/` - Code refactoring

### 2. Make Your Changes

- Write tests for new functionality
- Update documentation if needed
- Keep commits focused and atomic

### 3. Test Your Changes

```bash
# Ensure all tests pass
npm test

# Check test coverage
npm test -- --coverage

# Lint code (if linter is configured)
npm run lint
```

---

## 🧪 Testing

### Test Guidelines

**All changes MUST include tests.** We maintain 99.7%+ test coverage.

#### Unit Tests

Test individual functions/classes in isolation.

**Location:** `tests/unit/`

**Example:**
```javascript
import { describe, it, expect } from 'vitest'
import { myFunction } from '../../src/utils/myFunction.js'

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input')
    expect(result).toBe('expected output')
  })

  it('should handle edge case', () => {
    const result = myFunction(null)
    expect(result).toBe(null)
  })
})
```

#### Integration Tests

Test with real Vue components.

**Location:** `tests/integration/`

**Example:**
```javascript
import { test, expect } from 'vitest'
import { defineComponent, ref, h } from 'vue'
import { mountWithInspector } from '../helpers/setup.js'

test('should detect unnecessary renders', async () => {
  const Component = defineComponent({
    name: 'TestComponent',
    setup() {
      const count = ref(0)
      return () => h('div', `Count: ${count.value}`)
    }
  })

  const { wrapper, inspector } = await mountWithInspector(Component)

  // Trigger re-render without changing state
  wrapper.vm.$.proxy.$forceUpdate()

  await new Promise(resolve => setTimeout(resolve, 100))

  const stats = inspector.getAllStats()
  const componentStats = stats.find(s => s.componentName === 'TestComponent')

  expect(componentStats.unnecessaryRenders).toBeGreaterThan(0)

  wrapper.unmount()
})
```

#### Visualizer Tests

Test UI rendering and interactions.

**Location:** `tests/visualizer/`

**Test Structure:**
- Canvas rendering
- Event handling
- Layout calculations
- Memory management

### Running Tests

```bash
# All tests
npm test

# Watch mode (re-run on file changes)
npm test -- --watch

# Specific file
npm test -- tests/unit/core/detector.test.js

# Pattern matching
npm test -- pattern

# Coverage report
npm test -- --coverage
```

### Test Coverage Requirements

- **Minimum:** 90% overall coverage
- **New code:** 90% coverage required
- **Pattern detectors:** 98% coverage (critical functionality)

---

## 📐 Code Style

### General Principles

1. **Readability over cleverness**
2. **Consistent naming conventions**
3. **Clear comments for complex logic**
4. **Avoid premature optimization**

### Naming Conventions

```javascript
// ✅ Good
const componentName = 'MyComponent'  // camelCase for variables
function calculateRenderTime() {}    // camelCase for functions
class ComponentProfiler {}           // PascalCase for classes
const MAX_RECORDS = 1000            // UPPER_CASE for constants

// ❌ Bad
const component_name = 'MyComponent'  // Don't use snake_case
function CalculateRenderTime() {}     // Don't use PascalCase for functions
```

### File Organization

```javascript
// Order:
// 1. Imports
import { ref } from 'vue'
import { myUtil } from './utils.js'

// 2. Constants
const MAX_SIZE = 100

// 3. Helper functions (if used internally)
function helper() {}

// 4. Main export
export class MyClass {
  constructor() {}
  publicMethod() {}
  _privateMethod() {}  // Prefix with underscore
}

// 5. Default export (if applicable)
export default MyClass
```

### Comments

```javascript
// ✅ Good: Explain "why", not "what"
// We use WeakMap to allow garbage collection of unmounted components
const components = new WeakMap()

// ✅ Good: JSDoc for public APIs
/**
 * Detects unnecessary renders in a component
 * @param {Object} instance - Vue component instance
 * @param {Object} snapshot - Previous render snapshot
 * @returns {boolean} True if render was unnecessary
 */
export function isUnnecessary(instance, snapshot) {
  // ...
}

// ❌ Bad: Obvious comment
// Increment count
count++
```

### Code Formatting

- **Indentation:** 2 spaces (no tabs)
- **Line length:** Max 100 characters (soft limit)
- **Semicolons:** Use them
- **Quotes:** Single quotes for strings, except when avoiding escapes
- **Trailing commas:** Yes (for multi-line)

```javascript
// ✅ Good
const config = {
  enabled: true,
  maxRecords: 1000,
  options: {
    verbose: false,
    colorize: true,
  },
}

// ❌ Bad
const config = {
  enabled: true,
  maxRecords: 1000,
  options: {
    verbose: false,
    colorize: true
  }  // Missing trailing comma
}
```

---

## 📤 Submitting Changes

### Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring
- `perf:` Performance improvement
- `chore:` Maintenance tasks

**Examples:**
```
feat(patterns): add template-slots-optimization pattern

Detects when v-slot is used inefficiently, causing unnecessary re-renders.
Provides suggestions to use scoped slots or v-memo.

Closes #123
```

```
fix(visualizer): correct quadtree bounds calculation

Quadtree was using incorrect bounds when nodes had negative coordinates,
causing hit detection to fail in certain layouts.
```

```
docs(architecture): add section on pattern detection flow
```

### Pull Request Process

1. **Update your branch:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push to your fork:**
   ```bash
   git push origin feature/my-new-feature
   ```

3. **Create Pull Request:**
   - Go to GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template:
     - **What:** What does this PR do?
     - **Why:** Why is this change needed?
     - **How:** How was it implemented?
     - **Testing:** How was it tested?
     - **Screenshots:** If UI changes

4. **PR Checklist:**
   - [ ] Tests pass (`npm test`)
   - [ ] Test coverage maintained (>95%)
   - [ ] Documentation updated (if needed)
   - [ ] No console errors or warnings
   - [ ] Commits follow conventional format
   - [ ] Code follows style guide
   - [ ] Self-review completed

5. **Code Review:**
   - Respond to feedback promptly
   - Make requested changes
   - Push updates to the same branch
   - Re-request review when ready

6. **Merge:**
   - Maintainer will merge when approved
   - Your contribution will be in the next release!

---

## ✨ Adding New Features

### Adding a New Pattern Detector

**Step-by-step guide:**

1. **Create pattern file:**
   ```bash
   touch src/patterns/core/my-pattern.js
   ```

2. **Implement detection logic:**
   ```javascript
   // src/patterns/core/my-pattern.js
   import { createPatternResult } from '../helpers/detection-utils.js'

   export function detect(instance, snapshot, renderTime) {
     // 1. Analyze component
     const hasPattern = analyzeComponent(instance)

     if (!hasPattern) {
       return createPatternResult({ detected: false })
     }

     // 2. Return result
     return createPatternResult({
       detected: true,
       severity: 'high', // 'high' | 'medium' | 'low'
       reason: 'Clear explanation of the issue',
       suggestion: 'How to fix it',
       detectionMethod: 'template-analysis', // or 'heuristic' | 'performance'
       // Add custom metrics
       myMetrics: {
         count: 5,
         details: '...'
       },
       codeGeneration: {
         badCode: '// Example of bad code',
         goodCode: '// Example of good code'
       }
     })
   }

   function analyzeComponent(instance) {
     // Your analysis logic
     return true
   }
   ```

3. **Register in index:**
   ```javascript
   // src/patterns/index.js
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

4. **Write tests:**
   ```bash
   touch tests/unit/core/my-pattern.test.js
   ```

   ```javascript
   import { describe, it, expect } from 'vitest'
   import { detect } from '../../../src/patterns/core/my-pattern.js'
   import { defineComponent, ref, h } from 'vue'

   describe('MyPattern Detection', () => {
     it('should detect the pattern', () => {
       const instance = createMockInstance()
       const snapshot = {}
       const renderTime = 10

       const result = detect(instance, snapshot, renderTime)

       expect(result.detected).toBe(true)
       expect(result.severity).toBe('high')
     })

     it('should not detect when pattern absent', () => {
       const instance = createGoodInstance()
       const result = detect(instance, {}, 10)

       expect(result.detected).toBe(false)
     })
   })
   ```

5. **Update documentation:**
   - Add to README.md patterns list
   - Add to COMPREHENSIVE_ANALYSIS.md
   - Include code examples

6. **Submit PR** following the process above

### Adding a New Configuration Option

1. **Add to ComponentProfiler:**
   ```javascript
   // src/core/profiler.js
   constructor(options = {}) {
     this.options = {
       // ... existing options
       myNewOption: options.myNewOption || 'default-value',
     }
   }
   ```

2. **Use the option:**
   ```javascript
   if (this.options.myNewOption) {
     // Do something
   }
   ```

3. **Add test:**
   ```javascript
   // tests/integration/all-options.test.js
   test('myNewOption works', async () => {
     const { inspector } = await mountWithInspector(
       Component,
       {},
       { myNewOption: 'custom-value' }
     )

     expect(inspector.profiler.options.myNewOption).toBe('custom-value')
   })
   ```

4. **Document in OPTIONS_REFERENCE.md:**
   ```markdown
   ### `myNewOption`
   - **Type:** `String`
   - **Default:** `'default-value'`
   - **Description:** What this option does
   - **Example:**
   ```javascript
   app.use(VueRenderInspector, {
     myNewOption: 'custom-value'
   })
   ```
   ```

### Adding Visualizer Features

See **[ARCHITECTURE.md](./ARCHITECTURE.md#adding-a-new-visualizer-feature)** for detailed guide.

---

## 🐛 Reporting Bugs

### Before Submitting

1. **Search existing issues** - Your bug might already be reported
2. **Verify it's a bug** - Not expected behavior
3. **Try latest version** - Bug might be fixed

### Bug Report Template

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Install vue-render-inspector
2. Create component with...
3. Click button...
4. See error

**Expected Behavior**
What you expected to happen

**Actual Behavior**
What actually happened

**Environment**
- Vue version: 3.5.0
- Inspector version: 1.0.0
- Browser: Chrome 120
- OS: macOS 14

**Additional Context**
Screenshots, code samples, error messages
```

---

## 💡 Requesting Features

### Feature Request Template

```markdown
**Feature Description**
Clear description of the feature

**Use Case**
Why is this needed? What problem does it solve?

**Proposed Solution**
How could this be implemented?

**Alternatives Considered**
Other approaches you've thought about

**Additional Context**
Examples, mockups, related issues
```

---

## 📚 Resources

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Codebase structure
- **[OPTIONS_REFERENCE.md](./OPTIONS_REFERENCE.md)** - Configuration options
- **[COMPREHENSIVE_ANALYSIS.md](./COMPREHENSIVE_ANALYSIS.md)** - Technical deep dive
- **[UNDERSTANDING_UNNECESSARY_RENDERS.md](./UNDERSTANDING_UNNECESSARY_RENDERS.md)** - Core concepts

---

## 🏆 Recognition

Contributors will be recognized in:
- GitHub contributors page
- CHANGELOG.md (for significant contributions)
- README.md acknowledgments (for major features)

---

## ❓ Questions?

- **Documentation:** Check docs/ folder
- **Issues:** Open a GitHub issue
- **Discussions:** Use GitHub Discussions

---

**Thank you for contributing!** 🎉

Every contribution, no matter how small, makes Vue Render Inspector better for the entire Vue.js community.
