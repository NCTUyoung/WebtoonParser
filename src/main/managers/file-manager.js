/**
 * 文件管理模块
 * 处理文件系统操作，如选择目录、加载和保存文件路径
 */

const { ipcMain, dialog } = require('electron')
const fs = require('fs').promises // Use promises API
const path = require('path')
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
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory']
      })
      
      if (!result.canceled && result.filePaths.length > 0) {
        logger.logMessage(`Directory selected: ${result.filePaths[0]}`)
        return result.filePaths[0]
      }
      logger.logMessage('Directory selection cancelled.')
      return null
    } catch (error) {
      logger.logError('Error showing open directory dialog:', error)
      throw error // Re-throw error to be caught by renderer
    }
  })

  // 保存路径管理
  ipcMain.handle('load-save-path', async () => {
    return await storageManager.getSavePath(isTest, () => app.getPath('downloads'))
  })

  ipcMain.on('save-save-path', (event, path) => {
    storageManager.saveSavePath(path, event)
  })

  // Handler for listing Excel files in a directory
  ipcMain.handle('list-excel-files', async (event, directoryPath) => {
    if (!directoryPath) {
      logger.logMessage('list-excel-files: Warning - No directory path provided.')
      return [] // Return empty array if no path
    }

    try {
      logger.logMessage(`Listing Excel files in: ${directoryPath}`)
      const dirents = await fs.readdir(directoryPath, { withFileTypes: true })
      const excelFiles = dirents
        .filter(dirent => dirent.isFile() && dirent.name.toLowerCase().endsWith('.xlsx'))
        .map(dirent => dirent.name)
      
      logger.logMessage(`Found ${excelFiles.length} Excel files.`)
      return excelFiles
    } catch (error) {
      // Log specific error details
      logger.logError(
        `Error listing Excel files in ${directoryPath}: Code=${error.code}, Message=${error.message}`,
        error // Log the full error object as well for stack trace etc.
      )
      
      // Instead of returning [], throw the error so the renderer can catch it
      // throw new Error(`無法讀取目錄 '${directoryPath}': ${error.message}`); 
      // Or return an error object for the renderer to handle
      // For now, we keep returning [] but logging has improved.
      // A better approach is throwing, which requires renderer changes (Step 2)
      return [] // Keep returning empty for now, requires frontend change to handle thrown error
    }
  })
}

module.exports = {
  registerFileSystemHandlers
} 