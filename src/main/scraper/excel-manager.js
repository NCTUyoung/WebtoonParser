const ExcelJS = require('exceljs')
const path = require('path')
const { app } = require('electron')
const FileHelper = require('../utils/file-helper')
const Utils = require('../utils/utils')
const config = require('../core/config')

// Excel manager class for handling Excel file operations
class ExcelManager {
  constructor(logFunction) {
    this.log = logFunction
  }
  
  async saveWorkbook(info, chapters, externalSavePath, append = false, isNovel = false, customFilename = '') {
    this.log(`Saving to Excel: Path='${externalSavePath || '[Default]'}', Append=${append}, IsNovel=${isNovel}, Filename='${customFilename || '[Default]'}'`)
    
    try {
      const { workbook, savePath, fileExists } = await this._prepareWorkbookAndPath(externalSavePath, append, customFilename, isNovel)
      const chaptersByNumber = this._prepareChapterData(chapters, isNovel)
      const sheetName = Utils.sanitizeFilename(info.title, config.excel.sheetNameMaxLength)
      
      const { worksheet, chapterColumns } = await this._getOrCreateWorksheet(
        workbook, sheetName, chaptersByNumber, fileExists, append, isNovel
      )

      await this._addNewRowToWorksheet(worksheet, info, chaptersByNumber, isNovel)
      return await this._saveWorkbookToFile(workbook, savePath, sheetName)
    } catch (error) {
      this.log(`Error saving to Excel: ${error.message}`)
      console.error("Excel Save Error:", error) // Log full error
      throw error // Re-throw the error for scraping-manager to catch
    }
  }
  
  async _prepareWorkbookAndPath(externalSavePath, append, customFilename, isNovel = false) {
    let workbook = new ExcelJS.Workbook()
    let filename
    let savePath
    let baseDir = app.getPath('downloads')
    let fileExists = false
    
    if (externalSavePath) {
      try {
        if (FileHelper.isDirectory(externalSavePath)) {
          baseDir = externalSavePath
          this.log(`Using provided directory: ${baseDir}`)
        } else {
          const potentialDir = path.dirname(externalSavePath)
          if (FileHelper.isDirectory(potentialDir)) {
            baseDir = potentialDir
            this.log(`Using directory from provided path: ${baseDir}`)
            if (!customFilename && path.basename(externalSavePath).toLowerCase().endsWith('.xlsx')) {
              customFilename = path.basename(externalSavePath, '.xlsx')
              this.log(`Inferred custom filename from path: ${customFilename}`)
            }
          } else {
            this.log(`Provided externalSavePath directory does not exist: ${potentialDir}. Using default downloads directory.`)
          }
        }
      } catch (error) {
        this.log(`Error checking externalSavePath '${externalSavePath}': ${error.message}. Using default downloads directory.`)
      }
    } else {
      this.log(`No external save path provided. Using default downloads directory: ${baseDir}`)
    }

    const sanitizedCustomFilename = customFilename ? Utils.sanitizeFilename(customFilename) : ''
    
    if (sanitizedCustomFilename) {
      filename = `${sanitizedCustomFilename}.xlsx`
      this.log(`Using custom filename: ${filename}`)
    } else if (append) {
      filename = isNovel ? `novel_stats_daily_append.xlsx` : `webtoon_stats_daily_append.xlsx`
      this.log(`Append mode without custom filename, using fixed filename: ${filename}`)
    } else {
      const prefix = isNovel ? 'novel_stats' : 'webtoon_stats'
      filename = `${prefix}_${new Date().toISOString().slice(0,10)}.xlsx`
      this.log(`Default mode, using date-based filename: ${filename}`)
    }
    
    savePath = path.join(baseDir, filename)
    this.log(`Determined final save path: ${savePath}`)

    try {
      if (FileHelper.fileExists(savePath)) {
        this.log(`Checking existing file: ${savePath}`)
        if (FileHelper.isFileReadWritable(savePath)) {
          this.log(`Existing file is readable and writable`)
          try {
            await workbook.xlsx.readFile(savePath)
            this.log(`Successfully read existing workbook from ${savePath}`)
            fileExists = true
          } catch (readError) {
            this.log(`Error reading existing workbook: ${readError.message}. A new file will be created.`)
            workbook = new ExcelJS.Workbook()
            fileExists = false
          }
        } else {
          this.log(`Warning: Existing file exists but may be in use or not writable: ${savePath}`)
          const pathInfo = path.parse(savePath)
          savePath = path.join(
            pathInfo.dir, 
            `${pathInfo.name}_${new Date().getTime()}${pathInfo.ext}`
          )
          this.log(`Attempting to use new filename due to potential conflict: ${savePath}`)
          fileExists = false
          workbook = new ExcelJS.Workbook()
        }
      } else {
        this.log(`File does not exist at ${savePath}, a new file will be created.`)
        fileExists = false
      }
    } catch (checkError) {
      this.log(`Error checking file status: ${checkError.message}. Assuming file does not exist or cannot be used.`)
      fileExists = false
      workbook = new ExcelJS.Workbook()
    }
    
    return { workbook, savePath, fileExists }
  }
  
  _prepareChapterData(chapters, isNovel) {
    const chaptersByNumber = {}
    
    chapters.forEach(chapter => {
      const numberMatch = chapter.number?.toString().match(/\d+$/)
      const num = numberMatch ? parseInt(numberMatch[0], 10) : null

      if (num === null) {
        this.log(`Warning: Could not parse chapter number from '${chapter.number}'. Skipping chapter.`)
        return
      }

      let value
      if (isNovel) {
        value = (typeof chapter.words === 'number') ? chapter.words : 0
      } else {
        value = chapter.likes ? parseInt(chapter.likes.replace(/[^0-9]/g, '')) : 0
      }

      const key = `ch${num.toString().padStart(3, '0')}`
      chaptersByNumber[key] = value
    })
    
    return chaptersByNumber
  }
  
  async _getOrCreateWorksheet(workbook, sheetName, chaptersByNumber, fileExists, append, isNovel) {
    try {
      const chapterKeys = Object.keys(chaptersByNumber)
      if (chapterKeys.length > 0) {
        chapterKeys.sort((a, b) => {
          const numA = parseInt(a.slice(2))
          const numB = parseInt(b.slice(2))
          return numA - numB
        })
      } else {
        this.log(`Warning: No chapter keys found in data.`)
      }
      
      let worksheet = workbook.getWorksheet(sheetName)
      let finalChapterColumns = []

      if (!worksheet) {
        this.log(`Worksheet does not exist, creating new worksheet: ${sheetName}`)
        worksheet = this._createNewWorksheet(workbook, sheetName, chapterKeys, isNovel)
        finalChapterColumns = chapterKeys
        this.log(`Created new worksheet with ${finalChapterColumns.length} chapter columns`)
      } else if (!append) {
        this.log(`Worksheet exists but not in append mode, removing existing worksheet: ${sheetName}`)
        workbook.removeWorksheet(worksheet.id)
        worksheet = this._createNewWorksheet(workbook, sheetName, chapterKeys, isNovel)
        finalChapterColumns = chapterKeys
        this.log(`Recreated worksheet with ${finalChapterColumns.length} chapter columns`)
      } else {
        this.log(`Appending to existing worksheet: ${sheetName}`)
        
        // 確保現有的工作表有有效的列定義
        if (!worksheet.columns || !Array.isArray(worksheet.columns) || worksheet.columns.length === 0) {
          this.log(`Warning: Existing worksheet has no valid columns definition. Rebuilding columns.`)
          
          // 從標題行重建列定義
          const headerRow = worksheet.getRow(1)
          const columns = []
          
          headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const header = cell.value ? cell.value.toString() : `Column${colNumber}`
            const key = header.toLowerCase().replace(/[^a-z0-9]/g, '')
            columns.push({
              header: header,
              key: key,
              width: 15
            })
          })
          
          // 如果仍然沒有列定義，則創建基本列
          if (columns.length === 0) {
            this.log(`Warning: Could not rebuild columns from header row. Creating basic columns.`)
            columns.push(
              { header: 'Date', key: 'date', width: 20 },
              { header: 'Author', key: 'author', width: 20 }
            )
          }
          
          worksheet.columns = columns
        }
        
        const headerRow = worksheet.getRow(1)
        const existingHeaders = {}
        let maxCol = 0
        
        headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const headerValue = cell.value ? cell.value.toString() : ''
          if (headerValue) {
            existingHeaders[headerValue.toUpperCase()] = colNumber
            maxCol = Math.max(maxCol, colNumber)
          }
        })

        const chapterHeaderPrefix = isNovel ? 'WORDS_CH' : 'CH'
        const newChapterKeys = chapterKeys.filter(key => {
          const headerText = `${chapterHeaderPrefix}${key.slice(2)}`.toUpperCase()
          const exists = !!existingHeaders[headerText]
          if (exists) {
            this.log(`Chapter column exists: ${headerText}`)
          } else {
            this.log(`New chapter column needed: ${headerText}`)
          }
          return !exists
        })

        this.log(`Existing Headers: ${JSON.stringify(Object.keys(existingHeaders))}`);
        this.log(`Existing Headers Count: ${Object.keys(existingHeaders).length}, New Chapter Keys to Add: ${newChapterKeys.length}`)

        if (newChapterKeys.length > 0) {
          this.log(`Adding new chapter columns: ${newChapterKeys.map(k => `${chapterHeaderPrefix}${k.slice(2)}`).join(', ')}`)
          newChapterKeys.forEach((key, index) => {
            try {
              const colNumber = maxCol + 1 + index
              // 使用與創建新工作表時一致的格式
              const headerText = isNovel 
                ? `Words_CH${key.slice(2)}` 
                : `CH${key.slice(2)}`
              
              this.log(`Adding column #${colNumber} with header "${headerText}" and key "${key}"`)
              const headerCell = headerRow.getCell(colNumber)
              headerCell.value = headerText
              headerCell.font = { bold: true }
              headerCell.alignment = { vertical: 'middle', horizontal: 'center' }
              
              // 確保列有正確的鍵
              worksheet.getColumn(colNumber).key = key
              worksheet.getColumn(colNumber).width = 10
              existingHeaders[headerText.toUpperCase()] = colNumber
            } catch (error) {
              this.log(`Error adding new column "${key}": ${error.message}`)
            }
          })
          
          // 確保更改生效
          headerRow.commit()
        }
        
        // 收集所有章節列，包括既有的和新增的
        try {
          // 創建一個正則表達式來匹配章節列標題
          const chapterRegex = isNovel 
            ? /^WORDS_CH(\d+)$/i  // 小說的列名格式
            : /^CH(\d+)$/i        // 漫畫的列名格式

          this.log(`Using chapter regex: ${chapterRegex}`)
          
          finalChapterColumns = []
          
          // 從標題中提取章節列
          for (const [header, colNumber] of Object.entries(existingHeaders)) {
            const match = header.match(chapterRegex)
            if (match) {
              const chapterNumber = parseInt(match[1])
              const key = `ch${chapterNumber.toString().padStart(3, '0')}`
              this.log(`Found chapter column: ${header} -> ${key}`)
              finalChapterColumns.push(key)
            }
          }
          
          // 按章節號排序
          finalChapterColumns.sort((a, b) => {
            const numA = parseInt(a.slice(2))
            const numB = parseInt(b.slice(2))
            return numA - numB
          })
            
          this.log(`Final chapter columns count: ${finalChapterColumns.length}`)
          this.log(`Final chapter columns: ${finalChapterColumns.join(', ')}`)
        } catch (error) {
          this.log(`Error collecting final chapter columns: ${error.message}`)
          finalChapterColumns = chapterKeys
        }
      }
      
      return { worksheet, chapterColumns: finalChapterColumns }
    } catch (error) {
      this.log(`Error in _getOrCreateWorksheet: ${error.message}`)
      throw error
    }
  }
  
  _createNewWorksheet(workbook, sheetName, chapterKeys, isNovel) {
    const worksheet = workbook.addWorksheet(sheetName)
    
    let columns
    if (isNovel) {
      columns = [
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Author', key: 'author', width: 20 },
        { header: 'Total Views', key: 'views', width: 15 },
        { header: 'Likes', key: 'likes', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Total Chapters', key: 'totalChapters', width: 15 },
        { header: 'Total Words', key: 'totalWords', width: 15 },
        ...chapterKeys.map(key => ({ header: `Words_CH${key.slice(2)}`, key: key, width: 10 }))
      ]
    } else {
      columns = [
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Author', key: 'author', width: 20 },
        { header: 'Total Views', key: 'views', width: 15 },
        { header: 'Subscribers', key: 'subscribers', width: 15 },
        { header: 'Rating', key: 'rating', width: 10 },
        ...chapterKeys.map(key => ({ header: `CH${key.slice(2)}`, key: key, width: 10 }))
      ]
    }

    worksheet.columns = columns

    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    
    return worksheet
  }
  
  async _addNewRowToWorksheet(worksheet, info, chaptersByNumber, isNovel) {
    try {
      const headerRow = worksheet.getRow(1)
      const colKeyMap = {}
      
      // 直接從標題行建立映射關係
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (cell.value) {
          const headerText = cell.value.toString().toUpperCase();
          // 為基本數據欄位建立映射
          if (headerText === 'DATE') colKeyMap['date'] = colNumber;
          else if (headerText === 'AUTHOR') colKeyMap['author'] = colNumber;
          else if (headerText === 'TOTAL VIEWS') colKeyMap['views'] = colNumber;
          else if (headerText === 'SUBSCRIBERS') colKeyMap['subscribers'] = colNumber;
          else if (headerText === 'RATING') colKeyMap['rating'] = colNumber;
          else if (headerText === 'LIKES') colKeyMap['likes'] = colNumber;
          else if (headerText === 'STATUS') colKeyMap['status'] = colNumber;
          else if (headerText === 'TOTAL CHAPTERS') colKeyMap['totalChapters'] = colNumber;
          else if (headerText === 'TOTAL WORDS') colKeyMap['totalWords'] = colNumber;
          
          // 為章節列建立映射
          const chapterMatch = isNovel 
            ? headerText.match(/^WORDS_CH(\d+)$/) 
            : headerText.match(/^CH(\d+)$/);
            
          if (chapterMatch) {
            const chapterNum = parseInt(chapterMatch[1]);
            const key = `ch${chapterNum.toString().padStart(3, '0')}`;
            colKeyMap[key] = colNumber;
          }
        }
      });
      
      this.log(`Column Key Map: ${JSON.stringify(colKeyMap)}`);
      
      // 創建行數據
      let rowData = new Array(worksheet.columnCount + 1); // Excel列从1开始
      
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
      
      // 过滤掉未定义的单元格
      const filteredRowData = {};
      for (let i = 1; i < rowData.length; i++) {
        if (rowData[i] !== undefined) {
          filteredRowData[i] = rowData[i];
        }
      }
      
      // 检查是否有数据要添加
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
  
  async _saveWorkbookToFile(workbook, savePath, sheetName) {
    try {
      await workbook.xlsx.writeFile(savePath)
      this.log(`Workbook successfully saved to ${savePath}`)

      const isValid = await this._verifyExcelFile(savePath, sheetName)
      if (isValid) {
        this.log(`Excel file ${savePath} verified successfully.`)
        return savePath
      } else {
        this.log(`Error: Excel file ${savePath} verification failed after saving.`)
        throw new Error(`Excel file verification failed for ${savePath}`)
      }
    } catch (error) {
      this.log(`Error writing workbook to file: ${error.message}`)
      const fallbackDir = app.getPath('temp')
      const fallbackPath = path.join(fallbackDir, `excel_save_fallback_${Date.now()}.xlsx`)
      this.log(`Attempting to save to fallback path: ${fallbackPath}`)
      try {
        await workbook.xlsx.writeFile(fallbackPath)
        this.log(`Workbook successfully saved to fallback path: ${fallbackPath}`)
        const isFallbackValid = await this._verifyExcelFile(fallbackPath, sheetName)
        if (isFallbackValid) {
          this.log(`Fallback Excel file ${fallbackPath} verified successfully.`)
          throw new Error(`Original save failed. Data saved to fallback: ${fallbackPath}. Error: ${error.message}`)
        } else {
          this.log(`Error: Fallback Excel file ${fallbackPath} verification failed.`)
          throw new Error(`Original save failed and fallback save verification failed. Error: ${error.message}`)
        }
      } catch (fallbackError) {
        this.log(`Error saving workbook to fallback path: ${fallbackError.message}`)
        throw new Error(`Failed to save workbook to both original and fallback paths. Original error: ${error.message}, Fallback error: ${fallbackError.message}`)
      }
    }
  }
  
  async _verifyExcelFile(savePath, sheetName) {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(savePath)
      const worksheet = workbook.getWorksheet(sheetName)
      if (!worksheet) {
        this.log(`Verification failed: Worksheet '${sheetName}' not found in ${savePath}`)
        return false
      }
      if (worksheet.rowCount === 0) {
        this.log(`Verification failed: Worksheet '${sheetName}' is empty in ${savePath}`)
        return false
      }
      this.log(`Verification passed: Worksheet '${sheetName}' found with ${worksheet.rowCount} rows.`)
      return true
    } catch (error) {
      this.log(`Verification error for ${savePath}: ${error.message}`)
      return false
    }
  }
}

module.exports = ExcelManager 