"""
APQP 项目计划生成器 - Web 版后端
FastAPI 服务入口
"""

import os
import sys
import json
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
    ProgressManager, ExcelGenerator,
    Project, ProjectManager
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


# ============ 全局状态（支持多项目） ============

class AppState:
    """应用状态 - 支持多项目"""

    # 默认里程碑列表
    DEFAULT_MILESTONES = [
        "概念设计",
        "选供应商报价",
        "评审",
        "定案",
        "设计定案",
        "模具样板",
        "验证测试",
        "量产准备",
    ]

    # 默认机器分类列表
    DEFAULT_CATEGORIES = [
        "拉伸膜机",
        "真空机",
        "热封机",
        "贴体机",
        "气调机",
        "封口机",
        "其他",
    ]

    # 默认部门列表
    DEFAULT_DEPARTMENTS = [
        "研发部",
        "工程部",
        "生产部",
        "品质部",
        "采购部",
        "销售部",
    ]

    def __init__(self):
        self.project_manager = ProjectManager()
        self.config_manager = ConfigManager()

        # 当前活动项目
        self.current_project: Optional[Project] = None
        self.tasks: List[Task] = []
        self.progress_manager = ProgressManager()
        self.milestones: List[str] = self.DEFAULT_MILESTONES.copy()

        # 机器分类（全局配置）
        self.categories: List[str] = self._load_categories()

        # 人员库（全局配置）
        self.personnel: List[dict] = self._load_personnel()
        self.departments: List[str] = self._load_departments()

    def _get_categories_file(self) -> Path:
        """获取机器分类配置文件路径"""
        return self.project_manager.config_dir / "categories.json"

    def _load_categories(self) -> List[str]:
        """加载机器分类配置"""
        categories_file = self._get_categories_file()
        if categories_file.exists():
            try:
                with open(categories_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get("categories", self.DEFAULT_CATEGORIES.copy())
            except (json.JSONDecodeError, KeyError):
                pass
        return self.DEFAULT_CATEGORIES.copy()

    def _save_categories(self):
        """保存机器分类配置"""
        categories_file = self._get_categories_file()
        data = {"version": "1.0", "categories": self.categories}
        with open(categories_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _get_personnel_file(self) -> Path:
        """获取人员库配置文件路径"""
        return self.project_manager.config_dir / "personnel.json"

    def _load_personnel(self) -> List[dict]:
        """加载人员库配置"""
        personnel_file = self._get_personnel_file()
        if personnel_file.exists():
            try:
                with open(personnel_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get("personnel", [])
            except (json.JSONDecodeError, KeyError):
                pass
        return []

    def _load_departments(self) -> List[str]:
        """加载部门列表"""
        personnel_file = self._get_personnel_file()
        if personnel_file.exists():
            try:
                with open(personnel_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get("departments", self.DEFAULT_DEPARTMENTS.copy())
            except (json.JSONDecodeError, KeyError):
                pass
        return self.DEFAULT_DEPARTMENTS.copy()

    def _save_personnel(self):
        """保存人员库配置"""
        personnel_file = self._get_personnel_file()
        data = {
            "version": "1.0",
            "departments": self.departments,
            "personnel": self.personnel
        }
        with open(personnel_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def ensure_project_loaded(self):
        """确保有项目已加载"""
        if self.current_project:
            return

        # 尝试加载默认项目
        projects = self.project_manager.list_projects(status="active")
        if projects:
            self.switch_to_project(projects[0].id)
        else:
            # 创建默认项目
            project = self.project_manager.create_project("默认项目")
            self.switch_to_project(project.id)

    def switch_to_project(self, project_id: str) -> bool:
        """切换到指定项目"""
        # 保存当前项目
        if self.current_project:
            self.project_manager.save_project_data(
                self.current_project.id,
                self.tasks,
                self.progress_manager,
                self.milestones
            )

        # 加载新项目
        project = self.project_manager.get_project(project_id)
        if not project:
            return False

        tasks, progress_manager, milestones = self.project_manager.load_project_data(project_id)

        self.current_project = project
        self.tasks = tasks
        self.progress_manager = progress_manager
        # 如果项目有自定义里程碑则使用，否则使用默认
        self.milestones = milestones if milestones else self.DEFAULT_MILESTONES.copy()

        return True

    def auto_save(self):
        """自动保存当前项目"""
        if self.current_project:
            self.project_manager.save_project_data(
                self.current_project.id,
                self.tasks,
                self.progress_manager,
                self.milestones
            )

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
    # RACI 职责分配
    responsible: List[str] = []   # R - 负责人（执行者）
    accountable: str = ""         # A - 批准人（最终负责）
    consulted: List[str] = []     # C - 咨询人
    informed: List[str] = []      # I - 知会人

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
        # RACI 职责分配
        "responsible": task.responsible,
        "accountable": task.accountable,
        "consulted": task.consulted,
        "informed": task.informed,
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

    # 设置 RACI 职责分配
    task.responsible = data.responsible
    task.accountable = data.accountable
    task.consulted = data.consulted
    task.informed = data.informed

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

    # 自动保存以更新项目统计
    app_state.auto_save()

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
    """加载 APQP 标准模板（确保当前有项目）"""
    app_state.ensure_project_loaded()
    return {
        "message": f"已加载 {len(app_state.tasks)} 个任务",
        "tasks": [task_to_model(task, i) for i, task in enumerate(app_state.tasks)],
        "project": app_state.current_project.to_dict() if app_state.current_project else None
    }


# ============ 项目管理 API ============

class ProjectModel(BaseModel):
    """项目创建模型"""
    name: str
    description: str = ""
    template_id: Optional[str] = None
    # 项目详细属性
    machine_no: str = ""        # 整机编号
    customer: str = ""          # 客户名称
    model: str = ""             # 机型
    category: str = ""          # 机器分类
    specifications: str = ""    # 规格
    custom_requirements: str = ""  # 定制内容


class ProjectUpdateModel(BaseModel):
    """项目更新模型"""
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    # 项目详细属性
    machine_no: Optional[str] = None
    customer: Optional[str] = None
    model: Optional[str] = None
    category: Optional[str] = None
    specifications: Optional[str] = None
    custom_requirements: Optional[str] = None
    # 排期设置
    schedule_mode: Optional[str] = None
    schedule_date: Optional[str] = None
    exclude_weekends: Optional[bool] = None
    exclude_holidays: Optional[bool] = None


class CompareRequest(BaseModel):
    """项目对比请求"""
    project_ids: List[str]


class DuplicateRequest(BaseModel):
    """复制项目请求"""
    new_name: str


class SaveAsTemplateRequest(BaseModel):
    """保存为模板请求"""
    template_name: str


@app.get("/api/projects")
async def list_projects(status: Optional[str] = None):
    """获取项目列表"""
    projects = app_state.project_manager.list_projects(status)
    return {
        "projects": [p.to_dict() for p in projects],
        "default_project_id": app_state.current_project.id if app_state.current_project else None
    }


@app.post("/api/projects")
async def create_project(project: ProjectModel):
    """创建新项目"""
    # 收集额外字段
    extra_fields = {
        "machine_no": project.machine_no,
        "customer": project.customer,
        "model": project.model,
        "category": project.category,
        "specifications": project.specifications,
        "custom_requirements": project.custom_requirements,
    }

    new_project = app_state.project_manager.create_project(
        name=project.name,
        description=project.description,
        template_id=project.template_id,
        extra_fields=extra_fields
    )
    return {"project": new_project.to_dict(), "message": "项目创建成功"}


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """获取项目详情"""
    project = app_state.project_manager.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    tasks, _ = app_state.project_manager.load_project_data(project_id)
    return {
        "project": project.to_dict(),
        "tasks": [task_to_model(task, i) for i, task in enumerate(tasks)]
    }


@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, data: ProjectUpdateModel):
    """更新项目信息"""
    updates = data.dict(exclude_none=True)
    project = app_state.project_manager.update_project(project_id, updates)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    # 如果是当前项目，同步更新
    if app_state.current_project and app_state.current_project.id == project_id:
        app_state.current_project = project

    return {"project": project.to_dict()}


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    """删除项目"""
    # 不能删除当前项目
    if app_state.current_project and app_state.current_project.id == project_id:
        raise HTTPException(status_code=400, detail="不能删除当前正在使用的项目")

    success = app_state.project_manager.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="项目不存在")
    return {"success": True}


@app.post("/api/projects/{project_id}/switch")
async def switch_project(project_id: str):
    """切换当前项目"""
    success = app_state.switch_to_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="项目不存在")

    return {
        "success": True,
        "project": app_state.current_project.to_dict(),
        "tasks": [task_to_model(task, i) for i, task in enumerate(app_state.tasks)]
    }


@app.post("/api/projects/{project_id}/save")
async def save_project(project_id: str):
    """手动保存当前项目"""
    if not app_state.current_project or app_state.current_project.id != project_id:
        raise HTTPException(status_code=400, detail="项目未加载")

    app_state.auto_save()
    return {"success": True}


@app.post("/api/projects/{project_id}/duplicate")
async def duplicate_project(project_id: str, request: DuplicateRequest):
    """复制项目"""
    new_project = app_state.project_manager.duplicate_project(project_id, request.new_name)
    if not new_project:
        raise HTTPException(status_code=404, detail="源项目不存在")
    return new_project.to_dict()


@app.post("/api/projects/{project_id}/save-as-template")
async def save_as_template(project_id: str, request: SaveAsTemplateRequest):
    """将项目保存为模板"""
    template = app_state.project_manager.save_as_template(project_id, request.template_name)
    if not template:
        raise HTTPException(status_code=404, detail="项目不存在")
    return template.to_dict()


@app.post("/api/projects/compare")
async def compare_projects(request: CompareRequest):
    """对比多个项目"""
    if len(request.project_ids) < 2 or len(request.project_ids) > 4:
        raise HTTPException(status_code=400, detail="请选择2-4个项目进行对比")

    comparison_data = app_state.project_manager.get_comparison_data(request.project_ids)
    return {"comparison": comparison_data}


@app.get("/api/templates")
async def list_templates():
    """获取模板列表"""
    templates = app_state.project_manager.list_projects(status="template")
    builtin_template = {
        "id": "builtin_apqp",
        "name": "APQP 标准模板",
        "description": "新产品开发43项标准任务",
        "status": "template",
        "task_count": 43,
        "is_builtin": True
    }
    return {
        "templates": [builtin_template] + [t.to_dict() for t in templates]
    }


# ============ 里程碑管理 API ============

@app.get("/api/milestones")
async def get_milestones():
    """获取当前项目的里程碑列表"""
    app_state.ensure_project_loaded()
    return {"milestones": app_state.milestones}


class MilestoneRequest(BaseModel):
    """里程碑请求"""
    name: str


@app.post("/api/milestones")
async def add_milestone(request: MilestoneRequest):
    """添加里程碑"""
    app_state.ensure_project_loaded()

    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="里程碑名称不能为空")

    if name in app_state.milestones:
        raise HTTPException(status_code=400, detail="里程碑已存在")

    app_state.milestones.append(name)
    app_state.auto_save()

    return {"milestones": app_state.milestones, "message": "里程碑添加成功"}


@app.delete("/api/milestones/{name}")
async def delete_milestone(name: str):
    """删除里程碑"""
    app_state.ensure_project_loaded()

    # URL 解码
    import urllib.parse
    name = urllib.parse.unquote(name)

    if name not in app_state.milestones:
        raise HTTPException(status_code=404, detail="里程碑不存在")

    # 检查是否有任务使用该里程碑
    tasks_using = [t for t in app_state.tasks if t.milestone == name]
    if tasks_using:
        raise HTTPException(
            status_code=400,
            detail=f"有 {len(tasks_using)} 个任务正在使用此里程碑，请先修改这些任务"
        )

    app_state.milestones.remove(name)
    app_state.auto_save()

    return {"milestones": app_state.milestones, "message": "里程碑删除成功"}


class ReorderMilestonesRequest(BaseModel):
    """重排里程碑请求"""
    milestones: List[str]


@app.put("/api/milestones/reorder")
async def reorder_milestones(request: ReorderMilestonesRequest):
    """重新排序里程碑"""
    app_state.ensure_project_loaded()

    # 验证里程碑列表
    if set(request.milestones) != set(app_state.milestones):
        raise HTTPException(status_code=400, detail="里程碑列表不匹配")

    app_state.milestones = request.milestones
    app_state.auto_save()

    return {"milestones": app_state.milestones, "message": "里程碑排序更新成功"}


@app.put("/api/milestones/{name}")
async def update_milestone(name: str, request: MilestoneRequest):
    """重命名里程碑"""
    app_state.ensure_project_loaded()

    # URL 解码
    import urllib.parse
    name = urllib.parse.unquote(name)

    if name not in app_state.milestones:
        raise HTTPException(status_code=404, detail="里程碑不存在")

    new_name = request.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="里程碑名称不能为空")

    if new_name != name and new_name in app_state.milestones:
        raise HTTPException(status_code=400, detail="新名称已存在")

    # 更新里程碑名称
    index = app_state.milestones.index(name)
    app_state.milestones[index] = new_name

    # 同时更新所有使用该里程碑的任务
    for task in app_state.tasks:
        if task.milestone == name:
            task.milestone = new_name

    app_state.auto_save()

    return {"milestones": app_state.milestones, "message": "里程碑更新成功"}


# ============ 机器分类管理 API ============

class CategoryRequest(BaseModel):
    """机器分类请求"""
    name: str


@app.get("/api/categories")
async def get_categories():
    """获取机器分类列表"""
    return {"categories": app_state.categories}


@app.post("/api/categories")
async def add_category(request: CategoryRequest):
    """添加机器分类"""
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="分类名称不能为空")

    if name in app_state.categories:
        raise HTTPException(status_code=400, detail="分类已存在")

    app_state.categories.append(name)
    app_state._save_categories()

    return {"categories": app_state.categories, "message": "分类添加成功"}


@app.delete("/api/categories/{name}")
async def delete_category(name: str):
    """删除机器分类"""
    import urllib.parse
    name = urllib.parse.unquote(name)

    if name not in app_state.categories:
        raise HTTPException(status_code=404, detail="分类不存在")

    # 检查是否有项目在使用该分类
    for project in app_state.project_manager.list_projects():
        if project.category == name:
            raise HTTPException(
                status_code=400,
                detail=f"无法删除：项目 '{project.name}' 正在使用此分类"
            )

    app_state.categories.remove(name)
    app_state._save_categories()

    return {"categories": app_state.categories, "message": "分类删除成功"}


@app.put("/api/categories/{name}")
async def update_category(name: str, request: CategoryRequest):
    """重命名机器分类"""
    import urllib.parse
    name = urllib.parse.unquote(name)

    if name not in app_state.categories:
        raise HTTPException(status_code=404, detail="分类不存在")

    new_name = request.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="分类名称不能为空")

    if new_name != name and new_name in app_state.categories:
        raise HTTPException(status_code=400, detail="新名称已存在")

    # 更新分类名称
    index = app_state.categories.index(name)
    app_state.categories[index] = new_name

    # 同时更新所有使用该分类的项目
    for project in app_state.project_manager.list_projects():
        if project.category == name:
            app_state.project_manager.update_project(project.id, {"category": new_name})

    app_state._save_categories()

    return {"categories": app_state.categories, "message": "分类更新成功"}


# ============ 人员库管理 API ============

class PersonnelRequest(BaseModel):
    """人员请求"""
    name: str
    department: str = ""


class DepartmentRequest(BaseModel):
    """部门请求"""
    name: str


@app.get("/api/personnel")
async def get_personnel():
    """获取人员库列表"""
    return {
        "personnel": app_state.personnel,
        "departments": app_state.departments
    }


@app.post("/api/personnel")
async def add_personnel(request: PersonnelRequest):
    """添加人员"""
    import uuid

    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="姓名不能为空")

    # 检查是否已存在同名人员
    for p in app_state.personnel:
        if p["name"] == name:
            raise HTTPException(status_code=400, detail="人员已存在")

    person = {
        "id": f"person_{uuid.uuid4().hex[:8]}",
        "name": name,
        "department": request.department.strip()
    }
    app_state.personnel.append(person)
    app_state._save_personnel()

    return {"personnel": app_state.personnel, "message": "人员添加成功"}


@app.put("/api/personnel/{person_id}")
async def update_personnel(person_id: str, request: PersonnelRequest):
    """更新人员信息"""
    import urllib.parse
    person_id = urllib.parse.unquote(person_id)

    # 查找人员
    person = None
    for p in app_state.personnel:
        if p["id"] == person_id:
            person = p
            break

    if not person:
        raise HTTPException(status_code=404, detail="人员不存在")

    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="姓名不能为空")

    # 检查是否有其他同名人员
    for p in app_state.personnel:
        if p["name"] == name and p["id"] != person_id:
            raise HTTPException(status_code=400, detail="该姓名已被使用")

    # 更新人员信息
    person["name"] = name
    person["department"] = request.department.strip()
    app_state._save_personnel()

    return {"personnel": app_state.personnel, "message": "人员更新成功"}


@app.delete("/api/personnel/{person_id}")
async def delete_personnel(person_id: str):
    """删除人员"""
    import urllib.parse
    person_id = urllib.parse.unquote(person_id)

    # 查找人员
    person = None
    for p in app_state.personnel:
        if p["id"] == person_id:
            person = p
            break

    if not person:
        raise HTTPException(status_code=404, detail="人员不存在")

    app_state.personnel.remove(person)
    app_state._save_personnel()

    return {"personnel": app_state.personnel, "message": "人员删除成功"}


@app.get("/api/departments")
async def get_departments():
    """获取部门列表"""
    return {"departments": app_state.departments}


@app.post("/api/departments")
async def add_department(request: DepartmentRequest):
    """添加部门"""
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="部门名称不能为空")

    if name in app_state.departments:
        raise HTTPException(status_code=400, detail="部门已存在")

    app_state.departments.append(name)
    app_state._save_personnel()

    return {"departments": app_state.departments, "message": "部门添加成功"}


@app.delete("/api/departments/{name}")
async def delete_department(name: str):
    """删除部门"""
    import urllib.parse
    name = urllib.parse.unquote(name)

    if name not in app_state.departments:
        raise HTTPException(status_code=404, detail="部门不存在")

    # 检查是否有人员在使用该部门
    for person in app_state.personnel:
        if person.get("department") == name:
            raise HTTPException(
                status_code=400,
                detail=f"无法删除：人员 '{person['name']}' 属于此部门"
            )

    app_state.departments.remove(name)
    app_state._save_personnel()

    return {"departments": app_state.departments, "message": "部门删除成功"}


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

    # 自动保存以更新项目统计
    app_state.auto_save()

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
