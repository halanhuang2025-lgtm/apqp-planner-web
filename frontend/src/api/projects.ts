/**
 * 项目管理 API
 */

import { api } from './client';
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  DuplicateProjectRequest,
  SaveAsTemplateRequest,
  CompareProjectsRequest,
  ProjectListResponse,
  ProjectTemplate,
  ProjectComparisonData,
} from '../types/project';

// 获取项目列表
export async function listProjects(status?: string): Promise<ProjectListResponse> {
  const params = status ? { status } : {};
  const response = await api.get<ProjectListResponse>('/api/projects', { params });
  return response.data;
}

// 创建项目
export async function createProject(data: CreateProjectRequest): Promise<Project> {
  const response = await api.post<{ project: Project }>('/api/projects', data);
  return response.data.project;
}

// 获取项目详情
export async function getProject(projectId: string): Promise<Project> {
  const response = await api.get<{ project: Project }>(`/api/projects/${projectId}`);
  return response.data.project;
}

// 更新项目
export async function updateProject(projectId: string, data: UpdateProjectRequest): Promise<Project> {
  const response = await api.put<{ project: Project }>(`/api/projects/${projectId}`, data);
  return response.data.project;
}

// 删除项目
export async function deleteProject(projectId: string): Promise<{ success: boolean }> {
  const response = await api.delete<{ success: boolean }>(`/api/projects/${projectId}`);
  return response.data;
}

// 切换当前项目
export async function switchProject(projectId: string): Promise<{ success: boolean; project: Project }> {
  const response = await api.post<{ success: boolean; project: Project }>(`/api/projects/${projectId}/switch`);
  return response.data;
}

// 保存项目
export async function saveProject(projectId: string): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>(`/api/projects/${projectId}/save`);
  return response.data;
}

// 复制项目
export async function duplicateProject(projectId: string, data: DuplicateProjectRequest): Promise<Project> {
  const response = await api.post<Project>(`/api/projects/${projectId}/duplicate`, data);
  return response.data;
}

// 保存为模板
export async function saveAsTemplate(projectId: string, data: SaveAsTemplateRequest): Promise<Project> {
  const response = await api.post<Project>(`/api/projects/${projectId}/save-as-template`, data);
  return response.data;
}

// 获取模板列表
export async function listTemplates(): Promise<ProjectTemplate[]> {
  const response = await api.get<{ templates: ProjectTemplate[] }>('/api/templates');
  return response.data.templates;
}

// 对比项目
export async function compareProjects(data: CompareProjectsRequest): Promise<ProjectComparisonData[]> {
  const response = await api.post<{ comparison: ProjectComparisonData[] }>('/api/projects/compare', data);
  return response.data.comparison;
}
