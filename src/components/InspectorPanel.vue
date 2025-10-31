<template>
  <div class="vri-inspector-panel">
    <div class="vri-panel-header">
      <h3 class="vri-panel-title">🔍 Render Inspector</h3>
      <button class="vri-visualizer-btn" @click="openVisualizer" title="Open Visualizer in New Tab">
        <span class="vri-icon">📊</span>
        <span class="vri-btn-text">Visualizer</span>
        <span class="vri-btn-subtitle">new tab</span>
      </button>
    </div>
    <ComponentList
      :components="componentList"
      :enabled-components="enabledComponents"
      @toggle-component="toggleComponent"
      @enable-all="enableAllComponents"
      @disable-all="disableAllComponents"
    />
  </div>
</template>
<script setup>
/* global URL */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import ComponentList from './ComponentList.vue'

const props = defineProps({
  profiler: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['component-toggled'])

const enabledComponents = ref(new Set())
const updateTrigger = ref(0)
let updateInterval = null

const componentList = computed(() => {
  // Access updateTrigger to make this reactive
  updateTrigger.value

  if (!props.profiler?.renderTracker) return []
  const _stats = props.profiler.renderTracker.getAllStats()
  return _stats.map(stat => ({
    uid: stat.uid,
    name: stat.componentName,
    totalRenders: stat.totalRenders,
    unnecessaryRenders: stat.unnecessaryRenders,
    unnecessaryPercentage: stat.getUnnecessaryPercentage(),
    avgRenderTime: stat.getAvgRenderTime(),
    firstRender: stat.firstRender,
    lastRender: stat.lastRender,
    enabled: enabledComponents.value.has(stat.uid),
    topReasons: []
  }))
})

const toggleComponent = uid => {
  const isEnabled = enabledComponents.value.has(uid)
  if (isEnabled) {
    props.profiler.disableComponent(uid)
    enabledComponents.value.delete(uid)
  } else {
    props.profiler.enableComponent(uid)
    enabledComponents.value.add(uid)
  }
  emit('component-toggled', { uid, enabled: !isEnabled })
}

const enableAllComponents = () => {
  props.profiler.enableAllComponents()
  componentList.value.forEach(component => {
    enabledComponents.value.add(component.uid)
  })
  emit('component-toggled', { action: 'enable-all' })
}

const disableAllComponents = () => {
  props.profiler.disableAllComponents()
  enabledComponents.value.clear()
  emit('component-toggled', { action: 'disable-all' })
}

const openVisualizer = () => {
  const url = new URL(window.location.href)
  url.searchParams.set('vri-visualizer', 'true')
  window.open(url.toString(), '_blank')
}

onMounted(() => {
  if (props.profiler) {
    props.profiler.enableAllComponents()
  }
  const _allStats = props.profiler?.renderTracker?.getAllStats() || []
  _allStats.forEach(stat => {
    enabledComponents.value.add(stat.uid)
  })

  // Start interval to update component list
  updateInterval = setInterval(() => {
    updateTrigger.value++
  }, 500)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})

watch(componentList, (newList, oldList) => {
  if (newList.length > oldList.length) {
    newList.forEach(component => {
      if (!enabledComponents.value.has(component.uid)) {
        enabledComponents.value.add(component.uid)
        props.profiler.enableComponent(component.uid)
      }
    })
  }
})
</script>
<style scoped>
.vri-inspector-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
}
.vri-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.vri-panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}
.vri-visualizer-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 16px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.vri-visualizer-btn:hover {
  background: #38a372;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
.vri-visualizer-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.vri-icon {
  font-size: 18px;
  line-height: 1;
}
.vri-btn-text {
  font-weight: 500;
  line-height: 1;
}
.vri-btn-subtitle {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.9;
  line-height: 1;
}
</style>
