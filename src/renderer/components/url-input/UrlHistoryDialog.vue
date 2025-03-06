<template>
  <el-dialog
    v-model="dialogVisible"
    title="管理網址清單"
    width="800px"
    :append-to-body="true"
    destroy-on-close
    :show-close="false"
    class="url-history-dialog"
  >
    <template #header>
      <div class="dialog-custom-header">
        <h3><el-icon><Document /></el-icon> 管理網址清單</h3>
        <el-tooltip content="關閉" placement="top">
          <el-button
            @click="closeDialog"
            circle
            class="close-button"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </template>
    
    <div class="dialog-content">
      <!-- 搜索和操作区域 -->
      <div class="search-actions">
        <el-input
          v-model="searchQuery"
          placeholder="搜索網址或標籤..."
          clearable
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <div class="action-buttons">
          <el-button
            @click="importFromClipboard"
            type="primary"
            class="custom-btn"
          >
            <el-icon><DocumentCopy /></el-icon> 從剪貼板導入
          </el-button>
          
          <el-button
            @click="addNewUrl"
            type="primary"
            class="custom-btn"
          >
            <el-icon><Plus /></el-icon> 新增網址
          </el-button>
        </div>
      </div>
      
      <!-- URL表格 -->
      <url-table
        :data="urlHistory"
        :search-query="searchQuery"
        @update:data="updateUrlHistory"
        @delete-item="confirmDelete"
        @open-url="openExternalUrl"
        @add-to-input="addToInput"
      />
      
      <!-- 底部状态和按钮 -->
      <div class="dialog-footer">
        <div class="status-info">
          <span>共 {{ urlHistory.length }} 項</span>
          <span v-if="autoSaveStatus" class="auto-save-status">
            <el-icon><Check /></el-icon> 已自動保存
          </span>
        </div>
        
        <div class="footer-buttons">
          <el-button @click="closeDialog" class="custom-btn">關閉</el-button>
          <el-button type="primary" @click="saveHistory" class="custom-btn">
            <el-icon><Check /></el-icon> 保存歷史
          </el-button>
        </div>
      </div>
    </div>
    
    <!-- 添加新URL的对话框 -->
    <el-dialog
      v-model="addUrlDialogVisible"
      title="新增網址"
      width="500px"
      :append-to-body="true"
      destroy-on-close
      :show-close="false"
      class="add-url-dialog"
    >
      <template #header>
        <div class="dialog-custom-header">
          <h3><el-icon><Plus /></el-icon> 新增網址</h3>
          <el-tooltip content="關閉" placement="top">
            <el-button
              @click="addUrlDialogVisible = false"
              circle
              class="close-button"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </template>
      
      <div class="add-url-form">
        <el-form :model="newUrlForm" label-position="top">
          <el-form-item label="網址">
            <el-input
              v-model="newUrlForm.url"
              placeholder="請輸入網址"
              clearable
              @input="validateUrl"
            />
            <div v-if="newUrlForm.error" class="error-message">
              {{ newUrlForm.error }}
            </div>
          </el-form-item>
          
          <el-form-item label="標籤名稱 (可選)">
            <el-input
              v-model="newUrlForm.label"
              placeholder="請輸入標籤名稱"
              clearable
            />
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addUrlDialogVisible = false" class="custom-btn">取消</el-button>
          <el-button
            type="primary"
            @click="confirmAddUrl"
            :disabled="!!newUrlForm.error || !newUrlForm.url"
            class="custom-btn"
          >
            確認添加
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 确认删除对话框 -->
    <delete-confirm-dialog
      v-model="deleteConfirmVisible"
      :item="itemToDelete"
      @confirm="deleteUrl"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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

// 对话框可见性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// URL历史记录
const urlHistory = ref<HistoryItem[]>([...props.history])

// 搜索查询
const searchQuery = ref('')

// 自动保存状态
const autoSaveStatus = ref(false)

// 添加URL对话框
const addUrlDialogVisible = ref(false)
const newUrlForm = ref({
  url: '',
  label: '',
  error: ''
})

// 删除确认对话框
const deleteConfirmVisible = ref(false)
const itemToDelete = ref<HistoryItem | null>(null)

// 关闭对话框
const closeDialog = () => {
  dialogVisible.value = false
}

// 更新URL历史
const updateUrlHistory = (newHistory: HistoryItem[]) => {
  urlHistory.value = newHistory
  autoSave()
}

// 保存历史
const saveHistory = () => {
  // 創建一個只包含必要屬性的歷史記錄數組
  const cleanHistory = urlHistory.value.map(item => ({
    url: item.url,
    label: item.label
  }))
  
  // 發送更新事件
  emit('update:history', cleanHistory)
  ElMessage.success('歷史記錄已保存')
  showAutoSaveStatus()
}

// 自动保存
const autoSave = () => {
  // 創建一個只包含必要屬性的歷史記錄數組
  const cleanHistory = urlHistory.value.map(item => ({
    url: item.url,
    label: item.label
  }))
  
  // 發送更新事件
  emit('update:history', cleanHistory)
  showAutoSaveStatus()
}

// 显示自动保存状态
const showAutoSaveStatus = () => {
  autoSaveStatus.value = true
  setTimeout(() => {
    autoSaveStatus.value = false
  }, 3000)
}

// 从剪贴板导入
const importFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    const urls = extractUrlsFromText(text)
    
    if (urls.length === 0) {
      ElMessage.warning('剪貼板中未找到有效網址')
      return
    }
    
    // 过滤掉已存在的URL
    const newUrls = urls.filter((url: string) => !urlHistory.value.some(item => item.url === url))
    
    if (newUrls.length === 0) {
      ElMessage.warning('所有網址已存在於列表中')
      return
    }
    
    // 添加新URL，只包含必要的屬性
    const newItems = newUrls.map((url: string) => ({
      url,
      label: generateLabelFromUrl(url)
      // 不包含其他可能導致序列化問題的屬性
    }))
    
    // 創建一個新的歷史記錄數組，確保所有項目都只有基本屬性
    const cleanHistory = urlHistory.value.map(item => ({
      url: item.url,
      label: item.label
    }))
    
    // 更新歷史記錄
    urlHistory.value = [...cleanHistory, ...newItems]
    ElMessage.success(`已導入 ${newItems.length} 個網址`)
    autoSave()
  } catch (error) {
    console.error('剪貼板讀取錯誤:', error)
    ElMessage.error('無法讀取剪貼板內容')
  }
}

// 添加新URL
const addNewUrl = () => {
  newUrlForm.value = {
    url: '',
    label: '',
    error: ''
  }
  addUrlDialogVisible.value = true
}

// 验证URL
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

// 确认添加URL
const confirmAddUrl = () => {
  validateUrl()
  
  if (newUrlForm.value.error || !newUrlForm.value.url) {
    return
  }
  
  // 創建一個只包含必要屬性的新項目
  const newItem = {
    url: newUrlForm.value.url,
    label: newUrlForm.value.label || generateLabelFromUrl(newUrlForm.value.url)
  }
  
  // 創建一個只包含必要屬性的歷史記錄數組
  const cleanHistory = urlHistory.value.map(item => ({
    url: item.url,
    label: item.label
  }))
  
  // 更新歷史記錄
  urlHistory.value = [...cleanHistory, newItem]
  ElMessage.success('網址已添加')
  addUrlDialogVisible.value = false
  autoSave()
}

// 确认删除
const confirmDelete = (item: HistoryItem) => {
  itemToDelete.value = item
  deleteConfirmVisible.value = true
}

// 删除URL
const deleteUrl = () => {
  if (!itemToDelete.value) return
  
  // 找到要刪除的項目索引
  const index = urlHistory.value.findIndex(item => item.url === itemToDelete.value?.url)
  
  if (index !== -1) {
    // 創建一個新的歷史記錄數組，不包含要刪除的項目
    const newHistory = urlHistory.value
      .filter(item => item.url !== itemToDelete.value?.url)
      .map(item => ({
        url: item.url,
        label: item.label
      }))
    
    // 更新歷史記錄
    urlHistory.value = newHistory
    ElMessage.success('網址已刪除')
    autoSave()
  }
  
  deleteConfirmVisible.value = false
  itemToDelete.value = null
}

// 在外部浏览器中打开URL
const openExternalUrl = (url: string) => {
  emit('open-url', url)
}

// 添加URL到输入框
const addToInput = (url: string) => {
  emit('add-to-input', url)
  ElMessage.success('已添加到輸入框')
}

// 监听props.history变化
watch(() => props.history, (newHistory) => {
  urlHistory.value = [...newHistory]
}, { deep: true })
</script>

<style scoped>
/* 基础布局 */
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
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

/* 搜索和操作区域 */
.search-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.search-input {
  width: 300px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

/* 底部状态和按钮 */
.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #606266;
}

.auto-save-status {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #67c23a;
}

.footer-buttons {
  display: flex;
  gap: 8px;
}

/* 添加URL表单 */
.add-url-form {
  padding: 0 16px;
}

.error-message {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 4px;
}

/* 统一按钮样式 */
.custom-btn {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
}

.custom-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.custom-btn.el-button--primary {
  background-color: var(--primary-color);
  border-color: transparent;
}

.custom-btn.el-button--primary:hover {
  background-color: var(--primary-light);
  box-shadow: 0 4px 12px rgba(43, 133, 228, 0.25);
}

.close-button {
  height: 32px;
  width: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.close-button:hover {
  background-color: #f2f6fc;
  color: var(--primary-color);
}

/* Element Plus 组件样式覆盖 */
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

:deep(.url-history-dialog:not(.delete-confirm-dialog) .el-dialog__body) {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.add-url-dialog .el-dialog__body) {
  padding: 20px 0;
}
</style> 