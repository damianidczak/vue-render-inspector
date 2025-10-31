<template>
  <div class="child-component">
    <h4>Computed Child</h4>
    <p>Timestamp: {{ new Date(timestamp).toLocaleTimeString() }}</p>
    <p>Random: {{ random.toFixed(4) }}</p>
    <p>Render count: {{ renderCount }}</p>
  </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue'

const props = defineProps({
  timestamp: Number,
  random: Number
})

const renderCount = ref(0)

// Initialize render inspector for this component
// Track renders
watchEffect(() => {
  const _t = props.timestamp
  const _r = props.random
  const _rc = props.renderCount
  renderCount.value++
})
</script>

<style scoped>
.child-component {
  padding: 10px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
}
</style>
