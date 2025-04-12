/**
 * Excel模塊入口點
 * 導出模塊化Excel處理類及管理器
 */

const ExcelManager = require('./ExcelManager');
const WorkbookHandler = require('./handlers/WorkbookHandler');
const WorksheetHandler = require('./handlers/WorksheetHandler');
const DataHandler = require('./handlers/DataHandler');
const ColumnMapper = require('./utils/ColumnMapper');
const WorksheetBuilder = require('./utils/WorksheetBuilder');
const BaseStrategy = require('./strategies/BaseStrategy');
const WebtoonStrategy = require('./strategies/WebtoonStrategy');
const NovelStrategy = require('./strategies/NovelStrategy');
const StrategyFactory = require('./strategies/StrategyFactory');
const ExcelWorksheetProcessor = require('./processors/ExcelWorksheetProcessor');
const ExcelDataFormatter = require('./formatters/ExcelDataFormatter');
const ExcelRowManager = require('./managers/ExcelRowManager');

// 將所有處理類導出，便於單獨使用
module.exports = {
  // 主要管理器
  ExcelManager,

  // 各個處理器
  WorkbookHandler,
  WorksheetHandler,
  DataHandler,
  ColumnMapper,
  WorksheetBuilder,

  // 新增的專門處理類
  processors: {
    ExcelWorksheetProcessor,
    ExcelDataFormatter,
    ExcelRowManager
  },

  // 策略相關
  strategies: {
    BaseStrategy,
    WebtoonStrategy,
    NovelStrategy,
    StrategyFactory
  },

  // 工具類
  utils: {
    WorksheetBuilder,
    ColumnMapper
  },

  // 提供與舊版ExcelManager相同的接口
  createManager: function(logFunction) {
    return new ExcelManager(logFunction);
  }
};