const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const WebtoonScraper = require('./scraper/webtoon')
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
ipcMain.handle('start-scraping', async (event, urls) => {
  try {
    // 確保 urls 是陣列
    const urlList = Array.isArray(urls) ? urls : [urls]
    
    // 依序處理每個 URL
    for (const url of urlList) {
      console.log('開始爬取URL:', url)
      const scraper = new WebtoonScraper(url)
      
      event.sender.send('log-message', `開始爬取: ${url}`)
      
      console.log('獲取漫畫基本信息...')
      const info = await scraper.getWebtoonInfo()
      console.log('基本信息:', info)
      event.sender.send('log-message', `成功獲取 ${info.title} 的基本信息`)
      
      console.log('開始獲取章節列表...')
      event.sender.send('log-message', '開始獲取章節列表...')
      const chapters = await scraper.getAllChapters()
      console.log(`獲取到 ${chapters.length} 個章節`)
      event.sender.send('log-message', `成功獲取 ${chapters.length} 個章節`)
      
      console.log('保存數據到Excel...')
      await scraper.saveToExcel(info, chapters)
      console.log('Excel保存完成')
      event.sender.send('log-message', '數據已保存到Excel文件')
    }
    
    return { success: true }
  } catch (error) {
    console.error('爬取過程出錯:', error)
    event.sender.send('log-message', `錯誤: ${error.message}`)
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
    event.reply('log-message', '已過設定時間，立即執行一次爬取');
    // 立即觸發一次，再設定定時任務
    mainWindow.webContents.send('schedule-trigger');
  } else {
    event.reply('log-message', '等待下一次排程時間到達');
  }

  const job = schedule.scheduleJob(rule, () => {
    mainWindow.webContents.send('schedule-trigger');
  });

  scheduleJobs.set('main', job);
  event.reply('log-message', `定時任務已啟動: 每週${day} ${hour}:${minute} (${timezone})`);

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
  event.reply('log-message', `下一次觸發時間：${formattedNextInvocation}`);
});

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