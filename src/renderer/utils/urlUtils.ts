/**
 * URL工具函数
 */

/**
 * 验证URL是否有效
 * @param url 要验证的URL
 * @returns 是否为有效URL
 */
export function isValidUrl(url: string): boolean {
  try {
    // 尝试创建URL对象，如果成功则为有效URL
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 从URL中提取域名
 * @param url 输入的URL
 * @returns 提取的域名
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return '';
  }
}

/**
 * 生成URL的默认标签名
 * @param url 输入的URL
 * @returns 生成的标签名
 */
export function generateLabelFromUrl(url: string): string {
  try {
    // 特殊處理 webtoons.com 網址
    if (url.includes('webtoons.com')) {
      // 嘗試從路徑中提取漫畫名稱
      // 例如 https://www.webtoons.com/zh-hant/drama/test-comic/list?title_no=123
      // 應該提取 "test-comic"
      const match = url.match(/webtoons\.com\/[^\/]+\/[^\/]+\/([^\/]+)\//)
      if (match && match[1]) {
        // 將連字符轉換為空格並首字母大寫
        return match[1]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }
    }
    
    // 特殊處理 comic.naver.com 網址
    if (url.includes('comic.naver.com')) {
      // 嘗試從查詢參數中提取標題
      const titleMatch = url.match(/titleId=(\d+)/)
      if (titleMatch && titleMatch[1]) {
        return `Naver Comic ${titleMatch[1]}`
      }
    }
    
    // 特殊處理 manga.bilibili.com 網址
    if (url.includes('manga.bilibili.com')) {
      // 嘗試從路徑中提取漫畫ID
      const match = url.match(/manga\/detail\/(\d+)/)
      if (match && match[1]) {
        return `Bilibili Manga ${match[1]}`
      }
    }
    
    // 嘗試從URL路徑中提取有意義的部分
    try {
      const urlObj = new URL(url);
      // 忽略空路徑和常見的無意義路徑
      const pathParts = urlObj.pathname.split('/')
        .filter(part => part && !['www', 'index', 'home', 'page'].includes(part));
      
      if (pathParts.length > 0) {
        // 使用最後一個非空路徑部分作為標籤
        const lastPart = pathParts[pathParts.length - 1];
        // 移除文件擴展名和查詢參數
        const cleanPart = lastPart.replace(/\.(html|php|aspx|jsp)$/, '');
        
        if (cleanPart && cleanPart.length > 1) {
          // 將連字符和下劃線轉換為空格並首字母大寫
          return cleanPart
            .replace(/[-_]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }
    } catch (e) {
      // 忽略URL解析錯誤，繼續使用域名方法
    }
    
    // 一般網址處理邏輯
    const domain = extractDomain(url);
    // 移除www.前缀
    const cleanDomain = domain.replace(/^www\./, '');
    // 获取主域名部分（例如从example.com中获取example）
    const parts = cleanDomain.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
    }
    return cleanDomain;
  } catch (e) {
    return '未命名';
  }
}

/**
 * 从剪贴板文本中提取URL
 * @param text 剪贴板文本
 * @returns 提取的URL数组
 */
export function extractUrlsFromText(text: string): string[] {
  if (!text) return [];
  
  // URL正则表达式
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  
  return matches ? matches : [];
}

/**
 * 格式化URL（确保有http/https前缀）
 * @param url 输入的URL
 * @returns 格式化后的URL
 */
export function formatUrl(url: string): string {
  if (!url) return '';
  
  // 如果URL没有协议前缀，添加https://
  if (!url.match(/^https?:\/\//i)) {
    return `https://${url}`;
  }
  
  return url;
} 