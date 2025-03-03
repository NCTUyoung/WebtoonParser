<template>
  <div class="url-input-container">
    <div class="input-header">
      <div class="input-title">輸入網址</div>
      <div class="input-actions">
        <el-tooltip content="從剪貼簿貼上" placement="top">
          <el-button
            @click="pasteFromClipboard"
            type="primary"
            class="action-button"
            :disabled="loading"
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
          >
            <el-icon><Document /></el-icon> 管理
          </el-button>
        </el-tooltip>
      </div>
    </div>
    
    <div class="input-area">
      <!-- 從歷史記錄中選擇網址 -->
      <div class="url-select-area">
        <el-select
          v-model="selectedUrls"
          multiple
          filterable
          placeholder="從歷史記錄中選擇網址..."
          class="url-select"
          :disabled="loading"
          @change="handleUrlSelect"
        >
          <el-option
            v-for="item in urlHistory"
            :key="item.url"
            :label="item.label || item.url"
            :value="item.url"
          >
            <div class="url-option">
              <span class="url-option-label">{{ item.label || '未命名' }}</span>
              <span class="url-option-url">{{ item.url }}</span>
            </div>
          </el-option>
        </el-select>
        
        <el-button
          v-if="selectedUrls.length > 0"
          @click="addSelectedUrls"
          type="primary"
          class="add-selected-btn"
          :disabled="loading"
        >
          <el-icon><Plus /></el-icon> 添加選中網址
        </el-button>
      </div>
      
      <el-input
        v-model="url"
        type="textarea"
        :rows="4"
        placeholder="請輸入網址，多個網址請換行分隔"
        clearable
        class="url-input"
        :disabled="loading"
      >
      </el-input>
    </div>
    
    <div class="input-footer">
      <div class="url-count" v-if="url">
        已輸入 {{ getUrlCount() }} 個網址
      </div>
      <div class="action-buttons">
        <el-tooltip content="在瀏覽器中打開" placement="top" v-if="url">
          <el-button
            @click="openInBrowser"
            class="open-button"
            :disabled="!url || loading"
          >
            <el-icon><Link /></el-icon> 在瀏覽器中打開
          </el-button>
        </el-tooltip>
        
        <el-button 
          @click="handleSubmit" 
          :disabled="!url || loading" 
          class="submit-btn" 
          :loading="loading"
          type="primary"
        >
          <el-icon><Download /></el-icon> 開始下載
        </el-button>
      </div>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
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
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Link, Download, DocumentCopy, Document, Plus } from '@element-plus/icons-vue'
import UrlHistoryDialog from './url-input/UrlHistoryDialog.vue'
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

// 獲取URL數量
const getUrlCount = () => {
  if (!url.value) return 0
  return url.value.split('\n').filter(line => line.trim()).length
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
  selectedUrls.value = values
}

// 添加选中的URL到输入框
const addSelectedUrls = () => {
  if (selectedUrls.value.length === 0) return
  
  // 获取当前输入框中的URL
  const existingUrls = url.value ? url.value.split('\n').filter(line => line.trim()) : []
  
  // 过滤掉已存在的URL
  const newUrls = selectedUrls.value.filter(url => !existingUrls.includes(url))
  
  if (newUrls.length === 0) {
    ElMessage.warning('所選網址已存在於輸入框中')
    selectedUrls.value = []
    return
  }
  
  const urlsToAdd = newUrls.join('\n')
  const urlCount = newUrls.length
  
  // 如果输入框为空，直接设置
  if (!url.value) {
    url.value = urlsToAdd
  } else {
    // 否则添加到现有内容的新行
    url.value = `${url.value}\n${urlsToAdd}`
  }
  
  // 清空选择
  selectedUrls.value = []
  ElMessage.success(`已添加 ${urlCount} 個網址`)
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
  
  // 將輸入的URL拆分為數組並過濾空行
  const urlList = url.value.split('\n').filter(line => line.trim())
  
  if (urlList.length === 0) {
    error.value = '請輸入至少一個有效的網址'
    return
  }
  
  // 檢查每個URL是否有效
  const invalidUrls = urlList.filter(u => !isValidUrl(formatUrl(u)))
  if (invalidUrls.length > 0) {
    error.value = `存在無效的網址: ${invalidUrls.join(', ')}`
    return
  }
  
  error.value = ''
  
  try {
    // 使用invoke調用start-scraping方法，傳遞正確的參數格式，包括externalSavePath
    await window.electron.invoke('start-scraping', {
      urls: urlList,
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
      
      // 获取当前输入框中的URL
      const existingUrls = url.value ? url.value.split('\n').filter(line => line.trim()) : []
      
      // 过滤掉已存在的URL
      const newUrls = clipboardUrls.filter((clipUrl: string) => !existingUrls.includes(clipUrl))
      
      if (newUrls.length === 0) {
        ElMessage.warning('剪貼板中的網址已存在於輸入框中')
        return
      }
      
      const urlsToAdd = newUrls.join('\n')
      
      // 如果當前輸入框為空，直接設置
      if (!url.value) {
        url.value = urlsToAdd
      } else {
        // 否則添加到現有內容的新行
        url.value = `${url.value}\n${urlsToAdd}`
      }
      
      ElMessage.success(`已從剪貼板添加 ${newUrls.length} 個網址`)
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
  const firstUrl = url.value.split('\n').find(line => line.trim())
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
  // 检查URL是否已存在于输入框中
  const existingUrls = url.value ? url.value.split('\n').filter(line => line.trim()) : []
  
  // 如果URL已存在，显示提示并返回
  if (existingUrls.includes(urlToAdd)) {
    ElMessage.warning('該網址已存在於輸入框中')
    return
  }
  
  // 如果输入框为空，直接设置
  if (!url.value) {
    url.value = urlToAdd
  } else {
    // 否则添加到现有内容的新行
    url.value = `${url.value}\n${urlToAdd}`
  }
  
  ElMessage.success('已添加到輸入框')
}

// 在外部浏览器中打开URL
const openExternalUrl = (url: string) => {
  window.electron.send('open-external-url', url)
}

// 组件挂载时加载历史记录
onMounted(() => {
  loadHistory()
  
  // 添加事件監聽器，用於接收主進程的消息
  window.electron.on('log-message', (message) => {
    console.log('來自主進程的消息:', message)
  })
})

// 組件卸載時清理事件監聽器
onUnmounted(() => {
  window.electron.removeAllListeners('log-message')
})
</script>

<style scoped>
/* 基础布局 */
.url-input-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
}

.input-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.input-actions {
  display: flex;
  gap: 8px;
}

.input-area {
  padding: 16px;
}

/* URL選擇區域 */
.url-select-area {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: flex-start;
}

.url-select {
  flex: 1;
}

.url-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.url-option-label {
  font-weight: 500;
  color: #303133;
}

.url-option-url {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-selected-btn {
  white-space: nowrap;
}

.url-input {
  width: 100%;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #ebeef5;
}

.url-count {
  font-size: 14px;
  color: #606266;
}

.action-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.submit-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px;
  font-weight: 500;
  height: 40px;
}

.open-button {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 输入框样式 */
:deep(.url-input .el-textarea__inner) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  transition: all 0.3s ease;
  min-height: 120px;
  resize: vertical;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
}

:deep(.url-input .el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px #a0cfff inset;
}

:deep(.url-input .el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #409eff inset, 0 0 0 3px rgba(64, 158, 255, 0.1);
}

/* Select 選擇器樣式 */
:deep(.url-select .el-select__wrapper) {
  width: 100%;
}

:deep(.url-select .el-select__tags) {
  flex-wrap: nowrap;
  overflow-x: auto;
  max-width: 100%;
  padding-right: 30px;
}

:deep(.url-select .el-select__tags-text) {
  display: inline-block;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 操作按钮样式 */
.action-button {
  transition: all 0.3s ease;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* 错误消息样式 */
.error-message {
  color: #f56c6c;
  font-size: 14px;
  margin-top: 8px;
  padding: 8px 16px;
  background-color: #fef0f0;
  border-radius: 4px;
  border-left: 3px solid #f56c6c;
}
</style>

<style>
/* 全局样式 */
.el-message {
  min-width: 300px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.el-message__content {
  font-size: 14px;
  font-weight: 500;
}

.el-message--success {
  background-color: #f0f9eb;
  border-color: #e1f3d8;
}

.el-message--error {
  background-color: #fef0f0;
  border-color: #fde2e2;
}

.el-message--warning {
  background-color: #fdf6ec;
  border-color: #faecd8;
}

.el-message--info {
  background-color: #edf2fc;
  border-color: #ebeef5;
}
</style> 