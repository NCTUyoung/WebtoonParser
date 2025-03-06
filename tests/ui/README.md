# Webtoon Parser UI测试说明

本目录包含 Webtoon Parser 项目的UI测试代码，用于测试应用程序的前端交互功能。

## 测试内容

UI测试套件包含以下测试：

1. **立即下载按钮测试** (`download_button_test.js`)
   - 测试点击立即下载按钮是否能成功触发下载
   - 验证下载过程是否正常进行
   - 验证是否生成了Excel文件

2. **定时下载功能测试** (`schedule_button_test.js`)
   - 测试定时下载功能是否能正确设置
   - 测试定时任务是否能成功启动
   - 测试定时任务是否能正常触发下载
   - 测试定时任务是否能正常取消

## 运行测试

### 安装依赖

首先确保已安装所有依赖：

```bash
npm install
```

然后安装Playwright浏览器：

```bash
npx playwright install
```

### 构建应用

在运行UI测试前，需要先构建应用：

```bash
npm run build
```

### 运行所有UI测试

```bash
npm run test:ui
```

### 运行单个UI测试

可以运行特定的UI测试文件：

```bash
# 测试立即下载按钮
npm run test:ui:download

# 测试定时下载功能
npm run test:ui:schedule
```

### 调试测试

可以使用调试模式运行测试：

```bash
npm run test:ui:debug
```

### 查看测试报告

```bash
npm run test:ui:report
```

### 查看外部截图

由于Playwright可能无法正确捕获Electron窗口的内容，测试会使用外部工具截图。可以使用以下命令查看这些截图：

```bash
npm run test:ui:screenshots
```

## 截图问题说明

Playwright在测试Electron应用时可能会遇到截图全白的问题，这是因为：

1. Electron的渲染进程与主进程是隔离的，Playwright可能无法正确捕获渲染内容。
2. Windows系统上的安全限制可能会阻止Playwright捕获窗口内容。

为解决这个问题，测试脚本使用了以下策略：

1. 使用外部工具（PowerShell）截取屏幕，保存到临时目录。
2. 使用`window.evaluate()`在渲染进程中直接执行代码，而不是通过Playwright的API。
3. 通过日志输出和文件生成来验证测试结果，而不仅依赖于截图。

## 注意事项

1. UI测试会实际启动Electron应用并模拟用户操作，请确保没有其他实例正在运行。
2. 测试过程中会在临时目录创建文件，测试完成后这些文件不会自动删除，以便检查。
3. 测试可能需要较长时间，特别是涉及到实际下载的测试，请耐心等待。
4. 如果测试失败，可以查看生成的截图和视频，它们位于`playwright-report`目录中。
5. 外部截图会保存在临时目录中，可以使用`npm run test:ui:screenshots`命令查看。

## 测试环境变量

UI测试使用以下环境变量来控制测试行为：

- `NODE_ENV=test`: 设置应用为测试模式
- `ELECTRON_ENABLE_LOGGING=true`: 启用Electron日志
- `TEMP_DOWNLOAD_PATH`: 设置临时下载路径
- `TEST_MODE=true`: 启用测试模式
- `IMMEDIATE_TRIGGER=true`: 使定时任务立即触发（仅用于测试）

## 测试结果

测试成功时，会显示类似以下输出：

```
Running 2 tests using 1 worker

  ✓ download_button_test.js:14:1 › 立即下载按钮应该触发下载过程 (40.1s)
  ✓ schedule_button_test.js:16:1 › 定时下载功能应该正确启动和触发 (35.3s)

2 passed (75.4s)
``` 