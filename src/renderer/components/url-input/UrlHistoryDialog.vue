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
          v-model="searchOrNewUrl"
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
      <url-table />

      <!-- Simplified footer status -->
      <div class="dialog-footer">
        <span class="status-text">{{ urlStore.history.length }} 個網址</span>
        <span v-if="autoSaveStatus" class="auto-save-status">
          <el-icon><Check /></el-icon> 已自動保存
        </span>
      </div>
    </div>

    <!-- Delete confirmation dialog -->
    <delete-confirm-dialog />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Search, Plus, Check, Close } from '@element-plus/icons-vue'
import UrlTable from './UrlTable.vue'
import DeleteConfirmDialog from './DeleteConfirmDialog.vue'
import { isValidUrl, formatUrl, generateLabelFromUrl } from '../../utils/urlUtils'
import { useUrlStore } from '../../stores/urlStore'

// 使用 Pinia Store
const urlStore = useUrlStore()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:modelValue',
  'open-url'
])

// Dialog visibility
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 搜索或新URL输入
const searchOrNewUrl = computed({
  get: () => urlStore.searchQuery,
  set: (value) => { urlStore.searchQuery = value }
})

const errorMessage = ref('')
const autoSaveStatus = ref(false)

// Try to add current input
const tryAddCurrentInput = () => {
  if (!searchOrNewUrl.value) {
    errorMessage.value = '請輸入網址'
    setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
    return
  }

  const formattedUrl = formatUrl(searchOrNewUrl.value)

  if (!isValidUrl(formattedUrl)) {
    errorMessage.value = '請輸入有效的網址'
    setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
    return
  }

  // Check if URL already exists
  if (urlStore.history.some(item => item.url === formattedUrl)) {
    errorMessage.value = '該網址已存在於列表中'
    setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
    return
  }

  // Add new URL to history
  addUrl(formattedUrl)
}

// Handle Enter key - add if valid URL, otherwise perform search
const handleEnterKey = () => {
  const formattedUrl = formatUrl(searchOrNewUrl.value)
  if (isValidUrl(formattedUrl) && !urlStore.history.some(item => item.url === formattedUrl)) {
    tryAddCurrentInput()
  }
  // If not a valid URL or already exists, default behavior of Enter key is search
}

// Add URL to history
const addUrl = (url: string) => {
  // Add to history
  const label = generateLabelFromUrl(url)
  urlStore.history.push({ url, label })
  urlStore.saveUrlHistory()

  ElMessage.success('網址已添加')

  // Clear input and error
  searchOrNewUrl.value = ''
  errorMessage.value = ''

  showAutoSaveStatus()
}

// Close dialog
const closeDialog = () => {
  dialogVisible.value = false
}

// Show auto-save status
const showAutoSaveStatus = () => {
  autoSaveStatus.value = true
  setTimeout(() => {
    autoSaveStatus.value = false
  }, 3000)
}

// Load history on initialization
onMounted(() => {
  urlStore.loadUrlHistory()
})
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