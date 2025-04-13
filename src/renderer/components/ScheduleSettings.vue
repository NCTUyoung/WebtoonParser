<template>
  <div class="schedule-settings">
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
        <div v-if="showHelp" class="schedule-help">
          <div class="help-section">
            <!-- Help title -->
            <div class="help-header">
              <div class="help-title">
                <el-icon><InfoFilled /></el-icon>
                <span>定時設置說明</span>
              </div>
            </div>

            <!-- Help content -->
            <div class="help-content">
              <!-- Schedule type description -->
              <div class="help-category">
                <div class="category-title">定時類型</div>
                <div class="tips-list">
                  <div class="tip-item">
                    <strong>每日定時：</strong>每天在指定時間自動執行爬蟲任務
                  </div>
                  <div class="tip-item">
                    <strong>每周定時：</strong>每周在指定星期和時間自動執行爬蟲任務
                  </div>
                </div>
              </div>

              <!-- Usage tips -->
              <div class="help-category">
                <div class="category-title">使用提示</div>
                <div class="tips-list">
                  <div class="tip-item">設置完成後點擊「啟動定時」按鈕開始定時任務</div>
                  <div class="tip-item">應用程序需保持運行，定時任務才能執行</div>
                  <div class="tip-item">定時任務將使用當前輸入框中的網址進行爬取</div>
                  <div class="tip-item">可以隨時點擊「停止定時」按鈕來取消定時任務</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <div class="schedule-main">
      <div class="settings-form">
        <el-form :model="settings" class="schedule-form">
          <div class="form-row">
            <el-form-item label="定時類型">
              <el-select
                v-model="settings.scheduleType"
                class="schedule-type-select"
                @change="onSettingChange"
              >
                <el-option
                  v-for="type in scheduleTypes"
                  :key="type.value"
                  :label="type.label"
                  :value="type.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="星期" v-if="settings.scheduleType === 'weekly'">
              <el-select
                v-model="settings.day"
                class="day-select"
                @change="onSettingChange"
              >
                <el-option
                  v-for="day in weekDays"
                  :key="day.value"
                  :label="day.label"
                  :value="day.value"
                />
              </el-select>
            </el-form-item>
          </div>

          <div class="form-row">
            <el-form-item label="時間">
              <el-time-picker
                v-model="timeValue"
                format="HH:mm"
                placeholder="選擇時間"
                class="time-picker"
                @change="onSettingChange"
              />
            </el-form-item>

            <el-form-item label="時區">
              <el-select
                v-model="settings.timezone"
                class="timezone-select"
                @change="onSettingChange"
              >
                <el-option
                  v-for="zone in timezones"
                  :key="zone"
                  :label="zone"
                  :value="zone"
                />
              </el-select>
            </el-form-item>
          </div>
        </el-form>

        <div v-if="isRunning" class="next-run-info">
          <el-tag type="success">
            下次執行時間：{{ getNextRunTimeDisplay() }}
          </el-tag>
        </div>
      </div>

      <div class="schedule-actions">
        <el-button
          :type="isRunning ? 'danger' : 'primary'"
          @click="toggleSchedule"
          plain
        >
          {{ isRunning ? '停止定時' : '啟動定時' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { ArrowDown, QuestionFilled, InfoFilled } from '@element-plus/icons-vue'
import { useScheduleStore } from '../stores'

// Define schedule settings interface
interface ScheduleSettings {
  scheduleType: string;
  day: string;
  hour: string;
  minute: string;
  timezone: string;
}

// Initialize schedule store
const scheduleStore = useScheduleStore()

// Create local state for form binding and to avoid directly modifying store
const settings = computed<ScheduleSettings>({
  get: () => {
    return {
      scheduleType: scheduleStore.settings.scheduleType,
      day: scheduleStore.settings.day,
      hour: scheduleStore.settings.hour,
      minute: scheduleStore.settings.minute,
      timezone: scheduleStore.settings.timezone
    }
  },
  set: (value: ScheduleSettings) => {
    scheduleStore.settings = value
    scheduleStore.saveSettings()
  }
})

// Computed property for time picker, generate Date object from settings hour and minute
const timeValue = computed({
  get: () => {
    const time = new Date()
    time.setHours(parseInt(settings.value.hour))
    time.setMinutes(parseInt(settings.value.minute))
    return time
  },
  set: (value: Date) => {
    if (value) {
      const newSettings = { ...settings.value }
      newSettings.hour = value.getHours().toString().padStart(2, '0')
      newSettings.minute = value.getMinutes().toString().padStart(2, '0')
      settings.value = newSettings
    }
  }
})

// Computed property for isRunning
const isRunning = computed(() => {
  return scheduleStore.isRunning
})

// Computed property for nextRunTime
const nextRunTime = computed(() => {
  return scheduleStore.nextRunTime
})

// Update settings when local data changes
const onSettingChange = () => {
  scheduleStore.saveSettings()
}

// Schedule type options
const scheduleTypes = [
  { label: '每周', value: 'weekly' },
  { label: '每日', value: 'daily' }
]

// Weekday options
const weekDays = [
  { label: '星期一', value: '一' },
  { label: '星期二', value: '二' },
  { label: '星期三', value: '三' },
  { label: '星期四', value: '四' },
  { label: '星期五', value: '五' },
  { label: '星期六', value: '六' },
  { label: '星期日', value: '日' }
]

// Timezone options
const timezones = [
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Seoul'
]

// Toggle schedule task
const toggleSchedule = () => {
  scheduleStore.toggleSchedule()
}

// Get next run time display
const getNextRunTimeDisplay = () => {
  if (nextRunTime.value) {
    return nextRunTime.value
  }

  // If next run time is not provided, calculate an estimated time based on current settings
  const now = new Date()
  const nextRun = new Date()

  // Set hours and minutes
  nextRun.setHours(parseInt(settings.value.hour))
  nextRun.setMinutes(parseInt(settings.value.minute))
  nextRun.setSeconds(0)

  // If daily schedule
  if (settings.value.scheduleType === 'daily') {
    // If current time has passed today's execution time, set to tomorrow
    if (now > nextRun) {
      nextRun.setDate(nextRun.getDate() + 1)
    }
  }
  // If weekly schedule
  else if (settings.value.scheduleType === 'weekly') {
    const dayMap: Record<string, number> = {
      '一': 1, '二': 2, '三': 3, '四': 4,
      '五': 5, '六': 6, '日': 0
    }
    const targetDay = dayMap[settings.value.day]
    const currentDay = now.getDay()

    // Calculate days to add
    let daysToAdd = targetDay - currentDay
    if (daysToAdd < 0) daysToAdd += 7 // If past day, add a week
    if (daysToAdd === 0 && now > nextRun) daysToAdd = 7 // If today but time passed, add a week

    nextRun.setDate(nextRun.getDate() + daysToAdd)
  }

  // Format date and time
  return nextRun.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

// Help display state
const showHelp = ref(false)

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

// Load user preference settings on component mount
onMounted(() => {
  // Load settings from store
  scheduleStore.loadSettings()

  // Load help display preference
  try {
    const savedShowHelp = localStorage.getItem('schedule-settings-show-help')
    if (savedShowHelp !== null) {
      showHelp.value = savedShowHelp === 'true'
    }
  } catch (e) {
    console.error('Failed to load preference settings', e)
  }
})

// Watch for showHelp changes and save user preference
watch(showHelp, (newValue) => {
  try {
    localStorage.setItem('schedule-settings-show-help', newValue.toString())
  } catch (e) {
    console.error('Failed to save preference settings', e)
  }
})
</script>

<style scoped>
.schedule-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

.schedule-help {
  width: 100%;
  margin-bottom: 0;
}

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

.schedule-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 0;
  box-sizing: border-box;
}

.settings-form {
  flex: 1;
  width: 100%;
}

.schedule-form {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-row {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  box-sizing: border-box;
}

.form-row :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 0;
}

.form-row :deep(.el-form-item__label) {
  font-size: 14px;
  color: #606266;
  padding-right: 8px;
}

.schedule-type-select,
.day-select {
  width: 120px;
}

.time-picker {
  width: 140px;
}

.timezone-select {
  width: 140px;
}

.schedule-type-select :deep(.el-input__wrapper),
.day-select :deep(.el-input__wrapper),
.timezone-select :deep(.el-input__wrapper),
.time-picker :deep(.el-input__wrapper) {
  padding: 0 10px;
  height: 32px;
}

.schedule-actions {
  margin-left: 0;
  margin-top: 10px;
  display: flex;
  align-items: flex-start;
  padding-top: 0;
  box-sizing: border-box;
}

.schedule-actions .el-button {
  height: 32px;
  padding: 0 15px;
  font-size: 14px;
}

.is-running {
  border-color: #f56c6c;
  color: #f56c6c;
}

.next-run-info {
  margin-top: 10px;
  box-sizing: border-box;
}

.next-run-info :deep(.el-tag) {
  padding: 0;
  font-size: 14px;
}

@media (max-width: 768px) {
  .schedule-main {
    flex-direction: column;
    gap: 10px;
    margin-top: 0;
  }

  .help-section {
    padding: 10px;
  }

  .help-title {
    font-size: 14px;
  }

  .category-title {
    font-size: 13px;
  }

  .form-row {
    flex-direction: column;
    gap: 10px;
    margin-bottom: 8px;
  }

  .form-row :deep(.el-form-item) {
    width: 100%;
  }

  .schedule-actions {
    margin-left: 0;
    width: 100%;
    margin-top: 8px;
  }

  .schedule-actions .el-button {
    width: 100%;
  }

  .schedule-type-select,
  .day-select,
  .time-picker,
  .timezone-select {
    width: 100%;
  }

  .help-toggle-btn {
    font-size: 12px;
    padding: 3px 6px;
  }

  .next-run-info {
    margin-top: 8px;
  }
}

@media (max-width: 576px) {
  .help-guide-container {
    margin-bottom: 8px;
  }

  .help-section {
    padding: 8px 6px;
  }

  .help-content {
    gap: 8px;
  }

  .help-category {
    gap: 4px;
  }

  .category-title {
    font-size: 12px;
    padding-bottom: 3px;
  }

  .tip-item {
    padding-left: 14px;
    font-size: 11px;
    line-height: 1.3;
  }

  .tip-item::before {
    top: 6px;
    width: 5px;
    height: 5px;
  }

  .fade-enter-active,
  .fade-leave-active {
    max-height: 350px; /* Increase height for potential more content on mobile devices */
  }

  .schedule-main {
    padding: 0;
  }

  .form-row {
    margin-bottom: 6px;
  }

  .next-run-info {
    margin-top: 6px;
  }

  .schedule-actions {
    margin-top: 6px;
  }
}

/* Help toggle button style */
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

/* Help container style */
.help-guide-container {
  position: relative;
  min-height: 0;
  transition: min-height 0.5s ease-out;
  will-change: min-height;
  overflow: hidden;
  margin-bottom: 10px;
}

.help-guide-container.has-content {
  min-height: 16px; /* Minimum height, prevent full contraction */
}

/* Transition animation */
.fade-enter-active {
  transition: opacity 0.4s ease 0.1s, max-height 0.5s ease;
  max-height: 350px;
  overflow: hidden;
  position: relative;
}

.fade-leave-active {
  transition: opacity 0.3s ease, max-height 0.5s ease 0.1s;
  max-height: 350px;
  overflow: hidden;
  position: relative;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>