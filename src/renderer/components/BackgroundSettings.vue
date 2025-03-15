<template>
  <div class="background-settings">
    <!-- Help toggle button -->
    <div class="help-toggle-container">
      <el-button 
        link
        class="help-toggle-btn" 
        @click="toggleHelp"
      >
        <el-icon v-if="showHelp"><ArrowDown /></el-icon>
        <el-icon v-else><QuestionFilled /></el-icon>
        <span>{{ showHelp ? '隱藏說明' : '顯示說明' }}</span>
      </el-button>
    </div>
    
    <!-- Help content -->
    <div class="help-guide-container" :class="{ 'has-content': showHelp }">
      <transition name="fade">
        <div v-if="showHelp" class="help-section">
          <div class="help-header">
            <div class="help-title">
              <el-icon><InfoFilled /></el-icon>
              <span>背景設置說明</span>
            </div>
          </div>
          
          <div class="help-content">
            <div class="help-category">
              <div class="category-title">背景類型</div>
              <div class="tips-list">
                <div class="tip-item">
                  <strong>預設背景：</strong>使用系統預設的漸變背景
                </div>
                <div class="tip-item">
                  <strong>自定義圖片：</strong>上傳您喜歡的圖片作為背景
                </div>
              </div>
            </div>
            
            <div class="help-category">
              <div class="category-title">使用提示</div>
              <div class="tips-list">
                <div class="tip-item">建議使用高解析度、淺色系的圖片作為背景</div>
                <div class="tip-item">圖片會自動調整透明度，以確保界面元素清晰可見</div>
                <div class="tip-item">您可以隨時切換回預設背景</div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
    
    <div class="settings-main">
      <!-- Background type selection -->
      <div class="type-selection">
        <el-radio-group v-model="backgroundType" @change="handleTypeChange">
          <el-radio value="default">預設背景</el-radio>
          <el-radio value="custom">自定義圖片</el-radio>
        </el-radio-group>
      </div>
      
      <!-- Custom image upload section -->
      <div v-if="backgroundType === 'custom'" class="custom-image-section">
        <div class="upload-container">
          <el-upload
            class="image-uploader"
            :show-file-list="false"
            :before-upload="beforeUpload"
            :http-request="handleCustomUpload"
          >
            <div v-if="imageUrl" class="image-preview">
              <img :src="imageUrl" class="preview-image" />
              <div class="preview-overlay">
                <el-icon><Edit /></el-icon>
                <span>更換圖片</span>
              </div>
            </div>
            <div v-else class="upload-placeholder">
              <el-icon><Plus /></el-icon>
              <span>點擊上傳圖片</span>
            </div>
          </el-upload>
        </div>
        
        <div class="image-settings">
          <div class="setting-item">
            <span class="setting-label">透明度</span>
            <el-slider 
              v-model="opacity" 
              :min="0.1" 
              :max="1" 
              :step="0.05" 
              :format-tooltip="(val: number) => Math.round(val * 100) + '%'"
              @change="handleOpacityChange"
            />
          </div>
          
          <div class="setting-item">
            <span class="setting-label">模糊效果</span>
            <el-slider 
              v-model="blurAmount" 
              :min="0" 
              :max="20" 
              :step="1" 
              :format-tooltip="(val: number) => val + 'px'"
              @change="handleBlurChange"
            />
          </div>
        </div>
      </div>
      
      <!-- Preview and actions -->
      <div class="actions">
        <el-button 
          type="primary" 
          @click="applySettings"
          :disabled="!hasChanges"
        >
          應用設置
        </el-button>
        
        <el-button 
          v-if="backgroundType === 'custom' && imageUrl" 
          @click="resetSettings"
        >
          重置設置
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, QuestionFilled, InfoFilled, Edit, Plus } from '@element-plus/icons-vue'

// Define props and emits
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      type: 'default',
      imageUrl: '',
      opacity: 0.8,
      blur: 0
    })
  }
})

const emit = defineEmits(['update:modelValue', 'apply'])

// Local state
const backgroundType = ref(props.modelValue.type || 'default')
const imageUrl = ref(props.modelValue.imageUrl || '')
const opacity = ref(props.modelValue.opacity || 0.8)
const blurAmount = ref(props.modelValue.blur || 0)
const originalSettings = ref({ ...props.modelValue })
const showHelp = ref(false)

// Computed properties
const hasChanges = computed(() => {
  return backgroundType.value !== originalSettings.value.type ||
    imageUrl.value !== originalSettings.value.imageUrl ||
    opacity.value !== originalSettings.value.opacity ||
    blurAmount.value !== originalSettings.value.blur
})

// Methods
const toggleHelp = () => {
  showHelp.value = !showHelp.value
  
  nextTick(() => {
    if (showHelp.value) {
      // Logic when showing help
    } else {
      // Logic when hiding help
    }
  })
}

const handleTypeChange = () => {
  if (backgroundType.value === 'default') {
    // Reset image settings when switching to default
    imageUrl.value = ''
  }
}

const beforeUpload = (file: File) => {
  // Validate file type
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上傳圖片文件！')
    return false
  }
  
  // Validate file size (max 5MB)
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('圖片大小不能超過 5MB！')
    return false
  }
  
  return true
}

const handleCustomUpload = async (options: any) => {
  const file = options.file
  
  try {
    // 先转换为base64
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = async (e) => {
      if (e.target?.result) {
        const dataUrl = e.target.result as string
        
        try {
          // 创建一个简单的数据URL，避免传递复杂对象
          const simpleDataUrl = dataUrl.toString()
          
          // 调用主进程保存图片并获取文件URL
          const fileUrl = await window.electron.invoke('upload-background-image', simpleDataUrl)
          
          // 更新本地状态
          imageUrl.value = fileUrl
          ElMessage.success('圖片上傳成功')
        } catch (error) {
          console.error('Failed to save image:', error)
          ElMessage.error(`圖片保存失敗: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    }
  } catch (error) {
    console.error('Image upload error:', error)
    ElMessage.error(`圖片上傳失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const handleOpacityChange = (value: number) => {
  opacity.value = value
}

const handleBlurChange = (value: number) => {
  blurAmount.value = value
}

const applySettings = () => {
  const settings = {
    type: backgroundType.value,
    imageUrl: imageUrl.value,
    opacity: opacity.value,
    blur: blurAmount.value
  }
  
  emit('update:modelValue', settings)
  emit('apply', settings)
  
  // Update original settings to track changes
  originalSettings.value = { ...settings }
  
  ElMessage.success('背景設置已應用')
}

const resetSettings = () => {
  // 如果是自定义背景，先尝试删除图片文件
  if (backgroundType.value === 'custom' && imageUrl.value) {
    // 调用主进程重置背景图片
    window.electron.invoke('reset-background-image')
      .then(() => {
        // 重置本地状态
        backgroundType.value = 'default'
        imageUrl.value = ''
        opacity.value = 0.8
        blurAmount.value = 0
        originalSettings.value = {
          type: 'default',
          imageUrl: '',
          opacity: 0.8,
          blur: 0
        }
        
        // 通知父组件
        emit('update:modelValue', originalSettings.value)
        
        ElMessage.success('背景設置已重置')
      })
      .catch(error => {
        console.error('Failed to reset background image:', error)
        ElMessage.error('重置背景設置失敗')
      })
  } else {
    // 如果不是自定义背景，直接重置状态
    backgroundType.value = originalSettings.value.type
    imageUrl.value = originalSettings.value.imageUrl
    opacity.value = originalSettings.value.opacity
    blurAmount.value = originalSettings.value.blur
  }
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (JSON.stringify(newValue) !== JSON.stringify({
    type: backgroundType.value,
    imageUrl: imageUrl.value,
    opacity: opacity.value,
    blur: blurAmount.value
  })) {
    backgroundType.value = newValue.type || 'default'
    imageUrl.value = newValue.imageUrl || ''
    opacity.value = newValue.opacity || 0.8
    blurAmount.value = newValue.blur || 0
    originalSettings.value = { ...newValue }
  }
}, { deep: true })

// Load saved settings on mount
onMounted(() => {
  try {
    const savedShowHelp = localStorage.getItem('background-settings-show-help')
    if (savedShowHelp !== null) {
      showHelp.value = savedShowHelp === 'true'
    }
  } catch (e) {
    console.error('Failed to load preference settings', e)
  }
})

// Save help visibility preference
watch(showHelp, (newValue) => {
  try {
    localStorage.setItem('background-settings-show-help', newValue.toString())
  } catch (e) {
    console.error('Failed to save preference settings', e)
  }
})
</script>

<style scoped>
.background-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

/* Help section styles */
.help-section {
  width: 100%;
  background-color: #f8f9fb;
  border-radius: 6px;
  padding: 10px;
  border: 1px solid #ebeef5;
  box-sizing: border-box;
}

.help-header {
  margin-bottom: 10px;
}

.help-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #409EFF;
}

.help-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.help-category {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.category-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  padding-bottom: 4px;
  border-bottom: 1px solid #ebeef5;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tip-item {
  position: relative;
  padding-left: 16px;
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}

.tip-item::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #409EFF;
}

/* Settings main area */
.settings-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
}

.type-selection {
  margin-bottom: 8px;
}

/* Custom image upload styles */
.custom-image-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
}

.upload-container {
  width: 100%;
}

.image-uploader {
  width: 100%;
}

.image-preview {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.3s;
}

.preview-overlay:hover {
  opacity: 1;
}

.upload-placeholder {
  width: 100%;
  height: 200px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c939d;
  cursor: pointer;
  transition: border-color 0.3s;
}

.upload-placeholder:hover {
  border-color: #409EFF;
}

.upload-placeholder .el-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

/* Image settings styles */
.image-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.setting-label {
  min-width: 60px;
  font-size: 14px;
  color: #606266;
}

/* Actions styles */
.actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

/* Help toggle button styles */
.help-toggle-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.help-toggle-btn {
  font-size: 13px;
  color: #606266;
  padding: 4px 8px;
  height: auto;
  display: flex;
  align-items: center;
  gap: 4px;
}

.help-toggle-btn:hover {
  color: #409EFF;
}

/* Help container styles */
.help-guide-container {
  position: relative;
  min-height: 0;
  transition: min-height 0.5s ease-out;
  will-change: min-height;
  overflow: hidden;
  margin-bottom: 10px;
}

.help-guide-container.has-content {
  min-height: 16px;
}

/* Transition animations */
.fade-enter-active {
  transition: opacity 0.4s ease 0.1s, max-height 0.5s ease;
  max-height: 300px;
  overflow: hidden;
  position: relative;
}

.fade-leave-active {
  transition: opacity 0.3s ease, max-height 0.5s ease 0.1s;
  max-height: 300px;
  overflow: hidden;
  position: relative;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  max-height: 0;
}

/* Responsive styles */
@media (max-width: 768px) {
  .image-preview,
  .upload-placeholder {
    height: 150px;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .setting-label {
    min-width: auto;
  }
}
</style> 