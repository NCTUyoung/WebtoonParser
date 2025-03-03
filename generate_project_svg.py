import os
import graphviz

def generate_project_svg(root_dir='src', output_file='project_structure.svg'):
    """
    生成项目结构的SVG图
    
    Args:
        root_dir: 项目根目录
        output_file: 输出的SVG文件名
    """
    # 创建一个有向图
    dot = graphviz.Digraph(
        'project_structure', 
        comment='Electron项目结构',
        format='svg',
        engine='dot'
    )
    
    # 设置图形属性
    dot.attr(rankdir='LR', size='12,8', dpi='300')
    dot.attr('node', shape='box', style='filled', color='lightblue', fontname='Arial', fontsize='12')
    dot.attr('edge', color='gray')
    
    # 添加根节点
    dot.node('root', 'src', shape='folder', color='lightgreen')
    
    # 跟踪已添加的节点
    added_nodes = set(['root'])
    
    # 遍历目录结构
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # 创建当前目录的节点ID
        current_path = dirpath.replace('\\', '/')
        current_id = current_path.replace('/', '_')
        
        # 如果不是根目录，添加目录节点
        if current_path != root_dir:
            parent_path = os.path.dirname(current_path).replace('\\', '/')
            parent_id = parent_path.replace('/', '_')
            
            # 如果节点尚未添加，则添加
            if current_id not in added_nodes:
                dir_name = os.path.basename(current_path)
                dot.node(current_id, dir_name, shape='folder', color='lightblue')
                added_nodes.add(current_id)
                
                # 添加与父目录的连接
                if parent_id in added_nodes:
                    dot.edge(parent_id, current_id)
                else:
                    # 如果父节点不存在，连接到根节点
                    dot.edge('root', current_id)
        
        # 添加文件节点
        for filename in filenames:
            file_path = os.path.join(current_path, filename)
            file_id = file_path.replace('\\', '/').replace('/', '_')
            
            # 根据文件类型设置不同的颜色
            file_color = 'white'
            if filename.endswith('.js'):
                file_color = '#F7DF1E'  # JavaScript 黄色
            elif filename.endswith('.vue'):
                file_color = '#41B883'  # Vue 绿色
            elif filename.endswith('.ts') or filename.endswith('.d.ts'):
                file_color = '#3178C6'  # TypeScript 蓝色
            elif filename.endswith('.scss') or filename.endswith('.css'):
                file_color = '#CC6699'  # SCSS/CSS 粉色
            elif filename.endswith('.html'):
                file_color = '#E34F26'  # HTML 橙色
            
            # 添加文件节点
            dot.node(file_id, filename, shape='note', color=file_color)
            added_nodes.add(file_id)
            
            # 添加与目录的连接
            if current_path == root_dir:
                dot.edge('root', file_id)
            else:
                dot.edge(current_id, file_id)
    
    # 添加Electron架构说明
    with dot.subgraph(name='cluster_legend') as c:
        c.attr(label='Electron架构说明', style='filled', color='lightgrey')
        c.node('main_process', 'Main Process\n(主进程)', shape='box', color='#F7DF1E')
        c.node('renderer_process', 'Renderer Process\n(渲染进程)', shape='box', color='#41B883')
        c.node('preload_scripts', 'Preload Scripts\n(预加载脚本)', shape='box', color='#3178C6')
        c.edge('main_process', 'renderer_process', label='IPC通信')
        c.edge('main_process', 'preload_scripts')
        c.edge('preload_scripts', 'renderer_process')
    
    # 渲染并保存图形
    dot.render(filename='project_structure', format='svg', cleanup=True)
    print(f"项目结构SVG已生成: {output_file}")

if __name__ == "__main__":
    generate_project_svg() 