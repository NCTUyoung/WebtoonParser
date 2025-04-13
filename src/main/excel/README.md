# Excel Processing Module

A streamlined Excel processing module for the Webtoon/Novel parser project.

## Module Structure

```
excel/
├── core/                # Core functionality
│   ├── ExcelManager.js    # Main orchestration class
│   ├── ExcelService.js    # Data service handling formatting and processing
│   └── WorkbookProcessor.js # Workbook and worksheet processing
├── strategies/          # Strategy patterns
│   ├── BaseStrategy.js    # Base strategy interface
│   ├── WebtoonStrategy.js # Webtoon processing strategy
│   ├── NovelStrategy.js   # Novel processing strategy
│   └── StrategyFactory.js # Strategy factory
├── utils/               # Utility classes
│   └── WorksheetBuilder.js # Worksheet building utilities
├── config/              # Configuration
│   └── excel-config.js    # Excel related configuration
├── index.js             # Simplified module entry point
└── README.md            # Documentation
```

## Usage

### Simple API

```javascript
// Import the Excel module
const excel = require('../excel');

// Create Excel file with webtoon data
const result = await excel.saveExcelData({
  info: {
    title: 'My Webtoon',
    author: 'Author Name',
    views: '1,234,567',
    subscribers: '4,321',
    rating: '9.8'
  },
  chapters: [
    { title: 'Chapter 1', number: '#1', likes: '1000' },
    { title: 'Chapter 2', number: '#2', likes: '2000' }
  ],
  savePath: '/path/to/save',
  append: false,
  isNovel: false,
  filename: 'custom.xlsx'
});

console.log(`File saved to: ${result.filePath}`);
```

### Using Excel Integration

```javascript
const excelIntegration = require('../excel-integration');

// Using safe save functionality with object parameters
const result = await excelIntegration.safelySaveExcel(
  logger,
  {
    info: infoObject,
    chapters: chapterArray,
    savePath: '/path/to/save',
    append: false,
    isNovel: false,
    filename: 'filename.xlsx'
  }
);
```

### For Advanced Usage

If you need more control, you can use the direct Excel manager:

```javascript
const { createExcel } = require('../excel');

// Create Excel manager
const excelManager = createExcel(logger);

// Use the manager directly
const result = await excelManager.saveWorkbook({
  info: infoObject,
  chapters: chapterArray,
  savePath: savePath,
  append: false,
  isNovel: true
});
```

## Return Values

All operations return a comprehensive result object:

```javascript
{
  filePath: '/path/to/saved.xlsx',  // Path to the saved file
  rowAdded: true,                   // Whether rows were added
  initialRowCount: 1,               // Row count before adding data
  finalRowCount: 2,                 // Row count after adding data
  worksheetName: 'Webtoon Title',   // Name of the worksheet
  processingTime: 1.25,             // Time taken in seconds
  isAppendMode: false               // Whether append mode was used
}
```

## Features

1. **Strategy Pattern**: Uses strategy pattern for different content types (webtoon/novel)
2. **Unified API**: Simplified interface with comprehensive error handling
3. **Modular Core**: Separation of concerns with specialized components
4. **Backward Compatibility**: Maintains compatibility with legacy API
5. **Robust Error Handling**: Fallback mechanisms and detailed error reporting

## Testing

For testing the module, use the included test utilities:

```javascript
const testManager = require('./excel/test-manager');
await testManager.runAllTests();
```

## 最近更新

### 章节处理逻辑重构
- 章节处理逻辑现已集中到Strategy策略类中，提高了代码的可维护性
- 为BaseStrategy添加了以下新方法:
  - `prepareChapterData(chapters)`: 处理和标准化章节数据
  - `buildChapterColumns(chaptersByNumber)`: 构建章节列定义
  - `extractChapterFieldValue(colName, chaptersByNumber)`: 提取章节字段值

- 相关的改动：
  - ExcelService中的prepareChapterData方法标记为废弃
  - WorkbookProcessor中的buildChapterColumns方法标记为废弃
  - ExcelManager现在使用Strategy类的prepareChapterData方法处理章节数据

这些更改使章节相关逻辑更加集中和一致，提高了代码的可维护性和可扩展性。针对不同内容类型(漫画/小说)的特定逻辑现在完全封装在各自的策略类中。