<template>
  <el-config-provider :locale="zhTw">
    <el-container class="app-container">
      <!-- 頂部標題欄 -->
      <el-header class="app-header">
        <div class="header-content">
          <h1>{{ title }} <span class="version">v{{ version }}</span></h1>
        </div>
      </el-header>

      <el-main class="main-content">
        <!-- URL 輸入區域 -->
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <h2>Webtoon 網址</h2>
              <el-button type="primary" @click="startScraping">
                立即爬取
              </el-button>
            </div>
          </template>
          <UrlInput ref="urlInputRef" v-model="urls" />
        </el-card>

        <!-- 定時設置區域 -->
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <h2>定時設置</h2>
            </div>
          </template>
          <ScheduleSettings
            v-model:schedule="scheduleSettings"
            :is-running="isScheduleRunning"
            @toggle-schedule="toggleSchedule"
          />
        </el-card>

        <!-- 日誌查看區域 -->
        <el-card class="section-card log-card">
          <template #header>
            <div class="card-header">
              <h2>執行日誌</h2>
              <el-button type="info" plain @click="clearLogs">
                清空日誌
              </el-button>
            </div>
          </template>
          <LogViewer ref="logViewerRef" :logs="logs" />
        </el-card>
      </el-main>

      <!-- 底部版權資訊 -->
      <el-footer class="app-footer">
        <p>&copy; {{ new Date().getFullYear() }} {{ title }}. All rights reserved.</p>
      </el-footer>
    </el-container>
  </el-config-provider>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import UrlInput from './components/UrlInput.vue'
import ScheduleSettings from './components/ScheduleSettings.vue'
import LogViewer from './components/LogViewer.vue'
import type { LogMessage } from './types'

// 環境變量
const title = import.meta.env.VITE_APP_TITLE
const version = import.meta.env.VITE_APP_VERSION

// 組件引用
const urlInputRef = ref<InstanceType<any> | null>(null)
const logViewerRef = ref()

// 狀態管理
const urls = ref('')
const logs = ref<LogMessage[]>([])
const isScheduleRunning = ref(false)

// 將 scheduleSettings 改為 ref，使其能被子組件的 v-model 正確更新
const scheduleSettings = ref({
  day: '五',
  hour: '18',
  minute: '00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
})

// 開始爬取函數，使用 invoke 與主進程的 ipcMain.handle 對應
const startScraping = async () => {
  console.log('startScraping 觸發')
  console.log('urls.value:', urls.value)

  // 若沒有輸入 URL，則直接提醒用戶
  if (!urls.value) {
    ElMessage.warning('請輸入至少一個 URL')
    return
  }

  // 將輸入的 URL 按行拆分並去除多餘空白，濾除空值
  
  const urlList = urls.value.split('\n').filter(url => url.trim())
  try {
    // 使用 invoke 送出請求 => 主進程屬於 ipcMain.handle('start-scraping', …)
    await window.electron.invoke('start-scraping', urlList)
    // 設置 loading 狀態
    urlInputRef.value?.setLoading(true)
  } catch (error: any) {
    console.error('爬取發生錯誤：', error)
    ElMessage.error(`爬取發生錯誤：${error.message}`)
  }
}

// 切換定時任務，注意使用 scheduleSettings.value
const toggleSchedule = () => {
  if (!isScheduleRunning.value) {
    if (!urls.value.trim()) {
      ElMessage.warning('請先輸入要爬取的URL')
      return
    }
    
    window.electron.send('start-schedule', { ...scheduleSettings.value })
    isScheduleRunning.value = true
  } else {
    window.electron.send('stop-schedule')
    isScheduleRunning.value = false
  }
}

// 清空日誌
const clearLogs = () => {
  logs.value = []
}

// 存儲 URLs
const saveUrls = () => {
  window.electron.send('save-urls', urls.value)
}

// 在啟動時讀取之前保存的 URLs，並添加 beforeunload 事件
onMounted(async () => {
  try {
    urls.value = await window.electron.invoke('load-urls')
  } catch (error) {
    console.error('加載保存的 URLs 失敗:', error)
  }
  
  window.electron.on('log-message', (message: string) => {
    logs.value.push({
      time: new Date().toLocaleTimeString(),
      message
    })
  })
  
  window.electron.on('scraping-complete', () => {
    urlInputRef.value?.setLoading(false)
    ElMessage.success('爬取完成')
  })
  
  window.electron.on('scraping-error', (error: string) => {
    urlInputRef.value?.setLoading(false)
    ElMessage.error(error)
  })
  
  window.electron.on('schedule-trigger', () => {
    console.log('收到 schedule-trigger 事件');
    // 檢查 urls 是否還存在
    console.log('urls.value:', urls.value);
    startScraping();
  })

  // 當關閉應用前保存最新 URL
  window.addEventListener('beforeunload', saveUrls)
})

// 清除監聽事件
onUnmounted(() => {
  window.electron.removeAllListeners('log-message')
  window.electron.removeAllListeners('scraping-complete')
  window.electron.removeAllListeners('scraping-error')
  window.electron.removeAllListeners('schedule-trigger')
  window.removeEventListener('beforeunload', saveUrls)
})
</script>

<style>
/* 全局樣式 */
:root {
  --primary-color: #409EFF;
  --header-bg: #1e88e5;
  --card-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

/* 容器樣式 */
.app-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

/* 頂部標題欄 */
.app-header {
  background: var(--header-bg);
  color: white;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 500;
}

.version {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-left: 8px;
}

/* 主要內容區域 */
.main-content {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 卡片樣式 */
.section-card {
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: var(--card-shadow);
}

.section-card .el-card__header {
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 500;
  color: #303133;
}

/* 日誌卡片特殊樣式 */
.log-card .el-card__body {
  padding: 0;
  height: 300px;
  background: #1e1e1e;
}

/* 底部版權資訊 */
.app-footer {
  text-align: center;
  padding: 20px;
  color: #909399;
  font-size: 0.9rem;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .main-content {
    padding: 10px;
  }
  
  .header-content h1 {
    font-size: 1.2rem;
  }
}
</style> 