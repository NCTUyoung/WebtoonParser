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

contextBridge.exposeInMainWorld('electron', {
  startScraping: (url) => ipcRenderer.invoke('start-scraping', url),
  send: (channel, data) => ipcRenderer.send(channel, data),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  on: (channel, callback) => {
    ipcRenderer.removeAllListeners(channel)
    ipcRenderer.on(channel, (event, ...args) => callback(...args))
    
    return () => {
      ipcRenderer.removeAllListeners(channel)
    }
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  },
  platform: process.platform
})