const { contextBridge, ipcRenderer } = require('electron')

// Add CSS to fix DPI scaling issues
function addDpiFixingStyles() {
  document.addEventListener('DOMContentLoaded', () => {
    // Create a style element
    const style = document.createElement('style')

    // Add CSS to fix text rendering
    style.textContent = `
      * {
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      /* Prevent blurry text at non-integer scaling factors */
      @media (-webkit-min-device-pixel-ratio: 1.5), (min-resolution: 144dpi) {
        * {
          font-weight: 400 !important;
        }
      }
    `

    // Append to document head
    document.head.appendChild(style)
  })
}

// Initialize DPI fixes
addDpiFixingStyles()

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Send messages to main process
  send: (channel, data) => {
    // Whitelist channels
    const validChannels = [
      'save-urls',
      'save-schedule-settings',
      'start-schedule',
      'stop-schedule',
      'save-save-path',
      'open-external-link',
      'save-background-settings',
      'save-url-history',
      'save-custom-filename',
      'save-append-mode'
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },

  // Invoke methods and receive response
  invoke: (channel, data) => {
    const validChannels = [
      'start-scraping',
      'load-urls',
      'load-schedule-settings',
      'load-save-path',
      'select-directory',
      'load-background-settings',
      'upload-background-image',
      'reset-background-image',
      'load-url-history',
      'load-custom-filename',
      'list-excel-files',
      'load-append-mode'
    ]
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data)
    }

    return Promise.reject(new Error(`未授權調用通道 "${channel}"`))
  },

  // Register event listeners
  on: (channel, callback) => {
    const validChannels = [
      'log-message',
      'scraping-complete',
      'scraping-error',
      'schedule-trigger',
      'next-run-time'
    ]
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => callback(...args))
    }
  },

  // Remove all listeners for a channel
  removeAllListeners: (channel) => {
    const validChannels = [
      'log-message',
      'scraping-complete',
      'scraping-error',
      'schedule-trigger',
      'next-run-time'
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel)
    }
  },

  platform: process.platform
})