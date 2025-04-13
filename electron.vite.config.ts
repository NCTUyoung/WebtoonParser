import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: [
          'src/main/core/index.js',
          'src/main/core/config.js',
          'src/main/utils/logger.js',
          'src/main/managers/window-manager.js',
          'src/main/managers/scraping-manager.js',
          'src/main/managers/schedule-manager.js',
          'src/main/managers/storage-manager.js',
          'src/main/managers/file-manager.js',
          'src/main/managers/navigation-manager.js',
          'src/main/scraper/webtoon-scraper.js',
          'src/main/utils/file-helper.js',
          'src/main/scraper/request-throttler.js',
          'src/main/utils/utils.js',
          'src/main/scraper/webtoon-module.js',
          'src/main/excel-integration.js',
          'src/main/excel/index.js',
          'src/main/excel/core/ExcelManager.js',
          'src/main/excel/core/WorkbookProcessor.js',
          'src/main/excel/core/ExcelService.js',
          'src/main/excel/config/excel-config.js',
          'src/main/excel/utils/WorksheetBuilder.js',
          'src/main/excel/strategies/BaseStrategy.js',
          'src/main/excel/strategies/WebtoonStrategy.js',
          'src/main/excel/strategies/NovelStrategy.js',
          'src/main/excel/strategies/StrategyFactory.js',
          'src/main/excel-cli.js'
        ],
        output: {
          format: 'cjs',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].js'
        },
        external: ['electron-store']
      },
      outDir: 'out'
    }
  },
  preload: {
    build: {
      outDir: 'out/preload'
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
      },
      outDir: 'out/renderer'
    }
  }
})