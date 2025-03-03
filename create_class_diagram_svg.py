import svgwrite
from svgwrite import cm, mm
import os

def create_class_diagram_svg():
    # 创建SVG画布
    svg_document = svgwrite.Drawing(
        filename="webtoon_parser_class_diagram.svg",
        size=("1000px", "700px"),
        debug=True
    )
    
    # 添加标题
    svg_document.add(svg_document.text(
        "Webtoon爬蟲工具類圖",
        insert=(500, 30),
        text_anchor="middle",
        font_family="Arial",
        font_size=24,
        font_weight="bold",
        fill="black"
    ))
    
    # 定义颜色
    colors = {
        "class_bg": "#E8F0FE",  # 浅蓝色背景
        "class_header": "#4285F4",  # 蓝色标题
        "class_border": "#1A73E8",  # 深蓝色边框
        "method_bg": "#F8F9FA",  # 浅灰色背景
        "arrow": "#5F6368",  # 箭头颜色
        "text": "#202124"  # 文本颜色
    }
    
    # 添加背景矩形
    svg_document.add(svg_document.rect(
        insert=(50, 80),
        size=(900, 580),
        rx=10, ry=10,
        fill="#FFFFFF",
        stroke="gray",
        stroke_width=1
    ))
    
    # 绘制类图
    
    # 1. WebScraper基类
    web_scraper_class = draw_class(
        svg_document, 
        "WebScraper", 
        ["url", "headers"],
        ["__init__(url)", "get_page_content()", "parse_content(html_content)", "save_to_csv(data, filename)"],
        (150, 120),
        (300, 200),
        colors
    )
    
    # 2. WebtoonScraper类
    webtoon_scraper_class = draw_class(
        svg_document,
        "WebtoonScraper",
        ["base_url", "title_no"],
        [
            "__init__(base_url, title_no)", 
            "get_url(page)", 
            "get_total_pages(soup)",
            "scrape_all_pages()",
            "parse_webtoon_content(soup)",
            "get_webtoon_info(soup)",
            "save_webtoon_info(info, filename)",
            "save_to_excel(webtoon_info, chapters_data, filename)"
        ],
        (150, 400),
        (300, 280),
        colors
    )
    
    # 3. WebtoonScraperGUI类
    gui_class = draw_class(
        svg_document,
        "WebtoonScraperGUI",
        [
            "root", "main_frame", "url_text", 
            "day_var", "hour_var", "minute_var",
            "timezone_var", "schedule_running",
            "progress_var", "log_text"
        ],
        [
            "__init__(root)",
            "toggle_schedule()",
            "start_schedule()",
            "stop_schedule()",
            "run_schedule()",
            "log_message(message)",
            "start_scraping()",
            "scrape_multiple_data(urls)",
            "finish_scraping()"
        ],
        (550, 120),
        (350, 350),
        colors
    )
    
    # 添加继承关系箭头 (WebScraper -> WebtoonScraper)
    draw_inheritance_arrow(
        svg_document,
        (300, 320),  # 从WebScraper底部
        (300, 400),  # 到WebtoonScraper顶部
        colors["arrow"]
    )
    
    # 添加关联关系箭头 (WebtoonScraperGUI -> WebtoonScraper)
    draw_association_arrow(
        svg_document,
        (550, 295),  # 从GUI类左侧中间
        (450, 450),  # 到WebtoonScraper类右侧中间
        colors["arrow"],
        "使用"
    )
    
    # 添加外部依赖
    dependencies = [
        {"name": "requests", "x": 100, "y": 600},
        {"name": "BeautifulSoup", "x": 250, "y": 600},
        {"name": "pandas", "x": 400, "y": 600},
        {"name": "openpyxl", "x": 550, "y": 600},
        {"name": "schedule", "x": 700, "y": 600},
        {"name": "tkinter", "x": 850, "y": 600}
    ]
    
    for dep in dependencies:
        svg_document.add(svg_document.rect(
            insert=(dep["x"] - 50, dep["y"] - 20),
            size=(100, 40),
            rx=5, ry=5,
            fill="#F1F3F4",
            stroke="#DADCE0",
            stroke_width=1
        ))
        
        svg_document.add(svg_document.text(
            dep["name"],
            insert=(dep["x"], dep["y"]),
            text_anchor="middle",
            font_family="Arial",
            font_size=12,
            fill=colors["text"]
        ))
    
    # 添加依赖关系说明
    svg_document.add(svg_document.text(
        "外部依赖库",
        insert=(100, 550),
        font_family="Arial",
        font_size=14,
        font_weight="bold",
        fill=colors["text"]
    ))
    
    # 保存SVG文件
    svg_document.save()
    print(f"SVG文件已保存为: {os.path.abspath('webtoon_parser_class_diagram.svg')}")

def draw_class(svg_document, class_name, attributes, methods, position, size, colors):
    """绘制类图中的一个类"""
    x, y = position
    width, height = size
    
    # 类边框
    class_box = svg_document.rect(
        insert=(x, y),
        size=(width, height),
        rx=5, ry=5,
        fill=colors["class_bg"],
        stroke=colors["class_border"],
        stroke_width=2
    )
    svg_document.add(class_box)
    
    # 类名标题
    header_height = 40
    header_box = svg_document.rect(
        insert=(x, y),
        size=(width, header_height),
        rx=5, ry=5,
        fill=colors["class_header"],
        stroke=colors["class_border"],
        stroke_width=2
    )
    svg_document.add(header_box)
    
    svg_document.add(svg_document.text(
        class_name,
        insert=(x + width/2, y + 25),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="white"
    ))
    
    # 属性区域
    attr_start_y = y + header_height
    attr_height = len(attributes) * 20 + 10
    attr_box = svg_document.rect(
        insert=(x, attr_start_y),
        size=(width, attr_height),
        fill=colors["class_bg"],
        stroke=colors["class_border"],
        stroke_width=1
    )
    svg_document.add(attr_box)
    
    # 添加属性文本
    for i, attr in enumerate(attributes):
        svg_document.add(svg_document.text(
            f"- {attr}",
            insert=(x + 10, attr_start_y + 25 + i*20),
            font_family="Arial",
            font_size=12,
            fill=colors["text"]
        ))
    
    # 方法区域
    method_start_y = attr_start_y + attr_height
    method_height = height - header_height - attr_height
    method_box = svg_document.rect(
        insert=(x, method_start_y),
        size=(width, method_height),
        fill=colors["method_bg"],
        stroke=colors["class_border"],
        stroke_width=1
    )
    svg_document.add(method_box)
    
    # 添加方法文本
    for i, method in enumerate(methods):
        svg_document.add(svg_document.text(
            f"+ {method}",
            insert=(x + 10, method_start_y + 25 + i*20),
            font_family="Arial",
            font_size=12,
            fill=colors["text"]
        ))
    
    return class_box

def draw_inheritance_arrow(svg_document, start, end, color):
    """绘制继承关系箭头"""
    x1, y1 = start
    x2, y2 = end
    
    # 绘制线条
    svg_document.add(svg_document.line(
        start=start,
        end=end,
        stroke=color,
        stroke_width=2
    ))
    
    # 绘制空心三角形箭头
    triangle_size = 10
    svg_document.add(svg_document.polygon(
        points=[
            (x2, y2), 
            (x2 - triangle_size, y2 - triangle_size), 
            (x2 + triangle_size, y2 - triangle_size)
        ],
        fill="white",
        stroke=color,
        stroke_width=2
    ))

def draw_association_arrow(svg_document, start, end, color, label=None):
    """绘制关联关系箭头"""
    x1, y1 = start
    x2, y2 = end
    
    # 绘制线条
    svg_document.add(svg_document.line(
        start=start,
        end=end,
        stroke=color,
        stroke_width=2,
        stroke_dasharray="5,5"
    ))
    
    # 绘制箭头
    arrow_size = 10
    svg_document.add(svg_document.polygon(
        points=[
            (x2, y2), 
            (x2 - arrow_size, y2 - arrow_size/2), 
            (x2 - arrow_size, y2 + arrow_size/2)
        ],
        fill=color
    ))
    
    # 添加标签
    if label:
        # 计算标签位置（线条中点）
        mid_x = (x1 + x2) / 2
        mid_y = (y1 + y2) / 2
        
        svg_document.add(svg_document.text(
            label,
            insert=(mid_x, mid_y - 5),
            text_anchor="middle",
            font_family="Arial",
            font_size=12,
            fill=color
        ))

if __name__ == "__main__":
    create_class_diagram_svg() 