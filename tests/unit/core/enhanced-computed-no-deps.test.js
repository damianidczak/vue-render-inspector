import { describe, it, expect, beforeEach } from 'vitest'

describe('Enhanced Computed No Dependencies Detection', () => {
  let mockInstance

  beforeEach(() => {
    mockInstance = {
      uid: 'test-123',
      type: {
        name: 'TestComponent',
        computed: {}
      }
    }
  })

  describe('simpleDetect Function', () => {
    it('should detect computed using new Date', async () => {
      mockInstance.type.computed = {
        currentTime() {
          return new Date().toISOString()
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should detect computed using Math.random', async () => {
      mockInstance.type.computed = {
        randomId() {
          return Math.random().toString(36)
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should detect computed using window', async () => {
      mockInstance.type.computed = {
        windowWidth() {
          return window.innerWidth
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should detect computed using document', async () => {
      mockInstance.type.computed = {
        title() {
          return document.title
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should not detect normal reactive computed', async () => {
      mockInstance.type.computed = {
        fullName() {
          return `${this.firstName} ${this.lastName}`
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(false)
    })

    it('should not detect computed with reactive dependencies only', async () => {
      mockInstance.type.computed = {
        filteredItems() {
          return this.items.filter(item => item.active)
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(false)
    })

    it('should detect computed with getter function', async () => {
      mockInstance.type.computed = {
        timestamp: {
          get() {
            return new Date().getTime()
          }
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should detect multiple suspicious computed properties', async () => {
      mockInstance.type.computed = {
        currentTime() {
          return new Date()
        },
        randomValue() {
          return Math.random()
        },
        screenWidth() {
          return window.innerWidth
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should detect window properties in computed', async () => {
      mockInstance.type.computed = {
        location() {
          return window.location.href
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should detect document properties in computed', async () => {
      mockInstance.type.computed = {
        activeElement() {
          return document.activeElement
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should handle missing computed gracefully', async () => {
      mockInstance.type.computed = null

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(false)
    })

    it('should handle empty computed object', async () => {
      mockInstance.type.computed = {}

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(false)
    })

    it('should handle missing instance.type gracefully', async () => {
      const badInstance = { uid: 'test' }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(badInstance)

      expect(result).toBe(false)
    })

    it('should detect Date methods besides new Date', async () => {
      mockInstance.type.computed = {
        now() {
          return new Date().now()
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should not detect computed using Math (not random)', async () => {
      mockInstance.type.computed = {
        rounded() {
          return Math.round(this.value)
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(false)
    })

    it('should detect computed with multiple non-reactive dependencies', async () => {
      mockInstance.type.computed = {
        complexValue() {
          const timestamp = new Date().getTime()
          const random = Math.random()
          const width = window.innerWidth
          return { timestamp, random, width }
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should handle computed with both get and set', async () => {
      mockInstance.type.computed = {
        currentDate: {
          get() {
            return new Date()
          },
          set(value) {
            this.date = value
          }
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should not detect safe computed with reactive data', async () => {
      mockInstance.type.computed = {
        sortedItems() {
          return [...this.items].sort((a, b) => a.value - b.value)
        },
        total() {
          return this.items.reduce((sum, item) => sum + item.price, 0)
        }
      }

      const { simpleDetect } = await import('../../../src/patterns/core/computed-no-deps.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(false)
    })
  })
})
