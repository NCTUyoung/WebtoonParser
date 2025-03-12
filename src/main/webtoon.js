const axios = require('axios')
const cheerio = require('cheerio')
const ExcelJS = require('exceljs')
const path = require('path')
const { app } = require('electron')
const config = require('./config')
const Utils = require('./utils')

/**
 * WebtoonScraper 类 - 用于爬取和处理 Webtoon 漫画数据
 */
class WebtoonScraper {
  /**
   * 创建一个 WebtoonScraper 实例
   * @param {string} url - Webtoon 漫画的 URL
   * @param {Function} logFunction - 可选的日志记录函数
   */
  constructor(url, logFunction) {
    this.parseUrl(url)
    
    this.headers = {
      'User-Agent': Utils.getRandomElement(config.request.userAgents)
    }
    
    this.log = logFunction || Utils.createDefaultLogger()
  }
  
  /**
   * 从 URL 中解析漫画 ID
   * @param {string} url - Webtoon 漫画的 URL
   * @throws {Error} 如果 URL 无效
   */
  parseUrl(url) {
    const match = url.match(/title_no=(\d+)/)
    if (!match) {
      throw new Error('無效的 Webtoon URL')
    }
    
    this.titleNo = match[1]
    this.baseUrl = url.split('?')[0]
  }
  
  /**
   * 获取指定URL的页面内容
   * @param {string} url - 要获取的页面URL
   * @param {number} retryCount - 当前重试次数
   * @returns {Promise<string>} 页面HTML内容
   * @throws {Error} 如果获取页面失败
   */
  async getPage(url, retryCount = 0) {
    try {
      await Utils.sleep(Utils.getRandomDelay(
        config.scraper.minPageDelay,
        config.scraper.maxPageDelay
      ))
      
      const response = await axios.get(url, { 
        headers: {
          ...this.headers,
          'Accept-Charset': 'UTF-8'
        },
        responseType: 'arraybuffer'
      })
      return new TextDecoder('utf-8').decode(response.data)
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
  
  /**
   * 获取漫画基本信息
   * @returns {Promise<Object>} 包含漫画标题、作者、浏览量等信息的对象
   */
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
  
  /**
   * 获取漫画的总页数
   * @returns {Promise<number>} 漫画的总页数
   */
  async getTotalPages() {
    let allPages = new Set()
    let visitedUrls = new Set()
    let currentUrl = this.getUrl(1)
    
    while (true) {
      if (visitedUrls.has(currentUrl)) break
      visitedUrls.add(currentUrl)
      
      const html = await this.getPage(currentUrl)
      const $ = cheerio.load(html)
      
      const pagination = $(config.selectors.pagination)
      if (!pagination.length) break
      
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
      
      const nextGroup = pagination.find(config.selectors.nextPage)
      const prevGroup = pagination.find(config.selectors.prevPage)
      const navLink = nextGroup.length ? nextGroup : prevGroup
      
      if (!navLink.length) break
      
      const nextUrl = navLink.attr('href')
      if (!nextUrl) break
      
      currentUrl = this._processNextUrl(nextUrl)
      if (!currentUrl) break
      
      const randomDelay = Utils.getRandomDelay(
        config.scraper.minChapterDelay,
        config.scraper.maxChapterDelay
      )
      this.log(`等待 ${randomDelay/1000} 秒後繼續爬取下一頁...`)
      await Utils.sleep(randomDelay)
    }
    
    const totalPages = allPages.size > 0 ? Math.max(...allPages) : 1
    this.log(`檢測到總頁數: ${totalPages}`)
    return totalPages
  }
  
  /**
   * 处理下一页的URL
   * @param {string} nextUrl - 下一页的URL
   * @returns {string|null} 处理后的URL或null
   * @private
   */
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
  
  /**
   * 获取所有章节信息
   * @returns {Promise<Array>} 包含所有章节信息的数组
   */
  async getAllChapters() {
    const chapters = []
    const totalPages = await this.getTotalPages()
    
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
      this.log(`正在爬取第 ${currentPage} 頁`)
      const html = await this.getPage(this.getUrl(currentPage))
      const $page = cheerio.load(html)
      
      $page(config.selectors.episodeItem).each((_, el) => {
        const $item = $page(el)
        const number = $item.find('.tx').text().trim()
        
        if (!chapters.some(chapter => chapter.number === number)) {
          chapters.push({
            title: $item.find('.subj span').text().trim(),
            number: number,
            date: $item.find('.date').text().trim(),
            likes: $item.find('.like_area').text().trim()
          })
        }
      })
      
      if (currentPage < totalPages) {
        const randomDelay = Utils.getRandomDelay(
          config.scraper.minChapterDelay,
          config.scraper.maxChapterDelay
        )
        this.log(`等待 ${randomDelay/1000} 秒後繼續爬取下一頁...`)
        await Utils.sleep(randomDelay)
      }
    }
    
    chapters.sort((a, b) => {
      const numA = parseInt(a.number.replace('#', ''))
      const numB = parseInt(b.number.replace('#', ''))
      return numB - numA
    })
    
    this.log(`共獲取 ${chapters.length} 個章節`)
    return chapters
  }
  
  /**
   * 生成指定页码的URL
   * @param {number} page - 页码
   * @returns {string} 完整的URL
   */
  getUrl(page) {
    return `${this.baseUrl}?title_no=${this.titleNo}&page=${page}`
  }
  
  /**
   * 将漫画信息保存到Excel文件
   * @param {Object} info - 漫画基本信息
   * @param {Array} chapters - 章节信息数组
   * @param {string} externalSavePath - 保存路径
   * @param {boolean} append - 是否追加到现有文件
   * @returns {Promise<boolean>} 保存是否成功
   */
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
  
  /**
   * 准备工作簿和文件保存路径
   * @param {string} externalSavePath - 外部指定的保存路径
   * @returns {Promise<Object>} 包含工作簿、保存路径和文件是否存在的对象
   * @private
   */
  async _prepareWorkbookAndPath(externalSavePath) {
    const workbook = new ExcelJS.Workbook()
    const filename = `webtoon_stats_${new Date().toISOString().slice(0,10)}.xlsx`
    let savePath
    
    if (externalSavePath) {
      const fs = require('fs')
      const stats = fs.existsSync(externalSavePath) ? fs.lstatSync(externalSavePath) : null
      
      if (stats && stats.isDirectory()) {
        savePath = path.join(externalSavePath, filename)
      } else {
        savePath = externalSavePath
      }
    } else {
      savePath = path.join(app.getPath('downloads'), filename)
    }
    
    let fileExists = false
    const fs = require('fs')
    
    if (fs.existsSync(savePath)) {
      this.log(`讀取現有檔案: ${savePath}`)
      
      try {
        // 检查文件是否可读写
        const fd = fs.openSync(savePath, 'r+')
        fs.closeSync(fd)
        this.log(`文件可讀寫`)
        
        try {
          await workbook.xlsx.readFile(savePath)
          this.log(`成功讀取文件`)
          fileExists = true
        } catch (error) {
          this.log(`讀取文件時出錯: ${error.message}，嘗試創建新文件`)
          // 如果讀取失敗，創建一個新的工作簿
        }
      } catch (error) {
        this.log(`警告：文件可能被其他程序佔用: ${error.message}`)
        // 如果文件被佔用，嘗試創建一個新的文件名
        const pathInfo = path.parse(savePath)
        savePath = path.join(
          pathInfo.dir, 
          `${pathInfo.name}_${new Date().getTime()}${pathInfo.ext}`
        )
        this.log(`嘗試使用新的文件名: ${savePath}`)
      }
    }
    
    return { workbook, savePath, fileExists }
  }
  
  /**
   * 将章节数据转换为适合Excel的格式
   * @param {Array} chapters - 章节信息数组
   * @returns {Object} 以章节编号为键的对象
   * @private
   */
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
  
  /**
   * 获取或创建Excel工作表
   * @param {ExcelJS.Workbook} workbook - Excel工作簿
   * @param {string} sheetName - 工作表名称
   * @param {Object} chaptersByNumber - 章节数据
   * @param {boolean} fileExists - 文件是否已存在
   * @param {boolean} append - 是否追加模式
   * @returns {Promise<Object>} 包含工作表和章节列的对象
   * @private
   */
  async _getOrCreateWorksheet(workbook, sheetName, chaptersByNumber, fileExists, append) {
    // 按章节编号排序章节列
    const chapterColumns = Object.keys(chaptersByNumber).sort((a, b) => {
      const numA = parseInt(a.slice(2))
      const numB = parseInt(b.slice(2))
      return numA - numB
    })
    
    let worksheet = workbook.getWorksheet(sheetName)
    
    // 如果工作表不存在，则创建新的工作表
    if (!worksheet) {
      this.log(`工作表不存在，創建新工作表: ${sheetName}`)
      worksheet = this._createNewWorksheet(workbook, sheetName, chapterColumns)
    } 
    // 如果工作表存在但不是附加模式，则删除现有工作表并创建新的
    else if (!append) {
      this.log(`工作表存在但不是附加模式，移除現有工作表: ${sheetName}`)
      workbook.removeWorksheet(worksheet.id)
      worksheet = this._createNewWorksheet(workbook, sheetName, chapterColumns)
    } 
    // 如果工作表存在且是附加模式，则保留现有工作表并添加新列
    else {
      this.log(`附加到現有工作表: ${sheetName}`)
      
      // 获取现有的列标题
      const headerRow = worksheet.getRow(1)
      const existingHeaders = {}
      const existingChapterColumns = []
      
      // 遍历第一行的所有单元格，获取列标题
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
      
      // 检查现有列数，确保不会超出 Excel 的列限制 (16384)
      const currentColumnCount = Object.keys(existingHeaders).length
      const maxNewColumns = 16384 - currentColumnCount
      
      // 合并现有章节列和新爬取的章节列
      const allChapterColumns = [...new Set([
        ...existingChapterColumns.map(key => key.toLowerCase()), 
        ...chapterColumns.map(key => key.toLowerCase())
      ])].sort((a, b) => {
        const numA = parseInt(a.slice(2))
        const numB = parseInt(b.slice(2))
        return numA - numB
      })
      
      // 检查哪些章节列是新的，并且确保不会超出 Excel 的列限制
      const newColumns = []
      for (const key of chapterColumns) {
        const headerText = key.toUpperCase()
        const existingHeaderKeys = Object.keys(existingHeaders).map(h => h.toUpperCase())
        if (!existingHeaderKeys.includes(headerText) && newColumns.length < maxNewColumns) {
          newColumns.push(key)
        }
      }
      
      // 添加新列
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
      
      // 更新 chapterColumns 为所有章节列，但仅包括已存在于工作表中的列
      const updatedChapterColumns = []
      for (const key of allChapterColumns) {
        const headerText = key.toUpperCase()
        const existingHeaderKeys = Object.keys(existingHeaders).map(h => h.toUpperCase())
        if (existingHeaderKeys.includes(headerText) || newColumns.includes(key)) {
          updatedChapterColumns.push(key)
        }
      }
      
      // 更新章节列
      chapterColumns.length = 0
      chapterColumns.push(...updatedChapterColumns)
    }
    
    return { worksheet, chapterColumns }
  }
  
  /**
   * 创建新的Excel工作表
   * @param {ExcelJS.Workbook} workbook - Excel工作簿
   * @param {string} sheetName - 工作表名称
   * @param {Array} chapterColumns - 章节列数组
   * @returns {ExcelJS.Worksheet} 创建的工作表
   * @private
   */
  _createNewWorksheet(workbook, sheetName, chapterColumns) {
    const worksheet = workbook.addWorksheet(sheetName)
    
    // 设置列定义
    worksheet.columns = [
      { header: '日期', key: 'date', width: 20 },
      { header: '作者', key: 'author', width: 30 },
      { header: '總觀看數', key: 'views', width: 15 },
      { header: '訂閱數', key: 'subscribers', width: 15 },
      { header: '評分', key: 'rating', width: 10 },
      ...chapterColumns.map(key => ({ header: key.toUpperCase(), key: key, width: 10 }))
    ]
    
    // 确保标题行被正确设置
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    
    return worksheet
  }
  
  /**
   * 向工作表添加新行数据
   * @param {ExcelJS.Worksheet} worksheet - Excel工作表
   * @param {Object} info - 漫画基本信息
   * @param {Object} chaptersByNumber - 章节数据
   * @returns {Promise<ExcelJS.Row>} 添加的新行
   * @private
   */
  async _addNewRowToWorksheet(worksheet, info, chaptersByNumber) {
    // 获取标题行和列映射
    const headerRow = worksheet.getRow(1)
    const headerValues = {}
    
    headerRow.eachCell((cell, colNumber) => {
      const headerValue = cell.value ? cell.value.toString() : ''
      headerValues[colNumber] = headerValue
    })
    
    // 创建新行数据
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
    
    // 创建行数据对象
    const rowData = {}
    
    // 填充行数据对象
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
    
    // 使用数组形式添加行
    const rowArray = []
    for (let colNumber = 1; colNumber <= Object.keys(headerValues).length; colNumber++) {
      const headerValue = headerValues[colNumber]
      rowArray[colNumber] = rowData[headerValue]
    }
    
    // 添加新行
    const newRow = worksheet.addRow(rowArray)
    
    // 直接设置单元格值，确保数据正确写入
    for (let colNumber = 1; colNumber <= Object.keys(headerValues).length; colNumber++) {
      const headerValue = headerValues[colNumber]
      if (headerValue && rowData[headerValue] !== undefined) {
        const cell = newRow.getCell(colNumber)
        cell.value = rowData[headerValue]
      }
    }
    
    // 设置新行的样式
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
    
    // 设置新行的填充颜色
    newRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF2CC' }
    }
    
    // 确保行已提交
    newRow.commit && newRow.commit()
    
    return newRow
  }
  
  /**
   * 将工作簿保存到文件
   * @param {ExcelJS.Workbook} workbook - Excel工作簿
   * @param {string} savePath - 保存路径
   * @param {string} sheetName - 工作表名称
   * @returns {Promise<boolean>} 保存是否成功
   * @private
   */
  async _saveWorkbookToFile(workbook, savePath, sheetName) {
    const fs = require('fs')
    
    // 确保目标目录存在
    const targetDir = path.dirname(savePath)
    if (!fs.existsSync(targetDir)) {
      this.log(`創建目標目錄: ${targetDir}`)
      fs.mkdirSync(targetDir, { recursive: true })
    }
    
    // 尝试保存文件
    let saveAttempt = 0
    const maxAttempts = 3
    let savedSuccessfully = false
    let lastError = null
    
    while (saveAttempt < maxAttempts && !savedSuccessfully) {
      try {
        saveAttempt++
        this.log(`保存嘗試 ${saveAttempt}/${maxAttempts}`)
        
        // 确保所有更改都已应用
        const worksheet = workbook.getWorksheet(sheetName)
        worksheet && worksheet.commit && worksheet.commit()
        
        // 使用 writeBuffer 和 fs.writeFile 方法保存文件
        const buffer = await workbook.xlsx.writeBuffer()
        
        await new Promise((resolve, reject) => {
          fs.writeFile(savePath, buffer, (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
        
        savedSuccessfully = true
        this.log(`文件成功保存`)
      } catch (error) {
        lastError = error
        this.log(`保存嘗試 ${saveAttempt} 失敗: ${error.message}`)
        
        if (saveAttempt < maxAttempts) {
          // 尝试使用临时文件保存
          try {
            const tempPath = `${savePath}.temp`
            const buffer = await workbook.xlsx.writeBuffer()
            
            await new Promise((resolve, reject) => {
              fs.writeFile(tempPath, buffer, (err) => {
                if (err) reject(err)
                else resolve()
              })
            })
            
            if (fs.existsSync(tempPath)) {
              if (fs.existsSync(savePath)) {
                fs.unlinkSync(savePath)
              }
              
              fs.renameSync(tempPath, savePath)
              savedSuccessfully = true
              this.log(`文件成功保存（使用臨時文件）`)
              break
            }
          } catch (tempError) {
            this.log(`使用臨時文件保存失敗: ${tempError.message}`)
          }
          
          // 如果使用临时文件保存失败，尝试使用不同的文件名
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
    
    // 验证保存是否成功
    if (savedSuccessfully) {
      try {
        // 尝试打开文件并读取内容
        const verifyWorkbook = new ExcelJS.Workbook()
        
        try {
          await verifyWorkbook.xlsx.readFile(savePath)
        } catch (readError) {
          this.log(`讀取文件時出錯: ${readError.message}`)
          return false
        }
        
        // 检查工作表是否存在
        const verifyWorksheet = verifyWorkbook.getWorksheet(sheetName)
        if (!verifyWorksheet) {
          this.log(`錯誤：無法讀取工作表 ${sheetName}`)
          return false
        }
        
        // 检查行数
        const rowCount = verifyWorksheet.rowCount
        if (rowCount === 0) {
          this.log(`錯誤：工作表中沒有行`)
          return false
        }
        
        // 验证关键字段
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
            // 只有当字段存在于工作表中时，才标记为缺失
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
    
    return false
  }
}

module.exports = WebtoonScraper