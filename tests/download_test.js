const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebtoonScraper = require('../src/main/webtoon');

describe('WebtoonScraper下载测试', function() {
  this.timeout(60000); // 设置超时时间为60秒，因为下载可能需要时间
  
  const testUrls = [
    'https://www.webtoons.com/zh-hant/drama/yumi-cell/list?title_no=478',
    'https://www.webtoons.com/zh-hant/fantasy/tower-of-god/list?title_no=1785'
  ];
  
  let tempDir;
  
  before(function() {
    // 创建临时目录用于保存测试文件
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webtoon-test-'));
    console.log(`临时测试目录: ${tempDir}`);
  });
  
  after(function() {
    // 测试完成后清理临时文件
    const files = fs.readdirSync(tempDir);
    console.log(`测试生成的文件: ${files.join(', ')}`);
    
    // 保留文件以便检查，实际使用时可以取消注释以下代码清理文件
    // files.forEach(file => {
    //   fs.unlinkSync(path.join(tempDir, file));
    // });
    // fs.rmdirSync(tempDir);
  });
  
  it('应该能够下载单个URL并生成Excel文件', async function() {
    const scraper = new WebtoonScraper(testUrls[0]);
    const info = await scraper.getWebtoonInfo();
    const chapters = await scraper.getAllChapters();
    const excelPath = await scraper.saveToExcel(info, chapters, tempDir);
    
    // 验证文件是否存在
    expect(fs.existsSync(excelPath)).to.be.true;
    
    // 验证文件大小是否大于0
    const stats = fs.statSync(excelPath);
    expect(stats.size).to.be.greaterThan(0);
    
    console.log(`成功生成Excel文件: ${excelPath}`);
    console.log(`文件大小: ${stats.size} 字节`);
  });
  
  it('应该能够处理多个URL并生成Excel文件', async function() {
    // 记录开始时目录中的文件数量
    const startFiles = fs.readdirSync(tempDir).length;
    const generatedFiles = [];
    
    // 依次处理每个URL，使用不同的文件名
    for (let i = 0; i < testUrls.length; i++) {
      const url = testUrls[i];
      const scraper = new WebtoonScraper(url);
      const info = await scraper.getWebtoonInfo();
      const chapters = await scraper.getAllChapters();
      
      // 创建唯一的文件名，避免覆盖
      const customPath = path.join(tempDir, `webtoon_test_${i+1}.xlsx`);
      const excelPath = await scraper.saveToExcel(info, chapters, customPath);
      generatedFiles.push(excelPath);
      
      // 验证文件是否存在
      expect(fs.existsSync(excelPath)).to.be.true;
      
      // 验证文件大小是否大于0
      const stats = fs.statSync(excelPath);
      expect(stats.size).to.be.greaterThan(0);
      
      console.log(`成功生成Excel文件: ${excelPath}`);
      console.log(`文件大小: ${stats.size} 字节`);
    }
    
    // 验证是否生成了新的文件
    const endFiles = fs.readdirSync(tempDir).length;
    console.log(`开始文件数: ${startFiles}, 结束文件数: ${endFiles}`);
    
    // 验证生成的文件数量
    expect(generatedFiles.length).to.equal(testUrls.length);
    
    // 验证每个生成的文件都存在
    for (const file of generatedFiles) {
      expect(fs.existsSync(file)).to.be.true;
    }
  });
}); 