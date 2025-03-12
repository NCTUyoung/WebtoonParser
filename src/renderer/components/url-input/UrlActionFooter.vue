<template>
  <div class="input-footer">
    <div class="left-section">
      <div class="url-count" v-if="urlCount > 0">
        已輸入 {{ urlCount }} 個網址
      </div>
    </div>
    
    <div class="right-section">
      <div class="button-group">
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Link, Download } from '@element-plus/icons-vue'

const props = defineProps({
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

const emit = defineEmits(['open-browser', 'submit'])
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

.left-section {
  display: flex;
  align-items: center;
}

.right-section {
  display: flex;
  gap: 16px;
  align-items: center;
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

.button-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.submit-btn {
  padding: 0 14px;
  height: 34px;
  font-size: 14px;
  font-weight: 500;
  min-width: 120px;
}

.open-button {
  padding: 0;
  height: 34px;
  width: 34px;
  font-size: 16px;
  border: 1px solid #dcdee2;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #606266;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .input-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    padding: 12px;
  }
  
  .right-section {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }
  
  .button-group {
    width: 100%;
    justify-content: space-between;
  }
  
  .submit-btn {
    flex: 1;
  }
}

@media (max-width: 576px) {
  .input-footer {
    padding: 10px 8px;
  }
  
  .left-section {
    width: 100%;
    justify-content: center;
    margin-bottom: 4px;
  }
}
</style> 