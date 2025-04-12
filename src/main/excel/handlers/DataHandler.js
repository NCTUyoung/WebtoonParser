/**
 * 數據處理類
 * 處理 Excel 數據相關的邏輯，包括章節數據處理、格式化等
 */

const excelConfig = require('../config/excel-config');
const Utils = require('../../utils/utils');

class DataHandler {
  constructor(logFunction) {
    this.log = logFunction || console.log;
  }
  
  /**
   * 準備章節數據，從原始章節數據轉換為以章節號為鍵的對象
   * @param {Array} chapters - 章節數據數組
   * @param {boolean} isNovel - 是否為小說類型
   * @returns {Object} 以章節號為鍵的數據對象
   */
  prepareChapterData(chapters, isNovel) {
    const chaptersByNumber = {};
    
    if (!chapters || !Array.isArray(chapters)) {
      this.log(`Warning: Invalid chapters data provided`);
      return chaptersByNumber;
    }
    
    chapters.forEach(chapter => {
      // 嘗試從章節號中提取數字
      const numberMatch = chapter.number?.toString().match(/\d+$/)
      const num = numberMatch ? parseInt(numberMatch[0], 10) : null;

      if (num === null) {
        this.log(`Warning: Could not parse chapter number from '${chapter.number}'. Skipping chapter.`);
        return;
      }

      // 根據類型獲取值
      let value;
      if (isNovel) {
        value = (typeof chapter.words === 'number') ? chapter.words : 0;
      } else {
        value = chapter.likes ? parseInt(chapter.likes.replace(/[^0-9]/g, '')) : 0;
      }

      // 創建標準化的鍵
      const key = `ch${num.toString().padStart(3, '0')}`;
      chaptersByNumber[key] = value;
    });
    
    const chapterCount = Object.keys(chaptersByNumber).length;
    this.log(`Prepared ${chapterCount} chapters data`);
    
    return chaptersByNumber;
  }
  
  /**
   * 格式化工作表名稱，確保符合 Excel 限制
   * @param {string} title - 原始標題
   * @returns {string} 格式化後的工作表名稱
   */
  sanitizeSheetName(title) {
    return Utils.sanitizeFilename(title, excelConfig.sheetNameMaxLength);
  }
  
  /**
   * 格式化作者名稱，確保不超過最大長度
   * @param {string} author - 原始作者名
   * @returns {string} 格式化後的作者名
   */
  sanitizeAuthorName(author) {
    if (!author) return 'Unknown';
    
    const cleanedAuthor = author.trim();
    if (cleanedAuthor.length > excelConfig.authorMaxLength) {
      return cleanedAuthor.substring(0, excelConfig.authorMaxLength);
    }
    return cleanedAuthor;
  }
}

module.exports = DataHandler; 