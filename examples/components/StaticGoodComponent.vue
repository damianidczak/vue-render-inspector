<template>
  <div class="static-component">
    <h4>Static Good Component</h4>
    <p>This component has no props and uses only internal state</p>
    <p>Internal counter: {{ internalCount }}</p>
    <button @click="incrementInternal">Increment Internal State</button>
    <p>Render count: {{ renderCount }}</p>
  </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue'

const internalCount = ref(0)
const renderCount = ref(0)

// Initialize render inspector for this component
// Track renders - this component should only render when its internal state changes
watchEffect(() => {
  const count = internalCount.value
  renderCount.value++
})

function incrementInternal() {
  internalCount.value++
}
</script>

<style scoped>
.static-component {
  padding: 15px;
  background: linear-gradient(135deg, #e8f5e8, #f1f8e9);
  border-radius: 8px;
  border: 2px solid #4caf50;
  margin: 10px 0;
}

.static-component h4 {
  margin: 0 0 10px 0;
  color: #2e7d32;
}

.static-component p {
  margin: 5px 0;
  color: #388e3c;
}

button {
  padding: 6px 12px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin: 5px;
}

button:hover {
  background: #45a049;
}
</style>
