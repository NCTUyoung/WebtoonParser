# Webtoon Parser 技术报告

<div align="center">
  <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron"/>
  <img src="https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue.js"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
</div>

## 📑 目录

- [项目概述](#-项目概述)
- [技术栈](#-技术栈)
- [项目结构](#-项目结构)
- [核心功能](#-核心功能)
- [技术实现细节](#-技术实现细节)
- [安全考虑](#-安全考虑)
- [性能优化](#-性能优化)
- [未来改进方向](#-未来改进方向)
- [V2版本更新内容](#-v2版本更新内容)
- [总结](#-总结)

## 🔍 项目概述

Webtoon Parser 是一个功能强大的基于 Electron 的桌面应用程序，专为抓取和解析 Webtoon 网站上的漫画信息而设计。该应用程序提供了直观的用户界面，允许用户轻松输入 Webtoon 漫画 URL，然后自动抓取漫画的基本信息、章节列表等数据，并将其保存为结构化的 Excel 文件。

此外，该应用程序还支持高级功能，如定时抓取功能，可以按照用户设定的时间表自动执行抓取任务，非常适合需要定期监控漫画更新或收集数据的用户。

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>🎯 主要目标</strong></td>
      <td align="center"><strong>🛠️ 解决方案</strong></td>
    </tr>
    <tr>
      <td>高效抓取漫画信息</td>
      <td>使用 Axios + Cheerio 实现高效的网页抓取和解析</td>
    </tr>
    <tr>
      <td>用户友好的界面</td>
      <td>基于 Vue.js 和 Element Plus 构建现代化 UI</td>
    </tr>
    <tr>
      <td>跨平台兼容性</td>
      <td>使用 Electron 框架确保在 Windows、macOS 和 Linux 上运行</td>
    </tr>
    <tr>
      <td>自动化数据收集</td>
      <td>实现定时任务功能，支持按计划自动抓取</td>
    </tr>
  </table>
</div>

## 💻 技术栈

项目采用了现代化的技术栈，确保了应用程序的高性能、可维护性和良好的用户体验：

| 类别 | 技术 | 说明 |
|------|------|------|
| **框架** | [Electron](https://www.electronjs.org/) | 跨平台桌面应用开发框架，基于 Chromium 和 Node.js |
| **前端** | [Vue.js](https://vuejs.org/) | 渐进式 JavaScript 框架 |
|  | [Element Plus](https://element-plus.org/) | 基于 Vue 3 的组件库，提供丰富的 UI 组件 |
| **后端** | [Node.js](https://nodejs.org/) | JavaScript 运行时环境，处理文件系统和网络请求 |
| **数据抓取** | [Axios](https://axios-http.com/) | 基于 Promise 的 HTTP 客户端，用于发送网络请求 |
|  | [Cheerio](https://cheerio.js.org/) | 服务器端的 jQuery 实现，用于解析 HTML |
| **数据存储** | [ExcelJS](https://github.com/exceljs/exceljs) | 用于生成和操作 Excel 文件的库 |
|  | [Electron Store](https://github.com/sindresorhus/electron-store) | 简单的数据持久化解决方案，用于存储配置 |
| **其他** | [Node Schedule](https://github.com/node-schedule/node-schedule) | 用于实现定时任务的库，支持 cron 表达式 |

## 🏗️ 项目结构

项目采用 Electron 标准的三层架构，确保了代码的清晰组织和良好的关注点分离：

```
src/
├── main/                 # 主进程
│   ├── index.js          # 应用程序入口点
│   └── webtoon.js        # 核心抓取逻辑
├── renderer/             # 渲染进程
│   ├── App.vue           # 主界面组件
│   ├── components/       # UI 组件
│   │   ├── UrlInput.vue  # URL 输入组件
│   │   ├── ScheduleSettings.vue  # 定时设置组件
│   │   ├── SavePathSettings.vue  # 保存路径设置组件
│   │   └── LogViewer.vue # 日志查看组件
│   ├── utils/            # 工具函数
│   │   └── urlUtils.ts   # URL 处理工具
│   ├── types/            # TypeScript 类型定义
│   └── styles/           # CSS 样式文件
└── preload/              # 预加载脚本
    └── index.js          # IPC 通信桥接
```

### 1. 主进程 (src/main)

主进程是 Electron 应用的入口点，负责创建窗口、处理系统级事件和协调渲染进程。

- **index.js**: 应用程序的主入口文件，负责：
  - 创建和管理应用程序窗口
  - 设置 IPC 通信通道
  - 处理应用生命周期事件
  - 管理定时任务
  - 配置应用程序菜单和快捷键

- **webtoon.js**: 核心业务逻辑实现，包含 `WebtoonScraper` 类，负责：
  - 解析和验证 Webtoon URL
  - 发送 HTTP 请求获取网页内容
  - 使用 Cheerio 解析 HTML 并提取漫画信息
  - 处理分页和导航
  - 将抓取的数据导出为 Excel 文件

### 2. 渲染进程 (src/renderer)

渲染进程负责 UI 界面的呈现和用户交互，采用 Vue.js 框架构建。

- **App.vue**: 主要的 Vue 组件，定义了应用程序的整体布局和主要功能区域，包括：
  - 顶部标题栏
  - URL 输入区域
  - 定时设置区域
  - 保存设置区域
  - 日志查看区域

- **components/**: 包含各种 UI 组件：
  - **UrlInput.vue**: URL 输入和管理组件，支持：
    - 单个或批量添加 URL
    - URL 格式验证
    - 显示 URL 列表和状态
    - 删除和编辑 URL
  - **ScheduleSettings.vue**: 定时设置组件，允许用户：
    - 配置自动抓取的时间表
    - 使用 cron 表达式或友好的界面设置时间
    - 启用/禁用定时任务
  - **SavePathSettings.vue**: 保存路径设置组件，用于：
    - 选择 Excel 文件的保存位置
    - 设置文件命名规则
  - **LogViewer.vue**: 日志查看组件，显示：
    - 抓取过程中的操作日志
    - 错误和警告信息
    - 支持日志过滤和搜索

- **utils/**: 工具函数：
  - **urlUtils.ts**: URL 处理相关的工具函数，如：
    - URL 验证和格式化
    - 从 URL 中提取漫画 ID
    - 生成完整的章节 URL

- **types/**: TypeScript 类型定义，确保代码的类型安全。

### 3. 预加载脚本 (src/preload)

预加载脚本在渲染进程加载之前运行，用于安全地暴露主进程功能给渲染进程。

- **index.js**: 通过 `contextBridge` 暴露 IPC 通信接口，允许渲染进程与主进程进行安全通信，包括：
  - 启动抓取任务
  - 设置和管理定时任务
  - 选择文件保存路径
  - 接收日志和状态更新

## 🚀 核心功能

### 1. 漫画信息抓取

应用程序能够从 Webtoon 网站抓取丰富的信息：

- **基本信息**：
  - 漫画标题和副标题
  - 作者和画师信息
  - 漫画描述和简介
  - 漫画封面图片 URL
  - 漫画类型和标签
  - 评分和人气数据

- **章节列表**：
  - 章节标题和编号
  - 发布日期和时间
  - 章节缩略图 URL
  - 阅读量和点赞数
  - 评论数量

应用程序支持处理分页，确保能够获取所有章节信息，即使漫画有数百个章节。

### 2. 数据导出

抓取的数据可以导出为结构良好的 Excel 文件：

- **多个工作表**：
  - 漫画基本信息工作表
  - 章节列表工作表
  - 统计数据工作表

- **格式化**：
  - 自动调整列宽
  - 设置标题行样式
  - 数字格式化（如阅读量显示为"1.2k"）
  - 日期格式化

- **自定义选项**：
  - 选择要包含的数据字段
  - 设置文件保存位置
  - 自定义文件命名规则

### 3. 定时抓取

用户可以设置定时任务，应用程序会按照设定的时间表自动执行抓取任务：

- **灵活的时间设置**：
  - 支持 cron 表达式（高级用户）
  - 用户友好的界面设置（初级用户）
  - 支持一次性任务或重复任务

- **任务管理**：
  - 查看所有计划任务
  - 编辑或删除现有任务
  - 手动触发计划任务
  - 暂停/恢复所有任务

- **通知**：
  - 任务开始和完成通知
  - 错误通知
  - 可选的桌面通知

### 4. 批量处理

支持同时添加和处理多个 Webtoon URL，提高工作效率：

- **批量导入**：
  - 从文本文件导入 URL 列表
  - 从剪贴板粘贴多个 URL
  - 自动去重和验证

- **并行处理**：
  - 同时处理多个 URL
  - 可配置的并发数量
  - 单独的进度跟踪

- **批量导出**：
  - 将所有结果导出到单个 Excel 文件（多个工作表）
  - 或导出到多个 Excel 文件
  - 支持合并相似漫画的数据

## 🔧 技术实现细节

### 主进程与渲染进程通信

应用程序使用 Electron 的 IPC (进程间通信) 机制实现主进程和渲染进程之间的安全通信：

```javascript
// 渲染进程发送请求
const result = await window.electron.invoke('start-scraping', url);

// 主进程处理请求
ipcMain.handle('start-scraping', async (event, url) => {
  const scraper = new WebtoonScraper(url);
  const result = await scraper.scrape();
  return result;
});

// 主进程向渲染进程发送事件
mainWindow.webContents.send('scraping-progress', { 
  url, 
  progress: 50, 
  message: '正在处理章节数据...' 
});

// 渲染进程监听事件
window.electron.on('scraping-progress', (data) => {
  console.log(`进度: ${data.progress}%, ${data.message}`);
});
```

通信流程：

1. 渲染进程通过预加载脚本暴露的 `electron.invoke` 和 `electron.send` 方法向主进程发送请求
2. 主进程通过 `ipcMain.handle` 和 `ipcMain.on` 处理这些请求
3. 主进程可以通过 `webContents.send` 向渲染进程发送事件和数据
4. 渲染进程通过 `electron.on` 监听这些事件

### 网页抓取实现

网页抓取过程采用了多步骤的方法，确保可靠性和效率：

1. **发送 HTTP 请求**：
   ```javascript
   const response = await axios.get(url, { 
     headers: {
       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
       'Accept-Charset': 'UTF-8'
     },
     responseType: 'arraybuffer'
   });
   const html = new TextDecoder('utf-8').decode(response.data);
   ```

2. **解析 HTML**：
   ```javascript
   const $ = cheerio.load(html);
   const title = $('.detail_header .detail_title').text().trim();
   const author = $('.detail_header .detail_author').text().trim();
   ```

3. **处理分页**：
   ```javascript
   // 获取总页数
   const totalPages = parseInt($('.paginate .page_num:last-child').text().trim());
   
   // 遍历所有页面
   for (let page = 1; page <= totalPages; page++) {
     const pageUrl = `${baseUrl}?page=${page}`;
     const pageHtml = await this.getPage(pageUrl);
     const $page = cheerio.load(pageHtml);
     
     // 提取章节数据
     $page('.episode_item').each((i, el) => {
       // 处理每个章节
     });
   }
   ```

4. **处理编码问题**：
   ```javascript
   // 设置正确的编码
   process.env.LANG = 'zh_TW.UTF-8';
   
   // 处理中文内容
   if (process.platform === 'win32') {
     const iconv = require('iconv-lite');
     const encoded = iconv.encode(message, 'big5');
     process.stdout.write(encoded);
   }
   ```

### 数据存储

1. **使用 ExcelJS 生成 Excel 文件**：
   ```javascript
   const workbook = new ExcelJS.Workbook();
   const infoSheet = workbook.addWorksheet('漫画信息');
   const chaptersSheet = workbook.addWorksheet('章节列表');
   
   // 设置列
   infoSheet.columns = [
     { header: '标题', key: 'title', width: 30 },
     { header: '作者', key: 'author', width: 20 },
     { header: '描述', key: 'description', width: 50 },
     // ...其他列
   ];
   
   // 添加数据
   infoSheet.addRow({
     title: webtoonInfo.title,
     author: webtoonInfo.author,
     description: webtoonInfo.description,
     // ...其他数据
   });
   
   // 设置样式
   infoSheet.getRow(1).font = { bold: true };
   infoSheet.getRow(1).fill = {
     type: 'pattern',
     pattern: 'solid',
     fgColor: { argb: 'FFD3D3D3' }
   };
   
   // 保存文件
   await workbook.xlsx.writeFile(filePath);
   ```

2. **使用 Electron Store 保存配置**：
   ```javascript
   const Store = require('electron-store');
   const store = new Store();
   
   // 保存设置
   store.set('savePath', path);
   store.set('scheduleSettings', scheduleSettings);
   
   // 读取设置
   const savePath = store.get('savePath', defaultPath);
   const scheduleSettings = store.get('scheduleSettings', defaultSettings);
   ```

### 定时任务

使用 Node Schedule 库实现定时任务功能：

```javascript
const schedule = require('node-schedule');

// 创建定时任务
function createScheduleJob(cronExpression, urls) {
  const job = schedule.scheduleJob(cronExpression, async function() {
    console.log('开始执行定时抓取任务');
    for (const url of urls) {
      try {
        const scraper = new WebtoonScraper(url);
        await scraper.scrape();
      } catch (error) {
        console.error(`抓取 ${url} 时出错:`, error);
      }
    }
    console.log('定时抓取任务完成');
  });
  
  return job;
}

// 管理任务
const scheduleJobs = new Map();

// 添加任务
ipcMain.handle('add-schedule', (event, { name, cronExpression, urls }) => {
  const job = createScheduleJob(cronExpression, urls);
  scheduleJobs.set(name, job);
  return { success: true };
});

// 取消任务
ipcMain.handle('cancel-schedule', (event, name) => {
  const job = scheduleJobs.get(name);
  if (job) {
    job.cancel();
    scheduleJobs.delete(name);
    return { success: true };
  }
  return { success: false, error: '任务不存在' };
});
```

## 🔒 安全考虑

应用程序实现了多层安全措施，保护用户数据和系统资源：

### 1. 进程隔离与安全通信

- **Context Isolation**: 启用 `contextIsolation` 确保渲染进程的 JavaScript 上下文与 Electron 内部上下文隔离：
  ```javascript
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: false,
    preload: path.join(__dirname, '../preload/index.js')
  }
  ```

- **安全的 IPC 通信**: 使用 `contextBridge` 明确暴露有限的 API：
  ```javascript
  contextBridge.exposeInMainWorld('electron', {
    startScraping: (url) => ipcRenderer.invoke('start-scraping', url),
    // 其他安全的 API
  });
  ```

### 2. 资源访问控制

- 限制渲染进程对系统资源的访问权限
- 仅在必要时通过 IPC 提供文件系统访问
- 实现细粒度的权限控制

### 3. 网络安全

- **自定义 User-Agent**: 使用自定义 User-Agent 进行网络请求，减少被目标网站识别和封锁的风险
- **请求限制**: 实现请求频率限制，避免对目标网站造成过大负担
- **错误处理**: 完善的错误处理机制，防止网络问题导致应用崩溃

### 4. 数据安全

- **本地存储加密**: 敏感配置数据使用加密存储
- **安全的文件操作**: 确保文件操作不会覆盖用户重要文件
- **输入验证**: 对所有用户输入进行严格验证，防止注入攻击

## ⚡ 性能优化

应用程序实现了多种性能优化策略，确保在处理大量数据时保持响应性和效率：

### 1. 异步操作

- **非阻塞 I/O**: 使用异步操作处理网络请求和文件操作，避免阻塞主线程：
  ```javascript
  async scrape() {
    try {
      const info = await this.getWebtoonInfo();
      const chapters = await this.getChapterList();
      await this.exportToExcel(info, chapters);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  ```

- **Promise 链**: 使用 Promise 链和 async/await 简化异步代码

### 2. 并发控制

- **限制并发请求**: 使用并发控制限制同时进行的请求数量，避免过度消耗系统资源和触发网站的反爬虫机制：
  ```javascript
  async processUrls(urls, concurrency = 3) {
    const results = [];
    const chunks = [];
    
    // 将 URL 分组
    for (let i = 0; i < urls.length; i += concurrency) {
      chunks.push(urls.slice(i, i + concurrency));
    }
    
    // 按组处理
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(url => this.processUrl(url));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }
    
    return results;
  }
  ```

### 3. 缓存机制

- **内存缓存**: 缓存已获取的数据，减少重复请求：
  ```javascript
  const cache = new Map();
  
  async getPage(url) {
    if (cache.has(url)) {
      return cache.get(url);
    }
    
    const html = await this.fetchPage(url);
    cache.set(url, html);
    return html;
  }
  ```

- **持久化缓存**: 对于频繁访问的数据，实现持久化缓存

### 4. UI 优化

- **虚拟滚动**: 对于长列表使用虚拟滚动，只渲染可见区域的项目
- **延迟加载**: 非关键组件和资源采用延迟加载
- **防抖和节流**: 对频繁触发的事件应用防抖和节流技术

### 5. 内存管理

- **及时释放资源**: 大型对象使用完毕后及时释放
- **避免内存泄漏**: 正确管理事件监听器和定时器
- **分批处理大数据**: 对大量数据进行分批处理，避免内存溢出

## 🚀 未来改进方向

项目有多个潜在的改进方向，可以进一步提升功能和用户体验：

### 1. 功能扩展

- **支持更多漫画网站**: 扩展支持其他流行的漫画网站，如 Naver Webtoon、Lezhin Comics 等
- **数据可视化**: 添加图表和统计功能，展示漫画阅读量趋势、评分变化等数据
- **内容下载**: 实现漫画内容的下载和本地阅读功能，支持离线浏览
- **批量比较**: 添加多部漫画数据的比较功能，分析不同漫画的受欢迎程度

### 2. 技术改进

- **重构为 TypeScript**: 将整个项目重构为 TypeScript，提高代码质量和可维护性
- **采用 Electron Forge**: 使用 Electron Forge 简化构建和打包流程
- **引入状态管理**: 使用 Vuex 或 Pinia 进行状态管理，优化数据流
- **单元测试**: 添加单元测试和集成测试，提高代码质量和可靠性

### 3. 用户体验优化

- **多语言支持**: 添加多语言支持，使应用程序适用于更广泛的用户群体
- **自定义主题**: 实现深色模式和自定义主题功能
- **快捷键支持**: 添加更多快捷键，提高操作效率
- **导入/导出配置**: 支持导入和导出应用程序配置，方便用户在多台设备上使用

### 4. 高级功能

- **代理设置**: 添加代理设置，解决网络访问限制问题
- **自动更新**: 实现应用程序自动更新功能
- **插件系统**: 开发插件系统，允许用户扩展应用程序功能
- **API 集成**: 提供 API 接口，允许其他应用程序集成和使用

## 🚀 V2版本更新内容

V2版本在V1的基础上进行了多项重要改进和功能增强，主要包括以下方面：

### 1. 批量处理功能

V2版本实现了强大的批量处理功能，大幅提升了工作效率：

- **多URL同时处理**：
  - 支持一次性添加多个URL进行处理
  - 实现并行处理逻辑，提高处理速度
  - 为每个URL提供独立的进度和状态显示

- **URL历史记录管理**：
  - 自动保存已处理的URL历史记录
  - 提供历史记录管理界面，支持查看、编辑和删除
  - 实现URL去重功能，避免重复处理

```javascript
// URL历史记录管理实现
ipcMain.handle('load-url-history', () => {
  return store.get('url-history', [])
})

ipcMain.on('save-url-history', (event, history) => {
  store.set('url-history', history)
})
```

### 2. 用户体验优化

V2版本对用户界面和交互体验进行了全面优化：

- **界面美化**：
  - 重新设计的卡片式布局
  - 添加动画和过渡效果
  - 优化色彩方案和视觉层次

- **交互改进**：
  - 添加拖放功能，支持拖放URL到应用
  - 增强表单验证和错误提示
  - 添加快捷键支持

- **外部浏览器打开功能**：
  - 支持在默认浏览器中打开Webtoon链接
  - 实现安全的外部URL处理

```javascript
// 外部浏览器打开URL实现
ipcMain.on('open-external-url', (event, url) => {
  try {
    console.log('Opening external URL:', url)
    shell.openExternal(url)
  } catch (error) {
    console.error('Failed to open external URL:', error)
    event.reply('log-message', `無法開啟URL: ${error.message}`)
  }
})
```

### 3. 数据处理增强

V2版本对数据处理和存储方面进行了多项改进：

- **Excel输出优化**：
  - 改进Excel文件格式和样式
  - 添加自动排序功能
  - 优化数值和日期格式化

- **自定义保存路径**：
  - 支持用户选择Excel文件保存位置
  - 记住上次选择的路径
  - 提供默认路径选项

```javascript
// 自定义保存路径实现
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  
  if (!result.canceled) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('load-save-path', () => {
  try {
    const savedPath = store.get('save-path')
    return savedPath
  } catch (error) {
    return app.getPath('downloads')
  }
})
```

### 4. 技术改进

V2版本在技术实现方面也进行了多项改进：

- **编码问题解决**：
  - 完善中文编码处理
  - 解决跨平台编码兼容性问题

- **错误处理增强**：
  - 添加更详细的错误日志
  - 改进错误恢复机制
  - 提供用户友好的错误提示

- **性能优化**：
  - 减少不必要的网络请求
  - 优化数据处理逻辑
  - 改进内存管理

### 5. 多语言支持

V2版本添加了完整的多语言支持：

- **繁体中文界面**：
  - 所有界面元素支持繁体中文
  - 错误消息和提示使用繁体中文
  - 日期和时间格式本地化

- **国际化框架**：
  - 使用Element Plus的国际化功能
  - 支持未来添加更多语言

```javascript
// 多语言支持实现
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import App from './App.vue'

const app = createApp(App)
app.use(ElementPlus, {
  locale: zhTw
})
app.mount('#app')
```

### 6. 測試與驗證

V2版本進行了全面的測試，確保功能穩定可靠：

- **立即下載功能測試**：
  - 驗證不同URL的下載功能
  - 確認檔案正確下載到指定位置
  - 檢查檔案內容的完整性和正確性

- **多組URL處理測試**：
  - 同時處理多個不同的Webtoon URL
  - 驗證所有URL數據都能正確輸出到Excel檔案
  - 測試不同類型漫畫的數據解析準確性

- **定時功能測試**：
  - 設置不同時間間隔的定時任務
  - 驗證任務按設定時間正常觸發
  - 測試應用程序關閉後定時任務的恢復機制

- **跨平台兼容性測試**：
  - 在Windows和macOS系統上進行測試
  - 確保界面在不同分辨率下正常顯示
  - 驗證中文編碼在不同平台的一致性

```javascript
// 定時任務測試代碼
function testScheduleJob() {
  // 創建一個每分鐘執行一次的測試任務
  const testJob = schedule.scheduleJob('*/1 * * * *', async function() {
    console.log('測試定時任務觸發: ' + new Date().toLocaleString('zh-TW'));
    // 執行測試爬蟲
    const testUrl = 'https://www.webtoons.com/zh-hant/drama/test-comic/list?title_no=12345';
    try {
      const scraper = new WebtoonScraper(testUrl);
      await scraper.scrape();
      console.log('測試爬蟲完成');
    } catch (error) {
      console.error('測試爬蟲失敗:', error);
    }
  });
  
  return testJob;
}
```

## 📝 总结

Webtoon Parser 是一个功能完整、设计精良的 Electron 桌面应用程序，通过结合 Web 抓取技术和现代前端框架，提供了一个用户友好的界面来抓取和管理 Webtoon 漫画信息。

该应用程序采用了 Electron 的标准三层架构，实现了主进程和渲染进程之间的安全通信，并提供了丰富的功能，如批量处理、定时抓取和数据导出等。通过精心的设计和实现，应用程序在性能、安全性和用户体验方面都达到了较高水平。

未来，项目将继续发展，添加更多功能和优化，以满足用户不断变化的需求，并保持与最新技术的同步。通过持续改进，Webtoon Parser 将成为漫画爱好者和数据分析师的得力助手，帮助他们更高效地获取和管理漫画数据。 