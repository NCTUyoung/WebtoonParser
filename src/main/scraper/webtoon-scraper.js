const axios = require('axios')
const cheerio = require('cheerio')
const Utils = require('../utils/utils')
const ExcelManager = require('./excel-manager')
const RequestThrottler = require('./request-throttler')
const config = require('../core/config')

// WebtoonScraper class - for scraping and processing Webtoon comic data
class WebtoonScraper {
  constructor(url, logFunction) {
    this.parseUrl(url)
    
    this.headers = {
      'User-Agent': Utils.getRandomElement(config.request.userAgents)
    }
    
    this.log = logFunction || Utils.createDefaultLogger()
    this.excelManager = new ExcelManager(this.log)
    
    // 储存选择器
    this.selectors = config.selectors.webtoon;
    
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
      throw new Error('Invalid Webtoon URL')
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
        this.log(`Encountered rate limit (429), waiting ${delay/1000} seconds before retrying... (${retryCount + 1}/${config.request.retryAttempts})`)
        await Utils.sleep(delay)
        return this.getPage(url, retryCount + 1)
      }
      throw new Error(`Failed to fetch page: ${error.message}`)
    }
  }
  
  async getWebtoonInfo() {
    this.log(`Starting to fetch comic information: ${this.baseUrl}?title_no=${this.titleNo}`)
    const html = await this.getPage(this.getUrl(1))
    const $ = cheerio.load(html)
    
    let author = $(this.selectors.author)
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim()
    
    if (!author) {
      for (const selector of this.selectors.authorAlternative) {
        author = $(selector).text().trim()
        if (author) break
      }
    }
    
    // Truncate author name if it exceeds the maximum length
    if (author && author.length > config.excel.authorMaxLength) {
      author = author.substring(0, config.excel.authorMaxLength)
    }
    
    const info = {
      title: $(this.selectors.title).text().trim(),
      author: author,
      views: $(this.selectors.views).text().trim(),
      subscribers: $(this.selectors.subscribers).text().trim(),
      rating: $(this.selectors.rating).text().trim(),
      updateDay: $(this.selectors.updateDay[0]).text().trim() || 
                $(this.selectors.updateDay[1]).text().trim(),
      summary: $(this.selectors.summary).text().trim(),
      scrapedAt: new Date().toISOString()
    }

    this.log(`Successfully fetched comic information: ${info.title} (Author: ${info.author})`)
    return info
  }
  
  async getAllChapters() {
    try {
      const chapters = []
      const totalPages = await this.getTotalPages()
      
      for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        this.log(`Scraping page ${currentPage}/${totalPages}`)
        
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
      
      this.log(`Retrieved ${chapters.length} chapters in total`)
      return chapters
    } catch (error) {
      this.log(`Error getting chapter list: ${error.message}`)
      throw error
    }
  }
  
  async _parseChaptersFromHtml(html) {
    try {
      const chapters = []
      const $page = cheerio.load(html)
      
      $page(this.selectors.episodeItem).each((_, el) => {
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
      this.log(`Error parsing chapter information: ${error.message}`)
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
          
          const pagination = $(this.selectors.pagination)
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
          this.log(`Waiting ${randomDelay/1000} seconds before continuing to check page count...`)
          await Utils.sleep(randomDelay)
          
          attempts = 0  // Reset attempt counter after success
        } catch (error) {
          attempts++
          this.log(`Error detecting page count (attempt ${attempts}/${maxAttempts}): ${error.message}`)
          
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to detect page count, reached maximum retry attempts: ${error.message}`)
          }
          
          await Utils.sleep(config.request.baseDelay * attempts)
        }
      }
      
      const totalPages = allPages.size > 0 ? Math.max(...allPages) : 1
      this.log(`Detected total pages: ${totalPages}`)
      return totalPages
    } catch (error) {
      this.log(`Error getting total page count: ${error.message}`)
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
      this.log(`Error extracting page numbers: ${error.message}`)
    }
  }
  
  async _getNextPageUrl($, pagination) {
    try {
      const nextGroup = pagination.find(this.selectors.nextPage)
      const prevGroup = pagination.find(this.selectors.prevPage)
      const navLink = nextGroup.length ? nextGroup : prevGroup
      
      if (!navLink.length) return null
      
      const nextUrl = navLink.attr('href')
      if (!nextUrl) return null
      
      return this._processNextUrl(nextUrl)
    } catch (error) {
      this.log(`Error getting next page URL: ${error.message}`)
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
  
  async saveToExcel(info, chapters, externalSavePath, append = false, customFilename) {
    this.log(`Saving Webtoon data to Excel...`)
    try {
      const filePath = await this.excelManager.saveWorkbook(info, chapters, externalSavePath, append, false, customFilename)
      this.log(`Excel file saved to: ${filePath}`)
      return filePath
    } catch (error) {
      this.log(`Error saving to Excel: ${error.message}`, 'error')
      throw error
    }
  }
}

module.exports = WebtoonScraper 