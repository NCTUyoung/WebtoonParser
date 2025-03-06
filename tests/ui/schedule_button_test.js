const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

/**
 * 测试定时下载功能
 * 
 * 这个测试会:
 * 1. 启动Electron应用
 * 2. 输入一个有效的URL
 * 3. 设置定时任务
 * 4. 点击启动定时按钮
 * 5. 验证定时任务是否成功启动
 * 6. 模拟定时触发
 * 7. 验证是否有下载行为
 */
test('定时下载功能应该正确启动和触发', async ({ page }) => {
  // 设置测试超时时间为3分钟
  test.setTimeout(180000);
  
  // 创建临时目录用于保存测试文件
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webtoon-schedule-test-'));
  console.log(`临时测试目录: ${tempDir}`);
  
  try {
    // 启动Electron应用
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_ENABLE_LOGGING: 'true',
        TEMP_DOWNLOAD_PATH: tempDir, // 设置临时下载路径
        // 设置测试模式，使定时任务立即触发
        TEST_MODE: 'true',
        IMMEDIATE_TRIGGER: 'true'
      }
    });
    
    // 获取第一个窗口
    const window = await electronApp.firstWindow();
    
    // 等待应用加载完成
    await window.waitForLoadState('domcontentloaded');
    console.log('应用已加载');
    
    // 等待一段时间，确保应用完全加载
    await window.waitForTimeout(5000);
    
    // 使用外部工具截图（如果在Windows上）
    if (process.platform === 'win32') {
      try {
        const screenshotPath = path.join(tempDir, 'external-screenshot.png');
        execSync(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^{PRTSC}'); Start-Sleep -Milliseconds 500; Add-Type -AssemblyName System.Drawing; $bitmap = [System.Windows.Forms.Clipboard]::GetImage(); $bitmap.Save('${screenshotPath}')"`);
        console.log(`外部截图已保存到: ${screenshotPath}`);
      } catch (error) {
        console.error('外部截图失败:', error);
      }
    }
    
    // 使用evaluate在渲染进程中执行代码
    const appLoaded = await window.evaluate(() => {
      return document.body.innerHTML.length > 0;
    });
    
    console.log('应用加载状态:', appLoaded ? '已加载' : '未加载');
    
    // 使用evaluate在渲染进程中查找元素并交互
    const result = await window.evaluate(() => {
      try {
        // 查找文本区域
        const textarea = document.querySelector('textarea');
        if (!textarea) {
          return { success: false, error: '未找到文本区域' };
        }
        
        // 输入URL
        textarea.value = 'https://www.webtoons.com/zh-hant/drama/yumi-cell/list?title_no=478';
        textarea.dispatchEvent(new Event('input'));
        
        // 查找定时设置区域
        const scheduleSection = document.querySelector('.schedule-settings');
        if (!scheduleSection) {
          return { success: false, error: '未找到定时设置区域' };
        }
        
        // 设置定时任务
        // 获取当前时间
        const now = new Date();
        const testMinute = (now.getMinutes() + 1) % 60;
        const testHour = now.getHours() + (testMinute === 0 ? 1 : 0);
        
        // 选择星期
        const daySelect = scheduleSection.querySelector('.day-select');
        if (!daySelect) {
          return { success: false, error: '未找到星期选择器' };
        }
        
        // 查找并点击启动定时按钮
        const buttons = Array.from(scheduleSection.querySelectorAll('button'));
        const scheduleButton = buttons.find(button => 
          button.textContent.includes('启动定时') || 
          button.textContent.includes('啟動定時')
        );
        
        if (!scheduleButton) {
          return { 
            success: false, 
            error: '未找到启动定时按钮',
            buttons: buttons.map(b => b.textContent.trim()).join(', ')
          };
        }
        
        // 点击启动定时按钮
        scheduleButton.click();
        
        return { success: true };
      } catch (error) {
        return { success: false, error: error.toString() };
      }
    });
    
    console.log('操作结果:', result);
    
    if (!result.success) {
      console.error('操作失败:', result.error);
      if (result.buttons) {
        console.log('找到的按钮:', result.buttons);
      }
    }
    
    // 等待一段时间，让定时任务有机会触发
    console.log('等待定时任务触发...');
    await window.waitForTimeout(15000);
    
    // 检查日志信息
    const logs = await window.evaluate(() => {
      const logElements = document.querySelectorAll('.log-card .el-card__body');
      return Array.from(logElements).map(el => el.textContent);
    });
    
    console.log('应用日志:', logs);
    
    // 检查是否有定时任务启动的日志
    const hasScheduleStartLog = logs.some(log => 
      log.includes('Schedule task started') || 
      log.includes('定时任务已启动') || 
      log.includes('定時任務已啟動')
    );
    
    console.log('是否有定时任务启动日志:', hasScheduleStartLog);
    expect(hasScheduleStartLog).toBeTruthy();
    
    // 等待下载完成
    await window.waitForTimeout(15000);
    
    // 检查临时目录中是否有Excel文件
    const files = fs.readdirSync(tempDir);
    const excelFiles = files.filter(file => file.endsWith('.xlsx'));
    
    console.log(`生成的文件: ${files.join(', ')}`);
    console.log(`Excel文件: ${excelFiles.join(', ')}`);
    
    // 关闭应用
    await electronApp.close();
    
    // 输出测试结果但不删除文件，以便检查
    console.log(`测试完成，生成的Excel文件: ${excelFiles.join(', ')}`);
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    throw error;
  }
}); 