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
   * Gets the header format for chapter columns in webtoon Excel sheets.
   *
   * This method determines how chapter titles appear in Excel spreadsheets.
   * For webtoons, the format prioritizes:
   * 1. chapterDisplayName from API (e.g., "Episode 1")
   * 2. Regular title (e.g., "The Beginning")
   * 3. Default format with chapter number (e.g., "CH1")
   *
   * Unlike novels, webtoons typically don't use collection grouping in the header.
   *
   * @param {string|number} chapterNumber - The chapter number (e.g., "1", "01")
   * @param {Object} [chapter] - Optional chapter object containing additional data
   * @param {string} [chapter.chapterDisplayName] - Display name from API (highest priority)
   * @param {string} [chapter.title] - Chapter title (second priority)
   * @returns {string} Formatted chapter header text for Excel column
   *
   * @example
   * // With chapterDisplayName
   * getChapterHeaderFormat("1", { chapterDisplayName: "Episode 1" })
   * // Returns: "Episode 1"
   *
   * @example
   * // With title only
   * getChapterHeaderFormat("1", { title: "The Beginning" })
   * // Returns: "The Beginning"
   */
  getChapterHeaderFormat(chapterNumber, chapter) {
    // Use chapterDisplayName or title from the chapter object when available
    if (chapter) {
      if (chapter.chapterDisplayName) {
        return chapter.chapterDisplayName;
      }
      if (chapter.title) {
        return chapter.title;
      }
    }

    // Default fallback format
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

  /**
   * Prepares and standardizes chapter data for Excel processing
   * For webtoons, this extracts like counts as the primary value
   *
   * @param {Array} chapters - Raw chapter data from scrapers
   * @returns {Object} Standardized chapter data with keys in ch000 format
   */
  prepareChapterData(chapters) {
    const chaptersByNumber = {};

    if (!chapters || !Array.isArray(chapters)) {
      this.log(`Warning: Invalid chapter data provided`);
      return chaptersByNumber;
    }

    chapters.forEach(chapter => {
      // Extract chapter number from the number field
      // Webtoon numbers may sometimes include # prefix
      const numberMatch = chapter.number?.toString().replace('#', '').match(/\d+$/);
      const num = numberMatch ? parseInt(numberMatch[0], 10) : null;

      if (num === null) {
        this.log(`Warning: Unable to parse chapter number from '${chapter.number}', skipped`);
        return;
      }

      // For webtoons, the primary value is the like count
      let value;
      if (typeof chapter.likes === 'number') {
        value = chapter.likes;
      } else if (typeof chapter.likes === 'string') {
        value = parseInt(chapter.likes.replace(/[^0-9]/g, '')) || 0;
      } else {
        value = 0;
      }

      // Create standardized key
      const key = `ch${num.toString().padStart(3, '0')}`;

      // Store both the chapter object and the extracted value
      chaptersByNumber[key] = {
        chapter: chapter,    // Store the full chapter object for header formatting
        value: value         // Store the value for Excel cell data
      };
    });

    // Log only when processing a significant number of chapters
    if (Object.keys(chaptersByNumber).length > 0) {
      this.log(`Processed ${Object.keys(chaptersByNumber).length} webtoon chapters`);
    }

    return chaptersByNumber;
  }

  /**
   * Builds chapter column definitions for Excel
   * Creates column objects for like count columns
   *
   * @param {Object} chaptersByNumber - Processed chapter data
   * @returns {Array} Column definitions for webtoon chapters
   */
  buildChapterColumns(chaptersByNumber) {
    const chapterColumns = [];
    const chapterKeys = Object.keys(chaptersByNumber).sort();

    chapterKeys.forEach(key => {
      const chapterNum = key.slice(2).replace(/^0+/, ''); // Remove prefix and leading zeros
      const chapterData = chaptersByNumber[key];
      const chapter = chapterData.chapter;

      // Get formatted header text using the chapter object
      const headerText = this.getChapterHeaderFormat(chapterNum, chapter);

      // Create column definition
      chapterColumns.push({
        header: headerText,
        key: `CH${chapterNum}`,  // Webtoon-specific prefix format (without Words_ prefix)
        width: excelConfig.columns.webtoon.widths.default || 10
      });
    });

    return chapterColumns;
  }

  /**
   * Extracts chapter data for a specific field in Excel
   * For webtoons, extracts like count values when the column is a chapter column
   *
   * @param {string} colName - Column name
   * @param {Object} chaptersByNumber - Processed chapters
   * @returns {*} Value for the Excel cell
   */
  extractChapterFieldValue(colName, chaptersByNumber) {
    // Check if column is a webtoon chapter column
    if (colName.startsWith('CH') && !/^CH\D/.test(colName)) { // Make sure it's not another column like 'CHxx'
      // Extract the chapter number from the column name
      const chapterNum = colName.replace('CH', '');

      // Convert to standard key format
      const chapterKey = `ch${chapterNum.padStart(3, '0')}`;

      // Return the value if chapter exists, otherwise undefined
      if (chaptersByNumber[chapterKey]) {
        return chaptersByNumber[chapterKey].value;
      }
    }

    return undefined;
  }
}

module.exports = WebtoonStrategy;