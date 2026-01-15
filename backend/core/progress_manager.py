"""
进度记录管理模块 - 处理进度记录的存储和查询
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict
from .scheduler import Task, ProgressRecord, TaskStatus


class ProgressManager:
    """进度记录管理器"""

    def __init__(self):
        self.records: Dict[str, ProgressRecord] = {}  # record_id -> ProgressRecord

    def add_record(self, task: Task, progress: int, status: TaskStatus,
                   note: str = "", issues: str = "",
                   record_date: Optional[datetime] = None) -> ProgressRecord:
        """
        为任务添加进度记录

        Args:
            task: 任务对象
            progress: 完成百分比
            status: 任务状态
            note: 备注
            issues: 问题
            record_date: 记录日期（默认今天）

        Returns:
            创建的进度记录
        """
        record = ProgressRecord(
            record_id=f"rec_{uuid.uuid4().hex[:8]}",
            task_no=task.task_no,
            record_date=record_date or datetime.now(),
            progress=progress,
            status=status,
            note=note,
            issues=issues
        )

        self.records[record.record_id] = record

        # 更新任务的当前进度和状态
        task.progress = progress
        task.status = status
        task.progress_history.append(record.record_id)

        # 根据状态自动更新实际日期
        if status == TaskStatus.IN_PROGRESS and task.actual_start is None:
            task.actual_start = record.record_date
        elif status == TaskStatus.COMPLETED:
            if task.actual_start is None:
                task.actual_start = record.record_date
            if task.actual_end is None:
                task.actual_end = record.record_date

        return record

    def get_record(self, record_id: str) -> Optional[ProgressRecord]:
        """根据ID获取进度记录"""
        return self.records.get(record_id)

    def get_task_history(self, task_no: str) -> List[ProgressRecord]:
        """获取任务的进度历史记录（按日期排序）"""
        records = [r for r in self.records.values() if r.task_no == task_no]
        return sorted(records, key=lambda r: (r.record_date, r.created_at or r.record_date))

    def get_records_by_date(self, date: datetime) -> List[ProgressRecord]:
        """获取指定日期的所有进度记录"""
        target_date = date.date()
        return [r for r in self.records.values()
                if r.record_date.date() == target_date]

    def get_latest_record(self, task_no: str) -> Optional[ProgressRecord]:
        """获取任务的最新进度记录"""
        history = self.get_task_history(task_no)
        return history[-1] if history else None

    def delete_record(self, record_id: str) -> bool:
        """删除进度记录"""
        if record_id in self.records:
            del self.records[record_id]
            return True
        return False

    def clear(self):
        """清空所有记录"""
        self.records.clear()

    def to_list(self) -> List[dict]:
        """转换为字典列表（用于JSON存储）"""
        return [r.to_dict() for r in self.records.values()]

    def from_list(self, data: List[dict]) -> None:
        """从字典列表加载（用于JSON读取）"""
        self.records.clear()
        for item in data:
            try:
                record = ProgressRecord.from_dict(item)
                self.records[record.record_id] = record
            except (KeyError, ValueError) as e:
                print(f"加载进度记录失败: {e}")

    def sync_task_history(self, tasks: List[Task]):
        """
        同步任务的进度历史列表
        确保任务的 progress_history 中的记录ID在管理器中都存在
        """
        valid_ids = set(self.records.keys())
        for task in tasks:
            # 过滤掉不存在的记录ID
            task.progress_history = [
                rid for rid in task.progress_history if rid in valid_ids
            ]
