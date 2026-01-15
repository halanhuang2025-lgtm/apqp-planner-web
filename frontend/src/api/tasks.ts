/**
 * 任务相关 API
 */

import api from './client';
import type { Task, ScheduleRequest, ScheduleResponse } from '../types/task';

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
