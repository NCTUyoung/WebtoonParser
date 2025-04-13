// Excel Service
// Provides data formatting and row management functionality

const WorksheetBuilder = require('../utils/WorksheetBuilder');

class ExcelService {
  constructor(logFunction) {
    this.log = logFunction || console.log;
  }

  // Format current date for Excel
  formatCurrentDate() {
    return new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // Add data rows to worksheet
  async addDataRows(worksheet, isExistingSheet, columnMap, params, strategy, chaptersByNumber) {
    this.log('Adding data rows...');

    try {
      // Record row count before adding
      const initialRowCount = worksheet.rowCount || 0;
      this.log(`Row count before adding data: ${initialRowCount}`);

      // Format date value
      const dateValue = this.formatCurrentDate();

      // Prepare row data and add
      const builder = new WorksheetBuilder(worksheet, this.log);
      let addedRow;
      let rowData;
      const isAppendMode = params.append;

      if (isExistingSheet && Object.keys(columnMap).length > 0) {
        // Create row data for existing sheet
        rowData = this.prepareExistingSheetRowData(
          columnMap, dateValue, params.info, strategy, chaptersByNumber
        );

        // Use builder to add row
        addedRow = builder.addRow(rowData);
        this.log(`Added data row with ${rowData.filter(v => v !== undefined).length} valid fields (append mode)`);
      } else {
        // Create row data for new sheet
        rowData = this.prepareNewSheetRowData(
          dateValue, params.info, strategy, chaptersByNumber
        );

        // Use builder to add row
        addedRow = builder.addRow(rowData);
        const modeLabel = isAppendMode ? "(new worksheet but in append mode)" : "(new worksheet mode)";
        this.log(`Added data row with ${Object.keys(rowData).length} fields ${modeLabel}`);
      }

      // Verify row was added
      return this.verifyRowAdded(worksheet, initialRowCount, addedRow);
    } catch (error) {
      this.log(`Error adding data row: ${error.message}`);
      throw new Error(`Unable to add data row: ${error.message}`);
    }
  }

  // Prepare row data for existing worksheet
  prepareExistingSheetRowData(columnMap, dateValue, info, strategy, chaptersByNumber) {
    // Create array matching column count
    const rowValues = [];
    for (let i = 0; i < Object.keys(columnMap).length; i++) {
      rowValues.push(undefined);
    }

    // Map data to columns
    Object.keys(columnMap).forEach(colName => {
      const colIndex = columnMap[colName] - 1; // ExcelJS indexes start at 1, arrays at 0

      // Basic info
      if (colName === 'Date') {
        rowValues[colIndex] = dateValue;
      } else if (colName === 'Author') {
        rowValues[colIndex] = info.author || 'Unknown';
      }
      // Strategy specific fields
      else {
        const contentType = strategy.getContentType();
        const preparedInfo = strategy.prepareInfoData(info);

        // Map standard fields based on content type
        if ((contentType === 'novel' && this.isNovelField(colName)) ||
            (contentType === 'webtoon' && this.isWebtoonField(colName))) {
          rowValues[colIndex] = this.getFieldValue(colName, preparedInfo);
        }
        // Extract chapter field value using strategy
        else {
          rowValues[colIndex] = strategy.extractChapterFieldValue(colName, chaptersByNumber);
        }
      }
    });

    return rowValues;
  }

  // Prepare row data for new worksheet
  prepareNewSheetRowData(dateValue, info, strategy, chaptersByNumber) {
    const rowData = {
      date: dateValue,
      author: info.author || 'Unknown'
    };

    // Use strategy to prepare data
    const preparedInfo = strategy.prepareInfoData(info);
    Object.assign(rowData, preparedInfo);

    // Add chapter data using strategy
    Object.keys(chaptersByNumber).forEach(key => {
      const chapterNum = key.slice(2).replace(/^0+/, '');
      const contentType = strategy.getContentType();

      // Create appropriate key based on content type
      const rowKey = contentType === 'novel'
        ? `Words_CH${chapterNum}`
        : `CH${chapterNum}`;

      // Get value from chapter data using strategy
      rowData[rowKey] = chaptersByNumber[key].value;
    });

    return rowData;
  }

  // Check if field is novel-specific
  isNovelField(fieldName) {
    return ['Total Views', 'Likes', 'Status', 'Total Chapters', 'Total Words'].includes(fieldName);
  }

  // Check if field is webtoon-specific
  isWebtoonField(fieldName) {
    return ['Total Views', 'Subscribers', 'Rating'].includes(fieldName);
  }

  // Get field value from data
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

  // Verify that row was added successfully
  verifyRowAdded(worksheet, initialRowCount, addedRow) {
    const finalRowCount = worksheet.rowCount || 0;
    const rowsAdded = finalRowCount - initialRowCount;

    if (rowsAdded <= 0) {
      this.log(`Warning: Row addition failed! Rows before: ${initialRowCount}, after: ${finalRowCount}`);
      if (!addedRow) {
        throw new Error('Unable to add data row to worksheet');
      } else {
        this.log('Row object created but row count did not increase - Excel behavior inconsistency');
      }
    } else {
      this.log(`Row added successfully. Rows increased from ${initialRowCount} to ${finalRowCount} (+${rowsAdded} rows)`);
    }

    return addedRow;
  }

  /**
   * Prepare chapter data from raw chapters - DEPRECATED
   * This function is maintained for backward compatibility
   * New code should use strategy.prepareChapterData() instead
   *
   * @deprecated Use strategy.prepareChapterData() instead
   * @param {Array} chapters - Raw chapter data
   * @param {boolean} isNovel - Whether the content is a novel
   * @returns {Object} Processed chapter data
   */
  prepareChapterData(chapters, isNovel) {
    this.log(`Warning: Using deprecated prepareChapterData method in ExcelService. Use strategy.prepareChapterData() instead.`);

    const chaptersByNumber = {};

    if (!chapters || !Array.isArray(chapters)) {
      this.log(`Warning: Invalid chapter data provided`);
      return chaptersByNumber;
    }

    // Process each chapter
    chapters.forEach(chapter => {
      // Extract number from chapter number
      const numberMatch = chapter.number?.toString().match(/\d+$/)
      const num = numberMatch ? parseInt(numberMatch[0], 10) : null;

      if (num === null) {
        this.log(`Warning: Unable to parse chapter number from '${chapter.number}', skipped`);
        return;
      }

      // Get value based on type
      let value;
      if (isNovel) {
        value = (typeof chapter.words === 'number') ? chapter.words : 0;
      } else {
        value = chapter.likes ? parseInt(chapter.likes.replace(/[^0-9]/g, '')) : 0;
      }

      // Create standardized key
      const key = `ch${num.toString().padStart(3, '0')}`;

      // Store both chapter and value for backward compatibility
      chaptersByNumber[key] = {
        chapter: chapter,
        value: value
      };
    });

    // Only log when processing a significant number of chapters
    if (Object.keys(chaptersByNumber).length > 5) {
      const chapterCount = Object.keys(chaptersByNumber).length;
      this.log(`Processed ${chapterCount} chapters using deprecated method`);
    }

    return chaptersByNumber;
  }
}

module.exports = ExcelService;