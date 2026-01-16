/**
 * 任务状态管理 - Zustand Store
 */

import { create } from 'zustand';
import type { Task, ScheduleRequest } from '../types/task';
import * as taskApi from '../api/tasks';
import { useProjectStore } from './projectStore';

interface TaskState {
  // 状态
  tasks: Task[];
  selectedIndices: number[];
  isLoading: boolean;
  error: string | null;

  // 里程碑
  milestones: string[];

  // 排期相关
  scheduleMode: 'forward' | 'backward';
  scheduleDate: string;
  excludeWeekends: boolean;
  excludeHolidays: boolean;
  scheduleSummary: {
    start_date: string;
    end_date: string;
    total_days: number;
  } | null;

  // Actions
  setTasks: (tasks: Task[]) => void;
  setSelectedIndices: (indices: number[]) => void;
  toggleSelect: (index: number, multi?: boolean) => void;
  setScheduleMode: (mode: 'forward' | 'backward') => void;
  setScheduleDate: (date: string) => void;
  setExcludeWeekends: (value: boolean) => void;
  setExcludeHolidays: (value: boolean) => void;

  // API Actions
  fetchTasks: () => Promise<void>;
  loadTemplate: () => Promise<void>;
  addTask: (task: Omit<Task, 'index'>, position?: number) => Promise<void>;
  updateTask: (index: number, task: Omit<Task, 'index'>) => Promise<void>;
  deleteTask: (index: number) => Promise<void>;
  moveTask: (index: number, direction: 'up' | 'down') => Promise<void>;
  toggleExclude: (index: number) => Promise<void>;
  calculateSchedule: () => Promise<void>;

  // 里程碑 Actions
  fetchMilestones: () => Promise<void>;
  addMilestone: (name: string) => Promise<boolean>;
  deleteMilestone: (name: string) => Promise<boolean>;
  updateMilestone: (oldName: string, newName: string) => Promise<boolean>;
  reorderMilestones: (milestones: string[]) => Promise<void>;
}

// 获取今天日期
const today = new Date().toISOString().split('T')[0];

export const useTaskStore = create<TaskState>((set, get) => ({
  // 初始状态
  tasks: [],
  selectedIndices: [],
  isLoading: false,
  error: null,
  milestones: [],
  scheduleMode: 'forward',
  scheduleDate: today,
  excludeWeekends: true,
  excludeHolidays: false,
  scheduleSummary: null,

  // 基本 Actions
  setTasks: (tasks) => set({ tasks }),
  setSelectedIndices: (indices) => set({ selectedIndices: indices }),

  toggleSelect: (index, multi = false) => {
    const { selectedIndices } = get();
    if (multi) {
      // 多选模式
      if (selectedIndices.includes(index)) {
        set({ selectedIndices: selectedIndices.filter(i => i !== index) });
      } else {
        set({ selectedIndices: [...selectedIndices, index] });
      }
    } else {
      // 单选模式
      set({ selectedIndices: [index] });
    }
  },

  setScheduleMode: (mode) => set({ scheduleMode: mode }),
  setScheduleDate: (date) => set({ scheduleDate: date }),
  setExcludeWeekends: (value) => set({ excludeWeekends: value }),
  setExcludeHolidays: (value) => set({ excludeHolidays: value }),

  // API Actions
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await taskApi.getTasks();
      set({ tasks, isLoading: false });
    } catch (error) {
      set({ error: '获取任务列表失败', isLoading: false });
    }
  },

  loadTemplate: async () => {
    set({ isLoading: true, error: null });
    try {
      const { tasks, project, summary } = await taskApi.loadTemplate();

      // 恢复排期设置
      const updates: Partial<TaskState> = {
        tasks,
        isLoading: false,
        selectedIndices: [],
      };

      // 恢复摘要信息（总天数等）
      if (summary) {
        updates.scheduleSummary = summary;
      }

      if (project) {
        if (project.schedule_mode) {
          updates.scheduleMode = project.schedule_mode;
        }
        if (project.schedule_date) {
          updates.scheduleDate = project.schedule_date;
        }
        if (project.exclude_weekends !== undefined) {
          updates.excludeWeekends = project.exclude_weekends;
        }
        if (project.exclude_holidays !== undefined) {
          updates.excludeHolidays = project.exclude_holidays;
        }
      }

      set(updates);
    } catch (error) {
      set({ error: '加载模板失败', isLoading: false });
    }
  },

  addTask: async (task, position) => {
    try {
      const newTask = await taskApi.createTask(task, position);
      const tasks = [...get().tasks];
      if (position !== undefined) {
        tasks.splice(position, 0, newTask);
        // 更新后续任务的索引
        for (let i = position + 1; i < tasks.length; i++) {
          tasks[i] = { ...tasks[i], index: i };
        }
      } else {
        tasks.push(newTask);
      }
      set({ tasks });
    } catch (error) {
      set({ error: '添加任务失败' });
    }
  },

  updateTask: async (index, task) => {
    try {
      const updatedTask = await taskApi.updateTask(index, task);
      const tasks = [...get().tasks];
      tasks[index] = updatedTask;
      set({ tasks });
      // 刷新项目数据以更新 completion_rate（异步执行，不阻塞任务更新）
      useProjectStore.getState().fetchProjects().catch(() => {});
    } catch (error) {
      set({ error: '更新任务失败' });
      throw error; // 重新抛出以便调用方处理
    }
  },

  deleteTask: async (index) => {
    try {
      await taskApi.deleteTask(index);
      const tasks = get().tasks.filter((_, i) => i !== index);
      // 更新索引
      const updatedTasks = tasks.map((t, i) => ({ ...t, index: i }));
      set({ tasks: updatedTasks, selectedIndices: [] });
    } catch (error) {
      set({ error: '删除任务失败' });
    }
  },

  moveTask: async (index, direction) => {
    try {
      const { new_index } = await taskApi.reorderTask(index, direction);
      // 重新获取任务列表以确保顺序正确
      const tasks = await taskApi.getTasks();
      set({ tasks, selectedIndices: [new_index] });
    } catch (error) {
      set({ error: '移动任务失败' });
    }
  },

  toggleExclude: async (index) => {
    try {
      const { excluded } = await taskApi.toggleExclude(index);
      const tasks = [...get().tasks];
      tasks[index] = { ...tasks[index], excluded };
      set({ tasks });
    } catch (error) {
      set({ error: '切换排除状态失败' });
    }
  },

  calculateSchedule: async () => {
    const { scheduleMode, scheduleDate, excludeWeekends, excludeHolidays } = get();

    const request: ScheduleRequest = {
      date: scheduleDate,
      exclude_weekends: excludeWeekends,
      exclude_holidays: excludeHolidays,
    };

    set({ isLoading: true, error: null });

    try {
      const response = scheduleMode === 'forward'
        ? await taskApi.calculateForward(request)
        : await taskApi.calculateBackward(request);

      set({
        tasks: response.tasks,
        scheduleSummary: response.summary,
        isLoading: false,
      });

      // 保存排期设置到项目
      const projectStore = useProjectStore.getState();
      if (projectStore.currentProject) {
        projectStore.updateProject(projectStore.currentProject.id, {
          schedule_mode: scheduleMode,
          schedule_date: scheduleDate,
          exclude_weekends: excludeWeekends,
          exclude_holidays: excludeHolidays,
        });
      }
    } catch (error) {
      set({ error: '计算排期失败', isLoading: false });
    }
  },

  // 里程碑管理
  fetchMilestones: async () => {
    try {
      const milestones = await taskApi.getMilestones();
      set({ milestones });
    } catch (error) {
      console.error('获取里程碑失败:', error);
    }
  },

  addMilestone: async (name) => {
    try {
      const milestones = await taskApi.addMilestone(name);
      set({ milestones });
      return true;
    } catch (error) {
      set({ error: '添加里程碑失败' });
      return false;
    }
  },

  deleteMilestone: async (name) => {
    try {
      const milestones = await taskApi.deleteMilestone(name);
      set({ milestones });
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '删除里程碑失败';
      set({ error: message });
      return false;
    }
  },

  updateMilestone: async (oldName, newName) => {
    try {
      const milestones = await taskApi.updateMilestone(oldName, newName);
      set({ milestones });
      return true;
    } catch (error) {
      set({ error: '更新里程碑失败' });
      return false;
    }
  },

  reorderMilestones: async (milestones) => {
    try {
      const updated = await taskApi.reorderMilestones(milestones);
      set({ milestones: updated });
    } catch (error) {
      set({ error: '重排里程碑失败' });
    }
  },
}));
