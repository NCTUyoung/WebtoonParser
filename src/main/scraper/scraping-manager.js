/**
 * 爬虫管理模块
 * 处理网站爬取相关功能和任务
 */

const { ipcMain } = require('electron')
const WebtoonScraper = require('./webtoon-module')
const logger = require('../utils/logger')

/**
 * 注册爬虫相关的IPC处理程序
 * @param {boolean} isTest - 是否在测试模式下运行
 */
function registerScrapingHandlers(isTest) {
  ipcMain.handle('start-scraping', async (event, args) => {
    try {
      const { urlList, externalSavePath, append } = parseScrapingArgs(args, isTest)
      
      if (urlList.length === 0) {
        throw new Error('未提供有效URL')
      }
  
      const log = logger.createScopedLogger(event).log
      log(`开始爬取URL: ${urlList.join(', ')}${append ? ' (附加模式)' : '(覆盖模式)'}`)
      
      // 按顺序处理每个URL
      for (const url of urlList) {
        await scrapeUrl(url, externalSavePath, append, log)
      }
      
      log('所有URL处理完成')
      // 发送爬取完成事件
      log('发送爬取完成事件')
      event.sender.send('scraping-complete')
      return { success: true }
    } catch (error) {
      logger.logError(`爬取过程中出错: ${error.message}`)
      event.sender.send('scraping-error', `错误: ${error.message}`)
      return { success: false, error: error.message }
    }
  })
}

/**
 * 解析爬虫参数
 * @param {string|Object} args - 爬虫参数（URL字符串或包含URLs的对象）
 * @param {boolean} isTest - 是否在测试模式下运行
 * @returns {Object} 解析后的参数对象
 */
function parseScrapingArgs(args, isTest) {
  let urlList = []
  let externalSavePath = null
  let append = false
  
  // 如果args是字符串，则视为单个URL
  if (typeof args === 'string') {
    urlList = [args]
  } 
  // 如果args是对象，提取urls, savePath和append
  else if (typeof args === 'object' && args !== null) {
    urlList = Array.isArray(args.urls) ? args.urls : (args.urls ? [args.urls] : [])
    externalSavePath = args.savePath || null
    append = args.append === true // 确保append是布尔值
  }
  
  // 在测试模式下，使用环境变量中的临时下载路径
  if (isTest && process.env.TEMP_DOWNLOAD_PATH) {
    externalSavePath = process.env.TEMP_DOWNLOAD_PATH
  }
  
  return { urlList, externalSavePath, append }
}

/**
 * 爬取单个URL
 * @param {string} url - 要爬取的URL
 * @param {string|null} externalSavePath - 外部保存路径
 * @param {boolean} append - 是否附加到现有文件
 * @param {Function} log - 日志记录函数
 */
async function scrapeUrl(url, externalSavePath, append, log) {
  log(`开始爬取URL: ${url}`)
  
  // 创建爬虫实例，传递日志函数
  const scraper = new WebtoonScraper(url, log)
  
  log('获取漫画基本信息...')
  const info = await scraper.getWebtoonInfo()
  log('基本信息: ' + JSON.stringify(info, null, 2))
  
  log('开始获取章节列表...')
  const chapters = await scraper.getAllChapters()
  log(`获取到 ${chapters.length} 个章节`)
  
  log(`保存数据到Excel...${append ? ' (附加模式)' : '(覆盖模式)'}`)
  await scraper.saveToExcel(info, chapters, externalSavePath, append)
  log('Excel保存完成')
}

module.exports = {
  registerScrapingHandlers,
  parseScrapingArgs,
  scrapeUrl
} 