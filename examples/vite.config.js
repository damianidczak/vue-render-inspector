import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  root: __dirname,

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      vue: 'vue/dist/vue.esm-bundler.js'
    }
  },

  // No library build for examples

  // Development server configuration
  server: {
    port: 5173,
    open: false,
    historyApiFallback: true
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['vue']
  }
})
