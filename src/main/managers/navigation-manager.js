/**
 * 导航管理模块
 * 处理应用程序中的导航和外部链接
 */

const { ipcMain, shell } = require('electron')
const logger = require('../utils/logger')

/**
 * 注册导航相关的IPC处理程序
 */
function registerNavigationHandlers() {
  // 处理在新窗口中打开URL
  ipcMain.on('open-external-url', (event, url) => {
    logger.logMessage(`打开外部URL: ${url}`)
    shell.openExternal(url).catch(error => {
      logger.logMessage(`无法打开URL: ${error.message}`, event)
    })
  })
}

module.exports = {
  registerNavigationHandlers
} 