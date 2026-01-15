/**
 * 进度记录对话框
 * 用于每日记录任务实际进度
 */

import { useState, useEffect } from 'react';
import type { Task, ProgressRecord } from '../types/task';
import { recordProgress, getProgressHistory } from '../api/tasks';

interface ProgressRecordDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void; // 保存成功后刷新任务列表
}

export function ProgressRecordDialog({ task, isOpen, onClose, onSaved }: ProgressRecordDialogProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('未开始');
  const [note, setNote] = useState('');
  const [issues, setIssues] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));
  const [history, setHistory] = useState<ProgressRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 当任务变化时更新表单
  useEffect(() => {
    if (task && isOpen) {
      setProgress(task.progress);
      setStatus(task.status);
      setNote('');
      setIssues('');
      setRecordDate(new Date().toISOString().slice(0, 10));
      setShowHistory(false);
      // 加载历史记录
      loadHistory();
    }
  }, [task, isOpen]);

  const loadHistory = async () => {
    if (!task) return;
    try {
      const records = await getProgressHistory(task.index);
      setHistory(records);
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
  };

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await recordProgress({
        task_index: task.index,
        progress,
        status,
        note,
        issues,
        record_date: recordDate,
      });
      onSaved();
      onClose();
    } catch (error) {
      console.error('记录进度失败:', error);
      alert('记录进度失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            记录进度 - {task.task_no} {task.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            计划日期：{task.start_date || '-'} ~ {task.end_date || '-'}
          </p>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {/* 记录日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  记录日期
                </label>
                <input
                  type="date"
                  className="input"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  required
                />
              </div>

              {/* 进度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  完成进度 (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progress}
                    onChange={(e) => setProgress(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    className="input w-20"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => setProgress(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* 状态 */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  当前状态
                </label>
                <div className="flex gap-4">
                  {['未开始', '进行中', '已完成', '暂停'].map((s) => (
                    <label key={s} className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={status === s}
                        onChange={(e) => setStatus(e.target.value)}
                        className="mr-2"
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
                  工作备注
                </label>
                <textarea
                  className="input"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="今日完成的工作内容..."
                />
              </div>

              {/* 问题记录 */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  问题/风险
                </label>
                <textarea
                  className="input"
                  rows={2}
                  value={issues}
                  onChange={(e) => setIssues(e.target.value)}
                  placeholder="遇到的问题或潜在风险..."
                />
              </div>
            </div>

            {/* 历史记录 */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                {showHistory ? '收起' : '展开'}历史记录 ({history.length})
              </button>

              {showHistory && history.length > 0 && (
                <div className="mt-3 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">日期</th>
                        <th className="px-3 py-2 text-left">进度</th>
                        <th className="px-3 py-2 text-left">状态</th>
                        <th className="px-3 py-2 text-left">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice().reverse().map((record, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">{record.record_date}</td>
                          <td className="px-3 py-2">{record.progress}%</td>
                          <td className="px-3 py-2">{record.status}</td>
                          <td className="px-3 py-2 text-gray-600 truncate max-w-[200px]">
                            {record.note || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {showHistory && history.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">暂无历史记录</p>
              )}
            </div>

            {/* 按钮 */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={isLoading}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? '保存中...' : '保存记录'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
