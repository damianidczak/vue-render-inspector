<template>
  <div class="test-bottlenecks">
    <h2>Test Enhanced Pattern Detection</h2>

    <!-- Pattern 1: Inline object (should be detected) -->
    <div class="pattern">
      <h3>1. Inline Object Creation</h3>
      <button @click="counter++">Trigger Parent Render ({{ counter }})</button>
      <ChildComponent :config="{ theme: 'dark', size: 'large' }" :data="{ value: counter }" />
    </div>

    <!-- Pattern 2: Inline function -->
    <div class="pattern">
      <h3>2. Inline Function</h3>
      <ChildComponent :onClick="() => console.log('clicked')" />
    </div>

    <!-- Pattern 3: Many props (deep reactivity candidate) -->
    <div class="pattern">
      <h3>3. Many Props Component</h3>
      <ComplexComponent v-bind="complexData" />
    </div>

    <!-- Pattern 4: Slow component without v-memo -->
    <div class="pattern">
      <h3>4. Expensive Component</h3>
      <ExpensiveComponent :data="expensiveData" />
    </div>

    <!-- Pattern 5: List items -->
    <div class="pattern">
      <h3>5. List Items</h3>
      <ItemComponent v-for="(item, index) in items" :key="index" :data="item" />
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

// Mock child components
const ChildComponent = {
  name: 'ChildComponent',
  props: ['config', 'data', 'onClick'],
  template: '<div>Child: {{ config }}</div>'
}

const ComplexComponent = {
  name: 'ComplexComponent',
  props: Array(30)
    .fill(0)
    .map((_, i) => `prop${i}`),
  template: '<div>Complex Component</div>'
}

const ExpensiveComponent = {
  name: 'ExpensiveComponent',
  props: ['data'],
  setup() {
    // Simulate expensive computation
    const compute = () => {
      let sum = 0
      for (let i = 0; i < 1000000; i++) {
        sum += Math.random()
      }
      return sum
    }
    return { compute }
  },
  template: '<div>Expensive: {{ compute() }}</div>'
}

const ItemComponent = {
  name: 'ItemComponent',
  props: ['data'],
  template: '<div>Item: {{ data?.name }}</div>'
}

export default {
  name: 'TestBottlenecks',
  components: {
    ChildComponent,
    ComplexComponent,
    ExpensiveComponent,
    ItemComponent
  },
  setup() {
    const counter = ref(0)

    const complexData = Object.fromEntries(
      Array(30)
        .fill(0)
        .map((_, i) => [`prop${i}`, `value${i}`])
    )

    const expensiveData = ref({
      large: Array(100)
        .fill(0)
        .map((_, i) => ({
          id: i,
          nested: { deep: { value: Math.random() } }
        }))
    })

    const items = ref(
      Array(10)
        .fill(0)
        .map((_, i) => ({
          id: i,
          name: `Item ${i}`
        }))
    )

    return {
      counter,
      complexData,
      expensiveData,
      items
    }
  }
}
</script>

<style scoped>
.test-bottlenecks {
  padding: 20px;
}

.pattern {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

h3 {
  margin-top: 0;
  color: #42b883;
}
</style>
