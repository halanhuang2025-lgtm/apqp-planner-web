/**
 * 任务编辑对话框
 */

import { useState, useEffect } from 'react';
import type { Task } from '../types/task';

interface TaskEditDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'index'>) => void;
  mode: 'edit' | 'add';
}

export function TaskEditDialog({ task, isOpen, onClose, onSave, mode }: TaskEditDialogProps) {
  const [formData, setFormData] = useState<Omit<Task, 'index'>>({
    milestone: '',
    task_no: '',
    name: '',
    duration: 1,
    owner: '',
    predecessor: '',
    start_date: null,
    end_date: null,
    actual_start: null,
    actual_end: null,
    manual_start: false,
    manual_end: false,
    excluded: false,
    progress: 0,
    status: '未开始',
  });

  // 当 task 变化时更新表单
  useEffect(() => {
    if (task && mode === 'edit') {
      setFormData({
        milestone: task.milestone,
        task_no: task.task_no,
        name: task.name,
        duration: task.duration,
        owner: task.owner,
        predecessor: task.predecessor,
        start_date: task.start_date,
        end_date: task.end_date,
        actual_start: task.actual_start,
        actual_end: task.actual_end,
        manual_start: task.manual_start,
        manual_end: task.manual_end,
        excluded: task.excluded,
        progress: task.progress,
        status: task.status,
      });
    } else if (mode === 'add') {
      // 添加模式：重置表单
      setFormData({
        milestone: '',
        task_no: '',
        name: '',
        duration: 1,
        owner: '',
        predecessor: '',
        start_date: null,
        end_date: null,
        actual_start: null,
        actual_end: null,
        manual_start: false,
        manual_end: false,
        excluded: false,
        progress: 0,
        status: '未开始',
      });
    }
  }, [task, mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof typeof formData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === 'edit' ? '编辑任务' : '添加任务'}
          </h2>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {/* 里程碑 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                里程碑
              </label>
              <select
                className="input"
                value={formData.milestone}
                onChange={(e) => handleChange('milestone', e.target.value)}
                required
              >
                <option value="">请选择</option>
                <option value="概念设计">概念设计</option>
                <option value="产品设计">产品设计</option>
                <option value="样机试制">样机试制</option>
                <option value="过程设计">过程设计</option>
                <option value="试生产">试生产</option>
                <option value="量产启动">量产启动</option>
              </select>
            </div>

            {/* 任务编号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                任务编号
              </label>
              <input
                type="text"
                className="input"
                value={formData.task_no}
                onChange={(e) => handleChange('task_no', e.target.value)}
                placeholder="如: 1.1"
                required
              />
            </div>

            {/* 任务名称 - 占满一行 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                任务名称
              </label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="输入任务名称"
                required
              />
            </div>

            {/* 工期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工期 (天)
              </label>
              <input
                type="number"
                className="input"
                min="1"
                value={formData.duration}
                onChange={(e) => handleChange('duration', parseInt(e.target.value) || 1)}
                required
              />
            </div>

            {/* 主责人 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                主责人
              </label>
              <input
                type="text"
                className="input"
                value={formData.owner}
                onChange={(e) => handleChange('owner', e.target.value)}
                placeholder="负责人姓名或角色"
              />
            </div>

            {/* 前置任务 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                前置任务
              </label>
              <input
                type="text"
                className="input"
                value={formData.predecessor}
                onChange={(e) => handleChange('predecessor', e.target.value)}
                placeholder="如: 1.1 或 1.1,1.2"
              />
            </div>

            {/* 进度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                进度 (%)
              </label>
              <input
                type="number"
                className="input"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => handleChange('progress', parseInt(e.target.value) || 0)}
              />
            </div>

            {/* 状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                className="input"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="未开始">未开始</option>
                <option value="进行中">进行中</option>
                <option value="已完成">已完成</option>
                <option value="暂停">暂停</option>
              </select>
            </div>

            {/* 排除任务 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="excluded"
                checked={formData.excluded}
                onChange={(e) => handleChange('excluded', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="excluded" className="text-sm text-gray-700">
                排除此任务（不参与排期计算）
              </label>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {mode === 'edit' ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
