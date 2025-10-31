import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/components/**', 'src/stores/**', 'examples/**']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'vue-render-inspector': path.resolve(__dirname, './src/index.js')
    }
  }
})
