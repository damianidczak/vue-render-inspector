<template>
  <div ref="windowRef" class="vri-floating-window" :style="windowStyle" @mousedown="startDrag">
    <div class="vri-window-header" @mousedown="startDrag">
      <div class="vri-window-title">
        <span class="vri-icon">🔍</span>
        Vue Render Inspector
      </div>
      <div class="vri-window-controls">
        <button class="vri-control-btn vri-close-btn" @click="close" title="Minimize to circle">
          ×
        </button>
      </div>
    </div>
    <div class="vri-window-content">
      <slot></slot>
    </div>
    <div class="vri-resize-handle vri-resize-se" @mousedown="startResize('se', $event)"></div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  initialX: { type: Number, default: 20 },
  initialY: { type: Number, default: 20 },
  initialWidth: { type: Number, default: 400 },
  initialHeight: { type: Number, default: 500 },
  minWidth: { type: Number, default: 300 },
  minHeight: { type: Number, default: 200 },
  zIndex: { type: Number, default: 9999 }
})

const emit = defineEmits(['close'])

const windowRef = ref(null)
const isDragging = ref(false)
const isResizing = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const resizeType = ref('')
const position = ref({ x: props.initialX, y: props.initialY })
const size = ref({ width: props.initialWidth, height: props.initialHeight })

const windowStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  width: `${size.value.width}px`,
  height: `${size.value.height}px`,
  zIndex: props.zIndex
}))

const startDrag = event => {
  if (event.target.closest('.vri-control-btn')) return
  const tagName = event.target.tagName.toLowerCase()
  if (['input', 'textarea', 'select', 'button'].includes(tagName)) return
  isDragging.value = true
  dragOffset.value = {
    x: event.clientX - position.value.x,
    y: event.clientY - position.value.y
  }
  event.preventDefault()
}

const startResize = (type, event) => {
  isResizing.value = true
  resizeType.value = type
  event.preventDefault()
}

const handleMouseMove = event => {
  if (isDragging.value) {
    position.value = {
      x: Math.max(0, event.clientX - dragOffset.value.x),
      y: Math.max(0, event.clientY - dragOffset.value.y)
    }
  } else if (isResizing.value) {
    const newSize = { ...size.value }
    if (resizeType.value.includes('e')) {
      newSize.width = Math.max(props.minWidth, event.clientX - position.value.x)
    }
    if (resizeType.value.includes('s')) {
      newSize.height = Math.max(props.minHeight, event.clientY - position.value.y)
    }
    size.value = newSize
  }
}

const handleMouseUp = () => {
  isDragging.value = false
  isResizing.value = false
  resizeType.value = ''
}

const close = () => {
  emit('close')
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>
<style scoped>
.vri-floating-window {
  position: fixed;
  background: #ffffff;
  border: 2px solid #42b883;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  overflow: hidden;
  user-select: none;
}
.vri-window-header {
  background: #42b883;
  color: white;
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  border-bottom: 1px solid #3aa876;
}
.vri-window-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.vri-icon {
  font-size: 16px;
}
.vri-window-controls {
  display: flex;
  gap: 4px;
}
.vri-control-btn {
  background: none;
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: background-color 0.2s;
}
.vri-control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}
.vri-close-btn {
  font-size: 18px;
  font-weight: normal;
}
.vri-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}
.vri-window-content {
  padding: 0;
  height: calc(100% - 41px);
  overflow: hidden;
}
.vri-resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: nw-resize;
  background: linear-gradient(
    -45deg,
    transparent 0%,
    transparent 30%,
    #42b883 30%,
    #42b883 40%,
    transparent 40%,
    transparent 60%,
    #42b883 60%,
    #42b883 70%,
    transparent 70%
  );
}
.vri-resize-handle:hover {
  background: linear-gradient(
    -45deg,
    transparent 0%,
    transparent 30%,
    #3aa876 30%,
    #3aa876 40%,
    transparent 40%,
    transparent 60%,
    #3aa876 60%,
    #3aa876 70%,
    transparent 70%
  );
}
</style>
