<template>
  <div class="child-component">
    <h4>InlineFunction Child</h4>
    <p>onClick prop type: {{ onClickType }}</p>
    <p>Function ID: {{ functionId }}</p>
    <p>Data: {{ data?.message }}</p>
    <p>Render count: {{ renderCount }}</p>
    <button @click="handleClick">Click me</button>
  </div>
</template>

<script setup>
import { computed, ref, watchEffect } from 'vue'

// Initialize render inspector for this component
const props = defineProps({
  onClick: Function,
  data: Object
})

const renderCount = ref(0)

// Force reactivity to function prop changes
watchEffect(() => {
  // Access the function to create dependency
  const _fn = props.onClick
  const _d = props.data
  renderCount.value++
})

const onClickType = computed(() => (props.onClick ? 'Function' : 'undefined'))

// Create a "fingerprint" of the function to show it's changing
const functionId = computed(() => {
  if (!props.onClick) return 'none'
  return `${props.onClick.toString().substring(0, 20)}...`
})

function handleClick() {
  if (props.onClick) {
    props.onClick()
  }
}
</script>

<style scoped>
.child-component {
  padding: 10px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
}
</style>
