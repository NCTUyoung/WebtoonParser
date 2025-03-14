/**
 * Logging system module
 * Handles logging functionality in the application, supporting both console output and renderer process communication
 */

const iconv = require('iconv-lite')

/**
 * Log a message to console and optionally send to renderer process
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
  
  // If event parameter is provided, send message to frontend
  if (event && event.sender) {
    event.sender.send('log-message', message)
  }
}

/**
 * Create a scoped logger that sends logs to both console and renderer process
 * @param {Object} [event] - Event object containing sender property, used to send message to renderer process
 * @returns {Function} Log recording function that accepts message parameter
 */
function createScopedLogger(event) {
  return (message) => {
    logMessage(message)
    if (event && event.sender) {
      event.sender.send('log-message', message)
    }
  }
}

module.exports = {
  logMessage,
  createScopedLogger
} 