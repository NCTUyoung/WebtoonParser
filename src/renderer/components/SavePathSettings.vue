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
    
    <div class="append-mode-container">
      <el-switch
        v-model="appendModeLocal"
        @change="updateAppendMode"
        active-color="#13ce66"
        inactive-color="#909399"
        active-text="附加模式"
        inactive-text="覆蓋模式"
      />
      <el-tooltip content="附加模式會將新數據添加到現有Excel文件中，而不是覆蓋它" placement="top">
        <el-icon class="help-icon"><QuestionFilled /></el-icon>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  appendMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'update:appendMode'])

const displayPath = ref(props.modelValue)
const appendModeLocal = ref(props.appendMode)

// 監聽外部值的變化
watch(() => props.modelValue, (newValue) => {
  displayPath.value = newValue
})

// 監聽 appendMode 變化
watch(() => props.appendMode, (newValue) => {
  appendModeLocal.value = newValue
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

// 更新 append 模式
const updateAppendMode = () => {
  console.log('SavePathSettings: 附加模式變更為:', appendModeLocal.value ? '開啟' : '關閉')
  emit('update:appendMode', appendModeLocal.value)
  
  // 保存到 localStorage
  try {
    localStorage.setItem('webtoon-parser-append-mode', appendModeLocal.value.toString())
  } catch (e) {
    console.error('保存 appendMode 設置失敗', e)
  }
}

// 組件掛載時從 localStorage 加載 appendMode 設置
onMounted(() => {
  try {
    const savedAppendMode = localStorage.getItem('webtoon-parser-append-mode')
    if (savedAppendMode !== null) {
      appendModeLocal.value = savedAppendMode === 'true'
      emit('update:appendMode', appendModeLocal.value)
    }
  } catch (e) {
    console.error('加載 appendMode 設置失敗', e)
  }
})
</script>

<style scoped>
.save-path-settings {
  width: 100%;
}

.path-input {
  width: 100%;
  margin-bottom: 12px;
}

.append-mode-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.help-icon {
  color: #909399;
  font-size: 14px;
  cursor: pointer;
  margin-left: 4px;
}

:deep(.el-switch) {
  --el-switch-on-color: #13ce66;
  --el-switch-off-color: #909399;
}

:deep(.el-switch__label) {
  color: #606266;
  font-size: 13px;
  font-weight: 500;
}

:deep(.el-switch__label.is-active) {
  color: #13ce66;
}

:deep(.el-switch.is-checked .el-switch__core) {
  border-color: #13ce66;
  background-color: #13ce66;
}
</style> 