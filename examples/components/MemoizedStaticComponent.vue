<template>
  <div class="component memoized-static">
    <h3>Memoized Static Component</h3>
    <p>This component only re-renders when its internal state changes.</p>
    <p>Internal counter: {{ internalCount }}</p>
    <button @click="incrementInternal">Increment Internal State</button>
    <p>Render count: {{ renderCount }}</p>
  </div>
</template>

<script>
import { defineComponent, ref, watchEffect } from 'vue'

export default defineComponent({
  name: 'MemoizedStaticComponent',
  setup() {
    const internalCount = ref(0)
    const renderCount = ref(0)

    // Initialize render inspector for this component
    // Track renders - this component should only render when its internal state changes
    watchEffect(() => {
      const count = internalCount.value
      renderCount.value++
      console.log(`MemoizedStaticComponent rendered with internal count: ${count}`)
    })

    function incrementInternal() {
      internalCount.value++
    }

    return { internalCount, renderCount, incrementInternal }
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

.component.memoized-static {
  background: linear-gradient(135deg, #f3e5f5, #f8e8f8);
  border-color: #9c27b0;
  box-shadow: 0 4px 8px rgba(156, 39, 176, 0.2);
}

.component h3 {
  margin: 0 0 10px 0;
  color: #7b1fa2;
}

.component p {
  margin: 5px 0;
  color: #6a1b9a;
}

button {
  padding: 6px 12px;
  background: #9c27b0;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin: 5px;
}

button:hover {
  background: #8e24aa;
}
</style>
