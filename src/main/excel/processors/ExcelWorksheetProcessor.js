/**
 * Excel工作表處理器
 * 處理工作表創建、更新和管理等操作
 */

const WorksheetBuilder = require('../utils/WorksheetBuilder');

class ExcelWorksheetProcessor {
  constructor(logFunction) {
    this.log = logFunction || console.log;
  }
  
  async processWorksheet(workbook, sheetName, params, strategy, chaptersByNumber) {
    let worksheet;
    let isExistingSheet = false;
    let columnMap = {};
    
    const { append, fileExists } = params;
    
    // 記錄處理條件
    this.log(`工作表處理條件: append=${append}, fileExists=${fileExists}, hasWorksheet=${workbook.getWorksheet(sheetName) ? 'true' : 'false'}`);
    this.logAvailableWorksheets(workbook);
    
    // 根據不同情況處理工作表
    if (append && fileExists) {
      // 追加模式且文件存在的情況
      const result = await this.handleAppendModeWithExistingFile(
        workbook, sheetName, strategy, chaptersByNumber
      );
      
      return result;
    } else {
      // 非追加模式或文件不存在的情況
      return this.handleNewWorksheetCreation(
        workbook, sheetName, params, strategy, chaptersByNumber
      );
    }
  }

  logAvailableWorksheets(workbook) {
    if (workbook.worksheets && workbook.worksheets.length > 0) {
      const sheetNames = workbook.worksheets.map(ws => ws.name).join(', ');
      this.log(`工作簿中可用的工作表: [${sheetNames}]`);
    } else {
      this.log(`工作簿中沒有工作表`);
    }
  }

  async handleAppendModeWithExistingFile(workbook, sheetName, strategy, chaptersByNumber) {
    let worksheet = workbook.getWorksheet(sheetName);
    let isExistingSheet = false;
    let columnMap = {};
    
    if (worksheet) {
      // 找到現有工作表，使用它
      isExistingSheet = true;
      this.log(`追加到現有工作表: ${sheetName}`);
      
      // 獲取列映射
      const builder = new WorksheetBuilder(worksheet, this.log);
      columnMap = builder.getColumnMap();
      this.log(`從現有工作表讀取了 ${Object.keys(columnMap).length} 列`);
      
      // 處理列結構
      this.log('處理列結構...');
      const chapterColumns = this.buildChapterColumns(chaptersByNumber, strategy);
      const columnsAdded = builder.addColumnsToExistingHeader(columnMap, chapterColumns);
      
      if (columnsAdded > 0) {
        this.log(`添加了 ${columnsAdded} 個新列`);
      }
    } else {
      // 在追加模式下沒有找到指定工作表，創建新的
      this.log(`追加模式: 工作簿中沒有找到工作表 '${sheetName}'，創建新工作表`);
      worksheet = this.createNewWorksheetWithColumns(workbook, sheetName, strategy, chaptersByNumber, true);
      isExistingSheet = true; // 標記為追加模式的工作表
    }
    
    return { worksheet, isExistingSheet, columnMap };
  }

  handleNewWorksheetCreation(workbook, sheetName, params, strategy, chaptersByNumber) {
    const { append, fileExists } = params;
    let worksheet;
    let isExistingSheet = false;
    let columnMap = {};
    
    this.log('創建新工作表...');
    
    // 記錄為什麼沒有使用追加模式
    if (append) {
      if (!fileExists) {
        this.log(`請求了追加模式但文件不存在，創建新工作表`);
      } else {
        this.log(`請求了追加模式但工作簿中沒有找到工作表 '${sheetName}'，創建新工作表`);
      }
    }
    
    // 檢查是否已存在同名工作表
    const existingSheet = workbook.getWorksheet(sheetName);
    if (existingSheet) {
      if (!append) {
        // 非追加模式，刪除現有工作表
        this.log(`在創建新工作表前刪除現有工作表: ${sheetName}`);
        workbook.removeWorksheet(sheetName);
        
        // 創建新工作表
        worksheet = this.createNewWorksheetWithColumns(workbook, sheetName, strategy, chaptersByNumber);
      } else {
        // 追加模式，保留現有工作表
        this.log(`追加模式: 保留現有工作表: ${sheetName}`);
        worksheet = existingSheet;
        isExistingSheet = true;
        
        // 獲取列映射
        const builder = new WorksheetBuilder(worksheet, this.log);
        columnMap = builder.getColumnMap();
        this.log(`從現有工作表讀取了 ${Object.keys(columnMap).length} 列`);
        
        // 處理列結構
        this.log('處理列結構...');
        const chapterColumns = this.buildChapterColumns(chaptersByNumber, strategy);
        const columnsAdded = builder.addColumnsToExistingHeader(columnMap, chapterColumns);
        
        if (columnsAdded > 0) {
          this.log(`添加了 ${columnsAdded} 個新列`);
        }
      }
    } else {
      // 不存在同名工作表，創建新的
      worksheet = this.createNewWorksheetWithColumns(workbook, sheetName, strategy, chaptersByNumber);
    }
    
    return { worksheet, isExistingSheet, columnMap };
  }


  createNewWorksheetWithColumns(workbook, sheetName, strategy, chaptersByNumber, isAppendMode = false) {
    // 創建新工作表
    const worksheet = workbook.addWorksheet(sheetName);
    const modeLabel = isAppendMode ? "用於追加模式" : "";
    this.log(`創建了新工作表: ${sheetName} ${modeLabel}`);
    
    // 設置列
    const columns = strategy.getColumnsDefinition();
    
    // 添加章節列
    const chapterColumns = this.buildChapterColumns(chaptersByNumber, strategy);
    columns.push(...chapterColumns);
    
    // 使用構建器設置
    const builder = new WorksheetBuilder(worksheet, this.log);
    builder
      .addColumns(columns)
      .styleHeader();
    
    this.log(`設置了工作表列: ${columns.length} 列`);
    
    return worksheet;
  }
  
  buildChapterColumns(chaptersByNumber, strategy) {
    const chapterColumns = [];
    const chapterKeys = Object.keys(chaptersByNumber).sort();
    
    chapterKeys.forEach(key => {
      const chapterNum = key.slice(2).replace(/^0+/, ''); // 去除前綴和前導零
      const headerText = strategy.getChapterHeaderFormat(chapterNum);
      chapterColumns.push({ 
        header: headerText, 
        key: key, 
        width: 10 
      });
    });
    
    return chapterColumns;
  }
}

module.exports = ExcelWorksheetProcessor; 