# 👥 貢獻指南

我們歡迎任何形式的貢獻！如果您發現了 Bug、有功能建議，或者想直接參與代碼開發，請參考以下指南。

## 報告問題 (Issues)

- 在提交新的 Issue 之前，請先搜索現有的 Issues，確保問題沒有被重複報告。
- 如果是 Bug 報告，請盡可能提供詳細信息：
  - 清晰描述 Bug 的現象。
  - 重現 Bug 的步驟。
  - 您使用的操作系統和應用程序版本。
  - 相關的日誌信息或截圖。
- 如果是功能建議，請清晰描述您希望添加的功能及其使用場景。

## 參與開發 (Pull Requests)

1.  **Fork 倉庫**: 點擊項目主頁右上角的 "Fork" 按鈕，將倉庫複製到您自己的 GitHub 賬戶下。
2.  **Clone 您的 Fork**: 將您 Fork 的倉庫克隆到本地：
    ```bash
    git clone https://github.com/NCTUyoung/webtoon-parser.git
    cd webtoon-parser
    ```
3.  **創建特性分支**: 從 `main` 或最新的開發分支創建一個新的分支來進行您的修改：
    ```bash
    git checkout -b feature/your-amazing-feature
    # 或者修复 bug:
    # git checkout -b fix/issue-number
    ```
    請使用有意義的分支名稱。
4.  **進行修改**: 編寫您的代碼、添加測試、更新文檔等。
    - 請遵循項目現有的代碼風格。
    - 如果添加新功能，請考慮添加相應的測試。
    - 如果修改了用戶可見的功能，請更新相關文檔。
5.  **安裝依賴與運行開發環境**: (如果尚未執行)
    ```bash
    npm install
    npm run dev
    ```
6.  **測試您的修改**: 確保您的修改沒有引入新的問題，並且通過了所有測試（如果有的話）。
7.  **提交更改**: 將您的修改提交到本地分支：
    ```bash
    git add .
    git commit -m "feat: Add some amazing feature" # 使用符合 Conventional Commits 的消息
    # 或 "fix: Resolve issue #123"
    # 或 "docs: Update installation guide"
    ```
8.  **推送到您的 Fork**: 將您的本地分支推送到 GitHub 上的 Fork 倉庫：
    ```bash
    git push origin feature/your-amazing-feature
    ```
9.  **創建 Pull Request (PR)**:
    - 在 GitHub 上您的 Fork 倉庫頁面，找到您剛剛推送的分支，點擊 "Compare & pull request" 按鈕。
    - 確保基礎分支是原始倉庫的 `main` 分支，對比分支是您創建的特性分支。
    - 填寫清晰的 PR 標題和描述，說明您的修改內容和目的。
    - 如果您的 PR 解決了某個 Issue，請在描述中添加 `Closes #issue-number`。
10. **代碼審查**: 等待項目維護者審查您的 PR。根據反饋進行必要的修改。
11. **合併**: 一旦您的 PR 被批準，維護者會將其合併到主代碼庫中。

## 代碼風格

- 請遵循項目中 `.eslintrc.js` 和 `.prettierrc.js` (如果存在) 定義的規則。
- 盡量編寫清晰、可讀、自解釋的代碼。
- 添加必要的註釋來解釋複雜的邏輯。

感謝您對 Webtoon Parser 項目的貢獻！ 