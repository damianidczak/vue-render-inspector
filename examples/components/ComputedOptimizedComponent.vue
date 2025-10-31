<template>
  <div class="component computed-optimized">
    <h3>Computed Optimized Component</h3>
    <p>This component uses computed properties to prevent unnecessary recalculations.</p>
    <p>Items count: {{ itemCount }}</p>
    <p>Filtered items: {{ filteredItems.length }}</p>
    <p>Expensive calculation: {{ expensiveValue }}</p>
    <p>Render count: {{ renderCount }}</p>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watchEffect } from 'vue'

const ComputedOptimizedComponent = defineComponent({
  name: 'ComputedOptimizedComponent',
  props: {
    items: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const renderCount = ref(0)

    // Computed properties - these only recalculate when dependencies change
    const itemCount = computed(() => {
      console.log('🔄 Computing item count...')
      return props.items.length
    })

    const filteredItems = computed(() => {
      console.log('🔄 Filtering items...')
      return props.items.filter(item => item && item.length > 0)
    })

    const expensiveValue = computed(() => {
      console.log('🔄 Computing expensive value...')
      // Simulate expensive calculation
      let result = 0
      for (let i = 0; i < 100000; i++) {
        result += i
      }
      return result
    })

    // Track renders
    watchEffect(() => {
      const _count = itemCount.value
      const _filtered = filteredItems.value.length
      const _expensive = expensiveValue.value
      renderCount.value++
    })

    return {
      itemCount,
      filteredItems,
      expensiveValue,
      renderCount
    }
  }
})

// Export the component
export default ComputedOptimizedComponent
</script>

<style scoped>
.component {
  background: linear-gradient(135deg, #e8f5e8, #f1f8e9);
  padding: 15px;
  border-radius: 8px;
  margin: 10px 0;
  border: 2px solid #4caf50;
}

.component.computed-optimized {
  background: linear-gradient(135deg, #e3f2fd, #f3e9ff);
  border-color: #2196f3;
  box-shadow: 0 4px 8px rgba(33, 150, 243, 0.2);
}

.component h3 {
  margin: 0 0 10px 0;
  color: #0d47a1;
}

.component p {
  margin: 5px 0;
  color: #1565c0;
}
</style>
