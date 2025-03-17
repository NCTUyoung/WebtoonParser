<template>
  <el-dialog
    v-model="dialogVisible"
    title="管理網址清單"
    width="700px"
    :append-to-body="true"
    destroy-on-close
    :show-close="false"
    class="url-history-dialog"
  >
    <!-- Simplified header area -->
    <template #header>
      <div class="dialog-header">
        <h3><el-icon><Document /></el-icon> 網址清單</h3>
        <el-button
          @click="closeDialog"
          circle
          class="close-button"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </template>
    
    <div class="dialog-content">
      <!-- 智能輸入區：搜索/新增網址 -->
      <div class="search-bar">
        <el-input
          v-model="inputValue"
          placeholder="搜索網址或標籤..."
          clearable
          @keyup.enter="handleEnterKey"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <div class="quick-actions">
          <el-button
            @click="tryAddCurrentInput"
            type="primary"
            size="small"
          >
            <el-icon><Plus /></el-icon> 添加此網址
          </el-button>
          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
        </div>
      </div>
      
      <!-- URL table -->
      <url-table
        :data="urlHistory"
        :search-query="inputValue"
        @update:data="updateUrlHistory"
        @delete-item="confirmDelete"
        @open-url="openExternalUrl"
        @add-to-input="addToInput"
      />
      
      <!-- Simplified footer status -->
      <div class="dialog-footer">
        <span class="status-text">{{ urlHistory.length }} 個網址</span>
        <span v-if="autoSaveStatus" class="auto-save-status">
          <el-icon><Check /></el-icon> 已自動保存
        </span>
      </div>
    </div>
    
    <!-- Delete confirmation dialog -->
    <delete-confirm-dialog
      v-model="deleteConfirmVisible"
      :item="itemToDelete"
      @confirm="deleteUrl"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Search, Plus, Check, Close } from '@element-plus/icons-vue'
import UrlTable from './UrlTable.vue'
import DeleteConfirmDialog from './DeleteConfirmDialog.vue'
import { isValidUrl, formatUrl, generateLabelFromUrl } from '@/utils/urlUtils'

interface HistoryItem {
  url: string
  label: string
  error?: string
}

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  history: {
    type: Array as () => HistoryItem[],
    default: () => []
  }
})

const emit = defineEmits([
  'update:modelValue', 
  'update:history', 
  'open-url',
  'add-to-input'
])

// Dialog visibility
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// URL history records
const urlHistory = ref<HistoryItem[]>([...props.history])

// 統一輸入欄位
const inputValue = ref('')
const errorMessage = ref('')

// Auto-save status
const autoSaveStatus = ref(false)

// Add URL form data
const newUrlForm = ref({
  label: ''
})

// Delete confirmation dialog
const deleteConfirmVisible = ref(false)
const itemToDelete = ref<HistoryItem | null>(null)

// 嘗試添加當前輸入
const tryAddCurrentInput = () => {
  if (!inputValue.value) {
    errorMessage.value = '請輸入網址'
    setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
    return
  }
  
  const formattedUrl = formatUrl(inputValue.value)
  
  if (!isValidUrl(formattedUrl)) {
    errorMessage.value = '請輸入有效的網址'
    setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
    return
  }
  
  // 檢查是否已存在
  if (urlHistory.value.some(item => item.url === formattedUrl)) {
    errorMessage.value = '該網址已存在於列表中'
    setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
    return
  }
  
  // 生成默認標籤
  const label = generateLabelFromUrl(formattedUrl)
  
  // 添加新URL
  addUrl(formattedUrl, label)
}

// 處理按Enter鍵 - 如果是有效URL就添加，否則執行搜索
const handleEnterKey = () => {
  const formattedUrl = formatUrl(inputValue.value)
  if (isValidUrl(formattedUrl) && !urlHistory.value.some(item => item.url === formattedUrl)) {
    tryAddCurrentInput()
  }
  // 如果不是有效URL或已存在，Enter鍵默認行為就是搜索
}

// 添加URL到歷史記錄
const addUrl = (url: string, label: string) => {
  const newItem = {
    url,
    label
  }
  
  urlHistory.value = [...urlHistory.value, newItem]
  ElMessage.success('網址已添加')
  
  // 清空輸入和錯誤
  inputValue.value = ''
  errorMessage.value = ''
  
  autoSave()
}

// Close dialog
const closeDialog = () => {
  dialogVisible.value = false
}

// Update URL history
const updateUrlHistory = (newHistory: HistoryItem[]) => {
  urlHistory.value = newHistory
  autoSave()
}

// Save history
const saveHistory = () => {
  const cleanHistory = urlHistory.value.map(item => ({
    url: item.url,
    label: item.label
  }))
  
  emit('update:history', cleanHistory)
  showAutoSaveStatus()
}

// Auto save
const autoSave = () => {
  const cleanHistory = urlHistory.value.map(item => ({
    url: item.url,
    label: item.label
  }))
  
  emit('update:history', cleanHistory)
  showAutoSaveStatus()
}

// Show auto-save status
const showAutoSaveStatus = () => {
  autoSaveStatus.value = true
  setTimeout(() => {
    autoSaveStatus.value = false
  }, 3000)
}

// Confirm delete
const confirmDelete = (item: HistoryItem) => {
  itemToDelete.value = item
  deleteConfirmVisible.value = true
}

// Delete URL
const deleteUrl = () => {
  if (!itemToDelete.value) return
  
  urlHistory.value = urlHistory.value.filter(item => item.url !== itemToDelete.value?.url)
  ElMessage.success('網址已刪除')
  autoSave()
  
  deleteConfirmVisible.value = false
  itemToDelete.value = null
}

// Open URL in external browser
const openExternalUrl = (url: string) => {
  emit('open-url', url)
}

// Add URL to input box
const addToInput = (url: string) => {
  emit('add-to-input', url)
  ElMessage.success('已添加到輸入框')
}

// Watch props.history changes
watch(() => props.history, (newHistory) => {
  urlHistory.value = [...newHistory]
}, { deep: true })
</script>

<style scoped>
/* Optimized overall layout */
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
}

/* Simplified header style */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  width: 100%;
  box-sizing: border-box;
}

.dialog-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  color: #303133;
}

/* Optimized search area layout */
.search-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.quick-actions {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

/* Simplified footer status bar */
.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  margin-top: 8px;
  border-top: 1px solid #ebeef5;
  font-size: 13px;
  color: #606266;
}

.auto-save-status {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #67c23a;
}

/* Optimized close button */
.close-button {
  height: 32px;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
}

/* Responsive styles */
@media (max-width: 600px) {
  .search-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .quick-actions {
    justify-content: flex-end;
    margin-top: 8px;
  }
}

/* Dialog style overrides */
:deep(.url-history-dialog .el-dialog__header) {
  padding: 0;
  margin: 0;
}

:deep(.url-history-dialog .el-dialog__body) {
  padding: 16px;
}
</style> 