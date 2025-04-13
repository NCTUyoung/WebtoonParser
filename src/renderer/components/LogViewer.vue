<template>
  <div class="log-container">
    <div class="log-content" ref="logContent">
      <div v-for="(log, index) in logs"
           :key="index"
           class="log-line"
           :class="getLogClass(log)">
        <span class="log-time">{{ log.time }}</span>
        <span class="log-message">{{ log.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  logs: {
    type: Array,
    default: () => []
  }
})

const logContent = ref(null)

// Set different styles based on log content
const getLogClass = (log) => {
  if (log.message.includes('成功')) return 'success'
  if (log.message.includes('開始')) return 'info'
  if (log.message.includes('錯誤') || log.message.includes('失敗')) return 'error'
  return ''
}

// Watch log changes and auto scroll to bottom
watch(() => props.logs, async () => {
  await nextTick()
  if (logContent.value) {
    logContent.value.scrollTop = logContent.value.scrollHeight
  }
}, { deep: true })
</script>

<style scoped>
.log-container {
  margin: 10px 0;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #1e1e1e;  /* 深色背景 */
}

.log-content {
  height: 300px;
  max-height: 50vh;
  overflow-y: auto;
  padding: 10px;
  padding-bottom: 15px; /* 增加底部內邊距 */
  font-family: 'Consolas', monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #d4d4d4;  /* 默認文字顏色 */
}

.log-line {
  line-height: 1.5;
  margin: 4px 0;
  display: flex;
  gap: 10px;
}

.log-time {
  color: #858585;
  min-width: 95px;
}

/* 不同類型日誌的顏色 */
.success .log-message {
  color: #4caf50;  /* 綠色 */
}

.info .log-message {
  color: #2196f3;  /* 藍色 */
}

.error .log-message {
  color: #f44336;  /* 紅色 */
}

/* 自定義滾動條樣式 */
.log-content::-webkit-scrollbar {
  width: 8px;
}

.log-content::-webkit-scrollbar-track {
  background: #2d2d2d;
  border-radius: 4px;
}

.log-content::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.log-content::-webkit-scrollbar-thumb:hover {
  background: #666;
}
</style>