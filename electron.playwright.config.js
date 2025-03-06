// @ts-check
const { defineConfig } = require('@playwright/test');
const path = require('path');

/**
 * Electron应用测试配置
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/ui',
  /* 测试文件匹配模式 */
  testMatch: ['**/*.js'],
  /* 每个测试的最大超时时间 */
  timeout: 180 * 1000,
  /* 测试失败时的重试次数 */
  retries: 1,
  /* 测试报告的输出目录 */
  outputDir: 'test-results/',
  
  /* 并行运行测试 */
  fullyParallel: false,
  /* 测试报告器 */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  /* 共享设置 */
  use: {
    /* 最大超时时间 */
    actionTimeout: 60000,
    /* 导航超时时间 */
    navigationTimeout: 60000,
    /* 截图 */
    screenshot: 'on',
    /* 视频 */
    video: 'on',
    /* 跟踪 */
    trace: 'on',
    /* 减慢测试速度，便于调试 */
    launchOptions: {
      slowMo: 500,
    },
  },
  
  /* 项目配置 */
  projects: [
    {
      name: 'electron',
      testDir: './tests/ui',
      use: {
        /* 空的使用配置，因为我们直接在测试中启动Electron */
      },
    },
  ],
}); 