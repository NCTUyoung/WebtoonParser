<template>
  <div class="app-container">
    <el-config-provider :locale="zhTw">
      <el-container>
        <el-header height="60px">
          <div class="header-content">
            <h1>{{ title }} v{{ version }}</h1>
          </div>
        </el-header>
        
        <el-main>
          <url-input 
            ref="urlInputRef"
            v-model="urls"
            @start-scraping="startScraping"
          />
          
          <schedule-settings
            v-model:schedule="scheduleSettings"
            :is-running="isScheduleRunning"
            @toggle-schedule="toggleSchedule"
          />
          
          <log-viewer 
            ref="logViewerRef"
            :logs="logs"
            @clear-logs="clearLogs"
          />
        </el-main>
        
        <el-footer height="40px">
          <div class="footer-content">
            <span>© {{ new Date().getFullYear() }} Webtoon爬蟲工具</span>
          </div>
        </el-footer>
      </el-container>
    </el-config-provider>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import { ipcRenderer, IpcRendererEvent } from 'electron'
import UrlInput from './components/UrlInput.vue'
import ScheduleSettings from './components/ScheduleSettings.vue'
import LogViewer from './components/LogViewer.vue'
import type { LogMessage } from './types'

// 環境變量
const title = import.meta.env.VITE_APP_TITLE
const version = import.meta.env.VITE_APP_VERSION

// 組件引用
const urlInputRef = ref()
const logViewerRef = ref()

// 狀態管理
const urls = ref('')
const logs = ref<LogMessage[]>([])
const isScheduleRunning = ref(false)

// 定時設置
const scheduleSettings = reactive({
  day: '五',
  hour: '18',
  minute: '00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
})

// 開始爬取
const startScraping = async () => {
  if (!urls.value) {
    ElMessage.warning('請輸入至少一個URL')
    return
  }
  
  const urlList = urls.value.split('\n').filter(url => url.trim())
  ipcRenderer.send('start-scraping', urlList)
  urlInputRef.value?.setLoading(true)
}

// 切換定時任務
const toggleSchedule = () => {
  if (!isScheduleRunning.value) {
    if (!urls.value.trim()) {
      ElMessage.warning('請先輸入要爬取的URL')
      return
    }
    
    ipcRenderer.send('start-schedule', scheduleSettings)
    isScheduleRunning.value = true
  } else {
    ipcRenderer.send('stop-schedule')
    isScheduleRunning.value = false
  }
}

// 清空日誌
const clearLogs = () => {
  logs.value = []
}

// 監聽主進程消息
onMounted(() => {
  ipcRenderer.on('log-message', (_: IpcRendererEvent, message: string) => {
    logs.value.push({
      time: new Date().toLocaleTimeString(),
      message
    })
  })
  
  ipcRenderer.on('scraping-complete', (_: IpcRendererEvent) => {
    urlInputRef.value?.setLoading(false)
    ElMessage.success('爬取完成')
  })
  
  ipcRenderer.on('scraping-error', (_: IpcRendererEvent, error: string) => {
    urlInputRef.value?.setLoading(false)
    ElMessage.error(error)
  })
  
  ipcRenderer.on('schedule-trigger', (_: IpcRendererEvent) => startScraping())
})

onUnmounted(() => {
  ipcRenderer.removeAllListeners('log-message')
  ipcRenderer.removeAllListeners('scraping-complete')
  ipcRenderer.removeAllListeners('scraping-error')
  ipcRenderer.removeAllListeners('schedule-trigger')
})
</script>

<style lang="scss">
@use '@/styles/variables.scss' as *;

.app-container {
  min-height: 100vh;
  
  .el-container {
    min-height: 100vh;
  }
  
  .el-header {
    background-color: $primary-color;
    color: white;
    padding: 0 $spacing-large;
    
    .header-content {
      height: 100%;
      display: flex;
      align-items: center;
      
      h1 {
        margin: 0;
        font-size: 20px;
      }
    }
  }
  
  .el-main {
    padding: $spacing-large * 2;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }
  
  .el-footer {
    background-color: $background-color-base;
    border-top: 1px solid $border-color-light;
    
    .footer-content {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: $text-secondary;
      font-size: $font-size-small;
    }
  }
}
</style> 