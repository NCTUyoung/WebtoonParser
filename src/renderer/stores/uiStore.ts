/**
 * UI Store
 * 
 * Manages UI-related state such as collapsible sections,
 * theme preferences, etc.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // Section collapse states
  const isUrlSectionExpanded = ref(true)
  const isScheduleSectionExpanded = ref(true)
  const isSavePathSectionExpanded = ref(true)
  const isBackgroundSectionExpanded = ref(false)
  const isLogSectionExpanded = ref(true)

  // Actions
  const toggleSection = (section: string) => {
    switch (section) {
      case 'url':
        isUrlSectionExpanded.value = !isUrlSectionExpanded.value
        saveCollapseState('url', isUrlSectionExpanded.value)
        break
      case 'schedule':
        isScheduleSectionExpanded.value = !isScheduleSectionExpanded.value
        saveCollapseState('schedule', isScheduleSectionExpanded.value)
        break
      case 'savePath':
        isSavePathSectionExpanded.value = !isSavePathSectionExpanded.value
        saveCollapseState('savePath', isSavePathSectionExpanded.value)
        break
      case 'background':
        isBackgroundSectionExpanded.value = !isBackgroundSectionExpanded.value
        saveCollapseState('background', isBackgroundSectionExpanded.value)
        break
      case 'log':
        isLogSectionExpanded.value = !isLogSectionExpanded.value
        saveCollapseState('log', isLogSectionExpanded.value)
        break
    }
  }

  const saveCollapseState = (section: string, isExpanded: boolean) => {
    try {
      localStorage.setItem(`section-${section}-expanded`, String(isExpanded))
    } catch (error) {
      console.error('Failed to save collapse state:', error)
    }
  }

  const loadCollapseStates = () => {
    try {
      const urlExpanded = localStorage.getItem('section-url-expanded')
      const scheduleExpanded = localStorage.getItem('section-schedule-expanded')
      const savePathExpanded = localStorage.getItem('section-savePath-expanded')
      const backgroundExpanded = localStorage.getItem('section-background-expanded')
      const logExpanded = localStorage.getItem('section-log-expanded')

      if (urlExpanded !== null) isUrlSectionExpanded.value = urlExpanded === 'true'
      if (scheduleExpanded !== null) isScheduleSectionExpanded.value = scheduleExpanded === 'true'
      if (savePathExpanded !== null) isSavePathSectionExpanded.value = savePathExpanded === 'true'
      if (backgroundExpanded !== null) isBackgroundSectionExpanded.value = backgroundExpanded === 'true'
      if (logExpanded !== null) isLogSectionExpanded.value = logExpanded === 'true'
    } catch (error) {
      console.error('Failed to load collapse states:', error)
    }
  }

  return {
    // State
    isUrlSectionExpanded,
    isScheduleSectionExpanded,
    isSavePathSectionExpanded,
    isBackgroundSectionExpanded,
    isLogSectionExpanded,
    
    // Actions
    toggleSection,
    loadCollapseStates,
    saveCollapseState
  }
}) 