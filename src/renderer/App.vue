<template>
  <el-config-provider :locale="zhTw">
    <el-container class="app-container">
      <!-- Header bar -->
      <el-header class="app-header">
        <div class="header-content">
          <h1>Webtoon爬蟲工具 <span class="version">v{{ version }}</span></h1>
        </div>
      </el-header>

      <el-main class="main-content">
        <!-- URL input area -->
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

        <!-- Schedule settings area -->
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

        <!-- Save settings area -->
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

        <!-- Log viewer area -->
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

      <!-- Footer with copyright info -->
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

// Environment variables
const title = import.meta.env.VITE_APP_TITLE
const version = import.meta.env.VITE_APP_VERSION

// Component references
const urlInputRef = ref<InstanceType<any> | null>(null)
const logViewerRef = ref()

// State management
const urls = ref('')
const logs = ref<LogMessage[]>([])
const isScheduleRunning = ref(false)
const nextRunTime = ref('')

// Convert scheduleSettings to ref for proper v-model updates in child components
const scheduleSettings = ref({
  scheduleType: 'weekly',
  day: '五',
  hour: '18',
  minute: '00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
})

// Save path
const savePath = ref('')
const appendMode = ref(true)

// Add debug logs
console.log('init savePath:', savePath.value)

// Start scraping function, using invoke to correspond with ipcMain.handle in main process
const startScraping = async (forceAppend = false) => {
  console.log('startScraping triggered')
  console.log('urls.value:', urls.value)
  console.log('append mode:', forceAppend || appendMode.value)

  if (!urls.value) {
    ElMessage.warning('請輸入至少一個 URL')
    return
  }

  // Split input URLs into array
  const urlList = urls.value.split('\n').filter(url => url.trim())

  // Show loading state immediately before scraping
  urlInputRef.value?.setLoading(true)

  try {
    // Execute invoke, success means scraping has started
    const result = await window.electron.invoke('start-scraping', {
      urls: urlList,
      savePath: savePath.value,
      append: forceAppend || appendMode.value
    })
    
    // Check result, if successful show success message and stop loading state
    if (result && result.success) {
      console.log('Scraping successful, result:', result)
      urlInputRef.value?.setLoading(false)
      ElMessage.success('爬取完成')
    }
  } catch (error: any) {
    console.error('Scraping error:', error)
    // Stop loading state and show error message when error occurs
    urlInputRef.value?.setLoading(false)
    ElMessage.error(`爬取發生錯誤：${error.message}`)
  }
}

// Toggle scheduled task, note using scheduleSettings.value
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

// Clear logs
const clearLogs = () => {
  logs.value = []
}

// Store URLs
const saveUrls = () => {
  window.electron.send('save-urls', urls.value)
}

// Store schedule settings
const saveScheduleSettings = () => {
  window.electron.send('save-schedule-settings', { ...scheduleSettings.value })
}

// Watch for save path changes
watch(savePath, (newValue, oldValue) => {
  // Only save when value actually changes
  if (newValue !== oldValue) {
    console.log('Save path changed:', { newValue, oldValue })
    saveSavePath()
  }
})

// Modified saveSavePath function
const saveSavePath = () => {
  console.log('Saving path:', savePath.value)
  window.electron.send('save-save-path', savePath.value)
}

// Load previously saved URLs and schedule settings on startup
onMounted(async () => {
  try {
    // Load saved URLs
    urls.value = await window.electron.invoke('load-urls')
    
    // Load saved schedule settings
    const savedSettings = await window.electron.invoke('load-schedule-settings')
    scheduleSettings.value = savedSettings
    
    // Load saved save path
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
    console.log('Received scraping-complete event')
    urlInputRef.value?.setLoading(false)
    ElMessage.success('爬取完成')
  })
  
  window.electron.on('scraping-error', (error: string) => {
    urlInputRef.value?.setLoading(false)
    ElMessage.error(error)
  })
  
  window.electron.on('schedule-trigger', () => {
    console.log('Received schedule-trigger event');
    // Check if urls still exists
    console.log('urls.value:', urls.value);
    // Scheduled task uses appendMode value, if false then force to true
    console.log('Scheduled task append mode:', appendMode.value ? 'enabled' : 'forced enabled');
    startScraping(true); // Scheduled tasks always use append mode
  })
  
  // Listen for next run time updates
  window.electron.on('next-run-time', (time: string) => {
    nextRunTime.value = time
  })

  // Save all settings before application closes
  window.addEventListener('beforeunload', () => {
    saveUrls()
    saveScheduleSettings()
    saveSavePath()
  })
})

// Watch for schedule settings changes
watch(scheduleSettings, () => {
  saveScheduleSettings()
}, { deep: true })

// Clean up event listeners
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
/* Global styles */
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

/* Container styles */
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

/* Header bar */
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

/* Main content area */
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
  overflow-x: hidden; /* Prevent content overflow causing layout to widen */
}

/* Card styles */
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

/* Log card special styles */
.log-card .el-card__body {
  padding: 0;
  height: auto;
  min-height: 300px;
  background: #1e1e1e;
}

/* Footer with copyright info */
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

/* Responsive design */
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

/* Unified button styles */
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

/* Primary button styles */
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

/* Default button styles */
:deep(.el-button--default) {
  border-color: #dcdee2;
  color: var(--text-regular);
  height: 36px;
}

:deep(.el-button--default:hover:not(:disabled)) {
  border-color: var(--primary-light);
  color: var(--primary-color);
}

/* Info button styles */
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

/* Card header button styles */
.card-header .el-button {
  padding: 8px 14px;
  font-size: 14px;
}

/* Disabled state styles */
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