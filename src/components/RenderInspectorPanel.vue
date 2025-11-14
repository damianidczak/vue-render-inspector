<template>
  <div>
    <FloatingWindow
      v-if="isVisible"
      :initial-x="panelPosition.x"
      :initial-y="panelPosition.y"
      :initial-width="panelSize.width"
      :initial-height="panelSize.height"
      @close="hide"
    >
      <InspectorPanel :profiler="profiler" @component-toggled="handleComponentToggled" />
    </FloatingWindow>
    <button
      v-if="!isVisible"
      class="vri-floating-circle"
      @click="show"
      title="Open Vue Render Inspector"
    >
      <span class="vri-circle-icon">🔍</span>
    </button>
  </div>
</template>
<script setup>
/* global localStorage */
import { ref, onMounted, onUnmounted } from 'vue'
import FloatingWindow from './FloatingWindow.vue'
import InspectorPanel from './InspectorPanel.vue'

const props = defineProps({
  profiler: {
    type: Object,
    required: true
  },
  panelOpenByDefault: {
    type: Boolean,
    default: true
  }
})

const isVisible = ref(props.panelOpenByDefault)
const panelPosition = ref({ x: 20, y: 20 })
const panelSize = ref({ width: 450, height: 600 })

const show = () => {
  isVisible.value = true
}

const hide = () => {
  isVisible.value = false
}

const toggle = () => {
  if (isVisible.value) {
    hide()
  } else {
    show()
  }
}

const handleComponentToggled = data => {}

onMounted(() => {
  try {
    const saved = localStorage.getItem('vri-panel-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.panelPosition) {
        panelPosition.value = parsed.panelPosition
      }
      if (parsed.panelSize) {
        panelSize.value = parsed.panelSize
      }
    }
  } catch (_error) {
    console.warn('[VRI] Failed to load panel settings:', _error)
  }
})

onUnmounted(() => {
  try {
    const existing = localStorage.getItem('vri-panel-settings')
    const settings = existing ? JSON.parse(existing) : {}
    settings.panelPosition = panelPosition.value
    settings.panelSize = panelSize.value
    localStorage.setItem('vri-panel-settings', JSON.stringify(settings))
  } catch (_error) {
    console.warn('[VRI] Failed to save panel settings:', _error)
  }
})

defineExpose({
  show,
  hide,
  toggle,
  isVisible: () => isVisible.value
})
</script>
<style scoped>
.vri-floating-circle {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #42b883;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 9999;
}
.vri-floating-circle:hover {
  transform: scale(1.1);
  background: #38a372;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}
.vri-floating-circle:active {
  transform: scale(0.95);
}
.vri-circle-icon {
  font-size: 24px;
  color: white;
  line-height: 1;
}
.vri-floating-circle {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
