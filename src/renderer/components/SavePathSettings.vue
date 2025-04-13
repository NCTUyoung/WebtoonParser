<template>
  <div class="save-path-settings">
    <!-- Save path selection area -->
    <div class="settings-section path-section">
      <div class="section-header">
        <h3>儲存位置</h3>
      </div>
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
    </div>

    <!-- File settings area -->
    <div class="settings-section file-section">
      <div class="section-header">
        <h3>檔案設定</h3>
      </div>

      <div class="settings-content">
        <!-- Filename settings -->
        <div class="filename-setting">
          <div class="setting-label">
            <span>檔案名稱</span>
            <el-tooltip content="留空使用默認命名規則。如選擇現有檔案則會更新該檔案。" placement="top">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>

          <div class="filename-controls">
            <el-input
              v-model="customFilename"
              placeholder="輸入檔案名稱 (不含 .xlsx)"
              clearable
              class="filename-input"
            >
              <template #append>
                <el-popover
                  placement="bottom"
                  :width="300"
                  trigger="click"
                  popper-class="files-popover"
                >
                  <template #reference>
                    <el-button :disabled="!existingFiles.length">
                      選擇現有檔案
                      <el-icon v-if="loadingFiles" class="is-loading"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M512 64a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32zm0 640a32 32 0 0 1 32 32v192a32 32 0 1 1-64 0V736a32 32 0 0 1 32-32zm448-192a32 32 0 0 1-32 32H736a32 32 0 1 1 0-64h192a32 32 0 0 1 32 32zm-640 0a32 32 0 0 1-32 32H96a32 32 0 0 1 0-64h192a32 32 0 0 1 32 32zM195.2 195.2a32 32 0 0 1 45.248 0L376.32 331.008a32 32 0 0 1-45.248 45.248L195.2 240.448a32 32 0 0 1 0-45.248zm452.544 452.544a32 32 0 0 1 45.248 0L828.8 783.552a32 32 0 0 1-45.248 45.248L647.744 692.992a32 32 0 0 1 0-45.248zM828.8 195.264a32 32 0 0 1 0 45.184L692.992 376.32a32 32 0 0 1-45.248-45.248l135.808-135.808a32 32 0 0 1 45.248 0zm-452.544 452.48a32 32 0 0 1 0 45.248L240.448 828.8a32 32 0 0 1-45.248-45.248l135.808-135.808a32 32 0 0 1 45.248 0z"></path></svg></el-icon>
                    </el-button>
                  </template>

                  <div class="existing-files-list">
                    <h4>現有檔案 <el-button size="small" icon="Refresh" circle @click="refreshFileList" /></h4>

                    <div v-if="existingFiles.length === 0" class="no-files">
                      <p v-if="loadingFiles">正在加載...</p>
                      <p v-else>目錄中未找到 Excel 檔案</p>
                    </div>

                    <el-scrollbar max-height="200px">
                      <div
                        v-for="file in existingFiles"
                        :key="file"
                        class="file-item"
                        @click="handleExistingFileSelect(file)"
                      >
                        <el-icon><Document /></el-icon>
                        <span>{{ file }}</span>
                      </div>
                    </el-scrollbar>
                  </div>
                </el-popover>
              </template>
            </el-input>
          </div>
        </div>

        <!-- Save mode settings -->
        <div class="append-mode-setting">
          <div class="setting-label">
            <span>保存模式</span>
            <el-tooltip content="附加模式會將新數據添加到現有Excel文件中，覆蓋模式會替換原文件內容" placement="top">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>

          <div class="mode-selector">
            <el-radio-group v-model="modeType" size="large" @change="handleAppendModeChange">
              <el-radio-button value="append">
                <el-icon><Plus /></el-icon> 附加模式
              </el-radio-button>
              <el-radio-button value="overwrite">
                <el-icon><Refresh /></el-icon> 覆蓋模式
              </el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { QuestionFilled, Document, Plus, Refresh } from '@element-plus/icons-vue'
import { ElInput, ElButton, ElTooltip, ElIcon, ElPopover, ElScrollbar, ElRadioGroup, ElRadioButton } from 'element-plus'
import { useSettingsStore } from '../stores'

// Initialize settings store
const settingsStore = useSettingsStore()

// Direct use of store state
const displayPath = computed({
  get: () => settingsStore.savePath,
  set: (value) => {
    settingsStore.savePath = value
  }
})

// Convert boolean value to radio button value
const modeType = computed({
  get: () => settingsStore.appendMode ? 'append' : 'overwrite',
  set: (value) => {
    settingsStore.appendMode = value === 'append'
  }
})

const appendMode = computed({
  get: () => settingsStore.appendMode,
  set: (value) => {
    settingsStore.appendMode = value
  }
})

const customFilename = computed({
  get: () => settingsStore.customFilename,
  set: (value) => {
    settingsStore.customFilename = value
    selectedExistingFile.value = ''
  }
})

const existingFiles = ref<string[]>([])
const loadingFiles = ref(false)
const selectedExistingFile = ref<string>('')

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

watch(() => displayPath.value, (newValue) => {
  fetchExistingFiles(newValue)
  settingsStore.saveSavePath()
})

watch(() => customFilename.value, (newValue) => {
  if (existingFiles.value.includes(newValue + '.xlsx')) {
    selectedExistingFile.value = newValue + '.xlsx'
  } else {
    selectedExistingFile.value = ''
  }
  settingsStore.saveCustomFilename()
})

// Watch appendMode changes
watch(() => appendMode.value, () => {
  settingsStore.saveAppendMode()
})

const selectDirectory = async () => {
  try {
    const result = await window.electron.invoke('select-directory')
    if (result) {
      displayPath.value = result
    }
  } catch (error) {
    console.error('Failed to select directory:', error)
  }
}

const handleAppendModeChange = () => {
  console.log('SavePathSettings: Append mode changed to:', appendMode.value ? 'on' : 'off')
  settingsStore.saveAppendMode()
}

const handleExistingFileSelect = (selectedFile: string | any) => {
  const fileStr = typeof selectedFile === 'string' ? selectedFile : selectedFile?.toString()
  if (fileStr) {
    const filenameWithoutExt = fileStr.replace(/\.xlsx$/i, '')
    customFilename.value = filenameWithoutExt
  }
}

const refreshFileList = () => {
  if (displayPath.value) {
    fetchExistingFiles(displayPath.value)
  }
}

onMounted(() => {
  // Ensure settings are loaded
  settingsStore.loadSettings().then(() => {
    fetchExistingFiles(displayPath.value)
  })
})
</script>

<style scoped>
.save-path-settings {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-section {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.section-header {
  margin-bottom: 12px;
}

.section-header h3 {
  font-size: 16px;
  margin: 0;
  color: #17233d;
  font-weight: 500;
}

.path-input {
  width: 100%;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filename-setting, .append-mode-setting {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #606266;
  gap: 4px;
}

.help-icon {
  color: #909399;
  font-size: 14px;
  cursor: help;
}

.filename-controls {
  display: flex;
  gap: 8px;
}

.filename-input {
  width: 100%;
}

.mode-selector {
  padding-top: 6px;
}

.file-item {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.file-item:hover {
  background-color: #f0f7ff;
}

.file-item .el-icon {
  color: #409EFF;
}

.existing-files-list h4 {
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.no-files {
  padding: 20px;
  text-align: center;
  color: #909399;
}

:deep(.el-radio-button__inner) {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 768px) {
  .mode-selector {
    width: 100%;
  }

  :deep(.el-radio-group) {
    width: 100%;
    display: flex;
  }

  :deep(.el-radio-button) {
    flex: 1;
  }

  :deep(.el-radio-button__inner) {
    width: 100%;
    justify-content: center;
  }
}
</style>

<style>
/* Global styles */
.files-popover .el-scrollbar__bar.is-horizontal {
  display: none;
}

.files-popover .el-popover__title {
  font-weight: 500;
  margin-bottom: 12px;
}
</style>