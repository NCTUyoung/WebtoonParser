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
  
  async saveToExcel(info, chapters, externalSavePath, append = false, customFilename = '') {
    this.log(`Saving to Excel: Path='${externalSavePath || '[Default]'}', Append=${append}, Filename='${customFilename || '[Default]'}'`)
    
    try {
      const { workbook, savePath, fileExists } = await this._prepareWorkbookAndPath(externalSavePath, append, customFilename)
      const chaptersByNumber = this._prepareChapterData(chapters)
      const sheetName = Utils.sanitizeFilename(info.title, config.excel.sheetNameMaxLength)
      
      const { worksheet, chapterColumns } = await this._getOrCreateWorksheet(
        workbook, sheetName, chaptersByNumber, fileExists, append
      )

      await this._addNewRowToWorksheet(worksheet, info, chaptersByNumber, chapterColumns)
      return await this._saveWorkbookToFile(workbook, savePath, sheetName)
    } catch (error) {
      this.log(`Error saving to Excel: ${error.message}`)
      console.error("Excel Save Error:", error) // Log full error
      return false
    }
  }
  
  async _prepareWorkbookAndPath(externalSavePath, append, customFilename) {
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
      filename = `webtoon_stats_daily_append.xlsx`
      this.log(`Append mode without custom filename, using fixed filename: ${filename}`)
    } else {
      filename = `webtoon_stats_${new Date().toISOString().slice(0,10)}.xlsx`
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
  
  _prepareChapterData(chapters) {
    const chaptersByNumber = {}
    
    chapters.forEach(chapter => {
      const num = parseInt(chapter.number.replace('#', ''))
      const likes = chapter.likes.replace(/[^0-9,]/g, '')
      const key = `ch${num.toString().padStart(2, '0')}`
      chaptersByNumber[key] = likes
    })
    
    return chaptersByNumber
  }
  
  async _getOrCreateWorksheet(workbook, sheetName, chaptersByNumber, fileExists, append) {
    const chapterKeys = Object.keys(chaptersByNumber)
    chapterKeys.sort((a, b) => {
      const numA = parseInt(a.slice(2))
      const numB = parseInt(b.slice(2))
      return numA - numB
    })
    
    let worksheet = workbook.getWorksheet(sheetName)
    let finalChapterColumns = []

    if (!worksheet) {
      this.log(`Worksheet does not exist, creating new worksheet: ${sheetName}`)
      worksheet = this._createNewWorksheet(workbook, sheetName, chapterKeys)
      finalChapterColumns = chapterKeys
    } else if (!append) {
      this.log(`Worksheet exists but not in append mode, removing existing worksheet: ${sheetName}`)
      workbook.removeWorksheet(worksheet.id)
      worksheet = this._createNewWorksheet(workbook, sheetName, chapterKeys)
      finalChapterColumns = chapterKeys
    } else {
      this.log(`Appending to existing worksheet: ${sheetName}`)
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

      const existingHeaderKeysUpper = Object.keys(existingHeaders)
      const newChapterKeys = chapterKeys.filter(key => !existingHeaders[key.toUpperCase()])

      this.log(`Existing Headers: ${existingHeaderKeysUpper.length}, New Chapter Keys to Add: ${newChapterKeys.length}`)

      if (newChapterKeys.length > 0) {
        const columnsToAdd = newChapterKeys.map(key => ({
          header: key.toUpperCase(),
          key: key, 
          width: 10
        }))
        this.log(`Adding new columns: ${newChapterKeys.map(k => k.toUpperCase()).join(', ')}`)
        newChapterKeys.forEach((key, index) => {
          const colNumber = maxCol + 1 + index
          const headerCell = headerRow.getCell(colNumber)
          headerCell.value = key.toUpperCase()
          headerCell.font = { bold: true }
          headerCell.alignment = { vertical: 'middle', horizontal: 'center' }
          worksheet.getColumn(colNumber).key = key
          worksheet.getColumn(colNumber).width = 10
          existingHeaders[key.toUpperCase()] = colNumber
        })
        headerRow.commit()
      }
      
      const allChapterKeys = Object.keys(existingHeaders)
                                .filter(h => h.startsWith('CH'))
                                .map(h => h.toLowerCase())
      allChapterKeys.sort((a, b) => {
        const numA = parseInt(a.slice(2))
        const numB = parseInt(b.slice(2))
        return numA - numB
      })
      finalChapterColumns = allChapterKeys
    }
    
    return { worksheet, chapterColumns: finalChapterColumns }
  }
  
  _createNewWorksheet(workbook, sheetName, chapterColumns) {
    const worksheet = workbook.addWorksheet(sheetName)
    
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Author', key: 'author', width: 20 },
      { header: 'Total Views', key: 'views', width: 15 },
      { header: 'Subscribers', key: 'subscribers', width: 15 },
      { header: 'Rating', key: 'rating', width: 10 },
      ...chapterColumns.map(key => ({ header: key.toUpperCase(), key: key, width: 10 }))
    ]
    
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    
    return worksheet
  }
  
  async _addNewRowToWorksheet(worksheet, info, chaptersByNumber, chapterColumns) {
    const headerRow = worksheet.getRow(1)
    const colKeyMap = {}
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (cell.value) {
        const key = worksheet.getColumn(colNumber).key || cell.value.toString().toLowerCase()
        colKeyMap[key.toLowerCase()] = colNumber
      }
    })
    
    const rowData = {
      date: new Date().toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      author: info.author,
      views: info.views ? parseInt(info.views.replace(/[^0-9]/g, '')) : 0,
      subscribers: info.subscribers ? parseInt(info.subscribers.replace(/[^0-9]/g, '')) : 0,
      rating: info.rating ? parseFloat(info.rating) : 0,
      ...chaptersByNumber
    }

    const newRow = worksheet.addRow(rowData)

    newRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
      if (typeof cell.value === 'string') {
        const num = Number(cell.value.replace(/,/g, ''))
        if (!isNaN(num)) {
          const colKey = worksheet.getColumn(cell.col).key
          if (colKey !== 'rating') {
            cell.value = num
          } else if (cell.value.includes('.')) {
            cell.value = parseFloat(cell.value)
          }
        }
      }
    })

    newRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF2CC' }
    }
    
    return newRow
  }
  
  async _saveWorkbookToFile(workbook, savePath, sheetName) {
    const targetDir = path.dirname(savePath)
    if (!FileHelper.createDirectory(targetDir)) {
      this.log(`Ensured target directory exists or logged error: ${targetDir}`)
    } else {
      this.log(`Created target directory: ${targetDir}`)
    }
    
    let saveAttempt = 0
    const maxAttempts = 3
    let savedSuccessfully = false
    let lastError = null
    let currentSavePath = savePath

    while (saveAttempt < maxAttempts && !savedSuccessfully) {
      try {
        saveAttempt++
        this.log(`Save attempt ${saveAttempt}/${maxAttempts} to ${currentSavePath}`)
        
        const worksheet = workbook.getWorksheet(sheetName)
        if (worksheet && worksheet.commit) worksheet.commit()
        
        const buffer = await workbook.xlsx.writeBuffer()
        await FileHelper.writeFile(currentSavePath, buffer)
        
        savedSuccessfully = true
        this.log(`File saved successfully to ${currentSavePath}`)
        savePath = currentSavePath

      } catch (error) {
        lastError = error
        this.log(`Save attempt ${saveAttempt} failed: ${error.message}`)
        
        if (saveAttempt < maxAttempts) {
          const pathInfo = path.parse(savePath)
          currentSavePath = path.join(
            pathInfo.dir, 
            `${pathInfo.name}_retry${saveAttempt}_${new Date().getTime()}${pathInfo.ext}`
          )
          this.log(`Attempting retry with new filename: ${currentSavePath}`)
        } else {
          this.log(`Maximum save attempts reached.`)
        }
      }
    }
    
    if (!savedSuccessfully) {
      this.log(`Failed to save file after ${maxAttempts} attempts. Last error: ${lastError?.message || 'Unknown error'}`)
      throw lastError || new Error('Failed to save file, reached maximum retry attempts')
    }
    
    return this._verifyExcelFile(savePath, sheetName)
  }
  
  async _verifyExcelFile(savePath, sheetName) {
    try {
      const verifyWorkbook = new ExcelJS.Workbook()
      await verifyWorkbook.xlsx.readFile(savePath)
      const verifyWorksheet = verifyWorkbook.getWorksheet(sheetName)
      if (!verifyWorksheet) {
        this.log(`Verification Error: Worksheet ${sheetName} not found in ${savePath}`)
        return false
      }
      if (verifyWorksheet.rowCount === 0) {
        this.log(`Verification Error: Worksheet ${sheetName} has no rows in ${savePath}`)
        return false
      }
      this.log(`Verification successful: Worksheet ${sheetName} exists and has rows in ${savePath}`)
      return true
    } catch (verifyError) {
      this.log(`Error verifying file save (${savePath}): ${verifyError.message}`)
      return false
    }
  }
}

module.exports = ExcelManager 