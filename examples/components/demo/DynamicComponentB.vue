<template>
  <div class="dynamic-b">
    <h5>Dynamic Component B</h5>
    <p>{{ data.message }}</p>
    <p>Component type: B</p>
  </div>
</template>

<script setup>
defineProps({
  data: Object
})
</script>

<style scoped>
.dynamic-b {
  padding: 10px;
  background: #fff3e0;
  border-radius: 4px;
  border-left: 4px solid #ff9800;
}
</style>
