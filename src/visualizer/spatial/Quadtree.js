// Spatial indexing for efficient visibility queries
export class Quadtree {
  constructor(bounds, maxObjects = 10, maxLevels = 5, level = 0) {
    this.bounds = bounds
    this.maxObjects = maxObjects
    this.maxLevels = maxLevels
    this.level = level
    this.objects = []
    this.nodes = []
  }

  clear() {
    this.objects = []
    this.nodes.forEach(node => node.clear())
    this.nodes = []
  }

  split() {
    const { x, y, width, height } = this.bounds
    const subWidth = width / 2
    const subHeight = height / 2

    this.nodes[0] = new Quadtree(
      {
        x: x + subWidth,
        y,
        width: subWidth,
        height: subHeight
      },
      this.maxObjects,
      this.maxLevels,
      this.level + 1
    )

    this.nodes[1] = new Quadtree(
      {
        x,
        y,
        width: subWidth,
        height: subHeight
      },
      this.maxObjects,
      this.maxLevels,
      this.level + 1
    )

    this.nodes[2] = new Quadtree(
      {
        x,
        y: y + subHeight,
        width: subWidth,
        height: subHeight
      },
      this.maxObjects,
      this.maxLevels,
      this.level + 1
    )

    this.nodes[3] = new Quadtree(
      {
        x: x + subWidth,
        y: y + subHeight,
        width: subWidth,
        height: subHeight
      },
      this.maxObjects,
      this.maxLevels,
      this.level + 1
    )
  }

  getIndex(node) {
    const { x, y, width, height } = this.bounds
    const verticalMidpoint = x + width / 2
    const horizontalMidpoint = y + height / 2

    const nodeX = node.animX || node.targetX
    const nodeY = node.animY || node.targetY

    const topQuadrant = nodeY < horizontalMidpoint
    const bottomQuadrant = nodeY > horizontalMidpoint
    const leftQuadrant = nodeX < verticalMidpoint
    const rightQuadrant = nodeX > verticalMidpoint

    if (topQuadrant && rightQuadrant) return 0
    if (topQuadrant && leftQuadrant) return 1
    if (bottomQuadrant && leftQuadrant) return 2
    if (bottomQuadrant && rightQuadrant) return 3

    return -1
  }

  insert(node) {
    if (this.nodes.length > 0) {
      const index = this.getIndex(node)
      if (index !== -1) {
        this.nodes[index].insert(node)
        return
      }
    }

    this.objects.push(node)

    if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
      if (this.nodes.length === 0) {
        this.split()
      }

      let i = 0
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i])
        if (index !== -1) {
          this.nodes[index].insert(this.objects.splice(i, 1)[0])
        } else {
          i++
        }
      }
    }
  }

  retrieve(bounds) {
    const objects = []

    if (!this.intersects(bounds)) {
      return objects
    }

    objects.push(...this.objects)

    if (this.nodes.length > 0) {
      for (let i = 0; i < this.nodes.length; i++) {
        objects.push(...this.nodes[i].retrieve(bounds))
      }
    }

    return objects
  }

  intersects(bounds) {
    return !(
      bounds.x > this.bounds.x + this.bounds.width ||
      bounds.x + bounds.width < this.bounds.x ||
      bounds.y > this.bounds.y + this.bounds.height ||
      bounds.y + bounds.height < this.bounds.y
    )
  }
}
