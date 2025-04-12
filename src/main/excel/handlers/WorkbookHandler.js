/**
 * 工作簿處理類
 * 處理 Excel 工作簿的創建、保存和驗證
 */

const ExcelJS = require('exceljs');
const path = require('path');
const { app } = require('electron');
const FileHelper = require('../../utils/file-helper');
const Utils = require('../../utils/utils');
const excelConfig = require('../config/excel-config');

class WorkbookHandler {
  constructor(logFunction) {
    this.log = logFunction || console.log;
  }
  
  /**
   * 準備工作簿和保存路徑
   * @param {string} externalSavePath - 外部保存路徑（可選）
   * @param {boolean} append - 是否追加模式
   * @param {string} customFilename - 自定義文件名（可選）
   * @param {boolean} isNovel - 是否為小說類型
   * @returns {Object} 工作簿、保存路徑和文件是否存在
   */
  async prepareWorkbookAndPath(externalSavePath, append, customFilename, isNovel = false) {
    let workbook = new ExcelJS.Workbook();
    let filename;
    let savePath;
    let baseDir = app.getPath('downloads');
    let fileExists = false;
    
    // 處理保存目錄
    if (externalSavePath) {
      try {
        if (FileHelper.isDirectory(externalSavePath)) {
          baseDir = externalSavePath;
          this.log(`Using provided directory: ${baseDir}`);
        } else {
          const potentialDir = path.dirname(externalSavePath);
          if (FileHelper.isDirectory(potentialDir)) {
            baseDir = potentialDir;
            this.log(`Using directory from provided path: ${baseDir}`);
            if (!customFilename && path.basename(externalSavePath).toLowerCase().endsWith('.xlsx')) {
              customFilename = path.basename(externalSavePath, '.xlsx');
              this.log(`Inferred custom filename from path: ${customFilename}`);
            }
          } else {
            this.log(`Provided externalSavePath directory does not exist: ${potentialDir}. Using default downloads directory.`);
          }
        }
      } catch (error) {
        this.log(`Error checking externalSavePath '${externalSavePath}': ${error.message}. Using default downloads directory.`);
      }
    } else {
      this.log(`No external save path provided. Using default downloads directory: ${baseDir}`);
    }

    // 決定文件名
    const sanitizedCustomFilename = customFilename ? Utils.sanitizeFilename(customFilename) : '';
    
    if (sanitizedCustomFilename) {
      filename = `${sanitizedCustomFilename}.xlsx`;
      this.log(`Using custom filename: ${filename}`);
    } else if (append) {
      // 使用配置中的文件名格式
      filename = isNovel 
        ? excelConfig.filenameFormats.novel.append 
        : excelConfig.filenameFormats.webtoon.append;
      this.log(`Append mode without custom filename, using fixed filename: ${filename}`);
    } else {
      // 使用帶日期的默認文件名
      const dateStr = new Date().toISOString().slice(0,10);
      const fileFormat = isNovel 
        ? excelConfig.filenameFormats.novel.default 
        : excelConfig.filenameFormats.webtoon.default;
      filename = fileFormat.replace('{date}', dateStr);
      this.log(`Default mode, using date-based filename: ${filename}`);
    }
    
    // 組合完整保存路徑
    savePath = path.join(baseDir, filename);
    this.log(`Determined final save path: ${savePath}`);

    // 處理現有文件的情況
    try {
      if (FileHelper.fileExists(savePath)) {
        this.log(`Checking existing file: ${savePath}`);
        if (FileHelper.isFileReadWritable(savePath)) {
          this.log(`Existing file is readable and writable`);
          try {
            await workbook.xlsx.readFile(savePath);
            this.log(`Successfully read existing workbook from ${savePath}`);
            fileExists = true;
          } catch (readError) {
            this.log(`Error reading existing workbook: ${readError.message}. A new file will be created.`);
            workbook = new ExcelJS.Workbook();
            fileExists = false;
          }
        } else {
          this.log(`Warning: Existing file exists but may be in use or not writable: ${savePath}`);
          // 創建帶時間戳的新文件名
          const pathInfo = path.parse(savePath);
          savePath = path.join(
            pathInfo.dir, 
            `${pathInfo.name}_${new Date().getTime()}${pathInfo.ext}`
          );
          this.log(`Attempting to use new filename due to potential conflict: ${savePath}`);
          fileExists = false;
          workbook = new ExcelJS.Workbook();
        }
      } else {
        this.log(`File does not exist at ${savePath}, a new file will be created.`);
        fileExists = false;
      }
    } catch (checkError) {
      this.log(`Error checking file status: ${checkError.message}. Assuming file does not exist or cannot be used.`);
      fileExists = false;
      workbook = new ExcelJS.Workbook();
    }
    
    return { workbook, savePath, fileExists };
  }
  
  /**
   * 保存工作簿到文件
   * @param {Object} workbook - Excel 工作簿對象
   * @param {string} savePath - 保存路徑
   * @param {string} sheetName - 主工作表名稱（用於驗證）
   * @returns {string} 保存成功的文件路徑
   */
  async saveWorkbookToFile(workbook, savePath, sheetName) {
    try {
      await workbook.xlsx.writeFile(savePath);
      this.log(`Workbook successfully saved to ${savePath}`);

      // 驗證保存的文件
      const isValid = await this.verifyExcelFile(savePath, sheetName);
      if (isValid) {
        this.log(`Excel file ${savePath} verified successfully.`);
        return savePath;
      } else {
        this.log(`Error: Excel file ${savePath} verification failed after saving.`);
        throw new Error(`Excel file verification failed for ${savePath}`);
      }
    } catch (error) {
      this.log(`Error writing workbook to file: ${error.message}`);
      
      // 嘗試保存到臨時目錄作為備份
      const fallbackDir = app.getPath('temp');
      const fallbackPath = path.join(fallbackDir, `excel_save_fallback_${Date.now()}.xlsx`);
      this.log(`Attempting to save to fallback path: ${fallbackPath}`);
      
      try {
        await workbook.xlsx.writeFile(fallbackPath);
        this.log(`Workbook successfully saved to fallback path: ${fallbackPath}`);
        
        // 驗證備份文件
        const isFallbackValid = await this.verifyExcelFile(fallbackPath, sheetName);
        if (isFallbackValid) {
          this.log(`Fallback Excel file ${fallbackPath} verified successfully.`);
          throw new Error(`Original save failed. Data saved to fallback: ${fallbackPath}. Error: ${error.message}`);
        } else {
          this.log(`Error: Fallback Excel file ${fallbackPath} verification failed.`);
          throw new Error(`Original save failed and fallback save verification failed. Error: ${error.message}`);
        }
      } catch (fallbackError) {
        this.log(`Error saving workbook to fallback path: ${fallbackError.message}`);
        throw new Error(`Failed to save workbook to both original and fallback paths. Original error: ${error.message}, Fallback error: ${fallbackError.message}`);
      }
    }
  }
  
  /**
   * 驗證 Excel 文件
   * @param {string} savePath - 文件路徑
   * @param {string} sheetName - 工作表名稱
   * @returns {boolean} 驗證是否成功
   */
  async verifyExcelFile(savePath, sheetName) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(savePath);
      
      // 檢查工作表是否存在
      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) {
        this.log(`Verification failed: Worksheet '${sheetName}' not found in ${savePath}`);
        return false;
      }
      
      // 檢查工作表是否有行
      if (worksheet.rowCount === 0) {
        this.log(`Verification failed: Worksheet '${sheetName}' is empty in ${savePath}`);
        return false;
      }
      
      this.log(`Verification passed: Worksheet '${sheetName}' found with ${worksheet.rowCount} rows.`);
      return true;
    } catch (error) {
      this.log(`Verification error for ${savePath}: ${error.message}`);
      return false;
    }
  }
}

module.exports = WorkbookHandler; 