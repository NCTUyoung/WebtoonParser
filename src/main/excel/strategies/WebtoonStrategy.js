/**
 * 漫畫Excel策略類
 * 實現處理漫畫類型資料的具體策略
 */

const BaseStrategy = require('./BaseStrategy');
const excelConfig = require('../config/excel-config');

class WebtoonStrategy extends BaseStrategy {
  constructor(logFunction) {
    super(logFunction);
  }
  
  /**
   * 獲取內容類型
   */
  getContentType() {
    return 'webtoon';
  }
  
  /**
   * 獲取該類型所需的列定義
   */
  getColumnsDefinition() {
    return [
      { header: 'Date', key: 'date', width: excelConfig.columns.webtoon.widths.date },
      { header: 'Author', key: 'author', width: excelConfig.columns.webtoon.widths.author },
      { header: 'Total Views', key: 'views', width: excelConfig.columns.webtoon.widths.views },
      { header: 'Subscribers', key: 'subscribers', width: excelConfig.columns.webtoon.widths.subscribers },
      { header: 'Rating', key: 'rating', width: excelConfig.columns.webtoon.widths.rating }
    ];
  }
  
  /**
   * 從章節數據中提取值
   */
  extractValueFromChapter(chapter) {
    return chapter.likes ? parseInt(chapter.likes.replace(/[^0-9]/g, '')) : 0;
  }
  
  /**
   * 獲取章節列的標題格式
   */
  getChapterHeaderFormat(chapterNumber) {
    return `CH${chapterNumber}`;
  }
  
  /**
   * 準備info數據
   */
  prepareInfoData(info) {
    const data = { ...info };
    
    // 處理數字字段
    if (typeof data.views === 'string') {
      data.views = parseInt(data.views.replace(/[^0-9]/g, '')) || 0;
    }
    
    if (typeof data.subscribers === 'string') {
      data.subscribers = parseInt(data.subscribers.replace(/[^0-9]/g, '')) || 0;
    }
    
    if (typeof data.rating === 'string') {
      data.rating = parseFloat(data.rating) || 0;
    }
    
    return data;
  }
  
  /**
   * 獲取預設檔案名稱
   */
  getDefaultFilename(isAppend = false) {
    if (isAppend) {
      return excelConfig.filenameFormats.webtoon.append;
    }
    
    const date = new Date().toISOString().slice(0, 10);
    return excelConfig.filenameFormats.webtoon.default.replace('{date}', date);
  }
}

module.exports = WebtoonStrategy; 