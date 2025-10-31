import { isRef, isReactive, toRaw, ref, reactive, computed } from 'vue'
const CIRCULAR_REF = '[Circular Reference]'
const MAX_DEPTH = 5
export function safeSerialize(value, maxDepth = MAX_DEPTH) {
  const seen = new WeakSet()
  function serialize(val, depth = 0) {
    if (val === null || val === undefined) return val
    if (typeof val === 'function') {
      return `[Function: ${val.name || 'anonymous'}]`
    }
    if (typeof val !== 'object') return val
    if (depth > maxDepth) return '[Max Depth Reached]'
    if (seen.has(val)) return CIRCULAR_REF
    seen.add(val)
    if (isRef(val)) {
      return {
        __type: 'Ref',
        value: serialize(val.value, depth + 1)
      }
    }
    if (isReactive(val)) {
      return {
        __type: 'Reactive',
        value: serialize(toRaw(val), depth + 1)
      }
    }
    if (isRef(val) && val.effect) {
      return {
        __type: 'ComputedRef',
        value: serialize(val.value, depth + 1)
      }
    }
    if (Array.isArray(val)) {
      return val.map(item => serialize(item, depth + 1))
    }
    if (val instanceof Date) {
      return {
        __type: 'Date',
        value: val.toISOString()
      }
    }
    if (val instanceof RegExp) {
      return {
        __type: 'RegExp',
        value: val.toString()
      }
    }
    if (val.$el || val._isVue || val.__v_isRef || val.__isVue) {
      return '[Vue Component Instance]'
    }
    const result = {}
    try {
      const keys = Object.keys(val)
      for (const key of keys) {
        if (key.startsWith('__v_') || key.startsWith('_')) continue
        try {
          result[key] = serialize(val[key], depth + 1)
        } catch (_e) {
          result[key] = '[Serialization Error]'
        }
      }
    } catch (_e) {
      return '[Object - Keys Not Enumerable]'
    }
    return result
  }
  return serialize(value)
}
export function captureProps(props) {
  if (!props) return {}
  const snapshot = {}
  const rawProps = toRaw(props)
  for (const key in rawProps) {
    try {
      const value = rawProps[key]
      const serialized = safeSerialize(value, 3)
      snapshot[key] = serialized
    } catch (_e) {
      snapshot[key] = '[Access Error]'
    }
  }
  return snapshot
}
export function captureState(instance) {
  if (!instance || !instance.setupState) return {}
  const state = {}
  const setupState = instance.setupState
  const rawSetupState = toRaw(setupState)
  for (const key in rawSetupState) {
    if (key.startsWith('_') || key.startsWith('$')) continue
    const internalKeys = [
      'renderCount',
      '__renderCount',
      '__vri_internal',
      'instance',
      'forceRenderTrigger',
      'forceTrigger'
    ]
    if (internalKeys.includes(key)) continue
    try {
      const value = rawSetupState[key]
      if (typeof value === 'function') {
        state[key] = `[Function: ${value.name || 'anonymous'}]`
        continue
      }
      // Skip Vue composition API imports but allow user-defined properties
      if (
        value === ref ||
        value === reactive ||
        value === computed ||
        key === 'getCurrentInstance' ||
        key === 'defineProps' ||
        key === 'defineEmits'
      ) {
        continue
      }
      if (isRef(value)) {
        state[key] = safeSerialize(toRaw(value.value), 3)
      } else if (isReactive(value)) {
        state[key] = safeSerialize(toRaw(value), 3)
      } else {
        // Capture plain values too
        state[key] = safeSerialize(value, 3)
      }
    } catch (_e) {
      state[key] = '[Access Error]'
    }
  }
  return state
}
export function formatForConsole(value) {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') {
    if (value.startsWith('[') && value.endsWith(']')) {
      return value
    }
    return `"${value}"`
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'function') {
    return `ƒ ${value.name || 'anonymous'}()`
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    if (value.length > 3) {
      return `Array(${value.length})`
    }
    return `[${value.map(formatForConsole).join(', ')}]`
  }
  if (typeof value === 'object') {
    if (value.__type === 'Ref') {
      return `ref(${formatForConsole(value.value)})`
    }
    if (value.__type === 'Reactive') {
      return `reactive({...})`
    }
    if (value.__type === 'ComputedRef') {
      return `computed(${formatForConsole(value.value)})`
    }
    const keys = Object.keys(value)
    if (keys.length === 0) return '{}'
    if (keys.length > 3) return `{${keys[0]}: ..., +${keys.length - 1} more}`
    return `{${keys.map(k => `${k}: ${formatForConsole(value[k])}`).join(', ')}}`
  }
  return String(value)
}
