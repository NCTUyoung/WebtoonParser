// Excel Integration Module
// Simplified version that uses the new Excel API

const { createExcel, saveExcelData } = require('./excel');

// Get Excel manager instance
function getExcelManager(logFunction) {
  // Logger function wrapper
  const wrappedLogger = function(message) {
    if (logFunction) {
      logFunction(`[Excel] ${message}`);
    }
  };

  // Use the new createExcel function
  return createExcel(wrappedLogger);
}

// Safe Excel save functionality
async function safelySaveExcel(logFunction, ...args) {
  try {
    const wrappedLogger = function(message) {
      if (logFunction) {
        logFunction(`[Excel] ${message}`);
      }
    };

    // Use the new saveExcelData function or support legacy parameters
    let result;
    if (args.length === 1 && typeof args[0] === 'object') {
      // New object-based parameter format
      result = await saveExcelData(args[0], wrappedLogger);
    } else {
      // Legacy parameter format: convert to object format
      const [info, chapters, savePath, append, isNovel, filename] = args;
      result = await saveExcelData({
        info: info || {},
        chapters: chapters || [],
        savePath,
        append: !!append,
        isNovel: !!isNovel,
        filename
      }, wrappedLogger);
    }

    // Log row addition results
    if (result.rowAdded) {
      logFunction(`Successfully added data rows. Row count increased from ${result.initialRowCount} to ${result.finalRowCount}`);
    } else {
      logFunction(`Warning: Data rows may not have been successfully added to worksheet ${result.worksheetName}`);
    }

    // Return file path for backward compatibility
    return result.filePath;
  } catch (error) {
    logFunction(`Excel processor error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getExcelManager,
  safelySaveExcel
};