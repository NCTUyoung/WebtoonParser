// Workbook Processor
// Core class that handles all Excel workbook operations including worksheets

const ExcelJS = require('exceljs');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');
const FileHelper = require('../../utils/file-helper');
const Utils = require('../../utils/utils');
const excelConfig = require('../config/excel-config');
const WorksheetBuilder = require('../utils/WorksheetBuilder');

// Core processor class for Excel workbooks and worksheets
class WorkbookProcessor {
  constructor(logFunction) {
    this.log = logFunction || console.log;
  }

  // Main processing method
  async processWorkbook(params) {
    const {
      externalSavePath,
      append,
      filename,
      isNovel,
      info,
      strategy,
      chaptersByNumber
    } = params;

    // Step 1: Prepare workbook
    const { workbook, savePath, fileExists } = await this.prepareWorkbookAndPath(
      externalSavePath, append, filename, isNovel
    );

    // Step 2: Get or create worksheet name
    const rawTitle = info?.title || 'Sheet1';
    const sheetName = this.sanitizeSheetName(rawTitle);
    this.log(`Using worksheet name: ${sheetName}`);

    // Step 3: Process worksheet
    const { worksheet, isExistingSheet, columnMap } = await this.processWorksheet(
      workbook, sheetName, { append, fileExists, isNovel }, strategy, chaptersByNumber
    );

    return {
      workbook,
      savePath,
      fileExists,
      worksheet,
      isExistingSheet,
      columnMap,
      sheetName
    };
  }

  // Sanitize sheet name to comply with Excel limitations
  sanitizeSheetName(title) {
    return Utils.sanitizeFilename(title, excelConfig.sheetNameMaxLength);
  }

  // Process worksheet
  async processWorksheet(workbook, sheetName, params, strategy, chaptersByNumber) {
    let worksheet;
    let isExistingSheet = false;
    let columnMap = {};

    const { append, fileExists } = params;

    // Log processing conditions
    this.log(`Worksheet processing conditions: append=${append}, fileExists=${fileExists}, hasWorksheet=${workbook.getWorksheet(sheetName) ? 'true' : 'false'}`);
    this.logAvailableWorksheets(workbook);

    // Handle worksheet based on conditions
    if (append && fileExists) {
      // Append mode with existing file
      const result = await this.handleAppendModeWithExistingFile(
        workbook, sheetName, strategy, chaptersByNumber
      );

      return result;
    } else {
      // New mode or file doesn't exist
      return this.handleNewWorksheetCreation(
        workbook, sheetName, params, strategy, chaptersByNumber
      );
    }
  }

  // Log available worksheets in workbook
  logAvailableWorksheets(workbook) {
    if (workbook.worksheets && workbook.worksheets.length > 0) {
      const sheetNames = workbook.worksheets.map(ws => ws.name).join(', ');
      this.log(`Available worksheets in workbook: [${sheetNames}]`);
    } else {
      this.log(`No worksheets in workbook`);
    }
  }

  // Handle append mode with existing file
  async handleAppendModeWithExistingFile(workbook, sheetName, strategy, chaptersByNumber) {
    let worksheet = workbook.getWorksheet(sheetName);
    let isExistingSheet = false;
    let columnMap = {};

    if (worksheet) {
      // Found existing worksheet, use it
      isExistingSheet = true;
      this.log(`Appending to existing worksheet: ${sheetName}`);

      // Get column mapping
      const builder = new WorksheetBuilder(worksheet, this.log);
      columnMap = builder.getColumnMap();
      this.log(`Read ${Object.keys(columnMap).length} columns from existing worksheet`);

      // Process column structure
      this.log('Processing column structure...');
      const chapterColumns = this.buildChapterColumns(chaptersByNumber, strategy);
      const columnsAdded = builder.addColumnsToExistingHeader(columnMap, chapterColumns);

      if (columnsAdded > 0) {
        this.log(`Added ${columnsAdded} new columns`);
      }
    } else {
      // No worksheet found in append mode, create new one
      this.log(`Append mode: Worksheet '${sheetName}' not found in workbook, creating new worksheet`);
      worksheet = this.createNewWorksheetWithColumns(workbook, sheetName, strategy, chaptersByNumber, true);
      isExistingSheet = true; // Mark as append mode worksheet
    }

    return { worksheet, isExistingSheet, columnMap };
  }

  // Handle new worksheet creation
  handleNewWorksheetCreation(workbook, sheetName, params, strategy, chaptersByNumber) {
    const { append, fileExists } = params;
    let worksheet;
    let isExistingSheet = false;
    let columnMap = {};

    this.log('Creating new worksheet...');

    // Log why append mode wasn't used
    if (append) {
      if (!fileExists) {
        this.log(`Append mode requested but file doesn't exist, creating new worksheet`);
      } else {
        this.log(`Append mode requested but worksheet '${sheetName}' not found in workbook, creating new worksheet`);
      }
    }

    // Check if worksheet with same name exists
    const existingSheet = workbook.getWorksheet(sheetName);
    if (existingSheet) {
      if (!append) {
        // Non-append mode, delete existing worksheet
        this.log(`Deleting existing worksheet before creating new one: ${sheetName}`);
        workbook.removeWorksheet(sheetName);

        // Create new worksheet
        worksheet = this.createNewWorksheetWithColumns(workbook, sheetName, strategy, chaptersByNumber);
      } else {
        // Append mode, keep existing worksheet
        this.log(`Append mode: Keeping existing worksheet: ${sheetName}`);
        worksheet = existingSheet;
        isExistingSheet = true;

        // Get column mapping
        const builder = new WorksheetBuilder(worksheet, this.log);
        columnMap = builder.getColumnMap();
        this.log(`Read ${Object.keys(columnMap).length} columns from existing worksheet`);

        // Process column structure
        this.log('Processing column structure...');
        const chapterColumns = this.buildChapterColumns(chaptersByNumber, strategy);
        const columnsAdded = builder.addColumnsToExistingHeader(columnMap, chapterColumns);

        if (columnsAdded > 0) {
          this.log(`Added ${columnsAdded} new columns`);
        }
      }
    } else {
      // No worksheet with same name exists, create new one
      worksheet = this.createNewWorksheetWithColumns(workbook, sheetName, strategy, chaptersByNumber);
    }

    return { worksheet, isExistingSheet, columnMap };
  }

  // Create new worksheet with columns
  createNewWorksheetWithColumns(workbook, sheetName, strategy, chaptersByNumber, isAppendMode = false) {
    // Create new worksheet
    const worksheet = workbook.addWorksheet(sheetName);
    const modeLabel = isAppendMode ? "for append mode" : "";
    this.log(`Created new worksheet: ${sheetName} ${modeLabel}`);

    // Set up columns
    const columns = strategy.getColumnsDefinition();

    // Add chapter columns
    const chapterColumns = this.buildChapterColumns(chaptersByNumber, strategy);
    columns.push(...chapterColumns);

    // Use builder to set up
    const builder = new WorksheetBuilder(worksheet, this.log);
    builder
      .addColumns(columns)
      .styleHeader();

    this.log(`Setup worksheet columns: ${columns.length} columns`);

    return worksheet;
  }

  // Build chapter columns
  buildChapterColumns(chaptersByNumber, strategy) {
    const chapterColumns = [];
    const chapterKeys = Object.keys(chaptersByNumber).sort();

    chapterKeys.forEach(key => {
      const chapterNum = key.slice(2).replace(/^0+/, ''); // Remove prefix and leading zeros
      const headerText = strategy.getChapterHeaderFormat(chapterNum);
      chapterColumns.push({
        header: headerText,
        key: key,
        width: 10
      });
    });

    return chapterColumns;
  }

  // Prepare workbook and path
  async prepareWorkbookAndPath(externalSavePath, append, customFilename, isNovel = false) {
    let workbook = new ExcelJS.Workbook();
    let filename;
    let savePath;
    let baseDir = app.getPath('downloads');
    let fileExists = false;

    // Process save directory
    if (externalSavePath) {
      try {
        if (FileHelper.isDirectory(externalSavePath)) {
          baseDir = externalSavePath;
        } else {
          const potentialDir = path.dirname(externalSavePath);
          if (FileHelper.isDirectory(potentialDir)) {
            baseDir = potentialDir;
            if (!customFilename && path.basename(externalSavePath).toLowerCase().endsWith('.xlsx')) {
              customFilename = path.basename(externalSavePath, '.xlsx');
            }
          }
        }
      } catch (error) {
        this.log(`Error: Failed to check save path`);
      }
    }

    // Determine filename
    const sanitizedCustomFilename = customFilename ? Utils.sanitizeFilename(customFilename) : '';

    if (sanitizedCustomFilename) {
      filename = `${sanitizedCustomFilename}.xlsx`;
    } else if (append) {
      // Use filename format from config
      filename = isNovel
        ? excelConfig.filenameFormats.novel.append
        : excelConfig.filenameFormats.webtoon.append;
    } else {
      // Use default filename with date
      const dateStr = new Date().toISOString().slice(0,10);
      const fileFormat = isNovel
        ? excelConfig.filenameFormats.novel.default
        : excelConfig.filenameFormats.webtoon.default;
      filename = fileFormat.replace('{date}', dateStr);
    }

    // Combine full save path
    savePath = path.join(baseDir, filename);

    // Handle existing file situation
    try {
      if (fs.existsSync(savePath)) {
        try {
          // Try to read file status
          const stats = fs.statSync(savePath);
          if (stats.isFile()) {
            try {
              // Try to read Excel file
              await workbook.xlsx.readFile(savePath);
              fileExists = true;

              // Log worksheet names in workbook
              if (workbook.worksheets && workbook.worksheets.length > 0) {
                const sheetNames = workbook.worksheets.map(ws => ws.name).join(', ');
                this.log(`Read worksheets from file: [${sheetNames}]`);
              } else {
                this.log(`No worksheets in the read file`);
              }

              this.log(`Read existing file: ${path.basename(savePath)}`);
            } catch (readError) {
              this.log(`Failed to read existing file: ${readError.message}`);
              workbook = new ExcelJS.Workbook();
              fileExists = false;
            }
          } else {
            this.log(`Path exists but is not a file: ${savePath}`);
            fileExists = false;
          }
        } catch (statsError) {
          this.log(`Failed to check file status: ${statsError.message}`);
          // Create new filename with timestamp
          const pathInfo = path.parse(savePath);
          savePath = path.join(
            pathInfo.dir,
            `${pathInfo.name}_${new Date().getTime()}${pathInfo.ext}`
          );
          this.log(`Using new filename: ${path.basename(savePath)}`);
          fileExists = false;
          workbook = new ExcelJS.Workbook();
        }
      } else {
        // Ensure directory exists
        try {
          const dirPath = path.dirname(savePath);
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            this.log(`Created directory: ${dirPath}`);
          }
        } catch (mkdirError) {
          this.log(`Failed to create directory: ${mkdirError.message}`);
        }

        fileExists = false;
        this.log(`Will create new file: ${path.basename(savePath)}`);
      }
    } catch (checkError) {
      this.log(`Error checking file status: ${checkError.message}`);
      fileExists = false;
      workbook = new ExcelJS.Workbook();
    }

    return { workbook, savePath, fileExists };
  }

  // Save workbook to file
  async saveWorkbookToFile(workbook, savePath, sheetName) {
    this.log(`Attempting to save to: ${savePath}`);

    try {
      // Ensure directory exists
      const dirPath = path.dirname(savePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        this.log(`Created directory: ${dirPath}`);
      }

      // Write file
      await workbook.xlsx.writeFile(savePath);
      this.log(`Saved Excel: ${path.basename(savePath)}`);

      // Verify saved file
      if (fs.existsSync(savePath)) {
        const stats = fs.statSync(savePath);
        this.log(`File size: ${stats.size} bytes`);

        const isValid = await this.verifyExcelFile(savePath, sheetName);
        if (isValid) {
          return savePath;
        } else {
          this.log(`Excel file validation failed: ${savePath}`);
          throw new Error(`Excel file validation failed`);
        }
      } else {
        this.log(`File does not exist: ${savePath}`);
        throw new Error(`File does not exist after save`);
      }
    } catch (error) {
      this.log(`Error saving file: ${error.message}`);

      // Try to save to temp directory as backup
      try {
        const fallbackDir = app.getPath('temp');
        // Ensure temp directory exists
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }

        const fallbackPath = path.join(fallbackDir, `excel_fallback_${Date.now()}.xlsx`);
        this.log(`Attempting to save to backup path: ${fallbackPath}`);

        await workbook.xlsx.writeFile(fallbackPath);
        this.log(`Saved to backup path: ${fallbackPath}`);

        // Verify backup file
        if (fs.existsSync(fallbackPath)) {
          const isFallbackValid = await this.verifyExcelFile(fallbackPath, sheetName);
          if (isFallbackValid) {
            return fallbackPath; // Return backup path as success path
          } else {
            this.log(`Backup file validation failed`);
            throw new Error(`Both original and backup file validation failed`);
          }
        } else {
          this.log(`Backup file does not exist: ${fallbackPath}`);
          throw new Error(`Backup file does not exist after save`);
        }
      } catch (fallbackError) {
        this.log(`Backup save error: ${fallbackError.message}`);
        throw new Error(`Unable to save file: ${error.message}, Backup error: ${fallbackError.message}`);
      }
    }
  }

  // Verify Excel file
  async verifyExcelFile(savePath, sheetName) {
    try {
      this.log(`Verifying Excel file: ${path.basename(savePath)}`);
      if (!fs.existsSync(savePath)) {
        this.log(`Verification failed: File does not exist`);
        return false;
      }

      // Check file size
      const stats = fs.statSync(savePath);
      if (stats.size === 0) {
        this.log(`Verification failed: File size is 0`);
        return false;
      }

      // Try to open file
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(savePath);

        // First try to get specified worksheet
        let worksheet = workbook.getWorksheet(sheetName);

        // If specified worksheet not found, get first worksheet
        if (!worksheet && workbook.worksheets.length > 0) {
          worksheet = workbook.worksheets[0];
          this.log(`Specified worksheet '${sheetName}' not found, using first worksheet '${worksheet.name}'`);
        }

        // Verify worksheet has content
        if (worksheet && worksheet.rowCount > 0) {
          this.log(`File verified successfully: Contains ${worksheet.rowCount} rows in worksheet '${worksheet.name}'`);
          return true;
        } else {
          this.log(`Verification warning: Worksheet exists but may be empty`);
          return true; // Still consider valid even if empty
        }
      } catch (readError) {
        this.log(`Verification failed: Could not read file: ${readError.message}`);
        return false;
      }
    } catch (error) {
      this.log(`Verification error: ${error.message}`);
      return false;
    }
  }
}

module.exports = WorkbookProcessor;