import os
import re
import json
import graphviz
from collections import defaultdict

class ElectronProjectAnalyzer:
    def __init__(self, root_dir='src'):
        self.root_dir = root_dir
        self.file_contents = {}
        self.dependencies = defaultdict(list)
        self.components = defaultdict(list)
        self.ipc_channels = []
        
    def read_file_content(self, file_path):
        """读取文件内容"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"无法读取文件 {file_path}: {e}")
            return ""
            
    def analyze_files(self):
        """分析项目中的所有文件"""
        for dirpath, _, filenames in os.walk(self.root_dir):
            for filename in filenames:
                if filename.endswith(('.js', '.ts', '.vue', '.html')):
                    file_path = os.path.join(dirpath, filename)
                    rel_path = os.path.relpath(file_path, start=os.path.dirname(self.root_dir))
                    content = self.read_file_content(file_path)
                    self.file_contents[rel_path] = content
                    
                    # 分析文件类型和依赖关系
                    if dirpath.endswith('main'):
                        self.analyze_main_process(rel_path, content)
                    elif dirpath.endswith('renderer'):
                        self.analyze_renderer_process(rel_path, content)
                    elif dirpath.endswith('preload'):
                        self.analyze_preload_script(rel_path, content)
    
    def analyze_main_process(self, file_path, content):
        """分析主进程文件"""
        # 查找IPC通信
        ipc_handlers = re.findall(r'ipcMain\.(?:on|handle)\([\'"]([^\'"]+)[\'"]', content)
        for channel in ipc_handlers:
            self.ipc_channels.append({
                'channel': channel,
                'type': 'receive',
                'file': file_path,
                'process': 'main'
            })
            
        # 查找窗口创建
        window_creation = re.findall(r'new BrowserWindow\(', content)
        if window_creation:
            self.components['windows'].append({
                'file': file_path,
                'count': len(window_creation)
            })
            
        # 查找导入模块
        imports = re.findall(r'(?:require|import)\s+[\'"]([^\'"]+)[\'"]', content)
        for imp in imports:
            self.dependencies[file_path].append(imp)
    
    def analyze_renderer_process(self, file_path, content):
        """分析渲染进程文件"""
        # 查找Vue组件
        if file_path.endswith('.vue'):
            component_name = os.path.basename(file_path).replace('.vue', '')
            self.components['vue_components'].append({
                'name': component_name,
                'file': file_path
            })
            
            # 查找IPC通信
            ipc_sends = re.findall(r'ipcRenderer\.(?:send|invoke)\([\'"]([^\'"]+)[\'"]', content)
            for channel in ipc_sends:
                self.ipc_channels.append({
                    'channel': channel,
                    'type': 'send',
                    'file': file_path,
                    'process': 'renderer'
                })
                
        # 查找导入模块
        imports = re.findall(r'(?:require|import)\s+[\'"]([^\'"]+)[\'"]', content)
        for imp in imports:
            self.dependencies[file_path].append(imp)
    
    def analyze_preload_script(self, file_path, content):
        """分析预加载脚本"""
        # 查找暴露给渲染进程的API
        exposed_apis = re.findall(r'contextBridge\.exposeInMainWorld\([\'"]([^\'"]+)[\'"]', content)
        for api in exposed_apis:
            self.components['exposed_apis'].append({
                'name': api,
                'file': file_path
            })
            
        # 查找IPC通信
        ipc_handlers = re.findall(r'ipcRenderer\.(?:on|once)\([\'"]([^\'"]+)[\'"]', content)
        for channel in ipc_handlers:
            self.ipc_channels.append({
                'channel': channel,
                'type': 'listen',
                'file': file_path,
                'process': 'preload'
            })
            
        # 查找导入模块
        imports = re.findall(r'(?:require|import)\s+[\'"]([^\'"]+)[\'"]', content)
        for imp in imports:
            self.dependencies[file_path].append(imp)
    
    def generate_project_svg(self, output_file='electron_project_analysis.svg'):
        """生成项目分析的SVG图"""
        # 创建一个有向图
        dot = graphviz.Digraph(
            'electron_project', 
            comment='Electron项目分析',
            format='svg',
            engine='dot'
        )
        
        # 设置图形属性
        dot.attr(rankdir='TB', size='12,12', dpi='300')
        dot.attr('node', shape='box', style='filled', fontname='Arial', fontsize='12')
        dot.attr('edge', color='gray')
        
        # 创建主要进程子图
        with dot.subgraph(name='cluster_main') as main:
            main.attr(label='Main Process (主进程)', style='filled', color='lightyellow')
            
            # 添加主进程文件
            for dirpath, _, filenames in os.walk(os.path.join(self.root_dir, 'main')):
                for filename in filenames:
                    file_path = os.path.join(dirpath, filename)
                    rel_path = os.path.relpath(file_path, start=os.path.dirname(self.root_dir))
                    node_id = rel_path.replace('\\', '/').replace('/', '_')
                    main.node(node_id, filename, color='#F7DF1E')
        
        # 创建渲染进程子图
        with dot.subgraph(name='cluster_renderer') as renderer:
            renderer.attr(label='Renderer Process (渲染进程)', style='filled', color='lightgreen')
            
            # 添加渲染进程文件
            for dirpath, _, filenames in os.walk(os.path.join(self.root_dir, 'renderer')):
                for filename in filenames:
                    if filename.endswith(('.js', '.ts', '.vue', '.html')):
                        file_path = os.path.join(dirpath, filename)
                        rel_path = os.path.relpath(file_path, start=os.path.dirname(self.root_dir))
                        node_id = rel_path.replace('\\', '/').replace('/', '_')
                        
                        # 根据文件类型设置不同的颜色
                        file_color = '#41B883'  # 默认Vue绿色
                        if filename.endswith('.js'):
                            file_color = '#F7DF1E'  # JavaScript 黄色
                        elif filename.endswith('.ts') or filename.endswith('.d.ts'):
                            file_color = '#3178C6'  # TypeScript 蓝色
                        elif filename.endswith('.html'):
                            file_color = '#E34F26'  # HTML 橙色
                            
                        renderer.node(node_id, filename, color=file_color)
        
        # 创建预加载脚本子图
        with dot.subgraph(name='cluster_preload') as preload:
            preload.attr(label='Preload Scripts (预加载脚本)', style='filled', color='lightblue')
            
            # 添加预加载脚本文件
            for dirpath, _, filenames in os.walk(os.path.join(self.root_dir, 'preload')):
                for filename in filenames:
                    file_path = os.path.join(dirpath, filename)
                    rel_path = os.path.relpath(file_path, start=os.path.dirname(self.root_dir))
                    node_id = rel_path.replace('\\', '/').replace('/', '_')
                    preload.node(node_id, filename, color='#3178C6')
        
        # 添加IPC通信连接
        ipc_edges = set()
        for channel in self.ipc_channels:
            if channel['process'] == 'main' and channel['type'] == 'receive':
                # 查找对应的发送方
                for sender in self.ipc_channels:
                    if sender['channel'] == channel['channel'] and sender['type'] == 'send':
                        sender_id = sender['file'].replace('\\', '/').replace('/', '_')
                        receiver_id = channel['file'].replace('\\', '/').replace('/', '_')
                        edge_key = f"{sender_id}_{receiver_id}_{channel['channel']}"
                        if edge_key not in ipc_edges:
                            dot.edge(sender_id, receiver_id, label=f"IPC: {channel['channel']}", color='red')
                            ipc_edges.add(edge_key)
        
        # 添加组件依赖关系
        for file_path, imports in self.dependencies.items():
            file_id = file_path.replace('\\', '/').replace('/', '_')
            for imp in imports:
                # 只处理内部依赖
                if imp.startswith('.'):
                    # 尝试解析相对路径
                    base_dir = os.path.dirname(file_path)
                    if imp.endswith('.js') or imp.endswith('.ts') or imp.endswith('.vue'):
                        target_path = os.path.normpath(os.path.join(base_dir, imp))
                    else:
                        # 尝试添加扩展名
                        for ext in ['.js', '.ts', '.vue']:
                            if os.path.exists(os.path.join(os.path.dirname(self.root_dir), base_dir, imp + ext)):
                                target_path = os.path.normpath(os.path.join(base_dir, imp + ext))
                                break
                        else:
                            continue
                    
                    target_id = target_path.replace('\\', '/').replace('/', '_')
                    dot.edge(file_id, target_id, style='dashed')
        
        # 渲染并保存图形
        dot.render(filename='electron_project_analysis', format='svg', cleanup=True)
        print(f"Electron项目分析SVG已生成: {output_file}")
        
        # 保存分析结果为JSON
        analysis_result = {
            'components': dict(self.components),
            'ipc_channels': self.ipc_channels,
            'dependencies': dict(self.dependencies)
        }
        
        with open('electron_project_analysis.json', 'w', encoding='utf-8') as f:
            json.dump(analysis_result, f, ensure_ascii=False, indent=2)
        print("Electron项目分析JSON已生成: electron_project_analysis.json")

if __name__ == "__main__":
    analyzer = ElectronProjectAnalyzer()
    analyzer.analyze_files()
    analyzer.generate_project_svg() 