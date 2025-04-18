# ✨ 核心功能

## 1. 多站點內容抓取

應用程序能夠從多個網站抓取豐富的信息：

### Webtoon 漫畫站點

- **基本信息**：
  - 漫畫標題和副標題
  - 作者和畫師信息
  - 漫畫描述和簡介
  - 漫畫封面圖片 URL
  - 評分和人氣數據

- **章節列表**：
  - 章節標題和編號
  - 發布日期和時間
  - 章節縮略圖 URL
  - 閱讀量和點贊數

### KadoKado 小說站點

- **基本信息**：
  - 小說標題
  - 作者信息
  - 小說描述
  - 小說狀態（連載中/已完結）
  - 總章節數和總字數
  - 點贊數和閱讀量

- **章節列表**：
  - 章節標題
  - 更新日期
  - 章節字數

應用程序支持處理分頁，確保能夠獲取所有章節信息，無論是漫畫還是小說包含多少章節。

## 2. 數據導出

抓取數據可以導出為結構良好的 Excel 文件：

- **多個工作表**：
  - 基本信息工作表
  - 章節列表工作表
  - 統計數據工作表（如果適用）

- **格式化**：
  - 自動調整列寬
  - 設置標題行樣式
  - 數字格式化（如閱讀量）
  - 日期格式化

- **自定義選項**：
  - 附加模式：選擇將新數據追加到現有文件或創建新文件
  - 設置文件保存位置
  - 自定義文件命名

## 3. 定時抓取

用戶可以設置定時任務，應用程序會按照設定的時間表自動執行抓取任務：

- **靈活的時間設置**：
  - 每日定時：設置固定時間每天執行
  - 每週定時：設置特定星期幾的固定時間執行
  - 時區支持：可選擇不同時區

- **任務管理**：
  - 啟動和停止定時任務
  - 查看下一次執行時間
  - 立即執行：當條件滿足時自動執行第一次任務

- **通知**：
  - 任務開始和完成通知
  - 執行過程日誌記錄
  - 執行結果通知

## 4. 批量處理

支持同時添加和處理多個 URL，提高工作效率：

- **批量導入**：
  - 從剪貼板粘貼多個 URL
  - 手動輸入多行 URL
  - 從歷史記錄中選擇 URL
  - 自動去重和驗證

- **依序處理**：
  - 依次處理多個 URL
  - 單獨的進度跟踪
  - 錯誤處理：單個 URL 失敗不影響其他 URL 處理

- **批量導出**：
  - 將每個 URL 的結果導出到單獨的 Excel 文件
  - 使用源站點和標題自動命名文件

## 5. URL 歷史記錄

- **自動保存**：自動保存已處理的 URL 列表及其標題。
- **管理界面**：提供專門的管理對話框查看和管理歷史記錄。
- **功能操作**：支持從歷史記錄中重新抓取、刪除條目、在瀏覽器中打開或添加到輸入框。
- **快速選擇**：支持通過下拉菜單快速從歷史記錄中選擇 URL。

## 6. 自定義保存路徑

- **選擇目錄**：允許用戶選擇保存導出的 Excel 文件的目錄。
- **記住設置**：記住上次使用的保存路徑。
- **默認路徑**：提供恢復默認下載路徑的選項。
- **文件替換控制**：通過附加模式設置控制是否替換現有文件。

## 7. 自定義背景設置

- **背景類型**：選擇默認背景或自定義圖片背景。
- **圖片 URL**：設置自定義背景圖片的 URL。
- **不透明度控制**：調整背景圖片的不透明度。
- **模糊程度**：調整背景圖片的模糊效果，確保文字清晰可讀。
- **即時預覽**：設置變更時立即顯示效果。

## 8. 用戶界面優化

- **模塊化設計**：使用卡片式佈局，將功能分為獨立模塊。
- **可折疊模塊**：每個功能模塊可以展開或折疊，減少界面雜亂感。
- **狀態保存**：記住用戶對各模塊的展開/折疊偏好。
- **日誌查看器**：提供專門的日誌查看區域，跟踪操作進度和結果。
- **響應式界面**：調整窗口大小時界面元素適當調整。
- **輔助提示**：為主要功能提供說明和幫助信息。

## 9. 外部瀏覽器打開

- **原始鏈接**：在應用程序的 URL 列表中，可以方便地在系統默認瀏覽器中打開對應的鏈接。
- **安全處理**：使用 Electron 的安全 API 打開外部鏈接，避免安全問題。