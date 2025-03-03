# Electron项目结构分析工具

这个工具集用于分析Electron项目的结构，并生成可视化的图表，帮助开发者更好地理解项目架构。

## 功能特点

- 生成项目文件结构的可视化图表（SVG或HTML）
- 分析Electron应用的主进程、渲染进程和预加载脚本之间的关系
- 识别IPC通信通道
- 分析组件依赖关系
- 分析技术栈和业务逻辑
- 输出详细的JSON分析结果

## 使用方法

### 环境要求

- Python 3.6+
- 对于SVG图生成：Graphviz (需要单独安装)
- Python依赖包：graphviz (仅用于SVG图生成)

### 安装依赖

```bash
pip install graphviz
```

注意：如果要生成SVG图，您还需要安装Graphviz软件包。请访问[Graphviz官网](https://graphviz.org/download/)下载并安装适合您操作系统的版本。

### 一键生成所有图表和分析（推荐）

最简单的方法是运行增强版的一键生成脚本：

```bash
python generate_all_diagrams_v2.py
```

该脚本会自动检测您的环境，并根据是否安装了Graphviz选择合适的生成方式。它会生成所有可能的图表和分析，包括基本的和详细的。

### 无需安装Graphviz的详细HTML可视化

如果您不想安装Graphviz软件，可以使用详细的HTML可视化脚本：

```bash
python generate_detailed_html.py
```

这将生成两个文件：
- `detailed_electron_architecture.html`：包含详细的Electron架构HTML可视化，包括技术栈、IPC通道、Vue组件和业务逻辑分析
- `detailed_electron_analysis.json`：包含详细的分析结果JSON文件

详细的HTML可视化提供了交互式的架构浏览，包含选项卡式界面，可以查看不同方面的技术细节。

### 无需安装Graphviz的基本HTML可视化

如果您只需要基本的项目结构可视化：

```bash
python generate_project_svg_simple.py
```

这将生成两个文件：
- `project_structure.html`：包含项目结构的HTML可视化
- `project_structure.json`：包含项目结构的JSON文件

### 详细的Electron架构SVG图（需要Graphviz）

运行以下命令生成详细的Electron架构SVG图：

```bash
python generate_detailed_architecture.py
```

这将生成`detailed_electron_architecture.svg`文件，展示Electron应用的详细架构，包括技术栈、文件关系和业务逻辑。

### 基本项目结构图 (需要Graphviz)

运行以下命令生成基本的项目结构SVG图：

```bash
python generate_project_svg.py
```

这将在当前目录下生成`project_structure.svg`文件。

### 详细项目分析 (需要Graphviz)

运行以下命令进行详细的项目分析并生成SVG图：

```bash
python analyze_electron_project.py
```

这将生成两个文件：
- `electron_project_analysis.svg`：包含项目结构和组件关系的SVG图
- `electron_project_analysis.json`：包含详细分析结果的JSON文件

### Electron架构图 (需要Graphviz)

运行以下命令生成Electron架构图：

```bash
python generate_electron_architecture.py
```

这将生成`electron_architecture.svg`文件，展示Electron应用的三个主要部分（主进程、渲染进程和预加载脚本）之间的关系。

## 分析结果说明

### 详细HTML可视化内容

详细的HTML可视化包含以下内容：

- **架构概览**：展示主进程、渲染进程、预加载脚本和业务逻辑的关系
- **技术栈分析**：列出每个进程使用的技术和库
- **IPC通信通道**：分析进程间通信的通道和方向
- **Vue组件**：列出渲染进程中的Vue组件
- **业务逻辑**：分析核心业务类的方法和依赖

### SVG图例

- **黄色节点**：JavaScript文件（主进程）
- **绿色节点**：Vue组件（渲染进程）
- **蓝色节点**：TypeScript文件和预加载脚本
- **橙色节点**：HTML文件
- **红色边**：IPC通信通道
- **虚线边**：模块依赖关系

### JSON分析结果

JSON分析结果包含以下主要部分：

- `tech_stack`：项目中使用的技术栈，按进程分类
- `components`：项目中的Vue组件
- `ipc_channels`：IPC通信通道列表
- `business_logic`：业务逻辑分析，包括方法和依赖
- `files`：项目中的文件列表，按进程分类

## 自定义分析

如果需要自定义分析，可以修改Python脚本中的参数：

```python
# 修改项目根目录
visualizer = DetailedElectronHTMLVisualizer(root_dir='your_src_path')

# 修改输出文件名
visualizer.generate_html_visualization(output_file='your_output_name.html')
```

## 示例输出

![项目结构示例](project_structure.svg)

## 注意事项

- 分析结果的准确性取决于代码的规范性和一致性
- 对于非常大的项目，生成的图可能会很复杂，建议按模块分别分析
- 某些特殊的代码模式可能无法被正确识别

## 总结

这个工具集提供了多种方式来可视化和分析Electron项目的结构：

1. **HTML可视化** - 提供交互式的项目结构和架构浏览，不需要安装额外软件
2. **SVG图表** - 提供静态的、高质量的项目结构和关系图
3. **JSON数据** - 提供结构化的项目分析数据，可用于进一步处理

无论您是Electron项目的新手还是有经验的开发者，这些工具都能帮助您更好地理解项目架构，特别是对于复杂的、多文件的Electron应用。

### 工具列表

| 脚本名称 | 功能描述 | 依赖要求 |
|---------|---------|---------|
| `generate_all_diagrams_v2.py` | 一键生成所有图表和分析（增强版） | 自动适应环境 |
| `generate_detailed_html.py` | 生成详细的HTML架构可视化 | 无特殊依赖 |
| `generate_project_svg_simple.py` | 生成基本HTML可视化 | 无特殊依赖 |
| `generate_detailed_architecture.py` | 生成详细的Electron架构SVG图 | 需要Graphviz |
| `generate_project_svg.py` | 生成项目结构SVG图 | 需要Graphviz |
| `analyze_electron_project.py` | 详细分析项目并生成SVG图 | 需要Graphviz |
| `generate_electron_architecture.py` | 生成Electron架构图 | 需要Graphviz |

希望这些工具能帮助您更好地理解和开发Electron应用！
