/**
 * 甘特图对话框组件
 * 可视化显示任务的时间安排和进度
 */

import { useState, useMemo } from 'react';
import {
  parseISO,
  differenceInDays,
  format,
  eachDayOfInterval,
  isValid,
  isWeekend,
  getDate,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Task } from '../types/task';

interface GanttChartDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onEditTask?: (task: Task) => void;
}

interface GanttTask extends Task {
  startPos: number;  // 起始位置百分比
  width: number;     // 宽度百分比
  progressWidth: number;  // 进度宽度百分比
}

interface GroupedTasks {
  milestone: string;
  tasks: GanttTask[];
  isExpanded: boolean;
}

export function GanttChartDialog({
  isOpen,
  onClose,
  tasks,
  onEditTask,
}: GanttChartDialogProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<string>('all');
  const [selectedPerson, setSelectedPerson] = useState<string>('all');
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  // 获取所有里程碑列表
  const milestones = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.milestone) set.add(t.milestone);
    });
    return Array.from(set);
  }, [tasks]);

  // 获取所有人员列表（从 responsible 字段收集）
  const personnel = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.responsible && t.responsible.length > 0) {
        t.responsible.forEach((p) => set.add(p));
      }
    });
    return Array.from(set).sort();
  }, [tasks]);

  // 初始化时展开所有里程碑
  useMemo(() => {
    if (expandedMilestones.size === 0 && milestones.length > 0) {
      setExpandedMilestones(new Set(milestones));
    }
  }, [milestones]);

  // 过滤有效任务（有排期数据的）
  const validTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.excluded) return false;
      if (!t.start_date || !t.end_date) return false;
      const start = parseISO(t.start_date);
      const end = parseISO(t.end_date);
      return isValid(start) && isValid(end);
    });
  }, [tasks]);

  // 按里程碑和人员筛选
  const filteredTasks = useMemo(() => {
    let result = validTasks;

    // 按里程碑筛选
    if (selectedMilestone !== 'all') {
      result = result.filter((t) => t.milestone === selectedMilestone);
    }

    // 按人员筛选
    if (selectedPerson !== 'all') {
      result = result.filter((t) =>
        t.responsible && t.responsible.includes(selectedPerson)
      );
    }

    return result;
  }, [validTasks, selectedMilestone, selectedPerson]);

  // 计算日期范围
  const dateRange = useMemo(() => {
    if (filteredTasks.length === 0) {
      return { start: new Date(), end: new Date(), totalDays: 0 };
    }

    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    filteredTasks.forEach((t) => {
      const start = parseISO(t.start_date!);
      const end = parseISO(t.end_date!);

      if (!minDate || start < minDate) minDate = start;
      if (!maxDate || end > maxDate) maxDate = end;
    });

    const totalDays = differenceInDays(maxDate!, minDate!) + 1;

    return { start: minDate!, end: maxDate!, totalDays };
  }, [filteredTasks]);

  // 生成天刻度
  const days = useMemo(() => {
    if (dateRange.totalDays === 0) return [];

    return eachDayOfInterval({
      start: dateRange.start,
      end: dateRange.end,
    }).map((day) => ({
      date: day,
      dayOfMonth: getDate(day),
      month: format(day, 'M月', { locale: zhCN }),
      isWeekend: isWeekend(day),
      isFirstOfMonth: getDate(day) === 1,
    }));
  }, [dateRange]);

  // 计算任务位置和宽度
  const ganttTasks = useMemo((): GanttTask[] => {
    if (dateRange.totalDays === 0) return [];

    return filteredTasks.map((task) => {
      const taskStart = parseISO(task.start_date!);
      const taskEnd = parseISO(task.end_date!);

      const startOffset = differenceInDays(taskStart, dateRange.start);
      const duration = differenceInDays(taskEnd, taskStart) + 1;

      const startPos = (startOffset / dateRange.totalDays) * 100;
      const width = (duration / dateRange.totalDays) * 100;
      const progressWidth = (task.progress / 100) * width;

      return {
        ...task,
        startPos: Math.max(0, startPos),
        width: Math.min(width, 100 - startPos),
        progressWidth,
      };
    });
  }, [filteredTasks, dateRange]);

  // 按里程碑分组
  const groupedTasks = useMemo((): GroupedTasks[] => {
    const groups: Map<string, GanttTask[]> = new Map();

    ganttTasks.forEach((task) => {
      const milestone = task.milestone || '未分类';
      if (!groups.has(milestone)) {
        groups.set(milestone, []);
      }
      groups.get(milestone)!.push(task);
    });

    return Array.from(groups.entries()).map(([milestone, tasks]) => ({
      milestone,
      tasks,
      isExpanded: expandedMilestones.has(milestone),
    }));
  }, [ganttTasks, expandedMilestones]);

  // 切换里程碑展开状态
  const toggleMilestone = (milestone: string) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(milestone)) {
        next.delete(milestone);
      } else {
        next.add(milestone);
      }
      return next;
    });
  };

  // 获取状态颜色（使用内联样式确保颜色显示）
  const getStatusColor = (status: string): string => {
    switch (status) {
      case '已完成':
        return '#22c55e'; // green-500
      case '进行中':
        return '#3b82f6'; // blue-500
      case '暂停':
        return '#eab308'; // yellow-500
      default:
        return '#9ca3af'; // gray-400
    }
  };

  // 获取进度颜色
  const getProgressColor = (status: string): string => {
    if (status === '已完成') return '#16a34a'; // green-600
    return '#4ade80'; // green-400
  };

  if (!isOpen) return null;

  const hasData = validTasks.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold">甘特图</h2>
            {hasData && (
              <span className="text-sm text-gray-500">
                显示范围: {format(dateRange.start, 'yyyy-MM-dd')} ~ {format(dateRange.end, 'yyyy-MM-dd')}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200"
          >
            ×
          </button>
        </div>

        {/* 筛选栏 */}
        {hasData && (
          <div className="p-3 border-b bg-gray-50 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">里程碑:</label>
            <select
              value={selectedMilestone}
              onChange={(e) => setSelectedMilestone(e.target.value)}
              className="px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">全部</option>
              {milestones.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <label className="text-sm font-medium text-gray-700 ml-2">负责人:</label>
            <select
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              className="px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">全部</option>
              {personnel.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <div className="flex-1" />
            {/* 图例 */}
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-500 rounded"></span>
                <span>计划</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-400 rounded"></span>
                <span>进度</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500 rounded"></span>
                <span>已完成</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-500 rounded"></span>
                <span>暂停</span>
              </span>
            </div>
          </div>
        )}

        {/* 主内容区 */}
        <div className="flex-1 overflow-auto">
          {!hasData ? (
            /* 空状态 */
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <svg
                className="w-16 h-16 mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-lg font-medium mb-2">暂无排期数据</p>
              <p className="text-sm">请先为任务设置开始日期和结束日期</p>
            </div>
          ) : (
            /* 甘特图主体 */
            <div style={{ minWidth: `${272 + days.length * 24}px` }}>
              {/* 时间轴头部 */}
              <div className="flex border-b bg-gray-100 sticky top-0 z-10">
                {/* 任务名称列头 */}
                <div className="w-48 flex-shrink-0 px-3 py-2 font-medium text-sm border-r bg-gray-100">
                  任务
                </div>
                {/* 负责人列头 */}
                <div className="w-20 flex-shrink-0 px-2 py-2 font-medium text-sm border-r bg-gray-100">
                  负责人
                </div>
                {/* 时间刻度 - 按天显示 */}
                <div className="flex" style={{ width: `${days.length * 24}px` }}>
                  {days.map((day, i) => (
                    <div
                      key={i}
                      className={`text-center text-xs py-1 border-r border-gray-200 w-6 ${
                        day.isWeekend ? 'bg-gray-200' : ''
                      }`}
                    >
                      {/* 月份：只在每月1日或第一天显示 */}
                      <div className="text-gray-400 text-[10px] leading-tight h-3">
                        {(day.isFirstOfMonth || i === 0) ? day.month : ''}
                      </div>
                      {/* 日期 */}
                      <div className={`font-medium leading-tight ${day.isWeekend ? 'text-gray-500' : ''}`}>
                        {day.dayOfMonth}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 任务列表 */}
              <div>
                {groupedTasks.map((group) => (
                  <div key={group.milestone}>
                    {/* 里程碑分组头 */}
                    <div
                      className="flex border-b bg-gray-50 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleMilestone(group.milestone)}
                    >
                      <div className="w-48 flex-shrink-0 px-3 py-2 font-medium text-sm border-r flex items-center gap-2">
                        <span
                          className={`transform transition-transform text-xs ${
                            group.isExpanded ? 'rotate-90' : ''
                          }`}
                        >
                          ▶
                        </span>
                        <span>{group.milestone}</span>
                        <span className="text-gray-400 text-xs">
                          ({group.tasks.length})
                        </span>
                      </div>
                      <div className="w-20 flex-shrink-0 border-r" />
                      <div style={{ width: `${days.length * 24}px` }} />
                    </div>

                    {/* 里程碑下的任务 */}
                    {group.isExpanded &&
                      group.tasks.map((task) => (
                        <div
                          key={`${task.task_no}-${task.index}`}
                          className={`flex border-b hover:bg-blue-50 group ${onEditTask ? 'cursor-pointer' : ''}`}
                          onClick={() => onEditTask?.(task)}
                          title="点击编辑任务"
                        >
                          {/* 任务名称 */}
                          <div
                            className="w-48 flex-shrink-0 px-3 py-2 text-sm border-r truncate"
                            title={`${task.task_no} ${task.name}`}
                          >
                            <span className="text-gray-500 mr-1">
                              {task.task_no}
                            </span>
                            {task.name}
                          </div>

                          {/* 负责人 */}
                          <div
                            className="w-20 flex-shrink-0 px-2 py-2 text-xs border-r truncate text-gray-600"
                            title={task.responsible?.join(', ') || '-'}
                          >
                            {task.responsible?.length > 0
                              ? task.responsible.join(', ')
                              : '-'}
                          </div>

                          {/* 甘特条 */}
                          <div className="relative h-10" style={{ width: `${days.length * 24}px` }}>
                            {/* 天分隔线 */}
                            <div className="absolute inset-0 flex pointer-events-none">
                              {days.map((day, i) => (
                                <div
                                  key={i}
                                  className={`w-6 border-r border-gray-100 ${
                                    day.isWeekend ? 'bg-gray-50' : ''
                                  }`}
                                />
                              ))}
                            </div>

                            {/* 任务条 */}
                            <div
                              className="absolute top-2 h-6 rounded opacity-80 group-hover:opacity-100 transition-opacity"
                              style={{
                                left: `${task.startPos}%`,
                                width: `${task.width}%`,
                                minWidth: '4px',
                                backgroundColor: getStatusColor(task.status),
                              }}
                              title={`${task.task_no} ${task.name}
计划: ${task.start_date} ~ ${task.end_date}
进度: ${task.progress}%
状态: ${task.status}
负责人: ${task.responsible?.join(', ') || '-'}`}
                            >
                              {/* 进度填充 */}
                              {task.progress > 0 && task.status !== '已完成' && (
                                <div
                                  className="absolute inset-y-0 left-0 rounded-l"
                                  style={{
                                    width: `${task.progress}%`,
                                    backgroundColor: getProgressColor(task.status),
                                  }}
                                />
                              )}

                              {/* 进度文字 */}
                              {task.width > 5 && (
                                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                                  {task.progress}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部统计 */}
        {hasData && (
          <div className="p-3 border-t bg-gray-50 text-sm text-gray-600 flex justify-between">
            <span>
              共 {filteredTasks.length} 个任务
              {selectedMilestone !== 'all' && ` · ${selectedMilestone}`}
              {selectedPerson !== 'all' && ` · ${selectedPerson}`}
            </span>
            <span>
              平均进度:{' '}
              {Math.round(
                filteredTasks.reduce((sum, t) => sum + t.progress, 0) /
                  filteredTasks.length
              )}
              %
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
