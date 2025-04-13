/**
 * Scraping Manager Module
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

function registerScrapingHandlers() {
  ipcMain.handle('start-scraping', async (event, { urls, savePath, appendMode, customFilename }) => {
    const urlList = Array.isArray(urls) ? urls : (urls ? [urls] : []);

    if (urlList.length === 0) {
      logger.logError('Invalid scraping request: No valid URLs provided');
      return { success: false, error: 'No valid URLs provided', filePath: null };
    }

    const log = (message, type = 'info') => {
      if (type === 'error') {
        logger.logError(message);
      } else if (type === 'warn') {
        logger.logWarning(message);
      } else {
        logger.logInfo(message);
      }
      if (event?.sender) {
        event.sender.send('log-message', message, type);
      }
    };

    log(`Received scraping request for ${urlList.length} URL(s). SavePath: ${savePath || '[Default Downloads]'}, Append: ${appendMode}, Filename: ${customFilename || '[Default Naming]'}`);

    let lastFilePath = null;

    for (const url of urlList) {
      const result = await scrapeUrl(url, savePath, appendMode, customFilename, log);
      if (!result.success) {
        log(result.error, 'error');
        return { success: false, error: result.error, filePath: null };
      }
      lastFilePath = result.filePath;
      await Utils.sleep(config.scraper.urlProcessDelay || 500);
    }

    return { success: true, error: null, filePath: lastFilePath };
  });
}

async function scrapeUrl(url, externalSavePath, append, customFilename, log) {
  log(`開始處理 URL: ${url}`);

  const siteType = Object.entries(siteUrlPatterns).find(([_, pattern]) => pattern.test(url))?.[0];
  if (!siteType) {
    return { success: false, error: `Unsupported URL or site type: ${url}` };
  }

  log(`檢測到站點類型: ${siteType}`);

  const isNovel = siteType === 'kadokado';
  const scraper = isNovel ? new KadoKadoScraper(url, log) : new WebtoonScraper(url, log);

  log('獲取作品信息...');
  const info = await (isNovel ? scraper.getNovelInfo() : scraper.getWebtoonInfo());
  if (!info?.title) {
    return { success: false, error: `無法獲取基本信息: ${url}` };
  }

  log(`獲取到信息: ${info.title}`);
  log('開始獲取章節列表...');

  const chapters = await scraper.getAllChapters();
  log(`獲取到 ${chapters.length} 個章節 for ${info.title}`);

  log(`保存數據到 Excel...${append ? ' (附加模式)' : '(新文件/覆蓋模式)'}${customFilename ? ` 自定義文件名: ${customFilename}` : ''}`);

  const filePath = await scraper.saveToExcel(info, chapters, externalSavePath, append, customFilename);
  if (!filePath) {
    return { success: false, error: `保存 Excel 文件失敗 for: ${info.title}` };
  }

  log(`Excel 保存完成: ${filePath}`);
  return { success: true, filePath };
}

module.exports = {
  registerScrapingHandlers
};