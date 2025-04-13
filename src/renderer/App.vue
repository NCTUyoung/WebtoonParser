<template>
  <el-config-provider :locale="zhTw">
    <el-container class="app-container" :style="backgroundStyle">
      <!-- Header bar -->
      <el-header class="app-header">
        <div class="header-content">
          <h1>漫畫/小說爬蟲工具 <span class="version">v{{ version }}</span></h1>
        </div>
      </el-header>

      <el-main class="main-content">
        <!-- URL input section -->
        <el-card class="section-card" :class="{ 'is-collapsed': !isUrlSectionExpanded }">
          <template #header>
            <div class="card-header" @click="toggleSection('url')">
              <h2>網站網址</h2>
              <el-button
                link
                class="collapse-toggle"
                @click.stop="toggleSection('url')"
              >
                <el-icon :class="{ 'is-rotate': !isUrlSectionExpanded }">
                  <ArrowUp />
                </el-icon>
              </el-button>
            </div>
          </template>
          <div class="card-content" v-show="isUrlSectionExpanded">
            <UrlInput
              ref="urlInputRef"
              v-model="urls"
              :external-save-path="settingsStore.savePath"
              @start-scraping="startScraping()"
            />
          </div>
        </el-card>

        <!-- Schedule settings section -->
        <el-card class="section-card" :class="{ 'is-collapsed': !isScheduleSectionExpanded }">
          <template #header>
            <div class="card-header" @click="toggleSection('schedule')">
              <h2>定時設置</h2>
              <el-button
                link
                class="collapse-toggle"
                @click.stop="toggleSection('schedule')"
              >
                <el-icon :class="{ 'is-rotate': !isScheduleSectionExpanded }">
                  <ArrowUp />
                </el-icon>
              </el-button>
            </div>
          </template>
          <div class="card-content" v-show="isScheduleSectionExpanded">
            <ScheduleSettings
              :use-store="true"
            />
          </div>
        </el-card>

        <!-- Save path settings section -->
        <el-card class="section-card" :class="{ 'is-collapsed': !isSavePathSectionExpanded }">
          <template #header>
            <div class="card-header" @click="toggleSection('savePath')">
              <h2>儲存設置</h2>
              <el-button
                link
                class="collapse-toggle"
                @click.stop="toggleSection('savePath')"
              >
                <el-icon :class="{ 'is-rotate': !isSavePathSectionExpanded }">
                  <ArrowUp />
                </el-icon>
              </el-button>
            </div>
          </template>
          <div class="card-content" v-show="isSavePathSectionExpanded">
            <SavePathSettings
              :use-store="true"
            />
          </div>
        </el-card>

        <!-- Background settings section -->
        <el-card class="section-card" :class="{ 'is-collapsed': !isBackgroundSectionExpanded }">
          <template #header>
            <div class="card-header" @click="toggleSection('background')">
              <h2>背景設置</h2>
              <el-button
                link
                class="collapse-toggle"
                @click.stop="toggleSection('background')"
              >
                <el-icon :class="{ 'is-rotate': !isBackgroundSectionExpanded }">
                  <ArrowUp />
                </el-icon>
              </el-button>
            </div>
          </template>
          <div class="card-content" v-show="isBackgroundSectionExpanded">
            <BackgroundSettings
              v-model="settingsStore.backgroundSettings"
              @apply="applyBackgroundSettings"
            />
          </div>
        </el-card>

        <!-- Log viewer section -->
        <el-card class="section-card log-card" :class="{ 'is-collapsed': !isLogSectionExpanded }">
          <template #header>
            <div class="card-header" @click="toggleSection('log')">
              <h2>執行日誌</h2>
              <div class="header-actions">
                <el-button type="info" @click.stop="clearLogs" v-if="isLogSectionExpanded">
                  清空日誌
                </el-button>
                <el-button
                  link
                  class="collapse-toggle"
                  @click.stop="toggleSection('log')"
                >
                  <el-icon :class="{ 'is-rotate': !isLogSectionExpanded }">
                    <ArrowUp />
                  </el-icon>
                </el-button>
              </div>
            </div>
          </template>
          <div class="card-content" v-show="isLogSectionExpanded">
            <LogViewer ref="logViewerRef" :logs="logs" />
          </div>
        </el-card>
      </el-main>

      <!-- Footer with copyright info -->
      <el-footer class="app-footer">
        <p>&copy; {{ new Date().getFullYear() }} {{ title }}. All rights reserved.</p>
      </el-footer>
    </el-container>
  </el-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import { ArrowUp } from '@element-plus/icons-vue'
import UrlInput from './components/UrlInput.vue'
import ScheduleSettings from './components/ScheduleSettings.vue'
import LogViewer from './components/LogViewer.vue'
import SavePathSettings from './components/SavePathSettings.vue'
import BackgroundSettings from './components/BackgroundSettings.vue'
import type { LogMessage } from './types'

// Import stores
import { useSettingsStore } from './stores/settingsStore'
import { useUrlStore } from './stores/urlStore'
import { useScrapingStore } from './stores/scrapingStore'
import { useScheduleStore } from './stores/scheduleStore'
import { useUiStore } from './stores/uiStore'

// =========================================================
// Environment variables and constants
// =========================================================
const title = import.meta.env.VITE_APP_TITLE
const version = import.meta.env.VITE_APP_VERSION

// =========================================================
// Component references
// =========================================================
const urlInputRef = ref<InstanceType<any> | null>(null)
const logViewerRef = ref()

// =========================================================
// Store instances
// =========================================================
const settingsStore = useSettingsStore()
const urlStore = useUrlStore()
const scrapingStore = useScrapingStore()
const scheduleStore = useScheduleStore()
const uiStore = useUiStore()

// =========================================================
// State management
// =========================================================

// Core app state
const urls = ref('')
const logs = ref<LogMessage[]>([])
const isScheduleRunning = ref(false)
const nextRunTime = ref('')

// UI section collapse states
const isUrlSectionExpanded = ref(true)
const isScheduleSectionExpanded = ref(true)
const isSavePathSectionExpanded = ref(true)
const isBackgroundSectionExpanded = ref(false)
const isLogSectionExpanded = ref(true)

// =========================================================
// Computed properties
// =========================================================

/**
 * Computes the CSS styles for the background based on settings
 * @returns {Object} CSS style object
 */
const backgroundStyle = computed(() => {
  const settings = settingsStore.backgroundSettings

  if (settings.type === 'default') {
    return {}
  } else if (settings.type === 'custom' && settings.imageUrl) {
    return {
      backgroundImage: `url(${settings.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      '--bg-opacity': settings.opacity,
      '--bg-blur': `${settings.blur}px`
    }
  }
  return {}
})

// =========================================================
// UI section collapse functions
// =========================================================

/**
 * Toggles the expanded/collapsed state of a section
 * @param {string} section - The section identifier to toggle
 */
const toggleSection = (section: string) => {
  switch (section) {
    case 'url':
      isUrlSectionExpanded.value = !isUrlSectionExpanded.value
      uiStore.saveCollapseState('url', isUrlSectionExpanded.value)
      break
    case 'schedule':
      isScheduleSectionExpanded.value = !isScheduleSectionExpanded.value
      uiStore.saveCollapseState('schedule', isScheduleSectionExpanded.value)
      break
    case 'savePath':
      isSavePathSectionExpanded.value = !isSavePathSectionExpanded.value
      uiStore.saveCollapseState('savePath', isSavePathSectionExpanded.value)
      break
    case 'background':
      isBackgroundSectionExpanded.value = !isBackgroundSectionExpanded.value
      uiStore.saveCollapseState('background', isBackgroundSectionExpanded.value)
      break
    case 'log':
      isLogSectionExpanded.value = !isLogSectionExpanded.value
      uiStore.saveCollapseState('log', isLogSectionExpanded.value)
      break
  }
}

// =========================================================
// Core application functions
// =========================================================

/**
 * Apply and save background settings
 */
const applyBackgroundSettings = () => {
  settingsStore.saveBackgroundSettings()
}

/**
 * Start the scraping process
 * @param {boolean} forceAppend - Whether to force append mode (used by scheduled tasks)
 */
const startScraping = async (forceAppend = false) => {
  console.log('Starting scraping process')
  console.log('URLs:', urls.value)
  console.log('Append mode:', forceAppend || settingsStore.appendMode)

  if (!urls.value) {
    ElMessage.warning('Please enter at least one URL')
    return
  }

  // Split input URLs into array
  const urlList = urls.value.split('\n').filter(url => url.trim())

  // Show loading state immediately before scraping
  urlInputRef.value?.setLoading(true)

  try {
    // Execute invoke, success means scraping has started
    const result = await window.electron.invoke('start-scraping', {
      urls: urlList,
      savePath: settingsStore.savePath,
      appendMode: forceAppend || settingsStore.appendMode,
      customFilename: settingsStore.customFilename
    })

    // Check result, if successful show success message and stop loading state
    if (result && result.success) {
      console.log('Scraping completed successfully:', result)
      urlInputRef.value?.setLoading(false)
      ElMessage.success('Scraping completed')
    }
  } catch (error: any) {
    console.error('Scraping error:', error)
    // Stop loading state and show error message when error occurs
    urlInputRef.value?.setLoading(false)
    ElMessage.error(`Scraping error: ${error.message}`)
  }
}

/**
 * Toggle scheduled task on/off
 */
const toggleSchedule = () => {
  if (!isScheduleRunning.value) {
    if (!urls.value.trim()) {
      ElMessage.warning('Please enter URLs to scrape first')
      return
    }

    window.electron.send('start-schedule', { ...scheduleStore.settings })
    isScheduleRunning.value = true
  } else {
    window.electron.send('stop-schedule')
    isScheduleRunning.value = false
  }
}

/**
 * Clear the log messages
 */
const clearLogs = () => {
  logs.value = []
}

/**
 * Save URLs to storage
 */
const saveUrls = () => {
  window.electron.send('save-urls', urls.value)
}

/**
 * Save schedule settings to storage
 */
const saveScheduleSettings = () => {
  window.electron.send('save-schedule-settings', { ...scheduleStore.settings })
}

/**
 * Save the output file path to storage
 */
const saveSavePath = () => {
  console.log('Saving output path:', settingsStore.savePath)
  settingsStore.saveSavePath()
}

/**
 * Save custom filename to storage
 */
const saveCustomFilename = () => {
  console.log('Saving custom filename:', settingsStore.customFilename)
  settingsStore.saveCustomFilename()
}

/**
 * Save all application settings
 */
const saveAllSettings = () => {
  saveUrls()
  saveScheduleSettings()
  settingsStore.saveAllSettings()
}

// =========================================================
// Lifecycle hooks
// =========================================================

onMounted(async () => {
  // Load UI section collapse states
  uiStore.loadCollapseStates()

  try {
    // Load saved settings from main process
    urls.value = await window.electron.invoke('load-urls')

    // Load settings from store
    await settingsStore.loadSettings()

    // Load schedule settings
    const savedSettings = await window.electron.invoke('load-schedule-settings')
    scheduleStore.settings = savedSettings

    // These settings are now handled by settingsStore
    // savePath.value = settingsStore.savePath;
    // customFilename.value = settingsStore.customFilename;
    // backgroundSettings.value = settingsStore.backgroundSettings;
  } catch (error) {
    console.error('Failed to load settings:', error)
  }

  // Set up event listeners for IPC events

  // Log message event
  window.electron.on('log-message', (message: string) => {
    logs.value.push({
      time: new Date().toLocaleTimeString(),
      message
    })
  })

  // Scraping complete event
  window.electron.on('scraping-complete', () => {
    console.log('Received scraping-complete event')
    urlInputRef.value?.setLoading(false)
    ElMessage.success('Scraping completed')
  })

  // Scraping error event
  window.electron.on('scraping-error', (error: string) => {
    urlInputRef.value?.setLoading(false)
    ElMessage.error(error)
  })

  // Schedule trigger event
  window.electron.on('schedule-trigger', () => {
    console.log('Received schedule-trigger event')
    console.log('Current URLs:', urls.value)
    // Scheduled tasks always use append mode
    console.log('Scheduled task append mode:', settingsStore.appendMode ? 'enabled' : 'forced enabled')
    startScraping(true)
  })

  // Next run time update event
  window.electron.on('next-run-time', (time: string) => {
    nextRunTime.value = time
  })

  // Save all settings before application closes
  window.addEventListener('beforeunload', saveAllSettings)
})

// Clean up event listeners
onUnmounted(() => {
  window.electron.removeAllListeners('log-message')
  window.electron.removeAllListeners('scraping-complete')
  window.electron.removeAllListeners('scraping-error')
  window.electron.removeAllListeners('schedule-trigger')
  window.electron.removeAllListeners('next-run-time')
  window.removeEventListener('beforeunload', saveAllSettings)
})
</script>

<style>
/* =========================================================
   Global variables
   ========================================================= */
:root {
  /* Colors */
  --primary-color: #2b85e4;
  --primary-light: #5cadff;
  --primary-dark: #1c5cad;
  --success-color: #19be6b;
  --warning-color: #ff9900;
  --error-color: #ed4014;
  --text-primary: #17233d;
  --text-regular: #515a6e;
  --text-secondary: #808695;
  --border-color: #dcdee2;
  --border-light: #e8eaec;
  --bg-color: #f8f8f9;
  --card-bg: #ffffff;
  --header-bg: #2b85e4;

  /* Effects */
  --card-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  --bg-opacity: 0.8;
  --bg-blur: 0px;
  --transition-duration: 0.3s;
}

/* =========================================================
   Layout and containers
   ========================================================= */

/* Main container */
.app-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  background-image:
    linear-gradient(135deg, rgba(43, 133, 228, 0.05) 0%, rgba(235, 245, 255, 0.7) 100%),
    radial-gradient(circle at 15% 85%, rgba(255, 153, 0, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 85% 15%, rgba(25, 190, 107, 0.05) 0%, transparent 50%);
  background-attachment: fixed;
  position: relative;
}

/* Background pattern overlay */
.app-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232b85e4' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
  opacity: var(--bg-opacity, 0.8);
  backdrop-filter: blur(var(--bg-blur, 0px));
}

/* Custom background image support */
.app-container[style*="background-image"]::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.85);
  pointer-events: none;
  z-index: 0;
  opacity: calc(1 - var(--bg-opacity, 0.8));
  backdrop-filter: blur(var(--bg-blur, 0px));
}

/* Main content area */
.main-content {
  padding: 24px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  background-color: rgba(248, 248, 249, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 1;
  overflow-x: hidden; /* Prevent content overflow causing layout to widen */
}

/* =========================================================
   Header styles
   ========================================================= */
.app-header {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 10;
}

.header-content {
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.version {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-left: 8px;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
}

/* =========================================================
   Card and section styles
   ========================================================= */
.section-card {
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  border: none;
  overflow: hidden;
  transition: all var(--transition-duration) ease;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  width: 100%;
  flex-shrink: 0;
  display: block;
}

.section-card:hover {
  box-shadow: 0 8px 24px rgba(43, 133, 228, 0.12);
  transform: translateY(-2px);
}

.section-card .el-card__header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  background: linear-gradient(to right, #fafafa, #f5f7fa);
  cursor: pointer;
}

/* Collapsed card styles */
.section-card.is-collapsed {
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.section-card.is-collapsed .el-card__header {
  border-bottom: none;
}

.section-card.is-collapsed:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(43, 133, 228, 0.08);
}

/* Card content transition */
.card-content {
  transition: max-height var(--transition-duration) ease,
              opacity var(--transition-duration) ease,
              padding var(--transition-duration) ease;
  overflow: hidden;
  width: 100%;
}

/* 確保所有卡片在摺疊時內容完全收起 */
.section-card.is-collapsed .el-card__body {
  padding: 0;
  height: 0;
  min-height: 0;
  overflow: hidden;
  display: block;
  width: 100%;
}

/* Card header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Header actions container */
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Collapse toggle button */
.collapse-toggle {
  padding: 2px;
  color: var(--text-secondary);
  transition: all var(--transition-duration) ease;
}

.collapse-toggle:hover {
  color: var(--primary-color);
}

.collapse-toggle .el-icon {
  transition: transform var(--transition-duration) ease;
}

.collapse-toggle .el-icon.is-rotate {
  transform: rotate(180deg);
}

/* Log card special styles */
.log-card .el-card__body {
  padding: 0;
  height: auto;
  min-height: 300px;
  background: #1e1e1e;
}

.log-card.is-collapsed .el-card__body {
  min-height: 0;
}

/* =========================================================
   Footer styles
   ========================================================= */
.app-footer {
  text-align: center;
  padding: 20px;
  color: #808695;
  font-size: 0.9rem;
  background-color: rgba(248, 249, 251, 0.8);
  backdrop-filter: blur(5px);
  border-top: 1px solid rgba(232, 234, 236, 0.5);
  margin-top: auto;
  position: relative;
  z-index: 1;
}

.app-footer p {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.app-footer p::before,
.app-footer p::after {
  content: "";
  display: block;
  height: 1px;
  width: 30px;
  background-color: #dcdee2;
}

/* =========================================================
   Button styles
   ========================================================= */
:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

:deep(.el-button:hover:not(:disabled)) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:deep(.el-button:active) {
  transform: translateY(0);
}

:deep(.el-button .el-icon) {
  font-size: 16px;
}

/* Primary button styles */
:deep(.el-button--primary) {
  background-color: var(--primary-color);
  border-color: transparent;
  height: 40px;
  padding: 0 16px;
}

:deep(.el-button--primary:hover:not(:disabled)) {
  background-color: var(--primary-light);
  box-shadow: 0 4px 12px rgba(43, 133, 228, 0.25);
}

/* Default button styles */
:deep(.el-button--default) {
  border-color: #dcdee2;
  color: var(--text-regular);
  height: 36px;
}

:deep(.el-button--default:hover:not(:disabled)) {
  border-color: var(--primary-light);
  color: var(--primary-color);
}

/* Info button styles */
:deep(.el-button--info) {
  background-color: #909399;
  border-color: transparent;
  color: #fff;
  height: 36px;
}

:deep(.el-button--info:hover:not(:disabled)) {
  background-color: #a6a9ad;
  box-shadow: 0 4px 12px rgba(144, 147, 153, 0.25);
}

/* Card header button styles */
.card-header .el-button {
  padding: 8px 14px;
  font-size: 14px;
}

/* Text button styles in card header */
.card-header .el-button--text {
  padding: 0;
  height: 32px;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  background-color: transparent;
}

.card-header .el-button--text:hover {
  background-color: rgba(0, 0, 0, 0.03);
  color: var(--primary-color);
  transform: none;
  box-shadow: none;
}

/* Disabled state styles */
:deep(.el-button:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #f5f7fa;
  border-color: #e4e7ed;
  color: #c0c4cc;
}

:deep(.el-button--primary:disabled) {
  background-color: #a0cfff;
  border-color: transparent;
  color: #fff;
}

/* =========================================================
   Responsive design
   ========================================================= */
@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }

  .header-content h1 {
    font-size: 1.2rem;
  }

  .section-card {
    margin-bottom: 16px;
  }

  .card-header h2 {
    font-size: 1rem;
  }

  .app-footer {
    padding: 16px;
    font-size: 0.8rem;
  }
}

@media (max-width: 576px) {
  .main-content {
    padding: 12px;
  }

  .section-card .el-card__header {
    padding: 12px 16px;
  }

  .section-card .el-card__body {
    padding: 12px;
  }
}
</style>