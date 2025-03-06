const { test, expect } = require('@playwright/test');

/**
 * 基本测试，确保Playwright能正确运行
 */
test('基本测试', async ({ page }) => {
  // 简单的测试，确保Playwright能正确运行
  console.log('运行基本测试');
  expect(true).toBeTruthy();
}); 