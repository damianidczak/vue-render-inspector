import { captureProps, captureState } from './serialization.js'
export class ComponentSnapshot {
  constructor(instance, duration = null, timestamp = Date.now()) {
    this.timestamp = timestamp
    this.uid = instance.uid
    this.componentName = this.getComponentName(instance)
    this.duration = duration

    // Capture parent information
    if (instance.parent) {
      this.parentUid = instance.parent.uid
      this.parentName = this.getComponentName(instance.parent)
    } else {
      this.parentUid = null
      this.parentName = null
    }
    try {
      this.props = captureProps(instance.props)
    } catch (_e) {
      this.props = { __error: 'Failed to capture props' }
    }
    try {
      this.state = captureState(instance)
    } catch (_e) {
      this.state = { __error: 'Failed to capture state' }
    }
    this.metadata = {
      isMounted: instance.isMounted,
      isUnmounted: instance.isUnmounted,
      type: instance.type
    }

    // Add direct access to metadata fields for tests
    this.isMounted = instance.isMounted
    this.isUnmounted = instance.isUnmounted
  }
  getComponentName(instance) {
    if (!instance || !instance.type) return 'Anonymous'
    const name =
      instance.type.__name ||
      instance.type.name ||
      instance.type.__file?.split('/').pop()?.replace('.vue', '') ||
      'Anonymous'
    if (name === 'Component') {
      return (
        instance.type.__file?.split('/').pop()?.replace('.vue', '') ||
        `Component_${instance.uid}` ||
        'Component'
      )
    }
    return name
  }
  toLightweight() {
    return {
      uid: this.uid,
      timestamp: this.timestamp,
      componentName: this.componentName,
      props: this.props,
      state: this.state
    }
  }

  toJSON() {
    return {
      uid: this.uid,
      timestamp: this.timestamp,
      componentName: this.componentName,
      duration: this.duration,
      props: this.props,
      state: this.state,
      parentUid: this.parentUid,
      parentName: this.parentName,
      hasProps: Object.keys(this.props || {}).length > 0,
      hasState: Object.keys(this.state || {}).length > 0,
      metadata: this.metadata
    }
  }
}
export class SnapshotManager {
  constructor(options = {}) {
    this.maxHistorySize = options.maxHistorySize || 50
    this.snapshots = new Map()
    this.componentHistories = this.snapshots // Alias for tests
  }
  capture(instance, duration = null) {
    const snapshot = new ComponentSnapshot(instance, duration)
    if (!this.snapshots.has(instance.uid)) {
      this.snapshots.set(instance.uid, [])
    }
    const history = this.snapshots.get(instance.uid)
    history.push(snapshot)
    if (history.length > this.maxHistorySize) {
      history.shift()
    }
    return snapshot
  }
  getLatest(uid) {
    const history = this.snapshots.get(uid)
    if (!history || history.length === 0) return null
    return history[history.length - 1]
  }
  getPrevious(uid) {
    const history = this.snapshots.get(uid)
    if (!history || history.length < 2) return null
    return history[history.length - 2]
  }
  getHistory(uid, limit = null) {
    const history = this.snapshots.get(uid) || []
    if (limit && limit < history.length) {
      return history.slice(-limit)
    }
    return history
  }
  getSnapshotCount(uid) {
    const history = this.snapshots.get(uid)
    return history ? history.length : 0
  }
  clear(uid) {
    if (uid !== undefined) {
      this.snapshots.delete(uid)
    } else {
      this.snapshots.clear()
    }
  }

  clearComponent(uid) {
    this.snapshots.delete(uid)
  }

  clearAll() {
    this.snapshots.clear()
  }
  getTrackedComponentCount() {
    return this.snapshots.size
  }
  getTotalSnapshotCount() {
    let total = 0
    for (const history of this.snapshots.values()) {
      total += history.length
    }
    return total
  }
  pruneOldSnapshots(maxAge = 60000) {
    const cutoff = Date.now() - maxAge
    for (const [uid, history] of this.snapshots) {
      const filtered = history.filter(snapshot => snapshot.timestamp > cutoff)
      if (filtered.length === 0) {
        this.snapshots.delete(uid)
      } else {
        this.snapshots.set(uid, filtered)
      }
    }
  }
}
