<template>
  <div class="url-table-container">
    <el-table
      :data="filteredHistory"
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
              @blur="saveLabel(row.url)"
              @keyup.enter="saveLabel(row.url)"
              :ref="(el: HTMLInputElement | null) => { if (el) inputRefs[row.url] = el }"
            />
            <div v-else class="label-display" @click.stop="startEditing(row.url)">
              {{ row.label || '未命名' }}
              <el-icon class="edit-icon" @click.stop="startEditing(row.url)"><Edit /></el-icon>
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
        <template #default="{ row }">
          <div class="action-cell">
            <el-tooltip content="生成標籤" placement="top">
              <el-button
                @click.stop="generateLabel(row.url)"
                circle
                size="small"
                class="action-button"
              >
                <el-icon><Star /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="刪除" placement="top">
              <el-button
                @click.stop="deleteHistoryItem(row.url)"
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
import { ref, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, CopyDocument, Link, Star, Delete, Plus } from '@element-plus/icons-vue'
import { useUrlStore } from '../../stores/urlStore'

// Use Pinia Store
const urlStore = useUrlStore()

// Reference to input field DOM elements
const inputRefs = ref<Record<string, HTMLInputElement | null>>({})

// Start editing label
const startEditing = (url: string) => {
  urlStore.startEditing(url)

  // Focus the input field after DOM update
  nextTick(() => {
    if (inputRefs.value[url]) {
      inputRefs.value[url]?.focus()
    }
  })
}

// Save label
const saveLabel = (url: string) => {
  urlStore.saveLabel(url)
}

// Generate label
const generateLabel = (url: string) => {
  const label = urlStore.generateLabel(url)
  ElMessage.success(`已生成標籤: ${label}`)
}

// Copy URL
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

// Open URL in browser
const openUrl = (url: string) => {
  window.electron.send('open-external-url', url)
}

// Add URL to input field
const addToInput = (url: string) => {
  urlStore.addToInput(url)
}

// Delete item
const deleteHistoryItem = (url: string) => {
  // 使用 urlStore 的删除确认方法
  urlStore.showDeleteConfirm(url)
}

// Row click event
const handleRowClick = (row: { url: string, editing?: boolean }) => {
  // If other rows are being edited, save them
  const editingItems = urlStore.history.filter(item => item.editing && item.url !== row.url)
  if (editingItems.length > 0) {
    editingItems.forEach(item => {
      if (item.url) {
        saveLabel(item.url)
      }
    })
  }
}

// Computed property to get filtered history
const filteredHistory = computed(() => urlStore.filteredHistory)
</script>

<style scoped>
.url-table-container {
  width: 100%;
  margin-top: 16px;
}

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

.url-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.url-text {
  flex: 1;
  max-width: calc(100% - 120px); /* Space reserved for action buttons */
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

.action-cell {
  display: flex;
  justify-content: center;
  gap: 8px;
}

:deep(.el-button.action-button) {
  height: 32px;
  width: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  border-color: #e4e7ed;
}

:deep(.el-button.action-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #c0c4cc;
}

:deep(.el-button.action-button .el-icon) {
  font-size: 14px;
}

:deep(.el-button.action-button.el-button--danger) {
  background-color: #fff;
  border-color: #e4e7ed;
  color: #f56c6c;
}

:deep(.el-button.action-button.el-button--danger:hover) {
  background-color: #fef0f0;
  border-color: #f56c6c;
  color: #f56c6c;
}

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