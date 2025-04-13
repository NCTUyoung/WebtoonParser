<template>
  <div class="url-input-container">
    <div class="input-header">
      <div class="input-title">Webtoon 網址</div>
      <div class="input-actions">
        <el-tooltip content="從剪貼簿貼上" placement="top">
          <el-button
            @click="pasteFromClipboard"
            type="primary"
            class="action-button"
            :disabled="loading"
            plain
          >
            <el-icon><DocumentCopy /></el-icon> 貼上
          </el-button>
        </el-tooltip>

        <el-tooltip content="管理網址清單" placement="top">
          <el-button
            @click="showUrlHistory"
            type="primary"
            class="action-button"
            :disabled="loading"
            plain
          >
            <el-icon><Document /></el-icon> 管理
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <div class="input-area">
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

      <!-- Container with fixed height to wrap transition elements -->
      <div class="help-guide-container" :class="{ 'has-content': showHelp }">
        <transition name="fade">
          <url-help-guide v-if="showHelp" class="help-guide-margin" />
        </transition>
      </div>

      <!-- Select URLs from history -->
      <url-history-selector
        :history="urlHistory"
        :disabled="loading"
        :current-urls="currentUrls"
        @add-urls="handleAddUrls"
        @remove-url="handleRemoveUrl"
        @select-change="handleUrlSelect"
      />

      <el-input
        v-model="url"
        type="textarea"
        :rows="3"
        placeholder="請輸入網址，多個網址請換行分隔"
        clearable
        class="url-input"
        :disabled="loading"
      >
      </el-input>
    </div>

    <!-- Action buttons footer -->
    <url-action-footer
      :url-count="getUrlCount()"
      :has-url="!!url"
      :loading="loading"
      @open-browser="openInBrowser"
      @submit="handleSubmit"
    ></url-action-footer>

    <!-- Error message display -->
    <url-error-message :message="error" />

    <!-- URL history dialog -->
    <url-history-dialog
      v-model="historyDialogVisible"
      :history="urlHistory"
      @update:history="updateUrlHistory"
      @open-url="openExternalUrl"
      @add-to-input="addUrlToInput"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentCopy, Document, ArrowDown, QuestionFilled, Download } from '@element-plus/icons-vue'
import UrlHistoryDialog from './url-input/UrlHistoryDialog.vue'
import UrlHelpGuide from './url-input/UrlHelpGuide.vue'
import UrlHistorySelector from './url-input/UrlHistorySelector.vue'
import UrlActionFooter from './url-input/UrlActionFooter.vue'
import UrlErrorMessage from './url-input/UrlErrorMessage.vue'
import { isValidUrl, formatUrl, extractUrlsFromText } from '../utils/urlUtils'
import { useUrlStore } from '../stores'

// Emit events to parent component
const emit = defineEmits(['start-scraping'])

// Initialize URL store
const urlStore = useUrlStore()

// Interface for history items
interface HistoryItem {
  url: string
  label: string
  error?: string
}

// Local state
const error = ref('')
const historyDialogVisible = ref(false)
const loading = ref(false)
const selectedUrls = ref<string[]>([])
const showHelp = ref(false) // Hide help by default

// URL computed property - using store directly
const url = computed({
  get: () => urlStore.currentInput,
  set: (value) => {
    urlStore.currentInput = value
  }
})

// Compute current URLs in the input
const currentUrls = computed(() => {
  if (!url.value) return []
  return url.value.split('\n').filter(line => line.trim())
})

// Get URL count
const getUrlCount = () => {
  return currentUrls.value.length
}

// Set loading state method for external use
const setLoading = (isLoading: boolean) => {
  console.log('UrlInput setLoading:', isLoading)
  loading.value = isLoading
}

// Expose methods to parent components
defineExpose({
  setLoading
})

// History data computed from store
const urlHistory = computed({
  get: () => {
    // Return history array directly as it's already in correct HistoryItem[] format
    return urlStore.history.map(item => {
      // Ensure each item follows HistoryItem interface
      return {
        url: item.url || '',
        label: item.label || ''
      }
    })
  },
  set: (value: HistoryItem[]) => {
    urlStore.history = value
    urlStore.saveUrlHistory()
  }
})

// Handle URL selection change
const handleUrlSelect = (values: string[]) => {
  console.log('URL selection change:', values)
  selectedUrls.value = values
}

// Handle adding URLs
const handleAddUrls = (newUrls: string[]) => {
  const urlsToAdd = newUrls.join('\n')
  const urlCount = newUrls.length

  // If input is empty, set directly
  if (!url.value) {
    url.value = urlsToAdd
  } else {
    // Otherwise add to existing content on new lines
    url.value = `${url.value}\n${urlsToAdd}`
  }

  ElMessage.success(`Added ${urlCount} URLs`)
}

// Handle removing URL
const handleRemoveUrl = (urlToRemove: string) => {
  // Remove URL from the input text
  const lines = url.value.split('\n')
  const filteredLines = lines.filter(line => line.trim() !== urlToRemove)
  url.value = filteredLines.join('\n')

  ElMessage.success('URL removed from input')
}

// Load history from local storage
const loadHistory = async () => {
  await urlStore.loadUrlHistory()
}

// Save history to local storage
const saveHistory = () => {
  urlStore.saveUrlHistory()
}

// Update URL history
const updateUrlHistory = (newHistory: HistoryItem[]) => {
  urlHistory.value = newHistory
  saveHistory()
}

// Handle form submission
const handleSubmit = async () => {
  if (!url.value) {
    error.value = '請輸入網址'
    return
  }

  if (currentUrls.value.length === 0) {
    error.value = '請輸入至少一個有效的網址'
    return
  }

  // Check if each URL is valid
  const invalidUrls = currentUrls.value.filter(u => !isValidUrl(formatUrl(u)))
  if (invalidUrls.length > 0) {
    error.value = `存在無效的網址: ${invalidUrls.join(', ')}`
    return
  }

  error.value = ''
  loading.value = true

  // Make sure URLs are saved to store before scraping
  urlStore.currentInput = url.value

  // Save URLs to storage
  urlStore.saveUrls()

  // Add URLs to history before scraping
  urlStore.addToHistory()

  // Emit event to parent component to handle download logic
  emit('start-scraping')
}

// Paste from clipboard
const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      // Extract URLs from clipboard text
      const clipboardUrls = extractUrlsFromText(text)

      if (clipboardUrls.length === 0) {
        ElMessage.warning('No valid URLs found in clipboard')
        return
      }

      // Filter out URLs that already exist
      const newUrls = clipboardUrls.filter((clipUrl: string) => !currentUrls.value.includes(clipUrl))

      if (newUrls.length === 0) {
        ElMessage.warning('URLs in clipboard already exist in the input')
        return
      }

      handleAddUrls(newUrls)
      error.value = ''
    }
  } catch (e) {
    ElMessage.error('Cannot read clipboard content')
  }
}

// Show URL history dialog
const showUrlHistory = () => {
  historyDialogVisible.value = true
}

// Open URL in browser
const openInBrowser = () => {
  if (!url.value) return

  // Get the first non-empty URL
  const firstUrl = currentUrls.value[0]
  if (!firstUrl) {
    error.value = 'Please enter a valid URL'
    return
  }

  const formattedUrl = formatUrl(firstUrl)

  if (isValidUrl(formattedUrl)) {
    openExternalUrl(formattedUrl)
    error.value = ''
  } else {
    error.value = 'Please enter a valid URL'
  }
}

// Add URL from history to input
const addUrlToInput = (urlToAdd: string) => {
  // If URL already exists, show warning and return
  if (currentUrls.value.includes(urlToAdd)) {
    ElMessage.warning('This URL already exists in the input')
    return
  }

  handleAddUrls([urlToAdd])
}

// Open URL in external browser
const openExternalUrl = (url: string) => {
  window.electron.send('open-external-url', url)
}

// Load history on component mount
onMounted(() => {
  // Load URL and history from store
  urlStore.loadUrls()
  loadHistory()

  // Load user preference settings
  try {
    const savedShowHelp = localStorage.getItem('webtoon-parser-show-help')
    if (savedShowHelp !== null) {
      showHelp.value = savedShowHelp === 'true'
    }
  } catch (e) {
    console.error('Failed to load preference settings', e)
  }
})

// Clean up event listeners on component unmount
onUnmounted(() => {
  window.electron.removeAllListeners('log-message')

  // Make sure data is saved when component is unmounted
  urlStore.saveUrls()
  urlStore.saveUrlHistory()
})

// Toggle help display state
const toggleHelp = () => {
  showHelp.value = !showHelp.value

  // Use nextTick to ensure DOM updates before transition
  nextTick(() => {
    // Additional logic can be added here, such as scrolling to specific position
    if (showHelp.value) {
      // Logic when showing help
    } else {
      // Logic when hiding help
    }
  })
}

// Watch for showHelp changes and save user preference
watch(showHelp, (newValue) => {
  try {
    localStorage.setItem('webtoon-parser-show-help', newValue.toString())
  } catch (e) {
    console.error('Failed to save preference settings', e)
  }
})
</script>

<style scoped>
/* Base layout */
.url-input-container {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 0;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  overflow-x: hidden; /* Prevent content overflow causing layout width issues */
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  background-color: #fafafa;
}

.input-title {
  font-size: 16px;
  font-weight: 500;
  color: #17233d;
}

.input-actions {
  display: flex;
  gap: 8px;
}

.input-area {
  padding: 12px;
  background-color: #fff;
  box-sizing: border-box;
}

.help-toggle-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
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

.url-input {
  width: 100%;
  box-sizing: border-box;
}

.help-guide-container {
  position: relative;
  min-height: 0;
  transition: min-height 0.5s ease-out;
  will-change: min-height;
  overflow: hidden;
}

.help-guide-container.has-content {
  min-height: 16px; /* Minimum height to prevent complete collapse */
}

/* Transition animations */
.fade-enter-active {
  transition: opacity 0.4s ease 0.1s, max-height 0.5s ease;
  max-height: 600px;
  overflow: hidden;
  position: relative;
}

.fade-leave-active {
  transition: opacity 0.3s ease, max-height 0.5s ease 0.1s;
  max-height: 600px;
  overflow: hidden;
  position: relative;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  max-height: 0;
}

/* Responsive design */
@media (max-width: 576px) {
  .input-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .input-actions {
    width: 100%;
    justify-content: space-between;
  }

  .action-button {
    flex: 1;
  }

  .input-area {
    padding: 8px 6px;
  }
}

.help-guide-margin {
  margin-bottom: 16px;
}
</style>

<style>
/* Global styles */
.el-message {
  min-width: 300px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 12px 16px;
  border: none;
}

.el-message__content {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}

.el-message__icon {
  margin-right: 8px;
  font-size: 16px;
}

.el-message--success {
  background-color: #edfff3;
  border-left: 3px solid #19be6b;
}

.el-message--error {
  background-color: #ffece6;
  border-left: 3px solid #ed4014;
}

.el-message--warning {
  background-color: #fff9e6;
  border-left: 3px solid #ff9900;
}

.el-message--info {
  background-color: #f0f7ff;
  border-left: 3px solid #2b85e4;
}
</style>

<style>
/* Unified button styles */
:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-color: transparent;
}

:deep(.el-button:hover:not(:disabled)) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

:deep(.el-button .el-icon) {
  font-size: 16px;
}

/* Primary button styles */
:deep(.el-button--primary) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

:deep(.url-select .el-select-dropdown__item) {
  padding: 8px 12px;
  border-radius: 4px;
  margin: 0 4px;
  transition: all 0.2s;
}

:deep(.url-select .el-select-dropdown__item:hover) {
  background-color: #f0f7ff;
}

:deep(.url-select .el-select-dropdown__item.selected) {
  background-color: #eef6ff;
  color: #2b85e4;
  font-weight: 600;
}

:deep(.url-select .el-input__wrapper) {
  border-radius: 6px;
  padding: 2px 10px;
  box-shadow: 0 0 0 1px #dcdee2 inset;
}
</style>