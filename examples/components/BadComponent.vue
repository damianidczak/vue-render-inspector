<template>
  <div class="component bad">
    <h3>Bad Component</h3>
    <p>User: {{ user.name }} ({{ user.email }})</p>
    <p>Config: {{ config.theme }} - Count: {{ config.count }}</p>
    <p>Items: {{ items.join(', ') }}</p>
    <p>Callback type: {{ callbackType }}</p>
    <p>Render count: {{ renderCount }}</p>
    <p>This component re-renders unnecessarily because parent passes new object references.</p>
  </div>
</template>

<script>
import { defineComponent, computed, ref, watchEffect } from 'vue'

export default defineComponent({
  name: 'BadComponent',
  props: {
    user: Object,
    callback: Function,
    config: Object,
    items: Array
  },
  setup(props) {
    const renderCount = ref(0)

    // Force component to be reactive to all prop changes
    watchEffect(() => {
      // Access all props to make them reactive dependencies
      const __u = props.user
      const __c = props.callback
      const __cfg = props.config
      const __i = props.items

      // Increment render count
      renderCount.value++
    })

    const callbackType = computed(() => (props.callback ? 'Function provided' : 'No function'))

    return {
      renderCount,
      callbackType
    }
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

.component.bad {
  border-left: 4px solid #f44336;
}
</style>
