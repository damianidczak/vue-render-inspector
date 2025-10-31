<template>
  <div class="child-component optimized">
    <h4>✅ Optimized Child</h4>
    <p>This component uses stable props</p>
    <p>Config: {{ config.theme }} / {{ config.size }}</p>
    <p>Items: {{ items.join(', ') }}</p>
    <p>Render count: {{ renderCount }}</p>
    <button @click="onClick">Stable Callback</button>
  </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue'

const props = defineProps({
  onClick: Function,
  config: Object,
  items: Array
})

const renderCount = ref(0)

// Initialize render inspector for this component
// Track renders
watchEffect(() => {
  const _c = props.onClick
  const _cfg = props.config
  const _i = props.items
  renderCount.value++
})
</script>

<style scoped>
.child-component {
  padding: 10px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
}

.optimized {
  background: rgba(76, 175, 80, 0.1);
}
</style>
