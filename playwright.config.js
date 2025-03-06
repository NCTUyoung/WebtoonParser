// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/ui',
  /* 测试文件匹配模式 */
  testMatch: ['**/*.js'],
  /* 每个测试的最大超时时间 */
  timeout: 120 * 1000,
  /* 测试失败时的重试次数 */
  retries: process.env.CI ? 2 : 0,
  /* 测试报告的输出目录 */
  outputDir: 'test-results/',
  
  /* 并行运行测试 */
  fullyParallel: false,
  /* 失败时立即停止 */
  forbidOnly: !!process.env.CI,
  /* 测试报告器 */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  /* 共享设置 */
  use: {
    /* 最大超时时间 */
    actionTimeout: 0,
    /* 基础URL */
    baseURL: 'http://localhost:3000',
    /* 收集跟踪信息 */
    trace: 'on-first-retry',
    /* 截图 */
    screenshot: 'only-on-failure',
    /* 视频 */
    video: 'on-first-retry',
  },
  
  /* 项目配置 */
  projects: [
    {
      name: 'electron',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
}); 