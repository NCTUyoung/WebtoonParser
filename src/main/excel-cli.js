/**
 * Excel整合命令行工具
 * 用於測試Excel功能
 */

const path = require('path');
const fs = require('fs');
const excelIntegration = require('./excel-integration');
const testManager = require('./excel/test-manager');

// 創建日誌函數
function createLogger() {
  return function(message) {
    console.log(`[ExcelCLI] ${message}`);
  };
}

// 保存測試數據
async function saveTestData(isNovel = false, append = false, customFilename = '') {
  const logger = createLogger();
  const manager = excelIntegration.getExcelManager(logger);

  // 創建測試數據
  const now = new Date();
  const info = isNovel ? {
    title: '測試小說',
    author: '測試作者',
    views: '987,654',
    likes: '5,678',
    status: '連載中',
    totalChapters: '15',
    totalWords: '120,000',
    scrapedAt: now.toISOString()
  } : {
    title: '測試漫畫',
    author: '測試作者',
    views: '1,234,567',
    subscribers: '4,321',
    rating: '9.8',
    updateDay: '星期一',
    summary: '這是一個測試漫畫摘要',
    scrapedAt: now.toISOString()
  };

  const chapters = [];
  for (let i = 1; i <= 10; i++) {
    chapters.push(isNovel ? {
      title: `測試章節 ${i}`,
      number: `#${i}`,
      date: now.toLocaleDateString(),
      words: i * 1000,
      url: `https://example.com/chapter/${i}`
    } : {
      title: `測試章節 ${i}`,
      number: `#${i}`,
      date: now.toLocaleDateString(),
      likes: `${i * 1000}`,
      url: `https://example.com/chapter/${i}`
    });
  }

  // 保存目錄
  const saveDir = path.join(process.cwd(), 'test-output');
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  console.log(`保存${isNovel ? '小說' : '漫畫'}測試數據...`);
  console.log(`- 模式: ${append ? '追加' : '新建'}`);
  console.log(`- 自定義檔名: ${customFilename || '[預設]'}`);

  try {
    const result = await manager.saveWorkbook({
      info,
      chapters,
      savePath: saveDir,
      append,
      isNovel,
      filename: customFilename
    });

    console.log(`保存成功! 文件路徑: ${result.filePath}`);
    console.log(`行添加状态: ${result.rowAdded ? '成功' : '失败'}, 行数: ${result.initialRowCount} -> ${result.finalRowCount}`);

    return result.filePath;
  } catch (error) {
    console.error(`保存失敗: ${error.message}`);
    throw error;
  }
}

// 運行所有測試
async function runAllTests() {
  console.log('===== 運行所有Excel測試 =====');
  await testManager.runAllTests();
}

// 顯示幫助信息
function showHelp() {
  console.log('Excel整合命令行工具使用說明:');
  console.log('--save-novel       保存小說測試數據');
  console.log('--save-webtoon     保存漫畫測試數據');
  console.log('--append           與--save-*一起使用，開啟追加模式');
  console.log('--filename=NAME    與--save-*一起使用，指定自定義檔名');
  console.log('--run-tests        運行所有測試');
  console.log('--help             顯示此幫助信息');
}

// 解析命令行參數
async function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    return;
  }

  if (args.includes('--run-tests')) {
    await runAllTests();
    return;
  }

  const append = args.includes('--append');
  let customFilename = '';

  for (const arg of args) {
    if (arg.startsWith('--filename=')) {
      customFilename = arg.split('=')[1];
    }
  }

  if (args.includes('--save-novel')) {
    await saveTestData(true, append, customFilename);
  } else if (args.includes('--save-webtoon')) {
    await saveTestData(false, append, customFilename);
  }
}

// 主函數
async function main() {
  try {
    await parseArgs();
  } catch (error) {
    console.error('錯誤:', error);
    process.exit(1);
  }
}

// 如果直接運行此文件，則執行主函數
if (require.main === module) {
  main();
}

module.exports = {
  saveTestData,
  runAllTests
};