/**
 * 任务类型定义
 */

export interface Task {
  index: number;
  milestone: string;
  task_no: string;
  name: string;
  duration: number;
  owner: string;
  predecessor: string;
  start_date: string | null;
  end_date: string | null;
  actual_start: string | null;
  actual_end: string | null;
  manual_start: boolean;
  manual_end: boolean;
  excluded: boolean;
  progress: number;
  status: string;
  // RACI 职责分配
  responsible: string[];   // R - 负责人（执行者）
  accountable: string;     // A - 批准人（最终负责）
  consulted: string[];     // C - 咨询人
  informed: string[];      // I - 知会人
}

export type TaskStatus = '未开始' | '进行中' | '已完成' | '暂停';

export interface ScheduleRequest {
  date: string;
  exclude_weekends: boolean;
  exclude_holidays: boolean;
}

export interface ScheduleResponse {
  tasks: Task[];
  summary: {
    start_date: string;
    end_date: string;
    total_days: number;
  };
}

// 进度记录
export interface ProgressRecord {
  record_id: string;  // 记录ID，用于删除
  task_index: number;
  progress: number;
  increment: number;  // 当日增量
  status: TaskStatus;
  note: string;
  issues: string;
  record_date: string;
  timestamp: string;
}

export interface ProgressRecordRequest {
  task_index: number;
  progress: number;
  status: string;
  note?: string;
  issues?: string;
  record_date?: string;
}

// 批量进度导入结果
export interface BatchImportResult {
  success: boolean;
  message: string;
  projects_updated: number;
  imported_count: number;
  skipped_count: number;
  errors: string[];
  details: BatchImportDetail[];
}

export interface BatchImportDetail {
  project_name: string;
  imported: number;
  skipped: number;
}

// 人员工作负荷类型
export interface PersonnelWorkloadTask {
  task_no: string;
  task_name: string;
  milestone: string;
  duration: number;      // 任务工期
  progress: number;
  status: string;
  role: 'R' | 'A' | 'C' | 'I';
  contribution: number;  // 该任务贡献的 EWL
  end_date: string | null;  // 任务结束日期
}

export interface EwlByRole {
  R: number;
  A: number;
  C: number;
  I: number;
}

export interface PersonnelWorkload {
  person_name: string;
  department: string;
  ewl: number;                    // 等效工作量（天）
  ewl_by_role: EwlByRole;         // 按角色分解的 EWL
  task_count: number;             // 未完成任务数
  total_task_count: number;       // 总任务数
  tasks: PersonnelWorkloadTask[];
  roles: {
    R: number;
    A: number;
    C: number;
    I: number;
  };
  summary: {
    not_started: number;
    in_progress: number;
    completed: number;
    paused: number;
  };
  avg_progress: number;
  latest_end_date: string | null;  // 最晚任务结束日期
  available_date: string | null;   // 有空日期
}

export interface PersonnelWorkloadResponse {
  workload_data: PersonnelWorkload[];
  total_personnel: number;
  total_tasks: number;
  total_ewl: number;              // 总 EWL
  avg_ewl: number;                // 平均 EWL
}

// 项目仪表盘类型
export interface TaskStats {
  total: number;
  completed: number;
  in_progress: number;
  not_started: number;
  paused: number;
  completion_rate: number;
}

export interface MilestoneStat {
  milestone: string;
  total_tasks: number;
  completed_tasks: number;
  avg_progress: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface ProgressTrend {
  date: string;
  completion_rate: number;
}

export interface ProjectDashboardData {
  task_stats: TaskStats;
  milestone_stats: MilestoneStat[];
  status_distribution: StatusDistribution[];
  progress_trend: ProgressTrend[];
}
