/**
 * Settings Store
 *
 * Manages application settings including save path, append mode,
 * custom filename, and background settings.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const savePath = ref('')
  const appendMode = ref(true)
  const customFilename = ref('')
  const backgroundSettings = ref({
    type: 'default',
    imageUrl: '',
    opacity: 0.8,
    blur: 0
  })

  // Actions
  const loadSettings = async () => {
    try {
      // Load save path
      const savedPath = await window.electron.invoke('load-save-path')
      savePath.value = savedPath
      console.log('Loaded save path:', savedPath)

      // Load append mode
      try {
        // 尝试从主进程加载设置
        const savedAppendMode = await window.electron.invoke('load-append-mode')
        if (typeof savedAppendMode === 'boolean') {
          appendMode.value = savedAppendMode
          console.log('Loaded append mode from main process:', appendMode.value)
        } else if (typeof savedAppendMode === 'string') {
          appendMode.value = savedAppendMode === 'true'
          console.log('Loaded append mode from main process (string):', appendMode.value)
        } else {
          // 如果主进程返回的值不是预期类型，尝试从 localStorage 加载 (备选方案)
          const localAppendMode = localStorage.getItem('webtoon-parser-append-mode')
          if (localAppendMode !== null) {
            appendMode.value = localAppendMode === 'true'
            console.log('Loaded append mode from localStorage (fallback):', appendMode.value)
          }
        }
      } catch (e) {
        console.error('Failed to load append mode from main process:', e)
        // 尝试从 localStorage 加载 (备选方案)
        try {
          const localAppendMode = localStorage.getItem('webtoon-parser-append-mode')
          if (localAppendMode !== null) {
            appendMode.value = localAppendMode === 'true'
            console.log('Loaded append mode from localStorage (fallback):', appendMode.value)
          }
        } catch (localError) {
          console.error('Failed to load append mode from localStorage:', localError)
        }
      }

      // Load custom filename
      try {
        const savedFilename = await window.electron.invoke('load-custom-filename')
        customFilename.value = savedFilename
        console.log('Loaded custom filename:', savedFilename)
      } catch (error) {
        console.error('Failed to load custom filename:', error)
      }

      // Load background settings
      try {
        const savedBackgroundSettings = await window.electron.invoke('load-background-settings')
        if (savedBackgroundSettings) {
          backgroundSettings.value = savedBackgroundSettings
        }
      } catch (error) {
        console.error('Failed to load background settings:', error)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const saveSavePath = () => {
    console.log('Saving save path:', savePath.value)
    window.electron.send('save-save-path', savePath.value)
  }

  const saveAppendMode = () => {
    console.log('Saving append mode:', appendMode.value)
    // 尝试通过 IPC 保存到主进程
    try {
      window.electron.send('save-append-mode', appendMode.value)
    } catch (e) {
      console.error('Failed to save append mode to main process:', e)
    }

    // 同时保存到 localStorage 作为备选方案
    try {
      localStorage.setItem('webtoon-parser-append-mode', appendMode.value.toString())
      console.log('Saved append mode to localStorage (backup):', appendMode.value)
    } catch (e) {
      console.error('Failed to save append mode to localStorage:', e)
    }
  }

  const saveCustomFilename = () => {
    console.log('Saving custom filename:', customFilename.value)
    window.electron.send('save-custom-filename', customFilename.value)
  }

  const saveBackgroundSettings = () => {
    window.electron.send('save-background-settings', backgroundSettings.value)
  }

  const saveAllSettings = () => {
    saveSavePath()
    saveAppendMode()
    saveCustomFilename()
    saveBackgroundSettings()
  }

  return {
    // State
    savePath,
    appendMode,
    customFilename,
    backgroundSettings,

    // Actions
    loadSettings,
    saveSavePath,
    saveAppendMode,
    saveCustomFilename,
    saveBackgroundSettings,
    saveAllSettings
  }
})