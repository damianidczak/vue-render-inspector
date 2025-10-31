export class RecreationDetector {
  constructor(options = {}) {
    this.recentlyUnmounted = new Map()
    this.recreationWindow = options.recreationWindow || 100
    this.maxTracked = options.maxTracked || 100
  }
  recordUnmount(instance, snapshot) {
    const key = this.getComponentKey(snapshot)
    const parentId = instance.parent?.uid
    this.recentlyUnmounted.set(key, {
      props: snapshot.props,
      timestamp: Date.now(),
      parentId,
      componentName: snapshot.componentName
    })
    if (this.recentlyUnmounted.size > this.maxTracked) {
      const oldest = [...this.recentlyUnmounted.entries()].sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0]
      this.recentlyUnmounted.delete(oldest[0])
    }
  }
  checkForRecreation(instance, snapshot) {
    const key = this.getComponentKey(snapshot)
    const parentId = instance.parent?.uid
    const unmountData = this.recentlyUnmounted.get(key)
    if (!unmountData) return null
    const timeSinceUnmount = Date.now() - unmountData.timestamp
    if (timeSinceUnmount <= this.recreationWindow && unmountData.parentId === parentId) {
      const propsMatch = this.compareProps(unmountData.props, snapshot.props)
      if (propsMatch.isSimilar) {
        this.recentlyUnmounted.delete(key)
        return {
          isRecreation: true,
          timeSinceUnmount,
          reason: 'component-recreation',
          details: `Component was unmounted and remounted within ${timeSinceUnmount}ms`,
          suggestions: [
            'Component is being recreated instead of updated',
            'Check for dynamic :key binding that changes unnecessarily',
            'Consider removing :key or using a stable key value',
            'This causes loss of component state and DOM recreation'
          ],
          propsDiff: propsMatch.diff
        }
      }
    }
    return null
  }
  compareProps(oldProps, newProps) {
    const oldKeys = Object.keys(oldProps)
    const newKeys = Object.keys(newProps)
    if (Math.abs(oldKeys.length - newKeys.length) > 2) {
      return { isSimilar: false }
    }
    let similarCount = 0
    const totalKeys = new Set([...oldKeys, ...newKeys]).size
    const diff = []
    for (const key of oldKeys) {
      if (key in newProps) {
        if (
          typeof oldProps[key] === 'string' &&
          oldProps[key].startsWith('[Function:') &&
          typeof newProps[key] === 'string' &&
          newProps[key].startsWith('[Function:')
        ) {
          similarCount++
        } else if (JSON.stringify(oldProps[key]) === JSON.stringify(newProps[key])) {
          similarCount++
        } else {
          diff.push({ key, old: oldProps[key], new: newProps[key] })
        }
      }
    }
    const similarity = totalKeys > 0 ? similarCount / totalKeys : 0
    return {
      isSimilar: similarity >= 0.7,
      similarity,
      diff
    }
  }
  getComponentKey(snapshot) {
    const propKeys = Object.keys(snapshot.props).sort().join(',')
    return `${snapshot.componentName}-${propKeys}`
  }
  cleanup() {
    const cutoff = Date.now() - this.recreationWindow * 2
    for (const [key, data] of this.recentlyUnmounted) {
      if (data.timestamp < cutoff) {
        this.recentlyUnmounted.delete(key)
      }
    }
  }
  clear() {
    this.recentlyUnmounted.clear()
  }
}
