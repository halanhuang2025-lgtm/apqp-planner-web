/**
 * 人员库管理对话框
 */

import { useState, useEffect } from 'react';
import * as taskApi from '../api/tasks';
import type { Person } from '../api/tasks';

interface PersonnelManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PersonnelManager({ isOpen, onClose }: PersonnelManagerProps) {
  const [personnel, setPersonnel] = useState<Person[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 新增人员表单
  const [newName, setNewName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDepartment, setEditingDepartment] = useState('');

  // 部门管理
  const [showDepartmentManager, setShowDepartmentManager] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  // 筛选
  const [filterDepartment, setFilterDepartment] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
      setError(null);
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const data = await taskApi.getPersonnel();
      setPersonnel(data.personnel);
      setDepartments(data.departments);
    } catch (err) {
      console.error('加载人员库失败:', err);
    }
  };

  if (!isOpen) return null;

  // 添加人员
  const handleAddPerson = async () => {
    if (!newName.trim()) return;

    setError(null);
    try {
      const updated = await taskApi.addPerson(newName.trim(), newDepartment);
      setPersonnel(updated);
      setNewName('');
      setNewDepartment('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '添加失败，人员可能已存在';
      setError(message);
    }
  };

  // 删除人员
  const handleDeletePerson = async (person: Person) => {
    if (!confirm(`确定要删除 "${person.name}" 吗？`)) return;

    setError(null);
    try {
      const updated = await taskApi.deletePerson(person.id);
      setPersonnel(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '删除失败';
      setError(message);
    }
  };

  // 开始编辑
  const handleStartEdit = (person: Person) => {
    setEditingId(person.id);
    setEditingName(person.name);
    setEditingDepartment(person.department);
    setError(null);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    setError(null);
    try {
      const updated = await taskApi.updatePerson(editingId, editingName.trim(), editingDepartment);
      setPersonnel(updated);
      setEditingId(null);
      setEditingName('');
      setEditingDepartment('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '更新失败';
      setError(message);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingDepartment('');
  };

  // 添加部门
  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) return;

    setError(null);
    try {
      const updated = await taskApi.addDepartment(newDeptName.trim());
      setDepartments(updated);
      setNewDeptName('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '添加部门失败';
      setError(message);
    }
  };

  // 删除部门
  const handleDeleteDepartment = async (name: string) => {
    if (!confirm(`确定要删除部门 "${name}" 吗？`)) return;

    setError(null);
    try {
      const updated = await taskApi.deleteDepartment(name);
      setDepartments(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '删除部门失败，可能有人员属于此部门';
      setError(message);
    }
  };

  // 筛选后的人员列表
  const filteredPersonnel = filterDepartment
    ? personnel.filter(p => p.department === filterDepartment)
    : personnel;

  // 按部门分组
  const groupedPersonnel: Record<string, Person[]> = {};
  filteredPersonnel.forEach(person => {
    const dept = person.department || '未分配部门';
    if (!groupedPersonnel[dept]) {
      groupedPersonnel[dept] = [];
    }
    groupedPersonnel[dept].push(person);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[700px] max-h-[85vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">人员库管理</h2>
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

          {/* 添加新人员 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              添加新人员
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                className="input flex-1"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="姓名"
                onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
              />
              <select
                className="input w-40"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
              >
                <option value="">选择部门</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <button
                onClick={handleAddPerson}
                disabled={!newName.trim()}
                className={`btn ${newName.trim() ? 'btn-primary' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                添加
              </button>
            </div>
          </div>

          {/* 工具栏 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <select
                className="input w-40"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="">全部部门</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">
                共 {filteredPersonnel.length} 人
              </span>
            </div>
            <button
              onClick={() => setShowDepartmentManager(!showDepartmentManager)}
              className="text-sm text-primary hover:text-primary-dark"
            >
              {showDepartmentManager ? '隐藏部门管理' : '管理部门'}
            </button>
          </div>

          {/* 部门管理面板 */}
          {showDepartmentManager && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                部门管理
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  className="input flex-1"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="新部门名称"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
                />
                <button
                  onClick={handleAddDepartment}
                  disabled={!newDeptName.trim()}
                  className="btn btn-secondary"
                >
                  添加部门
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => (
                  <span
                    key={dept}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    {dept}
                    <button
                      onClick={() => handleDeleteDepartment(dept)}
                      className="text-gray-400 hover:text-red-500 ml-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 人员列表 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              人员列表
            </label>
            {filteredPersonnel.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {filterDepartment ? `"${filterDepartment}" 部门暂无人员` : '暂无人员，请添加'}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedPersonnel).map(([dept, persons]) => (
                  <div key={dept} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="font-medium text-gray-700">{dept}</span>
                      <span className="text-sm text-gray-500 ml-2">({persons.length}人)</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {persons.map((person) => (
                        <div
                          key={person.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                        >
                          {editingId === person.id ? (
                            <>
                              <input
                                type="text"
                                className="input flex-1"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                autoFocus
                              />
                              <select
                                className="input w-32"
                                value={editingDepartment}
                                onChange={(e) => setEditingDepartment(e.target.value)}
                              >
                                <option value="">无部门</option>
                                {departments.map((d) => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                              <button
                                onClick={handleSaveEdit}
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
                              <div className="flex-1">
                                <span className="text-gray-900 font-medium">{person.name}</span>
                              </div>
                              <button
                                onClick={() => handleStartEdit(person)}
                                className="text-gray-400 hover:text-blue-600 p-1"
                                title="编辑"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeletePerson(person)}
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
