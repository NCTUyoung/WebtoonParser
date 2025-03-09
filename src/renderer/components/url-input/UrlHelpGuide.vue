<template>
  <div class="url-help-section">
    <!-- 說明標題 -->
    <div class="help-header">
      <div class="help-title">
        <el-icon><InfoFilled /></el-icon>
        <span>網址輸入說明</span>
      </div>
    </div>
    
    <!-- 說明內容 -->
    <div class="help-content">
      <!-- 輸入方式說明 -->
      <div class="help-category">
        <div class="category-title">輸入方式</div>
        <div class="category-items">
          <div class="help-item">
            <div class="icon-wrapper">
              <svg class="help-svg" viewBox="0 0 24 24" width="24" height="24">
                <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
                <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.5"/>
                <line x1="7" y1="13" x2="17" y2="13" stroke="currentColor" stroke-width="1.5"/>
                <line x1="7" y1="16" x2="14" y2="16" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </div>
            <div class="item-desc">
              <div class="item-title">直接輸入</div>
              <div class="item-text">在文本框中直接輸入網址</div>
            </div>
          </div>
          <div class="help-item">
            <div class="icon-wrapper">
              <svg class="help-svg" viewBox="0 0 24 24" width="24" height="24">
                <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 10h8M8 14h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M16 2v4M8 2v4" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </div>
            <div class="item-desc">
              <div class="item-title">剪貼簿</div>
              <div class="item-text">點擊「貼上」按鈕從剪貼簿導入網址</div>
            </div>
          </div>
          <div class="help-item">
            <div class="icon-wrapper">
              <svg class="help-svg" viewBox="0 0 24 24" width="24" height="24">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
                <path d="M12 8v4l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="item-desc">
              <div class="item-title">歷史記錄</div>
              <div class="item-text">從下拉選單中選擇歷史網址</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 使用技巧說明 -->
      <div class="help-category">
        <div class="category-title">使用技巧</div>
        <div class="tips-list">
          <div class="tip-item">多個網址請換行分隔，每行一個網址</div>
          <div class="tip-item">點擊「管理」按鈕可查看和編輯歷史記錄</div>
          <div class="tip-item">點擊「開啟」按鈕可在瀏覽器中預覽網址</div>
          <div class="tip-item">目前僅支援 Webtoon 網站，其他韓國漫畫網站尚在開發中</div>
          <div class="tip-item">支援下載 Webtoon 的完整系列資訊（不支援單集下載）</div>
          <div class="tip-item">從下拉選單中選擇歷史網址可快速添加到輸入框</div>
          <div class="tip-item">下載完成後，文件將保存在設置中指定的路徑</div>
        </div>
      </div>
      
      <!-- 支援格式說明 -->
      <div class="help-category">
        <div class="category-title">支援格式</div>
        <div class="format-examples">
          <div class="format-item">
            <div class="format-label">Webtoon:</div>
            <div class="format-url">https://www.webtoons.com/zh-hant/drama/title/list?title_no=1234</div>
          </div>
          <div class="format-item">
            <div class="format-label">即將支援:</div>
            <div class="format-url">Naver, Kakao, Bomtoon, Toptoon 等韓國漫畫網站</div>
          </div>
        </div>
      </div>

      <!-- Webtoon 說明 -->
      <div class="help-category">
        <div class="category-title">Webtoon 說明</div>
        <div class="tips-list">
          <div class="tip-item">請確保網址中包含 <span class="code-text">title_no</span> 參數</div>
          <div class="tip-item">請使用漫畫列表頁面的網址，例如包含 <span class="code-text">list</span> 的網址</div>
          <div class="tip-item">目前僅支援獲取漫畫的基本信息和章節列表</div>
          <div class="tip-item">支援多種語言版本，包括繁體中文、英文等</div>
          <div class="tip-item">資料將以 Excel 格式保存</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { InfoFilled } from '@element-plus/icons-vue'
</script>

<style scoped>
.url-help-section {
  margin-bottom: 14px;
  width: 100%;
  background-color: #f8f9fb;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #ebeef5;
  box-sizing: border-box;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.help-header {
  margin-bottom: 10px;
}

.help-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #409EFF;
}

.help-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.help-category {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.category-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  padding-bottom: 4px;
  border-bottom: 1px solid #ebeef5;
}

.category-items {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.help-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: calc(50% - 5px);
  min-width: 200px;
}

.icon-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(64, 158, 255, 0.1);
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.help-item:hover .icon-wrapper {
  transform: scale(1.1);
  background-color: rgba(64, 158, 255, 0.2);
}

.help-svg {
  width: 18px;
  height: 18px;
  color: #409EFF;
}

.item-desc {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.item-text {
  font-size: 12px;
  color: #606266;
  line-height: 1.4;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tip-item {
  position: relative;
  padding-left: 16px;
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}

.tip-item::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #409EFF;
}

.format-examples {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.format-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.format-label {
  font-weight: 500;
  color: #303133;
  width: 60px;
}

.format-url {
  color: #606266;
  word-break: break-all;
}

.code-text {
  font-family: monospace;
  background-color: #f0f0f0;
  padding: 1px 4px;
  border-radius: 3px;
  color: #e6a23c;
  font-size: 11px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .url-help-section {
    padding: 10px;
  }
  
  .help-item {
    width: 100%;
    min-width: 0;
  }
  
  .help-title {
    font-size: 14px;
  }
  
  .category-title {
    font-size: 13px;
  }
  
  .item-title {
    font-size: 12px;
  }
  
  .item-text, .tip-item, .format-item {
    font-size: 11px;
  }
}

@media (max-width: 576px) {
  .url-help-section {
    padding: 8px 6px;
  }
  
  .help-content {
    gap: 8px;
  }
  
  .help-category {
    gap: 4px;
  }
  
  .category-title {
    font-size: 12px;
    padding-bottom: 3px;
  }
  
  .help-item {
    gap: 6px;
  }
  
  .icon-wrapper {
    width: 28px;
    height: 28px;
  }
  
  .help-svg {
    width: 16px;
    height: 16px;
  }
  
  .format-label {
    width: 50px;
  }
  
  .item-text, .tip-item, .format-item {
    font-size: 11px;
    line-height: 1.3;
  }
  
  .tip-item {
    padding-left: 14px;
  }
  
  .tip-item::before {
    top: 6px;
    width: 5px;
    height: 5px;
  }
  
  .code-text {
    font-size: 10px;
    padding: 1px 2px;
  }
}
</style> 