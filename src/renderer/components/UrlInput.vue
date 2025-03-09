<template>
  <div class="url-input-container">
    <div class="input-header">
      <div class="input-title">Webtoon 網址</div>
      <div class="input-actions">
        <el-tooltip content="從剪貼簿貼上" placement="top">
          <el-button
            @click="pasteFromClipboard"
            type="primary"
            class="action-button"
            :disabled="loading"
            plain
          >
            <el-icon><DocumentCopy /></el-icon> 貼上
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="管理網址清單" placement="top">
          <el-button
            @click="showUrlHistory"
            type="primary"
            class="action-button"
            :disabled="loading"
            plain
          >
            <el-icon><Document /></el-icon> 管理
          </el-button>
        </el-tooltip>
      </div>
    </div>
    
    <div class="input-area">
      <!-- 使用說明 -->
      <div class="help-toggle-container">
        <el-button 
          link
          class="help-toggle-btn" 
          @click="toggleHelp"
        >
          <el-icon v-if="showHelp"><ArrowDown /></el-icon>
          <el-icon v-else><QuestionFilled /></el-icon>
          <span>{{ showHelp ? '隱藏說明' : '顯示說明' }}</span>
        </el-button>
      </div>
      
      <!-- 使用固定高度的容器包裹過渡元素 -->
      <div class="help-guide-container" :class="{ 'has-content': showHelp }">
        <transition name="fade">
          <url-help-guide v-if="showHelp" class="help-guide-margin" />
        </transition>
      </div>

      <!-- 從歷史記錄中選擇網址 -->
      <url-history-selector
        :history="urlHistory"
        :disabled="loading"
        :current-urls="currentUrls"
        @add-urls="handleAddUrls"
        @remove-url="handleRemoveUrl"
        @select-change="handleUrlSelect"
      />
      
      <el-input
        v-model="url"
        type="textarea"
        :rows="3"
        placeholder="請輸入網址，多個網址請換行分隔"
        clearable
        class="url-input"
        :disabled="loading"
      >
      </el-input>
    </div>
    
    <!-- 底部操作按鈕 -->
    <url-action-footer
      :url-count="getUrlCount()"
      :has-url="!!url"
      :loading="loading"
      @open-browser="openInBrowser"
      @submit="handleSubmit"
    />
    
    <!-- 錯誤消息 -->
    <url-error-message :message="error" />
    
    <!-- URL历史对话框 -->
    <url-history-dialog
      v-model="historyDialogVisible"
      :history="urlHistory"
      @update:history="updateUrlHistory"
      @open-url="openExternalUrl"
      @add-to-input="addUrlToInput"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentCopy, Document, ArrowDown, QuestionFilled } from '@element-plus/icons-vue'
import UrlHistoryDialog from './url-input/UrlHistoryDialog.vue'
import UrlHelpGuide from './url-input/UrlHelpGuide.vue'
import UrlHistorySelector from './url-input/UrlHistorySelector.vue'
import UrlActionFooter from './url-input/UrlActionFooter.vue'
import UrlErrorMessage from './url-input/UrlErrorMessage.vue'
import { isValidUrl, formatUrl, extractUrlsFromText } from '@/utils/urlUtils'

// 定義props
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  externalSavePath: {
    type: String,
    default: ''
  }
})

// 定義emit
const emit = defineEmits(['update:modelValue'])

// 定义接口
interface HistoryItem {
  url: string
  label: string
  error?: string
}

// 状态
const url = ref(props.modelValue)
const error = ref('')
const urlHistory = ref<HistoryItem[]>([])
const historyDialogVisible = ref(false)
const loading = ref(false)
const selectedUrls = ref<string[]>([])
const showHelp = ref(false) // 默認隱藏說明

// 計算當前文本框中的 URL 列表
const currentUrls = computed(() => {
  if (!url.value) return []
  return url.value.split('\n').filter(line => line.trim())
})

// 獲取URL數量
const getUrlCount = () => {
  return currentUrls.value.length
}

// 設置loading狀態的方法，供外部調用
const setLoading = (isLoading: boolean) => {
  loading.value = isLoading
}

// 暴露方法給父組件
defineExpose({
  setLoading
})

// 監聽url變化，更新modelValue
watch(url, (newValue) => {
  emit('update:modelValue', newValue)
})

// 監聽modelValue變化，更新url
watch(() => props.modelValue, (newValue) => {
  url.value = newValue
})

// 处理URL选择变化
const handleUrlSelect = (values: string[]) => {
  console.log('URL 選擇變化:', values)
  selectedUrls.value = values
}

// 處理添加 URL
const handleAddUrls = (newUrls: string[]) => {
  const urlsToAdd = newUrls.join('\n')
  const urlCount = newUrls.length
  
  // 如果输入框为空，直接设置
  if (!url.value) {
    url.value = urlsToAdd
  } else {
    // 否则添加到现有内容的新行
    url.value = `${url.value}\n${urlsToAdd}`
  }
  
  ElMessage.success(`已添加 ${urlCount} 個網址`)
}

// 處理移除 URL
const handleRemoveUrl = (urlToRemove: string) => {
  // 從文本框中移除該URL
  const lines = url.value.split('\n')
  const filteredLines = lines.filter(line => line.trim() !== urlToRemove)
  url.value = filteredLines.join('\n')
  
  ElMessage.success('已從輸入框中移除該網址')
}

// 从本地存储加载历史记录
const loadHistory = async () => {
  try {
    // 使用IPC從主進程加載歷史記錄
    const history = await window.electron.invoke('load-url-history')
    if (history && Array.isArray(history)) {
      urlHistory.value = history
    }
  } catch (e) {
    console.error('加載歷史記錄失敗', e)
  }
}

// 保存历史记录到本地存储
const saveHistory = () => {
  try {
    // 創建一個淺拷貝並移除可能導致序列化問題的屬性
    const historyToSave = urlHistory.value.map(item => ({
      url: item.url,
      label: item.label,
      // 不包含可能導致序列化問題的屬性，如editing、editLabel等
    }))
    
    // 使用IPC將歷史記錄保存到主進程
    window.electron.send('save-url-history', historyToSave)
  } catch (e) {
    console.error('保存歷史記錄失敗', e)
  }
}

// 更新URL历史
const updateUrlHistory = (newHistory: HistoryItem[]) => {
  urlHistory.value = newHistory
  saveHistory()
}

// 处理提交
const handleSubmit = async () => {
  if (!url.value) {
    error.value = '請輸入網址'
    return
  }
  
  if (currentUrls.value.length === 0) {
    error.value = '請輸入至少一個有效的網址'
    return
  }
  
  // 檢查每個URL是否有效
  const invalidUrls = currentUrls.value.filter(u => !isValidUrl(formatUrl(u)))
  if (invalidUrls.length > 0) {
    error.value = `存在無效的網址: ${invalidUrls.join(', ')}`
    return
  }
  
  error.value = ''
  
  try {
    // 使用invoke調用start-scraping方法，傳遞正確的參數格式，包括externalSavePath
    await window.electron.invoke('start-scraping', {
      urls: currentUrls.value,
      savePath: props.externalSavePath || null // 使用傳入的externalSavePath或默認保存路徑
    })
    ElMessage.success('已開始下載')
  } catch (error) {
    console.error('下載請求失敗:', error)
    ElMessage.error('下載請求失敗')
  }
}

// 从剪贴板粘贴
const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      // 提取剪贴板中的URL
      const clipboardUrls = extractUrlsFromText(text)
      
      if (clipboardUrls.length === 0) {
        ElMessage.warning('剪貼板中未找到有效網址')
        return
      }
      
      // 过滤掉已存在的URL
      const newUrls = clipboardUrls.filter((clipUrl: string) => !currentUrls.value.includes(clipUrl))
      
      if (newUrls.length === 0) {
        ElMessage.warning('剪貼板中的網址已存在於輸入框中')
        return
      }
      
      handleAddUrls(newUrls)
      error.value = ''
    }
  } catch (e) {
    ElMessage.error('無法讀取剪貼板內容')
  }
}

// 显示URL历史对话框
const showUrlHistory = () => {
  historyDialogVisible.value = true
}

// 在浏览器中打开URL
const openInBrowser = () => {
  if (!url.value) return
  
  // 獲取第一個非空URL
  const firstUrl = currentUrls.value[0]
  if (!firstUrl) {
    error.value = '請輸入有效的網址'
    return
  }
  
  const formattedUrl = formatUrl(firstUrl)
  
  if (isValidUrl(formattedUrl)) {
    openExternalUrl(formattedUrl)
    error.value = ''
  } else {
    error.value = '請輸入有效的網址'
  }
}

// 从历史记录中添加URL到输入框
const addUrlToInput = (urlToAdd: string) => {
  // 如果URL已存在，显示提示并返回
  if (currentUrls.value.includes(urlToAdd)) {
    ElMessage.warning('該網址已存在於輸入框中')
    return
  }
  
  handleAddUrls([urlToAdd])
}

// 在外部浏览器中打开URL
const openExternalUrl = (url: string) => {
  window.electron.send('open-external-url', url)
}

// 组件挂载时加载历史记录
onMounted(() => {
  loadHistory()
  
  // 加載用戶偏好設置
  try {
    const savedShowHelp = localStorage.getItem('webtoon-parser-show-help')
    if (savedShowHelp !== null) {
      showHelp.value = savedShowHelp === 'true'
    }
  } catch (e) {
    console.error('加載偏好設置失敗', e)
  }
  
  // 添加事件監聽器，用於接收主進程的消息
  window.electron.on('log-message', (message) => {
    console.log('來自主進程的消息:', message)
  })
})

// 組件卸載時清理事件監聽器
onUnmounted(() => {
  window.electron.removeAllListeners('log-message')
})

// 切換說明顯示狀態
const toggleHelp = () => {
  showHelp.value = !showHelp.value
  
  // 使用 nextTick 確保 DOM 更新後再進行過渡動畫
  nextTick(() => {
    // 可以在這裡添加額外的邏輯，例如滾動到特定位置
    if (showHelp.value) {
      // 當顯示說明時的邏輯
    } else {
      // 當隱藏說明時的邏輯
    }
  })
}

// 監聽 showHelp 變化，保存用戶偏好設置
watch(showHelp, (newValue) => {
  try {
    localStorage.setItem('webtoon-parser-show-help', newValue.toString())
  } catch (e) {
    console.error('保存偏好設置失敗', e)
  }
})
</script>

<style scoped>
/* 基础布局 */
.url-input-container {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 0;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  background-color: #fafafa;
}

.input-title {
  font-size: 16px;
  font-weight: 500;
  color: #17233d;
}

.input-actions {
  display: flex;
  gap: 8px;
}

.input-area {
  padding: 12px;
  background-color: #fff;
  box-sizing: border-box;
}

.help-toggle-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.help-toggle-btn {
  font-size: 13px;
  color: #606266;
  padding: 4px 8px;
  height: auto;
  display: flex;
  align-items: center;
  gap: 4px;
}

.help-toggle-btn:hover {
  color: #409EFF;
}

.url-input {
  width: 100%;
  box-sizing: border-box;
}

.help-guide-container {
  position: relative;
  min-height: 0;
  transition: min-height 0.5s ease-out;
  will-change: min-height;
  overflow: hidden;
}

.help-guide-container.has-content {
  min-height: 16px; /* 最小高度，防止完全收縮 */
}

/* 過渡動畫 */
.fade-enter-active {
  transition: opacity 0.4s ease 0.1s, max-height 0.5s ease;
  max-height: 600px;
  overflow: hidden;
  position: relative;
}

.fade-leave-active {
  transition: opacity 0.3s ease, max-height 0.5s ease 0.1s;
  max-height: 600px;
  overflow: hidden;
  position: relative;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  max-height: 0;
}

/* 响应式设计 */
@media (max-width: 576px) {
  .input-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .input-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .action-button {
    flex: 1;
  }
  
  .input-area {
    padding: 8px 6px;
  }
}

.help-guide-margin {
  margin-bottom: 16px;
}
</style>

<style>
/* 全局样式 */
.el-message {
  min-width: 300px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 12px 16px;
  border: none;
}

.el-message__content {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}

.el-message__icon {
  margin-right: 8px;
  font-size: 16px;
}

.el-message--success {
  background-color: #edfff3;
  border-left: 3px solid #19be6b;
}

.el-message--error {
  background-color: #ffece6;
  border-left: 3px solid #ed4014;
}

.el-message--warning {
  background-color: #fff9e6;
  border-left: 3px solid #ff9900;
}

.el-message--info {
  background-color: #f0f7ff;
  border-left: 3px solid #2b85e4;
}
</style>

<style>
/* 统一按钮样式 */
:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-color: transparent;
}

:deep(.el-button:hover:not(:disabled)) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

:deep(.el-button .el-icon) {
  font-size: 16px;
}

/* 主要按钮样式 */
:deep(.el-button--primary) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

:deep(.url-select .el-select-dropdown__item) {
  padding: 8px 12px;
  border-radius: 4px;
  margin: 0 4px;
  transition: all 0.2s;
}

:deep(.url-select .el-select-dropdown__item:hover) {
  background-color: #f0f7ff;
}

:deep(.url-select .el-select-dropdown__item.selected) {
  background-color: #eef6ff;
  color: #2b85e4;
  font-weight: 600;
}

:deep(.url-select .el-input__wrapper) {
  border-radius: 6px;
  padding: 2px 10px;
  box-shadow: 0 0 0 1px #dcdee2 inset;
  transition: all 0.2s;
}

:deep(.url-select .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #5cadff inset;
}

:deep(.url-select .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #2b85e4 inset, 0 0 0 2px rgba(43, 133, 228, 0.1);
}

:deep(.url-select .el-select__tags) {
  flex-wrap: nowrap;
  overflow-x: auto;
  max-width: 100%;
  padding-right: 30px;
  scrollbar-width: thin;
}

:deep(.url-select .el-select__tags-text) {
  display: inline-block;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}
</style> 