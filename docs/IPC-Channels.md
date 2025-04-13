# Electron IPC 通道文档

本文档列出了应用程序中使用的所有 Electron IPC 通道，以便于开发和维护。

## 重要提示

**任何新添加的 IPC 通道必须在预加载脚本 `src/preload/index.js` 中添加到相应的 `validChannels` 数组中，否则渲染进程将无法访问这些通道。**

- 对于 `invoke` 类型的通道，需要添加到 `invoke` 方法的 `validChannels` 数组中
- 对于 `send` 类型的通道，需要添加到 `send` 方法的 `validChannels` 数组中
- 对于事件监听类型的通道，需要添加到 `on` 方法的 `validChannels` 数组中

## 抓取相关通道

### 开始抓取

- **`start-scraping`**: 启动抓取任务
  - 类型: 调用 (invoke)
  - 参数: { urls: string[], savePath: string, appendMode: boolean, customFilename: string }
  - 返回: { success: boolean, error?: string, filePath?: string }
  - 描述: 启动抓取指定URL的内容，支持多URL批量处理

### 日志消息

- **`log-message`**: 发送日志消息
  - 类型: 监听 (on)
  - 参数: message: string, type: 'info' | 'error' | 'warn'
  - 描述: 接收来自主进程的日志消息并显示在日志查看器中

## 设置相关通道

### 保存路径设置

- **`load-save-path`**: 加载保存路径
  - 类型: 调用 (invoke)
  - 返回: string
  - 描述: 从存储中加载用户的保存路径设置

- **`save-save-path`**: 保存路径设置
  - 类型: 发送 (send)
  - 参数: string
  - 描述: 将用户的保存路径设置保存到存储中

- **`select-directory`**: 选择目录
  - 类型: 调用 (invoke)
  - 返回: string | null
  - 描述: 打开系统的目录选择对话框，返回用户选择的目录路径

### 附加模式设置

- **`load-append-mode`**: 加载附加模式设置
  - 类型: 调用 (invoke)
  - 返回: boolean
  - 描述: 从存储中加载用户的附加模式设置 (true 表示附加，false 表示覆盖)

- **`save-append-mode`**: 保存附加模式设置
  - 类型: 发送 (send)
  - 参数: boolean
  - 描述: 将用户的附加模式设置保存到存储中

### 自定义文件名设置

- **`load-custom-filename`**: 加载自定义文件名
  - 类型: 调用 (invoke)
  - 返回: string
  - 描述: 从存储中加载用户的自定义文件名设置

- **`save-custom-filename`**: 保存自定义文件名
  - 类型: 发送 (send)
  - 参数: string
  - 描述: 将用户的自定义文件名设置保存到存储中

### 背景设置

- **`load-background-settings`**: 加载背景设置
  - 类型: 调用 (invoke)
  - 返回: { type: string, imageUrl: string, opacity: number, blur: number }
  - 描述: 从存储中加载用户的背景设置

- **`save-background-settings`**: 保存背景设置
  - 类型: 发送 (send)
  - 参数: { type: string, imageUrl: string, opacity: number, blur: number }
  - 描述: 将用户的背景设置保存到存储中

## URL 历史记录通道

- **`load-url-history`**: 加载 URL 历史记录
  - 类型: 调用 (invoke)
  - 返回: { url: string, label: string }[]
  - 描述: 从存储中加载用户的 URL 历史记录

- **`save-url-history`**: 保存 URL 历史记录
  - 类型: 发送 (send)
  - 参数: { url: string, label: string }[]
  - 描述: 将用户的 URL 历史记录保存到存储中

## 定时任务通道

- **`start-schedule`**: 启动定时任务
  - 类型: 发送 (send)
  - 参数: { scheduleType: 'weekly'|'daily', day: string, hour: string, minute: string, timezone: string }
  - 描述: 创建并启动定时抓取任务

- **`stop-schedule`**: 停止定时任务
  - 类型: 发送 (send)
  - 描述: 停止正在运行的定时抓取任务

- **`schedule-trigger`**: 定时任务触发
  - 类型: 监听 (on)
  - 描述: 监听定时任务触发事件

- **`load-schedule-settings`**: 加载定时任务设置
  - 类型: 调用 (invoke)
  - 返回: { scheduleType: string, day: string, hour: string, minute: string, timezone: string }
  - 描述: 从存储中加载用户的定时任务设置

- **`save-schedule-settings`**: 保存定时任务设置
  - 类型: 发送 (send)
  - 参数: { scheduleType: string, day: string, hour: string, minute: string, timezone: string }
  - 描述: 将用户的定时任务设置保存到存储中

## 界面状态通道

- **`load-ui-state`**: 加载界面状态
  - 类型: 调用 (invoke)
  - 参数: { key: string }
  - 返回: boolean
  - 描述: 从存储中加载指定键的界面状态，如各部分的展开/折叠状态

- **`save-ui-state`**: 保存界面状态
  - 类型: 发送 (send)
  - 参数: { key: string, value: boolean }
  - 描述: 将界面状态保存到存储中

## 系统相关通道

- **`open-external-url`**: 在外部浏览器中打开URL
  - 类型: 调用 (invoke)
  - 参数: string
  - 返回: boolean
  - 描述: 在系统默认浏览器中打开指定的URL