# URL管理组件

这个目录包含了URL管理相关的组件，用于管理和操作URL列表。

## 组件结构

- `UrlHistoryDialog.vue` - 主对话框组件，用于管理URL历史记录
- `UrlTable.vue` - URL表格组件，显示URL列表并提供编辑功能
- `DeleteConfirmDialog.vue` - 删除确认对话框组件
- `urlUtils.ts` - URL相关的工具函数

## 功能特点

1. **URL历史管理**
   - 添加、编辑、删除URL
   - 搜索过滤URL
   - 从剪贴板导入URL
   - 自动保存历史记录

2. **URL操作**
   - 复制URL到剪贴板
   - 在外部浏览器中打开URL
   - 自动生成URL标签名称

3. **用户界面**
   - 响应式设计
   - 自定义标题栏
   - 美观的表格布局
   - 动画效果和交互反馈

## 使用方法

```vue
<template>
  <url-history-dialog
    v-model="dialogVisible"
    :history="urlHistory"
    @update:history="updateUrlHistory"
    @open-url="openExternalUrl"
  />
</template>

<script setup>
import { ref } from 'vue'
import UrlHistoryDialog from './url-input/UrlHistoryDialog.vue'

const dialogVisible = ref(false)
const urlHistory = ref([])

const updateUrlHistory = (newHistory) => {
  urlHistory.value = newHistory
  // 保存历史记录
}

const openExternalUrl = (url) => {
  // 在外部浏览器中打开URL
}
</script>
```

## 样式定制

组件使用Element Plus的样式系统，并添加了自定义样式以提升用户体验。主要样式特点包括：

- 圆角边框和阴影效果
- 悬停和焦点状态的视觉反馈
- 一致的颜色方案和间距
- 响应式布局适应不同屏幕尺寸

## 注意事项

- 组件依赖Element Plus UI库
- 需要Electron环境支持外部URL打开功能
- 本地存储用于保存URL历史记录 