/**
 * 小說Excel策略類
 * 實現處理小說類型資料的具體策略
 */

const BaseStrategy = require('./BaseStrategy');
const excelConfig = require('../config/excel-config');

class NovelStrategy extends BaseStrategy {
  constructor(logFunction) {
    super(logFunction);
  }
  
  /**
   * 獲取內容類型
   */
  getContentType() {
    return 'novel';
  }
  
  /**
   * 獲取該類型所需的列定義
   */
  getColumnsDefinition() {
    return [
      { header: 'Date', key: 'date', width: excelConfig.columns.novel.widths.date },
      { header: 'Author', key: 'author', width: excelConfig.columns.novel.widths.author },
      { header: 'Total Views', key: 'views', width: excelConfig.columns.novel.widths.views },
      { header: 'Likes', key: 'likes', width: excelConfig.columns.novel.widths.likes },
      { header: 'Status', key: 'status', width: excelConfig.columns.novel.widths.status },
      { header: 'Total Chapters', key: 'totalChapters', width: excelConfig.columns.novel.widths.totalChapters },
      { header: 'Total Words', key: 'totalWords', width: excelConfig.columns.novel.widths.totalWords }
    ];
  }
  
  /**
   * 從章節數據中提取值
   */
  extractValueFromChapter(chapter) {
    return (typeof chapter.words === 'number') ? chapter.words : 0;
  }
  
  /**
   * 獲取章節列的標題格式
   */
  getChapterHeaderFormat(chapterNumber) {
    return `Words_CH${chapterNumber}`;
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
    
    if (typeof data.likes === 'string') {
      data.likes = parseInt(data.likes.replace(/[^0-9]/g, '')) || 0;
    }
    
    if (typeof data.totalChapters === 'string') {
      data.totalChapters = parseInt(data.totalChapters) || 0;
    }
    
    if (typeof data.totalWords === 'string') {
      data.totalWords = parseInt(data.totalWords) || 0;
    }
    
    return data;
  }
  
  /**
   * 獲取預設檔案名稱
   */
  getDefaultFilename(isAppend = false) {
    if (isAppend) {
      return excelConfig.filenameFormats.novel.append;
    }
    
    const date = new Date().toISOString().slice(0, 10);
    return excelConfig.filenameFormats.novel.default.replace('{date}', date);
  }
}

module.exports = NovelStrategy; 