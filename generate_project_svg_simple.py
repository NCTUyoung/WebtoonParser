import os
import json
from collections import defaultdict

def scan_directory(root_dir='src'):
    """扫描目录结构，收集文件信息"""
    structure = {
        'name': os.path.basename(root_dir),
        'type': 'directory',
        'children': []
    }
    
    # 递归扫描目录
    for item in os.listdir(root_dir):
        item_path = os.path.join(root_dir, item)
        if os.path.isdir(item_path):
            # 递归处理子目录
            structure['children'].append(scan_directory(item_path))
        else:
            # 处理文件
            file_type = os.path.splitext(item)[1][1:] if '.' in item else 'unknown'
            structure['children'].append({
                'name': item,
                'type': 'file',
                'file_type': file_type
            })
    
    return structure

def generate_html_visualization(structure, output_file='project_structure.html'):
    """生成HTML可视化"""
    # 创建HTML文件
    html_content = """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Electron项目结构</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background-color: white;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                text-align: center;
            }
            .project-structure {
                margin-top: 20px;
            }
            .directory {
                margin-bottom: 10px;
            }
            .directory-name {
                font-weight: bold;
                cursor: pointer;
                padding: 5px;
                background-color: #e9f5ff;
                border-radius: 3px;
                display: inline-block;
            }
            .directory-name:hover {
                background-color: #d0e8ff;
            }
            .directory-contents {
                margin-left: 20px;
                padding-left: 10px;
                border-left: 1px solid #ddd;
            }
            .file {
                margin: 5px 0;
                padding: 3px;
                border-radius: 3px;
            }
            .file:hover {
                background-color: #f0f0f0;
            }
            .file-js {
                color: #F7DF1E;
            }
            .file-vue {
                color: #41B883;
            }
            .file-ts {
                color: #3178C6;
            }
            .file-html {
                color: #E34F26;
            }
            .file-css, .file-scss {
                color: #CC6699;
            }
            .legend {
                margin-top: 30px;
                padding: 10px;
                background-color: #f9f9f9;
                border-radius: 5px;
            }
            .legend-item {
                display: inline-block;
                margin-right: 15px;
            }
            .electron-architecture {
                margin-top: 30px;
                padding: 20px;
                background-color: #f9f9f9;
                border-radius: 5px;
                text-align: center;
            }
            .process-container {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
            }
            .process {
                width: 30%;
                padding: 15px;
                border-radius: 5px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .main-process {
                background-color: #fffde7;
            }
            .renderer-process {
                background-color: #e8f5e9;
            }
            .preload-scripts {
                background-color: #e3f2fd;
            }
            .arrow {
                font-size: 24px;
                margin-top: 50px;
            }
            .communication {
                margin-top: 20px;
                font-style: italic;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Electron项目结构</h1>
            
            <div class="project-structure">
    """
    
    # 递归生成HTML结构
    def generate_structure_html(node, level=0):
        html = ""
        if node['type'] == 'directory':
            html += f'<div class="directory">\n'
            html += f'<div class="directory-name" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === \'none\' ? \'block\' : \'none\'">📁 {node["name"]}</div>\n'
            html += f'<div class="directory-contents">\n'
            
            # 先处理子目录，再处理文件
            directories = [child for child in node['children'] if child['type'] == 'directory']
            files = [child for child in node['children'] if child['type'] == 'file']
            
            for child in directories:
                html += generate_structure_html(child, level + 1)
            
            for child in files:
                html += generate_structure_html(child, level + 1)
                
            html += f'</div>\n'
            html += f'</div>\n'
        else:  # 文件
            file_class = f"file-{node['file_type']}" if node['file_type'] in ['js', 'vue', 'ts', 'html', 'css', 'scss'] else ""
            icon = get_file_icon(node['file_type'])
            html += f'<div class="file {file_class}">{icon} {node["name"]}</div>\n'
        
        return html
    
    def get_file_icon(file_type):
        icons = {
            'js': '📄 (JS)',
            'vue': '📄 (Vue)',
            'ts': '📄 (TS)',
            'html': '📄 (HTML)',
            'css': '📄 (CSS)',
            'scss': '📄 (SCSS)',
        }
        return icons.get(file_type, '📄')
    
    # 添加项目结构
    html_content += generate_structure_html(structure)
    
    # 添加图例
    html_content += """
            </div>
            
            <div class="legend">
                <h3>文件类型图例</h3>
                <div class="legend-item"><span class="file-js">📄 (JS)</span> - JavaScript 文件</div>
                <div class="legend-item"><span class="file-vue">📄 (Vue)</span> - Vue 组件</div>
                <div class="legend-item"><span class="file-ts">📄 (TS)</span> - TypeScript 文件</div>
                <div class="legend-item"><span class="file-html">📄 (HTML)</span> - HTML 文件</div>
                <div class="legend-item"><span class="file-css">📄 (CSS/SCSS)</span> - 样式文件</div>
            </div>
            
            <div class="electron-architecture">
                <h2>Electron 架构</h2>
                <p>Electron 应用由三个主要部分组成：</p>
                
                <div class="process-container">
                    <div class="process main-process">
                        <h3>Main Process (主进程)</h3>
                        <p>负责应用生命周期管理、原生功能、窗口创建等</p>
                        <p>使用 Node.js 环境</p>
                        <p>文件位置: src/main/</p>
                    </div>
                    
                    <div class="arrow">⟷</div>
                    
                    <div class="process preload-scripts">
                        <h3>Preload Scripts (预加载脚本)</h3>
                        <p>主进程和渲染进程之间的桥梁</p>
                        <p>提供安全的 API 访问</p>
                        <p>文件位置: src/preload/</p>
                    </div>
                    
                    <div class="arrow">⟷</div>
                    
                    <div class="process renderer-process">
                        <h3>Renderer Process (渲染进程)</h3>
                        <p>负责 UI 渲染和用户交互</p>
                        <p>使用 Web 技术 (HTML, CSS, JS)</p>
                        <p>文件位置: src/renderer/</p>
                    </div>
                </div>
                
                <div class="communication">
                    <p>进程间通信 (IPC) 允许主进程和渲染进程之间安全地交换信息</p>
                </div>
            </div>
        </div>
        
        <script>
            // 默认展开第一级目录
            document.addEventListener('DOMContentLoaded', function() {
                const topLevelDirs = document.querySelectorAll('.container > .project-structure > .directory > .directory-contents');
                topLevelDirs.forEach(dir => {
                    dir.style.display = 'block';
                });
            });
        </script>
    </body>
    </html>
    """
    
    # 写入HTML文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"项目结构HTML已生成: {output_file}")
    
    # 同时生成JSON文件
    with open('project_structure.json', 'w', encoding='utf-8') as f:
        json.dump(structure, f, ensure_ascii=False, indent=2)
    print(f"项目结构JSON已生成: project_structure.json")

if __name__ == "__main__":
    structure = scan_directory()
    generate_html_visualization(structure) 