/**
 * 查看测试截图的脚本
 * 
 * 这个脚本会查找临时目录中的截图文件，并使用默认应用程序打开它们
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

// 查找临时目录中的截图文件
const tempDir = os.tmpdir();
const files = fs.readdirSync(tempDir);
const screenshotDirs = files.filter(file => 
  file.startsWith('webtoon-ui-test-') || 
  file.startsWith('webtoon-schedule-test-')
);

console.log('找到的测试目录:');
screenshotDirs.forEach(dir => console.log(`- ${dir}`));

// 查找每个目录中的截图文件
let screenshots = [];
screenshotDirs.forEach(dir => {
  const dirPath = path.join(tempDir, dir);
  try {
    const dirFiles = fs.readdirSync(dirPath);
    const dirScreenshots = dirFiles.filter(file => 
      file.endsWith('.png') || 
      file.endsWith('.jpg') || 
      file.endsWith('.jpeg')
    ).map(file => path.join(dirPath, file));
    
    screenshots = screenshots.concat(dirScreenshots);
  } catch (error) {
    console.error(`无法读取目录 ${dirPath}:`, error);
  }
});

console.log(`找到 ${screenshots.length} 个截图文件:`);
screenshots.forEach(screenshot => console.log(`- ${screenshot}`));

// 打开最新的截图文件
if (screenshots.length > 0) {
  // 按修改时间排序
  screenshots.sort((a, b) => {
    return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
  });
  
  const latestScreenshot = screenshots[0];
  console.log(`打开最新的截图文件: ${latestScreenshot}`);
  
  // 根据操作系统打开文件
  if (process.platform === 'win32') {
    exec(`start "" "${latestScreenshot}"`);
  } else if (process.platform === 'darwin') {
    exec(`open "${latestScreenshot}"`);
  } else {
    exec(`xdg-open "${latestScreenshot}"`);
  }
} else {
  console.log('未找到截图文件');
} 