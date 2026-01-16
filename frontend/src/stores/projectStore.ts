/**
 * 项目状态管理 - Zustand Store
 */

import { create } from 'zustand';
import type { Project, ProjectTemplate, ProjectComparisonData } from '../types/project';
import * as projectApi from '../api/projects';

interface ProjectState {
  // 状态
  projects: Project[];
  currentProject: Project | null;
  templates: ProjectTemplate[];
  comparisonData: ProjectComparisonData[];
  isLoading: boolean;
  error: string | null;

  // UI 状态
  showProjectList: boolean;
  showCreateDialog: boolean;
  showCompareView: boolean;

  // Actions
  setShowProjectList: (show: boolean) => void;
  setShowCreateDialog: (show: boolean) => void;
  setShowCompareView: (show: boolean) => void;
  clearError: () => void;

  // API Actions
  fetchProjects: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  createProject: (name: string, description?: string, templateId?: string) => Promise<Project | null>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<boolean>;
  switchProject: (projectId: string) => Promise<boolean>;
  saveCurrentProject: () => Promise<void>;
  duplicateProject: (projectId: string, newName: string) => Promise<Project | null>;
  saveAsTemplate: (projectId: string, templateName: string) => Promise<Project | null>;
  compareProjects: (projectIds: string[]) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  // 初始状态
  projects: [],
  currentProject: null,
  templates: [],
  comparisonData: [],
  isLoading: false,
  error: null,
  showProjectList: false,
  showCreateDialog: false,
  showCompareView: false,

  // UI Actions
  setShowProjectList: (show) => set({ showProjectList: show }),
  setShowCreateDialog: (show) => set({ showCreateDialog: show }),
  setShowCompareView: (show) => set({ showCompareView: show }),
  clearError: () => set({ error: null }),

  // API Actions
  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectApi.listProjects();
      const { currentProject } = get();

      // 更新项目列表
      let updates: Partial<ProjectState> = {
        projects: response.projects,
        isLoading: false
      };

      // 如果当前项目存在，更新其数据（如 completion_rate）
      if (currentProject) {
        const updatedCurrentProject = response.projects.find(p => p.id === currentProject.id);
        if (updatedCurrentProject) {
          updates.currentProject = updatedCurrentProject;
        }
      } else if (response.default_project_id) {
        // 如果有默认项目且当前没有选中项目，自动切换
        const defaultProject = response.projects.find(p => p.id === response.default_project_id);
        if (defaultProject) {
          updates.currentProject = defaultProject;
        }
      }

      set(updates);
    } catch (error) {
      set({ error: '获取项目列表失败', isLoading: false });
    }
  },

  fetchTemplates: async () => {
    try {
      const templates = await projectApi.listTemplates();
      set({ templates });
    } catch (error) {
      console.error('获取模板列表失败:', error);
    }
  },

  createProject: async (name, description, templateId) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectApi.createProject({
        name,
        description,
        template_id: templateId
      });

      // 更新项目列表
      const { projects } = get();
      set({
        projects: [project, ...projects],
        currentProject: project,
        isLoading: false,
        showCreateDialog: false,
      });

      return project;
    } catch (error) {
      set({ error: '创建项目失败', isLoading: false });
      return null;
    }
  },

  updateProject: async (projectId, updates) => {
    try {
      const updatedProject = await projectApi.updateProject(projectId, updates);

      // 更新项目列表
      const { projects, currentProject } = get();
      const updatedProjects = projects.map(p =>
        p.id === projectId ? updatedProject : p
      );

      set({
        projects: updatedProjects,
        currentProject: currentProject?.id === projectId ? updatedProject : currentProject,
      });
    } catch (error) {
      set({ error: '更新项目失败' });
    }
  },

  deleteProject: async (projectId) => {
    try {
      const result = await projectApi.deleteProject(projectId);
      if (result.success) {
        const { projects, currentProject } = get();
        const filteredProjects = projects.filter(p => p.id !== projectId);

        set({
          projects: filteredProjects,
          // 如果删除的是当前项目，清空当前项目
          currentProject: currentProject?.id === projectId ? null : currentProject,
        });

        return true;
      }
      return false;
    } catch (error) {
      set({ error: '删除项目失败' });
      return false;
    }
  },

  switchProject: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await projectApi.switchProject(projectId);
      if (result.success) {
        set({
          currentProject: result.project,
          isLoading: false,
          showProjectList: false,
        });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (error) {
      set({ error: '切换项目失败', isLoading: false });
      return false;
    }
  },

  saveCurrentProject: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      await projectApi.saveProject(currentProject.id);
    } catch (error) {
      set({ error: '保存项目失败' });
    }
  },

  duplicateProject: async (projectId, newName) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectApi.duplicateProject(projectId, { new_name: newName });

      // 更新项目列表
      const { projects } = get();
      set({
        projects: [project, ...projects],
        isLoading: false,
      });

      return project;
    } catch (error) {
      set({ error: '复制项目失败', isLoading: false });
      return null;
    }
  },

  saveAsTemplate: async (projectId, templateName) => {
    set({ isLoading: true, error: null });
    try {
      const template = await projectApi.saveAsTemplate(projectId, { template_name: templateName });

      // 更新模板列表
      const { templates } = get();
      set({
        templates: [...templates, {
          id: template.id,
          name: template.name,
          description: template.description,
          task_count: template.task_count,
        }],
        isLoading: false,
      });

      return template;
    } catch (error) {
      set({ error: '保存模板失败', isLoading: false });
      return null;
    }
  },

  compareProjects: async (projectIds) => {
    set({ isLoading: true, error: null });
    try {
      const comparisonData = await projectApi.compareProjects({ project_ids: projectIds });
      set({
        comparisonData,
        isLoading: false,
        showCompareView: true,
      });
    } catch (error) {
      set({ error: '获取对比数据失败', isLoading: false });
    }
  },
}));
