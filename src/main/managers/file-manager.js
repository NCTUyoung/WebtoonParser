/**
 * 文件管理模块
 * 处理文件系统操作，如选择目录、加载和保存文件路径
 */

const { ipcMain, dialog } = require('electron')
const logger = require('../utils/logger')
const storageManager = require('./storage-manager')

/**
 * 注册文件系统相关的IPC处理程序
 * @param {Object} app - Electron app实例
 * @param {boolean} isTest - 是否在测试模式下运行
 */
function registerFileSystemHandlers(app, isTest) {
  // 目录选择
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    
    if (!result.canceled) {
      logger.logMessage('已选择新路径: ' + result.filePaths[0])
      return result.filePaths[0]
    }
    return null
  })

  // 保存路径管理
  ipcMain.handle('load-save-path', async () => {
    return await storageManager.getSavePath(isTest, () => app.getPath('downloads'))
  })

  ipcMain.on('save-save-path', (event, path) => {
    storageManager.saveSavePath(path, event)
  })
}

module.exports = {
  registerFileSystemHandlers
} 