import { describe, it, expect, beforeEach } from 'vitest'

describe('Enhanced Event Listener Leaks Detection', () => {
  let mockInstance

  beforeEach(() => {
    mockInstance = {
      uid: 'test-123',
      type: {
        name: 'TestComponent'
      },
      $: {
        type: {
          mounted: null,
          unmounted: null
        }
      }
    }
  })

  describe('simpleDetect Function', () => {
    it('should detect addEventListener in mounted without cleanup', async () => {
      mockInstance.$.type.mounted = function () {
        window.addEventListener('resize', this.handleResize)
        document.addEventListener('click', this.handleClick)
      }

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should not detect when addEventListener is properly cleaned up', async () => {
      mockInstance.$.type.mounted = function () {
        window.addEventListener('resize', this.handleResize)
      }

      mockInstance.$.type.unmounted = function () {
        window.removeEventListener('resize', this.handleResize)
      }

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(false)
    })

    it('should detect addEventListener without any cleanup hook', async () => {
      mockInstance.$.type.mounted = function () {
        window.addEventListener('resize', this.handleResize)
        document.addEventListener('scroll', this.handleScroll)
      }

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should not detect when no addEventListener in mounted', async () => {
      mockInstance.$.type.mounted = function () {
        // No event listeners, just regular code
        this.data = []
        this.initializeComponent()
      }

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(false)
    })

    it('should handle missing mounted hook', async () => {
      mockInstance.$.type.mounted = null

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(false)
    })

    it('should handle missing unmounted hook', async () => {
      mockInstance.$.type.mounted = function () {
        window.addEventListener('resize', this.handleResize)
      }
      mockInstance.$.type.unmounted = null

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should detect multiple addEventListener calls', async () => {
      mockInstance.$.type.mounted = function () {
        window.addEventListener('resize', this.handleResize)
        window.addEventListener('scroll', this.handleScroll)
        document.addEventListener('click', this.handleClick)
        document.addEventListener('keydown', this.handleKeydown)
      }

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should detect element event listeners (not just global)', async () => {
      mockInstance.$.type.mounted = function () {
        const button = document.querySelector('button')
        const form = document.querySelector('form')
        button.addEventListener('click', this.handleClick)
        form.addEventListener('submit', this.handleSubmit)
      }

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should handle partial cleanup correctly', async () => {
      mockInstance.$.type.mounted = function () {
        window.addEventListener('resize', this.handleResize)
        window.addEventListener('scroll', this.handleScroll)
      }

      mockInstance.$.type.unmounted = function () {
        // Only removes one listener
        window.removeEventListener('resize', this.handleResize)
      }

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(mockInstance)

      // Still has addEventListener, but also has removeEventListener
      expect(result).toBe(false)
    })

    it('should handle listeners with options parameter', async () => {
      mockInstance.$.type.mounted = function () {
        window.addEventListener('scroll', this.handleScroll, { passive: true })
        document.addEventListener('click', this.handleClick, true)
      }

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should handle complex handler expressions', async () => {
      mockInstance.$.type.mounted = function () {
        window.addEventListener('resize', this.handleResize.bind(this))
        document.addEventListener('click', () => this.handleClick())
      }

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should handle missing instance.$ gracefully', async () => {
      const badInstance = { uid: 'test', type: { name: 'Test' } }

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(badInstance)

      expect(result).toBe(false)
    })

    it('should handle missing instance.$.type gracefully', async () => {
      const badInstance = { uid: 'test', type: { name: 'Test' }, $: {} }

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(badInstance)

      expect(result).toBe(false)
    })

    it('should convert mounted to string correctly', async () => {
      // Ensure .toString() is being called on the function
      mockInstance.$.type.mounted = {
        toString: () => 'window.addEventListener("resize", handleResize)'
      }

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(mockInstance)

      expect(result).toBe(true)
    })

    it('should detect when removeEventListener is in mounted (should still be leak)', async () => {
      mockInstance.$.type.mounted = function () {
        window.addEventListener('resize', this.handleResize)
        // Incorrectly trying to remove in mounted
        window.removeEventListener('scroll', this.handleScroll)
      }

      const { simpleDetect } = await import('../../../src/patterns/core/event-listener-leaks.js')
      const result = simpleDetect(mockInstance)

      // Should still detect leak since addEventListener is in mounted without unmounted
      expect(result).toBe(true)
    })
  })
})
