/**
 * 存储管理模块
 * 处理应用程序配置和数据的持久化存储
 */

const { ipcMain } = require('electron')
const Store = require('electron-store')
const config = require('../core/config')
const logger = require('../utils/logger')

// 创建存储实例
const store = new Store()

/**
 * 注册存储相关的IPC处理程序
 */
function registerStorageHandlers() {
  // URL存储
  ipcMain.handle('load-urls', () => {
    return store.get(config.storage.keys.urls, '')
  })

  ipcMain.on('save-urls', (event, urls) => {
    store.set(config.storage.keys.urls, urls)
  })

  // 计划设置存储
  ipcMain.handle('load-schedule-settings', () => {
    return store.get(config.storage.keys.scheduleSettings, {
      day: config.storage.defaults.scheduledDay,
      hour: config.storage.defaults.scheduledHour,
      minute: config.storage.defaults.scheduledMinute,
      timezone: config.storage.defaults.timezone
    })
  })

  ipcMain.on('save-schedule-settings', (event, settings) => {
    store.set(config.storage.keys.scheduleSettings, settings)
  })

  // URL历史记录存储
  ipcMain.handle('load-url-history', () => {
    return store.get(config.storage.keys.urlHistory, [])
  })

  ipcMain.on('save-url-history', (event, history) => {
    store.set(config.storage.keys.urlHistory, history)
  })
}

/**
 * 获取保存路径
 * @param {boolean} isTest - 是否在测试模式下运行
 * @param {Function} defaultPathProvider - 提供默认路径的函数
 * @returns {Promise<string>} 保存路径
 */
function getSavePath(isTest, defaultPathProvider) {
  // 在测试模式下，使用环境变量中的临时下载路径
  if (isTest && process.env.TEMP_DOWNLOAD_PATH) {
    return Promise.resolve(process.env.TEMP_DOWNLOAD_PATH)
  }
  
  try {
    const savedPath = store.get(config.storage.keys.savePath)
    logger.logMessage('加载保存路径: ' + savedPath)
    return Promise.resolve(savedPath || defaultPathProvider())
  } catch (error) {
    logger.logMessage('加载保存路径失败: ' + error.message)
    return Promise.resolve(defaultPathProvider())
  }
}

/**
 * 保存保存路径
 * @param {string} path - 要保存的路径
 * @param {Object} [event] - 包含sender属性的事件对象，用于向渲染进程发送消息
 */
function saveSavePath(path, event) {
  try {
    logger.logMessage(`保存路径已更新: ${path}`, event)
    store.set(config.storage.keys.savePath, path)
  } catch (error) {
    logger.logMessage(`保存路径失败: ${error.message}`, event)
  }
}

/**
 * 获取存储实例
 * @returns {Store} 存储实例
 */
function getStore() {
  return store
}

module.exports = {
  registerStorageHandlers,
  getSavePath,
  saveSavePath,
  getStore
} 