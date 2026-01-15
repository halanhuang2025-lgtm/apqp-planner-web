"""
CSV 导入导出模块 - 支持CSV格式的任务数据导入导出
"""

import csv
import re
from datetime import datetime
from typing import List, Optional

from .scheduler import Task


class CsvHandler:
    """CSV文件导入导出处理器"""

    # CSV列名定义
    COLUMNS = [
        "里程碑", "编号", "任务名称", "工期", "主责人",
        "前置任务", "计划开始", "计划结束", "实际开始", "实际结束", "排除"
    ]

    @staticmethod
    def import_csv(filepath: str) -> List[Task]:
        """
        从CSV文件导入任务列表

        Args:
            filepath: CSV文件路径

        Returns:
            任务列表

        Raises:
            ValueError: 文件格式错误
            FileNotFoundError: 文件不存在
        """
        tasks = []

        with open(filepath, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)

            for row_num, row in enumerate(reader, start=2):
                try:
                    # 解析工期
                    duration_str = row.get('工期', '1').strip()
                    try:
                        duration = int(duration_str)
                    except ValueError:
                        duration = 1

                    # 创建任务对象
                    task = Task(
                        milestone=row.get('里程碑', '').strip(),
                        task_no=row.get('编号', '').strip(),
                        name=row.get('任务名称', '').strip(),
                        duration=duration,
                        owner=row.get('主责人', '').strip(),
                        predecessor=row.get('前置任务', '').strip()
                    )

                    # 解析计划开始日期
                    plan_start = row.get('计划开始', '').strip()
                    if plan_start:
                        task.start_date = CsvHandler._parse_date(plan_start)
                        task.manual_start = True

                    # 解析计划结束日期
                    plan_end = row.get('计划结束', '').strip()
                    if plan_end:
                        task.end_date = CsvHandler._parse_date(plan_end)
                        task.manual_end = True

                    # 解析实际开始日期
                    actual_start = row.get('实际开始', '').strip()
                    if actual_start:
                        task.actual_start = CsvHandler._parse_date(actual_start)

                    # 解析实际结束日期
                    actual_end = row.get('实际结束', '').strip()
                    if actual_end:
                        task.actual_end = CsvHandler._parse_date(actual_end)

                    # 解析排除状态
                    excluded_str = row.get('排除', '').strip().lower()
                    task.excluded = excluded_str in ('是', 'yes', 'true', '1', 'y')

                    tasks.append(task)

                except Exception as e:
                    raise ValueError(f"第{row_num}行数据格式错误: {str(e)}")

        return tasks

    @staticmethod
    def export_csv(tasks: List[Task], filepath: str) -> None:
        """
        导出任务列表到CSV文件

        Args:
            tasks: 任务列表
            filepath: 输出文件路径
        """
        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)

            # 写入表头
            writer.writerow(CsvHandler.COLUMNS)

            # 写入数据行
            for task in tasks:
                row = [
                    task.milestone,
                    task.task_no,
                    task.name,
                    task.duration,
                    task.owner,
                    task.predecessor or '',
                    task.start_date.strftime('%Y-%m-%d') if task.start_date else '',
                    task.end_date.strftime('%Y-%m-%d') if task.end_date else '',
                    task.actual_start.strftime('%Y-%m-%d') if task.actual_start else '',
                    task.actual_end.strftime('%Y-%m-%d') if task.actual_end else '',
                    '是' if task.excluded else '',
                ]
                writer.writerow(row)

    @staticmethod
    def _parse_date(date_str: str) -> datetime:
        """
        解析日期字符串，支持多种格式

        Args:
            date_str: 日期字符串

        Returns:
            datetime对象

        Raises:
            ValueError: 无法解析的日期格式
        """
        # 支持的日期格式
        formats = [
            '%Y-%m-%d',      # 2025-01-13
            '%Y/%m/%d',      # 2025/01/13
            '%Y.%m.%d',      # 2025.01.13
            '%m/%d/%Y',      # 01/13/2025
            '%d/%m/%Y',      # 13/01/2025
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue

        raise ValueError(f"无法解析日期: {date_str}")

    @staticmethod
    def sort_tasks(tasks: List[Task], sort_by: str = "none") -> List[Task]:
        """
        对任务列表进行排序

        Args:
            tasks: 任务列表
            sort_by: 排序方式
                - "none": 不排序，保持原有顺序
                - "predecessor": 按前置任务编号排序
                - "start_date": 按开始日期排序
                - "task_no": 按任务编号排序

        Returns:
            排序后的任务列表
        """
        if not tasks or sort_by == "none":
            return tasks

        if sort_by == "predecessor":
            return CsvHandler._sort_by_predecessor(tasks)
        elif sort_by == "start_date":
            return CsvHandler._sort_by_date(tasks)
        elif sort_by == "task_no":
            return CsvHandler._sort_by_task_no(tasks)
        else:
            return tasks

    @staticmethod
    def _parse_task_no(task_no: str) -> tuple:
        """
        解析任务编号为可比较的元组
        例如: "1.2" -> (1, 2), "2.10" -> (2, 10), "1.2.3" -> (1, 2, 3)
        """
        if not task_no:
            return (float('inf'),)  # 空编号排到最后

        parts = []
        for part in task_no.split('.'):
            try:
                parts.append(int(part))
            except ValueError:
                # 非数字部分按字符串处理
                parts.append(part)
        return tuple(parts) if parts else (float('inf'),)

    @staticmethod
    def _sort_by_task_no(tasks: List[Task]) -> List[Task]:
        """按任务编号排序"""
        return sorted(tasks, key=lambda t: CsvHandler._parse_task_no(t.task_no))

    @staticmethod
    def _sort_by_predecessor(tasks: List[Task]) -> List[Task]:
        """
        按前置任务依赖关系排序（拓扑排序）
        确保前置任务总是在依赖它的任务之前
        """
        if not tasks:
            return tasks

        # 创建任务编号到任务的映射
        task_map = {t.task_no: t for t in tasks if t.task_no}

        # 创建依赖关系图
        # dependencies[task_no] = set of task_nos that this task depends on
        dependencies = {}
        for task in tasks:
            deps = set()
            if task.predecessor:
                # 前置任务可能是逗号分隔的多个编号
                for pred in re.split(r'[,，、\s]+', task.predecessor):
                    pred = pred.strip()
                    if pred and pred in task_map:
                        deps.add(pred)
            dependencies[task.task_no] = deps

        # 拓扑排序
        sorted_tasks = []
        visited = set()
        temp_visited = set()

        def visit(task_no: str):
            if task_no in temp_visited:
                # 检测到循环依赖，跳过
                return
            if task_no in visited:
                return

            temp_visited.add(task_no)

            # 先访问所有前置任务
            for dep in dependencies.get(task_no, set()):
                if dep in task_map:
                    visit(dep)

            temp_visited.remove(task_no)
            visited.add(task_no)

            if task_no in task_map:
                sorted_tasks.append(task_map[task_no])

        # 按任务编号顺序开始访问
        for task in sorted(tasks, key=lambda t: CsvHandler._parse_task_no(t.task_no)):
            if task.task_no and task.task_no not in visited:
                visit(task.task_no)

        # 添加没有编号的任务
        for task in tasks:
            if not task.task_no or task not in sorted_tasks:
                sorted_tasks.append(task)

        return sorted_tasks

    @staticmethod
    def _sort_by_date(tasks: List[Task]) -> List[Task]:
        """按开始日期排序（无日期的排到最后）"""
        def date_key(task: Task):
            if task.start_date:
                return (0, task.start_date)
            elif task.actual_start:
                return (1, task.actual_start)
            else:
                return (2, datetime.max)

        return sorted(tasks, key=date_key)

    @staticmethod
    def clear_manual_dates(tasks: List[Task]) -> List[Task]:
        """
        清除所有任务的手动日期标志

        让调度器能够根据工期和前置任务重新计算所有日期

        Args:
            tasks: 任务列表

        Returns:
            处理后的任务列表（原地修改）
        """
        for task in tasks:
            task.manual_start = False
            task.manual_end = False
            task.start_date = None
            task.end_date = None
            # 保留实际日期不变
        return tasks
