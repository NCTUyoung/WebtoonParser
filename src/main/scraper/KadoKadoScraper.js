const axios = require('axios');
const cheerio = require('cheerio');
const Utils = require('../utils/utils');
const excelIntegration = require('../excel-integration');
const RequestThrottler = require('./request-throttler');
const { siteSelectors } = require('../core/config'); // 只導入需要的選擇器
const config = require('../core/config'); // 完整配置用於其他設置

class KadoKadoScraper {
  constructor(url, logFunction) {
    this.baseUrl = this.parseUrl(url);
    this.selectors = siteSelectors.kadokado; // 使用 KadoKado 的選擇器

    this.headers = {
      'User-Agent': Utils.getRandomElement(config.request.userAgents)
    };

    this.log = logFunction || Utils.createDefaultLogger();
    this.excelManager = excelIntegration.getExcelManager(this.log);

    // 創建請求節流器
    this.pageThrottler = new RequestThrottler(
      config.scraper.minPageDelay,
      config.scraper.maxPageDelay,
      this.log
    );
    // KadoKado 頁面結構簡單，可能不需要單獨的章節節流器
  }

  parseUrl(url) {
    // KadoKado URL 結構: https://www.kadokado.com.tw/book/xxxxx
    const match = url.match(/https:\/\/www\.kadokado\.com\.tw\/book\/(\d+)/);
    if (!match) {
      throw new Error('Invalid KadoKado URL');
    }
    // 直接返回基礎 URL，無需 titleNo
    return url.split('?')[0];
  }

  async getPage(url, retryCount = 0) {
    try {
      const fetchPageFn = async () => {
        this.log(`Fetching page: ${url}`)
        const response = await axios.get(url, {
          headers: {
            ...this.headers,
            'Accept-Charset': 'UTF-8'
          },
          responseType: 'arraybuffer'
        });
        return new TextDecoder('utf-8').decode(response.data);
      };

      return await this.pageThrottler.throttleRequest(fetchPageFn);
    } catch (error) {
      if (error.response?.status === 429 && retryCount < config.request.retryAttempts) {
        const delay = config.request.baseDelay + (retryCount * 2000) + Utils.getRandomDelay(0, config.request.randomDelayRange);
        this.log(`Encountered rate limit (429), waiting ${delay / 1000} seconds before retrying... (${retryCount + 1}/${config.request.retryAttempts})`);
        await Utils.sleep(delay);
        return this.getPage(url, retryCount + 1);
      }
      throw new Error(`Failed to fetch KadoKado page: ${error.message}`);
    }
  }

  async getNovelInfo() {
    this.log(`Starting to fetch novel information from: ${this.baseUrl}`);
    const html = await this.getPage(this.baseUrl);
    const $ = cheerio.load(html);

    const parseNumeric = (selector) => {
      const text = $(selector).text().trim();
      // 處理 '9.9 K' 這種格式
      const matchK = text.match(/([\d.]+)\s*K/i);
      if (matchK) {
        return parseFloat(matchK[1]) * 1000;
      }
      // 處理 '共 17 章' 這種格式
      const matchDigits = text.match(/\d+/);
      if (matchDigits) {
        return parseInt(matchDigits[0], 10);
      }
      return 0;
    };

    let author = $(this.selectors.author).text().trim();
    if (author && author.length > config.excel.authorMaxLength) {
        author = author.substring(0, config.excel.authorMaxLength);
    }

    const info = {
      title: $(this.selectors.title).text().trim(),
      author: author,
      description: $(this.selectors.description).text().trim(),
      likes: parseNumeric(this.selectors.likes),
      views: parseNumeric(this.selectors.views),
      status: $(this.selectors.status).text().trim(),
      totalChapters: parseNumeric(this.selectors.totalChapters),
      totalWords: parseNumeric(this.selectors.totalWords),
      // KadoKado 似乎沒有直接顯示更新日和訂閱數，暫留空或找替代
      updateDay: 'N/A',
      subscribers: 'N/A',
      rating: 'N/A', // KadoKado 評分系統不同
      scrapedAt: new Date().toISOString()
    };

    this.log(`Successfully fetched novel information: ${info.title} (Author: ${info.author})`);
    return info;
  }

  async getAllChapters() {
    this.log(`Fetching chapters from: ${this.baseUrl}`);
    const html = await this.getPage(this.baseUrl);
    const $ = cheerio.load(html);
    const chapters = [];
    const siteBaseUrl = 'https://www.kadokado.com.tw'; // 用於拼接相對路徑

    $(this.selectors.chapterListContainer).find(this.selectors.chapterItem).each((_, el) => {
      const $item = $(el);
      const $link = $item.find(this.selectors.chapterLink);
      const relativeUrl = $link.attr('href');

      const parseChapterNumeric = (selector) => {
        const text = $link.find(selector).text().trim();
        const matchK = text.match(/([\d.]+)\s*Ｋ/i); // 注意 K 是全形
        if (matchK) {
          return parseFloat(matchK[1]) * 1000;
        }
        const matchDigits = text.match(/\d+/);
        if (matchDigits) {
          return parseInt(matchDigits[0], 10);
        }
        return 0;
      };

      if (relativeUrl) {
          chapters.push({
            title: $link.find(this.selectors.chapterTitle).text().trim(),
            url: siteBaseUrl + relativeUrl,
            // KadoKado 章節號碼不明顯，先用 URL 提取
            number: relativeUrl.split('/').pop() || 'N/A',
            date: $link.find(this.selectors.chapterUpdateDate).text().trim(),
            // KadoKado 章節似乎沒有獨立的點讚數，先用字數替代？或留空
            likes: 'N/A', // 或者 parseChapterNumeric(this.selectors.chapterWords)
            words: parseChapterNumeric(this.selectors.chapterWords) // 新增字數欄位
          });
      }
    });

    // KadoKado 章節似乎是按時間順序排列，如果需要倒序，可以在此處 sort
    // chapters.sort((a, b) => /* 比較邏輯 */);

    this.log(`Retrieved ${chapters.length} chapters in total`);
    return chapters;
  }

  // KadoKado 頁面結構簡單，目前不需要 getTotalPages 邏輯

  async saveToExcel(info, chapters, externalSavePath, append = false, customFilename = null) {
    this.log(`开始保存 KadoKado 数据到 Excel...`);
    try {
      const result = await this.excelManager.saveWorkbook({
        info,
        chapters,
        savePath: externalSavePath,
        append,
        isNovel: true,
        filename: customFilename
      });
      
      // 提取文件路径并记录行添加情况
      const filePath = result.filePath;
      this.log(`Excel文件已保存到: ${filePath}`);
      
      if (result.rowAdded) {
        this.log(`成功添加数据行。行数: ${result.initialRowCount} -> ${result.finalRowCount}`);
      } else {
        this.log(`警告: 数据行可能未被正确添加到工作表: ${result.worksheetName}`);
      }
      
      return filePath;
    } catch (error) {
      this.log(`保存 KadoKado 数据时出错: ${error.message}`);
      throw error;
    }
  }
}

module.exports = KadoKadoScraper; 