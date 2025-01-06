<template>
  <div class="url-input-container">
    <el-card class="url-card">
      <template #header>
        <div class="card-header">
          <span class="header-title">
            <i class="el-icon-link"></i>
            Webtoon 網址
          </span>
          <el-button 
            type="primary" 
            :icon="isLoading ? 'el-icon-loading' : 'el-icon-download'"
            :loading="isLoading"
            @click="handleStartScraping"
          >
            立即爬取
          </el-button>
        </div>
      </template>
      
      <el-input
        v-model="inputUrls"
        type="textarea"
        :rows="4"
        :maxlength="500"
        show-word-limit
        placeholder="請輸入Webtoon URL，每行一個"
        :disabled="isLoading"
      />
      
      <div class="url-tips">
        <el-alert
          type="info"
          :closable="false"
          show-icon
        >
          範例: https://www.webtoons.com/zh-hant/bl-gl/friday-night/list?title_no=6875
        </el-alert>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ipcRenderer } from 'electron'

const inputUrls = ref('')
const isLoading = ref(false)

// 加載保存的 URLs
onMounted(async () => {
  try {
    const savedUrls = await ipcRenderer.invoke('load-urls')
    if (savedUrls) {
      inputUrls.value = savedUrls
    }
  } catch (error) {
    console.error('加載保存的 URLs 失敗:', error)
  }
})

const handleStartScraping = async () => {
  if (!inputUrls.value.trim()) {
    ElMessage.warning('請輸入至少一個URL')
    return
  }
  
  try {
    isLoading.value = true
    // 分割多個 URL
    const urls = inputUrls.value.split('\n').map(u => u.trim()).filter(u => u)
    
    // 移除之前的監聽器
    ipcRenderer.removeAllListeners('scraping-complete')
    ipcRenderer.removeAllListeners('scraping-error')
    ipcRenderer.removeAllListeners('log-message')
    
    // 監聽日誌消息
    ipcRenderer.on('log-message', (event, message) => {
      console.log(message)
    })
    
    // 發送爬取請求
    ipcRenderer.send('start-scraping', urls)
    
    // 監聽完成事件
    ipcRenderer.on('scraping-complete', () => {
      ElMessage.success(`完成爬取 ${urls.length} 個作品`)
      isLoading.value = false
      // 清理監聽器
      ipcRenderer.removeAllListeners('scraping-complete')
      ipcRenderer.removeAllListeners('scraping-error')
      ipcRenderer.removeAllListeners('log-message')
    })
    
    // 監聽錯誤事件
    ipcRenderer.on('scraping-error', (event, error) => {
      console.error('爬取錯誤:', error)
      ElMessage.error(`爬取失敗: ${error}`)
      isLoading.value = false
      // 清理監聽器
      ipcRenderer.removeAllListeners('scraping-complete')
      ipcRenderer.removeAllListeners('scraping-error')
      ipcRenderer.removeAllListeners('log-message')
    })
  } catch (error) {
    console.error('爬取錯誤:', error)
    ElMessage.error(`爬取失敗: ${error.message}`)
    isLoading.value = false
  }
}

// 提供給父組件的方法
defineExpose({
  setLoading: (loading) => {
    isLoading.value = loading
  }
})
</script>

<style scoped>
.url-input-container {
  margin-bottom: 20px;
}

.url-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title i {
  font-size: 18px;
  color: #409EFF;
}

.url-tips {
  margin-top: 8px;
}

:deep(.el-textarea__inner) {
  font-family: monospace;
  line-height: 1.6;
}

:deep(.el-alert) {
  margin: 0;
}
</style> 