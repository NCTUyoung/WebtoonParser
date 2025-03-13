const axios = require('axios')
const cheerio = require('cheerio')
const ExcelJS = require('exceljs')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')
const config = require('./config')
const Utils = require('./utils')

// File system helper class for handling file operations
class FileHelper {
  static fileExists(filePath) {
    return fs.existsSync(filePath)
  }
  
  static isDirectory(dirPath) {
    if (!this.fileExists(dirPath)) return false
    return fs.lstatSync(dirPath).isDirectory()
  }
  
  static createDirectory(dirPath) {
    if (!this.fileExists(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
      return true
    }
    return false
  }
  
  static isFileReadWritable(filePath) {
    try {
      const fd = fs.openSync(filePath, 'r+')
      fs.closeSync(fd)
      return true
    } catch (error) {
      return false
    }
  }
  
  static writeFile(filePath, data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, data, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
  
  static deleteFile(filePath) {
    if (this.fileExists(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
    return false
  }
  
  static renameFile(oldPath, newPath) {
    if (this.fileExists(oldPath)) {
      fs.renameSync(oldPath, newPath)
      return true
    }
    return false
  }
}

// Excel manager class for handling Excel file operations
class ExcelManager {
  constructor(logFunction) {
    this.log = logFunction
  }
  
  async saveToExcel(info, chapters, externalSavePath, append = false) {
    this.log(`保存到 Excel: ${externalSavePath}, 附加模式: ${append}`)
    
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
      this.log(`保存到 Excel 時出錯: ${error.message}`)
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
      this.log(`讀取現有檔案: ${savePath}`)
      
      try {
        if (FileHelper.isFileReadWritable(savePath)) {
          this.log(`文件可讀寫`)
          
          try {
            await workbook.xlsx.readFile(savePath)
            this.log(`成功讀取文件`)
            fileExists = true
          } catch (error) {
            this.log(`讀取文件時出錯: ${error.message}，嘗試創建新文件`)
          }
        } else {
          this.log(`警告：文件可能被其他程序佔用`)
          const pathInfo = path.parse(savePath)
          savePath = path.join(
            pathInfo.dir, 
            `${pathInfo.name}_${new Date().getTime()}${pathInfo.ext}`
          )
          this.log(`嘗試使用新的文件名: ${savePath}`)
        }
      } catch (error) {
        this.log(`處理文件時出錯: ${error.message}`)
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
      this.log(`工作表不存在，創建新工作表: ${sheetName}`)
      worksheet = this._createNewWorksheet(workbook, sheetName, chapterColumns)
    } 
    // If worksheet exists but is not append mode, delete existing worksheet and create new
    else if (!append) {
      this.log(`工作表存在但不是附加模式，移除現有工作表: ${sheetName}`)
      workbook.removeWorksheet(worksheet.id)
      worksheet = this._createNewWorksheet(workbook, sheetName, chapterColumns)
    } 
    // If worksheet exists and is append mode, keep existing worksheet and add new columns
    else {
      this.log(`附加到現有工作表: ${sheetName}`)
      
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
      
      this.log(`現有列標題: ${JSON.stringify(Object.keys(existingHeaders))}`)
      this.log(`現有章節列: ${JSON.stringify(existingChapterColumns)}`)
      this.log(`新爬取的章節列: ${JSON.stringify(chapterColumns.map(key => key.toUpperCase()))}`)
      
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
        this.log(`添加新章節列: ${newColumns.join(', ')}`)
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
      { header: '日期', key: 'date', width: 20 },
      { header: '作者', key: 'author', width: 20 },
      { header: '總觀看數', key: 'views', width: 15 },
      { header: '訂閱數', key: 'subscribers', width: 15 },
      { header: '評分', key: 'rating', width: 10 },
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
        if (headerValue === '日期') {
          rowData[headerValue] = row.date
        }
        else if (headerValue === '作者') {
          rowData[headerValue] = row.author
        }
        else if (headerValue === '總觀看數') {
          const views = row.views ? parseInt(row.views.replace(/[^0-9]/g, '')) : 0
          rowData[headerValue] = views
        }
        else if (headerValue === '訂閱數') {
          const subscribers = row.subscribers ? parseInt(row.subscribers.replace(/[^0-9]/g, '')) : 0
          rowData[headerValue] = subscribers
        }
        else if (headerValue === '評分') {
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
        if (headerValue && headerValue.toLowerCase() !== '評分' && headerValue.toLowerCase() !== 'rating') {
          cell.value = parseInt(cell.value.replace(/,/g, ''))
        } else if (headerValue && (headerValue.toLowerCase() === '評分' || headerValue.toLowerCase() === 'rating')) {
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
      this.log(`創建目標目錄: ${targetDir}`)
    }
    
    // Try to save the file
    let saveAttempt = 0
    const maxAttempts = 3
    let savedSuccessfully = false
    let lastError = null
    
    while (saveAttempt < maxAttempts && !savedSuccessfully) {
      try {
        saveAttempt++
        this.log(`保存嘗試 ${saveAttempt}/${maxAttempts}`)
        
        // Ensure all changes are applied
        const worksheet = workbook.getWorksheet(sheetName)
        worksheet && worksheet.commit && worksheet.commit()
        
        // Use writeBuffer and fs.writeFile method to save the file
        const buffer = await workbook.xlsx.writeBuffer()
        
        await FileHelper.writeFile(savePath, buffer)
        
        savedSuccessfully = true
        this.log(`文件成功保存`)
      } catch (error) {
        lastError = error
        this.log(`保存嘗試 ${saveAttempt} 失敗: ${error.message}`)
        
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
              this.log(`文件成功保存（使用臨時文件）`)
              break
            }
          } catch (tempError) {
            this.log(`使用臨時文件保存失敗: ${tempError.message}`)
          }
          
          // If saving with temporary file fails, try using a different filename
          const pathInfo = path.parse(savePath)
          savePath = path.join(
            pathInfo.dir, 
            `${pathInfo.name}_retry${saveAttempt}${pathInfo.ext}`
          )
          this.log(`嘗試使用新的文件名: ${savePath}`)
        }
      }
    }
    
    if (!savedSuccessfully) {
      throw lastError || new Error('保存文件失敗，已達到最大重試次數')
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
        this.log(`讀取文件時出錯: ${readError.message}`)
        return false
      }
      
      // Check if the worksheet exists
      const verifyWorksheet = verifyWorkbook.getWorksheet(sheetName)
      if (!verifyWorksheet) {
        this.log(`錯誤：無法讀取工作表 ${sheetName}`)
        return false
      }
      
      // Check row count
      const rowCount = verifyWorksheet.rowCount
      if (rowCount === 0) {
        this.log(`錯誤：工作表中沒有行`)
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
      
      const expectedFields = ['日期', '作者', '總觀看數', '訂閱數', '評分']
      let allFieldsPresent = true
      
      for (const field of expectedFields) {
        const colNumber = headerMap[field.toLowerCase()]
        if (!(colNumber && lastRowData[colNumber] !== undefined)) {
          // Only mark as missing if the field exists in the worksheet
          if (Object.keys(headerMap).includes(field.toLowerCase())) {
            allFieldsPresent = false
          }
        }
      }
      
      if (!allFieldsPresent) {
        this.log(`警告：最後一行數據不完整，可能未正確保存`)
      } else {
        this.log(`驗證成功：所有存在於工作表中的關鍵字段都已正確保存`)
      }
      
      return true
    } catch (verifyError) {
      this.log(`驗證文件保存時出錯: ${verifyError.message}`)
      return false
    }
  }
}

// Request throttler - manages request frequency to prevent rate limiting
class RequestThrottler {
  constructor(minDelay, maxDelay, logFunction) {
    this.minDelay = minDelay
    this.maxDelay = maxDelay
    this.log = logFunction
    this.lastRequestTime = 0
  }
  
  async throttleRequest(requestFn, ...args) {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    // Calculate wait time
    let waitTime = 0
    if (this.lastRequestTime > 0 && timeSinceLastRequest < this.minDelay) {
      waitTime = Utils.getRandomDelay(
        this.minDelay - timeSinceLastRequest,
        this.maxDelay - timeSinceLastRequest
      )
      
      if (waitTime > 0) {
        this.log(`節流控制: 等待 ${waitTime/1000} 秒後繼續...`)
        await Utils.sleep(waitTime)
      }
    }
    
    // Execute request
    this.lastRequestTime = Date.now()
    const result = await requestFn(...args)
    return result
  }
  
  reset() {
    this.lastRequestTime = 0
  }
}

// WebtoonScraper class - for scraping and processing Webtoon comic data
class WebtoonScraper {
  constructor(url, logFunction) {
    this.parseUrl(url)
    
    this.headers = {
      'User-Agent': Utils.getRandomElement(config.request.userAgents)
    }
    
    this.log = logFunction || Utils.createDefaultLogger()
    this.excelManager = new ExcelManager(this.log)
    
    // Create request throttlers
    this.pageThrottler = new RequestThrottler(
      config.scraper.minPageDelay,
      config.scraper.maxPageDelay,
      this.log
    )
    
    this.chapterThrottler = new RequestThrottler(
      config.scraper.minChapterDelay,
      config.scraper.maxChapterDelay,
      this.log
    )
  }
  
  parseUrl(url) {
    const match = url.match(/title_no=(\d+)/)
    if (!match) {
      throw new Error('無效的 Webtoon URL')
    }
    
    this.titleNo = match[1]
    this.baseUrl = url.split('?')[0]
  }
  
  async getPage(url, retryCount = 0) {
    try {
      // Use throttler to execute request
      const fetchPageFn = async () => {
        const response = await axios.get(url, { 
          headers: {
            ...this.headers,
            'Accept-Charset': 'UTF-8'
          },
          responseType: 'arraybuffer'
        })
        return new TextDecoder('utf-8').decode(response.data)
      }
      
      return await this.pageThrottler.throttleRequest(fetchPageFn)
    } catch (error) {
      if (error.response?.status === 429 && retryCount < config.request.retryAttempts) {
        const delay = config.request.baseDelay + (retryCount * 2000) + Utils.getRandomDelay(0, config.request.randomDelayRange)
        this.log(`遇到請求限制 (429)，等待 ${delay/1000} 秒後重試... (${retryCount + 1}/${config.request.retryAttempts})`)
        await Utils.sleep(delay)
        return this.getPage(url, retryCount + 1)
      }
      throw new Error(`獲取頁面失敗: ${error.message}`)
    }
  }
  
  async getWebtoonInfo() {
    this.log(`開始獲取漫畫信息: ${this.baseUrl}?title_no=${this.titleNo}`)
    const html = await this.getPage(this.getUrl(1))
    const $ = cheerio.load(html)
    
    let author = $(config.selectors.author)
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim()
    
    if (!author) {
      for (const selector of config.selectors.authorAlternative) {
        author = $(selector).text().trim()
        if (author) break
      }
    }
    
    // Truncate author name if it exceeds the maximum length
    if (author && author.length > config.excel.authorMaxLength) {
      author = author.substring(0, config.excel.authorMaxLength)
    }
    
    const info = {
      title: $(config.selectors.title).text().trim(),
      author: author,
      views: $(config.selectors.views).text().trim(),
      subscribers: $(config.selectors.subscribers).text().trim(),
      rating: $(config.selectors.rating).text().trim(),
      updateDay: $(config.selectors.updateDay[0]).text().trim() || 
                $(config.selectors.updateDay[1]).text().trim(),
      summary: $(config.selectors.summary).text().trim(),
      scrapedAt: new Date().toISOString()
    }

    this.log(`成功獲取漫畫信息: ${info.title} (作者: ${info.author})`)
    return info
  }
  
  async getAllChapters() {
    try {
      const chapters = []
      const totalPages = await this.getTotalPages()
      
      for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        this.log(`正在爬取第 ${currentPage}/${totalPages} 頁`)
        
        // Use throttler to get page
        const fetchPageFn = async () => {
          const html = await this.getPage(this.getUrl(currentPage))
          return await this._parseChaptersFromHtml(html)
        }
        
        const newChapters = await this.chapterThrottler.throttleRequest(fetchPageFn)
        
        // Add new chapters, avoid duplicates
        for (const chapter of newChapters) {
          if (!chapters.some(c => c.number === chapter.number)) {
            chapters.push(chapter)
          }
        }
      }
      
      // Sort by chapter number
      chapters.sort((a, b) => {
        const numA = parseInt(a.number.replace('#', ''))
        const numB = parseInt(b.number.replace('#', ''))
        return numB - numA
      })
      
      this.log(`共獲取 ${chapters.length} 個章節`)
      return chapters
    } catch (error) {
      this.log(`獲取章節列表時出錯: ${error.message}`)
      throw error
    }
  }
  
  async _parseChaptersFromHtml(html) {
    try {
      const chapters = []
      const $page = cheerio.load(html)
      
      $page(config.selectors.episodeItem).each((_, el) => {
        const $item = $page(el)
        const number = $item.find('.tx').text().trim()
        
        chapters.push({
          title: $item.find('.subj span').text().trim(),
          number: number,
          date: $item.find('.date').text().trim(),
          likes: $item.find('.like_area').text().trim()
        })
      })
      
      return chapters
    } catch (error) {
      this.log(`解析章節信息時出錯: ${error.message}`)
      return []
    }
  }
  
  async getTotalPages() {
    try {
      let allPages = new Set()
      let visitedUrls = new Set()
      let currentUrl = this.getUrl(1)
      let attempts = 0
      const maxAttempts = config.request.retryAttempts
      
      while (attempts < maxAttempts) {
        try {
          if (visitedUrls.has(currentUrl)) break
          visitedUrls.add(currentUrl)
          
          const html = await this.getPage(currentUrl)
          const $ = cheerio.load(html)
          
          const pagination = $(config.selectors.pagination)
          if (!pagination.length) break
          
          // Extract page numbers from pagination
          await this._extractPageNumbers($, pagination, allPages)
          
          const nextUrl = await this._getNextPageUrl($, pagination)
          if (!nextUrl) break
          
          currentUrl = nextUrl
          
          const randomDelay = Utils.getRandomDelay(
            config.scraper.minPageDelay,
            config.scraper.maxPageDelay
          )
          this.log(`等待 ${randomDelay/1000} 秒後繼續檢測頁數...`)
          await Utils.sleep(randomDelay)
          
          attempts = 0  // Reset attempt counter after success
        } catch (error) {
          attempts++
          this.log(`檢測頁數時出錯(嘗試 ${attempts}/${maxAttempts}): ${error.message}`)
          
          if (attempts >= maxAttempts) {
            throw new Error(`檢測頁數失敗，已達最大重試次數: ${error.message}`)
          }
          
          await Utils.sleep(config.request.baseDelay * attempts)
        }
      }
      
      const totalPages = allPages.size > 0 ? Math.max(...allPages) : 1
      this.log(`檢測到總頁數: ${totalPages}`)
      return totalPages
    } catch (error) {
      this.log(`獲取總頁數時發生錯誤: ${error.message}`)
      return 1  // Default to 1 page on error
    }
  }
  
  async _extractPageNumbers($, pagination, allPages) {
    try {
      pagination.find('a').each((_, link) => {
        const href = $(link).attr('href')
        if (href) {
          const pageMatch = href.match(/page=(\d+)/)
          if (pageMatch) {
            allPages.add(parseInt(pageMatch[1]))
          }
        }
        const text = $(link).text().trim()
        if (/^\d+$/.test(text)) {
          allPages.add(parseInt(text))
        }
      })
    } catch (error) {
      this.log(`提取頁碼時出錯: ${error.message}`)
    }
  }
  
  async _getNextPageUrl($, pagination) {
    try {
      const nextGroup = pagination.find(config.selectors.nextPage)
      const prevGroup = pagination.find(config.selectors.prevPage)
      const navLink = nextGroup.length ? nextGroup : prevGroup
      
      if (!navLink.length) return null
      
      const nextUrl = navLink.attr('href')
      if (!nextUrl) return null
      
      return this._processNextUrl(nextUrl)
    } catch (error) {
      this.log(`獲取下一頁URL時出錯: ${error.message}`)
      return null
    }
  }
  
  _processNextUrl(nextUrl) {
    if (nextUrl.startsWith('http')) {
      return nextUrl
    }
    if (nextUrl.startsWith('/')) {
      return `https://www.webtoons.com${nextUrl}`
    }
    const baseMatch = this.baseUrl.match(/(https?:\/\/[^?]+)/)
    return baseMatch ? `${baseMatch[1]}?${nextUrl.split('?')[1]}` : null
  }
  
  getUrl(page) {
    return `${this.baseUrl}?title_no=${this.titleNo}&page=${page}`
  }
  
  async saveToExcel(info, chapters, externalSavePath, append = false) {
    return await this.excelManager.saveToExcel(info, chapters, externalSavePath, append)
  }
}

// Export the WebtoonScraper as the default export for backwards compatibility
// and also export other classes as properties
module.exports = WebtoonScraper
// Add other classes as properties
module.exports.FileHelper = FileHelper
module.exports.ExcelManager = ExcelManager
module.exports.WebtoonScraper = WebtoonScraper