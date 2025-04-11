# 歡迎使用 Webtoon Parser 文檔

<div align="center">
  <img src="https://img.shields.io/badge/版本-2.0.1-blue.svg" alt="版本"/>
  <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron"/>
  <img src="https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue.js"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
</div>

## 🔍 專案概述

Webtoon Parser 是一個功能強大的基於 Electron 的桌面應用程序，專為抓取和解析 Webtoon 網站上的漫畫信息而設計。該應用程序提供了直觀的用戶界面，允許用戶輕鬆輸入 Webtoon 漫畫 URL，然後自動抓取漫畫的基本信息、章節列表等數據，並將其保存為結構化的 Excel 文件。

此外，該應用程序還支持高級功能，如定時抓取功能，可以按照用戶設定的時間表自動執行抓取任務，非常適合需要定期監控漫畫更新或收集數據的用戶。

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>🎯 主要目標</strong></td>
      <td align="center"><strong>🛠️ 解決方案</strong></td>
    </tr>
    <tr>
      <td>高效抓取漫畫信息</td>
      <td>使用 Axios + Cheerio 實現高效的網頁抓取和解析</td>
    </tr>
    <tr>
      <td>用戶友好的界面</td>
      <td>基於 Vue.js 和 Element Plus 構建現代化 UI</td>
    </tr>
    <tr>
      <td>跨平台兼容性</td>
      <td>使用 Electron 框架確保在 Windows、macOS 和 Linux 上運行</td>
    </tr>
    <tr>
      <td>自動化數據收集</td>
      <td>實現定時任務功能，支持按計劃自動抓取</td>
    </tr>
  </table>
</div>

## ✨ 主要功能

- **基本爬蟲功能**：自動抓取漫畫標題、作者、評分、閱讀量等基本信息。
- **章節數據收集**：獲取所有章節的發布日期、閱讀量、點贊數等數據。
- **批量處理**：支持同時添加和處理多個 URL，提高工作效率。
- **定時抓取**：設置定時任務，按計劃自動執行抓取。
- **數據導出**：將抓取的數據導出為格式良好的 Excel 文件。
- **URL 歷史記錄**：保存和管理已處理的 URL 歷史記錄。
- **自定義保存路徑**：選擇 Excel 文件的保存位置。
- **多語言支持**：完整的繁體中文界面。

## 📝 總結

Webtoon Parser 是一個功能完整、設計精良的 Electron 桌面應用程序，通過結合 Web 抓取技術和現代前端框架，提供了一個用戶友好的界面來抓取和管理 Webtoon 漫畫信息。

該應用程序采用了 Electron 的標準三層架構，實現了主進程和渲染進程之間的安全通信，並提供了豐富的功能，如批量處理、定時抓取和數據導出等。通過精心的設計和實現，應用程序在性能、安全性和用戶體驗方面都達到了較高水平。

通過持續改進，Webtoon Parser 將成為漫畫愛好者和數據分析師的得力助手，幫助他們更高效地獲取和管理漫畫數據。

---

本項目基於 MIT 許可協議發布。 