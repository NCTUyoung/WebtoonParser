# 🔧 技術實現細節

## 主進程與渲染進程通信 (IPC)

應用程序使用 Electron 的 IPC (Inter-Process Communication) 機制，通過預加載腳本 (`preload/index.js`) 作為安全橋樑，實現主進程和渲染進程之間的通信。

**核心概念:**
- **預加載腳本 (`preload.js`)**: 
  - 在渲染進程加載網頁之前執行，且可以訪問 Node.js API。
  - 使用 `contextBridge.exposeInMainWorld('electron', {...})` 將一組**經過選擇和包裝**的函數暴露給渲染進程的 `window.electron` 對象。
  - **不直接暴露** `ipcRenderer` 或其他 Node/Electron 模塊。
- **通道白名單**: 預加載腳本中對 `send`, `invoke`, `on`, `removeAllListeners` 的通道名稱進行了**白名單驗證**，只允許預定義的通道進行通信，增強安全性。
- **異步消息 (`invoke`/`handle`)**: 
  - 用於渲染進程請求主進程執行操作並**需要返回值**的場景（如 `start-scraping`, `load-urls`, `select-directory`）。
  - 渲染進程調用 `window.electron.invoke('channel', data)` 返回一個 Promise。
  - 主進程使用 `ipcMain.handle('channel', async (event, data) => { ...; return result; })` 處理請求並返回結果。
- **事件傳遞 (`send`/`on`)**: 
  - 用於主進程**主動向**渲染進程發送通知或更新（如 `log-message`, `scraping-complete`, `next-run-time`）。
  - 主進程使用 `mainWindow.webContents.send('channel', data)` 發送。
  - 渲染進程通過 `window.electron.on('channel', (data) => { ... })` 註冊監聽器接收數據。
  - 預加載腳本在 `on` 方法中對回調進行了包裝，移除了 `event` 參數，避免意外暴露 `sender`。

**示例流程 (啟動抓取):**
1.  **渲染進程 (Vue 組件):** 調用 `window.electron.startScraping(url)` (由 preload 暴露)。
2.  **預加載腳本:** `startScraping` 函數內部調用 `ipcRenderer.invoke('start-scraping', url)` (假設 'start-scraping' 在 `invoke` 的白名單中)。
3.  **主進程 (main/core/index.js 中註冊的處理程序):** `ipcMain.handle('start-scraping', ...)` 觸發，調用 `scrapingManager` 的相關方法。
4.  **主進程 (ScrapingManager/WebtoonScraper):** 執行抓取邏輯。期間可能通過 `mainWindow.webContents.send('log-message', ...)` 發送日誌。
5.  **渲染進程:** 通過 `window.electron.on('log-message', ...)` 接收並顯示日誌。
6.  **主進程:** 抓取完成後，`handle` 函數返回結果 (成功或失敗信息)。
7.  **渲染進程:** `invoke` 的 Promise 解析，獲得最終結果，更新 UI。

## 網頁抓取實現 (`scraper/webtoon-scraper.js`)

核心抓取邏輯封裝在 `WebtoonScraper` 類中：

1.  **初始化**: 
    - 解析輸入 URL 提取 `titleNo`。
    - 從配置文件 (`core/config.js`) 中隨機選擇一個 `User-Agent`。
    - 創建 `RequestThrottler` 實例，用於控制頁面請求和章節請求的頻率。
    - 創建 `ExcelManager` 實例。
2.  **獲取頁面 (`getPage`)**: 
    - 使用 `axios` 發送 GET 請求。
    - **請求節流**: 實際請求通過 `RequestThrottler` 執行，確保請求之間有隨機延遲 (配置在 `config.js` 中)。
    - **編碼處理**: 使用 `responseType: 'arraybuffer'` 和 `TextDecoder('utf-8')` 處理編碼。
    - **錯誤處理與重試**: 捕獲錯誤，特別是針對 HTTP 429 (Too Many Requests) 錯誤，實現了帶有指數退避和隨機延遲的重試機制 (重試次數和延遲配置在 `config.js` 中)。
3.  **解析數據**: 
    - 使用 `cheerio` 加載 HTML。
    - 使用 CSS 選擇器 (定義在 `config.js` 的 `selectors` 對象中) 提取漫畫信息 (標題、作者、評分等) 和章節列表數據 (章節號、標題、日期、點贊數)。
    - 對作者名稱進行了長度截斷處理。
4.  **處理分页 (`getAllChapters`, `getTotalPages`)**: 
    - `getTotalPages` 會嘗試智能地檢測總頁數，通過遍歷分页鏈接並處理可能出現的錯誤。
    - `getAllChapters` 循環請求每一頁的數據，調用 `_parseChaptersFromHtml` 解析，並合併結果。
5.  **數據導出**: 調用 `ExcelManager` 的方法將抓取到的漫畫信息和章節列表保存到 Excel 文件中。

## 數據存儲

1.  **配置與狀態 (`managers/storage-manager.js`)**: 
    - 使用 `electron-store` 庫。
    - 負責讀取和寫入應用程序的持久化數據，例如：
      - 用戶保存的 URL 列表。
      - 定時任務設置。
      - 自定義的文件保存路徑。
      - 背景設置。
      - URL 歷史記錄。
      - UI 折疊狀態等。
    - 提供 IPC 接口 (`load-*`, `save-*`) 供渲染進程讀取和修改這些設置。
2.  **Excel 文件 (`scraper/excel-manager.js`)**: 
    - 使用 `exceljs` 庫。
    - 負責創建 Excel 工作簿 (`Workbook`) 和工作表 (`Worksheet`)。
    - 根據需要設置列頭、列寬和單元格樣式（如標題加粗、背景色）。
    - 將傳入的漫畫信息和章節數據添加到對應的工作表中。
    - 支持將數據**追加**到現有 Excel 文件中。
    - 將生成的 Excel 文件寫入到用戶指定的路徑。

## 定時任務 (`managers/schedule-manager.js`)

使用 `node-schedule` 庫實現：

1.  **任務創建與管理**: 
    - 提供 IPC 接口 (`start-schedule`, `stop-schedule`) 供渲染進程控制定時任務。
    - 根據用戶設置（存儲在 `electron-store` 中）創建 `node-schedule` 的 `Job` 對象。
    - 使用 `Map` 來存儲正在運行的任務，方便取消。
2.  **觸發執行**: 
    - 當定時任務觸發時，其回調函數會調用 `scrapingManager` 來執行抓取操作。
    - 通過 IPC (`schedule-trigger`, `next-run-time`) 向渲染進程發送任務觸發和下一次運行時間的通知。
3.  **持久化**: 
    - 定時任務的配置（啟用狀態、時間規則等）通過 `storageManager` 持久化存儲。
    - 應用啟動時，`scheduleManager` 會讀取存儲的配置並恢復定時任務。 