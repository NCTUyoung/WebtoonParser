/**
 * Scraping Manager Module (整合版)
 * Handles website scraping functions and tasks, supporting multiple sites.
 */

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const WebtoonScraper = require('../scraper/webtoon-scraper');
const KadoKadoScraper = require('../scraper/KadoKadoScraper');
const { siteUrlPatterns } = require('../core/config');
const FileManager = require('./file-manager');
const logger = require('../utils/logger');
const Utils = require('../utils/utils');
const config = require('../core/config');

/**
 * 注册抓取相关的IPC处理程序
 */
function registerScrapingHandlers() {
  ipcMain.handle('start-scraping', async (event, { urls, savePath, appendMode, customFilename }) => {
    const urlList = Array.isArray(urls) ? urls : (urls ? [urls] : []);

    if (urlList.length === 0) {
      logger.logError('Invalid scraping request: No valid URLs provided');
      return { success: false, error: 'No valid URLs provided' };
    }

    const log = (message, type = 'info') => {
      if (type === 'error') {
        logger.logError(message);
      } else if (type === 'warn') {
        logger.logWarning(message);
      } else {
        logger.logInfo(message);
      }
      if (event && event.sender) {
        event.sender.send('log-message', message, type);
      }
    };

    log(`Received scraping request for ${urlList.length} URL(s). SavePath: ${savePath || '[Default Downloads]'}, Append: ${appendMode}, Filename: ${customFilename || '[Default Naming]'}`);

    let overallSuccess = true;
    let firstError = null;
    let lastFilePath = null;

    for (const url of urlList) {
      try {
        const filePath = await scrapeUrl(url, savePath, appendMode, customFilename, log);
        if (filePath) {
          lastFilePath = filePath;
        } else {
          throw new Error(`Processing failed for URL: ${url} (scrapeUrl returned non-path)`);
        }
      } catch (error) {
        log(`Error processing URL ${url}: ${error.message}`, 'error');
        overallSuccess = false;
        if (!firstError) {
          firstError = error.message;
        }
      }

      await Utils.sleep(config.scraper.urlProcessDelay || 500);
    }

    if (!overallSuccess) {
      return { success: false, error: `One or more URLs failed. First error: ${firstError || 'Unknown error'}` };
    }

    return { success: true, filePath: lastFilePath };
  });

  // ... 其他 IPC handlers ...
}

/**
 * 抓取单个URL的内容
 * @param {string} url - 要抓取的URL
 * @param {string} externalSavePath - 外部保存路径
 * @param {boolean} append - 是否追加模式
 * @param {string} customFilename - 自定义文件名
 * @param {Function} log - 日志记录函数
 * @returns {Promise<string>} 保存文件的路径
 */
async function scrapeUrl(url, externalSavePath, append, customFilename, log) {
  log(`开始处理 URL: ${url}`);

  let scraper;
  let siteType = null;
  let isNovel = false;

  for (const [type, pattern] of Object.entries(siteUrlPatterns)) {
    if (pattern.test(url)) {
      siteType = type;
      break;
    }
  }
  log(`檢測到站點類型: ${siteType}`);

  switch (siteType) {
    case 'webtoon':
      scraper = new WebtoonScraper(url, log);
      isNovel = false;
      break;
    case 'kadokado':
      scraper = new KadoKadoScraper(url, log);
      isNovel = true;
      break;
    default:
      throw new Error(`Unsupported URL or site type: ${url}`);
  }

  log('獲取作品信息...');
  const info = await (isNovel ? scraper.getNovelInfo() : scraper.getWebtoonInfo());
  if (!info || !info.title) {
    throw new Error(`無法獲取基本信息: ${url}`);
  }
  log(`獲取到信息: ${info.title}`);

  log('開始獲取章節列表...');
  const chapters = await scraper.getAllChapters();
  log(`獲取到 ${chapters.length} 個章節 for ${info.title}`);

  log(`保存數據到 Excel...${append ? ' (附加模式)' : '(新文件/覆蓋模式)'}${customFilename ? ` 自定義文件名: ${customFilename}` : ''}`);

  const filePath = await scraper.saveToExcel(info, chapters, externalSavePath, append, customFilename);

  if (!filePath) {
    throw new Error(`保存 Excel 文件失敗 for: ${info.title}`);
  }

  log(`Excel 保存完成: ${filePath}`);
  return filePath;
}

// 导出函数
module.exports = {
  registerScrapingHandlers
}; 