/**
 * 工作表處理類
 * 處理 Excel 工作表相關操作，包括創建、修改和數據添加
 */

const excelConfig = require('../config/excel-config');
const ColumnMapper = require('../utils/ColumnMapper');

class WorksheetHandler {
  constructor(logFunction) {
    this.log = logFunction || console.log;
    this.columnMapper = new ColumnMapper(logFunction);
  }
  
  /**
   * 獲取或創建工作表
   * @param {Object} workbook - Excel 工作簿對象
   * @param {string} sheetName - 工作表名稱
   * @param {Object} chaptersByNumber - 章節數據對象
   * @param {boolean} fileExists - 文件是否已存在
   * @param {boolean} append - 是否追加模式
   * @param {boolean} isNovel - 是否為小說類型
   * @returns {Object} 工作表和章節列信息
   */
  async getOrCreateWorksheet(workbook, sheetName, chaptersByNumber, fileExists, append, isNovel) {
    try {
      const chapterKeys = Object.keys(chaptersByNumber);
      if (chapterKeys.length > 0) {
        chapterKeys.sort((a, b) => {
          const numA = parseInt(a.slice(2));
          const numB = parseInt(b.slice(2));
          return numA - numB;
        });
      } else {
        this.log(`Warning: No chapter keys found in data.`);
      }
      
      let worksheet = workbook.getWorksheet(sheetName);
      let finalChapterColumns = [];

      // 如果工作表不存在或不是追加模式，創建新工作表
      if (!worksheet) {
        this.log(`Worksheet does not exist, creating new worksheet: ${sheetName}`);
        worksheet = this.createNewWorksheet(workbook, sheetName, chapterKeys, isNovel);
        finalChapterColumns = chapterKeys;
        this.log(`Created new worksheet with ${finalChapterColumns.length} chapter columns`);
      } else if (!append) {
        this.log(`Worksheet exists but not in append mode, removing existing worksheet: ${sheetName}`);
        workbook.removeWorksheet(worksheet.id);
        worksheet = this.createNewWorksheet(workbook, sheetName, chapterKeys, isNovel);
        finalChapterColumns = chapterKeys;
        this.log(`Recreated worksheet with ${finalChapterColumns.length} chapter columns`);
      } else {
        this.log(`Appending to existing worksheet: ${sheetName}`);
        
        // 確保現有的工作表有有效的列定義
        this._ensureValidColumns(worksheet);
        
        // 處理現有工作表的列和添加新章節列
        const { existingHeaders, newColumns } = this._processExistingWorksheet(
          worksheet, chapterKeys, isNovel
        );
        
        // 收集所有章節列，包括既有的和新增的
        finalChapterColumns = this._collectChapterColumns(existingHeaders, isNovel);
      }
      
      return { worksheet, chapterColumns: finalChapterColumns };
    } catch (error) {
      this.log(`Error in getOrCreateWorksheet: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 創建新工作表
   * @param {Object} workbook - Excel 工作簿對象
   * @param {string} sheetName - 工作表名稱
   * @param {Array} chapterKeys - 章節鍵數組
   * @param {boolean} isNovel - 是否為小說類型
   * @returns {Object} 創建的工作表
   */
  createNewWorksheet(workbook, sheetName, chapterKeys, isNovel) {
    const worksheet = workbook.addWorksheet(sheetName);
    
    // 根據類型選擇基本列定義
    const baseColumns = [
      ...excelConfig.columns.common,
      ...(isNovel ? excelConfig.columns.novel : excelConfig.columns.webtoon)
    ];
    
    // 添加章節列
    const chapterColumns = chapterKeys.map(key => {
      const header = this.columnMapper.createChapterHeader(key, isNovel);
      return { header, key, width: 10 };
    });
    
    // 設置工作表列
    worksheet.columns = [...baseColumns, ...chapterColumns];
    
    // 設置標題行樣式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    return worksheet;
  }
  
  /**
   * 添加新行數據到工作表
   * @param {Object} worksheet - 工作表對象
   * @param {Object} info - 基本信息數據
   * @param {Object} chaptersByNumber - 章節數據對象
   * @param {boolean} isNovel - 是否為小說類型
   * @returns {Object} 添加的行
   */
  async addNewRowToWorksheet(worksheet, info, chaptersByNumber, isNovel) {
    try {
      const headerRow = worksheet.getRow(1);
      
      // 從標題行創建列映射
      const colKeyMap = this.columnMapper.buildColumnMap(headerRow, isNovel);
      this.log(`Column Key Map: ${JSON.stringify(colKeyMap)}`);
      
      // 創建行數據
      let rowData = new Array(worksheet.columnCount + 1); // Excel列從1開始
      
      // 創建日期字符串
      const dateValue = new Date().toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      // 填充基本數據欄位
      if (colKeyMap['date']) rowData[colKeyMap['date']] = dateValue;
      if (colKeyMap['author']) rowData[colKeyMap['author']] = info.author || 'Unknown';
      
      // 根據類型填充不同數據
      if (isNovel) {
        if (colKeyMap['views']) rowData[colKeyMap['views']] = typeof info.views === 'number' ? info.views : 0;
        if (colKeyMap['likes']) rowData[colKeyMap['likes']] = typeof info.likes === 'number' ? info.likes : 0;
        if (colKeyMap['status']) rowData[colKeyMap['status']] = info.status || 'N/A';
        if (colKeyMap['totalChapters']) rowData[colKeyMap['totalChapters']] = typeof info.totalChapters === 'number' ? info.totalChapters : 0;
        if (colKeyMap['totalWords']) rowData[colKeyMap['totalWords']] = typeof info.totalWords === 'number' ? info.totalWords : 0;
      } else {
        if (colKeyMap['views']) rowData[colKeyMap['views']] = info.views ? parseInt(info.views.replace(/[^0-9]/g, '')) : 0;
        if (colKeyMap['subscribers']) rowData[colKeyMap['subscribers']] = info.subscribers ? parseInt(info.subscribers.replace(/[^0-9]/g, '')) : 0;
        if (colKeyMap['rating']) rowData[colKeyMap['rating']] = info.rating ? parseFloat(info.rating) : 0;
      }
      
      // 添加章節數據
      if (chaptersByNumber && typeof chaptersByNumber === 'object') {
        for (const [key, value] of Object.entries(chaptersByNumber)) {
          if (colKeyMap[key]) {
            rowData[colKeyMap[key]] = value;
            this.log(`Adding chapter data: ${key} = ${value} at column ${colKeyMap[key]}`);
          } else {
            this.log(`Warning: Chapter key "${key}" not found in column map. Skipping this data.`);
          }
        }
      }
      
      // 過濾掉未定義的單元格
      const filteredRowData = {};
      for (let i = 1; i < rowData.length; i++) {
        if (rowData[i] !== undefined) {
          filteredRowData[i] = rowData[i];
        }
      }
      
      // 檢查是否有數據要添加
      if (Object.keys(filteredRowData).length === 0) {
        throw new Error('Row data is empty, cannot add empty row');
      }
      
      // 添加行
      const newRow = worksheet.addRow([]);
      for (const [col, value] of Object.entries(filteredRowData)) {
        newRow.getCell(parseInt(col)).value = value;
      }
      
      this.log(`Added new row with ${Object.keys(filteredRowData).length} cells of data`);
      return newRow;
    } catch (error) {
      this.log(`Error adding new row to worksheet: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 確保工作表有有效的列定義
   * @private
   * @param {Object} worksheet - 工作表對象
   */
  _ensureValidColumns(worksheet) {
    if (!worksheet.columns || !Array.isArray(worksheet.columns) || worksheet.columns.length === 0) {
      this.log(`Warning: Existing worksheet has no valid columns definition. Rebuilding columns.`);
      
      // 從標題行重建列定義
      const headerRow = worksheet.getRow(1);
      const columns = [];
      
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const header = cell.value ? cell.value.toString() : `Column${colNumber}`;
        const key = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        columns.push({
          header: header,
          key: key,
          width: 15
        });
      });
      
      // 如果仍然沒有列定義，則創建基本列
      if (columns.length === 0) {
        this.log(`Warning: Could not rebuild columns from header row. Creating basic columns.`);
        columns.push(
          { header: 'Date', key: 'date', width: 20 },
          { header: 'Author', key: 'author', width: 20 }
        );
      }
      
      worksheet.columns = columns;
    }
  }
  
  /**
   * 處理現有工作表，獲取現有標題並添加新列
   * @private
   * @param {Object} worksheet - 工作表對象
   * @param {Array} chapterKeys - 章節鍵數組
   * @param {boolean} isNovel - 是否為小說類型
   * @returns {Object} 現有標題和新添加的列
   */
  _processExistingWorksheet(worksheet, chapterKeys, isNovel) {
    const headerRow = worksheet.getRow(1);
    const existingHeaders = {};
    let maxCol = 0;
    
    // 讀取現有標題
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerValue = cell.value ? cell.value.toString() : '';
      if (headerValue) {
        existingHeaders[headerValue.toUpperCase()] = colNumber;
        maxCol = Math.max(maxCol, colNumber);
      }
    });
    
    // 確定章節列標題前綴
    const chapterFormat = isNovel 
      ? excelConfig.chapterFormats.novel
      : excelConfig.chapterFormats.webtoon;
    
    // 找出需要添加的新章節列
    const newChapterKeys = chapterKeys.filter(key => {
      const headerText = this.columnMapper.createChapterHeader(key, isNovel).toUpperCase();
      const exists = !!existingHeaders[headerText];
      if (exists) {
        this.log(`Chapter column exists: ${headerText}`);
      } else {
        this.log(`New chapter column needed: ${headerText}`);
      }
      return !exists;
    });
    
    this.log(`Existing Headers: ${JSON.stringify(Object.keys(existingHeaders))}`);
    this.log(`Existing Headers Count: ${Object.keys(existingHeaders).length}, New Chapter Keys to Add: ${newChapterKeys.length}`);
    
    // 添加新章節列
    if (newChapterKeys.length > 0) {
      this.log(`Adding ${newChapterKeys.length} new chapter columns`);
      
      newChapterKeys.forEach((key, index) => {
        try {
          const colNumber = maxCol + 1 + index;
          const headerText = this.columnMapper.createChapterHeader(key, isNovel);
          
          this.log(`Adding column #${colNumber} with header "${headerText}" and key "${key}"`);
          
          const headerCell = headerRow.getCell(colNumber);
          headerCell.value = headerText;
          headerCell.font = { bold: true };
          headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
          
          // 確保列有正確的鍵
          worksheet.getColumn(colNumber).key = key;
          worksheet.getColumn(colNumber).width = 10;
          existingHeaders[headerText.toUpperCase()] = colNumber;
        } catch (error) {
          this.log(`Error adding new column "${key}": ${error.message}`);
        }
      });
      
      // 確保更改生效
      headerRow.commit();
    }
    
    return { existingHeaders, newColumns: newChapterKeys };
  }
  
  /**
   * 從現有標題中收集章節列
   * @private
   * @param {Object} existingHeaders - 現有標題映射
   * @param {boolean} isNovel - 是否為小說類型
   * @returns {Array} 章節列數組
   */
  _collectChapterColumns(existingHeaders, isNovel) {
    try {
      // 創建一個正則表達式來匹配章節列標題
      const chapterRegex = isNovel 
        ? excelConfig.chapterFormats.novel.regex
        : excelConfig.chapterFormats.webtoon.regex;
      
      this.log(`Using chapter regex: ${chapterRegex}`);
      
      const finalChapterColumns = [];
      
      // 從標題中提取章節列
      for (const [header, colNumber] of Object.entries(existingHeaders)) {
        const match = header.match(chapterRegex);
        if (match) {
          const chapterNumber = parseInt(match[1]);
          const key = `ch${chapterNumber.toString().padStart(3, '0')}`;
          this.log(`Found chapter column: ${header} -> ${key}`);
          finalChapterColumns.push(key);
        }
      }
      
      // 按章節號排序
      finalChapterColumns.sort((a, b) => {
        const numA = parseInt(a.slice(2));
        const numB = parseInt(b.slice(2));
        return numA - numB;
      });
      
      this.log(`Final chapter columns count: ${finalChapterColumns.length}`);
      this.log(`Final chapter columns: ${finalChapterColumns.join(', ')}`);
      
      return finalChapterColumns;
    } catch (error) {
      this.log(`Error collecting chapter columns: ${error.message}`);
      return [];
    }
  }
}

module.exports = WorksheetHandler; 