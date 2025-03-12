<template>
  <el-config-provider :locale="zhTw">
    <el-container class="app-container">
      <!-- 頂部標題欄 -->
      <el-header class="app-header">
        <div class="header-content">
          <h1>Webtoon爬蟲工具 <span class="version">v{{ version }}</span></h1>
        </div>
      </el-header>

      <el-main class="main-content">
        <!-- URL 輸入區域 -->
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <h2>Webtoon 網址</h2>
            </div>
          </template>
          <UrlInput 
            ref="urlInputRef" 
            v-model="urls" 
            :external-save-path="savePath" 
            @start-scraping="startScraping()"
          />
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
            :next-run-time="nextRunTime"
            @toggle-schedule="toggleSchedule"
          />
        </el-card>

        <!-- 儲存設置區域 -->
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <h2>儲存設置</h2>
            </div>
          </template>
          <SavePathSettings 
            v-model="savePath" 
            v-model:append-mode="appendMode" 
          />
        </el-card>

        <!-- 日誌查看區域 -->
        <el-card class="section-card log-card">
          <template #header>
            <div class="card-header">
              <h2>執行日誌</h2>
              <el-button type="info" @click="clearLogs">
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import UrlInput from './components/UrlInput.vue'
import ScheduleSettings from './components/ScheduleSettings.vue'
import LogViewer from './components/LogViewer.vue'
import SavePathSettings from './components/SavePathSettings.vue'
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
const nextRunTime = ref('')

// 將 scheduleSettings 改為 ref，使其能被子組件的 v-model 正確更新
const scheduleSettings = ref({
  scheduleType: 'weekly',
  day: '五',
  hour: '18',
  minute: '00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
})

// 儲存路徑
const savePath = ref('')
const appendMode = ref(true)

// 添加調試日誌
console.log('inin savePath:', savePath.value)

// 開始爬取函數，使用 invoke 與主進程的 ipcMain.handle 對應
const startScraping = async (forceAppend = false) => {
  console.log('startScraping 觸發')
  console.log('urls.value:', urls.value)
  console.log('append mode:', forceAppend || appendMode.value)

  if (!urls.value) {
    ElMessage.warning('請輸入至少一個 URL')
    return
  }

  // 將輸入的 URL 拆分成陣列
  const urlList = urls.value.split('\n').filter(url => url.trim())

  // 開始爬取前立即顯示 loading 狀態
  urlInputRef.value?.setLoading(true)

  try {
    // 執行 invoke，若成功則代表爬取開始
    const result = await window.electron.invoke('start-scraping', {
      urls: urlList,
      savePath: savePath.value,
      append: forceAppend || appendMode.value
    })
    
    // 檢查結果，如果成功則顯示成功訊息並停止加載狀態
    if (result && result.success) {
      console.log('爬取成功，結果：', result)
      urlInputRef.value?.setLoading(false)
      ElMessage.success('爬取完成')
    }
  } catch (error: any) {
    console.error('爬取發生錯誤：', error)
    // 發生錯誤時停止 loading 狀態並顯示錯誤提示
    urlInputRef.value?.setLoading(false)
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

// 存儲定時設置
const saveScheduleSettings = () => {
  window.electron.send('save-schedule-settings', { ...scheduleSettings.value })
}

// 監聽儲存路徑的變化
watch(savePath, (newValue, oldValue) => {
  // 只有當值真正改變時才保存
  if (newValue !== oldValue) {
    console.log('Save path changed:', { newValue, oldValue })
    saveSavePath()
  }
})

// 修改 saveSavePath 函數
const saveSavePath = () => {
  console.log('Saving path:', savePath.value)
  window.electron.send('save-save-path', savePath.value)
}

// 在啟動時讀取之前保存的 URLs 和定時設置
onMounted(async () => {
  try {
    // 讀取已保存的 URLs
    urls.value = await window.electron.invoke('load-urls')
    
    // 讀取已保存的定時設置
    const savedSettings = await window.electron.invoke('load-schedule-settings')
    scheduleSettings.value = savedSettings
    
    // 讀取已保存的儲存路徑
    const savedPath = await window.electron.invoke('load-save-path')
    console.log('Loaded save path:', savedPath)
    savePath.value = savedPath
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
  
  window.electron.on('log-message', (message: string) => {
    logs.value.push({
      time: new Date().toLocaleTimeString(),
      message
    })
  })
  
  window.electron.on('scraping-complete', () => {
    console.log('收到 scraping-complete 事件')
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
    // 定時任務觸發時使用 appendMode 值，如果為 false 則強制使用 true
    console.log('定時任務使用的附加模式:', appendMode.value ? '開啟' : '強制開啟');
    startScraping(true); // 定時任務總是使用附加模式
  })
  
  // 監聽下次執行時間的更新
  window.electron.on('next-run-time', (time: string) => {
    nextRunTime.value = time
  })

  // 當關閉應用前保存所有設置
  window.addEventListener('beforeunload', () => {
    saveUrls()
    saveScheduleSettings()
    saveSavePath()
  })
})

// 監聽定時設置的變化
watch(scheduleSettings, () => {
  saveScheduleSettings()
}, { deep: true })

// 清除監聽事件
onUnmounted(() => {
  window.electron.removeAllListeners('log-message')
  window.electron.removeAllListeners('scraping-complete')
  window.electron.removeAllListeners('scraping-error')
  window.electron.removeAllListeners('schedule-trigger')
  window.electron.removeAllListeners('next-run-time')
  window.removeEventListener('beforeunload', () => {
    saveUrls()
    saveScheduleSettings()
    saveSavePath()
  })
})
</script>

<style>
/* 全局樣式 */
:root {
  --primary-color: #2b85e4;
  --primary-light: #5cadff;
  --primary-dark: #1c5cad;
  --success-color: #19be6b;
  --warning-color: #ff9900;
  --error-color: #ed4014;
  --text-primary: #17233d;
  --text-regular: #515a6e;
  --text-secondary: #808695;
  --border-color: #dcdee2;
  --border-light: #e8eaec;
  --bg-color: #f8f8f9;
  --card-bg: #ffffff;
  --header-bg: #2b85e4;
  --card-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* 容器樣式 */
.app-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  background-image: 
    linear-gradient(135deg, rgba(43, 133, 228, 0.05) 0%, rgba(235, 245, 255, 0.7) 100%),
    radial-gradient(circle at 15% 85%, rgba(255, 153, 0, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 85% 15%, rgba(25, 190, 107, 0.05) 0%, transparent 50%);
  background-attachment: fixed;
  position: relative;
}

.app-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232b85e4' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}

/* 頂部標題欄 */
.app-header {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 10;
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
  display: flex;
  align-items: center;
}

.version {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-left: 8px;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
}

/* 主要內容區域 */
.main-content {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  background-color: rgba(248, 248, 249, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 1;
  overflow-x: hidden; /* 防止內容溢出導致版型變寬 */
}

/* 卡片樣式 */
.section-card {
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  border: none;
  overflow: hidden;
  transition: all 0.3s ease;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
}

.section-card:hover {
  box-shadow: 0 8px 24px rgba(43, 133, 228, 0.12);
  transform: translateY(-2px);
}

.section-card .el-card__header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  background: linear-gradient(to right, #fafafa, #f5f7fa);
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
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 日誌卡片特殊樣式 */
.log-card .el-card__body {
  padding: 0;
  height: auto;
  min-height: 300px;
  background: #1e1e1e;
}

/* 底部版權資訊 */
.app-footer {
  text-align: center;
  padding: 20px;
  color: #808695;
  font-size: 0.9rem;
  background-color: rgba(248, 249, 251, 0.8);
  backdrop-filter: blur(5px);
  border-top: 1px solid rgba(232, 234, 236, 0.5);
  margin-top: auto;
  position: relative;
  z-index: 1;
}

.app-footer p {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.app-footer p::before,
.app-footer p::after {
  content: "";
  display: block;
  height: 1px;
  width: 30px;
  background-color: #dcdee2;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }
  
  .header-content h1 {
    font-size: 1.2rem;
  }
  
  .section-card {
    margin-bottom: 16px;
  }
  
  .card-header h2 {
    font-size: 1rem;
  }
  
  .app-footer {
    padding: 16px;
    font-size: 0.8rem;
  }
}

@media (max-width: 576px) {
  .main-content {
    padding: 12px;
  }
  
  .section-card .el-card__header {
    padding: 12px 16px;
  }
  
  .section-card .el-card__body {
    padding: 12px;
  }
}

/* 统一按钮样式 */
:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

:deep(.el-button:hover:not(:disabled)) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:deep(.el-button:active) {
  transform: translateY(0);
}

:deep(.el-button .el-icon) {
  font-size: 16px;
}

/* 主要按钮样式 */
:deep(.el-button--primary) {
  background-color: var(--primary-color);
  border-color: transparent;
  height: 40px;
  padding: 0 16px;
}

:deep(.el-button--primary:hover:not(:disabled)) {
  background-color: var(--primary-light);
  box-shadow: 0 4px 12px rgba(43, 133, 228, 0.25);
}

/* 次要按钮样式 */
:deep(.el-button--default) {
  border-color: #dcdee2;
  color: var(--text-regular);
  height: 36px;
}

:deep(.el-button--default:hover:not(:disabled)) {
  border-color: var(--primary-light);
  color: var(--primary-color);
}

/* 信息按钮样式 */
:deep(.el-button--info) {
  background-color: #909399;
  border-color: transparent;
  color: #fff;
  height: 36px;
}

:deep(.el-button--info:hover:not(:disabled)) {
  background-color: #a6a9ad;
  box-shadow: 0 4px 12px rgba(144, 147, 153, 0.25);
}

/* 卡片头部按钮样式 */
.card-header .el-button {
  padding: 8px 14px;
  font-size: 14px;
}

/* 禁用状态样式 */
:deep(.el-button:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #f5f7fa;
  border-color: #e4e7ed;
  color: #c0c4cc;
}

:deep(.el-button--primary:disabled) {
  background-color: #a0cfff;
  border-color: transparent;
  color: #fff;
}
</style> 