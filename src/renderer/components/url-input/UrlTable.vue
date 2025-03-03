<template>
  <div class="url-table-container">
    <el-table
      :data="filteredData"
      style="width: 100%"
      max-height="400px"
      :border="true"
      highlight-current-row
      @row-click="handleRowClick"
    >
      <el-table-column label="標籤名稱" min-width="120">
        <template #default="{ row }">
          <div class="label-cell">
            <el-input
              v-if="row.editing"
              v-model="row.editLabel"
              size="small"
              placeholder="輸入標籤名稱"
              @blur="saveLabel(row)"
              @keyup.enter="saveLabel(row)"
              ref="labelInput"
            />
            <div v-else class="label-display" @click.stop="startEditing(row)">
              {{ row.label || '未命名' }}
              <el-icon class="edit-icon"><Edit /></el-icon>
            </div>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="網址" min-width="300">
        <template #default="{ row }">
          <div class="url-cell">
            <div class="url-text">{{ row.url }}</div>
            <div class="url-actions">
              <el-tooltip content="添加到輸入框" placement="top">
                <el-button
                  @click.stop="addToInput(row.url)"
                  circle
                  size="small"
                  class="action-button"
                >
                  <el-icon><Plus /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="複製網址" placement="top">
                <el-button
                  @click.stop="copyUrl(row.url)"
                  circle
                  size="small"
                  class="action-button"
                >
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="在瀏覽器中打開" placement="top">
                <el-button
                  @click.stop="openUrl(row.url)"
                  circle
                  size="small"
                  class="action-button"
                >
                  <el-icon><Link /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="150" align="center">
        <template #default="{ row, $index }">
          <div class="action-cell">
            <el-tooltip content="生成標籤" placement="top">
              <el-button
                @click.stop="generateLabel(row)"
                circle
                size="small"
                class="action-button"
              >
                <el-icon><Star /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="刪除" placement="top">
              <el-button
                @click.stop="deleteItem(row)"
                circle
                size="small"
                type="danger"
                class="action-button"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, CopyDocument, Link, Star, Delete, Plus } from '@element-plus/icons-vue'
import { generateLabelFromUrl } from '@/utils/urlUtils'

interface HistoryItem {
  url: string
  label: string
  editing?: boolean
  editLabel?: string
  error?: string
}

const props = defineProps({
  data: {
    type: Array as () => HistoryItem[],
    required: true
  },
  searchQuery: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'update:data', 
  'delete-item', 
  'open-url',
  'add-to-input'
])

const labelInput = ref<HTMLInputElement | null>(null)

// 过滤后的数据
const filteredData = computed(() => {
  if (!props.searchQuery) return props.data
  
  const query = props.searchQuery.toLowerCase()
  return props.data.filter(item => 
    (item.label && item.label.toLowerCase().includes(query)) || 
    item.url.toLowerCase().includes(query)
  )
})

// 开始编辑标签
const startEditing = (row: HistoryItem) => {
  // 先重置所有行的编辑状态
  props.data.forEach(item => {
    item.editing = false
  })
  
  // 设置当前行为编辑状态
  row.editing = true
  row.editLabel = row.label || ''
  
  // 等待DOM更新后聚焦输入框
  nextTick(() => {
    if (labelInput.value) {
      labelInput.value.focus()
    }
  })
}

// 保存标签
const saveLabel = (row: HistoryItem) => {
  if (row.editing && row.editLabel !== undefined) {
    const newData = [...props.data].map(item => {
      // 創建不包含editing和editLabel屬性的新對象
      const cleanItem = {
        url: item.url,
        label: item.label
      }
      
      // 如果是當前編輯的行，更新標籤
      if (item.url === row.url && row.editLabel !== undefined) {
        cleanItem.label = row.editLabel.trim()
      }
      
      return cleanItem
    })
    
    // 更新數據
    emit('update:data', newData)
    
    // 在本地更新編輯狀態（不會傳遞到父組件）
    row.editing = false
  }
}

// 生成标签
const generateLabel = (row: HistoryItem) => {
  const label = generateLabelFromUrl(row.url)
  
  const newData = [...props.data].map(item => {
    // 創建不包含editing和editLabel屬性的新對象
    const cleanItem = {
      url: item.url,
      label: item.label
    }
    
    // 如果是當前行，更新標籤
    if (item.url === row.url) {
      cleanItem.label = label
    }
    
    return cleanItem
  })
  
  emit('update:data', newData)
  ElMessage.success(`已生成標籤: ${label}`)
}

// 复制URL
const copyUrl = (url: string) => {
  navigator.clipboard.writeText(url)
    .then(() => {
      ElMessage.success('網址已複製到剪貼板')
    })
    .catch((error) => {
      console.error('複製到剪貼板失敗:', error)
      ElMessage.error('複製失敗')
    })
}

// 在浏览器中打开URL
const openUrl = (url: string) => {
  emit('open-url', url)
}

// 添加URL到输入框
const addToInput = (url: string) => {
  emit('add-to-input', url)
}

// 删除项目
const deleteItem = (row: HistoryItem) => {
  emit('delete-item', row)
}

// 行点击事件
const handleRowClick = (row: HistoryItem) => {
  // 如果有其他行在编辑中，保存它们
  props.data.forEach(item => {
    if (item.editing && item !== row) {
      saveLabel(item)
    }
  })
}

// 监听数据变化，重置编辑状态
watch(() => props.data, () => {
  props.data.forEach(item => {
    item.editing = false
  })
}, { deep: true })
</script>

<style scoped>
.url-table-container {
  width: 100%;
  margin-top: 16px;
}

/* 标签单元格样式 */
.label-cell {
  display: flex;
  align-items: center;
  min-height: 40px;
}

.label-display {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.label-display:hover {
  background-color: #f5f7fa;
}

.edit-icon {
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 14px;
  color: #909399;
}

.label-display:hover .edit-icon {
  opacity: 1;
}

/* URL单元格样式 */
.url-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.url-text {
  flex: 1;
  max-width: calc(100% - 120px); /* 为操作按钮预留空间 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #409eff;
}

.url-actions {
  display: flex;
  gap: 8px;
  opacity: 1;
  transition: opacity 0.2s;
}

/* 操作单元格样式 */
.action-cell {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.action-button {
  transition: all 0.3s;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* 表格样式覆盖 */
:deep(.el-table__row) {
  cursor: pointer;
  transition: background-color 0.2s;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

:deep(.el-table--border .el-table__cell) {
  border-right: 1px solid #ebeef5;
}

:deep(.el-table__body tr.current-row > td) {
  background-color: #ecf5ff;
}
</style> 