const axios = require('axios');
const cheerio = require('cheerio');
const Utils = require('../utils/utils');
const excelIntegration = require('../excel-integration');
const RequestThrottler = require('./request-throttler');
const config = require('../core/config'); // 导入完整配置

class KadoKadoScraper {
  constructor(url, logFunction) {
    this.baseUrl = this.parseUrl(url);
    this.titleId = this.extractTitleId(url);
    this.selectors = config.selectors.kadokado; // 正确引用kadokado选择器

    this.headers = {
      'User-Agent': Utils.getRandomElement(config.request.userAgents),
      'Accept': 'application/json',
      'Region': 'GLOBAL',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Mode': 'cors'
    };

    this.log = logFunction || Utils.createDefaultLogger();
    this.excelManager = excelIntegration.getExcelManager(this.log);

    // 創建請求節流器
    this.pageThrottler = new RequestThrottler(
      config.scraper.minPageDelay,
      config.scraper.maxPageDelay,
      this.log
    );
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

  extractTitleId(url) {
    const match = url.match(/https:\/\/www\.kadokado\.com\.tw\/book\/(\d+)/);
    if (!match) {
      throw new Error('Invalid KadoKado URL - Cannot extract title ID');
    }
    return match[1];
  }

  async getApi(endpoint, retryCount = 0) {
    try {
      const fetchApiFn = async () => {
        this.log(`Fetching API: ${endpoint}`);
        const response = await axios.get(endpoint, {
          headers: this.headers,
          responseType: 'json'
        });
        return response.data;
      };

      return await this.pageThrottler.throttleRequest(fetchApiFn);
    } catch (error) {
      if (error.response?.status === 429 && retryCount < config.request.retryAttempts) {
        const delay = config.request.baseDelay + (retryCount * 2000) + Utils.getRandomDelay(0, config.request.randomDelayRange);
        this.log(`Encountered rate limit (429), waiting ${delay / 1000} seconds before retrying... (${retryCount + 1}/${config.request.retryAttempts})`);
        await Utils.sleep(delay);
        return this.getApi(endpoint, retryCount + 1);
      }
      throw new Error(`Failed to fetch KadoKado API: ${error.message}`);
    }
  }

  async getNovelInfo() {
    this.log(`Starting to fetch novel information from API for title ID: ${this.titleId}`);
    try {
      // 更新API端点为v2版本
      const titleEndpoint = `https://api.kadokado.com.tw/v2/titles/${this.titleId}`;
      const titleData = await this.getApi(titleEndpoint);

      this.log(`Successfully fetched title information: ${titleData.displayName}`);

      // 直接从API响应获取作者信息
      let authorName = '';
      try {
        if (titleData.authors && titleData.authors.length > 0) {
          authorName = titleData.authors[0].displayName || '';
        } else {
          authorName = titleData.ownerDisplayName || '';
        }
      } catch (err) {
        this.log(`Error fetching author information: ${err.message}`);
      }

      // 获取统计数据 - 使用API中的字段
      const likes = titleData.favoriteCount || 0;
      const views = titleData.readCount || 0;
      const totalWords = titleData.wordCount || 0;
      const status = titleData.isSerialized ? '连载中' : '已完结';

      // 构建小说信息对象 - 不记录totalChapters
      const info = {
        title: titleData.displayName || '未知标题',
        author: authorName || '未知作者',
        description: titleData.logline || titleData.oneLineIntro || '无描述',
        likes: likes,
        views: views,
        status: status,
        totalWords: totalWords,
        updateDay: 'N/A', // API中无此数据
        subscribers: titleData.favoriteCount || 'N/A',
        rating: 'N/A', // API中无评分数据
        scrapedAt: new Date().toISOString()
      };

      this.log(`Successfully built novel information: ${info.title} (Author: ${info.author})`);
      return info;
    } catch (error) {
      this.log(`获取小说信息失败: ${error.message}`);
      // 返回默认值，避免完全失败
      return {
        title: '获取失败',
        author: '未知',
        description: '无法获取描述',
        likes: 0,
        views: 0,
        status: '未知',
        totalWords: 0,
        updateDay: 'N/A',
        subscribers: 'N/A',
        rating: 'N/A',
        scrapedAt: new Date().toISOString()
      };
    }
  }

  async getAllChapters() {
    this.log(`Fetching chapters from API for title ID: ${this.titleId}`);
    try {
      // 使用正确的API端点
      const collectionEndpoint = `https://api.kadokado.com.tw/v3/title/${this.titleId}/collection`;
      const collectionsData = await this.getApi(collectionEndpoint);
      const chapters = [];

      if (!Array.isArray(collectionsData)) {
        this.log(`Warning: Unexpected API response format for collections`);
        return chapters;
      }

      // 处理每个集合的章节
      collectionsData.forEach(collection => {
        if (collection.chapters && Array.isArray(collection.chapters)) {
          collection.chapters.forEach(chapter => {
            chapters.push({
              title: chapter.chapterDisplayName,  // 使用chapterDisplayName作为章节标题
              url: `https://www.kadokado.com.tw/chapter/${chapter.chapterId}`,
              number: chapter.chapterId,
              date: chapter.listingFrom ? new Date(chapter.listingFrom).toLocaleDateString() : 'Unknown',
              likes: chapter.likeCount || 0,  // 提取likeCount
              words: chapter.wordCount || 0,  // 保留wordCount作为备用信息
              collection: collection.collectionDisplayName || 'Unknown'
            });
          });
        }
      });

      // 按章节ID排序
      chapters.sort((a, b) => a.number - b.number);

      this.log(`Retrieved ${chapters.length} chapters in total`);
      return chapters;
    } catch (error) {
      this.log(`Error fetching chapters: ${error.message}`);
      return [];
    }
  }

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