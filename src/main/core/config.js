const config = {
  // Request related configuration
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
  
  // Excel related configuration
  excel: {
    defaultColumns: [
      { header: '日期', key: 'date', width: 20 },
      { header: '作者', key: 'author', width: 20 },
      { header: '總觀看數', key: 'views', width: 15 },
      { header: '訂閱數', key: 'subscribers', width: 15 },
      { header: '評分', key: 'rating', width: 10 }
    ],
    maxSaveAttempts: 3,
    sheetNameMaxLength: 31,
    authorMaxLength: 20  // Maximum characters for author field
  },
  
  // Scraper related configuration
  scraper: {
    minPageDelay: 1000,
    maxPageDelay: 3000,
    minChapterDelay: 3000,
    maxChapterDelay: 6000
  },
  
  // Selector configuration
  selectors: {
    webtoon: {
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
        prevPage: 'a.pg_prev',
        episodeNumber: '.tx',
        episodeTitle: '.subj span',
        episodeDate: '.date',
        episodeLikes: '.like_area'
    },
    kadokado: {
        title: 'h1.css-13pwcqv',
        author: '.css-ykwscm .css-1udy97n a',
        description: '#introduction .css-hs30jl',
        likes: '.css-13r89do .css-fyb2z6 .css-19vsh96',
        views: '.css-13r89do .css-1uju5dn .css-19vsh96',
        status: '#chapter .css-1upcx53:nth-child(1) .css-4cffwv:nth-child(1) .css-vurnku',
        totalChapters: '#chapter .css-1upcx53:nth-child(2) .css-4cffwv:nth-child(1) .css-vurnku',
        totalWords: '#chapter .css-1upcx53:nth-child(1) .css-4cffwv:nth-child(2) .css-vurnku',
        chapterListContainer: '#chapter .css-17dn726',
        chapterItem: 'ul.css-17dn726 > li.css-vurnku',
        chapterLink: 'a.css-lz56cq',
        chapterTitle: 'h4.css-egx0he',
        chapterUpdateDate: '.css-l8h7m9 > span.css-vurnku',
        chapterWords: '.css-18ww83x svg[viewBox="0 0 16 16"] + .css-vurnku'
    }
  },

  // Site URL patterns
  siteUrlPatterns: {
    webtoon: /https:\/\/www\.webtoons\.com\/.*\/(?:list\?title_no=|viewer\?title_no=)/,
    kadokado: /https:\/\/www\.kadokado\.com\.tw\/book\/\d+/
  },

  // Application configuration
  app: {
    // Default language setting
    defaultLocale: 'zh_TW.UTF-8',
    
    // Window configuration
    window: {
      width: 1000,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false
      }
    },
    
    // Development mode settings
    dev: {
      devServerWaitTime: 2000,
      port: 3000
    }
  },
  
  // Storage related configuration
  storage: {
    // Default setting values
    defaults: {
      scheduledDay: '五',
      scheduledHour: '18',
      scheduledMinute: '00',
      timezone: 'Asia/Taipei'
    },
    
    // Storage key names
    keys: {
      urls: 'webtoon-urls',
      scheduleSettings: 'schedule-settings',
      savePath: 'save-path',
      urlHistory: 'url-history'
    }
  },
  
  // Date settings
  date: {
    // Weekly date mapping
    dayOfWeekMap: {
      '一': 1, 
      '二': 2, 
      '三': 3, 
      '四': 4,
      '五': 5, 
      '六': 6, 
      '日': 0
    }
  }
};

module.exports = config; 