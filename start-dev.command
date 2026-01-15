#!/bin/bash
# APQP 项目计划生成器 - 开发模式启动脚本

cd "$(dirname "$0")"

echo "=================================================="
echo "  APQP 项目计划生成器 - 开发模式"
echo "=================================================="

# 启动后端
cd backend
if [ ! -d "venv" ]; then
    echo "📦 创建后端虚拟环境..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

echo "🚀 启动后端服务器 (端口 8000)..."
python main.py &
BACKEND_PID=$!

cd ../frontend

# 启动前端
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

echo "🚀 启动前端开发服务器 (端口 5173)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=================================================="
echo "  后端: http://localhost:8000"
echo "  前端: http://localhost:5173"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo "=================================================="

# 捕获退出信号
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

# 等待
wait
