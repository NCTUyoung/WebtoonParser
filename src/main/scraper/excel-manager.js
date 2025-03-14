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
  
  async saveToExcel(info, chapters, externalSavePath, append = false) {
    this.log(`Saving to Excel: ${externalSavePath}, Append mode: ${append}`)
    
    try {
      const { workbook, savePath, fileExists } = await this._prepareWorkbookAndPath(externalSavePath)
      const chaptersByNumber = this._prepareChapterData(chapters)
      const sheetName = Utils.sanitizeFilename(info.title, config.excel.sheetNameMaxLength)
      
      const { worksheet, chapterColumns } = await this._getOrCreateWorksheet(
        workbook, sheetName, chaptersByNumber, fileExists, append
      )

      await this._addNewRowToWorksheet(worksheet, info, chaptersByNumber)
      return await this._saveWorkbookToFile(workbook, savePath, sheetName)
    } catch (error) {
      this.log(`Error saving to Excel: ${error.message}`)
      return false
    }
  }
  
  async _prepareWorkbookAndPath(externalSavePath) {
    const workbook = new ExcelJS.Workbook()
    const filename = `webtoon_stats_${new Date().toISOString().slice(0,10)}.xlsx`
    let savePath
    
    if (externalSavePath) {
      if (FileHelper.isDirectory(externalSavePath)) {
        savePath = path.join(externalSavePath, filename)
      } else {
        savePath = externalSavePath
      }
    } else {
      savePath = path.join(app.getPath('downloads'), filename)
    }
    
    let fileExists = false
    
    if (FileHelper.fileExists(savePath)) {
      this.log(`Reading existing file: ${savePath}`)
      
      try {
        if (FileHelper.isFileReadWritable(savePath)) {
          this.log(`File is readable and writable`)
          
          try {
            await workbook.xlsx.readFile(savePath)
            this.log(`Successfully read file`)
            fileExists = true
          } catch (error) {
            this.log(`Error reading file: ${error.message}, attempting to create new file`)
          }
        } else {
          this.log(`Warning: File may be in use by another process`)
          const pathInfo = path.parse(savePath)
          savePath = path.join(
            pathInfo.dir, 
            `${pathInfo.name}_${new Date().getTime()}${pathInfo.ext}`
          )
          this.log(`Attempting to use new filename: ${savePath}`)
        }
      } catch (error) {
        this.log(`Error processing file: ${error.message}`)
      }
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
    // Sort chapter columns by number
    const chapterColumns = Object.keys(chaptersByNumber).sort((a, b) => {
      const numA = parseInt(a.slice(2))
      const numB = parseInt(b.slice(2))
      return numA - numB
    })
    
    let worksheet = workbook.getWorksheet(sheetName)
    
    // If worksheet doesn't exist, create a new worksheet
    if (!worksheet) {
      this.log(`Worksheet does not exist, creating new worksheet: ${sheetName}`)
      worksheet = this._createNewWorksheet(workbook, sheetName, chapterColumns)
    } 
    // If worksheet exists but is not append mode, delete existing worksheet and create new
    else if (!append) {
      this.log(`Worksheet exists but not in append mode, removing existing worksheet: ${sheetName}`)
      workbook.removeWorksheet(worksheet.id)
      worksheet = this._createNewWorksheet(workbook, sheetName, chapterColumns)
    } 
    // If worksheet exists and is append mode, keep existing worksheet and add new columns
    else {
      this.log(`Appending to existing worksheet: ${sheetName}`)
      
      // Get existing column headers
      const headerRow = worksheet.getRow(1)
      const existingHeaders = {}
      const existingChapterColumns = []
      
      // Loop through all cells in the first row to get column headers
      headerRow.eachCell((cell, colNumber) => {
        const headerValue = cell.value ? cell.value.toString() : ''
        existingHeaders[headerValue] = colNumber
        
        if (headerValue.toUpperCase().startsWith('CH')) {
          existingChapterColumns.push(headerValue.toLowerCase())
        }
      })
      
      this.log(`Existing column headers: ${JSON.stringify(Object.keys(existingHeaders))}`)
      this.log(`Existing chapter columns: ${JSON.stringify(existingChapterColumns)}`)
      this.log(`Newly scraped chapter columns: ${JSON.stringify(chapterColumns.map(key => key.toUpperCase()))}`)
      
      // Check current column count to ensure it doesn't exceed Excel column limit (16384)
      const currentColumnCount = Object.keys(existingHeaders).length
      const maxNewColumns = 16384 - currentColumnCount
      
      // Merge existing chapter columns and new scraped chapter columns
      const allChapterColumns = [...new Set([
        ...existingChapterColumns.map(key => key.toLowerCase()), 
        ...chapterColumns.map(key => key.toLowerCase())
      ])].sort((a, b) => {
        const numA = parseInt(a.slice(2))
        const numB = parseInt(b.slice(2))
        return numA - numB
      })
      
      // Check which chapter columns are new and ensure it doesn't exceed Excel column limit
      const newColumns = []
      for (const key of chapterColumns) {
        const headerText = key.toUpperCase()
        const existingHeaderKeys = Object.keys(existingHeaders).map(h => h.toUpperCase())
        if (!existingHeaderKeys.includes(headerText) && newColumns.length < maxNewColumns) {
          newColumns.push(key)
        }
      }
      
      // Add new columns
      if (newColumns.length > 0) {
        this.log(`Adding new chapter columns: ${newColumns.join(', ')}`)
        for (const key of newColumns) {
          worksheet.addColumn({
            header: key.toUpperCase(),
            key: key,
            width: 10
          })
        }
      }
      
      // Update chapterColumns to include all chapter columns but only include columns already in the worksheet
      const updatedChapterColumns = []
      for (const key of allChapterColumns) {
        const headerText = key.toUpperCase()
        const existingHeaderKeys = Object.keys(existingHeaders).map(h => h.toUpperCase())
        if (existingHeaderKeys.includes(headerText) || newColumns.includes(key)) {
          updatedChapterColumns.push(key)
        }
      }
      
      // Update chapter columns
      chapterColumns.length = 0
      chapterColumns.push(...updatedChapterColumns)
    }
    
    return { worksheet, chapterColumns }
  }
  
  _createNewWorksheet(workbook, sheetName, chapterColumns) {
    const worksheet = workbook.addWorksheet(sheetName)
    
    // Set column definitions
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Author', key: 'author', width: 20 },
      { header: 'Total Views', key: 'views', width: 15 },
      { header: 'Subscribers', key: 'subscribers', width: 15 },
      { header: 'Rating', key: 'rating', width: 10 },
      ...chapterColumns.map(key => ({ header: key.toUpperCase(), key: key, width: 10 }))
    ]
    
    // Ensure header row is correctly set
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    
    return worksheet
  }
  
  async _addNewRowToWorksheet(worksheet, info, chaptersByNumber) {
    // Get header row and column mapping
    const headerRow = worksheet.getRow(1)
    const headerValues = {}
    
    headerRow.eachCell((cell, colNumber) => {
      const headerValue = cell.value ? cell.value.toString() : ''
      headerValues[colNumber] = headerValue
    })
    
    // Create new row data
    const row = {
      date: new Date().toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      author: info.author,
      views: info.views,
      subscribers: info.subscribers,
      rating: info.rating,
    }
    
    // Create row data object
    const rowData = {}
    
    // Fill row data object
    for (let colNumber = 1; colNumber <= Object.keys(headerValues).length; colNumber++) {
      const headerValue = headerValues[colNumber]
      
      if (headerValue) {
        if (headerValue === 'Date' || headerValue === '日期') {
          rowData[headerValue] = row.date
        }
        else if (headerValue === 'Author' || headerValue === '作者') {
          rowData[headerValue] = row.author
        }
        else if (headerValue === 'Total Views' || headerValue === '總觀看數') {
          const views = row.views ? parseInt(row.views.replace(/[^0-9]/g, '')) : 0
          rowData[headerValue] = views
        }
        else if (headerValue === 'Subscribers' || headerValue === '訂閱數') {
          const subscribers = row.subscribers ? parseInt(row.subscribers.replace(/[^0-9]/g, '')) : 0
          rowData[headerValue] = subscribers
        }
        else if (headerValue === 'Rating' || headerValue === '評分') {
          const rating = row.rating ? parseFloat(row.rating) : 0
          rowData[headerValue] = rating
        }
        else if (headerValue.toUpperCase().startsWith('CH')) {
          const chKey = headerValue.toLowerCase()
          const value = chaptersByNumber[chKey] || ''
          const numValue = value ? parseInt(value.replace(/[^0-9]/g, '')) : ''
          rowData[headerValue] = numValue
        }
      }
    }
    
    // Use array form to add row
    const rowArray = []
    for (let colNumber = 1; colNumber <= Object.keys(headerValues).length; colNumber++) {
      const headerValue = headerValues[colNumber]
      rowArray[colNumber] = rowData[headerValue]
    }
    
    // Add new row
    const newRow = worksheet.addRow(rowArray)
    
    // Set cell values directly to ensure data is correctly written
    for (let colNumber = 1; colNumber <= Object.keys(headerValues).length; colNumber++) {
      const headerValue = headerValues[colNumber]
      if (headerValue && rowData[headerValue] !== undefined) {
        const cell = newRow.getCell(colNumber)
        cell.value = rowData[headerValue]
      }
    }
    
    // Set new row style
    newRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
      
      if (typeof cell.value === 'string' && !isNaN(cell.value)) {
        const headerValue = headerValues[cell.col]
        if (headerValue && headerValue.toLowerCase() !== 'rating' && headerValue.toLowerCase() !== '評分') {
          cell.value = parseInt(cell.value.replace(/,/g, ''))
        } else if (headerValue && (headerValue.toLowerCase() === 'rating' || headerValue.toLowerCase() === '評分')) {
          cell.value = parseFloat(cell.value)
        }
      }
    })
    
    // Set new row fill color
    newRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF2CC' }
    }
    
    // Ensure row is committed
    newRow.commit && newRow.commit()
    
    return newRow
  }
  
  async _saveWorkbookToFile(workbook, savePath, sheetName) {
    // Ensure target directory exists
    const targetDir = path.dirname(savePath)
    if (!FileHelper.createDirectory(targetDir)) {
      this.log(`Created target directory: ${targetDir}`)
    }
    
    // Try to save the file
    let saveAttempt = 0
    const maxAttempts = 3
    let savedSuccessfully = false
    let lastError = null
    
    while (saveAttempt < maxAttempts && !savedSuccessfully) {
      try {
        saveAttempt++
        this.log(`Save attempt ${saveAttempt}/${maxAttempts}`)
        
        // Ensure all changes are applied
        const worksheet = workbook.getWorksheet(sheetName)
        worksheet && worksheet.commit && worksheet.commit()
        
        // Use writeBuffer and fs.writeFile method to save the file
        const buffer = await workbook.xlsx.writeBuffer()
        
        await FileHelper.writeFile(savePath, buffer)
        
        savedSuccessfully = true
        this.log(`File saved successfully`)
      } catch (error) {
        lastError = error
        this.log(`Save attempt ${saveAttempt} failed: ${error.message}`)
        
        if (saveAttempt < maxAttempts) {
          // Try using temporary file to save
          try {
            const tempPath = `${savePath}.temp`
            const buffer = await workbook.xlsx.writeBuffer()
            
            await FileHelper.writeFile(tempPath, buffer)
            
            if (FileHelper.fileExists(tempPath)) {
              if (FileHelper.fileExists(savePath)) {
                FileHelper.deleteFile(savePath)
              }
              
              FileHelper.renameFile(tempPath, savePath)
              savedSuccessfully = true
              this.log(`File saved successfully (using temporary file)`)
              break
            }
          } catch (tempError) {
            this.log(`Failed to save using temporary file: ${tempError.message}`)
          }
          
          // If saving with temporary file fails, try using a different filename
          const pathInfo = path.parse(savePath)
          savePath = path.join(
            pathInfo.dir, 
            `${pathInfo.name}_retry${saveAttempt}${pathInfo.ext}`
          )
          this.log(`Attempting to use new filename: ${savePath}`)
        }
      }
    }
    
    if (!savedSuccessfully) {
      throw lastError || new Error('Failed to save file, reached maximum retry attempts')
    }
    
    return this._verifyExcelFile(savePath, sheetName)
  }
  
  async _verifyExcelFile(savePath, sheetName) {
    try {
      // Try to open the file and read its contents
      const verifyWorkbook = new ExcelJS.Workbook()
      
      try {
        await verifyWorkbook.xlsx.readFile(savePath)
      } catch (readError) {
        this.log(`Error reading file: ${readError.message}`)
        return false
      }
      
      // Check if the worksheet exists
      const verifyWorksheet = verifyWorkbook.getWorksheet(sheetName)
      if (!verifyWorksheet) {
        this.log(`Error: Unable to read worksheet ${sheetName}`)
        return false
      }
      
      // Check row count
      const rowCount = verifyWorksheet.rowCount
      if (rowCount === 0) {
        this.log(`Error: No rows in worksheet`)
        return false
      }
      
      // Validate key fields
      const headerRow = verifyWorksheet.getRow(1)
      const headerMap = {}
      
      headerRow.eachCell((cell, colNumber) => {
        const headerValue = cell.value ? cell.value.toString().toLowerCase() : ''
        headerMap[headerValue] = colNumber
      })
      
      const lastRow = verifyWorksheet.getRow(rowCount)
      const lastRowData = {}
      
      lastRow.eachCell((cell, colNumber) => {
        lastRowData[colNumber] = cell.value
      })
      
      const expectedFields = ['Date', 'Author', 'Total Views', 'Subscribers', 'Rating']
      const expectedFieldsChinese = ['日期', '作者', '總觀看數', '訂閱數', '評分']
      let allFieldsPresent = true
      
      // Check English and Chinese field names
      for (let i = 0; i < expectedFields.length; i++) {
        const field = expectedFields[i]
        const fieldChinese = expectedFieldsChinese[i]
        
        const colNumber = headerMap[field.toLowerCase()] || headerMap[fieldChinese.toLowerCase()]
        if (!(colNumber && lastRowData[colNumber] !== undefined)) {
          // Only mark as missing if the field exists in the worksheet
          if (Object.keys(headerMap).includes(field.toLowerCase()) || 
              Object.keys(headerMap).includes(fieldChinese.toLowerCase())) {
            allFieldsPresent = false
          }
        }
      }
      
      if (!allFieldsPresent) {
        this.log(`Warning: Last row data is incomplete, may not have been saved correctly`)
      } else {
        this.log(`Verification successful: All key fields that exist in the worksheet have been saved correctly`)
      }
      
      return true
    } catch (verifyError) {
      this.log(`Error verifying file save: ${verifyError.message}`)
      return false
    }
  }
}

module.exports = ExcelManager 