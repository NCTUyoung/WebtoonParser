const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const WebtoonScraper = require('./scraper/webtoon')
const schedule = require('node-schedule')
const Store = require('electron-store')

let mainWindow
let scheduleJobs = new Map()
const store = new Store()

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
    }
  })

  // 設置 session 的默認編碼
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          'Accept-Charset': 'UTF-8'
        }
      })
    }
  )

  if (isDev) {
    // 等待開發服務器啟動
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:3000')
    }, 2000)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 處理爬蟲請求
ipcMain.on('start-scraping', async (event, urls) => {
  try {
    for (const url of urls) {
      const scraper = new WebtoonScraper(url)
      
      event.reply('log-message', `開始爬取: ${url}`)
      const info = await scraper.getWebtoonInfo()
      event.reply('log-message', `成功獲取 ${info.title} 的基本信息`)
      
      event.reply('log-message', '開始獲取章節列表...')
      const chapters = await scraper.getAllChapters()
      event.reply('log-message', `成功獲取 ${chapters.length} 個章節`)
      
      // 保存數據
      await scraper.saveToExcel(info, chapters)
      event.reply('log-message', '數據已保存到Excel文件')
    }
    
    event.reply('scraping-complete')
  } catch (error) {
    event.reply('log-message', `錯誤: ${error.message}`)
    event.reply('scraping-error', error.message)
  }
})

// 處理定時任務
ipcMain.on('start-schedule', (event, settings) => {
  const { day, hour, minute, timezone } = settings
  const dayMap = {
    '一': 1, '二': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '日': 0
  }
  
  const rule = new schedule.RecurrenceRule()
  rule.dayOfWeek = dayMap[day]
  rule.hour = parseInt(hour)
  rule.minute = parseInt(minute)
  rule.tz = timezone
  
  const job = schedule.scheduleJob(rule, () => {
    mainWindow.webContents.send('schedule-trigger')
  })
  
  scheduleJobs.set('main', job)
  event.reply('log-message', `定時任務已啟動: 每週${day} ${hour}:${minute}`)
})

ipcMain.on('stop-schedule', (event) => {
  const job = scheduleJobs.get('main')
  if (job) {
    job.cancel()
    scheduleJobs.delete('main')
    event.reply('log-message', '定時任務已停止')
  }
})

// 處理 URL 存儲
ipcMain.handle('load-urls', () => {
  return store.get('webtoon-urls', '')
})

ipcMain.on('save-urls', (event, urls) => {
  store.set('webtoon-urls', urls)
}) 