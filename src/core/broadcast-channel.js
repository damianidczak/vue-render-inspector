/* global BroadcastChannel, localStorage */
let channel = null
let isSupported = false
try {
  isSupported = typeof BroadcastChannel !== 'undefined'
} catch {
  isSupported = false
}
export function initBroadcastChannel() {
  if (!isSupported) {
    console.warn('[VueRenderInspector] BroadcastChannel not supported, using localStorage fallback')
    return initLocalStorageFallback()
  }
  try {
    channel = new BroadcastChannel('vue-render-inspector')
    return channel
  } catch (_e) {
    console.error('[VueRenderInspector] Failed to create BroadcastChannel:', _e)
    return initLocalStorageFallback()
  }
}
export function broadcastRenderEvent(event) {
  if (channel && channel.postMessage) {
    channel.postMessage({
      type: 'render-event',
      data: event,
      timestamp: Date.now()
    })
  } else {
    broadcastViaLocalStorage(event)
  }
}
export function subscribeToRenderEvents(callback) {
  if (channel && channel.addEventListener) {
    const handler = event => {
      if (event.data && event.data.type === 'render-event') {
        callback(event.data.data)
      }
    }
    channel.addEventListener('message', handler)
    return () => {
      channel.removeEventListener('message', handler)
    }
  } else {
    return subscribeViaLocalStorage(callback)
  }
}
function initLocalStorageFallback() {
  return {
    postMessage: data => {
      broadcastViaLocalStorage(data.data)
    },
    addEventListener: (type, handler) => {
      if (type === 'message') {
        window.addEventListener('storage', e => {
          if (e.key === 'vue-render-inspector-event' && e.newValue) {
            try {
              const data = JSON.parse(e.newValue)
              handler({ data })
            } catch (_err) {
              console.error('[VueRenderInspector] Error parsing localStorage event:', _err)
            }
          }
        })
      }
    }
  }
}
function broadcastViaLocalStorage(event) {
  try {
    const data = {
      type: 'render-event',
      data: event,
      timestamp: Date.now()
    }
    localStorage.setItem('vue-render-inspector-event', JSON.stringify(data))
    setTimeout(() => {
      localStorage.removeItem('vue-render-inspector-event')
    }, 100)
  } catch (_e) {
    console.error('[VueRenderInspector] Error broadcasting via localStorage:', _e)
  }
}
function subscribeViaLocalStorage(callback) {
  const handler = e => {
    if (e.key === 'vue-render-inspector-event' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue)
        if (data.type === 'render-event') {
          callback(data.data)
        }
      } catch (_err) {
        console.error('[VueRenderInspector] Error parsing localStorage event:', _err)
      }
    }
  }
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('storage', handler)
  }
}
export function closeBroadcastChannel() {
  if (channel && channel.close) {
    channel.close()
    channel = null
  }
}
