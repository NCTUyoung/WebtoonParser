/**
 * Main entry point for the Webtoon Parser application
 * Handles Electron application initialization and module integration
 */

const { app, BrowserWindow } = require('electron')
const config = require('./config')

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

/**
 * Application initialization
 */
function initializeApp() {
  app.whenReady().then(() => {
    // Create main window
    windowManager.createWindow(isDev)
    
    // Register all IPC handlers
    scrapingManager.registerScrapingHandlers(isTest)
    scheduleManager.registerScheduleHandlers(isTest)
    storageManager.registerStorageHandlers()
    fileManager.registerFileSystemHandlers(app, isTest)
    navigationManager.registerNavigationHandlers()
    
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