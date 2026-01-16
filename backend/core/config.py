"""
配置管理模块 - 处理任务配置的保存和加载
"""

import json
import os
from typing import List, Optional
from datetime import datetime
from pathlib import Path

from .scheduler import Task
from .progress_manager import ProgressManager


class ConfigManager:
    """配置管理器"""

    def __init__(self, config_dir: Optional[str] = None):
        """
        初始化配置管理器

        Args:
            config_dir: 配置文件目录，默认为用户目录下的 .apqp_planner
        """
        if config_dir:
            self.config_dir = Path(config_dir)
        else:
            self.config_dir = Path.home() / ".apqp_planner"

        # 确保目录存在
        self.config_dir.mkdir(parents=True, exist_ok=True)

    def save_tasks(self, tasks: List[Task], filename: str,
                   progress_manager: Optional[ProgressManager] = None) -> str:
        """
        保存任务配置到文件

        Args:
            tasks: 任务列表
            filename: 文件名（不含路径）
            progress_manager: 进度管理器（可选）

        Returns:
            保存的文件完整路径
        """
        if not filename.endswith('.json'):
            filename += '.json'

        filepath = self.config_dir / filename

        data = {
            "version": "2.0",
            "created_at": datetime.now().isoformat(),
            "tasks": [task.to_dict() for task in tasks]
        }

        # 保存进度记录
        if progress_manager:
            data["progress_records"] = progress_manager.to_list()

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return str(filepath)

    def load_tasks(self, filepath: str,
                   progress_manager: Optional[ProgressManager] = None) -> List[Task]:
        """
        从文件加载任务配置

        Args:
            filepath: 配置文件路径
            progress_manager: 进度管理器（可选，用于加载进度记录）

        Returns:
            任务列表
        """
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        tasks = []
        for task_data in data.get("tasks", []):
            tasks.append(Task.from_dict(task_data))

        # 加载进度记录
        if progress_manager and "progress_records" in data:
            progress_manager.from_list(data["progress_records"])
            # 同步任务的进度历史
            progress_manager.sync_task_history(tasks)

        return tasks

    def list_configs(self) -> List[str]:
        """
        列出所有配置文件

        Returns:
            配置文件路径列表
        """
        configs = []
        for f in self.config_dir.glob("*.json"):
            configs.append(str(f))
        return sorted(configs)

    def save_to_path(self, tasks: List[Task], filepath: str,
                     progress_manager: Optional[ProgressManager] = None,
                     milestones: Optional[List[str]] = None) -> None:
        """
        保存任务配置到指定路径

        Args:
            tasks: 任务列表
            filepath: 完整文件路径
            progress_manager: 进度管理器（可选）
            milestones: 里程碑列表（可选）
        """
        data = {
            "version": "2.1",
            "created_at": datetime.now().isoformat(),
            "tasks": [task.to_dict() for task in tasks]
        }

        # 保存进度记录
        if progress_manager:
            data["progress_records"] = progress_manager.to_list()

        # 保存里程碑
        if milestones:
            data["milestones"] = milestones

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load_milestones(self, filepath: str) -> Optional[List[str]]:
        """从文件加载里程碑列表"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data.get("milestones")
        except Exception:
            return None


def get_template_path() -> str:
    """获取模板文件路径"""
    # 模板文件在 templates 目录下
    current_dir = Path(__file__).parent.parent
    return str(current_dir / "templates" / "apqp_tasks.json")


def load_template_tasks() -> List[Task]:
    """加载 APQP 标准任务模板"""
    template_path = get_template_path()

    if os.path.exists(template_path):
        manager = ConfigManager()
        return manager.load_tasks(template_path)

    # 如果模板文件不存在，返回内置模板
    return get_builtin_template()


def get_builtin_template() -> List[Task]:
    """获取内置的 APQP 任务模板"""
    template_data = [
        ("概念设计", "1.1", "需求评审和项目启动", 2, "项目经理", ""),
        ("概念设计", "1.2", "设计构思（#1 of 3)", 5, "设计工程师", "1.1"),
        ("概念设计", "1.3", "团队评估设计构思（#1 of 3)", 1, "设计团队", "1.2"),
        ("概念设计", "1.4", "制造和评估概念模型", 4, "设计工程师", "1.3"),
        ("概念设计", "1.5", "制造最初设计（#2 of 3)", 5, "设计工程师", "1.4"),
        ("概念设计", "1.6", "团队评估设计构思（#2 of 3)", 1, "设计团队", "1.5"),
        ("概念设计", "1.7", "用户研究（或客户评估和确认）", 5, "市场部", "1.6"),
        ("概念设计", "1.8", "建立3D评估模型", 5, "设计工程师", "1.7"),
        ("概念设计", "1.9", "团队全方位设计评估", 1, "设计团队", "1.8"),

        ("选供应商报价", "2.1", "创建产品规格书", 1, "设计工程师", "1.9"),
        ("选供应商报价", "2.2", "选择关键零部件供应商", 3, "采购", "2.1"),
        ("选供应商报价", "2.3", "产品报价", 5, "成本工程师", "2.2"),
        ("选供应商报价", "2.4", "产品报价客户批准", 5, "市场部", "2.3"),
        ("选供应商报价", "2.5", "第二轮报价（如果需要）", 5, "成本工程师", "2.4"),

        ("评审", "3.1", "准备设计评审一", 1, "项目经理", "2.5"),
        ("评审", "3.2", "设计评审一", 1, "设计团队", "3.1"),

        ("定案", "4.1", "最终设计意图（#3 of 3）", 5, "设计工程师", "3.2"),
        ("定案", "4.2", "团队评估设计意图（#3 of 3)", 1, "设计团队", "4.1"),

        ("设计定案", "5.1", "创建产品设计图纸CAD", 10, "设计工程师", "4.2"),
        ("设计定案", "5.2", "创建产品零件清单BOM", 3, "设计工程师", "5.1"),
        ("设计定案", "5.3", "制造功能样板一", 10, "样板车间", "5.2"),
        ("设计定案", "5.4", "测试和评估功能样板一", 5, "测试工程师", "5.3"),
        ("设计定案", "5.5", "做DFMEA", 5, "质量工程师", "5.4"),
        ("设计定案", "5.6", "做测试计划", 3, "测试工程师", "5.5"),
        ("设计定案", "5.7", "准备设计评审二", 1, "项目经理", "5.6"),
        ("设计定案", "5.8", "设计评审二", 1, "设计团队", "5.7"),

        ("模具样板", "6.1", "收到客户模具订单", 1, "市场部", "5.8"),
        ("模具样板", "6.2", "制造模具", 30, "模具供应商", "6.1"),
        ("模具样板", "6.3", "装配第一次出模样板", 3, "样板车间", "6.2"),
        ("模具样板", "6.4", "测试评估第一次出模样板", 5, "测试工程师", "6.3"),
        ("模具样板", "6.5", "模具修改", 10, "模具供应商", "6.4"),
        ("模具样板", "6.6", "装配工程样板（EB）", 5, "样板车间", "6.5"),
        ("模具样板", "6.7", "测试和评估工程样板", 5, "测试工程师", "6.6"),

        ("验证测试", "7.1", "寿命测试", 20, "测试工程师", "6.7"),
        ("验证测试", "8.1", "认证测试", 15, "认证机构", "7.1"),
        ("验证测试", "9.1", "现场使用测试", 30, "客户", "8.1"),

        ("量产准备", "10.1", "包装设计", 5, "包装工程师", "9.1"),
        ("量产准备", "10.2", "包装运输测试", 3, "测试工程师", "10.1"),
        ("量产准备", "11.1", "第二次专利评审", 2, "法务", "10.2"),
        ("量产准备", "12.1", "第三次设计评审", 1, "设计团队", "11.1"),
        ("量产准备", "13.1", "创建PPAP相关文件", 10, "质量工程师", "12.1"),
        ("量产准备", "13.2", "创建品质控制计划", 5, "质量工程师", "13.1"),
        ("量产准备", "13.3", "创建生产线操作指导书", 5, "工艺工程师", "13.2"),
    ]

    tasks = []
    for milestone, task_no, name, duration, owner, predecessor in template_data:
        tasks.append(Task(
            milestone=milestone,
            task_no=task_no,
            name=name,
            duration=duration,
            owner=owner,
            predecessor=predecessor
        ))

    return tasks
