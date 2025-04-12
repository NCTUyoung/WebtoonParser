/**
 * Excel策略工廠
 * 負責創建和提供適當的策略實例
 */

const WebtoonStrategy = require('./WebtoonStrategy');
const NovelStrategy = require('./NovelStrategy');

class StrategyFactory {
  constructor(logFunction) {
    this.log = logFunction || console.log;
    this.strategies = {
      webtoon: new WebtoonStrategy(logFunction),
      novel: new NovelStrategy(logFunction)
    };
  }
  
  /**
   * 根據內容類型獲取對應的策略
   * @param {boolean} isNovel - 是否為小說類型
   * @returns {BaseStrategy} 對應的策略實例
   */
  getStrategy(isNovel) {
    const type = isNovel ? 'novel' : 'webtoon';
    return this.strategies[type];
  }
  
  /**
   * 獲取所有可用的策略類型
   * @returns {Array} 策略類型數組
   */
  getAvailableTypes() {
    return Object.keys(this.strategies);
  }
}

module.exports = StrategyFactory; 