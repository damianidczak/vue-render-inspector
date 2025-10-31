<template>
  <div class="force-update-demo">
    <h3>Force Update vs Normal Update</h3>
    <p>Update count: {{ updateCount }}</p>
    <p>Force trigger: {{ forceTrigger }}</p>

    <div class="buttons">
      <button @click="forceUpdate" class="force-btn">Force Update (No State Change)</button>
      <button @click="normalUpdate" class="normal-btn">Normal Update (State Change)</button>
    </div>

    <div class="info">
      <p>
        <strong>Force Update:</strong>
        Re-renders without changing state (should be unnecessary)
      </p>
      <p>
        <strong>Normal Update:</strong>
        Changes state and re-renders (should be necessary)
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, getCurrentInstance } from 'vue'

const updateCount = ref(0)
const forceTrigger = ref(0)

// Get component instance for $forceUpdate
const instance = getCurrentInstance()

function forceUpdate() {
  console.log('[ForceUpdateDemo] Force update - no state change')
  // Use Vue's built-in $forceUpdate
  instance.proxy.$forceUpdate()
}

function normalUpdate() {
  const oldValue = updateCount.value
  updateCount.value++
  console.log(
    `[ForceUpdateDemo] Normal update - state changed from ${oldValue} to ${updateCount.value}`
  )
}
</script>

<style scoped>
.force-update-demo {
  padding: 20px;
  background: #fff3cd;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
  margin: 10px 0;
}

h3 {
  margin-top: 0;
  color: #e65100;
}

.buttons {
  display: flex;
  gap: 10px;
  margin: 15px 0;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.force-btn {
  background: #ff9800;
  color: white;
}

.force-btn:hover {
  background: #f57c00;
}

.normal-btn {
  background: #4caf50;
  color: white;
}

.normal-btn:hover {
  background: #388e3c;
}

.info {
  margin-top: 15px;
  font-size: 12px;
  color: #666;
}

.info p {
  margin: 5px 0;
}
</style>
