import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    vue(),
    !process.env.VITEST && crx({ manifest }),
  ].filter(Boolean),
  build: {
    minify: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        worker: 'src/content/ai-worker.js',
        offscreen: 'offscreen.html',
        devtools: 'devtools.html',
        panel: 'devtools-panel.html'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'worker' ? 'assets/ai-worker.js' : 'assets/[name]-[hash].js';
        },
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@tensorflow')) {
              return 'tensorflow';
            }
            if (id.includes('vue')) {
              return 'vue';
            }
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  }
})
