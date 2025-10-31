<script>
import { defineComponent, toRefs, h } from 'vue'

export default defineComponent({
  name: 'SlowComponent',
  props: {
    items: Array
  },
  setup(props) {
    const { items } = toRefs(props)

    // Use render function to ensure computation happens during measured render
    return () => {
      // Do expensive work directly in render function
      const startTime = performance.now()
      let dummy = 0

      // Make it actually slow based on item count
      const iterations = items.value.length * 50000 // 50k operations per item

      for (let i = 0; i < iterations; i++) {
        dummy += Math.sqrt(i) * Math.random()
      }

      const elapsed = performance.now() - startTime
      const result = `Processed ${items.value.length} items (computation result: ${dummy.toFixed(0)})`

      // Only log if it's actually slow
      if (elapsed > 10) {
        console.log(
          `[SlowComponent] Expensive computation took ${elapsed.toFixed(2)}ms for ${items.value.length} items`
        )
      }

      // Return the render tree
      return h('div', { class: 'component slow' }, [
        h('h3', 'Slow Component'),
        h('p', `Items count: ${items.value.length}`),
        h('p', result),
        h('p', 'This component performs expensive computations on every render.'),
        h('p', { class: 'hint' }, '💡 Hint: Use v-memo or virtual scrolling to optimize')
      ])
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

.component.slow {
  border-left: 4px solid #9c27b0;
}

.hint {
  font-style: italic;
  color: #666;
  font-size: 0.9em;
}
</style>
