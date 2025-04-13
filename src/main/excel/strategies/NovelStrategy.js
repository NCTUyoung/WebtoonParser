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
      { header: 'Total Words', key: 'totalWords', width: excelConfig.columns.novel.widths.totalWords }
    ];
  }

  /**
   * 從章節數據中提取值
   */
  extractValueFromChapter(chapter) {
    return (typeof chapter.likes === 'number') ? chapter.likes : 0;
  }

  /**
   * Gets the header format for chapter columns in novel Excel sheets.
   *
   * This method formats how chapter titles appear in Excel spreadsheets.
   * For novels, the format prioritizes:
   * 1. chapterDisplayName from API (e.g., "Chapter 1: The Beginning")
   * 2. Collection + title (e.g., "Volume 1 - Opening Chapter")
   * 3. Just title (e.g., "The Beginning")
   * 4. Default format with chapter number (e.g., "CH1")
   *
   * @param {string|number} chapterNumber - The chapter number (e.g., "1", "01")
   * @param {Object} [chapter] - Optional chapter object containing additional data
   * @param {string} [chapter.chapterDisplayName] - Display name from API (highest priority)
   * @param {string} [chapter.title] - Chapter title (second priority)
   * @param {string} [chapter.collection] - Collection name (e.g., "Volume 1")
   * @returns {string} Formatted chapter header text for Excel column
   *
   * @example
   * // With chapterDisplayName
   * getChapterHeaderFormat("1", { chapterDisplayName: "Chapter 1: The Beginning" })
   * // Returns: "Chapter 1: The Beginning"
   *
   * @example
   * // With collection and title
   * getChapterHeaderFormat("1", { title: "The Beginning", collection: "Volume 1" })
   * // Returns: "Volume 1 - The Beginning"
   */
  getChapterHeaderFormat(chapterNumber, chapter) {
    // Use chapterDisplayName from the API when available
    if (chapter) {
      if (chapter.chapterDisplayName) {
        return chapter.chapterDisplayName;
      }

      // Use existing title and collection logic as fallback
      if (chapter.title) {
        if (chapter.collection) {
          return `${chapter.collection} - ${chapter.title}`;
        }
        return chapter.title;
      }
    }

    // Default fallback format if no chapter data is available
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

    if (typeof data.likes === 'string') {
      data.likes = parseInt(data.likes.replace(/[^0-9]/g, '')) || 0;
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

  /**
   * Prepares and standardizes chapter data for Excel processing
   * For novels, this extracts word count as the primary value
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
      const numberMatch = chapter.number?.toString().match(/\d+$/);
      const num = numberMatch ? parseInt(numberMatch[0], 10) : null;

      if (num === null) {
        this.log(`Warning: Unable to parse chapter number from '${chapter.number}', skipped`);
        return;
      }

      // For novels, the primary value is the word count
      // Use words field if available, otherwise fallback to 0
      const value = (typeof chapter.words === 'number') ? chapter.words : 0;

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
      this.log(`Processed ${Object.keys(chaptersByNumber).length} novel chapters`);
    }

    return chaptersByNumber;
  }

  /**
   * Builds chapter column definitions for Excel
   * Creates column objects for word count columns
   *
   * @param {Object} chaptersByNumber - Processed chapter data
   * @returns {Array} Column definitions for novel chapters
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
        key: `Words_CH${chapterNum}`,  // Novel-specific prefix format
        width: excelConfig.columns.novel.widths.default || 10
      });
    });

    return chapterColumns;
  }

  /**
   * Extracts chapter data for a specific field in Excel
   * For novels, extracts word count values when the column is a chapter column
   *
   * @param {string} colName - Column name
   * @param {Object} chaptersByNumber - Processed chapters
   * @returns {*} Value for the Excel cell
   */
  extractChapterFieldValue(colName, chaptersByNumber) {
    // Check if column is a novel chapter column
    if (colName.startsWith('Words_CH')) {
      // Extract the chapter number from the column name
      const chapterNum = colName.replace('Words_CH', '');

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

module.exports = NovelStrategy;