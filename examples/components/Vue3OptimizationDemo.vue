<template>
  <div class="vue3-demo">
    <h2>🚀 Vue 3.5+ Optimization Patterns</h2>

    <!-- Example 1: Missing v-memo on expensive list -->
    <div class="example">
      <h3>1. Large List Without v-memo</h3>
      <p>❌ Bad: Re-renders all items even when only one changes</p>
      <ul>
        <li v-for="item in expensiveList" :key="item.id">
          {{ computeExpensiveValue(item) }}
        </li>
      </ul>
      <button @click="updateSingleItem">Update One Item</button>
    </div>

    <!-- Example 2: Good - Using v-memo -->
    <div class="example good">
      <h3>2. List With v-memo</h3>
      <p>✅ Good: Only re-renders changed items</p>
      <ul>
        <li v-for="item in expensiveList" :key="item.id" v-memo="[item.value, item.active]">
          {{ computeExpensiveValue(item) }}
        </li>
      </ul>
      <button @click="updateSingleItem">Update One Item</button>
    </div>

    <!-- Example 3: Missing markRaw for non-reactive data -->
    <div class="example">
      <h3>3. Chart Config Without markRaw</h3>
      <p>❌ Bad: Makes large config object reactive unnecessarily</p>
      <ChartComponent :config="chartConfig" />
      <button @click="updateChartConfig">Update Config</button>
    </div>

    <!-- Example 4: Good - Using markRaw -->
    <div class="example good">
      <h3>4. Chart Config With markRaw</h3>
      <p>✅ Good: Keeps config non-reactive for better performance</p>
      <ChartComponent :config="optimizedChartConfig" />
      <button @click="updateOptimizedChartConfig">Update Config</button>
    </div>

    <!-- Example 5: v-model without lazy -->
    <div class="example">
      <h3>5. Expensive Filter Without .lazy</h3>
      <p>❌ Bad: Filters on every keystroke</p>
      <input v-model="searchQuery" placeholder="Type to filter..." />
      <div>Filtering {{ largeDataset.length }} items...</div>
      <ul>
        <li v-for="item in filteredItems" :key="item.id">{{ item.name }}</li>
      </ul>
    </div>

    <!-- Example 6: Good - v-model.lazy -->
    <div class="example good">
      <h3>6. Expensive Filter With .lazy</h3>
      <p>✅ Good: Filters only on blur</p>
      <input v-model.lazy="lazySearchQuery" placeholder="Type and blur to filter..." />
      <div>Filtering {{ largeDataset.length }} items...</div>
      <ul>
        <li v-for="item in lazyFilteredItems" :key="item.id">{{ item.name }}</li>
      </ul>
    </div>

    <!-- Example 7: Deep reactive object -->
    <div class="example">
      <h3>7. Deep Reactive Object</h3>
      <p>❌ Bad: Deep reactivity for large nested structure</p>
      <NestedDataComponent :data="deepReactiveData" />
      <button @click="updateDeepData">Update Nested Value</button>
    </div>

    <!-- Example 8: Good - shallowReactive -->
    <div class="example good">
      <h3>8. Shallow Reactive Object</h3>
      <p>✅ Good: Only top-level reactivity</p>
      <NestedDataComponent :data="shallowReactiveData" />
      <button @click="updateShallowData">Update Nested Value</button>
    </div>

    <!-- Example 9: toRefs creating many reactive connections -->
    <div class="example">
      <h3>9. toRefs on Large Object</h3>
      <p>❌ Bad: Creates reactive ref for every property</p>
      <LargeFormComponent v-bind="formRefs" />
      <button @click="updateFormField">Update Field</button>
    </div>

    <!-- Example 10: Good - Selective reactivity -->
    <div class="example good">
      <h3>10. Selective Reactive Properties</h3>
      <p>✅ Good: Only reactive where needed</p>
      <LargeFormComponent :username="form.username" :email="form.email" :settings="formSettings" />
      <button @click="updateFormField">Update Field</button>
    </div>

    <div class="stats">
      <button @click="showOptimizationStats">Show Optimization Impact</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, markRaw, shallowReactive, toRefs, shallowRef } from 'vue'

// Mock child components
const ChartComponent = { template: '<div>Chart</div>' }
const NestedDataComponent = { template: '<div>Nested Data</div>' }
const LargeFormComponent = { template: '<div>Large Form</div>' }

// Example 1 & 2: v-memo optimization
const expensiveList = ref(
  Array.from({ length: 100 }, (_, i) => ({
    id: i,
    value: Math.random(),
    active: i % 2 === 0
  }))
)

function computeExpensiveValue(item) {
  // Simulate expensive computation
  let result = 0
  for (let i = 0; i < 1000; i++) {
    result += item.value * i
  }
  return `Item ${item.id}: ${result.toFixed(2)}`
}

function updateSingleItem() {
  const randomIndex = Math.floor(Math.random() * expensiveList.value.length)
  expensiveList.value[randomIndex].value = Math.random()
  console.log(`Updated item at index ${randomIndex}`)
}

// Example 3: Without markRaw (BAD)
const chartConfig = reactive({
  type: 'line',
  data: {
    labels: Array.from({ length: 1000 }, (_, i) => `Label ${i}`),
    datasets: Array.from({ length: 10 }, (_, i) => ({
      label: `Dataset ${i}`,
      data: Array.from({ length: 1000 }, () => Math.random() * 100)
    }))
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Large Chart' }
    }
  }
})

function updateChartConfig() {
  chartConfig.options.plugins.title.text = `Updated at ${new Date().toLocaleTimeString()}`
}

// Example 4: With markRaw (GOOD)
const optimizedChartConfig = ref(
  markRaw({
    type: 'line',
    data: {
      labels: Array.from({ length: 1000 }, (_, i) => `Label ${i}`),
      datasets: Array.from({ length: 10 }, (_, i) => ({
        label: `Dataset ${i}`,
        data: Array.from({ length: 1000 }, () => Math.random() * 100)
      }))
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Large Chart (Optimized)' }
      }
    }
  })
)

function updateOptimizedChartConfig() {
  // Need to replace the entire object since it's marked raw
  optimizedChartConfig.value = markRaw({
    ...optimizedChartConfig.value,
    options: {
      ...optimizedChartConfig.value.options,
      plugins: {
        ...optimizedChartConfig.value.options.plugins,
        title: {
          display: true,
          text: `Updated at ${new Date().toLocaleTimeString()}`
        }
      }
    }
  })
}

// Example 5 & 6: v-model.lazy
const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `Item ${i}`,
  category: ['A', 'B', 'C'][i % 3]
}))

const searchQuery = ref('')
const lazySearchQuery = ref('')

const filteredItems = computed(() => {
  console.log('Filtering items (immediate)...')
  return largeDataset
    .filter(item => item.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
    .slice(0, 20)
})

const lazyFilteredItems = computed(() => {
  console.log('Filtering items (lazy)...')
  return largeDataset
    .filter(item => item.name.toLowerCase().includes(lazySearchQuery.value.toLowerCase()))
    .slice(0, 20)
})

// Example 7: Deep reactive (BAD)
const deepReactiveData = reactive({
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            value: 0,
            items: Array.from({ length: 100 }, (_, i) => ({ id: i, data: Math.random() }))
          }
        }
      }
    }
  }
})

function updateDeepData() {
  deepReactiveData.level1.level2.level3.level4.level5.value++
  console.log('Updated deep reactive value')
}

// Example 8: Shallow reactive (GOOD)
const shallowReactiveData = shallowReactive({
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            value: 0,
            items: Array.from({ length: 100 }, (_, i) => ({ id: i, data: Math.random() }))
          }
        }
      }
    }
  }
})

function updateShallowData() {
  // Need to trigger reactivity at top level
  shallowReactiveData.level1 = {
    ...shallowReactiveData.level1,
    level2: {
      ...shallowReactiveData.level1.level2,
      level3: {
        ...shallowReactiveData.level1.level2.level3,
        level4: {
          ...shallowReactiveData.level1.level2.level3.level4,
          level5: {
            ...shallowReactiveData.level1.level2.level3.level4.level5,
            value: shallowReactiveData.level1.level2.level3.level4.level5.value + 1
          }
        }
      }
    }
  }
  console.log('Updated shallow reactive value')
}

// Example 9: toRefs (BAD for large objects)
const largeForm = reactive({
  username: '',
  email: '',
  ...Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`field${i}`, `value${i}`]))
})
const formRefs = toRefs(largeForm) // Creates 52 refs!

// Example 10: Selective reactivity (GOOD)
const form = reactive({
  username: '',
  email: ''
})
const formSettings = markRaw({
  ...Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`field${i}`, `value${i}`]))
})

function updateFormField() {
  const fieldNum = Math.floor(Math.random() * 50)
  if (formRefs[`field${fieldNum}`]) {
    formRefs[`field${fieldNum}`].value = `Updated ${Date.now()}`
  }
  console.log(`Updated field${fieldNum}`)
}

function showOptimizationStats() {
  console.log('=== Vue 3.5+ Optimization Impact ===')
  console.log('v-memo: Skips re-rendering unchanged list items')
  console.log('markRaw: Prevents large objects from becoming reactive')
  console.log('v-model.lazy: Updates only on blur instead of every input')
  console.log('shallowReactive: Only tracks top-level properties')
  console.log('Selective reactivity: Avoid toRefs on large objects')
  console.log('')
  if (window.__VUE_RENDER_INSPECTOR__) {
    window.__VUE_RENDER_INSPECTOR__.summary()
  }
}
</script>

<style scoped>
.vue3-demo {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.example {
  margin: 20px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
}

.example.good {
  border-left-color: #4caf50;
  background: #f1f8f1;
}

.example h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.example p {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 14px;
}

button {
  padding: 8px 16px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
}

button:hover {
  background: #35a372;
}

input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
  width: 200px;
}

ul {
  margin: 10px 0;
  padding-left: 20px;
  max-height: 200px;
  overflow-y: auto;
}

.stats {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
  text-align: center;
}
</style>
