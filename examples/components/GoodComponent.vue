<template>
  <div class="component good">
    <h3>Good Component</h3>
    <p>Count: {{ count }}</p>
    <p>This component only re-renders when count actually changes.</p>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'GoodComponent',
  props: {
    count: Number
  },
  setup() {
    // Props are automatically available in template, no need to return them
    return {}
  }
})
</script>

<style scoped>
.component {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  margin: 10px 0;
}

.component.good {
  border-left: 4px solid #4caf50;
}
</style>
