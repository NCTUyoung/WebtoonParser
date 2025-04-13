// Excel Module Entry Point
// Exports simplified Excel processing API

// Import core components
const ExcelManager = require('./core/ExcelManager');
const BaseStrategy = require('./strategies/BaseStrategy');
const WebtoonStrategy = require('./strategies/WebtoonStrategy');
const NovelStrategy = require('./strategies/NovelStrategy');
const StrategyFactory = require('./strategies/StrategyFactory');

// Simple factory function - main API
function createExcel(logFunction) {
  return new ExcelManager(logFunction);
}

// Save Excel data with comprehensive error handling
async function saveExcelData(options, logFunction) {
  const excel = createExcel(logFunction);
  try {
    return await excel.saveWorkbook(options);
  } catch (error) {
    if (logFunction) {
      logFunction(`Excel error: ${error.message}`);
    }
    throw error;
  }
}

// Module exports
module.exports = {
  // Main API
  createExcel,
  saveExcelData,

  // For backward compatibility
  createManager: createExcel,

  // Advanced components (for power users)
  components: {
    // Strategies
    strategies: {
      BaseStrategy,
      WebtoonStrategy,
      NovelStrategy,
      StrategyFactory
    }
  }
};