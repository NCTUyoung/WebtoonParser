/**
 * Main entry point for the Webtoon Parser application
 * Handles Electron application initialization and module integration
 */

const { app, BrowserWindow } = require('electron')
const config = require('./config')
const path = require('path')
const fs = require('fs')

// Disable GPU acceleration for specific cases to prevent blurry screen issues
app.disableHardwareAcceleration()

// Fix DPI scaling issues
app.commandLine.appendSwitch('high-dpi-support', 'true')
app.commandLine.appendSwitch('force-device-scale-factor', '1')

// Import modules
const windowManager = require('../managers/window-manager')
const logger = require('../utils/logger')
const scrapingManager = require('../scraper/scraping-manager')
const scheduleManager = require('../managers/schedule-manager')
const storageManager = require('../managers/storage-manager')
const fileManager = require('../managers/file-manager')
const navigationManager = require('../managers/navigation-manager')

// Constants
const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
process.env.LANG = config.app.defaultLocale

// Ensure required directories exist
function ensureDirectories() {
  // Create images directory for background images
  const imagesDir = path.join(app.getPath('userData'), 'images')
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true })
    logger.logMessage('Created images directory at: ' + imagesDir)
  }
}

/**
 * Application initialization
 */
function initializeApp() {
  app.whenReady().then(() => {
    // Ensure required directories exist
    ensureDirectories()
    
    // 注册所有IPC处理程序 - 注意顺序很重要，因为它们可能互相依赖
    // 首先注册存储管理器，因为其他管理器可能需要它
    storageManager.registerStorageHandlers()
    
    // 然后注册文件管理器，因为其他管理器可能需要文件操作
    fileManager.registerFileSystemHandlers(app, isTest)
    
    // 再注册其他管理器
    scrapingManager.registerScrapingHandlers(isTest)
    scheduleManager.registerScheduleHandlers(isTest)
    navigationManager.registerNavigationHandlers()
    
    // 最后创建窗口，这样所有处理程序都已准备就绪
    windowManager.createWindow(isDev)
    
    logger.logMessage('Application initialized')
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createWindow(isDev)
    }
  })
}

// Start the application
initializeApp() 