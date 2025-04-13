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
   * Gets the header format for chapter columns.
   * This method formats how chapter titles appear in Excel spreadsheets.
   *
   * @param {string|number} chapterNumber - The chapter number
   * @param {Object} [chapter] - Optional chapter object containing additional data
   * @param {string} [chapter.chapterDisplayName] - Display name from API (highest priority)
   * @param {string} [chapter.title] - Chapter title (second priority)
   * @param {string} [chapter.collection] - Collection name that can be combined with title
   * @returns {string} Formatted chapter header text
   */
  getChapterHeaderFormat(chapterNumber, chapter) {
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

  /**
   * Prepares and standardizes chapter data for Excel processing
   * Converts raw chapter data from scrapers into a standardized format
   *
   * @param {Array} chapters - Raw chapter data from scrapers
   * @returns {Object} Standardized chapter data with keys in ch000 format
   */
  prepareChapterData(chapters) {
    throw new Error('子類必須實現此方法');
  }

  /**
   * Builds chapter column definitions for Excel
   * Creates column objects that define the structure of chapter columns
   *
   * @param {Object} chaptersByNumber - Processed chapter data
   * @returns {Array} Column definitions for chapters
   */
  buildChapterColumns(chaptersByNumber) {
    throw new Error('子類必須實現此方法');
  }

  /**
   * Extracts chapter data for a specific field in Excel
   * Used when populating cells in the Excel sheet
   *
   * @param {string} colName - Column name
   * @param {Object} chaptersByNumber - Processed chapters
   * @returns {*} Value for the Excel cell
   */
  extractChapterFieldValue(colName, chaptersByNumber) {
    throw new Error('子類必須實現此方法');
  }
}

module.exports = BaseStrategy;