const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ExcelJS = require('exceljs');
const WebtoonScraper = require('../src/main/webtoon');

describe('Excel输出测试', function() {
  this.timeout(120000); // 设置超时时间为120秒，因为下载和处理可能需要较长时间
  
  const testUrls = [
    'https://www.webtoons.com/zh-hant/drama/yumi-cell/list?title_no=478',
    'https://www.webtoons.com/zh-hant/fantasy/tower-of-god/list?title_no=1785'
  ];
  
  let tempDir;
  let excelFiles = [];
  
  before(function() {
    // 创建临时目录用于保存测试文件
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webtoon-excel-test-'));
    console.log(`临时测试目录: ${tempDir}`);
  });
  
  after(function() {
    // 测试完成后输出文件信息但不删除，以便检查
    console.log(`测试生成的Excel文件: ${excelFiles.join(', ')}`);
  });
  
  it('应该能够将多个URL的数据输出到Excel文件', async function() {
    // 依次处理每个URL并生成Excel文件
    for (let i = 0; i < testUrls.length; i++) {
      const url = testUrls[i];
      const scraper = new WebtoonScraper(url);
      const info = await scraper.getWebtoonInfo();
      const chapters = await scraper.getAllChapters();
      
      // 使用唯一的文件名
      const customPath = path.join(tempDir, `webtoon_excel_test_${i+1}.xlsx`);
      const excelPath = await scraper.saveToExcel(info, chapters, customPath);
      
      // 保存文件路径以便后续验证
      excelFiles.push(excelPath);
      
      // 验证文件是否存在
      expect(fs.existsSync(excelPath)).to.be.true;
      
      // 验证文件大小是否大于0
      const stats = fs.statSync(excelPath);
      expect(stats.size).to.be.greaterThan(0);
      
      console.log(`成功生成Excel文件: ${excelPath}`);
      console.log(`文件大小: ${stats.size} 字节`);
    }
    
    // 验证是否生成了正确数量的文件
    expect(excelFiles.length).to.equal(testUrls.length);
  });
  
  it('应该能够验证Excel文件的内容格式正确', async function() {
    // 验证每个Excel文件的内容
    for (const excelPath of excelFiles) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      
      // 验证工作簿至少有一个工作表
      expect(workbook.worksheets.length).to.be.at.least(1);
      
      const worksheet = workbook.worksheets[0];
      
      // 验证工作表有标题行
      expect(worksheet.getRow(1).values.length).to.be.greaterThan(1);
      
      // 验证工作表至少有一行数据
      expect(worksheet.rowCount).to.be.at.least(2);
      
      // 验证必要的列存在
      const headerRow = worksheet.getRow(1).values;
      const requiredColumns = ['日期', '作者', '總觀看數', '訂閱數', '評分'];
      
      for (const column of requiredColumns) {
        const columnIndex = headerRow.findIndex(header => header === column);
        expect(columnIndex).to.be.greaterThan(0, `列 "${column}" 应该存在`);
      }
      
      // 验证章节列存在（以"CH"开头的列）
      const chapterColumns = headerRow.filter(header => 
        typeof header === 'string' && header.toUpperCase().startsWith('CH')
      );
      expect(chapterColumns.length).to.be.greaterThan(0, '应该存在章节列');
      
      console.log(`Excel文件 ${path.basename(excelPath)} 验证通过，包含 ${worksheet.rowCount-1} 行数据和 ${headerRow.length-1} 列`);
    }
  });
  
  it('应该能够验证Excel文件中的数据类型正确', async function() {
    // 验证每个Excel文件中的数据类型
    for (const excelPath of excelFiles) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      
      const worksheet = workbook.worksheets[0];
      const dataRow = worksheet.getRow(2); // 第一行数据
      const headerRow = worksheet.getRow(1).values;
      
      // 获取列名和列索引的映射
      const columnMap = {};
      headerRow.forEach((header, index) => {
        if (header) {
          columnMap[header] = index;
        }
      });
      
      // 验证日期列是字符串类型
      const dateIndex = columnMap['日期'];
      if (dateIndex) {
        const dateCell = dataRow.getCell(dateIndex);
        expect(typeof dateCell.value).to.be.oneOf(['string', 'object'], '日期应该是字符串或日期对象');
      }
      
      // 验证作者列是字符串类型
      const authorIndex = columnMap['作者'];
      if (authorIndex) {
        const authorCell = dataRow.getCell(authorIndex);
        expect(typeof authorCell.value).to.equal('string', '作者应该是字符串');
      }
      
      // 验证数值列是数字类型
      const numericColumns = ['總觀看數', '訂閱數', '評分'];
      for (const column of numericColumns) {
        const columnIndex = columnMap[column];
        if (columnIndex) {
          const cell = dataRow.getCell(columnIndex);
          if (cell.value !== null) {
            expect(typeof cell.value).to.be.oneOf(['number', 'string'], `${column}应该是数字或字符串`);
          }
        }
      }
      
      // 验证章节列是数字类型
      const chapterColumns = Object.entries(columnMap)
        .filter(([header]) => header.toUpperCase().startsWith('CH'))
        .map(([header, index]) => ({ header, index }));
      
      for (const { header, index } of chapterColumns) {
        const cell = dataRow.getCell(index);
        if (cell.value !== null) {
          expect(typeof cell.value).to.be.oneOf(['number', 'string'], `章节${header}应该是数字或字符串`);
        }
      }
      
      console.log(`Excel文件 ${path.basename(excelPath)} 数据类型验证通过`);
    }
  });
});