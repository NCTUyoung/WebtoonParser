const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const WebtoonScraper = require('./webtoon')
const schedule = require('node-schedule')
const Store = require('electron-store')

let mainWindow
let scheduleJobs = new Map()
const store = new Store()

const isDev = process.env.NODE_ENV === 'development'

process.env.LANG = 'zh_TW.UTF-8';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, '../preload/index.js')  // 添加 preload 路徑
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
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
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
ipcMain.handle('start-scraping', async (event, args) => {
  try {
    // 從傳入的 args 中獲取 urls 與 savePath
    const urlList = Array.isArray(args.urls) ? args.urls : [args.urls]
    const externalSavePath = args.savePath

    // 依序處理每個 URL
    for (const url of urlList) {
      console.log('Starting to scrape URL:', url)
      const scraper = new WebtoonScraper(url)
      
      event.sender.send('log-message', `Starting to scrape: ${url}`)
      
      console.log('Getting comic basic information...')
      const info = await scraper.getWebtoonInfo()
      console.log('Basic information:', info)
      event.sender.send('log-message', `Successfully got basic information for ${info.title}`)
      
      console.log('Starting to get chapter list...')
      event.sender.send('log-message', 'Starting to get chapter list...')
      const chapters = await scraper.getAllChapters()
      console.log(`Got ${chapters.length} chapters`)
      event.sender.send('log-message', `Successfully got ${chapters.length} chapters`)
      
      console.log('Saving data to Excel...')
      await scraper.saveToExcel(info, chapters, externalSavePath)
      console.log('Excel saving completed')
      event.sender.send('log-message', 'Data saved to Excel file')
    }
    
    return { success: true }
  } catch (error) {
    console.error('Scraping process error:', error)
    event.sender.send('log-message', `Error: ${error.message}`)
    event.sender.send('scraping-error', error.message)
    throw error
  }
})

// 處理定時任務
ipcMain.on('start-schedule', (event, settings) => {
  const { day, hour, minute, timezone } = settings;
  const dayMap = {
    '一': 1, '二': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '日': 0
  };

  const rule = new schedule.RecurrenceRule();
  rule.dayOfWeek = dayMap[day];
  rule.hour = parseInt(hour);
  rule.minute = parseInt(minute);
  rule.tz = timezone;

  // 如果想立即執行一次，可以先檢查是否已過當天設定的執行時間
  const now = new Date();
  const scheduledTime = new Date(now);
  scheduledTime.setHours(parseInt(hour));
  scheduledTime.setMinutes(parseInt(minute));
  scheduledTime.setSeconds(0);
  scheduledTime.setMilliseconds(0);

  console.log('now:', now);
  console.log('scheduledTime:', scheduledTime);
  console.log('now.getDay():', now.getDay(), ' rule.dayOfWeek:', rule.dayOfWeek);

  // 如果設定的是今天且已經過了，立即觸發一次
  if (now.getDay() === rule.dayOfWeek && now > scheduledTime) {
    event.reply('log-message', 'Past the set time, executing once immediately');
    // 立即觸發一次，再設定定時任務
    mainWindow.webContents.send('schedule-trigger');
  } else {
    event.reply('log-message', 'Waiting for next schedule time to arrive');
  }

  const job = schedule.scheduleJob(rule, () => {
    mainWindow.webContents.send('schedule-trigger');
  });

  scheduleJobs.set('main', job);
  event.reply('log-message', `Schedule task started: Every ${day} ${hour}:${minute} (${timezone})`);

  const nextInvocation = job.nextInvocation();
  const formattedNextInvocation = nextInvocation.toLocaleString('zh-TW', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
  });
  event.reply('log-message', `Next trigger time: ${formattedNextInvocation}`);
});

ipcMain.on('stop-schedule', (event) => {
  const job = scheduleJobs.get('main')
  if (job) {
    job.cancel()
    scheduleJobs.delete('main')
    event.reply('log-message', 'Schedule task stopped')
  }
})

// 處理 URL 存儲
ipcMain.handle('load-urls', () => {
  return store.get('webtoon-urls', '')
})

ipcMain.on('save-urls', (event, urls) => {
  store.set('webtoon-urls', urls)
})

// 處理定時設置的存儲和讀取
ipcMain.handle('load-schedule-settings', () => {
  return store.get('schedule-settings', {
    day: '五',
    hour: '18',
    minute: '00',
    timezone: 'Asia/Taipei'
  })
})

ipcMain.on('save-schedule-settings', (event, settings) => {
  store.set('schedule-settings', settings)
})

// 處理儲存路徑
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  
  if (!result.canceled) {
    console.log('Selected new path:', result.filePaths[0])
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('load-save-path', () => {
  try {
    const savedPath = store.get('save-path')
    console.log('Loaded save path:', savedPath)
    return savedPath
  } catch (error) {
    console.error('Failed to load save path:', error)
    return app.getPath('downloads')
  }
})

ipcMain.on('save-save-path', (event, path) => {
  try {
    console.log('Saving path:', path)
    store.set('save-path', path)
    console.log('Confirmed saved path:', store.get('save-path'))
    event.reply('log-message', `Save path updated: ${path}`)
  } catch (error) {
    console.error('Failed to save path:', error)
    event.reply('log-message', `Failed to save path: ${error.message}`)
  }
})

// 處理 URL 歷史記錄
ipcMain.handle('load-url-history', () => {
  return store.get('url-history', [])
})

ipcMain.on('save-url-history', (event, history) => {
  store.set('url-history', history)
})

// 處理在新視窗開啟URL
ipcMain.on('open-external-url', (event, url) => {
  try {
    console.log('Opening external URL:', url)
    shell.openExternal(url)
  } catch (error) {
    console.error('Failed to open external URL:', error)
    event.reply('log-message', `無法開啟URL: ${error.message}`)
  }
}) 