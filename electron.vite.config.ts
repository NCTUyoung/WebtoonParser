import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['electron-store']
      }
    }
  },
  renderer: {
    server: {
      port: 3000,
      strictPort: true
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer')
      }
    },
    plugins: [
      vue(),
      renderer()
    ],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    }
  }
}) 