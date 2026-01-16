"""
项目管理器 - 处理多项目的创建、切换、存储
"""

import json
import uuid
from pathlib import Path
from typing import List, Optional, Dict, Tuple
from datetime import datetime
from dataclasses import dataclass, field

from .scheduler import Task, TaskStatus
from .config import ConfigManager, load_template_tasks
from .progress_manager import ProgressManager


@dataclass
class Project:
    """项目数据类"""
    id: str
    name: str
    description: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    status: str = "active"  # active / archived / template

    # 排期设置
    schedule_mode: str = "forward"  # forward / backward
    schedule_date: Optional[str] = None
    exclude_weekends: bool = True
    exclude_holidays: bool = False

    # 统计信息
    task_count: int = 0
    completion_rate: float = 0.0

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            "updated_at": self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else self.updated_at,
            "status": self.status,
            "schedule_mode": self.schedule_mode,
            "schedule_date": self.schedule_date,
            "exclude_weekends": self.exclude_weekends,
            "exclude_holidays": self.exclude_holidays,
            "task_count": self.task_count,
            "completion_rate": self.completion_rate,
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'Project':
        """从字典创建项目"""
        created_at = data.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        elif created_at is None:
            created_at = datetime.now()

        updated_at = data.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        elif updated_at is None:
            updated_at = datetime.now()

        return cls(
            id=data.get("id", f"proj_{uuid.uuid4().hex[:8]}"),
            name=data["name"],
            description=data.get("description", ""),
            created_at=created_at,
            updated_at=updated_at,
            status=data.get("status", "active"),
            schedule_mode=data.get("schedule_mode", "forward"),
            schedule_date=data.get("schedule_date"),
            exclude_weekends=data.get("exclude_weekends", True),
            exclude_holidays=data.get("exclude_holidays", False),
            task_count=data.get("task_count", 0),
            completion_rate=data.get("completion_rate", 0.0),
        )


class ProjectManager:
    """项目管理器"""

    def __init__(self, config_dir: Optional[str] = None):
        if config_dir:
            self.config_dir = Path(config_dir)
        else:
            self.config_dir = Path.home() / ".apqp_planner"

        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.config_dir / "projects.json"
        self.projects: Dict[str, Project] = {}
        self.default_project_id: Optional[str] = None
        self._load_index()

    def _load_index(self):
        """加载项目索引"""
        if self.index_file.exists():
            try:
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.default_project_id = data.get("default_project_id")
                    for p_data in data.get("projects", []):
                        project = Project.from_dict(p_data)
                        self.projects[project.id] = project
            except (json.JSONDecodeError, KeyError) as e:
                print(f"加载项目索引失败: {e}")
                self.projects = {}

    def _save_index(self):
        """保存项目索引"""
        data = {
            "version": "1.0",
            "default_project_id": self.default_project_id,
            "projects": [p.to_dict() for p in self.projects.values()]
        }
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def list_projects(self, status: Optional[str] = None) -> List[Project]:
        """列出项目"""
        projects = list(self.projects.values())
        if status:
            projects = [p for p in projects if p.status == status]
        return sorted(projects, key=lambda p: p.updated_at, reverse=True)

    def create_project(self, name: str, description: str = "",
                       template_id: Optional[str] = None) -> Project:
        """创建新项目"""
        project_id = f"proj_{uuid.uuid4().hex[:8]}"

        project = Project(
            id=project_id,
            name=name,
            description=description
        )

        # 加载任务模板
        if template_id and template_id != "builtin_apqp":
            # 从自定义模板复制
            tasks, _ = self.load_project_data(template_id)
            # 清除进度数据
            for task in tasks:
                task.progress = 0
                task.status = TaskStatus.NOT_STARTED
                task.actual_start = None
                task.actual_end = None
                task.start_date = None
                task.end_date = None
                task.progress_history = []
        else:
            # 加载内置 APQP 模板
            tasks = load_template_tasks()

        project.task_count = len([t for t in tasks if not t.excluded])

        # 保存项目数据
        self.save_project_data(project_id, tasks, ProgressManager())

        # 更新索引
        self.projects[project_id] = project

        # 如果是第一个项目，设为默认
        if len(self.projects) == 1:
            self.default_project_id = project_id

        self._save_index()

        return project

    def get_project(self, project_id: str) -> Optional[Project]:
        """获取项目"""
        return self.projects.get(project_id)

    def update_project(self, project_id: str, updates: dict) -> Optional[Project]:
        """更新项目信息"""
        project = self.projects.get(project_id)
        if not project:
            return None

        for key, value in updates.items():
            if hasattr(project, key):
                setattr(project, key, value)

        project.updated_at = datetime.now()
        self._save_index()
        return project

    def delete_project(self, project_id: str) -> bool:
        """删除项目"""
        if project_id not in self.projects:
            return False

        # 删除数据文件
        data_file = self.config_dir / f"{project_id}.json"
        if data_file.exists():
            data_file.unlink()

        del self.projects[project_id]

        # 如果删除的是默认项目，重新选择默认
        if self.default_project_id == project_id:
            active_projects = self.list_projects(status="active")
            self.default_project_id = active_projects[0].id if active_projects else None

        self._save_index()
        return True

    def load_project_data(self, project_id: str) -> Tuple[List[Task], ProgressManager]:
        """加载项目数据"""
        data_file = self.config_dir / f"{project_id}.json"

        if not data_file.exists():
            return [], ProgressManager()

        config_manager = ConfigManager(str(self.config_dir))
        progress_manager = ProgressManager()
        tasks = config_manager.load_tasks(str(data_file), progress_manager)

        return tasks, progress_manager

    def save_project_data(self, project_id: str, tasks: List[Task],
                          progress_manager: ProgressManager):
        """保存项目数据"""
        data_file = self.config_dir / f"{project_id}.json"

        config_manager = ConfigManager(str(self.config_dir))
        config_manager.save_to_path(tasks, str(data_file), progress_manager)

        # 更新项目统计
        project = self.projects.get(project_id)
        if project:
            active_tasks = [t for t in tasks if not t.excluded]
            project.task_count = len(active_tasks)
            total_progress = sum(t.progress for t in active_tasks)
            project.completion_rate = round(total_progress / len(active_tasks), 1) if active_tasks else 0
            project.updated_at = datetime.now()
            self._save_index()

    def duplicate_project(self, source_id: str, new_name: str) -> Optional[Project]:
        """复制项目（包含所有任务，清除进度数据）"""
        source_project = self.projects.get(source_id)
        if not source_project:
            return None

        tasks, _ = self.load_project_data(source_id)

        # 清除进度数据
        for task in tasks:
            task.progress = 0
            task.status = TaskStatus.NOT_STARTED
            task.actual_start = None
            task.actual_end = None
            task.progress_history = []

        # 创建新项目
        project_id = f"proj_{uuid.uuid4().hex[:8]}"
        new_project = Project(
            id=project_id,
            name=new_name,
            description=f"复制自: {source_project.name}",
            schedule_mode=source_project.schedule_mode,
            exclude_weekends=source_project.exclude_weekends,
            exclude_holidays=source_project.exclude_holidays,
        )
        new_project.task_count = len([t for t in tasks if not t.excluded])

        # 保存数据
        self.save_project_data(project_id, tasks, ProgressManager())
        self.projects[project_id] = new_project
        self._save_index()

        return new_project

    def save_as_template(self, project_id: str, template_name: str) -> Optional[Project]:
        """将项目保存为模板"""
        source_project = self.projects.get(project_id)
        if not source_project:
            return None

        tasks, _ = self.load_project_data(project_id)

        # 清除进度和日期数据
        for task in tasks:
            task.progress = 0
            task.status = TaskStatus.NOT_STARTED
            task.actual_start = None
            task.actual_end = None
            task.start_date = None
            task.end_date = None
            task.progress_history = []

        # 创建模板项目
        template_id = f"tmpl_{uuid.uuid4().hex[:8]}"
        template = Project(
            id=template_id,
            name=template_name,
            description=f"模板，基于项目: {source_project.name}",
            status="template"
        )
        template.task_count = len([t for t in tasks if not t.excluded])

        self.save_project_data(template_id, tasks, ProgressManager())
        self.projects[template_id] = template
        self._save_index()

        return template

    def get_comparison_data(self, project_ids: List[str]) -> List[dict]:
        """获取项目对比数据"""
        comparison_data = []

        for project_id in project_ids:
            project = self.get_project(project_id)
            if not project:
                continue

            tasks, _ = self.load_project_data(project_id)

            # 按里程碑聚合
            milestones = {}
            for task in tasks:
                if task.excluded:
                    continue
                if task.milestone not in milestones:
                    milestones[task.milestone] = {
                        "total_tasks": 0,
                        "completed_tasks": 0,
                        "total_progress": 0
                    }
                milestones[task.milestone]["total_tasks"] += 1
                if task.progress == 100:
                    milestones[task.milestone]["completed_tasks"] += 1
                milestones[task.milestone]["total_progress"] += task.progress

            # 计算平均进度
            for m in milestones.values():
                m["avg_progress"] = round(m["total_progress"] / m["total_tasks"], 1) if m["total_tasks"] > 0 else 0

            comparison_data.append({
                "project": project.to_dict(),
                "milestones": milestones,
                "overall_progress": project.completion_rate
            })

        return comparison_data
