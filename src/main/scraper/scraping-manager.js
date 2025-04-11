/**
 * 爬虫管理模块
 * 处理网站爬取相关功能和任务
 */

const { ipcMain } = require('electron')
const WebtoonScraper = require('./webtoon-scraper')
const logger = require('../utils/logger')
const Utils = require('../utils/utils')

/**
 * 注册爬虫相关的IPC处理程序
 * @param {boolean} isTest - 是否在测试模式下运行
 */
function registerScrapingHandlers(isTest = false) {
  ipcMain.handle('start-scraping', async (event, { urls, savePath, appendMode, customFilename }) => {
    if (!Array.isArray(urls) || urls.length === 0) {
      logger.logError('Invalid scraping request: No valid URLs provided')
      return { success: false, error: 'No valid URLs provided' }
    }

    const log = (message, type = 'info') => {
      // Log to main process console
      if (type === 'error') {
        logger.logError(message)
      } else if (type === 'warn') {
        logger.logWarning(message)
      } else {
        logger.logInfo(message)
      }
      // Send log to renderer process
      if (event && event.sender) {
        event.sender.send('log-message', message, type)
      }
    }

    log(`Received scraping request for ${urls.length} URL(s). SavePath: ${savePath || '[Default Downloads]'}, Append: ${appendMode}, Filename: ${customFilename || '[Default Naming]'}`)

    // Basic sequential processing (consider concurrency control for large batches)
    let overallSuccess = true
    let firstError = null

    for (const url of urls) {
      try {
        log(`Processing URL: ${url}`)
        const scraper = new WebtoonScraper(url, log)
        
        const info = await scraper.getWebtoonInfo()
        if (!info || !info.title) {
          throw new Error(`Failed to fetch basic info for URL: ${url}`)
        }
        log(`Fetched info for: ${info.title}`)
        
        const chapters = await scraper.getAllChapters()
        log(`Fetched ${chapters.length} chapters for: ${info.title}`)
        
        // 傳遞 customFilename 給 saveToExcel
        const saved = await scraper.saveToExcel(info, chapters, savePath, appendMode, customFilename)
        
        if (!saved) {
          throw new Error(`Failed to save Excel file for: ${info.title}`)
        }
        log(`Successfully saved data for: ${info.title}`)

      } catch (error) {
        log(`Error processing URL ${url}: ${error.message}`, 'error')
        overallSuccess = false
        if (!firstError) {
          firstError = error.message // Store the first error message
        }
        // Continue to the next URL even if one fails?
        // Or break here: break;
      }
      
      // Add a small delay between processing URLs to be polite
      await Utils.sleep(config.scraper.urlProcessDelay || 500) // Use config or default
    }

    if (!overallSuccess) {
      return { success: false, error: `One or more URLs failed. First error: ${firstError || 'Unknown error'}` }
    }

    return { success: true }
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