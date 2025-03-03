<template>
  <div class="url-input-container">
    <div class="history-header">
      <el-button
        type="primary"
        style="min-width: 90px"
        @click="showHistoryDialog = true"
      >
        <el-icon class="mr-1"><List /></el-icon>管理清單
      </el-button>
    </div>

    <!-- URL 輸入區 -->
    <div class="input-area">
      <el-select
        v-model="selectedHistory"
        multiple
        filterable
        collapse-tags
        collapse-tags-tooltip
        placeholder="從清單中選擇網址"
        class="history-select"
        @change="handleHistoryChange"
      >
        <el-option
          v-for="item in urlHistoryWithLabels"
          :key="item.url"
          :label="item.label || item.url"
          :value="item.url"
        >
          <div class="url-option">
            <div class="url-option-label">{{ item.label || '未命名' }}</div>
            <div class="url-option-url">{{ item.url }}</div>
          </div>
        </el-option>
      </el-select>

      <el-input
        v-model="inputValue"
        type="textarea"
        :rows="5"
        :maxlength="500"
        :show-word-limit="true"
        placeholder="輸入或貼上網址，每行一個"
        :disabled="loading"
      />
    </div>
    
    <div class="url-example" v-if="showExample">
      <el-alert type="info" :closable="false">
      <el-alert type="info" :closable="false">
        <template #default>
          <el-icon class="mr-1"><InfoFilled /></el-icon>
          範例: https://www.webtoons.com/zh-hant/bl-gl/friday-night/list?title_no=6875
        </template>
      </el-alert>
    </div>

    <!-- 清單管理對話框 -->
    <el-dialog
      v-model="showHistoryDialog"
      title="管理網址清單"
      width="80%"
      :close-on-click-modal="false"
      destroy-on-close
      top="5vh"
      class="url-history-dialog"
      :show-close="false"
    >
      <template #header>
        <div class="dialog-custom-header">
          <h3><el-icon><List /></el-icon> 管理網址清單</h3>
          <el-tooltip content="關閉" placement="top">
            <el-button
              @click="showHistoryDialog = false"
              circle
              plain
              class="close-button"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </template>
      
      <div class="dialog-header">
        <div class="search-container">
          <el-input
            v-model="searchKeyword"
            placeholder="搜尋清單..."
            class="search-input"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-tag type="info" class="ml-2" v-if="searchKeyword">
            找到 {{ filteredHistory.length }} 項結果
          </el-tag>
        </div>
        <div class="action-buttons">
          <el-button @click="importFromClipboard" type="success" class="custom-btn success-btn">
            <el-icon><Document /></el-icon> 從剪貼簿匯入
          </el-button>
          <el-button @click="addHistoryItem" type="primary" class="custom-btn primary-btn">
            <el-icon><Plus /></el-icon> 新增網址
          </el-button>
        </div>
      </div>

      <el-table
        :data="filteredHistory"
        style="width: 100%"
        border
        stripe
        highlight-current-row
        :max-height="tableMaxHeight"
        v-loading="tableLoading"
      >
        <el-table-column label="標籤名稱" width="220">
          <template #default="{ row }">
            <el-input
              v-model="row.label"
              placeholder="輸入標籤名稱"
              clearable
              @change="autoSaveDebounced"
              class="custom-input"
            >
              <template #prefix v-if="!row.label">
                <el-icon class="text-gray-400"><Edit /></el-icon>
              </template>
            </el-input>
          </template>
        </el-table-column>
        <el-table-column label="網址">
          <template #default="{ row }">
            <el-input
              v-model="row.url"
              placeholder="輸入網址"
              clearable
              @change="validateUrl(row)"
              class="custom-input"
            >
              <template #append>
                <el-tooltip content="在新視窗開啟" placement="top" v-if="isValidUrl(row.url)">
                  <el-button @click="openUrl(row.url)" class="open-url-btn">
                    <el-icon><Link /></el-icon>
                  </el-button>
                </el-tooltip>
              </template>
            </el-input>
            <div class="url-error" v-if="row.error">{{ row.error }}</div>
          </template>
        </el-table-column>
        <el-table-column width="150" align="center" label="操作">
          <template #default="{ row, $index }">
            <div class="action-buttons-cell">
              <el-tooltip content="自動生成標籤" placement="top">
                <el-button
                  type="primary"
                  size="small"
                  circle
                  @click="generateLabel(row)"
                  :disabled="!isValidUrl(row.url)"
                  class="generate-label-btn action-btn"
                >
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="刪除" placement="top">
                <el-button
                  type="danger"
                  size="small"
                  circle
                  @click="confirmRemove($index)"
                  class="delete-btn action-btn"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="empty-placeholder" v-if="filteredHistory.length === 0">
        <el-empty description="沒有找到網址" :image-size="100">
          <template #description>
            <p>{{ searchKeyword ? '沒有符合搜尋條件的網址' : '清單中沒有網址' }}</p>
          </template>
          <el-button type="primary" @click="addHistoryItem">新增網址</el-button>
        </el-empty>
      </div>

      <div class="dialog-footer">
        <div class="footer-left">
          <span class="item-count">共 {{ editableHistory.length }} 項</span>
          <el-tag 
            type="success" 
            v-if="autoSaveStatus === 'saved'"
            class="ml-2"
          >
            <el-icon><Check /></el-icon> 已自動保存
          </el-tag>
          <el-tag 
            type="warning" 
            v-if="autoSaveStatus === 'saving'"
            class="ml-2"
          >
            <el-icon class="is-loading"><Loading /></el-icon> 保存中...
          </el-tag>
        </div>
        <div class="footer-right">
          <el-button @click="showHistoryDialog = false" class="custom-btn">關閉</el-button>
          <el-button type="primary" @click="saveHistory" class="custom-btn primary-btn">
            <el-icon><Check /></el-icon> 確認並保存
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 確認刪除對話框 -->
    <el-dialog
      v-model="showDeleteConfirm"
      title="確認刪除"
      width="400px"
      :append-to-body="true"
      destroy-on-close
      :show-close="false"
      class="url-history-dialog delete-confirm-dialog"
    >
      <template #header>
        <div class="dialog-custom-header">
          <h3><el-icon><Warning /></el-icon> 確認刪除</h3>
          <el-tooltip content="關閉" placement="top">
            <el-button
              @click="showDeleteConfirm = false"
              circle
              plain
              class="close-button"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </template>
      
      <div class="delete-confirm-content">
        <el-icon class="warning-icon"><Warning /></el-icon>
        <p>確定要刪除這個網址嗎？</p>
        <div v-if="itemToDelete !== null && editableHistory[itemToDelete]" class="delete-item-container">
          <div class="delete-item-info">
            <strong>{{ editableHistory[itemToDelete].label || '未命名' }}</strong>
            <div class="delete-item-url">{{ editableHistory[itemToDelete].url }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showDeleteConfirm = false" class="custom-btn">取消</el-button>
          <el-button type="danger" @click="confirmDeleteItem" class="custom-btn danger-btn">
            <el-icon><Delete /></el-icon> 確認刪除
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, 
  Delete, 
  Search, 
  List, 
  InfoFilled, 
  Close, 
  Link, 
  Edit, 
  Refresh, 
  Check, 
  Loading, 
  Warning, 
  Document 
} from '@element-plus/icons-vue'
import { debounce } from 'lodash-es'

interface HistoryItem {
  url: string
  label: string
  error?: string
}

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const inputValue = ref(props.modelValue)
const loading = ref(false)
const showExample = ref(true)
const urlHistory = ref<HistoryItem[]>([])
const selectedHistory = ref<string[]>([])
const showHistoryDialog = ref(false)
const editableHistory = ref<HistoryItem[]>([])
const searchKeyword = ref('')
const tableLoading = ref(false)
const tableMaxHeight = ref('50vh')
const showDeleteConfirm = ref(false)
const itemToDelete = ref<number | null>(null)
const autoSaveStatus = ref<'idle' | 'saving' | 'saved'>('idle')

const urlHistoryWithLabels = computed(() => {
  return urlHistory.value.map(item => ({
    url: item.url,
    label: item.label || item.url
  }))
})

// 從URL中提取顯示名稱的輔助函數
const getDisplayName = (url: string): string => {
  try {
    // 嘗試從URL中提取有意義的部分作為顯示名稱
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    
    // 如果是漫畫網站的URL
    if (url.includes('webtoons.com')) {
      // 提取標題編號
      if (urlObj.searchParams.has('title_no')) {
        const titleNo = urlObj.searchParams.get('title_no')
        
        // 嘗試提取漫畫類別和名稱
        let category = ''
        let title = ''
        
        // 從路徑中提取類別和標題
        if (pathParts.length >= 2) {
          category = pathParts[1] || '' // 通常是 bl-gl, fantasy 等類別
          title = pathParts[2] || ''    // 通常是漫畫名稱
        }
        
        if (title) {
          return `${title} (${category})`
        } else if (category) {
          return `${category} (${titleNo})`
        } else {
          return `Webtoon #${titleNo}`
        }
      }
    }
    
    // 一般情況下返回主機名+最後一個路徑部分
    const hostname = urlObj.hostname.replace('www.', '')
    const lastPath = pathParts[pathParts.length - 1] || ''
    
    if (lastPath && lastPath !== 'list') {
      return `${hostname}/${lastPath}`
    } else {
      return hostname
    }
  } catch (e) {
    // 如果URL解析失敗，返回原始URL的一部分
    return url.substring(0, 30) + (url.length > 30 ? '...' : '')
  }
}

onMounted(async () => {
  await loadHistoryData()
})

const loadHistoryData = async () => {
  tableLoading.value = true
  try {
    const history = await window.electron.invoke('load-url-history')
    
    // 處理舊格式的歷史記錄（純字符串數組）
    if (Array.isArray(history)) {
      if (history.length > 0 && typeof history[0] === 'string') {
        // 舊格式：字符串數組，為每個URL生成預設標籤
        urlHistory.value = history.map(url => ({ 
          url, 
          label: getDisplayName(url) // 自動生成標籤
        }))
      } else {
        // 新格式：對象數組
        urlHistory.value = history || []
      }
    } else {
      urlHistory.value = []
    }
    
    // 確保所有項目都有標籤
    urlHistory.value = urlHistory.value.map(item => ({
      url: item.url,
      label: item.label || getDisplayName(item.url)
    }))
    
    editableHistory.value = JSON.parse(JSON.stringify(urlHistory.value))
  } catch (error) {
    console.error('載入歷史記錄時發生錯誤：', error)
    ElMessage.error('載入清單失敗，請稍後再試')
  } finally {
    tableLoading.value = false
  }
}

const handleHistoryChange = (values: string[]) => {
  selectedHistory.value = values
  inputValue.value = values.join('\n')
}

const addHistoryItem = () => {
  const newItem = { url: '', label: '' }
  editableHistory.value.push(newItem)
  
  // 滾動到底部
  nextTick(() => {
    const container = document.querySelector('.el-dialog__body')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
    
    // 聚焦到新添加的URL輸入框
    const inputs = document.querySelectorAll('.el-table__body .el-input__inner')
    const lastInput = inputs[inputs.length - 2] as HTMLInputElement
    if (lastInput) {
      lastInput.focus()
    }
  })
}

const confirmRemove = (index: number) => {
  itemToDelete.value = index
  showDeleteConfirm.value = true
}

const confirmDeleteItem = () => {
  if (itemToDelete.value !== null) {
    removeHistoryItem(itemToDelete.value)
    showDeleteConfirm.value = false
    itemToDelete.value = null
    autoSaveDebounced()
  }
}

const removeHistoryItem = (index: number) => {
  editableHistory.value.splice(index, 1)
}

const saveHistory = () => {
  try {
    tableLoading.value = true
    
    const newHistory = editableHistory.value
      .filter(item => item.url?.trim())
      .map(item => ({
        url: item.url.trim(),
        label: item.label?.trim() || ''
      }))
      // 確保URL唯一性
      .filter((item, index, self) => 
        self.findIndex(t => t.url === item.url) === index
      )
    
    urlHistory.value = newHistory
    editableHistory.value = JSON.parse(JSON.stringify(newHistory))
    
    window.electron.send('save-url-history', newHistory)
    showHistoryDialog.value = false
    ElMessage.success('清單已保存')
  } catch (error) {
    console.error('保存歷史記錄時發生錯誤：', error)
    ElMessage.error('保存失敗，請稍後再試')
  } finally {
    tableLoading.value = false
  }
}

// 自動保存功能
const autoSave = async () => {
  try {
    autoSaveStatus.value = 'saving'
    
    const newHistory = editableHistory.value
      .filter(item => item.url?.trim())
      .map(item => ({
        url: item.url.trim(),
        label: item.label?.trim() || ''
      }))
      // 確保URL唯一性
      .filter((item, index, self) => 
        self.findIndex(t => t.url === item.url) === index
      )
    
    await window.electron.send('save-url-history', newHistory)
    autoSaveStatus.value = 'saved'
    
    // 5秒後重置狀態
    setTimeout(() => {
      if (autoSaveStatus.value === 'saved') {
        autoSaveStatus.value = 'idle'
      }
    }, 5000)
  } catch (error) {
    console.error('自動保存時發生錯誤：', error)
    autoSaveStatus.value = 'idle'
  }
}

const autoSaveDebounced = debounce(autoSave, 1000)

watch(() => props.modelValue, (newValue) => {
  inputValue.value = newValue
})

watch(inputValue, (newValue) => {
  emit('update:modelValue', newValue)
})

watch(showHistoryDialog, (newValue) => {
  if (newValue) {
    // 對話框打開時，重新載入數據
    loadHistoryData()
  }
})

const setLoading = (value: boolean) => {
  loading.value = value
}

const filteredHistory = computed(() => {
  if (!searchKeyword.value) return editableHistory.value
  
  const keyword = searchKeyword.value.toLowerCase()
  return editableHistory.value.filter(item => 
    item.label?.toLowerCase().includes(keyword) || 
    item.url?.toLowerCase().includes(keyword)
  )
})

// 驗證URL
const isValidUrl = (url: string): boolean => {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

const validateUrl = (row: HistoryItem) => {
  if (!row.url) {
    row.error = undefined
    return
  }
  
  try {
    new URL(row.url)
    row.error = undefined
    autoSaveDebounced()
  } catch (e) {
    row.error = '無效的URL格式'
  }
}

// 自動生成標籤
const generateLabel = (row: HistoryItem) => {
  if (isValidUrl(row.url)) {
    row.label = getDisplayName(row.url)
    autoSaveDebounced()
  }
}

// 從剪貼簿匯入
const importFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (!text) {
      ElMessage.warning('剪貼簿中沒有文字內容')
      return
    }
    
    // 分割多行文字並過濾空行
    const lines = text.split(/[\r\n]+/).filter(line => line.trim())
    
    if (lines.length === 0) {
      ElMessage.warning('剪貼簿中沒有有效的URL')
      return
    }
    
    // 檢查是否有有效的URL
    const validUrls = lines.filter(line => {
      try {
        new URL(line.trim())
        return true
      } catch (e) {
        return false
      }
    })
    
    if (validUrls.length === 0) {
      ElMessage.warning('剪貼簿中沒有有效的URL')
      return
    }
    
    // 確認匯入
    await ElMessageBox.confirm(
      `從剪貼簿中找到 ${validUrls.length} 個有效URL，是否匯入？`,
      '確認匯入',
      {
        confirmButtonText: '確認',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    // 匯入URL
    validUrls.forEach(url => {
      // 檢查是否已存在
      const exists = editableHistory.value.some(item => item.url === url.trim())
      if (!exists) {
        editableHistory.value.push({
          url: url.trim(),
          label: getDisplayName(url.trim())
        })
      }
    })
    
    ElMessage.success(`成功匯入 ${validUrls.length} 個URL`)
    autoSaveDebounced()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('從剪貼簿匯入時發生錯誤：', error)
      ElMessage.error('匯入失敗，請稍後再試')
    }
  }
}

// 在新視窗開啟URL
const openUrl = (url: string) => {
  if (isValidUrl(url)) {
    window.electron.send('open-external-url', url)
  }
}

defineExpose({
  setLoading
})
</script>

<style scoped>
.url-input-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-header {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-select {
  width: 100%;
}

.history-header {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-select {
  width: 100%;
}

.url-example {
  margin-top: 4px;
}

:deep(.el-textarea__inner) {
  font-family: monospace;
  font-size: 14px;
}

:deep(.el-alert) {
  margin: 0;
  padding: 8px 16px;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-table .el-input) {
  width: 100%;
}

:deep(.el-dialog__body) {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

:deep(.el-table__header-wrapper th) {
  background-color: #f0f7ff;
  font-weight: bold;
  color: #2c3e50;
  padding: 12px 0;
}

:deep(.el-table__row) {
  transition: background-color 0.3s ease;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.search-container {
  display: flex;
  align-items: center;
  flex: 1;
}

.search-input {
  max-width: 300px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.item-count {
  color: #909399;
  font-size: 14px;
}

:deep(.el-button [class*="el-icon"] + span) {
  margin-left: 4px;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: #fafafa;
}

:deep(.el-table__body tr:hover > td) {
  background-color: #ecf5ff !important;
}

.url-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.url-option-label {
  font-weight: bold;
}

.url-option-url {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.url-error {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 4px;
}

.action-buttons-cell {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.action-btn {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.generate-label-btn {
  background-color: #409eff;
  border-color: #409eff;
  color: white;
  opacity: 0.9;
}

.generate-label-btn:hover:not(:disabled) {
  opacity: 1;
  background-color: #66b1ff;
  border-color: #66b1ff;
}

.generate-label-btn:disabled {
  background-color: #a0cfff;
  border-color: #a0cfff;
  color: white;
  opacity: 0.7;
  box-shadow: none;
  cursor: not-allowed;
}

.delete-btn {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: white;
  opacity: 0.9;
}

.delete-btn:hover {
  opacity: 1;
  background-color: #f78989;
  border-color: #f78989;
}

.dialog-custom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px 20px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  border-radius: 0;
  margin: 0;
  box-sizing: border-box;
}

.dialog-custom-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.close-button {
  margin-left: auto;
}

.empty-placeholder {
  padding: 40px 0;
}

.delete-confirm-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  width: 100%;
  box-sizing: border-box;
}

.warning-icon {
  font-size: 48px;
  color: #e6a23c;
}

.delete-item-container {
  width: 100%;
  box-sizing: border-box;
  padding: 0 10px;
}

.delete-item-info {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 16px;
  width: 100%;
  max-width: 100%;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  overflow: hidden;
  word-wrap: break-word;
}

.delete-item-url {
  font-size: 12px;
  color: #606266;
  margin-top: 8px;
  word-break: break-all;
}

.footer-left, .footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mr-1 {
  margin-right: 4px;
}

.ml-2 {
  margin-left: 8px;
}

:deep(.url-history-dialog:not(.delete-confirm-dialog) .el-dialog__body) {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.url-history-dialog .el-dialog__header) {
  padding: 0;
  margin: 0;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
}

:deep(.url-history-dialog .el-dialog) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

:deep(.delete-confirm-dialog .el-dialog__header) {
  padding: 0;
  margin: 0;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
}

:deep(.delete-confirm-dialog .el-dialog) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

:deep(.delete-confirm-dialog .el-dialog__body) {
  padding: 20px;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
}

:deep(.delete-confirm-dialog .el-dialog__footer) {
  padding: 10px 20px 20px;
  box-sizing: border-box;
}

:deep(.is-loading) {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

:deep(.el-input__inner) {
  transition: all 0.3s ease;
}

:deep(.el-input__inner:focus) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

:deep(.el-button) {
  transition: all 0.3s ease;
}

:deep(.el-tag) {
  border-radius: 4px;
}

.custom-btn {
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.custom-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.primary-btn {
  background-color: #409eff;
  border-color: #409eff;
}

.primary-btn:hover {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

.success-btn {
  background-color: #67c23a;
  border-color: #67c23a;
}

.success-btn:hover {
  background-color: #85ce61;
  border-color: #85ce61;
}

.danger-btn {
  background-color: #f56c6c;
  border-color: #f56c6c;
}

.danger-btn:hover {
  background-color: #f78989;
  border-color: #f78989;
}

.custom-input {
  --el-input-hover-border-color: #a0cfff;
  --el-input-focus-border-color: #409eff;
}

:deep(.custom-input .el-input__wrapper) {
  border-radius: 6px;
  transition: all 0.3s ease;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

:deep(.custom-input .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-input-hover-border-color) inset;
}

:deep(.custom-input .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-input-focus-border-color) inset, 0 0 0 3px rgba(64, 158, 255, 0.1);
}

:deep(.custom-input .el-input__inner) {
  height: 36px;
  font-size: 14px;
}

:deep(.custom-input .el-input-group__append) {
  padding: 0;
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
  overflow: hidden;
}

.open-url-btn {
  height: 36px;
  border: none;
  border-radius: 0;
  color: #409eff;
  transition: all 0.3s ease;
}

.open-url-btn:hover {
  background-color: #ecf5ff;
  color: #66b1ff;
}
</style> 