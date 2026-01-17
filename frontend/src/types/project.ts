/**
 * 项目相关类型定义
 */

// 项目状态
export type ProjectStatus = 'active' | 'archived' | 'template';

// 排期模式
export type ScheduleMode = 'forward' | 'backward';

// 项目分类选项
export const PROJECT_TYPES = ['新产品开发', '特殊定制', '工程项目非标机', 'HPS'] as const;
export type ProjectType = typeof PROJECT_TYPES[number] | '';

// 项目数据
export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  status: ProjectStatus;
  // 项目详细属性
  project_no: string;        // 项目编号，如 2026001
  project_type: ProjectType; // 项目分类：新产品开发、特殊定制、工程项目非标机
  machine_no: string;        // 整机编号
  customer: string;          // 客户名称
  model: string;             // 机型
  category: string;          // 机器分类
  specifications: string;    // 规格
  custom_requirements: string;  // 定制内容
  // 排期设置
  schedule_mode: ScheduleMode;
  schedule_date: string | null;
  exclude_weekends: boolean;
  exclude_holidays: boolean;
  // 统计信息
  task_count: number;
  completion_rate: number;
}

// 创建项目请求
export interface CreateProjectRequest {
  name: string;
  description?: string;
  template_id?: string;
  // 项目详细属性
  project_no?: string;
  project_type?: string;
  machine_no?: string;
  customer?: string;
  model?: string;
  category?: string;
  specifications?: string;
  custom_requirements?: string;
}

// 更新项目请求
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  // 项目详细属性
  project_no?: string;
  project_type?: string;
  machine_no?: string;
  customer?: string;
  model?: string;
  category?: string;
  specifications?: string;
  custom_requirements?: string;
  // 排期设置
  schedule_mode?: ScheduleMode;
  schedule_date?: string | null;
  exclude_weekends?: boolean;
  exclude_holidays?: boolean;
}

// 复制项目请求
export interface DuplicateProjectRequest {
  new_name: string;
}

// 保存为模板请求
export interface SaveAsTemplateRequest {
  template_name: string;
}

// 项目对比请求
export interface CompareProjectsRequest {
  project_ids: string[];
}

// 里程碑统计数据
export interface MilestoneStats {
  total_tasks: number;
  completed_tasks: number;
  total_progress: number;
  avg_progress: number;
}

// 项目对比数据
export interface ProjectComparisonData {
  project: Project;
  milestones: Record<string, MilestoneStats>;
  overall_progress: number;
}

// 模板信息
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  task_count: number;
}

// API 响应
export interface ProjectListResponse {
  projects: Project[];
  default_project_id: string | null;
}

export interface ProjectDetailResponse extends Project {
  tasks_loaded: boolean;
}

export interface TemplateListResponse {
  templates: ProjectTemplate[];
}

export interface CompareResponse {
  comparison: ProjectComparisonData[];
}
