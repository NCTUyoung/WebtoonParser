<template>
  <div class="url-input-container">
    <div class="history-header">
      <el-button
        type="primary"
        style="min-width: 90px"
        @click="showHistoryDialog = true"
      >
        管理清單
      </el-button>
    </div>

    <!-- URL 輸入區 -->
    <div class="input-area">
      <el-select
        v-model="selectedHistory"
        multiple
        filterable
        collapse-tags
        placeholder="從清單中選擇網址"
        class="history-select"
        @change="handleHistoryChange"
      >
        <el-option
          v-for="item in urlHistoryWithLabels"
          :key="item.url"
          :label="item.label || item.url"
          :value="item.url"
        />
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
        <template #default>
          <i class="el-icon-info"></i>
          範例: https://www.webtoons.com/zh-hant/bl-gl/friday-night/list?title_no=6875
        </template>
      </el-alert>
    </div>

    <!-- 清單管理對話框 -->
    <el-dialog
      v-model="showHistoryDialog"
      title="管理網址清單"
      width="70%"
      :close-on-click-modal="false"
    >
      <div class="dialog-header">
        <el-input
          v-model="searchKeyword"
          placeholder="搜尋清單..."
          prefix-icon="Search"
          clearable
          class="search-input"
        />
        <el-button @click="addHistoryItem" type="primary">
          <el-icon><Plus /></el-icon> 新增網址
        </el-button>
      </div>

      <el-table
        :data="filteredHistory"
        style="width: 100%"
        border
        stripe
        highlight-current-row
      >
        <el-table-column label="標籤名稱" width="220">
          <template #default="{ row }">
            <el-input
              v-model="row.label"
              placeholder="輸入標籤名稱"
              clearable
            />
          </template>
        </el-table-column>
        <el-table-column label="網址">
          <template #default="{ row }">
            <el-input
              v-model="row.url"
              placeholder="輸入網址"
              clearable
            />
          </template>
        </el-table-column>
        <el-table-column width="100" align="center" label="操作">
          <template #default="{ $index }">
            <el-button
              type="danger"
              size="small"
              @click="removeHistoryItem($index)"
              circle
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="dialog-footer">
        <span class="item-count">共 {{ filteredHistory.length }} 項</span>
        <div>
          <el-button @click="showHistoryDialog = false">取消</el-button>
          <el-button type="primary" @click="saveHistory">
            確認
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Search } from '@element-plus/icons-vue'

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
const urlHistory = ref<Array<{url: string, label: string}>>([])
const selectedHistory = ref<string[]>([])
const showHistoryDialog = ref(false)
const editableHistory = ref<Array<{url: string, label: string}>>([])
const searchKeyword = ref('')

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
})

const handleHistoryChange = (values: string[]) => {
  selectedHistory.value = values
  inputValue.value = values.join('\n')
}

const addHistoryItem = () => {
  const newItem = { url: '', label: '' }
  editableHistory.value.push(newItem)
  
  // 滾動到底部
  setTimeout(() => {
    const container = document.querySelector('.el-dialog__body')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, 100)
}

const removeHistoryItem = (index: number) => {
  editableHistory.value.splice(index, 1)
}

const saveHistory = () => {
  try {
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
  }
}

watch(() => props.modelValue, (newValue) => {
  inputValue.value = newValue
})

watch(inputValue, (newValue) => {
  emit('update:modelValue', newValue)
})

const setLoading = (value: boolean) => {
  loading.value = value
}

const filteredHistory = computed(() => {
  if (!searchKeyword.value) return editableHistory.value
  
  const keyword = searchKeyword.value.toLowerCase()
  return editableHistory.value.filter(item => 
    item.label.toLowerCase().includes(keyword) || 
    item.url.toLowerCase().includes(keyword)
  )
})

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
  max-height: 60vh;
  overflow-y: auto;
}

:deep(.el-table) {
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

:deep(.el-table__header-wrapper th) {
  background-color: #f5f7fa;
  font-weight: bold;
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
}

.search-input {
  max-width: 300px;
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
  background-color: #f0f9ff !important;
}
</style> 