<template>
  <div class="demo-container">
    <h2>🔍 Unnecessary Render Detection Examples</h2>

    <!-- Example 1: Inline Function Props -->
    <div class="example">
      <h3>1. Inline Function Creation</h3>
      <p>Creates new function reference on every parent render</p>
      <InlineFunctionChild
        :onClick="() => console.log('Inline function', renderCount)"
        :data="stableData"
      />
      <button @click="forceParentRender">Force Parent Render</button>
    </div>

    <!-- Example 2: New Object References -->
    <div class="example">
      <h3>2. New Object References</h3>
      <p>Creates new object on every render</p>
      <ObjectReferenceChild
        :config="{ theme: 'dark', size: 'large', renderCount }"
        :user="createUser()"
      />
      <button @click="forceParentRender">Force Parent Render</button>
    </div>

    <!-- Example 3: Array Recreation -->
    <div class="example">
      <h3>3. Array Recreation</h3>
      <p>Creates new array with same content</p>
      <ArrayChild
        :items="['Apple', 'Banana', 'Orange']"
        :filtered="items.filter(item => item.active)"
        :renderCount="renderCount"
      />
      <button @click="forceParentRender">Force Parent Render</button>
    </div>

    <!-- Example 4: Computed Without Dependencies -->
    <div class="example">
      <h3>4. Non-Reactive Computed</h3>
      <p>Computed property that doesn't actually depend on reactive data</p>
      <ComputedChild
        :timestamp="currentTimestamp"
        :random="randomValue"
        :renderCount="renderCount"
      />
      <button @click="forceParentRender">Force Parent Render</button>
    </div>

    <!-- Example 5: Component Recreation with :key -->
    <div class="example">
      <h3>5. Component Recreation</h3>
      <p>Component destroyed and recreated due to key change</p>
      <RecreationChild :key="componentKey" :data="stableData" />
      <button @click="recreateComponent">Recreate Component</button>
    </div>

    <!-- Example 6: Stable References (Good Example) -->
    <div class="example good">
      <h3>✅ 6. Stable References (Optimized)</h3>
      <p>Uses stable references - should NOT re-render</p>
      <OptimizedChild :onClick="stableCallback" :config="stableConfig" :items="stableItems" />
      <button @click="forceParentRender">Force Parent Render</button>
    </div>

    <div class="stats">
      <p>Parent render count: {{ renderCount }}</p>
      <button @click="showStats">Show Render Stats</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import InlineFunctionChild from './demo/InlineFunctionChild.vue'
import ObjectReferenceChild from './demo/ObjectReferenceChild.vue'
import ArrayChild from './demo/ArrayChild.vue'
import ComputedChild from './demo/ComputedChild.vue'
import RecreationChild from './demo/RecreationChild.vue'
import OptimizedChild from './demo/OptimizedChild.vue'

// Reactive state
const renderCount = ref(0)
const componentKey = ref(0)
const items = ref([
  { id: 1, name: 'Item 1', active: true },
  { id: 2, name: 'Item 2', active: false },
  { id: 3, name: 'Item 3', active: true }
])

// Stable references (good practice)
const stableData = { message: 'This is stable data' }
const stableCallback = () => console.log('Stable callback')
const stableConfig = { theme: 'dark', size: 'large' }
const stableItems = ['Apple', 'Banana', 'Orange']

// Bad practices - creates new values on every access
const currentTimestamp = computed(() => Date.now())
const randomValue = computed(() => Math.random())

// Functions that create new objects
function createUser() {
  return {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com'
  }
}

// Actions
function forceParentRender() {
  renderCount.value++
  console.log(`Parent render #${renderCount.value}`)
}

function recreateComponent() {
  componentKey.value++
  console.log(`Component key changed to ${componentKey.value}`)
}

function showStats() {
  if (window.__VUE_RENDER_INSPECTOR__) {
    window.__VUE_RENDER_INSPECTOR__.summary()
  }
}
</script>

<style scoped>
.demo-container {
  padding: 20px;
  max-width: 1200px;
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

.stats {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
}
</style>
