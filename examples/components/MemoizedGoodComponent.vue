<template>
  <div class="component memoized">
    <h3>Memoized Good Component</h3>
    <p>Count: {{ count }}</p>
    <p>This component only re-renders when count actually changes.</p>
    <p>Render count: {{ renderCount }}</p>
  </div>
</template>

<script>
import { defineComponent, ref, watchEffect } from 'vue'

export default defineComponent({
  name: 'MemoizedGoodComponent',
  props: {
    count: Number
  },
  setup(props) {
    const renderCount = ref(0)

    // Initialize render inspector for this component
    // Track renders - this component uses computed-like behavior
    // In a real memoized component, this would only run when count changes
    watchEffect(() => {
      const _c = props.count
      renderCount.value++
      console.log(`MemoizedGoodComponent rendered with count: ${_c}`)
    })

    return { renderCount }
  }
})
</script>

<style scoped>
.component {
  background: linear-gradient(135deg, #e8f5e8, #f1f8e9);
  padding: 15px;
  border-radius: 8px;
  margin: 10px 0;
  border: 2px solid #4caf50;
}

.component.memoized {
  background: linear-gradient(135deg, #fff3e0, #fff8e1);
  border-color: #ff9800;
  box-shadow: 0 4px 8px rgba(255, 152, 0, 0.2);
}

.component h3 {
  margin: 0 0 10px 0;
  color: #e65100;
}

.component p {
  margin: 5px 0;
  color: #bf360c;
}
</style>
