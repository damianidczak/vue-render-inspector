<template>
  <div class="child-component">
    <h4>Recreation Child</h4>
    <p>Component Instance ID: {{ instanceId }}</p>
    <p>Data: {{ data.message }}</p>
    <p>Mounted at: {{ mountTime }}</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

const props = defineProps({
  data: Object
})

// Initialize render inspector for this component
const instanceId = Math.random().toString(36).substring(7)
const mountTime = ref('')

onMounted(() => {
  mountTime.value = new Date().toLocaleTimeString()
})
</script>

<style scoped>
.child-component {
  padding: 10px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
}
</style>
