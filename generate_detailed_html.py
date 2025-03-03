import os
import re
import json
from collections import defaultdict

class DetailedElectronHTMLVisualizer:
    def __init__(self, root_dir='src'):
        self.root_dir = root_dir
        self.main_files = []
        self.renderer_files = []
        self.preload_files = []
        self.components = []
        self.ipc_channels = []
        self.dependencies = defaultdict(list)
        self.tech_stack = {
            'main': [],
            'renderer': [],
            'preload': []
        }
        
    def scan_directory(self):
        """扫描目录结构，收集文件信息"""
        # 扫描主进程文件
        main_dir = os.path.join(self.root_dir, 'main')
        if os.path.exists(main_dir):
            for file in os.listdir(main_dir):
                if file.endswith(('.js', '.ts')):
                    file_path = os.path.join(main_dir, file)
                    self.main_files.append({
                        'name': file,
                        'path': file_path,
                        'content': self.read_file_content(file_path)
                    })
                    
        # 扫描渲染进程文件
        renderer_dir = os.path.join(self.root_dir, 'renderer')
        if os.path.exists(renderer_dir):
            for root, dirs, files in os.walk(renderer_dir):
                for file in files:
                    if file.endswith(('.js', '.ts', '.vue')):
                        file_path = os.path.join(root, file)
                        rel_path = os.path.relpath(file_path, renderer_dir)
                        self.renderer_files.append({
                            'name': file,
                            'path': file_path,
                            'rel_path': rel_path,
                            'content': self.read_file_content(file_path)
                        })
                        
                        # 如果是组件目录下的Vue文件，添加到组件列表
                        if 'components' in root and file.endswith('.vue'):
                            self.components.append({
                                'name': file.replace('.vue', ''),
                                'path': rel_path
                            })
                        
        # 扫描预加载脚本
        preload_dir = os.path.join(self.root_dir, 'preload')
        if os.path.exists(preload_dir):
            for file in os.listdir(preload_dir):
                if file.endswith(('.js', '.ts')):
                    file_path = os.path.join(preload_dir, file)
                    self.preload_files.append({
                        'name': file,
                        'path': file_path,
                        'content': self.read_file_content(file_path)
                    })
    
    def read_file_content(self, file_path):
        """读取文件内容"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"无法读取文件 {file_path}: {e}")
            return ""
    
    def analyze_tech_stack(self):
        """分析技术栈"""
        # 分析主进程技术栈
        for file in self.main_files:
            content = file['content']
            # 查找require语句
            requires = re.findall(r'(?:const|let|var)\s+(?:\{\s*([^}]+)\s*\}|\s*([^\s=]+))\s*=\s*require\([\'"]([^\'"]+)[\'"]\)', content)
            for req in requires:
                if req[2].startswith('.'):  # 本地模块
                    continue
                if req[0]:  # 解构导入
                    modules = [m.strip() for m in req[0].split(',')]
                    for module in modules:
                        if module and module not in self.tech_stack['main']:
                            self.tech_stack['main'].append(f"{req[2]}:{module}")
                else:  # 常规导入
                    if req[1] and req[2] not in self.tech_stack['main']:
                        self.tech_stack['main'].append(req[2])
        
        # 分析渲染进程技术栈
        for file in self.renderer_files:
            content = file['content']
            # 查找import语句和Vue组件
            imports = re.findall(r'import\s+(?:\{\s*([^}]+)\s*\}|\s*([^\s,]+))\s+from\s+[\'"]([^\'"]+)[\'"]', content)
            for imp in imports:
                if imp[2].startswith('.'):  # 本地模块
                    continue
                if imp[0]:  # 解构导入
                    modules = [m.strip() for m in imp[0].split(',')]
                    for module in modules:
                        if module and module not in self.tech_stack['renderer']:
                            self.tech_stack['renderer'].append(f"{imp[2]}:{module}")
                else:  # 常规导入
                    if imp[1] and imp[2] not in self.tech_stack['renderer']:
                        self.tech_stack['renderer'].append(imp[2])
            
            # 查找Vue特定语法
            if '<template>' in content and '<script>' in content:
                if 'vue' not in self.tech_stack['renderer']:
                    self.tech_stack['renderer'].append('vue')
                if '<el-' in content and 'element-plus' not in self.tech_stack['renderer']:
                    self.tech_stack['renderer'].append('element-plus')
        
        # 分析预加载脚本技术栈
        for file in self.preload_files:
            content = file['content']
            # 查找require语句
            requires = re.findall(r'(?:const|let|var)\s+(?:\{\s*([^}]+)\s*\}|\s*([^\s=]+))\s*=\s*require\([\'"]([^\'"]+)[\'"]\)', content)
            for req in requires:
                if req[2].startswith('.'):  # 本地模块
                    continue
                if req[0]:  # 解构导入
                    modules = [m.strip() for m in req[0].split(',')]
                    for module in modules:
                        if module and module not in self.tech_stack['preload']:
                            self.tech_stack['preload'].append(f"{req[2]}:{module}")
                else:  # 常规导入
                    if req[1] and req[2] not in self.tech_stack['preload']:
                        self.tech_stack['preload'].append(req[2])
    
    def analyze_ipc_channels(self):
        """分析IPC通信通道"""
        # 分析主进程IPC
        for file in self.main_files:
            content = file['content']
            # 查找ipcMain.on和ipcMain.handle
            ipc_handlers = re.findall(r'ipcMain\.(?:on|handle)\([\'"]([^\'"]+)[\'"]', content)
            for channel in ipc_handlers:
                self.ipc_channels.append({
                    'channel': channel,
                    'type': 'receive',
                    'file': file['name'],
                    'process': 'main'
                })
        
        # 分析渲染进程IPC
        for file in self.renderer_files:
            content = file['content']
            # 查找ipcRenderer.send和ipcRenderer.invoke
            ipc_senders = re.findall(r'(?:ipcRenderer|electron)\.(?:send|invoke)\([\'"]([^\'"]+)[\'"]', content)
            for channel in ipc_senders:
                self.ipc_channels.append({
                    'channel': channel,
                    'type': 'send',
                    'file': file['rel_path'],
                    'process': 'renderer'
                })
        
        # 分析预加载脚本IPC
        for file in self.preload_files:
            content = file['content']
            # 查找contextBridge.exposeInMainWorld
            exposed_apis = re.findall(r'contextBridge\.exposeInMainWorld\([\'"]([^\'"]+)[\'"]', content)
            for api in exposed_apis:
                self.ipc_channels.append({
                    'channel': f"API:{api}",
                    'type': 'expose',
                    'file': file['name'],
                    'process': 'preload'
                })
    
    def analyze_business_logic(self):
        """分析业务逻辑"""
        business_logic = {
            'webtoon_scraper': {
                'methods': [],
                'dependencies': []
            },
            'scheduler': {
                'methods': [],
                'dependencies': []
            }
        }
        
        # 分析WebtoonScraper类
        for file in self.main_files:
            if file['name'] == 'webtoon.js':
                content = file['content']
                # 查找类方法
                methods = re.findall(r'(?:async\s+)?([a-zA-Z0-9_]+)\s*\([^)]*\)\s*{', content)
                for method in methods:
                    if method != 'constructor' and method not in business_logic['webtoon_scraper']['methods']:
                        business_logic['webtoon_scraper']['methods'].append(method)
                
                # 查找依赖
                requires = re.findall(r'(?:const|let|var)\s+(?:\{\s*([^}]+)\s*\}|\s*([^\s=]+))\s*=\s*require\([\'"]([^\'"]+)[\'"]\)', content)
                for req in requires:
                    if req[2].startswith('.'):  # 本地模块
                        continue
                    if req[0]:  # 解构导入
                        modules = [m.strip() for m in req[0].split(',')]
                        for module in modules:
                            if module and module not in business_logic['webtoon_scraper']['dependencies']:
                                business_logic['webtoon_scraper']['dependencies'].append(f"{req[2]}:{module}")
                    else:  # 常规导入
                        if req[1] and req[2] not in business_logic['webtoon_scraper']['dependencies']:
                            business_logic['webtoon_scraper']['dependencies'].append(req[2])
            
            # 分析定时任务
            if file['name'] == 'index.js':
                content = file['content']
                if 'schedule' in content or 'node-schedule' in content:
                    # 查找定时任务相关代码
                    schedule_code = re.findall(r'schedule\.scheduleJob\([^)]+\)', content)
                    for code in schedule_code:
                        business_logic['scheduler']['methods'].append('scheduleJob')
        
        return business_logic
    
    def generate_html_visualization(self, output_file='detailed_electron_architecture.html'):
        """生成HTML可视化"""
        # 扫描目录和分析
        self.scan_directory()
        self.analyze_tech_stack()
        self.analyze_ipc_channels()
        business_logic = self.analyze_business_logic()
        
        # 创建HTML内容
        html_content = """
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>详细的Electron应用架构</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                    color: #333;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    background-color: white;
                    padding: 20px;
                    border-radius: 5px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                h1, h2, h3, h4 {
                    color: #333;
                }
                h1 {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .architecture-diagram {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    margin-bottom: 40px;
                }
                .process-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 20px;
                }
                .process-box {
                    flex: 1;
                    padding: 15px;
                    border-radius: 5px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                .main-process {
                    background-color: #fffde7;
                    border-left: 5px solid #F7DF1E;
                }
                .renderer-process {
                    background-color: #e8f5e9;
                    border-left: 5px solid #41B883;
                }
                .preload-scripts {
                    background-color: #e3f2fd;
                    border-left: 5px solid #3178C6;
                }
                .business-logic {
                    background-color: #fff9c4;
                    border-left: 5px solid #FF7043;
                }
                .communication-arrows {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    text-align: center;
                    font-style: italic;
                    color: #666;
                }
                .arrow {
                    flex: 1;
                    position: relative;
                }
                .arrow::before {
                    content: "⟷";
                    font-size: 24px;
                    color: #FF5722;
                }
                .file-list {
                    margin-top: 10px;
                    padding-left: 20px;
                }
                .file-item {
                    margin-bottom: 5px;
                    padding: 5px;
                    background-color: rgba(255,255,255,0.5);
                    border-radius: 3px;
                }
                .tech-stack {
                    margin-top: 15px;
                    padding: 10px;
                    background-color: rgba(255,255,255,0.7);
                    border-radius: 3px;
                }
                .tech-item {
                    display: inline-block;
                    margin: 3px;
                    padding: 3px 8px;
                    background-color: #e0e0e0;
                    border-radius: 10px;
                    font-size: 0.9em;
                }
                .ipc-channels {
                    margin-top: 30px;
                    padding: 15px;
                    background-color: #f9f9f9;
                    border-radius: 5px;
                    border-left: 5px solid #FF5722;
                }
                .channel-item {
                    margin-bottom: 8px;
                    padding: 5px;
                    background-color: white;
                    border-radius: 3px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .components-section {
                    margin-top: 30px;
                    padding: 15px;
                    background-color: #f9f9f9;
                    border-radius: 5px;
                    border-left: 5px solid #41B883;
                }
                .component-item {
                    margin-bottom: 8px;
                    padding: 5px;
                    background-color: white;
                    border-radius: 3px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .business-section {
                    margin-top: 30px;
                    padding: 15px;
                    background-color: #f9f9f9;
                    border-radius: 5px;
                    border-left: 5px solid #FF7043;
                }
                .method-item {
                    display: inline-block;
                    margin: 3px;
                    padding: 3px 8px;
                    background-color: #ffecb3;
                    border-radius: 10px;
                    font-size: 0.9em;
                }
                .dependency-item {
                    display: inline-block;
                    margin: 3px;
                    padding: 3px 8px;
                    background-color: #e0e0e0;
                    border-radius: 10px;
                    font-size: 0.9em;
                }
                .tab-container {
                    margin-top: 30px;
                }
                .tab-buttons {
                    display: flex;
                    border-bottom: 1px solid #ddd;
                }
                .tab-button {
                    padding: 10px 20px;
                    background-color: #f1f1f1;
                    border: none;
                    cursor: pointer;
                    transition: 0.3s;
                }
                .tab-button:hover {
                    background-color: #ddd;
                }
                .tab-button.active {
                    background-color: #ccc;
                }
                .tab-content {
                    display: none;
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-top: none;
                }
                .tab-content.active {
                    display: block;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>详细的Electron应用架构</h1>
                
                <!-- 架构图 -->
                <div class="architecture-diagram">
                    <div class="process-row">
                        <div class="process-box main-process">
                            <h2>Main Process (主进程)</h2>
                            <p>负责应用生命周期管理、原生功能、窗口创建等</p>
                            <p>使用 Node.js 环境</p>
                            
                            <h3>文件列表</h3>
                            <div class="file-list">
        """
        
        # 添加主进程文件
        for file in self.main_files:
            html_content += f'<div class="file-item">{file["name"]}</div>\n'
        
        html_content += """
                            </div>
                            
                            <h3>技术栈</h3>
                            <div class="tech-stack">
        """
        
        # 添加主进程技术栈
        for tech in self.tech_stack['main']:
            html_content += f'<span class="tech-item">{tech}</span>\n'
        
        html_content += """
                            </div>
                        </div>
                        
                        <div class="process-box preload-scripts">
                            <h2>Preload Scripts (预加载脚本)</h2>
                            <p>主进程和渲染进程之间的桥梁</p>
                            <p>提供安全的 API 访问</p>
                            
                            <h3>文件列表</h3>
                            <div class="file-list">
        """
        
        # 添加预加载脚本文件
        for file in self.preload_files:
            html_content += f'<div class="file-item">{file["name"]}</div>\n'
        
        html_content += """
                            </div>
                            
                            <h3>技术栈</h3>
                            <div class="tech-stack">
        """
        
        # 添加预加载脚本技术栈
        for tech in self.tech_stack['preload']:
            html_content += f'<span class="tech-item">{tech}</span>\n'
        
        html_content += """
                            </div>
                        </div>
                        
                        <div class="process-box renderer-process">
                            <h2>Renderer Process (渲染进程)</h2>
                            <p>负责 UI 渲染和用户交互</p>
                            <p>使用 Web 技术 (HTML, CSS, JS)</p>
                            
                            <h3>文件列表</h3>
                            <div class="file-list">
        """
        
        # 添加渲染进程主要文件
        main_renderer_files = [f for f in self.renderer_files if '/' not in f['rel_path']]
        for file in main_renderer_files:
            html_content += f'<div class="file-item">{file["name"]}</div>\n'
        
        html_content += """
                            </div>
                            
                            <h3>技术栈</h3>
                            <div class="tech-stack">
        """
        
        # 添加渲染进程技术栈
        for tech in self.tech_stack['renderer']:
            html_content += f'<span class="tech-item">{tech}</span>\n'
        
        html_content += """
                            </div>
                        </div>
                    </div>
                    
                    <div class="communication-arrows">
                        <div class="arrow">IPC通信</div>
                        <div class="arrow">contextBridge API</div>
                    </div>
                    
                    <div class="process-box business-logic">
                        <h2>Business Logic (业务逻辑)</h2>
                        <p>处理应用的核心功能</p>
                        
                        <h3>主要模块</h3>
                        <div class="file-list">
                            <div class="file-item">WebtoonScraper (爬虫核心类)</div>
                            <div class="file-item">Scheduler (定时任务)</div>
                            <div class="file-item">Data Processing (数据处理)</div>
                            <div class="file-item">Excel Export (数据导出)</div>
                        </div>
                    </div>
                </div>
                
                <!-- 选项卡 -->
                <div class="tab-container">
                    <div class="tab-buttons">
                        <button class="tab-button active" onclick="openTab(event, 'ipc-tab')">IPC通信通道</button>
                        <button class="tab-button" onclick="openTab(event, 'components-tab')">Vue组件</button>
                        <button class="tab-button" onclick="openTab(event, 'business-tab')">业务逻辑</button>
                    </div>
                    
                    <!-- IPC通信选项卡 -->
                    <div id="ipc-tab" class="tab-content active">
                        <div class="ipc-channels">
                            <h2>IPC通信通道</h2>
                            <p>主进程和渲染进程之间的通信通道</p>
        """
        
        # 添加IPC通道
        for channel in self.ipc_channels:
            direction = ""
            if channel['type'] == 'send':
                direction = "渲染进程 → 主进程"
            elif channel['type'] == 'receive':
                direction = "主进程 ← 渲染进程"
            elif channel['type'] == 'expose':
                direction = "预加载脚本 → 渲染进程"
            
            html_content += f'''
                <div class="channel-item">
                    <strong>{channel['channel']}</strong> ({direction})
                    <div>文件: {channel['file']}</div>
                </div>
            '''
        
        html_content += """
                        </div>
                    </div>
                    
                    <!-- Vue组件选项卡 -->
                    <div id="components-tab" class="tab-content">
                        <div class="components-section">
                            <h2>Vue组件</h2>
                            <p>渲染进程中的Vue组件</p>
        """
        
        # 添加Vue组件
        for component in self.components:
            html_content += f'''
                <div class="component-item">
                    <strong>{component['name']}</strong>
                    <div>路径: {component['path']}</div>
                </div>
            '''
        
        html_content += """
                        </div>
                    </div>
                    
                    <!-- 业务逻辑选项卡 -->
                    <div id="business-tab" class="tab-content">
                        <div class="business-section">
                            <h2>业务逻辑</h2>
                            <p>应用的核心功能</p>
                            
                            <h3>WebtoonScraper (爬虫核心类)</h3>
                            <div>
                                <h4>方法:</h4>
                                <div>
        """
        
        # 添加WebtoonScraper方法
        for method in business_logic['webtoon_scraper']['methods']:
            html_content += f'<span class="method-item">{method}()</span>\n'
        
        html_content += """
                                </div>
                                
                                <h4>依赖:</h4>
                                <div>
        """
        
        # 添加WebtoonScraper依赖
        for dependency in business_logic['webtoon_scraper']['dependencies']:
            html_content += f'<span class="dependency-item">{dependency}</span>\n'
        
        html_content += """
                                </div>
                            </div>
                            
                            <h3>Scheduler (定时任务)</h3>
                            <div>
                                <h4>方法:</h4>
                                <div>
        """
        
        # 添加Scheduler方法
        for method in business_logic['scheduler']['methods']:
            html_content += f'<span class="method-item">{method}()</span>\n'
        
        html_content += """
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <script>
                    function openTab(evt, tabName) {
                        var i, tabcontent, tabbuttons;
                        
                        // 隐藏所有选项卡内容
                        tabcontent = document.getElementsByClassName("tab-content");
                        for (i = 0; i < tabcontent.length; i++) {
                            tabcontent[i].className = tabcontent[i].className.replace(" active", "");
                        }
                        
                        // 移除所有按钮的active类
                        tabbuttons = document.getElementsByClassName("tab-button");
                        for (i = 0; i < tabbuttons.length; i++) {
                            tabbuttons[i].className = tabbuttons[i].className.replace(" active", "");
                        }
                        
                        // 显示当前选项卡并添加active类到按钮
                        document.getElementById(tabName).className += " active";
                        evt.currentTarget.className += " active";
                    }
                </script>
            </div>
        </body>
        </html>
        """
        
        # 写入HTML文件
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"详细的Electron架构HTML已生成: {output_file}")
        
        # 保存分析结果为JSON
        analysis_result = {
            'tech_stack': self.tech_stack,
            'components': self.components,
            'ipc_channels': self.ipc_channels,
            'business_logic': business_logic,
            'files': {
                'main': [f['name'] for f in self.main_files],
                'renderer': [f['rel_path'] for f in self.renderer_files],
                'preload': [f['name'] for f in self.preload_files]
            }
        }
        
        with open('detailed_electron_analysis.json', 'w', encoding='utf-8') as f:
            json.dump(analysis_result, f, ensure_ascii=False, indent=2)
        print("详细的Electron分析JSON已生成: detailed_electron_analysis.json")

if __name__ == "__main__":
    visualizer = DetailedElectronHTMLVisualizer()
    visualizer.generate_html_visualization() 