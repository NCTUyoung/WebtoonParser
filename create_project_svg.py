import svgwrite
from svgwrite import cm, mm
import os

def create_webtoon_parser_svg():
    # 创建SVG画布
    svg_document = svgwrite.Drawing(
        filename="webtoon_parser_architecture.svg",
        size=("1000px", "800px"),
        debug=True
    )
    
    # 添加标题
    svg_document.add(svg_document.text(
        "Webtoon爬蟲工具架構圖",
        insert=(500, 30),
        text_anchor="middle",
        font_family="Arial",
        font_size=24,
        font_weight="bold",
        fill="black"
    ))
    
    # 添加版本信息
    svg_document.add(svg_document.text(
        "v1.0.0",
        insert=(500, 60),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        fill="gray"
    ))
    
    # 定义颜色
    colors = {
        "gui": "#4285F4",  # 蓝色
        "scraper": "#EA4335",  # 红色
        "template": "#FBBC05",  # 黄色
        "data": "#34A853",  # 绿色
        "background": "#F8F9FA",  # 浅灰色背景
        "arrow": "#5F6368",  # 箭头颜色
        "text": "#202124"  # 文本颜色
    }
    
    # 添加背景矩形
    svg_document.add(svg_document.rect(
        insert=(50, 80),
        size=(900, 680),
        rx=10, ry=10,
        fill=colors["background"],
        stroke="gray",
        stroke_width=1
    ))
    
    # 绘制组件框
    
    # 1. GUI组件
    gui_box = svg_document.rect(
        insert=(150, 120),
        size=(300, 150),
        rx=5, ry=5,
        fill=colors["gui"],
        stroke="black",
        stroke_width=2,
        fill_opacity=0.7
    )
    svg_document.add(gui_box)
    
    svg_document.add(svg_document.text(
        "GUI界面 (webtoon_gui.py)",
        insert=(300, 145),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="white"
    ))
    
    # GUI功能列表
    gui_features = [
        "- 用户输入URL",
        "- 定时设置",
        "- 进度显示",
        "- 日志记录",
        "- 多时区支持"
    ]
    
    for i, feature in enumerate(gui_features):
        svg_document.add(svg_document.text(
            feature,
            insert=(170, 175 + i*20),
            font_family="Arial",
            font_size=14,
            fill="white"
        ))
    
    # 2. 爬虫组件
    scraper_box = svg_document.rect(
        insert=(550, 120),
        size=(300, 150),
        rx=5, ry=5,
        fill=colors["scraper"],
        stroke="black",
        stroke_width=2,
        fill_opacity=0.7
    )
    svg_document.add(scraper_box)
    
    svg_document.add(svg_document.text(
        "爬虫核心 (webtoon_scraper.py)",
        insert=(700, 145),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="white"
    ))
    
    # 爬虫功能列表
    scraper_features = [
        "- 解析网页内容",
        "- 提取漫画信息",
        "- 获取章节列表",
        "- 处理分页",
        "- 保存数据到Excel"
    ]
    
    for i, feature in enumerate(scraper_features):
        svg_document.add(svg_document.text(
            feature,
            insert=(570, 175 + i*20),
            font_family="Arial",
            font_size=14,
            fill="white"
        ))
    
    # 3. 基础模板
    template_box = svg_document.rect(
        insert=(350, 350),
        size=(300, 120),
        rx=5, ry=5,
        fill=colors["template"],
        stroke="black",
        stroke_width=2,
        fill_opacity=0.7
    )
    svg_document.add(template_box)
    
    svg_document.add(svg_document.text(
        "爬虫模板 (web_scraper_template.py)",
        insert=(500, 375),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="black"
    ))
    
    # 模板功能列表
    template_features = [
        "- HTTP请求处理",
        "- 网页内容解析",
        "- 错误处理",
        "- 日志记录"
    ]
    
    for i, feature in enumerate(template_features):
        svg_document.add(svg_document.text(
            feature,
            insert=(370, 405 + i*20),
            font_family="Arial",
            font_size=14,
            fill="black"
        ))
    
    # 4. 数据输出
    data_box = svg_document.rect(
        insert=(350, 550),
        size=(300, 120),
        rx=5, ry=5,
        fill=colors["data"],
        stroke="black",
        stroke_width=2,
        fill_opacity=0.7
    )
    svg_document.add(data_box)
    
    svg_document.add(svg_document.text(
        "数据输出",
        insert=(500, 575),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="white"
    ))
    
    # 数据输出列表
    data_features = [
        "- Excel文件 (.xlsx)",
        "- 漫画基本信息",
        "- 章节列表",
        "- 发布日期",
        "- 点赞数据"
    ]
    
    for i, feature in enumerate(data_features):
        svg_document.add(svg_document.text(
            feature,
            insert=(370, 605 + i*20),
            font_family="Arial",
            font_size=14,
            fill="white"
        ))
    
    # 添加连接箭头
    
    # GUI到爬虫的箭头
    svg_document.add(svg_document.line(
        start=(450, 195),
        end=(550, 195),
        stroke=colors["arrow"],
        stroke_width=3,
        stroke_dasharray="5,5"
    ))
    svg_document.add(svg_document.polygon(
        points=[(550, 195), (540, 190), (540, 200)],
        fill=colors["arrow"]
    ))
    svg_document.add(svg_document.text(
        "调用",
        insert=(500, 185),
        text_anchor="middle",
        font_family="Arial",
        font_size=12,
        fill=colors["text"]
    ))
    
    # 爬虫到模板的箭头
    svg_document.add(svg_document.line(
        start=(500, 270),
        end=(500, 350),
        stroke=colors["arrow"],
        stroke_width=3,
        stroke_dasharray="5,5"
    ))
    svg_document.add(svg_document.polygon(
        points=[(500, 350), (495, 340), (505, 340)],
        fill=colors["arrow"]
    ))
    svg_document.add(svg_document.text(
        "继承",
        insert=(515, 310),
        font_family="Arial",
        font_size=12,
        fill=colors["text"]
    ))
    
    # 爬虫到数据的箭头
    svg_document.add(svg_document.line(
        start=(700, 270),
        end=(600, 550),
        stroke=colors["arrow"],
        stroke_width=3,
        stroke_dasharray="5,5"
    ))
    svg_document.add(svg_document.polygon(
        points=[(600, 550), (595, 540), (605, 545)],
        fill=colors["arrow"]
    ))
    svg_document.add(svg_document.text(
        "生成",
        insert=(650, 400),
        font_family="Arial",
        font_size=12,
        fill=colors["text"]
    ))
    
    # 添加依赖库信息
    svg_document.add(svg_document.text(
        "依赖库:",
        insert=(100, 700),
        font_family="Arial",
        font_size=14,
        font_weight="bold",
        fill=colors["text"]
    ))
    
    dependencies = [
        "requests", "beautifulsoup4", "pandas", 
        "openpyxl", "schedule", "pytz"
    ]
    
    for i, dep in enumerate(dependencies):
        svg_document.add(svg_document.text(
            dep,
            insert=(100 + i*150, 730),
            font_family="Arial",
            font_size=12,
            fill=colors["text"]
        ))
    
    # 添加工作流程
    svg_document.add(svg_document.text(
        "工作流程:",
        insert=(100, 650),
        font_family="Arial",
        font_size=14,
        font_weight="bold",
        fill=colors["text"]
    ))
    
    workflow = [
        "1. 用户输入URL",
        "2. 爬虫解析网页",
        "3. 提取漫画信息",
        "4. 保存到Excel"
    ]
    
    for i, step in enumerate(workflow):
        svg_document.add(svg_document.text(
            step,
            insert=(100, 670 + i*20),
            font_family="Arial",
            font_size=12,
            fill=colors["text"]
        ))
    
    # 保存SVG文件
    svg_document.save()
    print(f"SVG文件已保存为: {os.path.abspath('webtoon_parser_architecture.svg')}")

if __name__ == "__main__":
    create_webtoon_parser_svg() 