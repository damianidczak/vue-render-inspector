<template>
  <div class="component storm">
    <h3>Render Storm Component</h3>
    <p>Trigger: {{ trigger }}</p>
    <p>When button is clicked, this component will render 10 times in 500ms.</p>
    <!-- Render storm detection will be shown in console -->
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'RenderStormComponent',
  props: {
    trigger: Number
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

.component.storm {
  border-left: 4px solid #ff9800;
}

.warning {
  color: #f44336;
  font-weight: bold;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
