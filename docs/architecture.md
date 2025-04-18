# 🏗️ 架構與技術棧

## 專案架構

項目採用 Electron 標準的三層架構，並在主進程中進行了更細化的模塊劃分，確保代碼的清晰組織和良好的關注點分離：

```
src/
├── main/                 # 主進程
│   ├── core/             # 核心初始化與配置
│   │   ├── index.js      # 主進程入口點
│   │   └── config.js     # 應用配置（選擇器、延遲等）
│   ├── scraper/          # 抓取相關邏輯
│   │   ├── webtoon-scraper.js # 核心 Webtoon 抓取類
│   │   ├── KadoKadoScraper.js # 小說網站抓取類
│   │   ├── request-throttler.js # 請求節流器
│   │   └── excel-integration.js  # Excel 整合邏輯
│   ├── managers/         # 功能管理器
│   │   ├── scraping-manager.js # 抓取管理器
│   │   ├── schedule-manager.js  # 定時任務管理
│   │   ├── storage-manager.js   # 應用數據存儲 (配置, URL歷史)
│   │   ├── window-manager.js    # 窗口創建與管理
│   │   ├── navigation-manager.js # 外部鏈接導航
│   │   └── file-manager.js      # 文件系統操作 (選擇目錄等)
│   └── utils/            # 主進程工具函數
│       ├── logger.js     # 日誌記錄器
│       ├── file-helper.js # 文件輔助函數
│       └── utils.js      # 通用工具函數
├── renderer/             # 渲染進程 (UI)
│   ├── App.vue           # 主界面組件 (卡片式佈局)
│   ├── components/       # UI 原子組件
│   │   ├── UrlInput.vue    # URL 輸入組件
│   │   ├── url-input/      # URL 輸入相關子組件
│   │   │   ├── UrlHistoryDialog.vue
│   │   │   ├── UrlHelpGuide.vue
│   │   │   ├── UrlHistorySelector.vue
│   │   │   ├── UrlActionFooter.vue
│   │   │   └── UrlErrorMessage.vue
│   │   ├── ScheduleSettings.vue
│   │   ├── SavePathSettings.vue
│   │   ├── LogViewer.vue
│   │   └── BackgroundSettings.vue # 背景設置組件
│   ├── stores/           # Pinia 狀態管理
│   │   ├── settingsStore.ts
│   │   ├── urlStore.ts
│   │   ├── scrapingStore.ts
│   │   ├── scheduleStore.ts
│   │   └── uiStore.ts
│   ├── utils/            # 渲染進程工具函數
│   │   └── urlUtils.ts   # URL 相關工具函數
│   ├── types/            # TypeScript 類型定義
│   ├── styles/           # CSS 樣式文件
│   ├── main.js           # 渲染進程入口 (Vue 初始化)
│   └── index.html        # HTML 模板
└── preload/              # 預加載腳本
    └── index.js          # IPC 通信橋接與 API 暴露
```

### 1. 主進程 (src/main)

主進程負責應用程序的核心邏輯、窗口管理和系統交互。

- **core/**: 處理應用初始化 (`index.js`) 和加載配置 (`config.js`)。配置文件中定義了各種網站的選擇器、請求設置和應用默認值。
- **scraper/**: 包含抓取相關的所有模塊：
  - `webtoon-scraper.js`: 實現 Webtoon 漫畫網站的數據獲取、解析和處理分页。
  - `KadoKadoScraper.js`: 實現 KadoKado 小說網站的數據獲取和解析。
  - `request-throttler.js`: 控制對網站的請求頻率，避免過快請求導致被封。
  - `excel-integration.js`: 負責 Excel 生成和數據導出的邏輯整合。
- **managers/**: 包含各個獨立功能的管理器：
  - `scraping-manager.js`: 協調抓取任務，支持不同網站類型的識別和相應處理。
  - `schedule-manager.js`: 使用 `node-schedule` 創建、管理和持久化定時任務。
  - `storage-manager.js`: 使用 `electron-store` 讀寫應用配置、URL 歷史等本地數據。
  - `window-manager.js`: 創建和管理 Electron `BrowserWindow`。
  - `navigation-manager.js`: 安全地處理打開外部鏈接的請求。
  - `file-manager.js`: 處理與文件系統交互的請求，如打開目錄選擇對話框。
- **utils/**: 提供主進程共享的工具函數，如日誌記錄、文件操作輔助等。

### 2. 渲染進程 (src/renderer)

渲染進程負責用戶界面的呈現和用戶交互，使用 Vue.js 和 Element Plus 構建。

- **App.vue**: 主 Vue 組件，使用 Element Plus 的卡片式佈局 (`el-card`) 組織各個功能區域，支持模塊展開/折疊。
- **components/**: 包含可重用的 UI 組件，組織結構更加模块化：
  - `UrlInput.vue` 及其子組件: 處理URL輸入、歷史記錄和URL管理相關功能。
  - `ScheduleSettings.vue`: 定時抓取設置。
  - `SavePathSettings.vue`: 文件保存路徑設置。
  - `LogViewer.vue`: 日誌查看器。
  - `BackgroundSettings.vue`: 應用背景設置。
- **stores/**: 使用 Pinia 進行狀態管理，將應用狀態分為多個邏輯模塊：
  - `settingsStore.ts`: 管理應用設置如保存路徑、背景設置。
  - `urlStore.ts`: 管理 URL 輸入和歷史。
  - `scrapingStore.ts`: 管理抓取相關狀態。
  - `scheduleStore.ts`: 管理定時任務狀態。
  - `uiStore.ts`: 管理 UI 狀態如展開/折疊狀態。
- **utils/**, **types/**, **styles/**: 分別包含渲染進程的工具函數、TypeScript 類型定義和 CSS 樣式。
- **main.js**: Vue 應用程序的入口點，初始化 Vue 實例和 Pinia 狀態管理。

### 3. 預加載腳本 (src/preload)

- **index.js**: 在獨立的、具有 Node.js 訪問權限的上下文中運行，通過 `contextBridge` 安全地向渲染進程暴露一組經過白名單驗證的 IPC 通道 (`send`, `invoke`, `on`, `removeAllListeners`) 以及特定功能調用接口（如 `startScraping`, `selectDirectory`）。同時包含了一些用於修復 DPI 縮放問題的 CSS 注入邏輯。

## 💻 技術棧

| 類別 | 技術 | 說明 |
|------|------|------|
| **框架** | [Electron](https://www.electronjs.org/) | 跨平台桌面應用開發框架 |
| **前端** | [Vue.js](https://vuejs.org/) | 漸進式 JavaScript 框架 |
|      | [Element Plus](https://element-plus.org/) | 基於 Vue 3 的 UI 組件庫 |
|      | [Pinia](https://pinia.vuejs.org/) | Vue 的狀態管理庫 |
| **後端 (Node.js)** | [Node.js](https://nodejs.org/) | JavaScript 運行時環境 |
| **構建** | [Vite](https://vitejs.dev/) | 前端構建工具，與 `electron-vite` 結合 |
| **數據抓取** | [Axios](https://axios-http.com/) | HTTP 客戶端 |
|      | [Cheerio](https://cheerio.js.org/) | HTML 解析器 |
| **數據存儲** | [ExcelJS](https://github.com/exceljs/exceljs) | Excel 文件生成庫 |
|      | [Electron Store](https://github.com/sindresorhus/electron-store) | 配置與數據持久化 |
| **定時任務** | [Node Schedule](https://github.com/node-schedule/node-schedule) | 定時任務調度庫 |
| **語言** | [TypeScript](https://www.typescriptlang.org/) | JavaScript 的超集 (主要在渲染進程) |
|      | [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) | 主要在主進程和預加載腳本 |