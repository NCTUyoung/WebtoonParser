<template>
  <div class="save-path-settings">
    <el-input
      v-model="displayPath"
      placeholder="選擇儲存目錄"
      readonly
      class="path-input"
    >
      <template #append>
        <el-button @click="selectDirectory">選擇目錄</el-button>
      </template>
    </el-input>
    
    <el-form label-position="top">
      <el-form-item label="自定義文件名 (可選)" class="filename-form-item">
        <div class="filename-input-group">
          <el-select
            v-model="selectedExistingFile"
            placeholder="選擇現有文件"
            clearable
            filterable
            :loading="loadingFiles"
            @change="handleExistingFileSelect"
            class="existing-file-select"
            no-data-text="目錄中無 Excel 文件或無法讀取"
          >
            <el-option
              v-for="file in existingFiles"
              :key="file"
              :label="file"
              :value="file"
            />
          </el-select>
          
          <el-input 
            v-model="internalFilename" 
            placeholder="或輸入新文件名 (不含 .xlsx)"
            clearable
            class="new-filename-input"
          />
        </div>
         <div class="el-form-item__description">
          選擇或輸入文件名。若留空，將使用默認命名規則。
        </div>
      </el-form-item>

      <el-form-item label="儲存模式" class="append-mode-form-item">
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
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import { ElInput, ElButton, ElForm, ElFormItem, ElSwitch, ElSelect, ElOption, ElIcon, ElTooltip } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  appendMode: {
    type: Boolean,
    default: false
  },
  filename: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'update:appendMode', 'update:filename'])

const displayPath = ref(props.modelValue)
const appendModeLocal = ref(props.appendMode)
const existingFiles = ref<string[]>([])
const loadingFiles = ref(false)
const selectedExistingFile = ref<string>('')

const internalFilename = computed({
  get: () => props.filename || '',
  set: (value) => {
    if (selectedExistingFile.value) {
      selectedExistingFile.value = ''
    }
    emit('update:filename', value)
  }
})

const fetchExistingFiles = async (dirPath: string) => {
  if (!dirPath) {
    existingFiles.value = []
    return
  }
  loadingFiles.value = true
  try {
    const files = await window.electron.invoke('list-excel-files', dirPath)
    existingFiles.value = files || []
    selectedExistingFile.value = ''
  } catch (error) {
    console.error('Failed to list Excel files:', error)
    existingFiles.value = []
  } finally {
    loadingFiles.value = false
  }
}

watch(() => props.modelValue, (newValue) => {
  displayPath.value = newValue
  fetchExistingFiles(newValue)
})

watch(() => props.appendMode, (newValue) => {
  appendModeLocal.value = newValue
})

watch(() => props.filename, (newValue) => {
  if (existingFiles.value.includes(newValue + '.xlsx')) {
    selectedExistingFile.value = newValue + '.xlsx'
  } else if (internalFilename.value === newValue) {
    selectedExistingFile.value = ''
  }
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

const handleExistingFileSelect = (selectedFile: string | number | boolean | Record<string, any> | undefined) => {
  const fileStr = selectedFile as string
  if (fileStr) {
    const filenameWithoutExt = fileStr.replace(/\.xlsx$/i, '')
    emit('update:filename', filenameWithoutExt)
  }
}

onMounted(() => {
  displayPath.value = props.modelValue
  appendModeLocal.value = props.appendMode
  fetchExistingFiles(props.modelValue)
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

.filename-input-group {
  display: flex;
  gap: 8px;
}

.existing-file-select {
  flex: 1;
}

.new-filename-input {
  flex: 2;
}

.filename-form-item .el-form-item__description {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: normal;
  width: 100%;
}

.append-mode-form-item {
  margin-top: 16px;
}

.append-mode-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.help-icon {
  color: #909399;
  font-size: 14px;
  cursor: help;
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