/**
 * 列映射工具類
 * 用於處理 Excel 列與數據鍵的映射關係
 */

const excelConfig = require('../config/excel-config');

class ColumnMapper {
  constructor(logFunction) {
    this.log = logFunction || console.log;
  }
  
  /**
   * 從標題行建立列映射
   * @param {Object} headerRow - Excel 標題行
   * @param {boolean} isNovel - 是否為小說類型
   * @returns {Object} 鍵值對映射，格式為 {key: columnNumber}
   */
  buildColumnMap(headerRow, isNovel) {
    const colKeyMap = {};
    
    // 獲取正確的章節格式配置
    const chapterFormat = isNovel 
      ? excelConfig.chapterFormats.novel
      : excelConfig.chapterFormats.webtoon;
    
    // 從標題行讀取所有單元格
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      if (!cell.value) return;
      
      const headerText = cell.value.toString().toUpperCase();
      
      // 為基本數據欄位建立映射
      if (headerText === 'DATE') colKeyMap['date'] = colNumber;
      else if (headerText === 'AUTHOR') colKeyMap['author'] = colNumber;
      else if (headerText === 'TOTAL VIEWS') colKeyMap['views'] = colNumber;
      else if (headerText === 'SUBSCRIBERS') colKeyMap['subscribers'] = colNumber;
      else if (headerText === 'RATING') colKeyMap['rating'] = colNumber;
      else if (headerText === 'LIKES') colKeyMap['likes'] = colNumber;
      else if (headerText === 'STATUS') colKeyMap['status'] = colNumber;
      else if (headerText === 'TOTAL CHAPTERS') colKeyMap['totalChapters'] = colNumber;
      else if (headerText === 'TOTAL WORDS') colKeyMap['totalWords'] = colNumber;
      
      // 為章節列建立映射
      const chapterMatch = headerText.match(chapterFormat.regex);
      
      if (chapterMatch) {
        const chapterNum = parseInt(chapterMatch[1]);
        const key = `ch${chapterNum.toString().padStart(3, '0')}`;
        colKeyMap[key] = colNumber;
        this.log(`Mapped chapter column: ${headerText} -> ${key} at column ${colNumber}`);
      }
    });
    
    this.log(`Column Map created with ${Object.keys(colKeyMap).length} mappings`);
    return colKeyMap;
  }
  
  /**
   * 創建章節標題
   * @param {string} key - 章節鍵 (例如 ch001)
   * @param {boolean} isNovel - 是否為小說類型
   * @returns {string} 格式化的章節標題
   */
  createChapterHeader(key, isNovel) {
    const num = key.slice(2); // 移除 'ch' 前綴
    const prefix = isNovel 
      ? excelConfig.chapterFormats.novel.headerPrefix
      : excelConfig.chapterFormats.webtoon.headerPrefix;
      
    return `${prefix}${num}`;
  }
}

module.exports = ColumnMapper; 