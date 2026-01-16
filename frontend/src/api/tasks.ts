/**
 * 任务相关 API
 */

import api from './client';
import type { Task, ScheduleRequest, ScheduleResponse, ProgressRecord, ProgressRecordRequest } from '../types/task';

// 获取所有任务
export const getTasks = async (): Promise<Task[]> => {
  const response = await api.get('/api/tasks');
  return response.data;
};

// 创建任务
export const createTask = async (task: Omit<Task, 'index'>, position?: number): Promise<Task> => {
  const url = position !== undefined ? `/api/tasks?position=${position}` : '/api/tasks';
  const response = await api.post(url, task);
  return response.data;
};

// 更新任务
export const updateTask = async (index: number, task: Omit<Task, 'index'>): Promise<Task> => {
  const response = await api.put(`/api/tasks/${index}`, task);
  return response.data;
};

// 删除任务
export const deleteTask = async (index: number): Promise<void> => {
  await api.delete(`/api/tasks/${index}`);
};

// 上移/下移任务
export const reorderTask = async (index: number, direction: 'up' | 'down'): Promise<{ new_index: number }> => {
  const response = await api.post('/api/tasks/reorder', null, {
    params: { index, direction }
  });
  return response.data;
};

// 切换排除状态
export const toggleExclude = async (index: number): Promise<{ excluded: boolean }> => {
  const response = await api.post(`/api/tasks/toggle-exclude/${index}`);
  return response.data;
};

// 正向排期
export const calculateForward = async (request: ScheduleRequest): Promise<ScheduleResponse> => {
  const response = await api.post('/api/schedule/forward', request);
  return response.data;
};

// 倒推排期
export const calculateBackward = async (request: ScheduleRequest): Promise<ScheduleResponse> => {
  const response = await api.post('/api/schedule/backward', request);
  return response.data;
};

// 加载模板
export const loadTemplate = async (): Promise<{ tasks: Task[]; message: string }> => {
  const response = await api.get('/api/config/template');
  return response.data;
};

// 导出 Excel
export interface ExportRequest {
  project_name: string;
  start_date: string;
  gantt_start_date?: string;  // 甘特图开始日期
  gantt_days?: number;
  exclude_weekends?: boolean;
  exclude_holidays?: boolean;
}

export const exportExcel = async (request: ExportRequest): Promise<Blob> => {
  const response = await api.post('/api/export/excel', request, {
    responseType: 'blob'
  });
  return response.data;
};

// ============ 进度记录 API ============

// 记录进度
export const recordProgress = async (request: ProgressRecordRequest): Promise<{ message: string; task: Task }> => {
  const response = await api.post('/api/progress/record', request);
  return response.data;
};

// 获取进度历史
export const getProgressHistory = async (taskIndex: number): Promise<ProgressRecord[]> => {
  const response = await api.get(`/api/progress/history/${taskIndex}`);
  return response.data.records || [];
};

// ============ 里程碑管理 API ============

// 获取里程碑列表
export const getMilestones = async (): Promise<string[]> => {
  const response = await api.get('/api/milestones');
  return response.data.milestones;
};

// 添加里程碑
export const addMilestone = async (name: string): Promise<string[]> => {
  const response = await api.post('/api/milestones', { name });
  return response.data.milestones;
};

// 删除里程碑
export const deleteMilestone = async (name: string): Promise<string[]> => {
  const response = await api.delete(`/api/milestones/${encodeURIComponent(name)}`);
  return response.data.milestones;
};

// 重命名里程碑
export const updateMilestone = async (oldName: string, newName: string): Promise<string[]> => {
  const response = await api.put(`/api/milestones/${encodeURIComponent(oldName)}`, { name: newName });
  return response.data.milestones;
};

// 重排里程碑
export const reorderMilestones = async (milestones: string[]): Promise<string[]> => {
  const response = await api.put('/api/milestones/reorder', { milestones });
  return response.data.milestones;
};

// ============ 机器分类管理 API ============

// 获取机器分类列表
export const getCategories = async (): Promise<string[]> => {
  const response = await api.get('/api/categories');
  return response.data.categories;
};

// 添加机器分类
export const addCategory = async (name: string): Promise<string[]> => {
  const response = await api.post('/api/categories', { name });
  return response.data.categories;
};

// 删除机器分类
export const deleteCategory = async (name: string): Promise<string[]> => {
  const response = await api.delete(`/api/categories/${encodeURIComponent(name)}`);
  return response.data.categories;
};

// 重命名机器分类
export const updateCategory = async (oldName: string, newName: string): Promise<string[]> => {
  const response = await api.put(`/api/categories/${encodeURIComponent(oldName)}`, { name: newName });
  return response.data.categories;
};
