import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('BroadcastChannel Module', () => {
  let mockChannel
  let originalBroadcastChannel
  let originalLocalStorage
  let originalWindow

  beforeEach(() => {
    // Save originals
    originalBroadcastChannel = global.BroadcastChannel
    originalLocalStorage = global.localStorage
    originalWindow = global.window

    // Setup minimal window
    global.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    // Setup localStorage mock
    const localStorageData = {}
    global.localStorage = {
      getItem: vi.fn(key => localStorageData[key] || null),
      setItem: vi.fn((key, value) => {
        localStorageData[key] = value
      }),
      removeItem: vi.fn(key => {
        delete localStorageData[key]
      }),
      clear: vi.fn(() => {
        Object.keys(localStorageData).forEach(key => delete localStorageData[key])
      })
    }

    // Setup BroadcastChannel mock
    mockChannel = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn()
    }

    global.BroadcastChannel = vi.fn(() => mockChannel)

    // Clear module cache to reset state
    vi.resetModules()
  })

  afterEach(() => {
    // Restore originals
    global.BroadcastChannel = originalBroadcastChannel
    global.localStorage = originalLocalStorage
    global.window = originalWindow
    vi.restoreAllMocks()
  })

  describe('initBroadcastChannel', () => {
    it('should create BroadcastChannel when supported', async () => {
      const { initBroadcastChannel } = await import('../../../src/core/broadcast-channel.js')

      const channel = initBroadcastChannel()

      expect(global.BroadcastChannel).toHaveBeenCalledWith('vue-render-inspector')
      expect(channel).toBe(mockChannel)
    })

    it('should use localStorage fallback when BroadcastChannel throws error', async () => {
      global.BroadcastChannel = vi.fn(() => {
        throw new Error('BroadcastChannel creation failed')
      })

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { initBroadcastChannel } = await import('../../../src/core/broadcast-channel.js')
      const channel = initBroadcastChannel()

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(channel).toHaveProperty('postMessage')
      expect(channel).toHaveProperty('addEventListener')

      consoleErrorSpy.mockRestore()
    })

    it('should use localStorage fallback when BroadcastChannel is undefined', async () => {
      delete global.BroadcastChannel

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { initBroadcastChannel } = await import('../../../src/core/broadcast-channel.js')
      const channel = initBroadcastChannel()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('BroadcastChannel not supported')
      )
      expect(channel).toHaveProperty('postMessage')
      expect(channel).toHaveProperty('addEventListener')

      consoleWarnSpy.mockRestore()
    })
  })

  describe('broadcastRenderEvent', () => {
    it('should broadcast event via BroadcastChannel when available', async () => {
      const { initBroadcastChannel, broadcastRenderEvent } = await import(
        '../../../src/core/broadcast-channel.js'
      )

      initBroadcastChannel()

      const testEvent = { componentName: 'TestComponent', renderTime: 10 }
      broadcastRenderEvent(testEvent)

      expect(mockChannel.postMessage).toHaveBeenCalledWith({
        type: 'render-event',
        data: testEvent,
        timestamp: expect.any(Number)
      })
    })

    it('should broadcast via localStorage when channel not available', async () => {
      delete global.BroadcastChannel

      const { broadcastRenderEvent } = await import('../../../src/core/broadcast-channel.js')

      const testEvent = { componentName: 'TestComponent', renderTime: 15 }
      broadcastRenderEvent(testEvent)

      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'vue-render-inspector-event',
        expect.stringContaining('render-event')
      )
    })

    it('should handle localStorage errors gracefully', async () => {
      delete global.BroadcastChannel

      global.localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded')
      })

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { broadcastRenderEvent } = await import('../../../src/core/broadcast-channel.js')

      const testEvent = { componentName: 'TestComponent' }

      expect(() => {
        broadcastRenderEvent(testEvent)
      }).not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('subscribeToRenderEvents', () => {
    it('should subscribe to BroadcastChannel events', async () => {
      const { initBroadcastChannel, subscribeToRenderEvents } = await import(
        '../../../src/core/broadcast-channel.js'
      )

      initBroadcastChannel()

      const callback = vi.fn()
      const unsubscribe = subscribeToRenderEvents(callback)

      expect(mockChannel.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))

      // Simulate message
      const handler = mockChannel.addEventListener.mock.calls[0][1]
      handler({
        data: {
          type: 'render-event',
          data: { componentName: 'TestComponent' }
        }
      })

      expect(callback).toHaveBeenCalledWith({ componentName: 'TestComponent' })

      // Test unsubscribe
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
      expect(mockChannel.removeEventListener).toHaveBeenCalledWith('message', handler)
    })

    it('should filter non-render-event messages', async () => {
      const { initBroadcastChannel, subscribeToRenderEvents } = await import(
        '../../../src/core/broadcast-channel.js'
      )

      initBroadcastChannel()

      const callback = vi.fn()
      subscribeToRenderEvents(callback)

      const handler = mockChannel.addEventListener.mock.calls[0][1]

      // Send non-render-event message
      handler({
        data: {
          type: 'other-event',
          data: { something: 'else' }
        }
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it('should subscribe via localStorage when channel not available', async () => {
      delete global.BroadcastChannel

      const { subscribeToRenderEvents } = await import('../../../src/core/broadcast-channel.js')

      const callback = vi.fn()
      const unsubscribe = subscribeToRenderEvents(callback)

      expect(global.window.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function))

      // Test unsubscribe
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
      expect(global.window.removeEventListener).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      )
    })

    it('should handle localStorage events correctly', async () => {
      delete global.BroadcastChannel

      const { subscribeToRenderEvents } = await import('../../../src/core/broadcast-channel.js')

      const callback = vi.fn()
      subscribeToRenderEvents(callback)

      const storageHandler = global.window.addEventListener.mock.calls[0][1]

      // Simulate storage event
      const testData = {
        type: 'render-event',
        data: { componentName: 'TestComponent', renderTime: 20 },
        timestamp: Date.now()
      }

      storageHandler({
        key: 'vue-render-inspector-event',
        newValue: JSON.stringify(testData)
      })

      expect(callback).toHaveBeenCalledWith({ componentName: 'TestComponent', renderTime: 20 })
    })

    it('should ignore non-matching localStorage keys', async () => {
      delete global.BroadcastChannel

      const { subscribeToRenderEvents } = await import('../../../src/core/broadcast-channel.js')

      const callback = vi.fn()
      subscribeToRenderEvents(callback)

      const storageHandler = global.window.addEventListener.mock.calls[0][1]

      storageHandler({
        key: 'other-key',
        newValue: JSON.stringify({ data: 'test' })
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle invalid JSON in localStorage events', async () => {
      delete global.BroadcastChannel

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { subscribeToRenderEvents } = await import('../../../src/core/broadcast-channel.js')

      const callback = vi.fn()
      subscribeToRenderEvents(callback)

      const storageHandler = global.window.addEventListener.mock.calls[0][1]

      storageHandler({
        key: 'vue-render-inspector-event',
        newValue: 'invalid json{'
      })

      expect(callback).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should ignore localStorage events without newValue', async () => {
      delete global.BroadcastChannel

      const { subscribeToRenderEvents } = await import('../../../src/core/broadcast-channel.js')

      const callback = vi.fn()
      subscribeToRenderEvents(callback)

      const storageHandler = global.window.addEventListener.mock.calls[0][1]

      storageHandler({
        key: 'vue-render-inspector-event',
        newValue: null
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('localStorage fallback', () => {
    it('should create localStorage fallback object with correct structure', async () => {
      delete global.BroadcastChannel

      const { initBroadcastChannel } = await import('../../../src/core/broadcast-channel.js')

      const fallbackChannel = initBroadcastChannel()

      expect(fallbackChannel).toHaveProperty('postMessage')
      expect(fallbackChannel).toHaveProperty('addEventListener')
      expect(typeof fallbackChannel.postMessage).toBe('function')
      expect(typeof fallbackChannel.addEventListener).toBe('function')
    })

    it('should broadcast via localStorage through fallback postMessage', async () => {
      delete global.BroadcastChannel

      const { initBroadcastChannel } = await import('../../../src/core/broadcast-channel.js')

      const fallbackChannel = initBroadcastChannel()
      const testData = { componentName: 'FallbackComponent' }

      fallbackChannel.postMessage({
        type: 'render-event',
        data: testData
      })

      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'vue-render-inspector-event',
        expect.stringContaining('FallbackComponent')
      )
    })

    it('should setup storage listener through fallback addEventListener', async () => {
      delete global.BroadcastChannel

      const { initBroadcastChannel } = await import('../../../src/core/broadcast-channel.js')

      const fallbackChannel = initBroadcastChannel()
      const handler = vi.fn()

      fallbackChannel.addEventListener('message', handler)

      expect(global.window.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function))
    })

    it('should parse and forward localStorage events through fallback', async () => {
      delete global.BroadcastChannel

      const { initBroadcastChannel } = await import('../../../src/core/broadcast-channel.js')

      const fallbackChannel = initBroadcastChannel()
      const handler = vi.fn()

      fallbackChannel.addEventListener('message', handler)

      const storageHandler = global.window.addEventListener.mock.calls[0][1]

      const testData = {
        type: 'render-event',
        data: { componentName: 'StorageComponent' }
      }

      storageHandler({
        key: 'vue-render-inspector-event',
        newValue: JSON.stringify(testData)
      })

      expect(handler).toHaveBeenCalledWith({
        data: testData
      })
    })

    it('should handle parse errors in fallback addEventListener', async () => {
      delete global.BroadcastChannel

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { initBroadcastChannel } = await import('../../../src/core/broadcast-channel.js')

      const fallbackChannel = initBroadcastChannel()
      const handler = vi.fn()

      fallbackChannel.addEventListener('message', handler)

      const storageHandler = global.window.addEventListener.mock.calls[0][1]

      storageHandler({
        key: 'vue-render-inspector-event',
        newValue: 'invalid{json'
      })

      expect(handler).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should cleanup localStorage event after timeout', async () => {
      vi.useFakeTimers()

      delete global.BroadcastChannel

      const { broadcastRenderEvent } = await import('../../../src/core/broadcast-channel.js')

      const testEvent = { componentName: 'TimeoutComponent' }
      broadcastRenderEvent(testEvent)

      expect(global.localStorage.setItem).toHaveBeenCalled()
      expect(global.localStorage.removeItem).not.toHaveBeenCalled()

      // Fast-forward 100ms
      vi.advanceTimersByTime(100)

      expect(global.localStorage.removeItem).toHaveBeenCalledWith('vue-render-inspector-event')

      vi.useRealTimers()
    })
  })

  describe('closeBroadcastChannel', () => {
    it('should close channel when available', async () => {
      const { initBroadcastChannel, closeBroadcastChannel } = await import(
        '../../../src/core/broadcast-channel.js'
      )

      initBroadcastChannel()
      closeBroadcastChannel()

      expect(mockChannel.close).toHaveBeenCalled()
    })

    it('should handle missing close method gracefully', async () => {
      const { initBroadcastChannel, closeBroadcastChannel } = await import(
        '../../../src/core/broadcast-channel.js'
      )

      initBroadcastChannel()

      // Remove close method
      delete mockChannel.close

      expect(() => {
        closeBroadcastChannel()
      }).not.toThrow()
    })

    it('should handle null channel gracefully', async () => {
      const { closeBroadcastChannel } = await import('../../../src/core/broadcast-channel.js')

      // Don't initialize channel
      expect(() => {
        closeBroadcastChannel()
      }).not.toThrow()
    })
  })

  describe('Edge cases', () => {
    it('should handle missing data in subscription callback', async () => {
      const { initBroadcastChannel, subscribeToRenderEvents } = await import(
        '../../../src/core/broadcast-channel.js'
      )

      initBroadcastChannel()

      const callback = vi.fn()
      subscribeToRenderEvents(callback)

      const handler = mockChannel.addEventListener.mock.calls[0][1]

      // Send message without data
      handler({ data: null })

      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle postMessage without method', async () => {
      const { initBroadcastChannel, broadcastRenderEvent } = await import(
        '../../../src/core/broadcast-channel.js'
      )

      initBroadcastChannel()

      // Remove postMessage
      delete mockChannel.postMessage

      const testEvent = { componentName: 'NoMethodComponent' }

      expect(() => {
        broadcastRenderEvent(testEvent)
      }).not.toThrow()

      // Should fallback to localStorage
      expect(global.localStorage.setItem).toHaveBeenCalled()
    })

    it('should handle addEventListener without method', async () => {
      const { initBroadcastChannel, subscribeToRenderEvents } = await import(
        '../../../src/core/broadcast-channel.js'
      )

      initBroadcastChannel()

      // Remove addEventListener
      delete mockChannel.addEventListener

      const callback = vi.fn()

      expect(() => {
        subscribeToRenderEvents(callback)
      }).not.toThrow()

      // Should fallback to localStorage
      expect(global.window.addEventListener).toHaveBeenCalled()
    })
  })
})
