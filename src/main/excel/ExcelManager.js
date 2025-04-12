/**
 * Excel Manager
 * Integrates modular Excel processing classes for data operations
 */

const path = require('path');
const WorkbookHandler = require('./handlers/WorkbookHandler');
const WorksheetHandler = require('./handlers/WorksheetHandler');
const DataHandler = require('./handlers/DataHandler');
const ColumnMapper = require('./utils/ColumnMapper');
const StrategyFactory = require('./strategies/StrategyFactory');
const WorksheetBuilder = require('./utils/WorksheetBuilder');
const ExcelWorksheetProcessor = require('./processors/ExcelWorksheetProcessor');
const ExcelDataFormatter = require('./formatters/ExcelDataFormatter');
const ExcelRowManager = require('./managers/ExcelRowManager');

/**
 * Excel管理器 - 主控類
 * 整合各模塊化的Excel處理類進行數據操作
 */
class ExcelManager {
  /**
   * 構造函數
   * @param {Function} logFunction - 日誌記錄函數
   */
  constructor(logFunction) {
    this.log = logFunction || console.log;

    // 初始化所有處理器
    this.workbookHandler = new WorkbookHandler(logFunction);
    this.worksheetHandler = new WorksheetHandler(logFunction);
    this.dataHandler = new DataHandler(logFunction);
    this.columnMapper = new ColumnMapper();
    this.strategyFactory = new StrategyFactory(logFunction);

    // 初始化新的處理類
    this.worksheetProcessor = new ExcelWorksheetProcessor(logFunction);
    this.dataFormatter = new ExcelDataFormatter(logFunction);
    this.rowManager = new ExcelRowManager(logFunction);
  }


  async saveWorkbook(options) {
    // 開始計時
    const startTime = Date.now();
    this.log(`Excel操作開始時間: ${new Date(startTime).toLocaleString()}`);

    try {
      // 解析參數
      const params = this._parseParams(options);
      this.log(`保存Excel: 路徑='${params.externalSavePath || '[預設]'}', 追加=${params.append}, 小說=${params.isNovel}, 文件名='${params.filename || '[預設]'}'`);
      this.log('開始Excel處理');

      // 準備工作簿和數據
      const { workbook, savePath, fileExists, strategy, sheetName, chaptersByNumber } =
        await this._prepareWorkbookAndData(params);

      // 確保fileExists參數被正確傳遞
      params.fileExists = fileExists;

      // 使用工作表處理器處理工作表
      const { worksheet, isExistingSheet, columnMap } =
        await this.worksheetProcessor.processWorksheet(workbook, sheetName, params, strategy, chaptersByNumber);

      if (!worksheet) {
        throw new Error('無法創建或獲取工作表');
      }

      // 使用行管理器添加數據行
      const addedRow = await this.rowManager.addDataRows(
        worksheet, isExistingSheet, columnMap, params, strategy, chaptersByNumber, this.dataFormatter
      );

      // 保存並完成
      const filePath = await this._saveAndFinish(workbook, savePath, sheetName);

      // 計算總耗時
      const endTime = Date.now();
      const elapsedTime = (endTime - startTime) / 1000;
      this.log(`Excel操作完成。總耗時: ${elapsedTime.toFixed(2)}秒`);

      // 返回全面的結果
      return {
        filePath,
        rowAdded: !!addedRow,
        initialRowCount: worksheet.rowCount - 1, // 表示添加行前的行數
        finalRowCount: worksheet.rowCount,
        worksheetName: sheetName,
        processingTime: elapsedTime,
        isAppendMode: params.append
      };
    } catch (error) {
      // 計算錯誤發生時的耗時
      const errorTime = Date.now();
      const elapsedTime = (errorTime - startTime) / 1000;

      this.log(`Excel保存錯誤: ${error.message}`);
      this.log(`操作失敗。耗時: ${elapsedTime.toFixed(2)}秒`);

      // 重新拋出帶有額外上下文的錯誤
      const enhancedError = new Error(`Excel保存操作失敗: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.processingTime = elapsedTime;

      throw enhancedError;
    }
  }

  _parseParams(options) {
    // 初始化默認值
    let params = {
      info: {},
      chapters: [],
      externalSavePath: null,
      append: false,
      isNovel: false,
      filename: ''
    };

    // 如果是舊式參數格式（多個參數）則轉換為結構化對象
    if (arguments.length > 1 || !options || typeof options !== 'object') {
      // Legacy format: (info, chapters, path, append, isNovel, filename)
      params.info = arguments[0] || {};
      params.chapters = arguments[1] || [];
      params.externalSavePath = arguments[2] || null;
      params.append = !!arguments[3]; // 確保是布爾值
      params.isNovel = !!arguments[4]; // 確保是布爾值
      params.filename = arguments[5] || '';

      this.log('使用舊式參數格式，建議更新為對象格式');
    } else {
      // 新格式：單一配置對象
      if (options.info && typeof options.info === 'object') params.info = options.info;
      if (Array.isArray(options.chapters)) params.chapters = options.chapters;
      if (options.savePath) params.externalSavePath = options.savePath;
      if (typeof options.append === 'boolean') params.append = options.append;
      if (typeof options.isNovel === 'boolean') params.isNovel = options.isNovel;
      if (options.filename) params.filename = String(options.filename);
    }

    // 驗證參數
    if (!params.info || typeof params.info !== 'object') {
      this.log('警告: info 參數無效，使用空對象代替');
      params.info = {};
    }

    if (!Array.isArray(params.chapters)) {
      this.log('警告: chapters 參數無效，使用空數組代替');
      params.chapters = [];
    }

    return params;
  }

  async _prepareWorkbookAndData(params) {
    // 獲取適當的策略
    const strategy = this.strategyFactory.getStrategy(params.isNovel);

    // 步驟1：準備工作簿和路徑
    this.log('準備工作簿...');
    const { workbook, savePath, fileExists } = await this.workbookHandler.prepareWorkbookAndPath(
      params.externalSavePath, params.append, params.filename, params.isNovel
    );

    // 步驟2：準備章節數據
    this.log('處理章節數據...');
    const chaptersByNumber = this.dataHandler.prepareChapterData(params.chapters, params.isNovel);

    // 步驟3：獲取或創建工作表名稱
    this.log('準備工作表...');
    const rawTitle = params.info.title || 'Sheet1';
    const sheetName = this.dataHandler.sanitizeSheetName(rawTitle);
    this.log(`使用工作表名稱: ${sheetName}`);

    return {
      workbook,
      savePath,
      fileExists,
      strategy,
      sheetName,
      chaptersByNumber
    };
  }

  async _saveAndFinish(workbook, savePath, sheetName) {
    try {
      this.log('保存Excel文件...');

      // 驗證參數
      if (!workbook) throw new Error('工作簿對象無效');
      if (!savePath) throw new Error('保存路徑無效');
      if (!sheetName) this.log('警告: 未提供工作表名稱');

      // 檢查工作簿是否包含工作表
      const worksheetCount = workbook.worksheets ? workbook.worksheets.length : 0;
      if (worksheetCount === 0) {
        throw new Error('工作簿不包含任何工作表，無法保存');
      }

      this.log(`準備保存工作簿，包含 ${worksheetCount} 個工作表`);

      // 調用處理器保存工作簿
      const result = await this.workbookHandler.saveWorkbookToFile(workbook, savePath, sheetName);

      this.log('保存完成');
      return result;
    } catch (error) {
      this.log(`保存工作簿時出錯: ${error.message}`);
      throw new Error(`無法保存Excel文件: ${error.message}`);
    }
  }
}

module.exports = ExcelManager;