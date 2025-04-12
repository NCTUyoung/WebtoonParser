/**
 * Excel基本策略接口
 * 定義處理不同類型內容(漫畫/小說)的方法
 */

class BaseStrategy {
  constructor(logFunction) {
    this.log = logFunction || console.log;
  }
  
  /**
   * 獲取內容類型
   */
  getContentType() {
    throw new Error('子類必須實現此方法');
  }
  
  /**
   * 獲取該類型所需的列定義
   */
  getColumnsDefinition() {
    throw new Error('子類必須實現此方法');
  }
  
  /**
   * 從章節數據中提取值
   */
  extractValueFromChapter(chapter) {
    throw new Error('子類必須實現此方法');
  }
  
  /**
   * 獲取章節列的標題格式
   */
  getChapterHeaderFormat(chapterNumber) {
    throw new Error('子類必須實現此方法');
  }
  
  /**
   * 準備info數據
   */
  prepareInfoData(info) {
    throw new Error('子類必須實現此方法');
  }
  
  /**
   * 獲取預設檔案名稱
   */
  getDefaultFilename() {
    throw new Error('子類必須實現此方法');
  }
}

module.exports = BaseStrategy; 