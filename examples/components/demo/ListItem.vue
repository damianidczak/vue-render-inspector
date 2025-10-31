<template>
  <div class="list-item">
    <span>{{ item.name }}</span>
    <span>Value: {{ item.value }}</span>
    <span class="instance-id">Instance: {{ instanceId }}</span>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, onUpdated } from 'vue'

const props = defineProps({
  item: Object
})

const instanceId = Math.random().toString(36).substring(7)

onMounted(() => {
  console.log(`[ListItem ${props.item.id}] Mounted - Instance: ${instanceId}`)
})

onUpdated(() => {
  console.log(`[ListItem ${props.item.id}] Updated - Instance: ${instanceId}`)
})

onUnmounted(() => {
  console.log(`[ListItem ${props.item.id}] Unmounted - Instance: ${instanceId}`)
})
</script>

<style scoped>
.list-item {
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.instance-id {
  font-size: 12px;
  color: #666;
}
</style>
