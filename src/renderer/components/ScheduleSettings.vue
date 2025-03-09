<template>
  <div class="schedule-settings">
    <!-- 說明切換按鈕 -->
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
    
    <!-- 說明內容 -->
    <div class="help-guide-container" :class="{ 'has-content': showHelp }">
      <transition name="fade">
        <div v-if="showHelp" class="schedule-help">
          <div class="help-section">
            <!-- 說明標題 -->
            <div class="help-header">
              <div class="help-title">
                <el-icon><InfoFilled /></el-icon>
                <span>定時設置說明</span>
              </div>
            </div>
            
            <!-- 說明內容 -->
            <div class="help-content">
              <!-- 定時類型說明 -->
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
              
              <!-- 使用提示 -->
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
          type="primary" 
          :class="{ 'is-running': isRunning }"
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

const props = defineProps({
  schedule: {
    type: Object,
    default: () => ({
      scheduleType: 'weekly',
      day: '五',
      hour: '18',
      minute: '00',
      timezone: 'Asia/Taipei'
    })
  },
  isRunning: {
    type: Boolean,
    default: false
  },
  nextRunTime: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:schedule', 'toggle-schedule'])

// 建立本地狀態，用來作為表單綁定的數據，並避免直接修改 props
const settings = ref({ ...props.schedule })

// 時間選擇器的值，用本地 settings 中的 hour 與 minute 生成 Date 物件
const timeValue = computed({
  get: () => {
    const time = new Date()
    time.setHours(parseInt(settings.value.hour))
    time.setMinutes(parseInt(settings.value.minute))
    return time
  },
  set: (value: Date) => {
    if (value) {
      settings.value.hour = value.getHours().toString().padStart(2, '0')
      settings.value.minute = value.getMinutes().toString().padStart(2, '0')
      // 不直接發送更新，由下面的 watch 處理同步
    }
  }
})

// 當本地數據發生改變時，僅在與父組件傳入的數據不同時才發送更新
const updateSettings = () => {
  if (JSON.stringify(settings.value) !== JSON.stringify(props.schedule)) {
    emit('update:schedule', { ...settings.value })
  }
}

// 當本地 settings 改變時觸發更新到父組件
watch(
  settings,
  () => {
    updateSettings()
  },
  { deep: true }
)

// 當父組件的 schedule 更新時，同步到本地（避免重複更新）
watch(
  () => props.schedule,
  (newVal) => {
    if (JSON.stringify(newVal) !== JSON.stringify(settings.value)) {
      settings.value = { ...newVal }
    }
  },
  { deep: true }
)

// 定時類型選項
const scheduleTypes = [
  { label: '每周', value: 'weekly' },
  { label: '每日', value: 'daily' }
]

// 星期選項
const weekDays = [
  { label: '星期一', value: '一' },
  { label: '星期二', value: '二' },
  { label: '星期三', value: '三' },
  { label: '星期四', value: '四' },
  { label: '星期五', value: '五' },
  { label: '星期六', value: '六' },
  { label: '星期日', value: '日' }
]

// 時區選項
const timezones = [
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Seoul'
]

// 切換定時任務
const toggleSchedule = () => {
  emit('toggle-schedule')
}

// 當選擇星期、時間或時區時觸發更新
const onSettingChange = () => {
  updateSettings()
}

// 獲取下次執行時間的顯示
const getNextRunTimeDisplay = () => {
  if (props.nextRunTime) {
    return props.nextRunTime
  }
  
  // 如果沒有提供下次執行時間，則根據當前設置計算一個預估時間
  const now = new Date()
  const nextRun = new Date()
  
  // 設置小時和分鐘
  nextRun.setHours(parseInt(settings.value.hour))
  nextRun.setMinutes(parseInt(settings.value.minute))
  nextRun.setSeconds(0)
  
  // 如果是每日定時
  if (settings.value.scheduleType === 'daily') {
    // 如果當前時間已經過了今天的執行時間，則設為明天
    if (now > nextRun) {
      nextRun.setDate(nextRun.getDate() + 1)
    }
  } 
  // 如果是每周定時
  else if (settings.value.scheduleType === 'weekly') {
    const dayMap: Record<string, number> = {
      '一': 1, '二': 2, '三': 3, '四': 4,
      '五': 5, '六': 6, '日': 0
    }
    const targetDay = dayMap[settings.value.day]
    const currentDay = now.getDay()
    
    // 計算需要增加的天數
    let daysToAdd = targetDay - currentDay
    if (daysToAdd < 0) daysToAdd += 7 // 如果是過去的日子，加上一周
    if (daysToAdd === 0 && now > nextRun) daysToAdd = 7 // 如果是今天但已過時間，加一周
    
    nextRun.setDate(nextRun.getDate() + daysToAdd)
  }
  
  // 格式化日期時間
  return nextRun.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

// 顯示/隱藏說明的狀態
const showHelp = ref(false)

// 切換說明顯示狀態
const toggleHelp = () => {
  showHelp.value = !showHelp.value
  
  // 使用 nextTick 確保 DOM 更新後再進行過渡動畫
  nextTick(() => {
    // 可以在這裡添加額外的邏輯，例如滾動到特定位置
    if (showHelp.value) {
      // 當顯示說明時的邏輯
    } else {
      // 當隱藏說明時的邏輯
    }
  })
}

// 在組件掛載時從 localStorage 加載用戶偏好設置
onMounted(() => {
  try {
    const savedShowHelp = localStorage.getItem('schedule-settings-show-help')
    if (savedShowHelp !== null) {
      showHelp.value = savedShowHelp === 'true'
    }
  } catch (e) {
    console.error('加載偏好設置失敗', e)
  }
})

// 監聽 showHelp 變化，保存用戶偏好設置
watch(showHelp, (newValue) => {
  try {
    localStorage.setItem('schedule-settings-show-help', newValue.toString())
  } catch (e) {
    console.error('保存偏好設置失敗', e)
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
    max-height: 350px; /* 增加高度以適應移動設備上可能的更多內容 */
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

/* 說明切換按鈕樣式 */
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

/* 說明容器樣式 */
.help-guide-container {
  position: relative;
  min-height: 0;
  transition: min-height 0.5s ease-out;
  will-change: min-height;
  overflow: hidden;
  margin-bottom: 10px;
}

.help-guide-container.has-content {
  min-height: 16px; /* 最小高度，防止完全收縮 */
}

/* 過渡動畫 */
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
</style> 