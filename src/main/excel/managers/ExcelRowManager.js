/**
 * Excel行管理器
 * 處理Excel行的添加、驗證等操作
 */

const WorksheetBuilder = require('../utils/WorksheetBuilder');

class ExcelRowManager {
  constructor(logFunction) {
    this.log = logFunction || console.log;
  }

  /**
   * 向工作表添加數據行
   * @param {Object} worksheet - 工作表對象
   * @param {boolean} isExistingSheet - 是否為現有工作表
   * @param {Object} columnMap - 列映射
   * @param {Object} params - 參數
   * @param {Object} strategy - 內容策略
   * @param {Object} chaptersByNumber - 章節數據
   * @param {Object} dataFormatter - 數據格式化器
   * @returns {Object} 添加的行對象
   */
  async addDataRows(worksheet, isExistingSheet, columnMap, params, strategy, chaptersByNumber, dataFormatter) {
    this.log('添加數據行...');

    try {
      // 記錄添加行前的行數
      const initialRowCount = worksheet.rowCount || 0;
      this.log(`添加數據前的行數: ${initialRowCount}`);

      // 格式化日期值
      const dateValue = dataFormatter.formatCurrentDate();

      // 準備行數據並添加
      const builder = new WorksheetBuilder(worksheet, this.log);
      let addedRow;
      let rowData;
      const isAppendMode = params.append;

      if (isExistingSheet && Object.keys(columnMap).length > 0) {
        // 創建用於現有工作表的行數據
        rowData = dataFormatter.prepareExistingSheetRowData(
          columnMap, dateValue, params.info, strategy, chaptersByNumber
        );

        // 使用構建器添加行
        addedRow = builder.addRow(rowData);
        this.log(`添加了包含 ${rowData.filter(v => v !== undefined).length} 個有效字段的數據行（追加模式）`);
      } else {
        // 創建用於新工作表的行數據
        rowData = dataFormatter.prepareNewSheetRowData(
          dateValue, params.info, strategy, chaptersByNumber
        );

        // 使用構建器添加行
        addedRow = builder.addRow(rowData);
        const modeLabel = isAppendMode ? "（新工作表但處於追加模式）" : "（新工作表模式）";
        this.log(`添加了包含 ${Object.keys(rowData).length} 個字段的數據行 ${modeLabel}`);
      }

      // 驗證行是否被添加
      return this.verifyRowAdded(worksheet, initialRowCount, addedRow);
    } catch (error) {
      this.log(`添加數據行時出錯: ${error.message}`);
      throw new Error(`無法添加數據行: ${error.message}`);
    }
  }

  /**
   * 驗證行是否成功添加
   * @param {Object} worksheet - 工作表
   * @param {number} initialRowCount - 初始行數
   * @param {Object} addedRow - 添加的行對象
   * @returns {Object} 添加的行對象
   */
  verifyRowAdded(worksheet, initialRowCount, addedRow) {
    const finalRowCount = worksheet.rowCount || 0;
    const rowsAdded = finalRowCount - initialRowCount;

    if (rowsAdded <= 0) {
      this.log(`警告: 添加行失敗！添加前行數: ${initialRowCount}, 添加後行數: ${finalRowCount}`);
      if (!addedRow) {
        throw new Error('無法將數據行添加到工作表');
      } else {
        this.log('行對象已創建但行數未增加 - Excel行為不一致');
      }
    } else {
      this.log(`行成功添加。行數從 ${initialRowCount} 增加到 ${finalRowCount} (+${rowsAdded} 行)`);
    }

    return addedRow;
  }
}

module.exports = ExcelRowManager;