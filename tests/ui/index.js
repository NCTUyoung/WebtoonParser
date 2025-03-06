/**
 * Webtoon Parser UI测试套件
 * 
 * 本测试套件包含以下UI测试：
 * 1. 立即下载按钮测试 - 测试点击立即下载按钮是否能成功下载
 * 2. 定时下载功能测试 - 测试定时下载功能是否能正确启动和触发
 */

// 设置环境变量
process.env.NODE_ENV = 'test';

// 注意：在使用Playwright时，不需要手动导入测试文件
// Playwright会自动查找并运行测试目录中的所有测试文件
// 这个文件主要用于设置环境变量和其他全局配置 