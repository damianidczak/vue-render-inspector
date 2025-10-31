<template>
  <div class="test-diff-component">
    <h3>Test Diff Component</h3>

    <div class="controls">
      <h4>Props Changes:</h4>
      <button @click="changeStringProp">Change String Prop</button>
      <button @click="changeObjectProp">Change Object Prop (New Reference)</button>
      <button @click="changeObjectContent">Change Object Content</button>
      <button @click="addProp">Add New Prop</button>
      <button @click="removeProp">Remove Prop</button>
    </div>

    <div class="controls">
      <h4>State Changes (Parent Component):</h4>
      <button @click="changeState">Change State Value</button>
      <button @click="changeStateReference">Change State Reference (Same Content)</button>
    </div>

    <div class="child-container">
      <TestDiffChild
        :stringProp="stringProp"
        :objectProp="objectProp"
        :numberProp="numberProp"
        v-bind="dynamicProps"
      />
    </div>

    <div class="status">
      <p>String Prop: {{ stringProp }}</p>
      <p>Object Prop: {{ JSON.stringify(objectProp) }}</p>
      <p>Number Prop: {{ numberProp }}</p>
      <p>Dynamic Props: {{ JSON.stringify(dynamicProps) }}</p>
      <p>Local State: {{ JSON.stringify(localState) }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TestDiffChild from './TestDiffChild.vue'

const stringProp = ref('initial value')
const objectProp = ref({ count: 0, name: 'test' })
const numberProp = ref(42)
const dynamicProps = ref({})

function changeStringProp() {
  stringProp.value = `changed at ${new Date().toLocaleTimeString()}`
}

function changeObjectProp() {
  // New reference, same content
  objectProp.value = { ...objectProp.value }
}

function changeObjectContent() {
  // New reference, different content
  objectProp.value = {
    count: objectProp.value.count + 1,
    name: `${objectProp.value.name}!`
  }
}

function addProp() {
  dynamicProps.value = {
    ...dynamicProps.value,
    [`prop${Object.keys(dynamicProps.value).length}`]: Math.random()
  }
}

function removeProp() {
  const keys = Object.keys(dynamicProps.value)
  if (keys.length > 0) {
    const newProps = { ...dynamicProps.value }
    delete newProps[keys[0]]
    dynamicProps.value = newProps
  }
}

const localState = ref({ value: 0, data: 'test' })

function changeState() {
  localState.value = {
    value: localState.value.value + 1,
    data: `updated ${Date.now()}`
  }
}

function changeStateReference() {
  // Same content, new reference
  localState.value = { ...localState.value }
}
</script>

<style scoped>
.test-diff-component {
  padding: 20px;
  border: 2px solid #333;
  border-radius: 8px;
  margin: 20px;
}

.controls {
  margin: 20px 0;
}

.controls button {
  margin: 5px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:hover {
  background: #0056b3;
}

.child-container {
  margin: 20px 0;
  padding: 20px;
  background: #f0f0f0;
  border-radius: 4px;
}

.status {
  margin-top: 20px;
  padding: 10px;
  background: #e0e0e0;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}
</style>
