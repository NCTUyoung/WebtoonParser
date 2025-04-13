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
      <div v-if="urlStore.itemToDelete" class="delete-item-container">
        <div class="delete-item-info">
          <strong>{{ urlStore.itemToDelete.label || '未命名' }}</strong>
          <div class="delete-item-url">{{ urlStore.itemToDelete.url }}</div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeDialog" class="custom-btn">取消</el-button>
        <el-button type="danger" @click="handleConfirmDelete" class="custom-btn danger-btn">
          <el-icon><Delete /></el-icon> 確認刪除
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Delete, Warning, Close } from '@element-plus/icons-vue'
import { useUrlStore } from '../../stores/urlStore'
import { ElMessage } from 'element-plus'

// 使用Pinia Store
const urlStore = useUrlStore()

// 计算属性：控制对话框显示状态
const dialogVisible = computed({
  get: () => urlStore.deleteConfirmVisible,
  set: (value) => {
    if (!value) {
      urlStore.cancelDelete()
    }
  }
})

// 关闭对话框
const closeDialog = () => {
  urlStore.cancelDelete()
}

// 确认删除
const handleConfirmDelete = () => {
  urlStore.confirmDelete()
  ElMessage.success('網址已刪除')
}
</script>

<style scoped>
/* Dialog styles */
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

/* Delete confirmation dialog styles */
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

/* Unified button styles */
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

.danger-btn {
  background-color: #f56c6c;
  border-color: transparent;
  color: #fff;
}

.danger-btn:hover {
  background-color: #f78989;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.25);
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

/* Dialog content area styles */
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