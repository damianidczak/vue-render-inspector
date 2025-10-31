<template>
  <div class="watcher-issue-demo">
    <h4>Watcher Issue Demo</h4>
    <p>Trigger count: {{ trigger }}</p>
    <p>Render count: {{ renderCount }}</p>
  </div>
</template>

<script>
import { defineComponent, ref, watchEffect } from 'vue'

export default defineComponent({
  name: 'WatcherIssueDemo',
  props: {
    trigger: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const renderCount = ref(0)

    // This watchEffect watches the entire props object
    // This is inefficient and will trigger on any prop change
    watchEffect(() => {
      // Access all props to make them reactive dependencies
      const _t = props.trigger

      // Increment render count
      renderCount.value++

      console.log('WatcherIssueDemo: watchEffect triggered, render count:', renderCount.value)
    })

    return {
      renderCount
    }
  }
})
</script>

<style scoped>
.watcher-issue-demo {
  background: #fff3cd;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
  border-left: 3px solid #ffc107;
}
</style>
