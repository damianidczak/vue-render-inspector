<template>
  <div class="test-diff-child">
    <h4>Child Component</h4>
    <p>String Prop: {{ stringProp }}</p>
    <p>Object Prop: {{ JSON.stringify(objectProp) }}</p>
    <p>Number Prop: {{ numberProp }}</p>

    <div v-for="(value, key) in otherProps" :key="key" class="dynamic-prop">
      {{ key }}: {{ value }}
    </div>

    <div class="local-state">
      <p>Local State: {{ localState }}</p>
      <button @click="updateLocalState">Update Local State</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, useAttrs } from 'vue'

const props = defineProps({
  stringProp: String,
  objectProp: Object,
  numberProp: Number
})

// Capture any additional props using useAttrs
const attrs = useAttrs()
const otherProps = computed(() => {
  // Filter out the defined props and Vue internal attributes
  const { stringProp, objectProp, numberProp, class: className, style, ...rest } = attrs
  return rest
})

// Local state to test state diffs
const localState = ref(0)

function updateLocalState() {
  localState.value++
}
</script>

<style scoped>
.test-diff-child {
  padding: 15px;
  border: 1px solid #666;
  border-radius: 4px;
  background: white;
}

.test-diff-child h4 {
  margin-top: 0;
  color: #333;
}

.dynamic-prop {
  padding: 5px;
  margin: 5px 0;
  background: #f5f5f5;
  border-left: 3px solid #007bff;
  font-family: monospace;
  font-size: 12px;
}

.local-state {
  margin-top: 15px;
  padding: 10px;
  background: #fffbf0;
  border: 1px solid #ffa500;
  border-radius: 4px;
}

.local-state button {
  margin-top: 5px;
  padding: 5px 10px;
  background: #ffa500;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.local-state button:hover {
  background: #ff8c00;
}
</style>
