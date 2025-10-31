<template>
  <div class="dynamic-a">
    <h5>Dynamic Component A</h5>
    <p>{{ data.message }}</p>
    <p>Component type: A</p>
  </div>
</template>

<script setup>
defineProps({
  data: Object
})
</script>

<style scoped>
.dynamic-a {
  padding: 10px;
  background: #e8f5e9;
  border-radius: 4px;
  border-left: 4px solid #4caf50;
}
</style>
