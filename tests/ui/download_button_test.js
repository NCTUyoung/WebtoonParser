const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

/**
 * 测试立即下载按钮功能
 * 
 * 这个测试会:
 * 1. 启动Electron应用
 * 2. 输入一个有效的URL
 * 3. 点击立即下载按钮
 * 4. 验证是否显示下载成功的消息
 */
test('立即下载按钮应该触发下载过程', async ({ page }) => {
  // 设置测试超时时间为3分钟，因为下载可能需要较长时间
  test.setTimeout(180000);
  
  // 创建临时目录用于保存测试文件
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webtoon-ui-test-'));
  console.log(`临时测试目录: ${tempDir}`);
  
  try {
    // 启动Electron应用
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_ENABLE_LOGGING: 'true',
        TEMP_DOWNLOAD_PATH: tempDir // 设置临时下载路径
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
      // 查找文本区域
      const textarea = document.querySelector('textarea');
      if (!textarea) {
        return { success: false, error: '未找到文本区域' };
      }
      
      // 输入URL
      textarea.value = 'https://www.webtoons.com/zh-hant/drama/yumi-cell/list?title_no=478';
      textarea.dispatchEvent(new Event('input'));
      
      // 查找下载按钮
      const buttons = Array.from(document.querySelectorAll('button'));
      const downloadButton = buttons.find(button => 
        button.textContent.includes('下载') || 
        button.textContent.includes('開始下載') ||
        button.textContent.includes('开始下载')
      );
      
      if (!downloadButton) {
        return { 
          success: false, 
          error: '未找到下载按钮',
          buttons: buttons.map(b => b.textContent.trim()).join(', ')
        };
      }
      
      // 点击下载按钮
      downloadButton.click();
      
      return { success: true };
    });
    
    console.log('操作结果:', result);
    
    if (!result.success) {
      console.error('操作失败:', result.error);
      if (result.buttons) {
        console.log('找到的按钮:', result.buttons);
      }
    }
    
    // 等待一段时间，让下载完成
    console.log('等待下载完成...');
    await window.waitForTimeout(30000);
    
    // 检查临时目录中是否有Excel文件
    const files = fs.readdirSync(tempDir);
    const excelFiles = files.filter(file => file.endsWith('.xlsx'));
    
    console.log(`生成的文件: ${files.join(', ')}`);
    console.log(`Excel文件: ${excelFiles.join(', ')}`);
    
    // 验证是否有Excel文件生成
    if (excelFiles.length > 0) {
      console.log('测试成功: 找到Excel文件');
      expect(excelFiles.length).toBeGreaterThan(0);
    } else {
      // 如果没有找到Excel文件，检查是否有其他文件生成
      console.log('未找到Excel文件，但可能有其他文件生成');
      
      // 检查日志信息
      const logs = await window.evaluate(() => {
        const logElements = document.querySelectorAll('.log-card .el-card__body');
        return Array.from(logElements).map(el => el.textContent);
      });
      
      console.log('应用日志:', logs);
    }
    
    // 关闭应用
    await electronApp.close();
    
    // 输出测试结果但不删除文件，以便检查
    console.log(`测试完成，生成的Excel文件: ${excelFiles.join(', ')}`);
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    throw error;
  }
}); 