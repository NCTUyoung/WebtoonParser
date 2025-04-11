/**
 * 存储管理模块
 * 处理应用程序配置和数据的持久化存储
 */

const { ipcMain } = require('electron')
const Store = require('electron-store')
const config = require('../core/config')
const logger = require('../utils/logger')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

// 创建存储实例
const store = new Store()

// Constants
const STORAGE_PATH = path.join(app.getPath('userData'), 'storage.json')
const BACKGROUND_STORAGE_PATH = path.join(app.getPath('userData'), 'background-settings.json')
const IMAGES_DIR = path.join(app.getPath('userData'), 'images')

/**
 * 注册存储相关的IPC处理程序
 */
function registerStorageHandlers() {
  // 确保图片目录存在
  ensureImagesDirectory()
  
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
  
  // 背景设置相关处理程序
  
  // 保存背景设置
  ipcMain.on('save-background-settings', (event, settings) => {
    saveBackgroundSettings(settings)
  })
  
  // 加载背景设置
  ipcMain.handle('load-background-settings', async () => {
    return loadBackgroundSettings()
  })
  
  // 处理图片上传
  ipcMain.handle('upload-background-image', async (event, dataUrl) => {
    try {
      // 从数据URL中提取base64数据
      const imageData = dataUrl.split(',')[1]
      const imageBuffer = Buffer.from(imageData, 'base64')
      
      // 生成唯一文件名
      const imageName = `background-${Date.now()}.png`
      const imagePath = path.join(IMAGES_DIR, imageName)
      
      // 保存图片到磁盘
      fs.writeFileSync(imagePath, imageBuffer)
      
      // 在Electron中，使用asar:///協議或返回data URL更可靠
      // 將圖片轉為Base64 data URL
      const imageBase64 = imageBuffer.toString('base64')
      const mimeType = 'image/png'
      const dataURL = `data:${mimeType};base64,${imageBase64}`
      
      logger.logMessage(`背景图片已保存到 ${imagePath} 并转为 data URL`)
      return dataURL
    } catch (error) {
      logger.logError(`保存背景图片时出错: ${error.message}`)
      throw error
    }
  })
  
  // 处理图片重置
  ipcMain.handle('reset-background-image', async () => {
    try {
      // 检查背景设置文件是否存在
      if (fs.existsSync(BACKGROUND_STORAGE_PATH)) {
        // 读取当前设置
        const fileContent = fs.readFileSync(BACKGROUND_STORAGE_PATH, 'utf8')
        const settings = JSON.parse(fileContent)
        
        // 先尝试删除可能存在的文件
        // 处理file://协议的URL
        if (settings.type === 'custom' && settings.imageUrl) {
          if (settings.imageUrl.startsWith('file://')) {
            const imagePath = settings.imageUrl.replace('file://', '')
            // 如果文件存在则删除
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath)
              logger.logMessage(`已删除背景图片: ${imagePath}`)
            }
          } else if (settings.imageUrl.startsWith('data:')) {
            // 如果是data:URL，尝试从文件名判断对应的物理文件
            // 注意：这部分可能不够准确，因为我们没有存储data URL和物理文件的映射关系
            try {
              // 清理图片目录中的所有背景图片
              if (fs.existsSync(IMAGES_DIR)) {
                const files = fs.readdirSync(IMAGES_DIR)
                for (const file of files) {
                  if (file.startsWith('background-')) {
                    const filePath = path.join(IMAGES_DIR, file)
                    fs.unlinkSync(filePath)
                    logger.logMessage(`清理背景图片: ${filePath}`)
                  }
                }
              }
            } catch (err) {
              logger.logError(`清理背景图片时出错: ${err.message}`)
            }
          }
        }
        
        // 重置设置
        const defaultSettings = {
          type: 'default',
          imageUrl: '',
          opacity: 0.8,
          blur: 0
        }
        
        // 保存默认设置
        fs.writeFileSync(BACKGROUND_STORAGE_PATH, JSON.stringify(defaultSettings, null, 2))
        logger.logMessage('背景设置已重置为默认值')
        
        return defaultSettings
      }
      
      return {
        type: 'default',
        imageUrl: '',
        opacity: 0.8,
        blur: 0
      }
    } catch (error) {
      logger.logError(`重置背景图片时出错: ${error.message}`)
      throw error
    }
  })

  // Handler for loading custom filename setting
  ipcMain.handle('load-custom-filename', () => {
    try {
      const filename = store.get('customFilename');
      logger.logInfo(`Loaded custom filename: ${filename === undefined ? '[Not Set]' : filename}`);
      return filename === undefined ? '' : filename; // 返回空字符串作為默認值
    } catch (error) {
      logger.logError('Error loading custom filename:', error);
      return ''; // 出錯時也返回默認值
    }
  });

  // Handler for saving custom filename setting
  ipcMain.on('save-custom-filename', (event, filename) => {
    try {
      // Basic sanitization (remove path separators and invalid chars)
      const sanitizedFilename = filename ? filename.replace(/[\\\/\:\*\?\"\<\>\|]/g, '').trim() : '';
      store.set('customFilename', sanitizedFilename);
      logger.logInfo(`Custom filename saved: ${sanitizedFilename}`);
    } catch (error) {
      logger.logError('Error saving custom filename:', error);
    } 
  });
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
    logger.logError('加载保存路径失败: ' + error.message)
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
    logger.logError(`保存路径失败: ${error.message}`, event)
  }
}

/**
 * 获取存储实例
 * @returns {Store} 存储实例
 */
function getStore() {
  return store
}

/**
 * 保存数据到存储文件
 * @param {string} key - 键名
 * @param {any} value - 要保存的值
 * @returns {boolean} 是否保存成功
 */
function saveToStorage(key, value) {
  try {
    let data = {}
    
    // 如果文件存在，读取现有数据
    if (fs.existsSync(STORAGE_PATH)) {
      const fileContent = fs.readFileSync(STORAGE_PATH, 'utf8')
      data = JSON.parse(fileContent)
    }
    
    // 更新数据并保存
    data[key] = value
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2))
    
    logger.logMessage(`已保存 ${key} 到存储`)
    return true
  } catch (error) {
    logger.logError(`保存 ${key} 到存储时出错: ${error.message}`)
    return false
  }
}

/**
 * 从存储文件加载数据
 * @param {string} key - 键名
 * @param {any} defaultValue - 默认值
 * @returns {any} 加载的值或默认值
 */
function loadFromStorage(key, defaultValue) {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(STORAGE_PATH)) {
      return defaultValue
    }
    
    // 读取并解析文件
    const fileContent = fs.readFileSync(STORAGE_PATH, 'utf8')
    const data = JSON.parse(fileContent)
    
    // 返回值或默认值
    return data[key] !== undefined ? data[key] : defaultValue
  } catch (error) {
    logger.logError(`从存储加载 ${key} 时出错: ${error.message}`)
    return defaultValue
  }
}

/**
 * 保存背景设置到单独的文件
 * @param {Object} settings - 背景设置对象
 * @returns {boolean} 是否保存成功
 */
function saveBackgroundSettings(settings) {
  try {
    // 创建设置对象的安全副本，避免克隆错误
    const safeSettings = {
      type: settings.type || 'default',
      imageUrl: settings.imageUrl || '',
      opacity: typeof settings.opacity === 'number' ? settings.opacity : 0.8,
      blur: typeof settings.blur === 'number' ? settings.blur : 0
    }
    
    // 如果设置包含自定义图片的数据URL，将其保存到磁盘，但在设置中保留data URL格式
    if (safeSettings.type === 'custom' && safeSettings.imageUrl && safeSettings.imageUrl.startsWith('data:')) {
      const imageData = safeSettings.imageUrl.split(',')[1]
      const imageBuffer = Buffer.from(imageData, 'base64')
      const imageName = `background-${Date.now()}.png`
      const imagePath = path.join(IMAGES_DIR, imageName)
      
      // 保存图片到磁盘
      fs.writeFileSync(imagePath, imageBuffer)
      
      // 记录文件保存位置，但在设置中保留data URL
      logger.logMessage(`背景图片已保存到: ${imagePath}`)
      
      // 不修改imageUrl，保持为data URL
    }
    
    // 保存设置到文件
    fs.writeFileSync(BACKGROUND_STORAGE_PATH, JSON.stringify(safeSettings, null, 2))
    logger.logMessage('背景设置已保存')
    return true
  } catch (error) {
    logger.logError(`保存背景设置时出错: ${error.message}`)
    return false
  }
}

/**
 * 从文件加载背景设置
 * @returns {Object} 背景设置对象
 */
function loadBackgroundSettings() {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(BACKGROUND_STORAGE_PATH)) {
      return {
        type: 'default',
        imageUrl: '',
        opacity: 0.8,
        blur: 0
      }
    }
    
    // 读取并解析文件
    const fileContent = fs.readFileSync(BACKGROUND_STORAGE_PATH, 'utf8')
    const settings = JSON.parse(fileContent)
    
    // 处理可能存在的file://协议的URL，将其转换为data URL
    if (settings.type === 'custom' && settings.imageUrl && settings.imageUrl.startsWith('file://')) {
      try {
        // 從file://URL中提取路徑
        const imagePath = settings.imageUrl.replace('file://', '')
        
        // 检查文件是否存在
        if (fs.existsSync(imagePath)) {
          // 读取文件并转换为data URL
          const imageBuffer = fs.readFileSync(imagePath)
          const imageBase64 = imageBuffer.toString('base64')
          const mimeType = 'image/png'
          settings.imageUrl = `data:${mimeType};base64,${imageBase64}`
          logger.logMessage(`已将file://协议的图片转换为data URL`)
        } else {
          // 如果文件不存在，重置为默认设置
          logger.logError(`找不到背景图片: ${imagePath}，重置为默认设置`)
          settings.type = 'default'
          settings.imageUrl = ''
        }
      } catch (err) {
        logger.logError(`转换背景图片URL时出错: ${err.message}`)
        // 保持原样，依赖于webSecurity: false设置
      }
    }
    
    return settings
  } catch (error) {
    logger.logError(`加载背景设置时出错: ${error.message}`)
    return {
      type: 'default',
      imageUrl: '',
      opacity: 0.8,
      blur: 0
    }
  }
}

/**
 * 确保图片目录存在
 */
function ensureImagesDirectory() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true })
    logger.logMessage('已创建图片目录: ' + IMAGES_DIR)
  }
}

module.exports = {
  registerStorageHandlers,
  getSavePath,
  saveSavePath,
  getStore,
  saveToStorage,
  loadFromStorage,
  saveBackgroundSettings,
  loadBackgroundSettings,
  ensureImagesDirectory
} 