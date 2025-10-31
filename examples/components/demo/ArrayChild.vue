<template>
  <div class="child-component">
    <h4>Array Child</h4>
    <p>Items: {{ items.join(', ') }}</p>
    <p>Filtered count: {{ filtered.length }}</p>
    <p>Render count: {{ renderCount }}</p>
  </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue'

const props = defineProps({
  items: Array,
  filtered: Array
})

const renderCount = ref(0)

// Initialize render inspector for this component
// Track renders
watchEffect(() => {
  const _i = props.items
  const _f = props.filtered
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
