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
      <!-- Optimized search and action area layout -->
      <div class="search-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索網址或標籤..."
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <div class="quick-actions">
          <el-button
            @click="importFromClipboard"
            type="primary"
            size="small"
            text
          >
            <el-icon><DocumentCopy /></el-icon> 從剪貼板導入
          </el-button>
          <el-divider direction="vertical" />
          <el-button
            @click="showAddUrlForm"
            type="primary"
            size="small"
          >
            <el-icon><Plus /></el-icon> 新增
          </el-button>
        </div>
      </div>
      
      <!-- Simple URL input form -->
      <div v-if="showAddForm" class="add-url-form">
        <el-input
          v-model="newUrlForm.url"
          placeholder="輸入網址"
          clearable
          @input="validateUrl"
        >
          <template #append>
            <el-input
              v-model="newUrlForm.label"
              placeholder="標籤名稱"
              style="width: 120px"
            />
            <el-button
              @click="confirmAddUrl"
              :disabled="!!newUrlForm.error || !newUrlForm.url"
              type="primary"
            >
              添加
            </el-button>
          </template>
        </el-input>
        
        <div v-if="newUrlForm.error" class="error-message">
          {{ newUrlForm.error }}
        </div>
      </div>
      
      <!-- URL table -->
      <url-table
        :data="urlHistory"
        :search-query="searchQuery"
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
import { Document, Search, DocumentCopy, Plus, Check, Close } from '@element-plus/icons-vue'
import UrlTable from './UrlTable.vue'
import DeleteConfirmDialog from './DeleteConfirmDialog.vue'
import { isValidUrl, formatUrl, extractUrlsFromText, generateLabelFromUrl } from '@/utils/urlUtils'

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

// Search query
const searchQuery = ref('')

// Auto-save status
const autoSaveStatus = ref(false)

// Add URL form display control
const showAddForm = ref(false)

// Add URL form data
const newUrlForm = ref({
  url: '',
  label: '',
  error: ''
})

// Delete confirmation dialog
const deleteConfirmVisible = ref(false)
const itemToDelete = ref<HistoryItem | null>(null)

// Show add URL form
const showAddUrlForm = () => {
  showAddForm.value = true
  newUrlForm.value = {
    url: '',
    label: '',
    error: ''
  }
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

// Import from clipboard
const importFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    const urls = extractUrlsFromText(text)
    
    if (urls.length === 0) {
      ElMessage.warning('剪貼板中未找到有效網址')
      return
    }
    
    // Filter out existing URLs
    const newUrls = urls.filter((url: string) => !urlHistory.value.some(item => item.url === url))
    
    if (newUrls.length === 0) {
      ElMessage.warning('所有網址已存在於列表中')
      return
    }
    
    // Add new URLs
    const newItems = newUrls.map((url: string) => ({
      url,
      label: generateLabelFromUrl(url)
    }))
    
    urlHistory.value = [...urlHistory.value, ...newItems]
    ElMessage.success(`已導入 ${newItems.length} 個網址`)
    autoSave()
  } catch (error) {
    ElMessage.error('無法讀取剪貼板內容')
  }
}

// Validate URL
const validateUrl = () => {
  if (!newUrlForm.value.url) {
    newUrlForm.value.error = ''
    return
  }
  
  const formattedUrl = formatUrl(newUrlForm.value.url)
  
  if (!isValidUrl(formattedUrl)) {
    newUrlForm.value.error = '請輸入有效的網址'
  } else if (urlHistory.value.some(item => item.url === formattedUrl)) {
    newUrlForm.value.error = '該網址已存在於列表中'
  } else {
    newUrlForm.value.error = ''
    newUrlForm.value.url = formattedUrl
  }
}

// Confirm adding URL
const confirmAddUrl = () => {
  validateUrl()
  
  if (newUrlForm.value.error || !newUrlForm.value.url) {
    return
  }
  
  const newItem = {
    url: newUrlForm.value.url,
    label: newUrlForm.value.label || generateLabelFromUrl(newUrlForm.value.url)
  }
  
  urlHistory.value = [...urlHistory.value, newItem]
  ElMessage.success('網址已添加')
  
  // Reset form
  newUrlForm.value = {
    url: '',
    label: '',
    error: ''
  }
  
  autoSave()
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

/* Simple URL input form */
.add-url-form {
  margin-bottom: 12px;
}

.error-message {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 4px;
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