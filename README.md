# APQP 项目计划生成器 - Web 版

基于 React + FastAPI 的新产品开发项目计划管理工具，支持自动排期计算和 Excel 甘特图导出。

## 功能特性

- 📋 **任务管理**: 添加、编辑、删除、排序任务
- 📅 **智能排期**: 支持正向排期和倒推排期，自动跳过周末和节假日
- 📊 **Excel 导出**: 生成带甘特图的项目计划 Excel 文件
- 🎯 **进度跟踪**: 记录任务实际进度，计算进度偏差
- 🚀 **高性能**: React 虚拟 DOM 渲染，编辑任务无卡顿

## 技术栈

**前端:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (状态管理)
- Axios

**后端:**
- Python 3
- FastAPI
- openpyxl (Excel 生成)

## 快速开始

### 环境要求

- Python 3.9+
- Node.js 18+

### 安装运行

```bash
# 克隆项目
git clone https://github.com/你的用户名/apqp-planner-web.git
cd apqp-planner-web

# 方式一：一键启动（macOS）
chmod +x start.command
./start.command

# 方式二：手动启动
# 后端
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py &

# 前端
cd ../frontend
npm install
npm run dev
```

### 访问地址

- 开发模式前端: http://localhost:5173
- 后端 API: http://localhost:8000

## 项目结构

```
apqp-planner-web/
├── backend/                 # Python FastAPI 后端
│   ├── main.py             # API 入口
│   ├── requirements.txt
│   ├── core/               # 核心业务模块
│   │   ├── scheduler.py    # 日期调度器
│   │   ├── excel_generator.py
│   │   ├── config.py
│   │   └── progress_manager.py
│   └── templates/
│       └── apqp_tasks.json # APQP 任务模板
│
├── frontend/               # React 前端
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── stores/
│       ├── api/
│       └── components/
│
├── start.command           # macOS 启动脚本
└── start-dev.command       # 开发模式启动
```

## API 接口

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/tasks | 获取任务列表 |
| POST | /api/tasks | 创建任务 |
| PUT | /api/tasks/{index} | 更新任务 |
| DELETE | /api/tasks/{index} | 删除任务 |
| POST | /api/schedule/forward | 正向排期 |
| POST | /api/schedule/backward | 倒推排期 |
| POST | /api/export/excel | 导出 Excel |
| GET | /api/config/template | 加载 APQP 模板 |

## 使用说明

1. **添加任务**: 点击"添加任务"按钮
2. **编辑任务**: 双击任务行打开编辑对话框
3. **排期计算**: 选择排期方式和日期，点击"刷新日期"
4. **导出 Excel**: 点击"生成 Excel"下载项目计划

## 许可证

MIT License
