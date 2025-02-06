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
const urlInputRef = ref()
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

// 開始爬取
const startScraping = async () => {
  console.log('startScraping 觸發');
  console.log('urls.value:', urls.value);
  if (!urls.value) {
    ElMessage.warning('請輸入至少一個URL')
    return
  }
  
  const urlList = urls.value.split('\n').filter(url => url.trim())
  await window.electron.invoke('start-scraping', urlList)
  urlInputRef.value?.setLoading(true)
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