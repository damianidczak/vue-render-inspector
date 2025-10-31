<template>
  <div class="enhanced-demo">
    <h3>Enhanced Demo - Event Triggers & Reactivity</h3>

    <div class="controls">
      <!-- Click trigger -->
      <button @click="handleClick" class="btn">Click me ({{ clickCount }})</button>

      <!-- Input trigger -->
      <input
        v-model="inputValue"
        @input="handleInput"
        placeholder="Type to trigger render"
        class="input"
      />

      <!-- Hover trigger -->
      <div @mouseover="handleHover" class="hover-area">Hover over me ({{ hoverCount }})</div>

      <!-- Unnecessary render trigger -->
      <button @click="triggerUnnecessary" class="btn secondary">Trigger Unnecessary Render</button>
    </div>

    <div class="display">
      <p>Input: {{ inputValue }}</p>
      <p>Computed value: {{ computedValue }}</p>
      <p>Render count: {{ renderCount }}</p>
    </div>

    <div class="info">
      <p><strong>Instructions:</strong></p>
      <ul>
        <li>Click buttons to see event-triggered renders</li>
        <li>Type in input to see input-triggered renders</li>
        <li>Hover over the area to see hover-triggered renders</li>
        <li>Check console for enhanced reporting with event triggers and reactivity info</li>
      </ul>
    </div>
  </div>
</template>

<script>
import {
  defineComponent,
  ref,
  computed,
  watchEffect,
  onRenderTracked,
  onRenderTriggered
} from 'vue'

export default defineComponent({
  name: 'EnhancedDemo',
  setup() {
    // Add reactivity tracking hooks for demonstration
    onRenderTracked(event => {
      console.log('[DEMO] onRenderTracked:', event)
    })

    onRenderTriggered(event => {
      console.log('[DEMO] onRenderTriggered:', event)
    })
    const clickCount = ref(0)
    const inputValue = ref('')
    const hoverCount = ref(0)
    const renderCount = ref(0)
    const unnecessaryTrigger = ref(0)

    // Computed property that depends on input
    const computedValue = computed(() => inputValue.value.toUpperCase())

    // Event handlers
    function handleClick() {
      clickCount.value++
    }

    function handleInput() {
      // Additional logic on input
      renderCount.value++
    }

    function handleHover() {
      hoverCount.value++
    }

    function triggerUnnecessary() {
      // This creates a new reference but same content
      unnecessaryTrigger.value++
    }

    // Watch effect to track renders
    watchEffect(() => {
      // Access reactive dependencies
      const _click = clickCount.value
      const _input = inputValue.value
      const _hover = hoverCount.value
      const _computed = computedValue.value
      const _unnecessary = unnecessaryTrigger.value

      // This will cause unnecessary renders when triggerUnnecessary is called
      renderCount.value++
    })

    return {
      clickCount,
      inputValue,
      hoverCount,
      renderCount,
      computedValue,
      handleClick,
      handleInput,
      handleHover,
      triggerUnnecessary
    }
  }
})
</script>

<style scoped>
.enhanced-demo {
  padding: 20px;
  border: 2px solid #42b883;
  border-radius: 8px;
  margin: 10px 0;
  background: #f9f9f9;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.btn {
  padding: 8px 16px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn.secondary {
  background: #f87171;
}

.btn:hover {
  opacity: 0.9;
}

.input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.hover-area {
  padding: 20px;
  background: #e0f2fe;
  border: 1px solid #42b883;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.hover-area:hover {
  background: #bae6fd;
}

.display {
  background: white;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.info {
  background: #fff3cd;
  padding: 10px;
  border-radius: 4px;
  border-left: 4px solid #ffc107;
}

.info ul {
  margin: 5px 0 0 20px;
}

.info li {
  margin: 3px 0;
}
</style>
