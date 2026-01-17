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
  clearAllTasks: () => Promise<void>;
  moveTask: (index: number, direction: 'up' | 'down') => Promise<void>;
  toggleExclude: (index: number) => Promise<void>;
  calculateSchedule: () => Promise<void>;

  // 编号管理
  shiftTaskNumbers: (milestone: string, fromSeq: number) => Promise<void>;
  renumberAllTasks: () => Promise<void>;

  // 里程碑 Actions
  fetchMilestones: () => Promise<void>;
  addMilestone: (name: string) => Promise<boolean>;
  deleteMilestone: (name: string) => Promise<boolean>;
  updateMilestone: (oldName: string, newName: string) => Promise<boolean>;
  reorderMilestones: (milestones: string[]) => Promise<void>;
}

// 获取今天日期
const today = new Date().toISOString().split('T')[0];

// 按任务编号排序（支持 "1.1", "1.2", "2.1" 格式）
const sortByTaskNo = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    // 解析编号格式: "1.2" -> [1, 2]
    const parseNo = (no: string): [number, number] => {
      const match = no.match(/^(\d+)\.(\d+)$/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2])];
      }
      // 非标准格式，尝试提取数字
      const num = parseInt(no);
      return isNaN(num) ? [999, 999] : [num, 0];
    };

    const [a1, a2] = parseNo(a.task_no);
    const [b1, b2] = parseNo(b.task_no);

    if (a1 !== b1) return a1 - b1;
    return a2 - b2;
  }).map((t, i) => ({ ...t, index: i })); // 更新索引
};

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
      // 按任务编号排序
      set({ tasks: sortByTaskNo(tasks), isLoading: false });
    } catch (error) {
      set({ error: '获取任务列表失败', isLoading: false });
    }
  },

  loadTemplate: async () => {
    set({ isLoading: true, error: null });
    try {
      const { tasks, project, summary } = await taskApi.loadTemplate();

      // 恢复排期设置（按任务编号排序）
      const updates: Partial<TaskState> = {
        tasks: sortByTaskNo(tasks),
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
      const tasks = [...get().tasks, newTask];
      // 按任务编号排序
      const sortedTasks = sortByTaskNo(tasks);
      set({ tasks: sortedTasks });
    } catch (error) {
      set({ error: '添加任务失败' });
    }
  },

  updateTask: async (index, task) => {
    try {
      const updatedTask = await taskApi.updateTask(index, task);
      const tasks = [...get().tasks];
      tasks[index] = updatedTask;
      // 按任务编号重新排序
      set({ tasks: sortByTaskNo(tasks) });
      // 刷新项目数据以更新 completion_rate（异步执行，不阻塞任务更新）
      useProjectStore.getState().fetchProjects().catch(() => {});
    } catch (error) {
      set({ error: '更新任务失败' });
      throw error; // 重新抛出以便调用方处理
    }
  },

  deleteTask: async (index) => {
    try {
      const { tasks, milestones } = get();
      const deletedTask = tasks[index];
      const deletedMilestone = deletedTask?.milestone;

      await taskApi.deleteTask(index);

      // 重新获取任务列表（索引已更新）
      let freshTasks = await taskApi.getTasks();

      // 如果删除的任务有里程碑，重新编号该里程碑下的任务
      if (deletedMilestone) {
        // 获取里程碑序号
        const usedMilestones = milestones.filter(m =>
          freshTasks.some(t => t.milestone === m)
        );
        const milestoneIndex = usedMilestones.indexOf(deletedMilestone) + 1;

        if (milestoneIndex > 0) {
          // 获取该里程碑下的任务，按编号排序
          const milestoneTasks = freshTasks
            .filter(t => t.milestone === deletedMilestone)
            .sort((a, b) => {
              const parseSeq = (no: string) => {
                const match = no.match(/^\d+\.(\d+)$/);
                return match ? parseInt(match[1]) : 999;
              };
              return parseSeq(a.task_no) - parseSeq(b.task_no);
            });

          // 重新编号
          for (let idx = 0; idx < milestoneTasks.length; idx++) {
            const task = milestoneTasks[idx];
            const newTaskNo = `${milestoneIndex}.${idx + 1}`;
            if (task.task_no !== newTaskNo) {
              // 更新任务编号（使用正确的索引）
              await taskApi.updateTask(task.index, { ...task, task_no: newTaskNo });
            }
          }

          // 重新获取更新后的任务列表
          freshTasks = await taskApi.getTasks();
        }
      }

      // 排序并更新状态
      set({ tasks: sortByTaskNo(freshTasks), selectedIndices: [] });
    } catch (error) {
      set({ error: '删除任务失败' });
    }
  },

  clearAllTasks: async () => {
    try {
      await taskApi.clearAllTasks();
      set({ tasks: [], selectedIndices: [] });
    } catch (error) {
      set({ error: '清空任务失败' });
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

  // 编号顺延：将同一里程碑下 >= fromSeq 的任务编号 +1
  shiftTaskNumbers: async (milestone, fromSeq) => {
    const { tasks, milestones } = get();

    // 获取里程碑在已使用列表中的序号
    const usedMilestones = milestones.filter(m =>
      tasks.some(t => t.milestone === m) || m === milestone
    );
    const milestoneIndex = usedMilestones.indexOf(milestone) + 1;
    if (milestoneIndex === 0) return;

    // 找出需要顺延的任务（同一里程碑下，编号 >= fromSeq）
    const tasksToShift: { index: number; newTaskNo: string }[] = [];

    tasks.forEach(t => {
      if (t.milestone === milestone) {
        const match = t.task_no.match(/^(\d+)\.(\d+)$/);
        if (match) {
          const seq = parseInt(match[2]);
          if (seq >= fromSeq) {
            tasksToShift.push({
              index: t.index,
              newTaskNo: `${milestoneIndex}.${seq + 1}`,
            });
          }
        }
      }
    });

    // 从大到小排序，避免编号冲突
    tasksToShift.sort((a, b) => {
      const seqA = parseInt(a.newTaskNo.split('.')[1]);
      const seqB = parseInt(b.newTaskNo.split('.')[1]);
      return seqB - seqA;
    });

    // 逐个更新任务编号
    for (const item of tasksToShift) {
      const task = tasks.find(t => t.index === item.index);
      if (task) {
        await taskApi.updateTask(item.index, { ...task, task_no: item.newTaskNo });
      }
    }

    // 重新获取任务列表
    const updatedTasks = await taskApi.getTasks();
    set({ tasks: sortByTaskNo(updatedTasks) });
  },

  // 重新编码所有任务
  renumberAllTasks: async () => {
    // 先获取最新的里程碑列表和任务列表
    const milestones = await taskApi.getMilestones();
    let freshTasks = await taskApi.getTasks();

    // 获取当前项目中已使用的里程碑（按 milestones 配置顺序）
    const usedMilestones = milestones.filter(m =>
      freshTasks.some(t => t.milestone === m)
    );

    // 按里程碑分组并重新编号
    for (let mIdx = 0; mIdx < usedMilestones.length; mIdx++) {
      const milestone = usedMilestones[mIdx];
      const milestoneIndex = mIdx + 1;

      // 获取该里程碑下的任务，按当前编号排序
      const milestoneTasks = freshTasks
        .filter(t => t.milestone === milestone)
        .sort((a, b) => {
          const parseSeq = (no: string) => {
            const match = no.match(/^\d+\.(\d+)$/);
            return match ? parseInt(match[1]) : 999;
          };
          return parseSeq(a.task_no) - parseSeq(b.task_no);
        });

      // 重新编号
      for (let idx = 0; idx < milestoneTasks.length; idx++) {
        const task = milestoneTasks[idx];
        const newTaskNo = `${milestoneIndex}.${idx + 1}`;
        if (task.task_no !== newTaskNo) {
          // 使用 task_no 查找当前任务的最新索引
          const currentTask = freshTasks.find(t => t.task_no === task.task_no && t.milestone === task.milestone);
          if (currentTask) {
            await taskApi.updateTask(currentTask.index, { ...currentTask, task_no: newTaskNo });
            // 每次更新后重新获取任务列表，确保索引正确
            freshTasks = await taskApi.getTasks();
          }
        }
      }
    }

    // 最终更新状态
    set({ tasks: sortByTaskNo(freshTasks) });
  },
}));
