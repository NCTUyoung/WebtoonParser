<template>
  <div class="url-input-container">
    <el-input
      v-model="inputValue"
      type="textarea"
      :rows="5"
      :maxlength="500"
      :show-word-limit="true"
      placeholder="請輸入 Webtoon 網址，每行一個"
      :disabled="loading"
    />
    <div class="url-example" v-if="showExample">
      <el-alert
        type="info"
        :closable="false"
      >
        <template #default>
          <i class="el-icon-info"></i>
          範例: https://www.webtoons.com/zh-hant/bl-gl/friday-night/list?title_no=6875
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

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

watch(() => props.modelValue, (newValue) => {
  inputValue.value = newValue
})

watch(inputValue, (newValue) => {
  emit('update:modelValue', newValue)
})

// 設置 loading 狀態的方法
const setLoading = (value: boolean) => {
  loading.value = value
}

// 暴露方法給父組件
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
</style> 