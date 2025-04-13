// ExcelManager Test File
// For testing Excel processing module functionality

const path = require('path');
const { app } = require('electron');
const excelIntegration = require('../excel-integration');
const { createExcel } = require('./index');

// Create test logger function
function createTestLogger(prefix = '[Test]') {
  return function(message) {
    console.log(`${prefix} ${message}`);
  };
}

// Test save webtoon data
async function testSaveWebtoonData() {
  const logger = createTestLogger('[Test Webtoon]');
  logger('Starting webtoon data save test...');

  try {
    // Create test data
    const info = {
      title: 'Test Webtoon',
      author: 'Test Author',
      views: '1,234,567',
      subscribers: '4,321',
      rating: '9.8',
      updateDay: 'Monday',
      summary: 'This is a test webtoon summary'
    };

    const chapters = [];
    for (let i = 1; i <= 10; i++) {
      chapters.push({
        title: `Test Chapter ${i}`,
        number: `#${i}`,
        date: new Date().toLocaleDateString(),
        likes: `${i * 1000}`
      });
    }

    // Test directory
    const testDir = path.join(app.getPath('desktop'), 'excel-test');

    // 1. Use ExcelManager directly
    logger('Using ExcelManager directly...');
    const manager = createExcel(logger);
    const directResult = await manager.saveWorkbook({
      info,
      chapters,
      savePath: testDir,
      append: false,
      isNovel: false,
      filename: 'direct_test'
    });
    logger(`Direct save result: ${directResult.filePath}, Row added: ${directResult.rowAdded ? 'Success' : 'Failed'}`);

    // 2. Use integration module
    logger('Using excel-integration...');
    const integrationManager = excelIntegration.getExcelManager(logger);
    const integrationResult = await integrationManager.saveWorkbook({
      info,
      chapters,
      savePath: testDir,
      append: false,
      isNovel: false,
      filename: 'integration_test'
    });
    logger(`Integration save result: ${integrationResult.filePath}, Row added: ${integrationResult.rowAdded ? 'Success' : 'Failed'}`);

    // 3. Test append mode
    logger('Using append mode...');
    const appendResult = await integrationManager.saveWorkbook({
      info,
      chapters,
      savePath: testDir,
      append: true,
      isNovel: false,
      filename: 'append_test'
    });
    logger(`Append save result: ${appendResult.filePath}, Row added: ${appendResult.rowAdded ? 'Success' : 'Failed'}`);

    logger('All tests completed!');
    return { directResult, integrationResult, appendResult };
  } catch (error) {
    logger(`Test failed: ${error.message}`);
    throw error;
  }
}

// Test save novel data
async function testSaveNovelData() {
  const logger = createTestLogger('[Test Novel]');
  logger('Starting novel data save test...');

  try {
    // Create test data
    const info = {
      title: 'Test Novel',
      author: 'Test Author',
      views: '987,654',
      likes: '5,678',
      status: 'Ongoing',
      totalChapters: '15',
      totalWords: '120,000'
    };

    const chapters = [];
    for (let i = 1; i <= 15; i++) {
      chapters.push({
        title: `Test Chapter ${i}`,
        number: `#${i}`,
        date: new Date().toLocaleDateString(),
        words: i * 1000
      });
    }

    // Test directory
    const testDir = path.join(app.getPath('desktop'), 'excel-test');

    // 1. Save new file with integration module
    logger('Using new file mode to save novel data...');
    const manager = excelIntegration.getExcelManager(logger);
    const newResult = await manager.saveWorkbook({
      info,
      chapters,
      savePath: testDir,
      append: false,
      isNovel: true,
      filename: 'novel_test'
    });
    logger(`New file save result: ${newResult.filePath}, Row added: ${newResult.rowAdded ? 'Success' : 'Failed'}`);

    // 2. Use append mode
    logger('Using append mode to save novel data...');
    const appendResult = await manager.saveWorkbook({
      info,
      chapters,
      savePath: testDir,
      append: true,
      isNovel: true,
      filename: 'novel_append_test'
    });
    logger(`Append save result: ${appendResult.filePath}, Row added: ${appendResult.rowAdded ? 'Success' : 'Failed'}`);

    logger('All novel tests completed!');
    return { newResult, appendResult };
  } catch (error) {
    logger(`Novel test failed: ${error.message}`);
    throw error;
  }
}

// Main function for all tests
async function runAllTests() {
  console.log('====== Starting Excel Module Tests ======');

  try {
    // Webtoon data test
    console.log('\n[Test] Testing webtoon data save');
    await testSaveWebtoonData();

    // Novel data test
    console.log('\n[Test] Testing novel data save');
    await testSaveNovelData();

    console.log('\n====== All Tests Completed ======');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Export test functions
module.exports = {
  testSaveWebtoonData,
  testSaveNovelData,
  runAllTests
};

// If running this file directly, execute all tests
if (require.main === module) {
  runAllTests();
}