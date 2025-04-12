/**
 * Excel數據格式化器
 * 處理數據格式化、轉換等操作
 */

class ExcelDataFormatter {
  constructor(logFunction) {
    this.log = logFunction || console.log;
  }

  /**
   * 格式化當前日期為本地字符串
   * @returns {string} 格式化的日期字符串
   */
  formatCurrentDate() {
    return new Date().toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * 處理現有工作表的行數據
   * @param {Object} columnMap - 列映射
   * @param {string} dateValue - 日期值
   * @param {Object} info - 基本信息
   * @param {Object} strategy - 內容策略
   * @param {Object} chaptersByNumber - 章節數據
   * @returns {Array} 行數據數組
   */
  prepareExistingSheetRowData(columnMap, dateValue, info, strategy, chaptersByNumber) {
    // 創建匹配列數的數組
    const rowValues = [];
    for (let i = 0; i < Object.keys(columnMap).length; i++) {
      rowValues.push(undefined);
    }

    // 將數據映射到列
    Object.keys(columnMap).forEach(colName => {
      const colIndex = columnMap[colName] - 1; // ExcelJS索引從1開始，數組從0開始

      // 基本信息
      if (colName === 'Date') {
        rowValues[colIndex] = dateValue;
      } else if (colName === 'Author') {
        rowValues[colIndex] = info.author || 'Unknown';
      }
      // 策略特定字段
      else {
        const contentType = strategy.getContentType();
        const preparedInfo = strategy.prepareInfoData(info);

        // 根據內容類型映射標準字段
        if ((contentType === 'novel' && this.isNovelField(colName)) ||
            (contentType === 'webtoon' && this.isWebtoonField(colName))) {
          rowValues[colIndex] = this.getFieldValue(colName, preparedInfo);
        }
        // 為小說映射章節數據
        else if (contentType === 'novel' && colName.startsWith('Words_CH')) {
          const chapterNum = colName.replace('Words_CH', '');
          const chapterKey = `ch${chapterNum.padStart(3, '0')}`;
          if (chaptersByNumber[chapterKey] !== undefined) {
            rowValues[colIndex] = chaptersByNumber[chapterKey];
          }
        }
        // 為漫畫映射章節數據
        else if (contentType === 'webtoon' && colName.startsWith('CH')) {
          const chapterNum = colName.replace('CH', '');
          const chapterKey = `ch${chapterNum.padStart(3, '0')}`;
          if (chaptersByNumber[chapterKey] !== undefined) {
            rowValues[colIndex] = chaptersByNumber[chapterKey];
          }
        }
      }
    });

    return rowValues;
  }

  /**
   * 處理新工作表的行數據
   * @param {string} dateValue - 日期值
   * @param {Object} info - 基本信息
   * @param {Object} strategy - 內容策略
   * @param {Object} chaptersByNumber - 章節數據
   * @returns {Object} 行數據對象
   */
  prepareNewSheetRowData(dateValue, info, strategy, chaptersByNumber) {
    const rowData = {
      date: dateValue,
      author: info.author || 'Unknown'
    };

    // 使用策略準備數據
    const preparedInfo = strategy.prepareInfoData(info);
    Object.assign(rowData, preparedInfo);

    // 添加章節數據
    Object.entries(chaptersByNumber).forEach(([key, value]) => {
      rowData[key] = value;
    });

    return rowData;
  }

  /**
   * 檢查字段是否為小說專用字段
   * @param {string} fieldName - 字段名
   * @returns {boolean} 是否為小說字段
   */
  isNovelField(fieldName) {
    return ['Total Views', 'Likes', 'Status', 'Total Chapters', 'Total Words'].includes(fieldName);
  }

  /**
   * 檢查字段是否為漫畫專用字段
   * @param {string} fieldName - 字段名
   * @returns {boolean} 是否為漫畫字段
   */
  isWebtoonField(fieldName) {
    return ['Total Views', 'Subscribers', 'Rating'].includes(fieldName);
  }

  /**
   * 從數據中獲取字段值
   * @param {string} fieldName - 字段名
   * @param {Object} data - 數據對象
   * @returns {*} 字段值
   */
  getFieldValue(fieldName, data) {
    const fieldMap = {
      'Total Views': 'views',
      'Likes': 'likes',
      'Status': 'status',
      'Total Chapters': 'totalChapters',
      'Total Words': 'totalWords',
      'Subscribers': 'subscribers',
      'Rating': 'rating'
    };

    const key = fieldMap[fieldName];
    if (!key) return undefined;

    return fieldName === 'Status' ? (data[key] || 'N/A') : data[key];
  }
}

module.exports = ExcelDataFormatter;