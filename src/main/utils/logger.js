/**
 * Logging system module
 * Handles logging functionality in the application, supporting both console output and renderer process communication
 */

const iconv = require('iconv-lite')
const windowManager = require('../managers/window-manager')

/**
 * 发送日志消息到前端
 * @param {string} message - 要发送的日志消息
 * @param {Object} [event] - 可选的事件对象，包含sender属性
 */
function sendToRenderer(message, event) {
  // 如果提供了event并且有sender属性，直接使用它发送
  if (event && event.sender) {
    event.sender.send('log-message', message)
    return
  }
  
  // 否则尝试通过主窗口发送
  const mainWindow = windowManager.getMainWindow()
  if (mainWindow && mainWindow.webContents) {
    try {
      mainWindow.webContents.send('log-message', message)
    } catch (e) {
      // 如果发送失败，只在控制台记录错误，不进一步处理
      console.error('Error sending log to renderer:', e.message)
    }
  }
}

/**
 * Log a message to console and send to renderer process
 * @param {string} message - Message to log
 * @param {Object} [event] - Event object containing sender property, used to send message to renderer process
 */
function logMessage(message, event) {
  // Handle Big5 encoding on Windows platform
  if (process.platform === 'win32') {
    try {
      const encoded = iconv.encode(message + '\n', 'big5')
      process.stdout.write(encoded)
    } catch (error) {
      console.log('[Encoding Error]', message)
    }
  } else {
    console.log(message)
  }
  
  // 总是尝试发送到前端
  sendToRenderer(message, event)
}

/**
 * Log an error message to console and send to renderer process
 * @param {string} message - Error message to log
 * @param {Object} [event] - Event object containing sender property, used to send message to renderer process
 */
function logError(message, event) {
  // 在控制台中使用红色标记错误
  console.error(`[ERROR] ${message}`)
  
  // 发送到前端时添加错误标记
  sendToRenderer(`[錯誤] ${message}`, event)
}

/**
 * Log an info message to console and send to renderer process
 * @param {string} message - Info message to log
 * @param {Object} [event] - Event object containing sender property, used to send message to renderer process
 */
function logInfo(message, event) {
  // 在控制台中记录信息
  console.log(`[INFO] ${message}`)
  
  // 发送到前端
  sendToRenderer(`[信息] ${message}`, event)
}

/**
 * Log a warning message to console and send to renderer process
 * @param {string} message - Warning message to log
 * @param {Object} [event] - Event object containing sender property, used to send message to renderer process
 */
function logWarning(message, event) {
  // 在控制台中使用黄色标记警告
  console.warn(`[WARN] ${message}`)
  
  // 发送到前端时添加警告标记
  sendToRenderer(`[警告] ${message}`, event)
}

/**
 * Create a scoped logger that sends logs to both console and renderer process
 * @param {Object} [event] - Event object containing sender property, used to send message to renderer process
 * @returns {Object} Log functions: log, error
 */
function createScopedLogger(event) {
  return {
    log: (message) => logMessage(message, event),
    info: (message) => logInfo(message, event),
    warn: (message) => logWarning(message, event),
    error: (message) => logError(message, event)
  }
}

module.exports = {
  logMessage,
  logInfo,
  logWarning,
  logError,
  createScopedLogger
} 