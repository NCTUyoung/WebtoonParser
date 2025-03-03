#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Electron项目分析工具 - 一键生成所有图表
"""

import os
import sys
import subprocess
import time

def check_dependencies():
    """检查依赖是否已安装"""
    try:
        import graphviz
        print("✓ graphviz 模块已安装")
        graphviz_installed = True
    except ImportError:
        print("✗ graphviz 模块未安装")
        install = input("是否安装 graphviz 模块? (y/n): ")
        if install.lower() == 'y':
            subprocess.call([sys.executable, "-m", "pip", "install", "graphviz"])
            print("✓ graphviz 模块已安装")
            graphviz_installed = True
        else:
            print("将使用简化版脚本生成HTML可视化")
            graphviz_installed = False
    
    # 检查 Graphviz 软件是否已安装
    try:
        subprocess.run(["dot", "-V"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        print("✓ Graphviz 软件已安装")
        graphviz_software_installed = True
    except (subprocess.SubprocessError, FileNotFoundError):
        print("✗ Graphviz 软件未安装")
        if graphviz_installed:
            print("将使用简化版脚本生成HTML可视化")
        graphviz_software_installed = False
    
    return graphviz_installed and graphviz_software_installed

def generate_diagrams(use_graphviz=True):
    """生成所有图表"""
    if use_graphviz:
        scripts = [
            "generate_project_svg.py",
            "analyze_electron_project.py",
            "generate_electron_architecture.py"
        ]
    else:
        scripts = [
            "generate_project_svg_simple.py"
        ]
    
    for script in scripts:
        if os.path.exists(script):
            print(f"\n正在运行 {script}...")
            start_time = time.time()
            subprocess.call([sys.executable, script])
            end_time = time.time()
            print(f"✓ {script} 运行完成，耗时 {end_time - start_time:.2f} 秒")
        else:
            print(f"✗ 找不到脚本 {script}")
    
    print("\n所有图表生成完成！")
    
    # 列出生成的文件
    output_files = []
    
    # SVG文件
    svg_files = [f for f in os.listdir('.') if f.endswith('.svg')]
    if svg_files:
        output_files.extend([(f, "SVG") for f in svg_files])
    
    # HTML文件
    html_files = [f for f in os.listdir('.') if f.endswith('.html') and f != 'index.html']
    if html_files:
        output_files.extend([(f, "HTML") for f in html_files])
    
    # JSON文件
    json_files = [f for f in os.listdir('.') if f.endswith('.json') and f != 'package.json']
    if json_files:
        output_files.extend([(f, "JSON") for f in json_files])
    
    if output_files:
        print("\n生成的文件:")
        for file_name, file_type in output_files:
            file_size = os.path.getsize(file_name) / 1024  # KB
            print(f"  - {file_name} ({file_type}, {file_size:.1f} KB)")

if __name__ == "__main__":
    print("=" * 60)
    print("Electron项目分析工具 - 一键生成所有图表")
    print("=" * 60)
    
    use_graphviz = check_dependencies()
    generate_diagrams(use_graphviz)
    
    print("\n提示: 如果您想查看HTML可视化，请在浏览器中打开 project_structure.html 文件") 