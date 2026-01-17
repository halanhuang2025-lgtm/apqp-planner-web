#!/usr/bin/env python3
"""生成 APQP 计划生成器图标"""

from PIL import Image, ImageDraw, ImageFont
import subprocess
import os

def create_icon():
    # 创建 1024x1024 的图标（macOS 要求的最大尺寸）
    size = 1024
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 绘制圆角矩形背景
    padding = 80
    radius = 180

    # 渐变色背景 (蓝色到深蓝)
    for y in range(padding, size - padding):
        ratio = (y - padding) / (size - 2 * padding)
        r = int(41 + (30 - 41) * ratio)
        g = int(128 + (64 - 128) * ratio)
        b = int(185 + (145 - 185) * ratio)
        draw.line([(padding, y), (size - padding, y)], fill=(r, g, b, 255))

    # 创建圆角遮罩
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [padding, padding, size - padding, size - padding],
        radius=radius,
        fill=255
    )

    # 应用遮罩
    img.putalpha(mask)

    # 重新绘制以应用遮罩后的背景
    final = Image.new('RGBA', (size, size), (0, 0, 0, 0))

    # 绘制带渐变的圆角矩形
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    bg_draw.rounded_rectangle(
        [padding, padding, size - padding, size - padding],
        radius=radius,
        fill=(41, 128, 185, 255)
    )
    final.paste(bg, (0, 0))

    draw = ImageDraw.Draw(final)

    # 绘制 "APQP" 文字
    try:
        # 尝试使用系统字体
        font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 280)
        font_small = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 100)
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # 主标题 APQP
    text = "APQP"
    bbox = draw.textbbox((0, 0), text, font=font_large)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - 80

    # 绘制文字阴影
    draw.text((x + 4, y + 4), text, font=font_large, fill=(0, 0, 0, 80))
    # 绘制白色文字
    draw.text((x, y), text, font=font_large, fill=(255, 255, 255, 255))

    # 副标题
    subtitle = "计划生成器"
    bbox = draw.textbbox((0, 0), subtitle, font=font_small)
    text_width = bbox[2] - bbox[0]
    x = (size - text_width) // 2
    y = y + text_height + 40
    draw.text((x, y), subtitle, font=font_small, fill=(255, 255, 255, 220))

    # 保存 PNG
    icon_dir = os.path.dirname(os.path.abspath(__file__))
    png_path = os.path.join(icon_dir, 'icon.png')
    final.save(png_path, 'PNG')
    print(f"PNG 图标已保存: {png_path}")

    # 创建 iconset 目录
    iconset_path = os.path.join(icon_dir, 'AppIcon.iconset')
    os.makedirs(iconset_path, exist_ok=True)

    # 生成各种尺寸
    sizes = [16, 32, 64, 128, 256, 512, 1024]
    for s in sizes:
        resized = final.resize((s, s), Image.LANCZOS)
        resized.save(os.path.join(iconset_path, f'icon_{s}x{s}.png'))
        if s <= 512:
            resized2x = final.resize((s * 2, s * 2), Image.LANCZOS)
            resized2x.save(os.path.join(iconset_path, f'icon_{s}x{s}@2x.png'))

    # 使用 iconutil 转换为 .icns
    icns_path = os.path.join(icon_dir, 'AppIcon.icns')
    try:
        subprocess.run(['iconutil', '-c', 'icns', iconset_path, '-o', icns_path], check=True)
        print(f"ICNS 图标已保存: {icns_path}")

        # 复制到 app 的 Resources 目录
        app_resources = os.path.expanduser('~/Desktop/APQP计划生成器.app/Contents/Resources')
        os.makedirs(app_resources, exist_ok=True)
        dest_path = os.path.join(app_resources, 'AppIcon.icns')

        import shutil
        shutil.copy(icns_path, dest_path)
        print(f"图标已复制到: {dest_path}")

    except Exception as e:
        print(f"转换 ICNS 失败: {e}")

if __name__ == '__main__':
    create_icon()
