import os
import re
import graphviz

class ElectronArchitectureVisualizer:
    def __init__(self, root_dir='src'):
        self.root_dir = root_dir
        self.main_files = []
        self.renderer_files = []
        self.preload_files = []
        self.ipc_channels = []
        
    def scan_directory(self):
        """扫描目录结构，收集文件信息"""
        # 扫描主进程文件
        main_dir = os.path.join(self.root_dir, 'main')
        if os.path.exists(main_dir):
            for file in os.listdir(main_dir):
                if file.endswith(('.js', '.ts')):
                    self.main_files.append(file)
                    
        # 扫描渲染进程文件
        renderer_dir = os.path.join(self.root_dir, 'renderer')
        if os.path.exists(renderer_dir):
            for root, _, files in os.walk(renderer_dir):
                for file in files:
                    if file.endswith(('.js', '.ts', '.vue')):
                        rel_path = os.path.relpath(os.path.join(root, file), renderer_dir)
                        self.renderer_files.append(rel_path)
                        
        # 扫描预加载脚本
        preload_dir = os.path.join(self.root_dir, 'preload')
        if os.path.exists(preload_dir):
            for file in os.listdir(preload_dir):
                if file.endswith(('.js', '.ts')):
                    self.preload_files.append(file)
    
    def analyze_ipc_channels(self):
        """分析IPC通信通道"""
        # 这里简化处理，实际项目中可以通过读取文件内容来分析
        # 主进程到渲染进程的通信
        self.ipc_channels.append({
            'from': 'main',
            'to': 'renderer',
            'description': 'IPC通信 (ipcMain.send)'
        })
        
        # 渲染进程到主进程的通信
        self.ipc_channels.append({
            'from': 'renderer',
            'to': 'main',
            'description': 'IPC通信 (ipcRenderer.invoke)'
        })
        
        # 通过预加载脚本的通信
        self.ipc_channels.append({
            'from': 'preload',
            'to': 'renderer',
            'description': 'contextBridge API'
        })
        
        self.ipc_channels.append({
            'from': 'main',
            'to': 'preload',
            'description': 'Node.js API'
        })
    
    def generate_architecture_svg(self, output_file='electron_architecture.svg'):
        """生成Electron架构SVG图"""
        # 扫描目录和分析IPC通道
        self.scan_directory()
        self.analyze_ipc_channels()
        
        # 创建有向图
        dot = graphviz.Digraph(
            'electron_architecture', 
            comment='Electron应用架构',
            format='svg',
            engine='dot'
        )
        
        # 设置图形属性
        dot.attr(rankdir='LR', size='10,6', dpi='300')
        dot.attr('node', fontname='Arial', fontsize='14')
        dot.attr('edge', fontname='Arial', fontsize='12')
        
        # 创建主要进程节点
        with dot.subgraph(name='cluster_main') as main:
            main.attr(label='Main Process (主进程)', style='filled', color='lightyellow', fontsize='16')
            
            # 添加主进程文件
            main.node('main_process', f'主进程文件 ({len(self.main_files)}个)\n' + '\n'.join(self.main_files[:3]) + 
                     (f'\n... 等{len(self.main_files)-3}个文件' if len(self.main_files) > 3 else ''),
                     shape='box', style='filled', color='#F7DF1E')
            
            # 添加Node.js API节点
            main.node('node_apis', 'Node.js APIs\n(fs, path, etc.)', shape='ellipse', style='filled', color='#68A063')
            
            # 添加Electron API节点
            main.node('electron_apis_main', 'Electron APIs\n(app, BrowserWindow, etc.)', shape='ellipse', style='filled', color='#47848F')
            
            # 添加连接
            main.edge('main_process', 'node_apis')
            main.edge('main_process', 'electron_apis_main')
        
        # 创建渲染进程节点
        with dot.subgraph(name='cluster_renderer') as renderer:
            renderer.attr(label='Renderer Process (渲染进程)', style='filled', color='lightgreen', fontsize='16')
            
            # 添加渲染进程文件
            renderer.node('renderer_process', f'渲染进程文件 ({len(self.renderer_files)}个)\n' + 
                         '\n'.join([os.path.basename(f) for f in self.renderer_files[:3]]) + 
                         (f'\n... 等{len(self.renderer_files)-3}个文件' if len(self.renderer_files) > 3 else ''),
                         shape='box', style='filled', color='#41B883')
            
            # 添加Web API节点
            renderer.node('web_apis', 'Web APIs\n(DOM, fetch, etc.)', shape='ellipse', style='filled', color='#E34F26')
            
            # 添加Electron API节点
            renderer.node('electron_apis_renderer', 'Electron APIs\n(通过contextBridge暴露)', shape='ellipse', style='filled', color='#47848F')
            
            # 添加连接
            renderer.edge('renderer_process', 'web_apis')
            renderer.edge('electron_apis_renderer', 'renderer_process')
        
        # 创建预加载脚本节点
        with dot.subgraph(name='cluster_preload') as preload:
            preload.attr(label='Preload Scripts (预加载脚本)', style='filled', color='lightblue', fontsize='16')
            
            # 添加预加载脚本文件
            preload.node('preload_scripts', f'预加载脚本 ({len(self.preload_files)}个)\n' + '\n'.join(self.preload_files),
                        shape='box', style='filled', color='#3178C6')
            
            # 添加contextBridge节点
            preload.node('context_bridge', 'contextBridge', shape='ellipse', style='filled', color='#47848F')
            
            # 添加连接
            preload.edge('preload_scripts', 'context_bridge')
        
        # 添加进程间通信
        for channel in self.ipc_channels:
            from_node = f"{channel['from']}_process" if channel['from'] != 'preload' else 'preload_scripts'
            to_node = f"{channel['to']}_process" if channel['to'] != 'preload' else 'preload_scripts'
            
            if channel['from'] == 'main' and channel['to'] == 'preload':
                from_node = 'node_apis'
                to_node = 'preload_scripts'
            elif channel['from'] == 'preload' and channel['to'] == 'renderer':
                from_node = 'context_bridge'
                to_node = 'electron_apis_renderer'
                
            dot.edge(from_node, to_node, label=channel['description'], color='red')
        
        # 添加说明
        with dot.subgraph(name='cluster_legend') as legend:
            legend.attr(label='Electron架构说明', style='filled', color='lightgrey', fontsize='14')
            legend.node('legend_main', '主进程: Node.js环境', shape='box', style='filled', color='#F7DF1E')
            legend.node('legend_renderer', '渲染进程: Chromium环境', shape='box', style='filled', color='#41B883')
            legend.node('legend_preload', '预加载脚本: 两者之间的桥梁', shape='box', style='filled', color='#3178C6')
            legend.node('legend_security', '安全边界', shape='ellipse', style='filled', color='#FF6B6B')
            
            legend.edge('legend_main', 'legend_preload', color='red')
            legend.edge('legend_preload', 'legend_renderer', color='red')
            legend.edge('legend_security', 'legend_security', style='invis')
        
        # 渲染并保存图形
        dot.render(filename='electron_architecture', format='svg', cleanup=True)
        print(f"Electron架构SVG已生成: {output_file}")

if __name__ == "__main__":
    visualizer = ElectronArchitectureVisualizer()
    visualizer.generate_architecture_svg() 