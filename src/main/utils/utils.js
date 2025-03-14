const iconv = require('iconv-lite');

class Utils {
  /**
   * 生成随机延迟时间
   * @param {number} min - 最小延迟时间（毫秒）
   * @param {number} max - 最大延迟时间（毫秒）
   * @returns {number} 随机延迟时间
   */
  static getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  /**
   * 从数组中随机选择一个元素
   * @param {Array} array - 源数组
   * @returns {*} 随机选中的元素
   */
  static getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * 创建默认的日志函数
   * @returns {Function} 日志函数
   */
  static createDefaultLogger() {
    return (message) => {
      if (process.platform === 'win32') {
        try {
          const encoded = iconv.encode(message, 'big5');
          process.stdout.write(encoded);
        } catch (error) {
          console.log('[編碼錯誤]', message);
        }
      } else {
        console.log(message);
      }
    };
  }

  /**
   * 解析数字字符串
   * @param {string} str - 要解析的字符串
   * @param {boolean} [isFloat=false] - 是否解析为浮点数
   * @returns {number} 解析后的数字
   */
  static parseNumberString(str, isFloat = false) {
    if (!str) return 0;
    const cleanStr = str.replace(/[^0-9.,]/g, '');
    return isFloat ? parseFloat(cleanStr) : parseInt(cleanStr);
  }

  /**
   * 格式化日期时间
   * @param {Date} [date=new Date()] - 日期对象
   * @returns {string} 格式化后的日期时间字符串
   */
  static formatDateTime(date = new Date()) {
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * 安全的文件名转换
   * @param {string} filename - 原始文件名
   * @param {number} maxLength - 最大长度
   * @returns {string} 处理后的文件名
   */
  static sanitizeFilename(filename, maxLength) {
    return filename
      .replace(/[\\/?*[\]]/g, '')
      .slice(0, maxLength) || '未知作品';
  }

  /**
   * 等待指定时间
   * @param {number} ms - 等待时间（毫秒）
   * @returns {Promise<void>}
   */
  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = Utils; 