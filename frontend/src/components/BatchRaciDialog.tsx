/**
 * 批量设置RACI对话框
 */

import { useState, useEffect } from 'react';
import { batchUpdateRaci, getPersonnel } from '../api/tasks';
import type { Person } from '../api/tasks';
import type { Task } from '../types/task';

interface BatchRaciDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIndices: number[];  // 选中的任务索引
  taskCount: number;  // 总任务数
  onSuccess: (tasks: Task[]) => void;
}

export function BatchRaciDialog({ isOpen, onClose, selectedIndices, taskCount, onSuccess }: BatchRaciDialogProps) {
  const [responsible, setResponsible] = useState<string[]>([]);
  const [accountable, setAccountable] = useState('');
  const [consulted, setConsulted] = useState<string[]>([]);
  const [informed, setInformed] = useState<string[]>([]);
  const [personnel, setPersonnel] = useState<Person[]>([]);
  const [applyToAll, setApplyToAll] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 加载人员库
  useEffect(() => {
    if (isOpen) {
      loadPersonnel();
    }
  }, [isOpen]);

  const loadPersonnel = async () => {
    try {
      const data = await getPersonnel();
      setPersonnel(data.personnel);
    } catch (error) {
      console.error('加载人员库失败:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await batchUpdateRaci({
        task_indices: applyToAll ? [] : selectedIndices,
        responsible: responsible.length > 0 ? responsible : undefined,
        accountable: accountable || undefined,
        consulted: consulted.length > 0 ? consulted : undefined,
        informed: informed.length > 0 ? informed : undefined,
      });

      alert(`成功更新 ${result.updated_count} 个任务的RACI设置`);
      onSuccess(result.tasks);
      onClose();
    } catch (error) {
      console.error('批量设置RACI失败:', error);
      alert('批量设置RACI失败');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePerson = (list: string[], setList: (v: string[]) => void, name: string) => {
    if (list.includes(name)) {
      setList(list.filter(n => n !== name));
    } else {
      setList([...list, name]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">批量设置RACI</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* 应用范围 */}
          <div className="bg-blue-50 p-3 rounded">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-medium">应用到所有任务</span>
            </label>
            {!applyToAll && (
              <p className="text-sm text-gray-600 mt-1">
                将只应用到选中的 {selectedIndices.length} 个任务
              </p>
            )}
            {applyToAll && (
              <p className="text-sm text-gray-600 mt-1">
                将应用到全部 {taskCount} 个任务
              </p>
            )}
          </div>

          {/* R - 执行者（多选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              R - 执行者（可多选）
            </label>
            <div className="flex flex-wrap gap-2">
              {personnel.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePerson(responsible, setResponsible, p.name)}
                  className={`px-3 py-1 rounded text-sm ${
                    responsible.includes(p.name)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {responsible.length > 0 && (
              <p className="text-sm text-blue-600 mt-1">已选: {responsible.join(', ')}</p>
            )}
          </div>

          {/* A - 批准人（单选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              A - 批准人（单选）
            </label>
            <div className="flex flex-wrap gap-2">
              {personnel.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setAccountable(accountable === p.name ? '' : p.name)}
                  className={`px-3 py-1 rounded text-sm ${
                    accountable === p.name
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {accountable && (
              <p className="text-sm text-green-600 mt-1">已选: {accountable}</p>
            )}
          </div>

          {/* C - 咨询人（多选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              C - 咨询人（可多选）
            </label>
            <div className="flex flex-wrap gap-2">
              {personnel.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePerson(consulted, setConsulted, p.name)}
                  className={`px-3 py-1 rounded text-sm ${
                    consulted.includes(p.name)
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {consulted.length > 0 && (
              <p className="text-sm text-yellow-600 mt-1">已选: {consulted.join(', ')}</p>
            )}
          </div>

          {/* I - 知会人（多选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I - 知会人（可多选）
            </label>
            <div className="flex flex-wrap gap-2">
              {personnel.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePerson(informed, setInformed, p.name)}
                  className={`px-3 py-1 rounded text-sm ${
                    informed.includes(p.name)
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {informed.length > 0 && (
              <p className="text-sm text-purple-600 mt-1">已选: {informed.join(', ')}</p>
            )}
          </div>

          {personnel.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              人员库为空，请先在"人员库"中添加人员
            </p>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || personnel.length === 0}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '批量应用'}
          </button>
        </div>
      </div>
    </div>
  );
}
