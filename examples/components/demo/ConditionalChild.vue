<template>
  <div class="conditional-child">
    <h5>Conditional Child (ID: {{ id }})</h5>
    <p>Mounted at: {{ mountedAt }}</p>
    <p>This component is created/destroyed with v-if</p>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  id: Number
})

const mountedAt = ref('')

onMounted(() => {
  mountedAt.value = new Date().toLocaleTimeString()
  console.log(`[ConditionalChild ${props.id}] Mounted`)
})

onUnmounted(() => {
  console.log(`[ConditionalChild ${props.id}] Unmounted`)
})
</script>

<style scoped>
.conditional-child {
  padding: 10px;
  background: #e3f2fd;
  border-radius: 4px;
  border-left: 4px solid #2196f3;
}
</style>
