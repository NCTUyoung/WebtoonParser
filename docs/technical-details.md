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
4.  **主進程 (ScrapingManager/抓取實現):** 執行抓取邏輯。期間可能通過 `mainWindow.webContents.send('log-message', ...)` 發送日誌。
5.  **渲染進程:** 通過 `window.electron.on('log-message', ...)` 接收並顯示日誌。
6.  **主進程:** 抓取完成後，`handle` 函數返回結果 (成功或失敗信息)。
7.  **渲染進程:** `invoke` 的 Promise 解析，獲得最終結果，更新 UI。

## 多站點抓取實現 (`scraping-manager.js`)

管理器支持多種網站類型的抓取處理：

1. **站點識別**:
   - 通過 `config.js` 中定義的 URL 模式 (`siteUrlPatterns`) 來識別不同站點，目前支持 Webtoon 和 KadoKado。
   - 對於每個 URL，通過正則表達式匹配確定其類型。

2. **站點處理器選擇**:
   - 根據識別的站點類型，實例化相應的抓取類：
     - `WebtoonScraper`: 處理漫畫站點
     - `KadoKadoScraper`: 處理小說站點

3. **統一處理流程**:
   - 無論站點類型如何，管理器都維持一致的處理流程：
     - 獲取基本信息
     - 獲取章節列表
     - 保存到 Excel 文件

4. **並行處理**:
   - 支持批量處理多個 URL，並依次處理它們以避免過度消耗資源。
   - 在處理 URL 之間添加延遲，以防止對目標站點造成過大壓力。

> **注意**: 為了提高代碼復用性和擴展性，我們已設計了更高級的[抽象站點適配層](./site-adapter-design.md)，未來將使用此架構重構多站點抓取實現。

## 網頁抓取實現

### Webtoon 抓取 (`scraper/webtoon-scraper.js`)

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
    - 使用 CSS 選擇器 (定義在 `config.js` 的 `selectors.webtoon` 對象中) 提取漫畫信息 (標題、作者、評分等) 和章節列表數據 (章節號、標題、日期、點贊數)。
    - 對作者名稱進行了長度截斷處理。
4.  **處理分页 (`getAllChapters`, `getTotalPages`)**:
    - `getTotalPages` 會嘗試智能地檢測總頁數，通過遍歷分页鏈接並處理可能出現的錯誤。
    - `getAllChapters` 循環請求每一頁的數據，調用 `_parseChaptersFromHtml` 解析，並合併結果。
5.  **數據導出**: 調用 `ExcelManager` 的方法將抓取到的漫畫信息和章節列表保存到 Excel 文件中。

### KadoKado 抓取 (`scraper/KadoKadoScraper.js`)

1. **初始化與配置**:
   - 同樣使用隨機 User-Agent 和請求節流機制。
   - 使用專為小說站點設計的 CSS 選擇器 (`selectors.kadokado`)。

2. **小說信息獲取 (`getNovelInfo`)**:
   - 提取小說標題、作者、描述、狀態等信息。
   - 收集小說總章節數、總字數、點讚數等統計數據。

3. **章節列表處理**:
   - 使用適合小說站點的選擇器提取章節列表。
   - 獲取每章的標題、更新日期、字數等信息。

4. **數據格式處理**:
   - 根據小說特性，對數據進行適當格式化，如處理章節字數顯示。
   - 處理可能出現的小說特有數據格式。

## 請求節流與限速 (`scraper/request-throttler.js`)

為防止對目標網站造成過大壓力，實現了請求節流機制：

1. **隨機延遲**:
   - 每次請求之間添加隨機時間的延遲。
   - 頁面請求和章節請求使用不同的延遲配置。

2. **節流控制**:
   - 封裝了請求函數，確保每次請求都經過延遲處理。
   - 提供了 `throttleRequest` 方法，接受一個異步函數作為參數。

3. **可配置性**:
   - 通過配置文件控制最小和最大延遲時間。
   - 不同類型的請求可以設置不同的延遲策略。

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

2.  **Excel 文件 (通過 `excel-integration.js`)**:
    - 使用 `exceljs` 庫。
    - 根據內容類型（漫畫或小說）創建不同結構的工作簿。
    - 設置列頭、列寬和單元格樣式（如標題加粗、背景色）。
    - 將抓取的數據添加到對應的工作表中。
    - 支持**附加模式**，可選擇將新數據追加到現有文件或創建新文件。
    - 支持自定義文件名。

## 定時任務 (`managers/schedule-manager.js`)

使用 `node-schedule` 庫實現：

1.  **任務創建與管理**:
    - 提供 IPC 接口 (`start-schedule`, `stop-schedule`) 供渲染進程控制定時任務。
    - 根據用戶設置（存儲在 `electron-store` 中）創建 `node-schedule` 的 `Job` 對象。
    - 支持每週和每日兩種定時模式。
    - 使用 `Map` 來存儲正在運行的任務，方便取消。

2.  **觸發執行**:
    - 當定時任務觸發時，其回調函數會調用 `scrapingManager` 來執行抓取操作。
    - 通過 IPC (`schedule-trigger`, `next-run-time`) 向渲染進程發送任務觸發和下一次運行時間的通知。

3.  **持久化**:
    - 定時任務的配置（啟用狀態、時間規則等）通過 `storageManager` 持久化存儲。
    - 應用啟動時，`scheduleManager` 會讀取存儲的配置並恢復定時任務。

## 前端狀態管理

使用 Pinia 進行前端狀態管理，將應用程序狀態分為多個邏輯模塊：

1. **設置存儲 (settingsStore)**:
   - 管理保存路徑設置
   - 管理背景設置
   - 管理附加模式設置
   - 管理自定義文件名設置

2. **URL 存儲 (urlStore)**:
   - 管理當前輸入的 URL
   - 管理 URL 歷史記錄
   - 提供添加、刪除和清空歷史記錄的方法

3. **抓取狀態 (scrapingStore)**:
   - 管理當前抓取狀態
   - 儲存抓取結果

4. **定時任務 (scheduleStore)**:
   - 管理定時任務設置
   - 管理定時任務狀態和下次執行時間

5. **UI 狀態 (uiStore)**:
   - 管理各部分的展開/折疊狀態
   - 持久化保存用戶界面偏好

## 站點適配層設計

為了標準化不同網站的抓取邏輯並提高代碼重用性，我們實現了一個抽象站點適配層。這種設計模式允許我們：

- 共享通用的抓取邏輯和請求處理代碼
- 輕鬆添加新網站支持
- 隔離特定於站點的選擇器和解析邏輯
- 提高測試覆蓋率
- 增強整體代碼質量

這種設計由以下主要組件組成：
1. **站點適配器接口** (ISiteAdapter)：定義所有適配器必須實現的方法
2. **基礎適配器** (BaseAdapter)：提供共享邏輯的抽象基類
3. **具體站點適配器**：每個支持的網站的特定實現
4. **適配器工廠**：負責創建適當的適配器實例

詳細設計文檔可在 [站點適配層設計](./site-adapter-design.md) 中找到。