<template>
  <div class="vri-component-list">
    <div class="vri-search-container">
      <input
        id="vri-search-input"
        v-model="searchQuery"
        type="text"
        placeholder="Search components..."
        class="vri-search-input"
      />
      <span class="vri-search-icon">🔍</span>
    </div>
    <div class="vri-stats">
      <span class="vri-stat-item">Total: {{ totalComponents }}</span>
      <span class="vri-stat-item">Enabled: {{ enabledComponentsCount }}</span>
      <span class="vri-stat-item">Disabled: {{ disabledComponentsCount }}</span>
    </div>
    <div class="vri-bulk-actions">
      <button
        class="vri-bulk-btn vri-enable-all-btn"
        @click="enableAll"
        :disabled="enabledComponentsCount === totalComponents"
      >
        Enable All
      </button>
      <button
        class="vri-bulk-btn vri-disable-all-btn"
        @click="disableAll"
        :disabled="disabledComponentsCount === totalComponents"
      >
        Disable All
      </button>
    </div>
    <div class="vri-components-container">
      <div v-if="filteredComponents.length === 0" class="vri-no-components">
        No components found
      </div>
      <div v-for="component in filteredComponents" :key="component.uid" class="vri-component-item">
        <div class="vri-component-header">
          <label class="vri-component-toggle">
            <input
              type="checkbox"
              :checked="component.enabled"
              @change="toggleComponent(component.uid)"
              class="vri-toggle-input"
            />
            <span class="vri-toggle-slider"></span>
          </label>
          <div class="vri-component-info">
            <div class="vri-component-name">{{ component.name }}</div>
            <div class="vri-component-meta">
              UID: {{ component.uid }} • Renders: {{ component.totalRenders }} • Unnecessary:
              {{ component.unnecessaryRenders }} ({{
                component.unnecessaryPercentage
                  ? component.unnecessaryPercentage.toFixed(1)
                  : '0.0'
              }}%)
            </div>
          </div>
          <div class="vri-component-actions">
            <button
              class="vri-action-btn vri-details-btn"
              @click="showDetails(component)"
              title="Show details"
            >
              ℹ️
            </button>
          </div>
        </div>
        <div v-if="expandedComponent === component.uid" class="vri-component-details">
          <div class="vri-detail-row">
            <span class="vri-detail-label">Avg Render Time:</span>
            <span class="vri-detail-value">
              {{ component.avgRenderTime ? component.avgRenderTime.toFixed(2) : '0.00' }}ms
            </span>
          </div>
          <div class="vri-detail-row">
            <span class="vri-detail-label">First Render:</span>
            <span class="vri-detail-value">{{ formatTimestamp(component.firstRender) }}</span>
          </div>
          <div class="vri-detail-row">
            <span class="vri-detail-label">Last Render:</span>
            <span class="vri-detail-value">{{ formatTimestamp(component.lastRender) }}</span>
          </div>
          <div v-if="component.unnecessaryRenders > 0" class="vri-detail-row">
            <span class="vri-detail-label">Top Reasons:</span>
            <div class="vri-reasons-list">
              <div
                v-for="reason in component.topReasons.slice(0, 3)"
                :key="reason.type"
                class="vri-reason-item"
              >
                {{ reason.type }}: {{ reason.count }} times
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  components: {
    type: Array,
    default: () => []
  },
  enabledComponents: {
    type: Set,
    default: () => new Set()
  }
})

const emit = defineEmits(['toggle-component', 'enable-all', 'disable-all'])

const searchQuery = ref('')
const expandedComponent = ref(null)

const filteredComponents = computed(() => {
  if (!searchQuery.value) {
    return props.components
  }
  const query = searchQuery.value.toLowerCase()
  return props.components.filter(
    component =>
      component.name.toLowerCase().includes(query) || component.uid.toString().includes(query)
  )
})

const totalComponents = computed(() => props.components.length)

const enabledComponentsCount = computed(
  () => props.components.filter(c => props.enabledComponents.has(c.uid)).length
)

const disabledComponentsCount = computed(
  () => props.components.filter(c => !props.enabledComponents.has(c.uid)).length
)

const toggleComponent = uid => {
  emit('toggle-component', uid)
}

const enableAll = () => {
  emit('enable-all')
}

const disableAll = () => {
  emit('disable-all')
}

const showDetails = component => {
  expandedComponent.value = expandedComponent.value === component.uid ? null : component.uid
}

const formatTimestamp = timestamp => {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}
</script>
<style scoped>
.vri-component-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.vri-search-container {
  position: relative;
  margin-bottom: 16px;
}
.vri-search-input {
  width: 100%;
  padding: 10px 40px 10px 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  position: relative;
  z-index: 1;
}
.vri-search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  pointer-events: none;
  z-index: 0;
  font-size: 16px;
}
.vri-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #666;
}
.vri-stat-item {
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 12px;
}
.vri-bulk-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.vri-bulk-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #42b883;
  background: white;
  color: #42b883;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}
.vri-bulk-btn:hover:not(:disabled) {
  background: #42b883;
  color: white;
}
.vri-bulk-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.vri-enable-all-btn {
  border-color: #42b883;
  color: #42b883;
}
.vri-enable-all-btn:hover:not(:disabled) {
  background: #42b883;
  color: white;
}
.vri-disable-all-btn {
  border-color: #ff6b6b;
  color: #ff6b6b;
}
.vri-disable-all-btn:hover:not(:disabled) {
  background: #ff6b6b;
  color: white;
}
.vri-components-container {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}
.vri-no-components {
  padding: 40px;
  text-align: center;
  color: #999;
  font-style: italic;
}
.vri-component-item {
  border-bottom: 1px solid #f0f0f0;
}
.vri-component-item:last-child {
  border-bottom: none;
}
.vri-component-header {
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 12px;
}
.vri-component-toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}
.vri-toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}
.vri-toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}
.vri-toggle-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}
.vri-toggle-input:checked + .vri-toggle-slider {
  background-color: #42b883;
}
.vri-toggle-input:checked + .vri-toggle-slider:before {
  transform: translateX(20px);
}
.vri-component-info {
  flex: 1;
  min-width: 0;
}
.vri-component-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
  word-break: break-word;
}
.vri-component-meta {
  font-size: 12px;
  color: #666;
}
.vri-component-actions {
  flex-shrink: 0;
}
.vri-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 3px;
  transition: background-color 0.2s;
}
.vri-action-btn:hover {
  background: #f0f0f0;
}
.vri-details-btn {
  font-size: 14px;
}
.vri-component-details {
  background: #f9f9f9;
  border-top: 1px solid #eee;
  padding: 12px;
  font-size: 12px;
}
.vri-detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.vri-detail-row:last-child {
  margin-bottom: 0;
}
.vri-detail-label {
  color: #666;
  font-weight: 500;
}
.vri-detail-value {
  color: #333;
  font-family: monospace;
}
.vri-reasons-list {
  margin-top: 4px;
}
.vri-reason-item {
  color: #666;
  font-size: 11px;
  margin-bottom: 2px;
}
.vri-reason-item:last-child {
  margin-bottom: 0;
}
</style>
