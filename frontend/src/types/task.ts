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
  task_index: number;
  progress: number;
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
