import os
import re
import json
import graphviz
from collections import defaultdict

class DetailedElectronArchitectureVisualizer:
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
    
    def generate_detailed_svg(self, output_file='detailed_electron_architecture.svg'):
        """生成详细的Electron架构SVG图"""
        # 扫描目录和分析
        self.scan_directory()
        self.analyze_tech_stack()
        self.analyze_ipc_channels()
        
        # 创建有向图
        dot = graphviz.Digraph(
            'detailed_electron_architecture', 
            comment='详细的Electron应用架构',
            format='svg',
            engine='dot'
        )
        
        # 设置图形属性
        dot.attr(rankdir='LR', size='14,10', dpi='300')
        dot.attr('node', fontname='Arial', fontsize='12')
        dot.attr('edge', fontname='Arial', fontsize='10')
        
        # 创建主进程子图
        with dot.subgraph(name='cluster_main') as main:
            main.attr(label='Main Process (主进程)', style='filled', color='lightyellow', fontsize='16')
            
            # 添加主进程文件
            for i, file in enumerate(self.main_files):
                node_id = f"main_{i}"
                main.node(node_id, file['name'], shape='box', style='filled', color='#F7DF1E')
                
                # 如果是index.js，添加应用入口标记
                if file['name'] == 'index.js':
                    main.node('app_entry', 'Electron App Entry', shape='ellipse', style='filled', color='#FF9966')
                    main.edge('app_entry', node_id)
            
            # 添加技术栈
            tech_node_id = 'main_tech'
            tech_label = 'Main Process Tech Stack:\n' + '\n'.join(self.tech_stack['main'][:10])
            if len(self.tech_stack['main']) > 10:
                tech_label += f"\n... 等{len(self.tech_stack['main'])-10}个模块"
            main.node(tech_node_id, tech_label, shape='note', style='filled', color='#FFFFCC')
            
            # 添加Node.js API节点
            main.node('node_apis', 'Node.js APIs\n(fs, path, etc.)', shape='ellipse', style='filled', color='#68A063')
            
            # 添加Electron API节点
            main.node('electron_apis_main', 'Electron APIs\n(app, BrowserWindow, ipcMain)', shape='ellipse', style='filled', color='#47848F')
        
        # 创建渲染进程子图
        with dot.subgraph(name='cluster_renderer') as renderer:
            renderer.attr(label='Renderer Process (渲染进程)', style='filled', color='lightgreen', fontsize='16')
            
            # 添加主要Vue组件
            renderer.node('app_vue', 'App.vue\n(主组件)', shape='box', style='filled', color='#41B883')
            
            # 添加子组件
            with renderer.subgraph(name='cluster_components') as components:
                components.attr(label='Vue Components', style='filled', color='#E8F5E9')
                
                for i, component in enumerate(self.components):
                    node_id = f"component_{i}"
                    components.node(node_id, component['name'], shape='box', style='filled', color='#41B883')
                    # 连接到App.vue
                    renderer.edge('app_vue', node_id, style='dashed')
            
            # 添加技术栈
            tech_node_id = 'renderer_tech'
            tech_label = 'Renderer Tech Stack:\n' + '\n'.join(self.tech_stack['renderer'][:10])
            if len(self.tech_stack['renderer']) > 10:
                tech_label += f"\n... 等{len(self.tech_stack['renderer'])-10}个模块"
            renderer.node(tech_node_id, tech_label, shape='note', style='filled', color='#E8F5E9')
            
            # 添加Web API节点
            renderer.node('web_apis', 'Web APIs\n(DOM, fetch, etc.)', shape='ellipse', style='filled', color='#E34F26')
            
            # 添加Electron API节点
            renderer.node('electron_apis_renderer', 'Electron APIs\n(通过contextBridge暴露)', shape='ellipse', style='filled', color='#47848F')
        
        # 创建预加载脚本子图
        with dot.subgraph(name='cluster_preload') as preload:
            preload.attr(label='Preload Scripts (预加载脚本)', style='filled', color='lightblue', fontsize='16')
            
            # 添加预加载脚本文件
            for i, file in enumerate(self.preload_files):
                node_id = f"preload_{i}"
                preload.node(node_id, file['name'], shape='box', style='filled', color='#3178C6')
            
            # 添加技术栈
            tech_node_id = 'preload_tech'
            tech_label = 'Preload Tech Stack:\n' + '\n'.join(self.tech_stack['preload'])
            preload.node(tech_node_id, tech_label, shape='note', style='filled', color='#E3F2FD')
            
            # 添加contextBridge节点
            preload.node('context_bridge', 'contextBridge\n(安全地暴露API)', shape='ellipse', style='filled', color='#47848F')
        
        # 添加业务逻辑子图
        with dot.subgraph(name='cluster_business') as business:
            business.attr(label='Business Logic (业务逻辑)', style='filled', color='#FFF9C4', fontsize='16')
            
            # 添加Webtoon爬虫节点
            business.node('webtoon_scraper', 'WebtoonScraper\n(爬虫核心类)', shape='box', style='filled', color='#FF7043')
            
            # 添加数据处理节点
            business.node('data_processing', 'Data Processing\n(数据处理)', shape='box', style='filled', color='#FF7043')
            
            # 添加Excel导出节点
            business.node('excel_export', 'Excel Export\n(数据导出)', shape='box', style='filled', color='#FF7043')
            
            # 添加定时任务节点
            business.node('scheduler', 'Scheduler\n(定时任务)', shape='box', style='filled', color='#FF7043')
            
            # 添加连接
            business.edge('webtoon_scraper', 'data_processing')
            business.edge('data_processing', 'excel_export')
            business.edge('scheduler', 'webtoon_scraper', label='触发')
        
        # 添加进程间连接
        # 主进程到渲染进程
        dot.edge('electron_apis_main', 'electron_apis_renderer', label='IPC通信', color='red')
        
        # 主进程到预加载脚本
        for i, file in enumerate(self.preload_files):
            dot.edge('electron_apis_main', f"preload_{i}", label='加载', color='blue')
        
        # 预加载脚本到渲染进程
        dot.edge('context_bridge', 'electron_apis_renderer', label='暴露API', color='green')
        
        # 业务逻辑连接
        for i, file in enumerate(self.main_files):
            if file['name'] == 'webtoon.js':
                dot.edge(f"main_{i}", 'webtoon_scraper', label='实现')
                break
        
        # 添加IPC通道
        ipc_edges = set()
        for channel in self.ipc_channels:
            if channel['process'] == 'main' and channel['type'] == 'receive':
                # 查找对应的发送方
                for sender in self.ipc_channels:
                    if sender['channel'] == channel['channel'] and sender['type'] == 'send':
                        dot.edge('electron_apis_renderer', 'electron_apis_main', 
                                label=f"IPC: {channel['channel']}", color='red', fontsize='8')
                        break
        
        # 添加说明
        with dot.subgraph(name='cluster_legend') as legend:
            legend.attr(label='技术架构说明', style='filled', color='lightgrey', fontsize='14')
            legend.node('legend_main', '主进程: Node.js环境\n处理系统API和后台任务', shape='box', style='filled', color='#F7DF1E')
            legend.node('legend_renderer', '渲染进程: Chromium环境\n处理UI和用户交互', shape='box', style='filled', color='#41B883')
            legend.node('legend_preload', '预加载脚本: 安全桥梁\n连接主进程和渲染进程', shape='box', style='filled', color='#3178C6')
            legend.node('legend_business', '业务逻辑: 爬虫功能\n处理数据获取和处理', shape='box', style='filled', color='#FF7043')
            
            legend.edge('legend_main', 'legend_preload', color='blue', label='加载')
            legend.edge('legend_preload', 'legend_renderer', color='green', label='暴露API')
            legend.edge('legend_main', 'legend_renderer', color='red', label='IPC通信')
            legend.edge('legend_main', 'legend_business', label='实现')
        
        # 渲染并保存图形
        dot.render(filename='detailed_electron_architecture', format='svg', cleanup=True)
        print(f"详细的Electron架构SVG已生成: {output_file}")
        
        # 保存分析结果为JSON
        analysis_result = {
            'tech_stack': self.tech_stack,
            'components': self.components,
            'ipc_channels': self.ipc_channels,
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
    visualizer = DetailedElectronArchitectureVisualizer()
    visualizer.generate_detailed_svg() 