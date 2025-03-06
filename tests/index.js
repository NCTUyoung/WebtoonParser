/**
 * Webtoon Parser 测试套件
 * 
 * 本测试套件包含以下测试：
 * 1. 立即下载功能测试 - 测试能否成功下载漫画信息并保存
 * 2. Excel输出测试 - 测试URL到Excel的输出功能
 * 3. 定时功能测试 - 测试定时功能是否正常触发
 */

// 设置环境变量
process.env.NODE_ENV = 'test';

// 导入Mocha
const { describe } = require('mocha');

// 运行测试
describe('Webtoon Parser 测试套件', function() {
  // 导入各个测试文件
  require('./download_test');
  require('./excel_output_test');
  require('./schedule_test');
}); 