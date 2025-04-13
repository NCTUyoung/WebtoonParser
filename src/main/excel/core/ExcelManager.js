// Excel Manager
// Main class that orchestrates Excel processing operations

const WorkbookProcessor = require('./WorkbookProcessor');
const ExcelService = require('./ExcelService');
const StrategyFactory = require('../strategies/StrategyFactory');

// Main Excel Manager class
class ExcelManager {
  constructor(logFunction) {
    this.log = logFunction || console.log;

    // Initialize processors and services
    this.workbookProcessor = new WorkbookProcessor(logFunction);
    this.excelService = new ExcelService(logFunction);
    this.strategyFactory = new StrategyFactory(logFunction);
  }

  // Save workbook with data
  async saveWorkbook(options) {
    // Start timing
    const startTime = Date.now();
    this.log(`Excel operation start time: ${new Date(startTime).toLocaleString()}`);

    try {
      // Parse parameters
      const params = this._parseParams(options);
      this.log(`Saving Excel: path='${params.externalSavePath || '[default]'}', append=${params.append}, novel=${params.isNovel}, filename='${params.filename || '[default]'}'`);
      this.log('Starting Excel processing');

      // Get appropriate strategy
      const strategy = this.strategyFactory.getStrategy(params.isNovel);

      // Prepare chapter data
      const chaptersByNumber = this.excelService.prepareChapterData(params.chapters, params.isNovel);

      // Process workbook and worksheet
      const {
        workbook,
        savePath,
        fileExists,
        worksheet,
        isExistingSheet,
        columnMap,
        sheetName
      } = await this.workbookProcessor.processWorkbook({
        externalSavePath: params.externalSavePath,
        append: params.append,
        filename: params.filename,
        isNovel: params.isNovel,
        info: params.info,
        strategy,
        chaptersByNumber
      });

      if (!worksheet) {
        throw new Error('Unable to create or get worksheet');
      }

      // Add data rows
      const addedRow = await this.excelService.addDataRows(
        worksheet,
        isExistingSheet,
        columnMap,
        params,
        strategy,
        chaptersByNumber
      );

      // Save workbook
      const filePath = await this.workbookProcessor.saveWorkbookToFile(workbook, savePath, sheetName);

      // Calculate total time
      const endTime = Date.now();
      const elapsedTime = (endTime - startTime) / 1000;
      this.log(`Excel operation completed. Total time: ${elapsedTime.toFixed(2)} seconds`);

      // Return comprehensive result
      return {
        filePath,
        rowAdded: !!addedRow,
        initialRowCount: worksheet.rowCount - 1,
        finalRowCount: worksheet.rowCount,
        worksheetName: sheetName,
        processingTime: elapsedTime,
        isAppendMode: params.append
      };
    } catch (error) {
      // Calculate time at error
      const errorTime = Date.now();
      const elapsedTime = (errorTime - startTime) / 1000;

      this.log(`Excel save error: ${error.message}`);
      this.log(`Operation failed. Time: ${elapsedTime.toFixed(2)} seconds`);

      // Rethrow with additional context
      const enhancedError = new Error(`Excel save operation failed: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.processingTime = elapsedTime;

      throw enhancedError;
    }
  }

  // Parse parameters from various formats
  _parseParams(options) {
    // Initialize default values
    let params = {
      info: {},
      chapters: [],
      externalSavePath: null,
      append: false,
      isNovel: false,
      filename: ''
    };

    // If legacy parameter format (multiple parameters) convert to structured object
    if (arguments.length > 1 || !options || typeof options !== 'object') {
      // Legacy format: (info, chapters, path, append, isNovel, filename)
      params.info = arguments[0] || {};
      params.chapters = arguments[1] || [];
      params.externalSavePath = arguments[2] || null;
      params.append = !!arguments[3]; // Ensure boolean
      params.isNovel = !!arguments[4]; // Ensure boolean
      params.filename = arguments[5] || '';

      this.log('Using legacy parameter format, consider updating to object format');
    } else {
      // New format: single configuration object
      if (options.info && typeof options.info === 'object') params.info = options.info;
      if (Array.isArray(options.chapters)) params.chapters = options.chapters;
      if (options.savePath) params.externalSavePath = options.savePath;
      if (typeof options.append === 'boolean') params.append = options.append;
      if (typeof options.isNovel === 'boolean') params.isNovel = options.isNovel;
      if (options.filename) params.filename = String(options.filename);
    }

    // Validate parameters
    if (!params.info || typeof params.info !== 'object') {
      this.log('Warning: info parameter invalid, using empty object instead');
      params.info = {};
    }

    if (!Array.isArray(params.chapters)) {
      this.log('Warning: chapters parameter invalid, using empty array instead');
      params.chapters = [];
    }

    return params;
  }
}

module.exports = ExcelManager;