<template>
  <div class="url-input-container">
    <el-card class="url-card">
      <template #header>
        <div class="card-header">
          <span class="header-title">
            <i class="el-icon-link"></i>
            Webtoon 網址
          </span>
          <el-button 
            type="primary" 
            :icon="isLoading ? 'el-icon-loading' : 'el-icon-download'"
            :loading="isLoading"
            @click="handleStartScraping"
          >
            立即爬取
          </el-button>
        </div>
      </template>
      
      <el-input
        v-model="value"
        type="textarea"
        :rows="4"
        :maxlength="500"
        show-word-limit
        placeholder="請輸入Webtoon URL，每行一個"
        :disabled="isLoading"
      />
      
      <div class="url-tips">
        <el-alert
          type="info"
          :closable="false"
          show-icon
        >
          範例: https://www.webtoons.com/zh-hant/bl-gl/friday-night/list?title_no=6875
        </el-alert>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'

// 接收父組件傳來的 modelValue
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

// 為了實現 v-model 的雙向綁定，定義 emit 事件
const emit = defineEmits(['update:modelValue'])

// 通過 computed 屬性來讀寫 modelValue
const value = computed({
  get: () => props.modelValue,
  set: (val: string) => emit('update:modelValue', val)
})

const isLoading = ref(false)

const handleStartScraping = async () => {
  if (!value.value.trim()) {
    ElMessage.warning('請輸入至少一個URL')
    return
  }
  
  // 分割多個 URL
  const urls = value.value.split('\n').map(u => u.trim()).filter(u => u)
  
  for (const singleUrl of urls) {
    console.log('開始爬取:', singleUrl)
    await window.electron.startScraping(singleUrl)
  }
  
  ElMessage.success(`完成爬取 ${urls.length} 個作品`)
}

// 提供給父組件的方法
defineExpose({
  setLoading: (loading: boolean) => {
    isLoading.value = loading
  }
})
</script>

<style scoped>
.url-input-container {
  margin-bottom: 20px;
}

.url-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title i {
  font-size: 18px;
  color: #409EFF;
}

.url-tips {
  margin-top: 8px;
}

:deep(.el-textarea__inner) {
  font-family: monospace;
  line-height: 1.6;
}

:deep(.el-alert) {
  margin: 0;
}
</style> 