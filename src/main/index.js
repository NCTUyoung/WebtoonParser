const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const WebtoonScraper = require('./webtoon')
const schedule = require('node-schedule')
const Store = require('electron-store')
const iconv = require('iconv-lite')

// 創建共用的日誌函數
function logMessage(message, event) {
  // 處理 Windows 平台的 Big5 編碼
  if (process.platform === 'win32') {
    try {
      const encoded = iconv.encode(message + '\n', 'big5')
      process.stdout.write(encoded)
    } catch (error) {
      console.log('[編碼錯誤]', message)
    }
  } else {
    console.log(message)
  }
  
  // 如果提供了 event 參數，則將消息發送到前端
  if (event) {
    event.reply('log-message', message)
  }
}

let mainWindow
let scheduleJobs = new Map()
const store = new Store()

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

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
    // 處理不同格式的輸入參數
    let urlList = [];
    let externalSavePath = null;
    let append = false;
    
    // 如果args是字符串，則視為單個URL
    if (typeof args === 'string') {
      urlList = [args];
    } 
    // 如果args是對象，則從中提取urls、savePath和append
    else if (typeof args === 'object' && args !== null) {
      urlList = Array.isArray(args.urls) ? args.urls : (args.urls ? [args.urls] : []);
      externalSavePath = args.savePath || null;
      append = args.append === true; // 確保 append 是布爾值
    }
    
    if (urlList.length === 0) {
      throw new Error('No valid URLs provided');
    }

    // 在测试模式下，使用环境变量中的临时下载路径
    if (isTest && process.env.TEMP_DOWNLOAD_PATH) {
      externalSavePath = process.env.TEMP_DOWNLOAD_PATH;
    }
    
    // 創建一個特殊的日誌函數，該函數會將日誌發送到前端
    const scraperLogFunction = (message) => {
      logMessage(message);
      event.sender.send('log-message', message);
    };
    
    scraperLogFunction(`Starting to scrape URLs: ${urlList.join(', ')}${append ? ' (附加模式)' : '(覆蓋模式)'}`)
    
    // 依序處理每個 URL
    for (const url of urlList) {
      scraperLogFunction(`Starting to scrape URL: ${url}`)
      
      // 創建爬蟲實例，傳入特殊的日誌函數
      const scraper = new WebtoonScraper(url, scraperLogFunction)
      
      scraperLogFunction('Getting comic basic information...')
      const info = await scraper.getWebtoonInfo()
      scraperLogFunction('Basic information: ' + JSON.stringify(info, null, 2))
      
      scraperLogFunction('Starting to get chapter list...')
      const chapters = await scraper.getAllChapters()
      scraperLogFunction(`Got ${chapters.length} chapters`)
      
      scraperLogFunction(`Saving data to Excel...${append ? ' (附加模式)' : '(覆蓋模式)'}`)
      await scraper.saveToExcel(info, chapters, externalSavePath, append)
      scraperLogFunction('Excel saving completed')
    }
    
    scraperLogFunction('All URLs processed successfully')
    // 發送爬取完成事件
    logMessage('正在發送 scraping-complete 事件')
    event.sender.send('scraping-complete')
    return { success: true }
  } catch (error) {
    logMessage(`Error during scraping: ${error.message}`)
    event.sender.send('scraping-error', `Error: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// 處理定時任務
ipcMain.on('start-schedule', (event, settings) => {
  const { scheduleType, day, hour, minute, timezone } = settings;
  const dayMap = {
    '一': 1, '二': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '日': 0
  };

  const rule = new schedule.RecurrenceRule();
  
  // 根據定時類型設置不同的規則
  if (scheduleType === 'weekly') {
    rule.dayOfWeek = dayMap[day];
  } else if (scheduleType === 'daily') {
    // 每日定時不需要設置 dayOfWeek
  }
  
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

  logMessage('當前時間: ' + now.toString());
  logMessage('排程時間: ' + scheduledTime.toString());
  
  if (scheduleType === 'weekly') {
    logMessage(`當前星期: ${now.getDay()}, 設定星期: ${rule.dayOfWeek}`);
  }

  // 如果設定的是今天且已經過了，立即觸發一次
  // 或者在测试模式下且设置了立即触发，也立即触发一次
  const shouldTriggerImmediately = 
    (scheduleType === 'daily' && now > scheduledTime) || 
    (scheduleType === 'weekly' && now.getDay() === rule.dayOfWeek && now > scheduledTime) || 
    (isTest && process.env.IMMEDIATE_TRIGGER === 'true');
  
  if (shouldTriggerImmediately) {
    logMessage('已過設定時間或處於測試模式，立即執行一次', event);
    // 立即觸發一次，再設定定時任務
    mainWindow.webContents.send('schedule-trigger');
  } else {
    logMessage('等待下次排程時間到達', event);
  }

  const job = schedule.scheduleJob(rule, () => {
    logMessage('定時任務觸發');
    mainWindow.webContents.send('schedule-trigger');
  });

  scheduleJobs.set('main', job);
  
  // 根據定時類型顯示不同的日誌信息
  let scheduleMessage = '';
  if (scheduleType === 'weekly') {
    scheduleMessage = `定時任務已啟動: 每週${day} ${hour}:${minute} (${timezone})`;
  } else if (scheduleType === 'daily') {
    scheduleMessage = `定時任務已啟動: 每天 ${hour}:${minute} (${timezone})`;
  }
  
  logMessage(scheduleMessage, event);
  
  // 計算下次執行時間
  const nextRun = job.nextInvocation();
  const nextRunMessage = `下次執行時間: ${nextRun}`;
  logMessage(nextRunMessage, event);
  
  return { success: true, message: scheduleMessage };
});

ipcMain.on('stop-schedule', (event) => {
  const job = scheduleJobs.get('main')
  if (job) {
    job.cancel()
    scheduleJobs.delete('main')
    logMessage('定時任務已停止', event)
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
    logMessage('已選擇新路徑: ' + result.filePaths[0])
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('load-save-path', () => {
  // 在测试模式下，使用环境变量中的临时下载路径
  if (isTest && process.env.TEMP_DOWNLOAD_PATH) {
    return process.env.TEMP_DOWNLOAD_PATH;
  }
  
  try {
    const savedPath = store.get('save-path')
    logMessage('已載入儲存路徑: ' + savedPath)
    return savedPath
  } catch (error) {
    logMessage('載入儲存路徑失敗: ' + error.message)
    return app.getPath('downloads')
  }
})

ipcMain.on('save-save-path', (event, path) => {
  try {
    logMessage(`儲存路徑已更新: ${path}`, event);
    store.set('save-path', path)
  } catch (error) {
    logMessage(`儲存路徑失敗: ${error.message}`, event);
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
  logMessage(`正在開啟外部URL: ${url}`);
  shell.openExternal(url).catch(error => {
    logMessage(`無法開啟URL: ${error.message}`, event);
  });
}) 