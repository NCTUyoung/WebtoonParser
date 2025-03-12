const config = {
  // 请求相关配置
  request: {
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
    ],
    retryAttempts: 3,
    baseDelay: 3000,
    randomDelayRange: 2000
  },
  
  // Excel 相关配置
  excel: {
    defaultColumns: [
      { header: '日期', key: 'date', width: 20 },
      { header: '作者', key: 'author', width: 30 },
      { header: '總觀看數', key: 'views', width: 15 },
      { header: '訂閱數', key: 'subscribers', width: 15 },
      { header: '評分', key: 'rating', width: 10 }
    ],
    maxSaveAttempts: 3,
    sheetNameMaxLength: 31
  },
  
  // 爬虫相关配置
  scraper: {
    minPageDelay: 1000,
    maxPageDelay: 3000,
    minChapterDelay: 3000,
    maxChapterDelay: 6000
  },
  
  // 选择器配置
  selectors: {
    title: 'h1.subj',
    author: '.author_area',
    authorAlternative: ['.author_area .author', '.author_area .author_name'],
    views: '.grade_area .ico_view + em.cnt',
    subscribers: '.grade_area .ico_subscribe + em.cnt',
    rating: '.grade_area .ico_grade5 + em.cnt',
    updateDay: ['.day_info', '.date:first'],
    summary: 'p.summary',
    episodeItem: '._episodeItem',
    pagination: '.paginate',
    nextPage: 'a.pg_next',
    prevPage: 'a.pg_prev'
  }
};

module.exports = config; 