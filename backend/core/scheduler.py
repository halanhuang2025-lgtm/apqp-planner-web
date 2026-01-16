"""
日期计算模块 - 处理工作日、节假日和任务依赖关系
"""

from datetime import datetime, timedelta
from typing import List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
import uuid


class TaskStatus(str, Enum):
    """任务状态枚举"""
    NOT_STARTED = "未开始"
    IN_PROGRESS = "进行中"
    COMPLETED = "已完成"
    PAUSED = "暂停"


@dataclass
class ProgressRecord:
    """进度记录数据类 - 单次进度更新记录"""
    record_id: str              # 唯一标识
    task_no: str                # 关联的任务编号
    record_date: datetime       # 记录日期
    progress: int               # 完成百分比 (0-100)
    status: TaskStatus          # 任务状态
    note: str = ""              # 当日备注
    issues: str = ""            # 遇到的问题
    increment: int = 0          # 当日增量（相比上次记录）
    created_at: Optional[datetime] = None  # 创建时间

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "record_id": self.record_id,
            "task_no": self.task_no,
            "record_date": self.record_date.strftime("%Y-%m-%d"),
            "progress": self.progress,
            "status": self.status.value,
            "note": self.note,
            "issues": self.issues,
            "increment": self.increment,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else ""
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'ProgressRecord':
        """从字典创建"""
        created_at = None
        if data.get("created_at"):
            try:
                created_at = datetime.strptime(data["created_at"], "%Y-%m-%d %H:%M:%S")
            except ValueError:
                created_at = datetime.now()

        return cls(
            record_id=data.get("record_id", f"rec_{uuid.uuid4().hex[:8]}"),
            task_no=data.get("task_no", ""),
            record_date=datetime.strptime(data["record_date"], "%Y-%m-%d"),
            progress=data.get("progress", 0),
            status=TaskStatus(data.get("status", "未开始")),
            note=data.get("note", ""),
            issues=data.get("issues", ""),
            increment=data.get("increment", 0),
            created_at=created_at
        )


@dataclass
class Task:
    """任务数据类"""
    milestone: str          # 里程碑
    task_no: str           # 任务编号
    name: str              # 任务名称
    duration: int          # 工期（天）
    owner: str             # 主责人
    predecessor: str = ""  # 前置任务编号
    start_date: Optional[datetime] = None      # 计划开始日期
    end_date: Optional[datetime] = None        # 计划结束日期
    manual_start: bool = False  # 是否手动设定开始日期
    manual_end: bool = False    # 是否手动设定结束日期
    actual_start: Optional[datetime] = None    # 实际开始日期
    actual_end: Optional[datetime] = None      # 实际结束日期
    excluded: bool = False      # 是否被排除（不参与排期和Excel生成）
    # 进度跟踪字段
    progress: int = 0                                      # 当前完成百分比 (0-100)
    status: TaskStatus = TaskStatus.NOT_STARTED            # 当前状态
    progress_history: List[str] = field(default_factory=list)  # 进度记录ID列表

    def to_dict(self) -> dict:
        """转换为字典"""
        result = {
            "milestone": self.milestone,
            "task_no": self.task_no,
            "name": self.name,
            "duration": self.duration,
            "owner": self.owner,
            "predecessor": self.predecessor
        }
        # 保存手动设定的日期
        if self.manual_start and self.start_date:
            result["start_date"] = self.start_date.strftime("%Y-%m-%d")
            result["manual_start"] = True
        if self.manual_end and self.end_date:
            result["end_date"] = self.end_date.strftime("%Y-%m-%d")
            result["manual_end"] = True
        # 保存实际日期
        if self.actual_start:
            result["actual_start"] = self.actual_start.strftime("%Y-%m-%d")
        if self.actual_end:
            result["actual_end"] = self.actual_end.strftime("%Y-%m-%d")
        # 保存排除状态
        if self.excluded:
            result["excluded"] = True
        # 保存进度跟踪字段
        result["progress"] = self.progress
        result["status"] = self.status.value
        if self.progress_history:
            result["progress_history"] = self.progress_history
        return result

    @classmethod
    def from_dict(cls, data: dict) -> 'Task':
        """从字典创建"""
        task = cls(
            milestone=data.get("milestone", ""),
            task_no=data.get("task_no", ""),
            name=data.get("name", ""),
            duration=data.get("duration", 1),
            owner=data.get("owner", ""),
            predecessor=data.get("predecessor", "")
        )
        # 加载手动设定的日期
        if data.get("manual_start") and data.get("start_date"):
            task.start_date = datetime.strptime(data["start_date"], "%Y-%m-%d")
            task.manual_start = True
        if data.get("manual_end") and data.get("end_date"):
            task.end_date = datetime.strptime(data["end_date"], "%Y-%m-%d")
            task.manual_end = True
        # 加载实际日期
        if data.get("actual_start"):
            task.actual_start = datetime.strptime(data["actual_start"], "%Y-%m-%d")
        if data.get("actual_end"):
            task.actual_end = datetime.strptime(data["actual_end"], "%Y-%m-%d")
        # 加载排除状态
        task.excluded = data.get("excluded", False)
        # 加载进度跟踪字段
        task.progress = data.get("progress", 0)
        status_str = data.get("status", "未开始")
        try:
            task.status = TaskStatus(status_str)
        except ValueError:
            task.status = TaskStatus.NOT_STARTED
        task.progress_history = data.get("progress_history", [])
        return task


class Scheduler:
    """日期调度器 - 计算任务日期"""

    # 中国法定节假日（示例，可从配置加载）
    DEFAULT_HOLIDAYS = {
        # 2025年节假日
        datetime(2025, 1, 1),   # 元旦
        datetime(2025, 1, 28),  # 春节
        datetime(2025, 1, 29),
        datetime(2025, 1, 30),
        datetime(2025, 1, 31),
        datetime(2025, 2, 1),
        datetime(2025, 2, 2),
        datetime(2025, 2, 3),
        datetime(2025, 2, 4),
        datetime(2025, 4, 4),   # 清明
        datetime(2025, 4, 5),
        datetime(2025, 4, 6),
        datetime(2025, 5, 1),   # 劳动节
        datetime(2025, 5, 2),
        datetime(2025, 5, 3),
        datetime(2025, 5, 4),
        datetime(2025, 5, 5),
        datetime(2025, 5, 31),  # 端午
        datetime(2025, 6, 1),
        datetime(2025, 6, 2),
        datetime(2025, 10, 1),  # 国庆
        datetime(2025, 10, 2),
        datetime(2025, 10, 3),
        datetime(2025, 10, 4),
        datetime(2025, 10, 5),
        datetime(2025, 10, 6),
        datetime(2025, 10, 7),
    }

    def __init__(self,
                 exclude_weekends: bool = True,
                 exclude_holidays: bool = False,
                 holidays: Optional[Set[datetime]] = None):
        """
        初始化调度器

        Args:
            exclude_weekends: 是否排除周末
            exclude_holidays: 是否排除节假日
            holidays: 自定义节假日集合
        """
        self.exclude_weekends = exclude_weekends
        self.exclude_holidays = exclude_holidays
        self.holidays = holidays or self.DEFAULT_HOLIDAYS

    def is_workday(self, date: datetime) -> bool:
        """判断是否为工作日"""
        # 检查周末
        if self.exclude_weekends and date.weekday() >= 5:
            return False
        # 检查节假日
        if self.exclude_holidays and date in self.holidays:
            return False
        return True

    def add_workdays(self, start_date: datetime, days: int) -> datetime:
        """
        添加工作日

        Args:
            start_date: 开始日期
            days: 要添加的工作日数量

        Returns:
            结束日期
        """
        if days <= 0:
            return start_date

        current = start_date
        added = 0

        # 如果不排除任何日期，直接计算
        if not self.exclude_weekends and not self.exclude_holidays:
            return start_date + timedelta(days=days - 1)

        # 第一天算作工作日（如果是工作日）
        if self.is_workday(current):
            added = 1

        while added < days:
            current += timedelta(days=1)
            if self.is_workday(current):
                added += 1

        return current

    def subtract_workdays(self, end_date: datetime, days: int) -> datetime:
        """
        从指定日期向前减去工作日

        Args:
            end_date: 结束日期
            days: 工期（工作日数）

        Returns:
            起始日期
        """
        if days <= 0:
            return end_date

        # 快速路径：不排除任何日期
        if not self.exclude_weekends and not self.exclude_holidays:
            return end_date - timedelta(days=days - 1)

        # 标准路径：逐日检查
        current = end_date
        subtracted = 1 if self.is_workday(current) else 0

        while subtracted < days:
            current -= timedelta(days=1)
            if self.is_workday(current):
                subtracted += 1

        return current

    def _build_successor_map(self, tasks: List[Task]) -> dict:
        """
        构建任务的后继者映射（逆向依赖）

        Returns:
            {task_no: [successor_no1, successor_no2, ...]}
        """
        successors = {}
        task_nos = {t.task_no for t in tasks}

        for task in tasks:
            if task.predecessor and task.predecessor in task_nos:
                if task.predecessor not in successors:
                    successors[task.predecessor] = []
                successors[task.predecessor].append(task.task_no)

        return successors

    def calculate_dates_backward(self,
                                  tasks: List[Task],
                                  project_end: datetime) -> List[Task]:
        """
        从项目完成日期倒推，计算所有任务的开始和结束日期

        Args:
            tasks: 任务列表（按原始顺序）
            project_end: 项目完成日期（最后一个任务的结束日期）

        Returns:
            更新日期后的任务列表
        """
        # 第1步：清除非手动设定的日期
        for task in tasks:
            if not task.manual_start:
                task.start_date = None
            if not task.manual_end:
                task.end_date = None

        # 第2步：创建任务编号映射（只包含未排除的任务）
        task_map = {task.task_no: task for task in tasks if not task.excluded}

        # 第3步：构建后继者映射
        successors = self._build_successor_map(tasks)

        # 第4步：反向遍历任务（从后往前）
        for task in reversed(tasks):
            # 跳过被排除的任务
            if task.excluded:
                task.start_date = None
                task.end_date = None
                continue

            # 4a. 确定结束日期
            if task.manual_end and task.end_date:
                pass  # 保留手动设定
            else:
                successors_list = successors.get(task.task_no, [])

                if successors_list:
                    # 有后继任务：在最早的后继任务之前结束
                    min_successor_start = None
                    for succ_no in successors_list:
                        succ = task_map.get(succ_no)
                        if succ and succ.start_date:
                            if min_successor_start is None or succ.start_date < min_successor_start:
                                min_successor_start = succ.start_date

                    if min_successor_start:
                        # 后继任务开始日期的前一个工作日
                        prev_day = min_successor_start - timedelta(days=1)
                        while not self.is_workday(prev_day):
                            prev_day -= timedelta(days=1)
                        task.end_date = prev_day
                    else:
                        task.end_date = project_end
                else:
                    # 无后继者：使用项目完成日期
                    task.end_date = project_end

            # 4b. 确保结束日期是工作日
            if not task.manual_end and task.end_date:
                while not self.is_workday(task.end_date):
                    task.end_date -= timedelta(days=1)

            # 4c. 根据结束日期和工期计算开始日期
            if task.manual_start and task.start_date:
                pass  # 保留手动设定
            elif task.end_date:
                task.start_date = self.subtract_workdays(task.end_date, task.duration)

        return tasks

    def calculate_dates(self,
                       tasks: List[Task],
                       project_start: datetime) -> List[Task]:
        """
        计算所有任务的开始和结束日期

        Args:
            tasks: 任务列表
            project_start: 项目开始日期

        Returns:
            更新日期后的任务列表
        """
        # 先清除非手动设定的日期，确保重新计算
        for task in tasks:
            if not task.manual_start:
                task.start_date = None
            if not task.manual_end:
                task.end_date = None

        # 创建任务编号到任务的映射（只包含未排除的任务）
        task_map = {task.task_no: task for task in tasks if not task.excluded}

        # 按顺序处理任务
        for task in tasks:
            # 跳过被排除的任务
            if task.excluded:
                task.start_date = None
                task.end_date = None
                continue

            # 如果开始日期是手动设定的，保留它
            if task.manual_start and task.start_date:
                pass  # 保留手动设定的开始日期
            elif task.predecessor and task.predecessor in task_map:
                # 有前置任务：在前置任务结束后开始
                pred = task_map[task.predecessor]
                if pred.end_date:
                    # 前置任务结束后的下一个工作日开始
                    next_day = pred.end_date + timedelta(days=1)
                    while not self.is_workday(next_day):
                        next_day += timedelta(days=1)
                    task.start_date = next_day
                else:
                    # 前置任务还没计算，使用项目开始日期
                    task.start_date = project_start
            else:
                # 无前置任务或前置任务不存在
                if task.start_date is None:
                    # 查找同里程碑的上一个任务
                    prev_task = self._find_previous_task(tasks, task)
                    if prev_task and prev_task.end_date:
                        next_day = prev_task.end_date + timedelta(days=1)
                        while not self.is_workday(next_day):
                            next_day += timedelta(days=1)
                        task.start_date = next_day
                    else:
                        task.start_date = project_start

            # 确保开始日期是工作日（仅对非手动设定的日期）
            if not task.manual_start:
                while not self.is_workday(task.start_date):
                    task.start_date += timedelta(days=1)

            # 计算结束日期（如果不是手动设定）
            if task.manual_end and task.end_date:
                pass  # 保留手动设定的结束日期
            else:
                task.end_date = self.add_workdays(task.start_date, task.duration)

        return tasks

    def _find_previous_task(self, tasks: List[Task], current: Task) -> Optional[Task]:
        """查找当前任务之前的任务（跳过排除的任务）"""
        prev = None
        for task in tasks:
            if task.task_no == current.task_no:
                break
            # 跳过排除的任务
            if not task.excluded:
                prev = task
        return prev

    def get_workdays_between(self, start: datetime, end: datetime) -> int:
        """计算两个日期之间的工作日数量"""
        if start > end:
            return 0

        count = 0
        current = start
        while current <= end:
            if self.is_workday(current):
                count += 1
            current += timedelta(days=1)
        return count
