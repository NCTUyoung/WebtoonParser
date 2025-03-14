/**
 * Window management module
 * Handles creation and management of Electron windows
 */

const { BrowserWindow, screen } = require('electron')
const path = require('path')
const config = require('../core/config')

// Store main window reference
let mainWindow = null

/**
 * Create application main window
 * @param {boolean} isDev - Whether to run in development mode
 * @returns {BrowserWindow} Created window instance
 */
function createWindow(isDev) {
  // Get primary display
  const primaryDisplay = screen.getPrimaryDisplay()
  const { scaleFactor } = primaryDisplay
  
  mainWindow = new BrowserWindow({
    width: config.app.window.width,
    height: config.app.window.height,
    webPreferences: {
      ...config.app.window.webPreferences,
      preload: path.join(__dirname, '../../preload/index.js')
    },
    // Additional settings to help with blurry UI
    backgroundColor: '#ffffff', // Prevents white flicker
    autoHideMenuBar: false,
    useContentSize: true,
    // For Windows high-DPI settings
    zoomFactor: 1.0
  })

  // Adjust content for high DPI displays
  if (scaleFactor > 1.0) {
    mainWindow.webContents.setZoomFactor(1.0)
  }

  // Set session default encoding
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          'Accept-Charset': 'UTF-8'
        }
      })
    }
  )

  if (isDev) {
    // Wait for development server to start
    setTimeout(() => {
      mainWindow.loadURL(`http://localhost:${config.app.dev.port}`)
    }, config.app.dev.devServerWaitTime)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  return mainWindow
}

/**
 * Get main window instance
 * @returns {BrowserWindow|null} Main window instance or null (if not created)
 */
function getMainWindow() {
  return mainWindow
}

module.exports = {
  createWindow,
  getMainWindow
} 