import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'VueRenderInspector',
      fileName: format => `vue-render-inspector.${format}.js`
    },
    rollupOptions: {
      external: ['vue', /\.vue$/],
      output: {
        globals: {
          vue: 'Vue'
        },
        exports: 'named'
      }
    }
  }
})
