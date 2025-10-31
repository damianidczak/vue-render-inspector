<template>
  <div class="keep-alive-child">
    <h5>Keep-Alive Child</h5>
    <p>Created at: {{ createdAt }}</p>
    <p>Activated count: {{ activatedCount }}</p>
    <p>Current timestamp prop: {{ timestamp }}</p>
    <p>Internal counter: {{ counter }}</p>
    <button @click="counter++">Increment</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'

defineProps({
  timestamp: Number
})

const createdAt = new Date().toLocaleTimeString()
const activatedCount = ref(0)
const counter = ref(0)

onMounted(() => {
  console.log('[KeepAliveChild] Mounted')
})

onUnmounted(() => {
  console.log('[KeepAliveChild] Unmounted')
})

onActivated(() => {
  activatedCount.value++
  console.log(`[KeepAliveChild] Activated (count: ${activatedCount.value})`)
})

onDeactivated(() => {
  console.log('[KeepAliveChild] Deactivated')
})
</script>

<style scoped>
.keep-alive-child {
  padding: 10px;
  background: #f3e5f5;
  border-radius: 4px;
  border-left: 4px solid #9c27b0;
}
</style>
