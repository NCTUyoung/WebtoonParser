/**
 * Scraping Store
 * 
 * Manages the scraping process state, logs, and related operations.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { LogMessage } from '../types' 
import { useUrlStore } from './urlStore'
import { useSettingsStore } from './settingsStore'

export const useScrapingStore = defineStore('scraping', () => {
  // State
  const isLoading = ref(false)
  const logs = ref<LogMessage[]>([])
  const lastError = ref<string | null>(null)

  // Actions
  const startScraping = async (forceAppend = false) => {
    const urlStore = useUrlStore()
    const settingsStore = useSettingsStore()
    
    if (!urlStore.hasValidUrls) {
      ElMessage.warning('請輸入至少一個URL')
      return
    }
    
    isLoading.value = true
    lastError.value = null
    
    try {
      const result = await window.electron.invoke('start-scraping', {
        urls: urlStore.urlList,
        savePath: settingsStore.savePath,
        appendMode: forceAppend || settingsStore.appendMode,
        customFilename: settingsStore.customFilename
      })
      
      if (result && result.success) {
        console.log('Scraping completed successfully:', result)
        ElMessage.success('抓取完成')
        urlStore.addToHistory()
      }
    } catch (error: unknown) {
      console.error('Scraping error:', error)
      if (error instanceof Error) {
        lastError.value = error.message
        ElMessage.error(`抓取錯誤: ${error.message}`)
      } else {
        const errorMsg = String(error)
        lastError.value = errorMsg
        ElMessage.error(`抓取錯誤: ${errorMsg}`)
      }
    } finally {
      isLoading.value = false
    }
  }

  const addLog = (message: string) => {
    logs.value.push({
      time: new Date().toLocaleTimeString(),
      message
    })
  }

  const clearLogs = () => {
    logs.value = []
  }

  return {
    // State
    isLoading,
    logs,
    lastError,
    
    // Actions
    startScraping,
    addLog,
    clearLogs
  }
}) 