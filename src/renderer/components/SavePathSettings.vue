<template>
  <div class="save-path-settings">
    <el-input
      v-model="displayPath"
      placeholder="選擇儲存位置"
      readonly
      class="path-input"
    >
      <template #append>
        <el-button @click="selectDirectory">
          選擇目錄
        </el-button>
      </template>
    </el-input>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const displayPath = ref(props.modelValue)

// 監聽外部值的變化
watch(() => props.modelValue, (newValue) => {
  displayPath.value = newValue
})

const selectDirectory = async () => {
  try {
    const result = await window.electron.invoke('select-directory')
    if (result) {
      displayPath.value = result
      emit('update:modelValue', result)
    }
  } catch (error) {
    console.error('Failed to select directory:', error)
  }
}
</script>

<style scoped>
.save-path-settings {
  width: 100%;
}

.path-input {
  width: 100%;
}
</style> 