const axios = require('axios')
const cheerio = require('cheerio')
const ExcelJS = require('exceljs')
const path = require('path')
const { app } = require('electron')

class WebtoonScraper {
  constructor(url) {
    this.parseUrl(url)
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    this.log = (message) => {
      if (process.platform === 'win32') {
        const iconv = require('iconv-lite')
        const encoded = iconv.encode(message, 'big5')
        process.stdout.write(encoded)
      } else {
        console.log(message)
      }
    }
  }
  
  parseUrl(url) {
    const match = url.match(/title_no=(\d+)/)
    if (!match) {
      throw new Error('無效的 Webtoon URL')
    }
    
    this.titleNo = match[1]
    this.baseUrl = url.split('?')[0]
  }
  
  async getPage(url) {
    try {
      const response = await axios.get(url, { 
        headers: {
          ...this.headers,
          'Accept-Charset': 'UTF-8'
        },
        responseType: 'arraybuffer'
      })
      const html = new TextDecoder('utf-8').decode(response.data)
      return html
    } catch (error) {
      throw new Error(`獲取頁面失敗: ${error.message}`)
    }
  }
  
  async getWebtoonInfo() {
    const html = await this.getPage(this.getUrl(1))
    const $ = cheerio.load(html)
    
    // 嘗試多種可能的作者選擇器，優先使用 author_area 內的純文字
    let author = $('.author_area')
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim()
    
    if (!author) {
      author = $('.author_area .author').text().trim() ||
              $('.author_area .author_name').text().trim()
    }
    
    // 更新選擇器以匹配正確的結構
    const info = {
      title: $('h1.subj').text().trim(),
      author: author,
      views: $('.grade_area .ico_view').next('em.cnt').text().trim(),
      subscribers: $('.grade_area .ico_subscribe').next('em.cnt').text().trim(),
      rating: $('.grade_area .ico_grade5').next('em.cnt').text().trim(),
      updateDay: $('.day_info').text().trim() || $('.date').first().text().trim(),
      summary: $('p.summary').text().trim(),
      scrapedAt: new Date().toISOString()
    }

    return info
  }
  
  async getTotalPages() {
    let allPages = new Set()
    let visitedUrls = new Set()
    let currentUrl = this.getUrl(1)
    
    while (true) {
      if (visitedUrls.has(currentUrl)) {
        break
      }
      visitedUrls.add(currentUrl)
      
      const html = await this.getPage(currentUrl)
      const $ = cheerio.load(html)
      
      // 找到頁碼列表
      const pagination = $('.paginate')
      if (!pagination.length) {
        break
      }
      
      // 獲取當前頁面的所有頁碼
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
      
      // 檢查導航按鈕
      const nextGroup = pagination.find('a.pg_next')
      const prevGroup = pagination.find('a.pg_prev')
      const navLink = nextGroup.length ? nextGroup : prevGroup
      
      if (!navLink.length) {
        break
      }
      
      // 獲取新的URL
      let nextUrl = navLink.attr('href')
      if (!nextUrl) {
        break
      }
      
      // 處理URL
      if (nextUrl.startsWith('http')) {
        currentUrl = nextUrl
      } else if (nextUrl.startsWith('/')) {
        currentUrl = `https://www.webtoons.com${nextUrl}`
      } else {
        const baseMatch = this.baseUrl.match(/(https?:\/\/[^?]+)/)
        if (baseMatch) {
          currentUrl = `${baseMatch[1]}?${nextUrl.split('?')[1]}`
        } else {
          break
        }
      }
      
      // 添加延遲避免請求過快
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    const totalPages = allPages.size > 0 ? Math.max(...allPages) : 1
    this.log(`檢測到總頁數: ${totalPages}`)
    return totalPages
  }
  
  async getAllChapters() {
    const chapters = []
    const totalPages = await this.getTotalPages()
    
    // 處理所有頁面
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
      this.log(`正在爬取第 ${currentPage} 頁`)
      const url = this.getUrl(currentPage)
      
      const html = await this.getPage(url)
      const $page = cheerio.load(html)
      
      // 獲取當前頁的章節
      $page('._episodeItem').each((_, el) => {
        const $item = $page(el)
        const number = $item.find('.tx').text().trim()
        
        // 檢查是否已經存在相同章節號的章節
        const isDuplicate = chapters.some(chapter => chapter.number === number)
        if (!isDuplicate) {
          chapters.push({
            title: $item.find('.subj span').text().trim(),
            number: number,
            date: $item.find('.date').text().trim(),
            likes: $item.find('.like_area').text().trim()
          })
        }
      })
      
      // 添加延遲避免請求過快
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // 按章節號排序
    chapters.sort((a, b) => {
      const numA = parseInt(a.number.replace('#', ''))
      const numB = parseInt(b.number.replace('#', ''))
      return numB - numA  // 降序排列
    })
    
    this.log(`共獲取 ${chapters.length} 個章節`)
    return chapters
  }
  
  getUrl(page) {
    return `${this.baseUrl}?title_no=${this.titleNo}&page=${page}`
  }
  
  async saveToExcel(info, chapters, externalSavePath) {
    let workbook = new ExcelJS.Workbook()
    const filename = `webtoon_stats_${new Date().toISOString().slice(0,10)}.xlsx`
    let savePath
    if (externalSavePath) {
      const fs = require('fs')
      // 檢查 externalSavePath 是否存在以及是否為資料夾
      const stats = fs.existsSync(externalSavePath) ? fs.lstatSync(externalSavePath) : null
      if (stats && stats.isDirectory()) {
        // 如果是資料夾，將檔案名稱與路徑結合
        savePath = path.join(externalSavePath, filename)
      } else {
        // 否則視為完整的檔案路徑
        savePath = externalSavePath
      }
    } else {
      // 如果沒有提供 externalSavePath，預設使用下載路徑
      savePath = path.join(app.getPath('downloads'), filename)
    }
    
    try {
      if (require('fs').existsSync(savePath)) {
        await workbook.xlsx.readFile(savePath)
      }
      
      let sheetName = info.title.replace(/[\\/?*[\]]/g, '').slice(0, 31) || '未知作品'
      let worksheet = workbook.getWorksheet(sheetName)
      if (worksheet) {
        workbook.removeWorksheet(worksheet.id)
      }
      worksheet = workbook.addWorksheet(sheetName)
      
      // 組織所有章節資料
      const chaptersByNumber = {}
      chapters.forEach(chapter => {
        const num = parseInt(chapter.number.replace('#', ''))
        const likes = chapter.likes.replace(/[^0-9,]/g, '')
        chaptersByNumber[`ch${num.toString().padStart(2, '0')}`] = likes
      })
      
      // 根據章節鍵中 "ch" 後面的數字進行排序
      const chapterColumns = Object.keys(chaptersByNumber).sort((a, b) => {
        const numA = parseInt(a.slice(2))
        const numB = parseInt(b.slice(2))
        return numA - numB
      })
      worksheet.columns = [
        { header: '日期', key: 'date', width: 20 },
        { header: '作者', key: 'author', width: 30 },
        { header: '總觀看數', key: 'views', width: 15 },
        { header: '訂閱數', key: 'subscribers', width: 15 },
        { header: '評分', key: 'rating', width: 10 },
        ...chapterColumns.map(key => ({ header: key.toUpperCase(), key: key, width: 10 }))
      ]
      
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
        ...chaptersByNumber
      }
      
      worksheet.addRow(row)
      
      // 設定邊框及格子樣式
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
          
          if (typeof cell.value === 'string' && !isNaN(cell.value)) {
            const columnName = worksheet.getColumn(cell.col).key
            if (columnName !== 'rating') {
              cell.value = parseInt(cell.value.replace(/,/g, ''))
            } else {
              cell.value = parseFloat(cell.value)
            }
          }
        })
        
        if (rowNumber > 1) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF2CC' }
          }
        }
      })
      
      await workbook.xlsx.writeFile(savePath)
      this.log(`已保存工作表: ${sheetName}, 路徑: ${savePath}`)
      
      return savePath
    } catch (error) {
      this.log(`保存 Excel 時出錯: ${error.message}`)
      throw error
    }
  }
}

module.exports = WebtoonScraper 