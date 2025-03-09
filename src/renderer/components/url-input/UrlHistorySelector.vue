<template>
  <div class="url-select-area">
    <div class="select-row">
      <el-select
        v-model="selectedUrls"
        multiple
        filterable
        placeholder="從歷史記錄中選擇網址..."
        class="url-select"
        :disabled="disabled"
        @change="handleUrlSelect"
      >
        <template #prefix>
          <el-icon class="select-prefix-icon"><Clock /></el-icon>
        </template>
        <el-option
          v-for="item in history"
          :key="item.url"
          :label="item.label || item.url"
          :value="item.url"
        >
          <div class="url-option">
            <div class="url-option-header">
              <span class="url-option-label">{{ item.label || '未命名' }}</span>
              <el-tag 
                v-if="isUrlInTextarea(item.url)" 
                size="small" 
                type="success" 
                class="url-in-textarea-tag"
                @click.stop="handleUrlOptionClick(item.url)"
              >
                <div class="tag-content">
                  <el-icon><Check /></el-icon> 已添加
                </div>
              </el-tag>
            </div>
            <span class="url-option-url">{{ item.url }}</span>
          </div>
        </el-option>
      </el-select>
      
      <el-button
        v-if="selectedUrls.length > 0"
        @click="addSelectedUrls"
        class="add-selected-btn"
        :disabled="disabled"
        circle
        plain
      >
        <el-icon><Plus /></el-icon>
      </el-button>
      
      <div v-if="selectedUrls.length > 0" class="selected-count">
        {{ selectedUrls.length }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Check, Clock, Plus } from '@element-plus/icons-vue'

interface HistoryItem {
  url: string
  label: string
  error?: string
}

const props = defineProps({
  history: {
    type: Array as () => HistoryItem[],
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  currentUrls: {
    type: Array as () => string[],
    required: true
  }
})

const emit = defineEmits(['add-urls', 'remove-url', 'select-change'])

const selectedUrls = ref<string[]>([])

// 檢查URL是否已經在文本框中
const isUrlInTextarea = (urlToCheck: string) => {
  return props.currentUrls.includes(urlToCheck)
}

// 處理URL選擇變化
const handleUrlSelect = (values: string[]) => {
  selectedUrls.value = values
  emit('select-change', values)
}

// 添加選中的URL
const addSelectedUrls = () => {
  if (selectedUrls.value.length === 0) return
  
  // 過濾掉已存在的URL
  const newUrls = selectedUrls.value.filter(url => !props.currentUrls.includes(url))
  
  if (newUrls.length > 0) {
    emit('add-urls', newUrls)
  }
  
  // 清空選擇
  selectedUrls.value = []
}

// 處理URL選項標籤點擊（移除已添加的URL）
const handleUrlOptionClick = (urlToRemove: string) => {
  emit('remove-url', urlToRemove)
  
  // 更新選中的URL列表
  selectedUrls.value = selectedUrls.value.filter(u => u !== urlToRemove)
}

// 監聽 currentUrls 變化，更新選中的 URL 列表
watch(() => props.currentUrls, () => {
  if (selectedUrls.value.length > 0) {
    selectedUrls.value = selectedUrls.value.filter(url => !isUrlInTextarea(url))
  }
}, { deep: true })
</script>

<style scoped>
/* URL選擇區域 */
.url-select-area {
  margin-bottom: 14px;
  background-color: #f8f9fb;
  border-radius: 6px;
  padding: 10px;
  border: 1px solid #ebeef5;
  box-sizing: border-box;
}

.select-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.url-select {
  flex: 1;
}

.select-prefix-icon {
  color: #409EFF;
  margin-right: 4px;
}

.url-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0;
}

.url-option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.url-option-label {
  font-weight: 500;
  color: #17233d;
}

.url-in-textarea-tag {
  font-size: 11px;
  padding: 0 4px;
  height: 18px;
  line-height: 16px;
  background-color: #f0f9eb;
  border-color: #e1f3d8;
  color: #67c23a;
  cursor: pointer;
}

.tag-content {
  display: flex;
  align-items: center;
  gap: 2px;
}

.url-option-url {
  font-size: 12px;
  color: #808695;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-selected-btn {
  flex-shrink: 0;
  font-size: 13px;
}

.selected-count {
  font-size: 13px;
  color: #606266;
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .url-select-area {
    padding: 8px;
  }
}

@media (max-width: 576px) {
  .url-select-area {
    padding: 8px 6px;
  }
  
  .select-row {
    gap: 6px;
  }
}
</style> 