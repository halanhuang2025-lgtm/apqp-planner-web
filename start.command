#!/bin/bash
# APQP 项目计划生成器 - 一键启动脚本 (macOS)

cd "$(dirname "$0")"

echo "=================================================="
echo "  APQP 项目计划生成器 - Web 版"
echo "  正在启动..."
echo "=================================================="

# 检查 Python 环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 Python3，请先安装"
    exit 1
fi

# 进入后端目录
cd backend

# 首次运行时创建虚拟环境并安装依赖
if [ ! -d "venv" ]; then
    echo ""
    echo "📦 首次运行，正在安装依赖..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    echo "✅ 依赖安装完成"
else
    source venv/bin/activate
fi

echo ""
echo "🚀 正在启动服务器..."
echo "   访问地址: http://localhost:8080"
echo ""
echo "   按 Ctrl+C 停止服务器"
echo "=================================================="

python main.py
