"""创建 APQP 项目计划生成器图标"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon():
    # 创建 1024x1024 的图标（macOS 最大尺寸）
    size = 1024
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 背景 - 圆角矩形（蓝色渐变效果）
    margin = 80
    radius = 180
    
    # 绘制背景
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill='#2563EB'  # 蓝色
    )
    
    # 绘制甘特图条纹
    bar_colors = ['#60A5FA', '#34D399', '#FBBF24', '#F87171']
    bar_height = 80
    bar_margin = 30
    start_y = 280
    
    for i, color in enumerate(bar_colors):
        y = start_y + i * (bar_height + bar_margin)
        # 不同长度的条纹
        lengths = [0.9, 0.7, 0.85, 0.6]
        bar_width = int((size - margin * 2 - 160) * lengths[i])
        x_start = margin + 80
        
        draw.rounded_rectangle(
            [x_start, y, x_start + bar_width, y + bar_height],
            radius=20,
            fill=color
        )
    
    # 添加 "APQP" 文字
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 160)
    except:
        font = ImageFont.load_default()
    
    text = "APQP"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = (size - text_width) // 2
    text_y = size - margin - 220
    
    draw.text((text_x, text_y), text, fill='white', font=font)
    
    # 保存为 PNG
    img.save('assets/icon.png', 'PNG')
    print(f"✅ 已创建 assets/icon.png ({size}x{size})")
    
    return img

if __name__ == '__main__':
    create_icon()
