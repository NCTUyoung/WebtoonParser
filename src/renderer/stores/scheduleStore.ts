/**
 * Schedule Store
 * 
 * Manages the schedule settings and schedule state.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useScrapingStore } from './scrapingStore'
import { useUrlStore } from './urlStore'

export const useScheduleStore = defineStore('schedule', () => {
  // State
  const settings = ref({
    scheduleType: 'weekly',
    day: '五',
    hour: '18',
    minute: '00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  })
  
  const isRunning = ref(false)
  const nextRunTime = ref('')

  // Actions
  const loadSettings = async () => {
    try {
      const savedSettings = await window.electron.invoke('load-schedule-settings')
      if (savedSettings) {
        settings.value = savedSettings
      }
      console.log('Loaded schedule settings:', settings.value)
    } catch (error) {
      console.error('Failed to load schedule settings:', error)
    }
  }

  const saveSettings = () => {
    window.electron.send('save-schedule-settings', { ...settings.value })
  }

  const toggleSchedule = () => {
    const scrapingStore = useScrapingStore()
    const urlStore = useUrlStore()
    
    if (!isRunning.value) {
      if (!urlStore.hasValidUrls) {
        ElMessage.warning('請輸入URL以便進行定時抓取')
        return
      }
      
      window.electron.send('start-schedule', { ...settings.value })
      isRunning.value = true
    } else {
      window.electron.send('stop-schedule')
      isRunning.value = false
    }
  }

  const setNextRunTime = (time: string) => {
    nextRunTime.value = time
  }

  return {
    // State
    settings,
    isRunning,
    nextRunTime,
    
    // Actions
    loadSettings,
    saveSettings,
    toggleSchedule,
    setNextRunTime
  }
}) 