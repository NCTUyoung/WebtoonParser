// Excel Configuration File
// Contains all configuration parameters for Excel generation

module.exports = {
  // Excel basic configuration
  sheetNameMaxLength: 31,
  authorMaxLength: 20,

  // Column definitions
  columns: {
    webtoon: {
      required: ['date', 'author', 'views', 'subscribers', 'rating'],
      widths: {
        date: 20,
        author: 20,
        views: 15,
        subscribers: 15,
        rating: 10,
        default: 10
      }
    },
    novel: {
      required: ['date', 'author', 'views', 'likes', 'status', 'totalChapters', 'totalWords'],
      widths: {
        date: 20,
        author: 20,
        views: 15,
        likes: 15,
        status: 15,
        totalChapters: 15,
        totalWords: 15,
        default: 10
      }
    }
  },

  // Style definitions
  styles: {
    headerFont: { bold: true },
    headerFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } },
    headerBorder: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    },
    headerAlignment: { vertical: 'middle', horizontal: 'center' },

    cellFont: { name: 'Arial' },
    cellBorder: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    },
    hyperlinkFont: { color: { argb: 'FF0000FF' }, underline: true }
  },

  // Chapter column formats
  chapterFormats: {
    webtoon: {
      headerPrefix: 'CH',
      regex: /^CH(\d+)$/i
    },
    novel: {
      headerPrefix: 'Words_CH',
      regex: /^WORDS_CH(\d+)$/i
    }
  },

  // File naming
  filenameFormats: {
    webtoon: {
      default: 'webtoon_stats_{date}.xlsx',
      append: 'webtoon_stats_daily_append.xlsx'
    },
    novel: {
      default: 'novel_stats_{date}.xlsx',
      append: 'novel_stats_daily_append.xlsx'
    }
  },

  // Save attempts
  maxSaveAttempts: 3
};