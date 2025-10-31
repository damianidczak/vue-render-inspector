<template>
  <div class="event-trigger-demo">
    <h3>Event Trigger Demo</h3>

    <div class="controls">
      <!-- Click trigger -->
      <button data-test="click-trigger" @click="handleClick">
        Click Trigger ({{ clickCount }})
      </button>

      <!-- Input trigger -->
      <input
        data-test="input-trigger"
        v-model="inputValue"
        @input="handleInput"
        placeholder="Type to trigger render"
      />

      <!-- Hover trigger -->
      <div data-test="hover-trigger" @mouseover="handleHover" class="hover-area">
        Hover over me ({{ hoverCount }})
      </div>

      <!-- Unnecessary render trigger -->
      <button data-test="unnecessary-trigger" @click="triggerUnnecessaryRender">
        Unnecessary Render
      </button>

      <!-- No event trigger (programmatic) -->
      <button data-test="no-event-trigger" @click="triggerNoEventRender">No Event Render</button>
    </div>

    <div class="display">
      <p>Input: {{ inputValue }}</p>
      <p>Render count: {{ renderCount }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Set up render inspector with event tracking enabled

// Reactive state
const clickCount = ref(0)
const inputValue = ref('')
const hoverCount = ref(0)
const renderCount = ref(0)
const unnecessaryTrigger = ref(0)

// Event handlers that trigger renders
function handleClick() {
  clickCount.value++
}

function handleInput() {
  // Input event is handled by v-model, but we can add custom logic
  renderCount.value++
}

function handleHover() {
  hoverCount.value++
}

function triggerUnnecessaryRender() {
  // This will trigger a render but not change any actual state
  unnecessaryTrigger.value++
}

function triggerNoEventRender() {
  // Programmatic render trigger without DOM event
  setTimeout(() => {
    renderCount.value++
  }, 10)
}

// Note: renderCount is updated by event handlers, not onUpdated to avoid infinite loops

// Access window inspector for testing
const inspector = window.__VUE_RENDER_INSPECTOR__

// Expose inspector for testing
defineExpose({
  inspector
})
</script>

<style scoped>
.event-trigger-demo {
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin: 10px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

button,
input {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.hover-area {
  padding: 20px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.display {
  background: #f9f9f9;
  padding: 10px;
  border-radius: 4px;
}
</style>
