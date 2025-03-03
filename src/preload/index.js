const { contextBridge, ipcRenderer } = require('electron')

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