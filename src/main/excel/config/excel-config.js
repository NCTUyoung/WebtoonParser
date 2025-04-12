/**
 * Excel 配置文件
 * 包含 Excel 生成相關的所有配置參數
 */

module.exports = {
  // Excel 基本配置
  sheetNameMaxLength: 31,
  authorMaxLength: 20,
  
  // 列定義
  columns: {
    common: [
      { key: 'date', header: 'Date', width: 20 },
      { key: 'author', header: 'Author', width: 20 }
    ],
    webtoon: [
      { key: 'views', header: 'Total Views', width: 15 },
      { key: 'subscribers', header: 'Subscribers', width: 15 },
      { key: 'rating', header: 'Rating', width: 10 }
    ],
    novel: [
      { key: 'views', header: 'Total Views', width: 15 },
      { key: 'likes', header: 'Likes', width: 15 },
      { key: 'status', header: 'Status', width: 15 },
      { key: 'totalChapters', header: 'Total Chapters', width: 15 },
      { key: 'totalWords', header: 'Total Words', width: 15 }
    ]
  },
  
  // 章節列格式
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
  
  // 文件命名
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
  
  // 保存嘗試次數
  maxSaveAttempts: 3
}; 