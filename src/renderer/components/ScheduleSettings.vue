<template>
  <div class="schedule-settings">
    <div class="settings-form">
      <el-form :model="settings" inline>
        <el-form-item label="星期">
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
      </el-form>
    </div>

    <div class="schedule-actions">
      <el-button 
        type="primary" 
        :class="{ 'is-running': isRunning }"
        @click="toggleSchedule"
      >
        {{ isRunning ? '停止定時' : '啟動定時' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps({
  schedule: {
    type: Object,
    default: () => ({
      day: '五',
      hour: '18',
      minute: '00',
      timezone: 'Asia/Taipei'
    })
  },
  isRunning: {
    type: Boolean,
    default: false
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
</script>

<style scoped>
.schedule-settings {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.settings-form {
  flex: 1;
}

.day-select {
  width: 100px;
}

.time-picker {
  width: 140px;
}

.timezone-select {
  width: 140px;
}

.schedule-actions {
  margin-left: 20px;
}

.is-running {
  background-color: #f56c6c;
  border-color: #f56c6c;
}

:deep(.el-form--inline .el-form-item) {
  margin-right: 20px;
}

@media (max-width: 768px) {
  .schedule-settings {
    flex-direction: column;
    gap: 15px;
  }

  .settings-form :deep(.el-form--inline) {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .schedule-actions {
    margin-left: 0;
    width: 100%;
  }

  .schedule-actions .el-button {
    width: 100%;
  }
}
</style> 