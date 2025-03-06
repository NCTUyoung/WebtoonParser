# Webtoon Parser

<div align="center">
  <img src="https://img.shields.io/badge/版本-2.0.0-blue.svg" alt="版本"/>
  <img src="https://img.shields.io/badge/Electron-27.0.0-47848F?style=flat&logo=electron&logoColor=white" alt="Electron"/>
  <img src="https://img.shields.io/badge/Vue.js-3.3.4-4FC08D?style=flat&logo=vue.js&logoColor=white" alt="Vue.js"/>
  <img src="https://img.shields.io/badge/Element_Plus-2.3.8-409EFF?style=flat&logo=element&logoColor=white" alt="Element Plus"/>
</div>

## 📑 目錄

- [項目概述](#-項目概述)
- [功能特點](#-功能特點)
- [安裝與使用](#-安裝與使用)
- [V2版本更新](#-v2版本更新)
- [技術實現](#-技術實現)
- [常見問題](#-常見問題)
- [未來計劃](#-未來計劃)
- [貢獻指南](#-貢獻指南)
- [許可協議](#-許可協議)

## 🔍 項目概述

Webtoon Parser 是一個基於 Electron 的桌面應用程序，專為抓取和解析 Webtoon 網站上的漫畫信息而設計。該應用程序提供了直觀的用戶界面，允許用戶輕鬆輸入 Webtoon 漫畫 URL，然後自動抓取漫畫的基本信息、章節列表等數據，並將其保存為結構化的 Excel 文件。

## ✨ 功能特點

- **基本爬蟲功能**：自動抓取漫畫標題、作者、評分、閱讀量等基本信息
- **章節數據收集**：獲取所有章節的發布日期、閱讀量、點贊數等數據
- **批量處理**：支持同時添加和處理多個 URL，提高工作效率
- **定時抓取**：設置定時任務，按計劃自動執行抓取
- **數據導出**：將抓取的數據導出為格式良好的 Excel 文件
- **URL 歷史記錄**：保存和管理已處理的 URL 歷史記錄
- **自定義保存路徑**：選擇 Excel 文件的保存位置
- **多語言支持**：完整的繁體中文界面

## 🚀 安裝與使用

### 系統要求

- Windows 10/11
- macOS 10.13 或更高版本
- Linux (Ubuntu 18.04 或更高版本)

### 下載與安裝

1. 從 [Releases](https://github.com/yourusername/webtoon-parser/releases) 頁面下載最新版本
2. 根據您的操作系統選擇對應的安裝包：
   - Windows: `.exe` 或 `.msi` 文件
   - macOS: `.dmg` 文件
   - Linux: `.AppImage` 或 `.deb` 文件
3. 按照安裝向導完成安裝

### 基本使用

1. 啟動應用程序
2. 在 URL 輸入框中輸入 Webtoon 漫畫的 URL
3. 點擊「開始抓取」按鈕
4. 等待抓取完成，查看日誌信息
5. 抓取完成後，Excel 文件將保存到指定位置

## 🆕 V2版本更新

V2 版本帶來了多項重要改進和新功能：

### 批量處理功能

- **多 URL 同時處理**：支持一次性添加多個 URL 進行處理
- **URL 歷史記錄管理**：自動保存已處理的 URL 歷史記錄，支持查看、編輯和刪除

### 用戶體驗優化

- **界面美化**：重新設計的卡片式布局，添加動畫和過渡效果
- **交互改進**：添加拖放功能，支持拖放 URL 到應用
- **外部瀏覽器打開功能**：支持在默認瀏覽器中打開 Webtoon 鏈接

### 數據處理增強

- **Excel 輸出優化**：改進 Excel 文件格式和樣式，添加自動排序功能
- **自定義保存路徑**：支持用戶選擇 Excel 文件保存位置，記住上次選擇的路徑

### 技術改進

- **編碼問題解決**：完善中文編碼處理，解決跨平台編碼兼容性問題
- **錯誤處理增強**：添加更詳細的錯誤日誌，改進錯誤恢復機制
- **性能優化**：減少不必要的網絡請求，優化數據處理邏輯

### 多語言支持

- **繁體中文界面**：所有界面元素支持繁體中文，錯誤消息和提示使用繁體中文

### 測試與驗證

V2版本經過了全面的測試和驗證，確保所有功能穩定可靠：

- **立即下載功能測試**：確認檔案能夠正確下載到指定位置
- **多URL處理測試**：驗證多組URL（至少兩組）能夠正確輸出到Excel檔案
- **定時功能測試**：確認定時任務能夠按設定時間正常觸發
- **跨平台兼容性測試**：在Windows和macOS系統上進行測試，確保一致的用戶體驗

## 🔧 技術實現

Webtoon Parser 使用了以下技術：

- **Electron**：跨平台桌面應用框架
- **Vue.js**：前端框架，用於構建用戶界面
- **Element Plus**：基於 Vue 3 的組件庫
- **Axios**：用於發送 HTTP 請求
- **Cheerio**：用於解析 HTML
- **ExcelJS**：用於生成 Excel 文件
- **Node Schedule**：用於實現定時任務

## ❓ 常見問題

### 應用程序無法啟動

- 確保您的系統滿足最低要求
- 嘗試重新安裝應用程序
- 檢查是否有防病毒軟件阻止應用程序運行

### 無法抓取數據

- 確保輸入的 URL 格式正確
- 檢查您的網絡連接
- 確認目標網站是否可訪問

### Excel 文件無法打開

- 確保您的系統安裝了 Microsoft Excel 或兼容的軟件
- 檢查文件是否被其他程序佔用
- 嘗試使用不同的應用程序打開文件

## 📈 未來計劃

- 支持更多漫畫網站
- 添加數據可視化功能
- 實現漫畫內容下載功能
- 添加多語言支持（英文、日文等）
- 開發插件系統

## 👥 貢獻指南

我們歡迎任何形式的貢獻！如果您想參與項目開發，請按照以下步驟：

1. Fork 項目
2. 創建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打開一個 Pull Request

## 📄 許可協議

本項目基於 MIT 許可協議發布 - 詳情請參見 [LICENSE](LICENSE) 文件。
