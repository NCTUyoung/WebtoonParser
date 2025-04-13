/**
 * URL Store
 *
 * Manages URL input, history, label editing and deletion confirmation
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// History item interface
interface HistoryItem {
  url: string
  label: string
  editing?: boolean
  editLabel?: string
}

// Comic website pattern definition
interface ComicPattern {
  domain: string     // Domain to match (empty matches all)
  keySegment: string // Path segment that indicates comic name location
}

// Common generic terms in URLs
const GENERIC_TERMS = ['list', 'index', 'page', 'view', 'detail', 'show', 'content']

// Known comic website patterns
const COMIC_PATTERNS: ComicPattern[] = [
  // Generic patterns
  { domain: '', keySegment: 'comic' },
  { domain: '', keySegment: 'manga' },
  { domain: '', keySegment: 'series' },
  { domain: '', keySegment: 'title' },
  { domain: '', keySegment: 'webtoon' },

  // Site-specific patterns
  { domain: 'webtoon', keySegment: 'list' },       // Webtoon
  { domain: 'navercomic', keySegment: 'list' },    // Naver Comic
  { domain: 'comic.naver', keySegment: 'list' },   // Naver Comic
  { domain: 'kakao', keySegment: 'content' },      // Kakao webtoon
  { domain: 'lezhin', keySegment: 'comic' },       // Lezhin Comics
  { domain: 'bomtoon', keySegment: 'content' },    // Bomtoon
  { domain: 'comico', keySegment: 'articleList' }, // Comico
  { domain: 'toomics', keySegment: 'book' }        // Toomics
]

export const useUrlStore = defineStore('url', () => {
  //--------------------------------------------------------------------------
  // State
  //--------------------------------------------------------------------------

  const currentInput = ref('')               // Current input content
  const history = ref<HistoryItem[]>([])     // History records
  const searchQuery = ref('')                // Search keyword

  // Delete confirmation related state
  const deleteConfirmVisible = ref(false)    // Delete confirmation dialog visibility
  const itemToDelete = ref<HistoryItem | null>(null) // Item to delete

  //--------------------------------------------------------------------------
  // Computed Properties
  //--------------------------------------------------------------------------

  // Get non-empty URL list
  const urlList = computed(() => {
    return currentInput.value.split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)
  })

  // Check if there are valid URLs
  const hasValidUrls = computed(() => urlList.value.length > 0)

  // Filter history by search keyword
  const filteredHistory = computed(() => {
    if (!searchQuery.value) return history.value

    const query = searchQuery.value.toLowerCase()
    return history.value.filter(item =>
      (item.label && item.label.toLowerCase().includes(query)) ||
      item.url.toLowerCase().includes(query)
    )
  })

  //--------------------------------------------------------------------------
  // Data Loading & Saving
  //--------------------------------------------------------------------------

  // Load URLs
  const loadUrls = async () => {
    try {
      currentInput.value = await window.electron.invoke('load-urls')
      console.log('Loaded URLs')
    } catch (error) {
      console.error('Failed to load URLs:', error)
    }
  }

  // Load URL history
  const loadUrlHistory = async () => {
    try {
      const loadedHistory = await window.electron.invoke('load-url-history')
      if (Array.isArray(loadedHistory)) {
        history.value = loadedHistory.map(item => {
          if (typeof item === 'string') {
            return {
              url: item,
              label: item.split('/').pop() || item
            }
          } else if (typeof item === 'object' && item !== null) {
            return {
              url: item.url || '',
              label: item.label || (item.url ? item.url.split('/').pop() || item.url : '')
            }
          }
          return { url: '', label: '' }
        }).filter(item => item.url !== '')
      }
      console.log('Loaded URL history')
    } catch (error) {
      console.error('Failed to load URL history:', error)
    }
  }

  // Save URLs
  const saveUrls = () => {
    window.electron.send('save-urls', currentInput.value)
  }

  // Save URL history
  const saveUrlHistory = () => {
    const serializableHistory = history.value.map(item => ({
      url: item.url || '',
      label: item.label || ''
    }))
    window.electron.send('save-url-history', serializableHistory)
  }

  //--------------------------------------------------------------------------
  // History Management
  //--------------------------------------------------------------------------

  // Add current URLs to history
  const addToHistory = () => {
    if (!hasValidUrls.value) return

    const currentUrlsSet = new Set(urlList.value)
    const existingUrlsSet = new Set(history.value.map(item => item.url))

    urlList.value.forEach(url => {
      if (!existingUrlsSet.has(url)) {
        history.value.push({
          url,
          label: generateLabelFromUrl(url)
        })
      }
    })

    saveUrlHistory()
  }

  // Clear history
  const clearHistory = () => {
    history.value = []
    saveUrlHistory()
  }

  // Add URL to input field
  const addToInput = (url: string) => {
    if (currentInput.value.includes(url)) return

    if (currentInput.value.trim() === '') {
      currentInput.value = url
    } else {
      currentInput.value += '\n' + url
    }
    saveUrls()
  }

  //--------------------------------------------------------------------------
  // Label Extraction & Generation
  //--------------------------------------------------------------------------

  // Extract comic name from URL for known patterns
  const extractComicNameFromPatterns = (urlObj: URL, pathSegments: string[]): string => {
    const hostname = urlObj.hostname

    // Special handling for WEBTOON sites
    if (hostname.includes('webtoon') || hostname.includes('webtoons.com')) {
      if (pathSegments.length >= 2) {
        return pathSegments[pathSegments.length - 2] || ''
      }
    }

    // Check other comic website patterns
    for (const pattern of COMIC_PATTERNS) {
      if (pattern.domain === '' || hostname.includes(pattern.domain)) {
        const keyIndex = pathSegments.findIndex(segment =>
          segment.toLowerCase() === pattern.keySegment.toLowerCase()
        )

        if (keyIndex > 0) {
          return pathSegments[keyIndex - 1] || ''
        } else if (keyIndex === 0 && pathSegments.length > 1) {
          return pathSegments[1] || ''
        }
      }
    }

    return ''
  }

  // Extract comic name from URL string
  const extractComicNameFromString = (url: string): string => {
    const segments = url.split('/').filter(Boolean)

    // Look for 'list' pattern
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].toLowerCase() === 'list' && i > 0) {
        return segments[i-1] || ''
      }
    }

    // Check other generic terms
    for (let i = 0; i < segments.length; i++) {
      if (GENERIC_TERMS.includes(segments[i].toLowerCase()) && i > 0) {
        return segments[i-1] || ''
      }
    }

    return ''
  }

  // Extract label from URL
  const generateLabelFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const pathSegments = urlObj.pathname.split('/').filter(Boolean)

      // Try to extract comic name using patterns
      const comicName = extractComicNameFromPatterns(urlObj, pathSegments)
      if (comicName) return comicName

      // Standard extraction logic
      if (pathSegments.length === 0) {
        return urlObj.hostname
      }

      const lastSegment = pathSegments.pop() || ''

      if (GENERIC_TERMS.includes(lastSegment.toLowerCase())) {
        if (pathSegments.length > 0) {
          return pathSegments.pop() || ''
        }
        return urlObj.hostname
      }

      if (urlObj.searchParams.has('title')) {
        return urlObj.searchParams.get('title') || lastSegment
      }

      return lastSegment || urlObj.hostname
    } catch (e) {
      // Invalid URL format, try string extraction
      const comicName = extractComicNameFromString(url)
      if (comicName) return comicName

      const segments = url.split('/').filter(Boolean)
      return segments.length > 0 ? segments[segments.length - 1] : url
    }
  }

  // Generate and save URL label
  const generateLabel = (url: string): string => {
    const label = generateLabelFromUrl(url)
    history.value = history.value.map(item => {
      if (item.url === url) {
        return {
          ...item,
          label
        }
      }
      return item
    })
    saveUrlHistory()
    return label
  }

  //--------------------------------------------------------------------------
  // Label Editing
  //--------------------------------------------------------------------------

  // Start editing a label
  const startEditing = (url: string) => {
    history.value = history.value.map(item => {
      if (item.url === url) {
        return {
          ...item,
          editing: true,
          editLabel: item.label || ''
        }
      }
      return { ...item, editing: false }
    })
  }

  // Save edited label
  const saveLabel = (url: string, newLabel?: string) => {
    history.value = history.value.map(item => {
      if (item.url === url) {
        const label = newLabel || item.editLabel || item.label
        return {
          ...item,
          label: label.trim(),
          editing: false,
          editLabel: undefined
        }
      }
      return item
    })
    saveUrlHistory()
  }

  //--------------------------------------------------------------------------
  // Item Deletion
  //--------------------------------------------------------------------------

  // Delete item from history
  const deleteHistoryItem = (url: string) => {
    history.value = history.value.filter(item => item.url !== url)
    saveUrlHistory()
  }

  // Show delete confirmation dialog
  const showDeleteConfirm = (url: string) => {
    const item = history.value.find(item => item.url === url)
    if (item) {
      itemToDelete.value = item
      deleteConfirmVisible.value = true
    }
  }

  // Cancel delete operation
  const cancelDelete = () => {
    deleteConfirmVisible.value = false
    itemToDelete.value = null
  }

  // Confirm and execute delete operation
  const confirmDelete = () => {
    if (itemToDelete.value) {
      history.value = history.value.filter(item => item.url !== itemToDelete.value?.url)
      saveUrlHistory()
      deleteConfirmVisible.value = false
      itemToDelete.value = null
    }
  }

  //--------------------------------------------------------------------------
  // Export Interface
  //--------------------------------------------------------------------------

  return {
    // State
    currentInput,
    history,
    searchQuery,
    deleteConfirmVisible,
    itemToDelete,

    // Computed properties
    urlList,
    hasValidUrls,
    filteredHistory,

    // Data loading and saving
    loadUrls,
    loadUrlHistory,
    saveUrls,
    saveUrlHistory,

    // History management
    addToHistory,
    clearHistory,
    addToInput,

    // Label editing and generation
    startEditing,
    saveLabel,
    generateLabel,
    generateLabelFromUrl,

    // Item deletion
    deleteHistoryItem,
    showDeleteConfirm,
    cancelDelete,
    confirmDelete
  }
})