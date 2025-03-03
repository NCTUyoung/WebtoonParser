import svgwrite
from svgwrite import cm, mm
import os

def create_data_flow_svg():
    # 创建SVG画布
    svg_document = svgwrite.Drawing(
        filename="webtoon_parser_data_flow.svg",
        size=("1000px", "700px"),
        debug=True
    )
    
    # 添加标题
    svg_document.add(svg_document.text(
        "Webtoon爬蟲工具數據流程圖",
        insert=(500, 30),
        text_anchor="middle",
        font_family="Arial",
        font_size=24,
        font_weight="bold",
        fill="black"
    ))
    
    # 定义颜色
    colors = {
        "input": "#4285F4",  # 蓝色
        "process": "#EA4335",  # 红色
        "output": "#34A853",  # 绿色
        "background": "#F8F9FA",  # 浅灰色背景
        "arrow": "#5F6368",  # 箭头颜色
        "text": "#202124",  # 文本颜色
        "highlight": "#FBBC05"  # 黄色高亮
    }
    
    # 添加背景矩形
    svg_document.add(svg_document.rect(
        insert=(50, 80),
        size=(900, 580),
        rx=10, ry=10,
        fill=colors["background"],
        stroke="gray",
        stroke_width=1
    ))
    
    # 绘制数据流程图
    
    # 1. 用户输入
    input_box = svg_document.rect(
        insert=(100, 120),
        size=(200, 80),
        rx=5, ry=5,
        fill=colors["input"],
        stroke="black",
        stroke_width=2,
        fill_opacity=0.7
    )
    svg_document.add(input_box)
    
    svg_document.add(svg_document.text(
        "用户输入",
        insert=(200, 145),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="white"
    ))
    
    svg_document.add(svg_document.text(
        "Webtoon URL",
        insert=(200, 170),
        text_anchor="middle",
        font_family="Arial",
        font_size=14,
        fill="white"
    ))
    
    # 2. URL解析
    url_box = svg_document.rect(
        insert=(400, 120),
        size=(200, 80),
        rx=5, ry=5,
        fill=colors["process"],
        stroke="black",
        stroke_width=2,
        fill_opacity=0.7
    )
    svg_document.add(url_box)
    
    svg_document.add(svg_document.text(
        "URL解析",
        insert=(500, 145),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="white"
    ))
    
    svg_document.add(svg_document.text(
        "提取title_no参数",
        insert=(500, 170),
        text_anchor="middle",
        font_family="Arial",
        font_size=14,
        fill="white"
    ))
    
    # 3. HTTP请求
    http_box = svg_document.rect(
        insert=(700, 120),
        size=(200, 80),
        rx=5, ry=5,
        fill=colors["process"],
        stroke="black",
        stroke_width=2,
        fill_opacity=0.7
    )
    svg_document.add(http_box)
    
    svg_document.add(svg_document.text(
        "HTTP请求",
        insert=(800, 145),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="white"
    ))
    
    svg_document.add(svg_document.text(
        "获取网页内容",
        insert=(800, 170),
        text_anchor="middle",
        font_family="Arial",
        font_size=14,
        fill="white"
    ))
    
    # 4. 内容解析
    parse_box = svg_document.rect(
        insert=(700, 250),
        size=(200, 80),
        rx=5, ry=5,
        fill=colors["process"],
        stroke="black",
        stroke_width=2,
        fill_opacity=0.7
    )
    svg_document.add(parse_box)
    
    svg_document.add(svg_document.text(
        "内容解析",
        insert=(800, 275),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="white"
    ))
    
    svg_document.add(svg_document.text(
        "BeautifulSoup解析HTML",
        insert=(800, 300),
        text_anchor="middle",
        font_family="Arial",
        font_size=14,
        fill="white"
    ))
    
    # 5. 数据提取
    extract_box = svg_document.rect(
        insert=(400, 250),
        size=(200, 80),
        rx=5, ry=5,
        fill=colors["process"],
        stroke="black",
        stroke_width=2,
        fill_opacity=0.7
    )
    svg_document.add(extract_box)
    
    svg_document.add(svg_document.text(
        "数据提取",
        insert=(500, 275),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="white"
    ))
    
    svg_document.add(svg_document.text(
        "提取漫画信息和章节列表",
        insert=(500, 300),
        text_anchor="middle",
        font_family="Arial",
        font_size=14,
        fill="white"
    ))
    
    # 6. 分页处理
    pagination_box = svg_document.rect(
        insert=(100, 250),
        size=(200, 80),
        rx=5, ry=5,
        fill=colors["process"],
        stroke="black",
        stroke_width=2,
        fill_opacity=0.7
    )
    svg_document.add(pagination_box)
    
    svg_document.add(svg_document.text(
        "分页处理",
        insert=(200, 275),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="white"
    ))
    
    svg_document.add(svg_document.text(
        "处理多页章节列表",
        insert=(200, 300),
        text_anchor="middle",
        font_family="Arial",
        font_size=14,
        fill="white"
    ))
    
    # 7. 数据整合
    combine_box = svg_document.rect(
        insert=(250, 380),
        size=(200, 80),
        rx=5, ry=5,
        fill=colors["process"],
        stroke="black",
        stroke_width=2,
        fill_opacity=0.7
    )
    svg_document.add(combine_box)
    
    svg_document.add(svg_document.text(
        "数据整合",
        insert=(350, 405),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="white"
    ))
    
    svg_document.add(svg_document.text(
        "合并所有页面数据",
        insert=(350, 430),
        text_anchor="middle",
        font_family="Arial",
        font_size=14,
        fill="white"
    ))
    
    # 8. 数据转换
    transform_box = svg_document.rect(
        insert=(550, 380),
        size=(200, 80),
        rx=5, ry=5,
        fill=colors["process"],
        stroke="black",
        stroke_width=2,
        fill_opacity=0.7
    )
    svg_document.add(transform_box)
    
    svg_document.add(svg_document.text(
        "数据转换",
        insert=(650, 405),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="white"
    ))
    
    svg_document.add(svg_document.text(
        "转换为Pandas DataFrame",
        insert=(650, 430),
        text_anchor="middle",
        font_family="Arial",
        font_size=14,
        fill="white"
    ))
    
    # 9. Excel输出
    excel_box = svg_document.rect(
        insert=(400, 510),
        size=(200, 80),
        rx=5, ry=5,
        fill=colors["output"],
        stroke="black",
        stroke_width=2,
        fill_opacity=0.7
    )
    svg_document.add(excel_box)
    
    svg_document.add(svg_document.text(
        "Excel输出",
        insert=(500, 535),
        text_anchor="middle",
        font_family="Arial",
        font_size=16,
        font_weight="bold",
        fill="white"
    ))
    
    svg_document.add(svg_document.text(
        "保存为.xlsx文件",
        insert=(500, 560),
        text_anchor="middle",
        font_family="Arial",
        font_size=14,
        fill="white"
    ))
    
    # 添加连接箭头
    
    # 用户输入到URL解析
    svg_document.add(svg_document.line(
        start=(300, 160),
        end=(400, 160),
        stroke=colors["arrow"],
        stroke_width=3
    ))
    svg_document.add(svg_document.polygon(
        points=[(400, 160), (390, 155), (390, 165)],
        fill=colors["arrow"]
    ))
    
    # URL解析到HTTP请求
    svg_document.add(svg_document.line(
        start=(600, 160),
        end=(700, 160),
        stroke=colors["arrow"],
        stroke_width=3
    ))
    svg_document.add(svg_document.polygon(
        points=[(700, 160), (690, 155), (690, 165)],
        fill=colors["arrow"]
    ))
    
    # HTTP请求到内容解析
    svg_document.add(svg_document.line(
        start=(800, 200),
        end=(800, 250),
        stroke=colors["arrow"],
        stroke_width=3
    ))
    svg_document.add(svg_document.polygon(
        points=[(800, 250), (795, 240), (805, 240)],
        fill=colors["arrow"]
    ))
    
    # 内容解析到数据提取
    svg_document.add(svg_document.line(
        start=(700, 290),
        end=(600, 290),
        stroke=colors["arrow"],
        stroke_width=3
    ))
    svg_document.add(svg_document.polygon(
        points=[(600, 290), (610, 285), (610, 295)],
        fill=colors["arrow"]
    ))
    
    # 数据提取到分页处理
    svg_document.add(svg_document.line(
        start=(400, 290),
        end=(300, 290),
        stroke=colors["arrow"],
        stroke_width=3
    ))
    svg_document.add(svg_document.polygon(
        points=[(300, 290), (310, 285), (310, 295)],
        fill=colors["arrow"]
    ))
    
    # 分页处理到数据整合
    svg_document.add(svg_document.line(
        start=(200, 330),
        end=(250, 380),
        stroke=colors["arrow"],
        stroke_width=3
    ))
    svg_document.add(svg_document.polygon(
        points=[(250, 380), (242, 372), (252, 370)],
        fill=colors["arrow"]
    ))
    
    # 数据提取到数据整合
    svg_document.add(svg_document.line(
        start=(450, 330),
        end=(350, 380),
        stroke=colors["arrow"],
        stroke_width=3
    ))
    svg_document.add(svg_document.polygon(
        points=[(350, 380), (355, 370), (360, 380)],
        fill=colors["arrow"]
    ))
    
    # 数据整合到数据转换
    svg_document.add(svg_document.line(
        start=(450, 420),
        end=(550, 420),
        stroke=colors["arrow"],
        stroke_width=3
    ))
    svg_document.add(svg_document.polygon(
        points=[(550, 420), (540, 415), (540, 425)],
        fill=colors["arrow"]
    ))
    
    # 数据转换到Excel输出
    svg_document.add(svg_document.line(
        start=(650, 460),
        end=(550, 510),
        stroke=colors["arrow"],
        stroke_width=3
    ))
    svg_document.add(svg_document.polygon(
        points=[(550, 510), (555, 500), (560, 510)],
        fill=colors["arrow"]
    ))
    
    # 添加数据类型标签
    data_types = [
        {"text": "URL字符串", "x": 350, "y": 140},
        {"text": "title_no参数", "x": 650, "y": 140},
        {"text": "HTML内容", "x": 850, "y": 225},
        {"text": "BeautifulSoup对象", "x": 650, "y": 265},
        {"text": "漫画信息字典", "x": 350, "y": 265},
        {"text": "章节列表数组", "x": 150, "y": 330},
        {"text": "合并数据字典", "x": 500, "y": 400},
        {"text": "DataFrame对象", "x": 750, "y": 400},
        {"text": "Excel文件", "x": 500, "y": 585}
    ]
    
    for dt in data_types:
        svg_document.add(svg_document.text(
            dt["text"],
            insert=(dt["x"], dt["y"]),
            font_family="Arial",
            font_size=10,
            fill=colors["highlight"],
            font_weight="bold"
        ))
    
    # 保存SVG文件
    svg_document.save()
    print(f"SVG文件已保存为: {os.path.abspath('webtoon_parser_data_flow.svg')}")

if __name__ == "__main__":
    create_data_flow_svg() 