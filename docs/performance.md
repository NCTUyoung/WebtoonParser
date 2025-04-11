# ⚡ 性能優化

應用程序實現了多種性能優化策略，確保在處理大量數據時保持響應性和效率：

### 1. 異步操作

- **核心原則**: 避免阻塞主進程和渲染進程。
- **主進程**: 
  - 所有 I/O 操作（網絡請求 `axios`, 文件寫入 `exceljs`, 讀寫配置 `electron-store`）都使用 `async/await` 或 Promises 進行異步處理。
  - IPC 通信使用 `ipcMain.handle` 處理異步請求。
- **渲染進程**: 
  - UI 更新和用戶交互應該保持流暢。
  - 通過 `ipcRenderer.invoke` 調用主進程功能，等待 Promise 結果，期間可以顯示加載狀態。
  - 複雜的計算或數據處理如果可能阻塞 UI，可以考慮使用 Web Workers（儘管在此應用中可能非必需）。

### 2. 並發控制 (針對批量處理)

- **問題**: 同時發起過多網絡請求可能導致服務器拒絕、IP 被封鎖或本地資源耗盡。
- **策略**: 
  - **限制並發數**: 在批量處理多個 URL 時，不要一次性為所有 URL 創建抓取任務。
  - **隊列或分塊處理**: 將 URL 列表分成小塊（例如，一次處理 3-5 個），或者使用異步隊列庫（如 `async` 庫的 `queue` 或 `p-limit`）來限制同時運行的抓取任務數量。
  - **請求間延遲**: 在連續的請求之間添加小的延遲 (`setTimeout`)，進一步降低被目標網站視為惡意攻擊的風險。

```javascript
// 簡單的併發控制示例 (分塊處理)
asyn  c function processUrlsInChunks(urls, concurrency = 3) {
  const results = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency);
    const chunkPromises = chunk.map(url => {
      // 假設 scrapeUrl 是處理單個 URL 的異步函數
      return scrapeUrl(url).catch(error => ({ url, error: error.message })); // 捕獲錯誤
    });
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
    // 可選：在處理完一個塊後稍作延遲
    await new Promise(resolve => setTimeout(resolve, 500)); 
  }
  return results;
}
```

### 3. 緩存機制 (可選)

- **場景**: 如果用戶可能在短時間內重複抓取同一個 URL，或者某些頁面內容不經常變化，可以考慮緩存。
- **策略**:
  - **內存緩存**: 使用 `Map` 存儲已獲取的頁面 HTML 或解析後的數據，以 URL 為鍵。
  - **持久化緩存**: 對於不常變的數據，可以考慮使用 `electron-store` 或文件系統進行持久化緩存（需要管理緩存過期）。
- **權衡**: 緩存會增加內存消耗和代碼複雜度，需要評估收益是否值得。

### 4. UI 性能 (渲染進程)

- **虛擬列表**: 如果 URL 列表或日誌列表可能非常長，使用虛擬滾動技術（例如，使用現有的 Vue 組件庫或自行實現）可以顯著提高渲染性能，只渲染可見區域的項目。
- **組件懶加載**: 對於不立即需要的複雜組件，可以使用 Vue 的異步組件 (`defineAsyncComponent`) 進行懶加載。
- **防抖 (Debounce) 和節流 (Throttle)**: 對於頻繁觸發的事件（如窗口大小調整、輸入框輸入），使用防抖或節流技術減少處理次數。
- **數據響應性**: 避免在 Vue 的 `data` 或 `ref` 中存儲過於龐大或嵌套過深的對象，可能導致不必要的性能開銷。

### 5. 內存管理

- **及時釋放引用**: 確保不再需要的對象（特別是大型數據結構、DOM 引用、事件監聽器、定時器）被垃圾回收機制回收。
- **事件監聽器管理**: 在 Vue 組件銷毀時 (`onUnmounted` 或 `beforeDestroy`)，移除通過 `ipcRenderer.on` 或其他方式添加的事件監聽器，防止內存泄漏。
- **分批處理大數據**: 如果需要處理非常大的數據集（例如，包含成千上萬章節的漫畫），考慮分批讀取、處理和寫入數據，而不是一次性加載到內存。

### 6. Electron 構建與打包優化

- **ASAR 打包**: 使用 `asar: true` (electron-builder 默認可能啟用) 將應用源代碼打包成一個歸檔文件，可以略微提高加載速度。
- **代碼拆分 (Code Splitting)**: 利用 Vite 的代碼拆分功能，將代碼分成更小的塊，按需加載。
- **移除未使用的依賴**: 定期清理 `package.json`，移除不再使用的依賴項。 