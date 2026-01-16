"""
APQP 项目计划生成器 - Web 版后端
FastAPI 服务入口
"""

import os
import sys
import webbrowser
import threading
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn

# 添加 core 模块路径
sys.path.insert(0, str(Path(__file__).parent))

from core import (
    Task, TaskStatus, Scheduler,
    ConfigManager, load_template_tasks,
    ProgressManager, ExcelGenerator
)

# ============ 应用初始化 ============

app = FastAPI(
    title="APQP 项目计划生成器",
    description="新产品开发项目计划管理工具 - Web 版",
    version="2.0.0"
)

# CORS 配置（开发模式允许前端开发服务器访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite 开发服务器
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ 全局状态（单用户本地模式） ============

class AppState:
    """应用状态"""
    def __init__(self):
        self.tasks: List[Task] = []
        self.progress_manager = ProgressManager()
        self.config_manager = ConfigManager()

app_state = AppState()


# ============ Pydantic 模型 ============

class TaskModel(BaseModel):
    """任务模型"""
    milestone: str
    task_no: str
    name: str
    duration: int
    owner: str
    predecessor: str = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    actual_start: Optional[str] = None
    actual_end: Optional[str] = None
    manual_start: bool = False
    manual_end: bool = False
    excluded: bool = False
    progress: int = 0
    status: str = "未开始"

    class Config:
        from_attributes = True

class TaskResponse(TaskModel):
    """任务响应（带索引）"""
    index: int

class ScheduleRequest(BaseModel):
    """排期请求"""
    date: str  # ISO 格式: YYYY-MM-DD
    exclude_weekends: bool = True
    exclude_holidays: bool = False


# ============ 工具函数 ============

def task_to_model(task: Task, index: int) -> dict:
    """将 Task 对象转换为响应字典"""
    return {
        "index": index,
        "milestone": task.milestone,
        "task_no": task.task_no,
        "name": task.name,
        "duration": task.duration,
        "owner": task.owner,
        "predecessor": task.predecessor,
        "start_date": task.start_date.strftime("%Y-%m-%d") if task.start_date else None,
        "end_date": task.end_date.strftime("%Y-%m-%d") if task.end_date else None,
        "actual_start": task.actual_start.strftime("%Y-%m-%d") if task.actual_start else None,
        "actual_end": task.actual_end.strftime("%Y-%m-%d") if task.actual_end else None,
        "manual_start": task.manual_start,
        "manual_end": task.manual_end,
        "excluded": task.excluded,
        "progress": task.progress,
        "status": task.status.value if hasattr(task.status, 'value') else str(task.status),
    }

def model_to_task(data: TaskModel) -> Task:
    """将请求模型转换为 Task 对象"""
    task = Task(
        milestone=data.milestone,
        task_no=data.task_no,
        name=data.name,
        duration=data.duration,
        owner=data.owner,
        predecessor=data.predecessor,
    )

    # 设置日期
    if data.start_date:
        task.start_date = datetime.strptime(data.start_date, "%Y-%m-%d")
        task.manual_start = data.manual_start
    if data.end_date:
        task.end_date = datetime.strptime(data.end_date, "%Y-%m-%d")
        task.manual_end = data.manual_end
    if data.actual_start:
        task.actual_start = datetime.strptime(data.actual_start, "%Y-%m-%d")
    if data.actual_end:
        task.actual_end = datetime.strptime(data.actual_end, "%Y-%m-%d")

    task.excluded = data.excluded
    task.progress = data.progress

    # 设置状态
    status_map = {
        "未开始": TaskStatus.NOT_STARTED,
        "进行中": TaskStatus.IN_PROGRESS,
        "已完成": TaskStatus.COMPLETED,
        "暂停": TaskStatus.PAUSED,
    }
    task.status = status_map.get(data.status, TaskStatus.NOT_STARTED)

    return task


# ============ API 路由 ============

@app.get("/api/tasks", response_model=List[dict])
async def get_tasks():
    """获取所有任务"""
    return [task_to_model(task, i) for i, task in enumerate(app_state.tasks)]


@app.post("/api/tasks", response_model=dict)
async def create_task(task: TaskModel, position: Optional[int] = None):
    """创建任务"""
    new_task = model_to_task(task)

    if position is not None and 0 <= position <= len(app_state.tasks):
        app_state.tasks.insert(position, new_task)
        return task_to_model(new_task, position)
    else:
        app_state.tasks.append(new_task)
        return task_to_model(new_task, len(app_state.tasks) - 1)


@app.put("/api/tasks/{index}", response_model=dict)
async def update_task(index: int, task: TaskModel):
    """更新任务"""
    if index < 0 or index >= len(app_state.tasks):
        raise HTTPException(status_code=404, detail="任务不存在")

    updated_task = model_to_task(task)
    app_state.tasks[index] = updated_task
    return task_to_model(updated_task, index)


@app.delete("/api/tasks/{index}")
async def delete_task(index: int):
    """删除任务"""
    if index < 0 or index >= len(app_state.tasks):
        raise HTTPException(status_code=404, detail="任务不存在")

    deleted = app_state.tasks.pop(index)
    return {"message": f"已删除任务: {deleted.name}"}


@app.post("/api/tasks/reorder")
async def reorder_task(index: int, direction: str):
    """上移/下移任务"""
    if index < 0 or index >= len(app_state.tasks):
        raise HTTPException(status_code=404, detail="任务不存在")

    if direction == "up" and index > 0:
        app_state.tasks[index], app_state.tasks[index-1] = \
            app_state.tasks[index-1], app_state.tasks[index]
        return {"new_index": index - 1}
    elif direction == "down" and index < len(app_state.tasks) - 1:
        app_state.tasks[index], app_state.tasks[index+1] = \
            app_state.tasks[index+1], app_state.tasks[index]
        return {"new_index": index + 1}

    return {"new_index": index}


@app.post("/api/tasks/toggle-exclude/{index}")
async def toggle_exclude(index: int):
    """切换排除状态"""
    if index < 0 or index >= len(app_state.tasks):
        raise HTTPException(status_code=404, detail="任务不存在")

    app_state.tasks[index].excluded = not app_state.tasks[index].excluded
    return {"excluded": app_state.tasks[index].excluded}


# ============ 排期计算 API ============

@app.post("/api/schedule/forward")
async def calculate_forward(request: ScheduleRequest):
    """正向排期"""
    try:
        start_date = datetime.strptime(request.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式错误")

    scheduler = Scheduler(
        exclude_weekends=request.exclude_weekends,
        exclude_holidays=request.exclude_holidays
    )

    # 计算日期
    app_state.tasks = scheduler.calculate_dates(app_state.tasks, start_date)

    # 计算摘要
    summary = {}
    if app_state.tasks:
        first_task = app_state.tasks[0]
        last_task = app_state.tasks[-1]
        if first_task.start_date and last_task.end_date:
            summary = {
                "start_date": first_task.start_date.strftime("%Y-%m-%d"),
                "end_date": last_task.end_date.strftime("%Y-%m-%d"),
                "total_days": (last_task.end_date - first_task.start_date).days + 1
            }

    return {
        "tasks": [task_to_model(task, i) for i, task in enumerate(app_state.tasks)],
        "summary": summary
    }


@app.post("/api/schedule/backward")
async def calculate_backward(request: ScheduleRequest):
    """倒推排期"""
    try:
        end_date = datetime.strptime(request.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式错误")

    scheduler = Scheduler(
        exclude_weekends=request.exclude_weekends,
        exclude_holidays=request.exclude_holidays
    )

    # 倒推计算
    app_state.tasks = scheduler.calculate_dates_backward(app_state.tasks, end_date)

    # 计算摘要
    summary = {}
    if app_state.tasks:
        first_task = app_state.tasks[0]
        last_task = app_state.tasks[-1]
        if first_task.start_date and last_task.end_date:
            summary = {
                "start_date": first_task.start_date.strftime("%Y-%m-%d"),
                "end_date": last_task.end_date.strftime("%Y-%m-%d"),
                "total_days": (last_task.end_date - first_task.start_date).days + 1
            }

    return {
        "tasks": [task_to_model(task, i) for i, task in enumerate(app_state.tasks)],
        "summary": summary
    }


# ============ 配置管理 API ============

@app.get("/api/config/template")
async def load_template():
    """加载 APQP 标准模板"""
    app_state.tasks = load_template_tasks()
    return {
        "message": f"已加载 {len(app_state.tasks)} 个任务",
        "tasks": [task_to_model(task, i) for i, task in enumerate(app_state.tasks)]
    }


# ============ Excel 导出 API ============

class ExportRequest(BaseModel):
    """导出请求"""
    project_name: str = "新产品开发项目"
    start_date: str  # ISO 格式: YYYY-MM-DD
    gantt_start_date: Optional[str] = None  # 甘特图开始日期（默认使用 start_date）
    gantt_days: int = 180
    exclude_weekends: bool = True
    exclude_holidays: bool = False


@app.post("/api/export/excel")
async def export_excel(request: ExportRequest):
    """导出 Excel 文件"""
    import tempfile
    import os

    if not app_state.tasks:
        raise HTTPException(status_code=400, detail="没有任务数据")

    try:
        start_date = datetime.strptime(request.start_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式错误")

    # 解析甘特图开始日期
    gantt_start_date = None
    if request.gantt_start_date:
        try:
            gantt_start_date = datetime.strptime(request.gantt_start_date, "%Y-%m-%d")
        except ValueError:
            pass  # 使用默认值（start_date）

    # 生成临时文件
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{request.project_name}_开发计划_{timestamp}.xlsx"

    # 使用临时目录
    temp_dir = tempfile.gettempdir()
    output_path = os.path.join(temp_dir, filename)

    # 生成 Excel
    generator = ExcelGenerator()
    generator.generate(
        tasks=app_state.tasks,
        project_name=request.project_name,
        start_date=start_date,
        output_path=output_path,
        gantt_days=request.gantt_days,
        exclude_weekends=request.exclude_weekends,
        exclude_holidays=request.exclude_holidays,
        progress_manager=app_state.progress_manager,
        gantt_start_date=gantt_start_date
    )

    # 返回文件下载
    return FileResponse(
        path=output_path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


# ============ 静态文件服务（生产模式） ============

# 获取基础路径（支持 PyInstaller 打包）
def get_base_path():
    """获取应用基础路径，支持 PyInstaller 打包"""
    if getattr(sys, 'frozen', False):
        # PyInstaller 打包后的路径
        return Path(sys._MEIPASS)
    else:
        # 开发模式路径
        return Path(__file__).parent.parent

base_path = get_base_path()
# 开发模式: frontend/dist, 打包模式: dist
if getattr(sys, 'frozen', False):
    dist_path = base_path / "dist"
else:
    dist_path = base_path / "frontend" / "dist"


# ============ 进度记录 API ============

class ProgressRecordRequest(BaseModel):
    """进度记录请求"""
    task_index: int
    progress: int  # 0-100
    status: str  # 未开始/进行中/已完成/暂停
    note: str = ""
    issues: str = ""
    record_date: Optional[str] = None  # ISO 格式，默认今天


class ProgressRecordResponse(BaseModel):
    """进度记录响应"""
    record_id: str
    task_no: str
    record_date: str
    progress: int
    status: str
    note: str
    issues: str


@app.post("/api/progress/record")
async def record_progress(request: ProgressRecordRequest):
    """记录任务进度"""
    if request.task_index < 0 or request.task_index >= len(app_state.tasks):
        raise HTTPException(status_code=404, detail="任务不存在")

    task = app_state.tasks[request.task_index]

    # 解析状态
    status_map = {
        "未开始": TaskStatus.NOT_STARTED,
        "进行中": TaskStatus.IN_PROGRESS,
        "已完成": TaskStatus.COMPLETED,
        "暂停": TaskStatus.PAUSED,
    }
    status = status_map.get(request.status, TaskStatus.NOT_STARTED)

    # 解析日期
    record_date = None
    if request.record_date:
        try:
            record_date = datetime.strptime(request.record_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="日期格式错误")

    # 添加记录
    record = app_state.progress_manager.add_record(
        task=task,
        progress=request.progress,
        status=status,
        note=request.note,
        issues=request.issues,
        record_date=record_date
    )

    # 同步更新任务的进度和状态
    task.progress = request.progress
    task.status = status

    # 自动更新实际日期（与进度联动）
    actual_date = record_date or datetime.now()

    # 进度 > 0 且未设置实际开始日期 → 自动设置
    if request.progress > 0 and not task.actual_start:
        task.actual_start = actual_date

    # 进度 = 100% 且未设置实际结束日期 → 自动设置
    if request.progress == 100 and not task.actual_end:
        task.actual_end = actual_date

    return {
        "record_id": record.record_id,
        "task_no": record.task_no,
        "record_date": record.record_date.strftime("%Y-%m-%d"),
        "progress": record.progress,
        "increment": record.increment,
        "status": record.status.value,
        "note": record.note,
        "issues": record.issues,
        "task": task_to_model(task, request.task_index)
    }


@app.get("/api/progress/history/{task_index}")
async def get_progress_history(task_index: int):
    """获取任务的进度历史"""
    if task_index < 0 or task_index >= len(app_state.tasks):
        raise HTTPException(status_code=404, detail="任务不存在")

    task = app_state.tasks[task_index]
    history = app_state.progress_manager.get_task_history(task.task_no)

    return {
        "task_no": task.task_no,
        "task_name": task.name,
        "records": [
            {
                "record_id": r.record_id,
                "record_date": r.record_date.strftime("%Y-%m-%d"),
                "progress": r.progress,
                "increment": r.increment,
                "status": r.status.value,
                "note": r.note,
                "issues": r.issues,
            }
            for r in history
        ]
    }


# ============ 退出控制 ============

@app.post("/api/shutdown")
async def shutdown():
    """关闭服务器"""
    import os
    # 延迟关闭，让响应先返回
    threading.Timer(0.5, lambda: os._exit(0)).start()
    return {"message": "服务器即将关闭"}

# 检查是否存在构建后的前端文件
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="static")


# ============ 启动入口 ============

PORT = 8080  # 使用 8080 端口避免与其他服务冲突

def open_browser():
    """延迟打开浏览器"""
    import subprocess
    url = f"http://localhost:{PORT}"
    try:
        # macOS 使用 open 命令
        subprocess.run(['open', url], check=True)
    except Exception:
        # 备用方案
        webbrowser.open(url)


if __name__ == "__main__":
    print("=" * 50)
    print("  APQP 项目计划生成器 - Web 版")
    print(f"  访问地址: http://localhost:{PORT}")
    print("=" * 50)

    # 1秒后自动打开浏览器
    threading.Timer(1.0, open_browser).start()

    # 启动服务器
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=PORT,
        log_level="info"
    )
