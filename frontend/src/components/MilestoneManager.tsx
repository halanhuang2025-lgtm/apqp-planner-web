/**
 * 里程碑管理对话框
 */

import { useState, useEffect } from 'react';
import { useTaskStore } from '../stores/taskStore';

interface MilestoneManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MilestoneManager({ isOpen, onClose }: MilestoneManagerProps) {
  const {
    milestones,
    fetchMilestones,
    addMilestone,
    deleteMilestone,
    updateMilestone,
  } = useTaskStore();

  const [newName, setNewName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMilestones();
      setError(null);
    }
  }, [isOpen, fetchMilestones]);

  if (!isOpen) return null;

  const handleAdd = async () => {
    if (!newName.trim()) return;

    setError(null);
    const success = await addMilestone(newName.trim());
    if (success) {
      setNewName('');
    } else {
      setError('添加失败，里程碑可能已存在');
    }
  };

  const handleDelete = async (name: string) => {
    setError(null);
    const success = await deleteMilestone(name);
    if (!success) {
      setError('删除失败，可能有任务正在使用此里程碑');
    }
  };

  const handleStartEdit = (index: number, name: string) => {
    setEditingIndex(index);
    setEditingName(name);
    setError(null);
  };

  const handleSaveEdit = async (oldName: string) => {
    if (!editingName.trim()) return;

    setError(null);
    const success = await updateMilestone(oldName, editingName.trim());
    if (success) {
      setEditingIndex(null);
      setEditingName('');
    } else {
      setError('更新失败，名称可能已存在');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">里程碑管理</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 添加新里程碑 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              添加新里程碑
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="输入里程碑名称"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <button
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="btn btn-primary"
              >
                添加
              </button>
            </div>
          </div>

          {/* 里程碑列表 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              当前里程碑 ({milestones.length})
            </label>
            {milestones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无里程碑，请添加
              </div>
            ) : (
              <div className="space-y-2">
                {milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-gray-300"
                  >
                    {editingIndex === index ? (
                      <>
                        <input
                          type="text"
                          className="input flex-1"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(milestone);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <button
                          onClick={() => handleSaveEdit(milestone)}
                          className="text-green-600 hover:text-green-700 p-1"
                          title="保存"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          title="取消"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-gray-900">{milestone}</span>
                        <button
                          onClick={() => handleStartEdit(index, milestone)}
                          className="text-gray-400 hover:text-blue-600 p-1"
                          title="编辑"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(milestone)}
                          className="text-gray-400 hover:text-red-600 p-1"
                          title="删除"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="btn btn-secondary">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
