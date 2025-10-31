<template>
  <div class="lifecycle-demo">
    <h3>Component Lifecycle Tracking</h3>

    <!-- Conditional Rendering -->
    <div class="section">
      <h4>Conditional Rendering (v-if)</h4>
      <button @click="showConditional = !showConditional">
        {{ showConditional ? 'Hide' : 'Show' }} Component
      </button>
      <ConditionalChild v-if="showConditional" :id="conditionalId" />
    </div>

    <!-- List Rendering -->
    <div class="section">
      <h4>List Rendering</h4>
      <button @click="addItem">Add Item</button>
      <button @click="removeItem">Remove Item</button>
      <button @click="shuffleItems">Shuffle Items</button>
      <div class="list">
        <ListItem v-for="item in items" :key="item.id" :item="item" />
      </div>
    </div>

    <!-- Dynamic Component -->
    <div class="section">
      <h4>Dynamic Component</h4>
      <button @click="switchComponent">Switch Component Type</button>
      <component :is="currentComponent" :data="dynamicData" />
    </div>

    <!-- Keep Alive -->
    <div class="section">
      <h4>Keep-Alive Component</h4>
      <button @click="toggleKeepAlive">Toggle Keep-Alive</button>
      <keep-alive>
        <KeepAliveChild v-if="showKeepAlive" :timestamp="Date.now()" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ConditionalChild from './demo/ConditionalChild.vue'
import ListItem from './demo/ListItem.vue'
import KeepAliveChild from './demo/KeepAliveChild.vue'
import DynamicComponentA from './demo/DynamicComponentA.vue'
import DynamicComponentB from './demo/DynamicComponentB.vue'

// Conditional rendering
const showConditional = ref(false)
const conditionalId = ref(1)

// List rendering
const items = ref([
  { id: 1, name: 'Item 1', value: 10 },
  { id: 2, name: 'Item 2', value: 20 },
  { id: 3, name: 'Item 3', value: 30 }
])

// Dynamic component
const componentTypes = [DynamicComponentA, DynamicComponentB]
const currentComponentIndex = ref(0)
const currentComponent = computed(() => componentTypes[currentComponentIndex.value])
const dynamicData = { message: 'Dynamic component data' }

// Keep alive
const showKeepAlive = ref(true)

// Methods
function addItem() {
  const newId = Math.max(...items.value.map(i => i.id)) + 1
  items.value.push({
    id: newId,
    name: `Item ${newId}`,
    value: newId * 10
  })
}

function removeItem() {
  if (items.value.length > 0) {
    items.value.pop()
  }
}

function shuffleItems() {
  items.value = [...items.value].sort(() => Math.random() - 0.5)
}

function switchComponent() {
  currentComponentIndex.value = (currentComponentIndex.value + 1) % componentTypes.length
}

function toggleKeepAlive() {
  showKeepAlive.value = !showKeepAlive.value
}
</script>

<style scoped>
.lifecycle-demo {
  padding: 20px;
  background: #f0f0f0;
  border-radius: 8px;
}

.section {
  margin: 20px 0;
  padding: 15px;
  background: white;
  border-radius: 4px;
}

.section h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

button {
  margin-right: 10px;
  margin-bottom: 10px;
}
</style>
