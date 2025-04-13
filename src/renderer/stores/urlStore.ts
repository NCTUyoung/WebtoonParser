/**
 * URL Store
 *
 * Manages the URL input and URL history.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 定义历史记录项目的接口
interface HistoryItem {
  url: string
  label: string
}

export const useUrlStore = defineStore('url', () => {
  // State
  const currentInput = ref('')
  const history = ref<HistoryItem[]>([])

  // Getters
  const urlList = computed(() => {
    return currentInput.value.split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)
  })

  const hasValidUrls = computed(() => urlList.value.length > 0)

  // Actions
  const loadUrls = async () => {
    try {
      currentInput.value = await window.electron.invoke('load-urls')
      console.log('Loaded URLs')
    } catch (error) {
      console.error('Failed to load URLs:', error)
    }
  }

  const loadUrlHistory = async () => {
    try {
      const loadedHistory = await window.electron.invoke('load-url-history')
      if (Array.isArray(loadedHistory)) {
        // 处理可能的不同数据结构
        history.value = loadedHistory.map(item => {
          if (typeof item === 'string') {
            // 如果是字符串，转换为对象格式
            return {
              url: item,
              label: item.split('/').pop() || item
            }
          } else if (typeof item === 'object' && item !== null) {
            // 确保对象格式正确
            return {
              url: item.url || '',
              label: item.label || (item.url ? item.url.split('/').pop() || item.url : '')
            }
          }
          // 默认返回空对象
          return { url: '', label: '' }
        }).filter(item => item.url !== '')
      }
      console.log('Loaded URL history')
    } catch (error) {
      console.error('Failed to load URL history:', error)
    }
  }

  const saveUrls = () => {
    window.electron.send('save-urls', currentInput.value)
  }

  const saveUrlHistory = () => {
    // 创建一个只包含必要属性的简单对象数组，确保可序列化
    const serializableHistory = history.value.map(item => ({
      url: item.url || '',
      label: item.label || ''
    }))
    window.electron.send('save-url-history', serializableHistory)
  }

  const addToHistory = () => {
    if (!hasValidUrls.value) return

    // Add current URLs to history without duplicates
    const currentUrlsSet = new Set(urlList.value)
    const existingUrlsSet = new Set(history.value.map(item => item.url))

    // 将新 URL 添加到历史记录
    urlList.value.forEach(url => {
      if (!existingUrlsSet.has(url)) {
        history.value.push({
          url,
          label: url.split('/').pop() || url
        })
      }
    })

    // 保留最新的 20 条记录
    if (history.value.length > 20) {
      history.value = history.value.slice(history.value.length - 20)
    }
    saveUrlHistory()
  }

  const clearHistory = () => {
    history.value = []
    saveUrlHistory()
  }

  return {
    // State
    currentInput,
    history,

    // Getters
    urlList,
    hasValidUrls,

    // Actions
    loadUrls,
    loadUrlHistory,
    saveUrls,
    saveUrlHistory,
    addToHistory,
    clearHistory
  }
})