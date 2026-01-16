/**
 * 任务编辑对话框
 * 包含任务信息编辑和进度记录功能
 */

import { useState, useEffect } from 'react';
import type { Task, ProgressRecord } from '../types/task';
import { recordProgress, getProgressHistory } from '../api/tasks';

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

  // 进度记录字段
  const [note, setNote] = useState('');
  const [issues, setIssues] = useState('');
  const [history, setHistory] = useState<ProgressRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      // 重置进度记录字段（loadHistory 会检查今天是否有记录）
      setNote('');
      setIssues('');
      setShowHistory(false);
      // 加载历史记录，并自动填充今天的记录
      loadHistoryAndTodayRecord(task.index);
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
      setNote('');
      setIssues('');
      setHistory([]);
    }
  }, [task, mode, isOpen]);

  const loadHistoryAndTodayRecord = async (taskIndex: number) => {
    try {
      const records = await getProgressHistory(taskIndex);
      setHistory(records);

      // 检查是否有今天的记录，如果有则填充到表单
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = records.find(r => r.record_date === today);
      if (todayRecord) {
        setNote(todayRecord.note || '');
        setIssues(todayRecord.issues || '');
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let updatedFormData = { ...formData };

      // 编辑模式下记录进度（自动联动实际日期）
      if (mode === 'edit' && task) {
        const result = await recordProgress({
          task_index: task.index,
          progress: formData.progress,
          status: formData.status,
          note: note.trim(),
          issues: issues.trim(),
        });

        // 使用后端返回的更新数据（含自动设置的实际日期）
        if (result.task) {
          updatedFormData = {
            ...updatedFormData,
            actual_start: result.task.actual_start || updatedFormData.actual_start,
            actual_end: result.task.actual_end || updatedFormData.actual_end,
          };
        }
      }

      // 保存任务
      onSave(updatedFormData);
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string | number | boolean | null) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // 进度改变时自动更新状态（除非当前是"暂停"状态）
      if (field === 'progress' && prev.status !== '暂停') {
        const progress = value as number;
        if (progress === 0) {
          newData.status = '未开始';
        } else if (progress === 100) {
          newData.status = '已完成';
        } else {
          newData.status = '进行中';
        }
      }

      return newData;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === 'edit' ? '编辑任务' : '添加任务'}
          </h2>
          {mode === 'edit' && task && (
            <p className="text-sm text-gray-500 mt-1">
              {task.task_no} {task.name} | 计划：{task.start_date || '-'} ~ {task.end_date || '-'}
            </p>
          )}
        </div>

        {/* 表单 - 可滚动区域 */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            {/* 任务基本信息 */}
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
                  排除此任务
                </label>
              </div>
            </div>

            {/* 日期设置区域 - 仅编辑模式显示 */}
            {mode === 'edit' && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3">日期设置</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* 计划开始日期 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      计划开始
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        className="input flex-1"
                        value={formData.start_date || ''}
                        onChange={(e) => {
                          handleChange('start_date', e.target.value || null);
                          if (e.target.value) handleChange('manual_start', true);
                        }}
                      />
                      <label className="flex items-center text-xs text-gray-500">
                        <input
                          type="checkbox"
                          checked={formData.manual_start}
                          onChange={(e) => handleChange('manual_start', e.target.checked)}
                          className="mr-1"
                        />
                        锁定
                      </label>
                    </div>
                  </div>

                  {/* 计划结束日期 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      计划结束
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        className="input flex-1"
                        value={formData.end_date || ''}
                        onChange={(e) => {
                          handleChange('end_date', e.target.value || null);
                          if (e.target.value) handleChange('manual_end', true);
                        }}
                      />
                      <label className="flex items-center text-xs text-gray-500">
                        <input
                          type="checkbox"
                          checked={formData.manual_end}
                          onChange={(e) => handleChange('manual_end', e.target.checked)}
                          className="mr-1"
                        />
                        锁定
                      </label>
                    </div>
                  </div>

                  {/* 实际开始日期 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      实际开始
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={formData.actual_start || ''}
                      onChange={(e) => handleChange('actual_start', e.target.value || null)}
                    />
                  </div>

                  {/* 实际结束日期 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      实际结束
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={formData.actual_end || ''}
                      onChange={(e) => handleChange('actual_end', e.target.value || null)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 进度记录区域 - 仅编辑模式显示 */}
            {mode === 'edit' && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3">进度记录</h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* 进度 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      完成进度
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={formData.progress}
                        onChange={(e) => handleChange('progress', parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="w-12 text-center">{formData.progress}%</span>
                    </div>
                  </div>

                  {/* 状态 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      当前状态
                    </label>
                    <div className="flex gap-3 mt-1">
                      {['未开始', '进行中', '已完成', '暂停'].map((s) => (
                        <label key={s} className="flex items-center text-sm">
                          <input
                            type="radio"
                            name="status"
                            value={s}
                            checked={formData.status === s}
                            onChange={(e) => handleChange('status', e.target.value)}
                            className="mr-1"
                          />
                          <span className={`
                            ${s === '未开始' ? 'text-gray-600' : ''}
                            ${s === '进行中' ? 'text-blue-600' : ''}
                            ${s === '已完成' ? 'text-green-600' : ''}
                            ${s === '暂停' ? 'text-orange-600' : ''}
                          `}>
                            {s}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 工作备注 */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      今日工作备注
                    </label>
                    <textarea
                      className="input"
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="记录今日完成的工作内容..."
                    />
                  </div>

                  {/* 问题/风险 */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      问题/异常
                    </label>
                    <textarea
                      className="input"
                      rows={2}
                      value={issues}
                      onChange={(e) => setIssues(e.target.value)}
                      placeholder="记录遇到的问题或异常情况..."
                    />
                  </div>
                </div>

                {/* 历史记录 */}
                {history.length > 0 && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowHistory(!showHistory)}
                      className="text-sm text-primary hover:underline"
                    >
                      {showHistory ? '收起' : '展开'}历史记录 ({history.length})
                    </button>

                    {showHistory && (
                      <div className="mt-2 border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-2 py-1 text-left">日期</th>
                              <th className="px-2 py-1 text-left">进度</th>
                              <th className="px-2 py-1 text-left">状态</th>
                              <th className="px-2 py-1 text-left">备注</th>
                              <th className="px-2 py-1 text-left">问题</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.slice().reverse().map((record, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="px-2 py-1">{record.record_date}</td>
                                <td className="px-2 py-1">{record.progress}%</td>
                                <td className="px-2 py-1">{record.status}</td>
                                <td className="px-2 py-1 text-gray-600 max-w-[120px] truncate">
                                  {record.note || '-'}
                                </td>
                                <td className="px-2 py-1 text-red-600 max-w-[120px] truncate">
                                  {record.issues || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 按钮 */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={isSaving}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? '保存中...' : (mode === 'edit' ? '保存' : '添加')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
