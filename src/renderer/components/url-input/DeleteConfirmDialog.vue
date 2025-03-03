<template>
  <el-dialog
    v-model="dialogVisible"
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
            @click="closeDialog"
            circle
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
      <div v-if="item" class="delete-item-container">
        <div class="delete-item-info">
          <strong>{{ item.label || '未命名' }}</strong>
          <div class="delete-item-url">{{ item.url }}</div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeDialog" class="custom-btn">取消</el-button>
        <el-button type="danger" @click="confirmDelete" class="custom-btn danger-btn">
          <el-icon><Delete /></el-icon> 確認刪除
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Delete, Warning, Close } from '@element-plus/icons-vue'

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
  item: {
    type: Object as () => HistoryItem | null,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const closeDialog = () => {
  dialogVisible.value = false
}

const confirmDelete = () => {
  emit('confirm')
  closeDialog()
}
</script>

<style scoped>
/* 对话框样式 */
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

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

/* 删除确认对话框样式 */
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

/* 按钮样式 */
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

.danger-btn {
  background-color: #f56c6c;
  border-color: #f56c6c;
}

.danger-btn:hover {
  background-color: #f78989;
  border-color: #f78989;
}

/* 对话框内容区域样式 */
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
</style> 