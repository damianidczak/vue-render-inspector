export function shallowEqual(obj1, obj2) {
  if (obj1 === obj2) return true
  if (!obj1 || !obj2) return false
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false

  // Check if both are arrays or both are objects
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  if (keys1.length !== keys2.length) return false
  for (const key of keys1) {
    if (typeof obj1[key] === 'function' || typeof obj2[key] === 'function') {
      if (typeof obj1[key] !== typeof obj2[key] || obj1[key] !== obj2[key]) {
        return false
      }
    } else if (obj1[key] !== obj2[key]) {
      return false
    }
  }
  return true
}
export function computeDiff(prev, next) {
  const diff = {
    changed: {},
    added: {},
    removed: {}
  }
  if (!prev && !next) return diff
  if (!prev) {
    diff.added = { ...next }
    return diff
  }
  if (!next) {
    diff.removed = { ...prev }
    return diff
  }
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)])
  for (const key of allKeys) {
    const hadKey = key in prev
    const hasKey = key in next
    if (!hadKey && hasKey) {
      diff.added[key] = next[key]
    } else if (hadKey && !hasKey) {
      diff.removed[key] = prev[key]
    } else if (prev[key] !== next[key]) {
      const prevIsFunc = typeof prev[key] === 'string' && prev[key].startsWith('[Function:')
      const nextIsFunc = typeof next[key] === 'string' && next[key].startsWith('[Function:')
      const deepEqual = prevIsFunc && nextIsFunc ? false : isDeepEqual(prev[key], next[key])

      // Always record changes, but mark if they're only reference changes
      diff.changed[key] = {
        from: prev[key],
        to: next[key],
        sameReference: prev[key] === next[key],
        deepEqual
      }
    }
  }
  return diff
}
export function isDeepEqual(obj1, obj2, visited = new WeakSet()) {
  if (obj1 === obj2) return true
  if (obj1 == null || obj2 == null) return obj1 === obj2
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2
  }

  // Handle Date objects
  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime()
  }

  // Handle RegExp objects
  if (obj1 instanceof RegExp && obj2 instanceof RegExp) {
    return obj1.toString() === obj2.toString()
  }

  // Handle different constructor types
  if (obj1.constructor !== obj2.constructor) return false

  // Handle circular references
  if (visited.has(obj1) || visited.has(obj2)) return obj1 === obj2
  visited.add(obj1)
  visited.add(obj2)

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false
    return obj1.every((item, index) => isDeepEqual(item, obj2[index], visited))
  }
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  if (keys1.length !== keys2.length) return false
  return keys1.every(key => isDeepEqual(obj1[key], obj2[key], visited))
}
export function isPrimitive(value) {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  )
}
export function hasDifferentReferenceButSameContent(prev, next) {
  if (prev === next) return false
  if (isPrimitive(prev) || isPrimitive(next)) return false
  return isDeepEqual(prev, next)
}
