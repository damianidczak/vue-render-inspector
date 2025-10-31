// Memory management for the visualizer
export class MemoryManager {
  constructor() {
    this.maxNodes = 5000
    this.maxHistoryPerNode = 20
    this.pruneInterval = 30000 // 30 seconds
    this.lastPrune = Date.now()
  }

  shouldPrune() {
    return Date.now() - this.lastPrune > this.pruneInterval
  }

  pruneNodes(nodes) {
    if (nodes.size <= this.maxNodes) return

    // Remove oldest inactive nodes
    const sorted = Array.from(nodes.values()).sort((a, b) => b.lastUpdateTime - a.lastUpdateTime)

    const toKeep = sorted.slice(0, this.maxNodes)
    nodes.clear()
    toKeep.forEach(node => nodes.set(node.uid, node))

    this.lastPrune = Date.now()
  }
}
