<template>
  <div class="input-footer">
    <div class="url-count" v-if="urlCount > 0">
      已輸入 {{ urlCount }} 個網址
    </div>
    <div class="action-buttons">
      <el-button 
        @click="$emit('submit')" 
        :disabled="!hasUrl || loading" 
        class="submit-btn" 
        :loading="loading"
        type="primary"
        plain
      >
        <el-icon><Download /></el-icon> 開始下載
      </el-button>
      
      <el-tooltip content="在瀏覽器中打開" placement="top" v-if="hasUrl">
        <el-button
          @click="$emit('open-browser')"
          class="open-button"
          :disabled="!hasUrl || loading"
          plain
        >
          <el-icon><Link /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Link, Download } from '@element-plus/icons-vue'

defineProps({
  urlCount: {
    type: Number,
    default: 0
  },
  hasUrl: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['open-browser', 'submit'])
</script>

<style scoped>
.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-top: 1px solid #ebeef5;
  background-color: #f8f9fb;
  border-radius: 0 0 6px 6px;
  box-sizing: border-box;
}

.url-count {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.url-count::before {
  content: "";
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #67c23a;
  margin-right: 6px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.submit-btn {
  padding: 0 14px;
  height: 34px;
  font-size: 14px;
  font-weight: 500;
}

.open-button {
  padding: 0;
  height: 34px;
  width: 34px;
  font-size: 13px;
  border-color: #dcdee2;
  border-radius: 50%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .input-footer {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
    padding: 8px 12px;
  }
  
  .action-buttons {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }
  
  .submit-btn {
    flex: 1;
  }
  
  .open-button {
    width: 34px;
  }
}

@media (max-width: 576px) {
  .input-footer {
    padding: 8px 6px;
  }
}
</style> 