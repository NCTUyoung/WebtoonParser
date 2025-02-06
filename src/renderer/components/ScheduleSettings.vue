<template>
  <el-card class="schedule-card">
    <template #header>
      <div class="card-header">
        <span>定時設置</span>
        <el-button 
          :type="isRunning ? 'danger' : 'primary'"
          @click="handleToggle"
        >
          {{ isRunning ? '停止定時' : '啟動定時' }}
        </el-button>
      </div>
    </template>
    
    <div class="schedule-form">
      <el-form :model="scheduleForm" inline>
        <!-- 星期選擇 -->
        <el-form-item label="星期">
          <el-select 
            v-model="scheduleForm.day"
            style="width: 90px"
          >
            <el-option
              v-for="day in days"
              :key="day"
              :label="day"
              :value="day"
            />
          </el-select>
        </el-form-item>
        
        <!-- 時間選擇 -->
        <el-form-item label="時間">
          <el-time-picker
            v-model="timeValue"
            format="HH:mm"
            :disabled-hours="disabledHours"
            @change="handleTimeChange"
          />
        </el-form-item>
        
        <!-- 時區選擇 -->
        <el-form-item label="時區">
          <el-select 
            v-model="scheduleForm.timezone"
            style="width: 140px"
          >
            <el-option
              v-for="tz in timezones"
              :key="tz"
              :label="tz"
              :value="tz"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="schedule-status" v-if="isRunning">
      <el-tag type="success">
        定時已啟動: 每{{ scheduleForm.day }} {{ scheduleForm.hour }}:{{ scheduleForm.minute }}
        ({{ scheduleForm.timezone }})
      </el-tag>
    </div>
  </el-card>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps({
  schedule: {
    type: Object,
    required: true
  },
  isRunning: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:schedule', 'toggle-schedule'])

const days = ['一', '二', '三', '四', '五', '六', '日']
const timezones = [
  Intl.DateTimeFormat().resolvedOptions().timeZone,
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'UTC'
]

// 建立本地 reactive 對象，初始化取自 props
const scheduleForm = reactive({
  day: props.schedule.day,
  hour: props.schedule.hour,
  minute: props.schedule.minute,
  timezone: props.schedule.timezone
})

// 監聽 scheduleForm 的變化，將更新後的值發射出去
watch(
  scheduleForm,
  (newVal) => {
    emit('update:schedule', { ...newVal })
  },
  { deep: true }
)

// 計算時間值
const timeValue = computed({
  get: () => {
    const now = new Date()
    now.setHours(parseInt(scheduleForm.hour))
    now.setMinutes(parseInt(scheduleForm.minute))
    return now
  },
  set: (value) => {
    if (value) {
      scheduleForm.hour = value.getHours().toString().padStart(2, '0')
      scheduleForm.minute = value.getMinutes().toString().padStart(2, '0')
    }
  }
})

// 處理時間變更
const handleTimeChange = () => {
  // 變更已經被 watch 捕捉，會自動發送更新
}

// 處理切換定時
const handleToggle = () => {
  emit('toggle-schedule')
}

// 禁用的小時
const disabledHours = () => {
  return []
}
</script>

<style scoped>
.schedule-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.schedule-form {
  margin-bottom: 16px;
}

.schedule-status {
  margin-top: 16px;
}
</style> 