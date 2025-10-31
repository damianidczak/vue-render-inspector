<template>
  <div class="child-component">
    <h4>ObjectReference Child</h4>
    <p>Config: {{ config.theme }} / {{ config.size }}</p>
    <p>User: {{ user.name }} ({{ user.email }})</p>
    <p>Render count: {{ renderCount }}</p>
    <p>Objects changed: {{ objectsChanged }}</p>
  </div>
</template>

<script setup>
import { ref, watchEffect, computed } from 'vue'

// Initialize render inspector for this component
const props = defineProps({
  config: Object,
  user: Object
})

const renderCount = ref(0)
const prevConfig = ref(null)
const prevUser = ref(null)

const objectsChanged = computed(() => {
  const changes = []
  if (prevConfig.value !== props.config) changes.push('config')
  if (prevUser.value !== props.user) changes.push('user')
  return changes.join(', ') || 'none'
})

watchEffect(() => {
  // Force reactivity by accessing props
  const _c = props.config
  const _u = props.user

  // Track reference changes
  prevConfig.value = _c
  prevUser.value = _u

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
