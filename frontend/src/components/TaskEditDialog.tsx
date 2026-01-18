/**
 * 任务编辑对话框
 * 包含任务信息编辑和进度记录功能
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import type { Task, ProgressRecord } from '../types/task';
import { recordProgress, getProgressHistory, getPersonnel, deleteProgressRecord } from '../api/tasks';
import type { Person } from '../api/tasks';
import { useTaskStore } from '../stores/taskStore';

interface TaskEditDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'index'>) => void;
  mode: 'edit' | 'add';
}

export function TaskEditDialog({ task, isOpen, onClose, onSave, mode }: TaskEditDialogProps) {
  // 获取里程碑列表和任务列表
  const { milestones, fetchMilestones, tasks, shiftTaskNumbers } = useTaskStore();

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
    // RACI 职责分配
    responsible: [],
    accountable: '',
    consulted: [],
    informed: [],
  });

  // 进度记录字段
  const [note, setNote] = useState('');
  const [issues, setIssues] = useState('');
  const [history, setHistory] = useState<ProgressRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialProgress, setInitialProgress] = useState(0);
  const [initialStatus, setInitialStatus] = useState('未开始');
  const [initialNote, setInitialNote] = useState('');
  const [initialIssues, setInitialIssues] = useState('');

  // 人员库
  const [personnel, setPersonnel] = useState<Person[]>([]);

  // 插入编号状态
  const [isShifting, setIsShifting] = useState(false);

  // 加载里程碑列表和人员库
  useEffect(() => {
    if (isOpen) {
      fetchMilestones();
      loadPersonnel();
    }
  }, [isOpen, fetchMilestones]);

  const loadPersonnel = async () => {
    try {
      const data = await getPersonnel();
      setPersonnel(data.personnel);
    } catch (error) {
      console.error('加载人员库失败:', error);
    }
  };

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
        // RACI 职责分配
        responsible: task.responsible || [],
        accountable: task.accountable || '',
        consulted: task.consulted || [],
        informed: task.informed || [],
      });
      setInitialProgress(task.progress);
      setInitialStatus(task.status);
      // 重置进度记录字段（loadHistory 会检查今天是否有记录）
      setNote('');
      setIssues('');
      setInitialNote('');
      setInitialIssues('');
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
        // RACI 职责分配
        responsible: [],
        accountable: '',
        consulted: [],
        informed: [],
      });
      setInitialProgress(0);
      setInitialStatus('未开始');
      setNote('');
      setIssues('');
      setInitialNote('');
      setInitialIssues('');
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
        const recordNote = todayRecord.note || '';
        const recordIssues = todayRecord.issues || '';
        setNote(recordNote);
        setIssues(recordIssues);
        setInitialNote(recordNote);
        setInitialIssues(recordIssues);
      } else {
        setInitialNote('');
        setInitialIssues('');
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!task) return;

    if (!confirm('确定要删除这条记录吗？')) {
      return;
    }

    try {
      await deleteProgressRecord(task.index, recordId);
      // 重新加载历史记录
      await loadHistoryAndTodayRecord(task.index);
    } catch (error) {
      console.error('删除记录失败:', error);
      alert(`删除失败：${getErrorMessage(error)}`);
    }
  };

  const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        return detail;
      }
      if (error.response?.status) {
        return `请求失败 (${error.response.status})`;
      }
      return error.message || '请求失败';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return '未知错误';
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let updatedFormData = { ...formData };

      // 自动从 RACI 负责人设置 owner（向后兼容）
      if (formData.responsible.length > 0) {
        updatedFormData.owner = formData.responsible[0];
      } else if (formData.accountable) {
        updatedFormData.owner = formData.accountable;
      }

      // 编辑模式下记录进度（自动联动实际日期）
      if (mode === 'edit' && task) {
        const trimmedNote = note.trim();
        const trimmedIssues = issues.trim();
        const hasProgressChange = formData.progress !== initialProgress || formData.status !== initialStatus;
        const hasNoteChange = trimmedNote !== initialNote || trimmedIssues !== initialIssues;

        if (hasProgressChange || hasNoteChange) {
          const result = await recordProgress({
            task_index: task.index,
            progress: formData.progress,
            status: formData.status,
            note: trimmedNote,
            issues: trimmedIssues,
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
      }

      // 保存任务
      await onSave(updatedFormData);
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
      alert(`保存失败：${getErrorMessage(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string | number | boolean | null | string[]) => {
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

  // 自动生成任务编号（里程碑序号.里程碑内序号）
  const generateTaskNo = () => {
    // 必须先选择里程碑
    if (!formData.milestone) {
      alert('请先选择里程碑');
      return;
    }

    // 1. 获取当前项目中已使用的里程碑（按 milestones 配置顺序）
    const usedMilestones = milestones.filter(m =>
      tasks.some(t => t.milestone === m) || m === formData.milestone
    );

    // 2. 获取当前里程碑在已使用列表中的序号
    const milestoneIndex = usedMilestones.indexOf(formData.milestone) + 1;
    if (milestoneIndex === 0) {
      alert('里程碑无效');
      return;
    }

    // 3. 查找该里程碑下的最大序号
    let maxSeq = 0;
    tasks.forEach(t => {
      if (t.milestone === formData.milestone) {
        // 解析编号格式: "1.2" -> 提取 "2"
        const match = t.task_no.match(/^\d+\.(\d+)$/);
        if (match) {
          const seq = parseInt(match[1]);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    });

    // 4. 生成新编号
    const newTaskNo = `${milestoneIndex}.${maxSeq + 1}`;
    handleChange('task_no', newTaskNo);
  };

  // 插入编号（顺延后续任务编号）
  const insertTaskNo = async () => {
    // 必须先选择里程碑
    if (!formData.milestone) {
      alert('请先选择里程碑');
      return;
    }

    // 解析当前编号
    const match = formData.task_no.match(/^(\d+)\.(\d+)$/);
    if (!match) {
      alert('请输入有效的编号格式（如 1.2）');
      return;
    }

    const seq = parseInt(match[2]);

    // 确认操作
    if (!confirm(`将在 ${formData.milestone} 里程碑中插入编号 ${formData.task_no}，后续任务编号将顺延。确定继续？`)) {
      return;
    }

    setIsShifting(true);
    try {
      await shiftTaskNumbers(formData.milestone, seq);
    } catch (error) {
      console.error('顺延编号失败:', error);
      alert('顺延编号失败');
    } finally {
      setIsShifting(false);
    }
  };

  // 获取可选的前置任务列表（排除当前任务）
  const availablePredecessors = tasks.filter(t => {
    // 编辑模式下排除当前任务
    if (mode === 'edit' && task && t.index === task.index) {
      return false;
    }
    return true;
  });

  // 解析当前前置任务字符串为数组
  const selectedPredecessors = formData.predecessor
    ? formData.predecessor.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // 切换前置任务选择
  const togglePredecessor = (taskNo: string) => {
    const newSelected = selectedPredecessors.includes(taskNo)
      ? selectedPredecessors.filter(n => n !== taskNo)
      : [...selectedPredecessors, taskNo];
    handleChange('predecessor', newSelected.join(','));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
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
                  {milestones.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* 任务编号 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  任务编号
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    value={formData.task_no}
                    onChange={(e) => handleChange('task_no', e.target.value)}
                    placeholder="如: 1.1"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateTaskNo}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
                    title="自动生成编号（追加到末尾）"
                  >
                    自动
                  </button>
                  {mode === 'add' && (
                    <button
                      type="button"
                      onClick={insertTaskNo}
                      disabled={isShifting}
                      className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 disabled:opacity-50"
                      title="插入编号，后续任务编号顺延"
                    >
                      {isShifting ? '处理中...' : '插入'}
                    </button>
                  )}
                </div>
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

              {/* 前置任务 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  前置任务 {selectedPredecessors.length > 0 && `(${selectedPredecessors.length})`}
                </label>
                <div className="border rounded-lg p-2 max-h-32 overflow-y-auto bg-gray-50">
                  {availablePredecessors.length === 0 ? (
                    <span className="text-gray-400 text-sm">暂无可选任务</span>
                  ) : (
                    availablePredecessors.map((t) => (
                      <label key={t.index} className="flex items-center text-sm py-1 hover:bg-gray-100 px-1 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPredecessors.includes(t.task_no)}
                          onChange={() => togglePredecessor(t.task_no)}
                          className="mr-2"
                        />
                        <span className="font-medium text-gray-700">{t.task_no}</span>
                        <span className="ml-2 text-gray-500 truncate">{t.name}</span>
                      </label>
                    ))
                  )}
                </div>
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

            {/* RACI 职责分配 */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                RACI 职责分配
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (R-负责 A-批准 C-咨询 I-知会)
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* R - 负责人（执行者）*/}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="inline-block w-5 h-5 bg-blue-500 text-white text-xs rounded mr-1 text-center leading-5">R</span>
                    负责人（执行者）
                  </label>
                  <div className="border rounded-lg p-2 max-h-32 overflow-y-auto bg-gray-50">
                    {personnel.length === 0 ? (
                      <span className="text-gray-400 text-sm">暂无人员</span>
                    ) : (
                      personnel.map((person) => (
                        <label key={person.id} className="flex items-center text-sm py-1 hover:bg-gray-100 px-1 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.responsible.includes(person.name)}
                            onChange={(e) => {
                              const newList = e.target.checked
                                ? [...formData.responsible, person.name]
                                : formData.responsible.filter(n => n !== person.name);
                              handleChange('responsible', newList);
                            }}
                            className="mr-2"
                          />
                          {person.name}
                          {person.department && <span className="text-gray-400 ml-1">({person.department})</span>}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* A - 批准人（最终负责）*/}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="inline-block w-5 h-5 bg-red-500 text-white text-xs rounded mr-1 text-center leading-5">A</span>
                    批准人（最终负责）
                  </label>
                  <select
                    className="input"
                    value={formData.accountable}
                    onChange={(e) => handleChange('accountable', e.target.value)}
                  >
                    <option value="">请选择</option>
                    {personnel.map((person) => (
                      <option key={person.id} value={person.name}>
                        {person.name}{person.department ? ` (${person.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* C - 咨询人 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="inline-block w-5 h-5 bg-yellow-500 text-white text-xs rounded mr-1 text-center leading-5">C</span>
                    咨询人
                  </label>
                  <div className="border rounded-lg p-2 max-h-32 overflow-y-auto bg-gray-50">
                    {personnel.length === 0 ? (
                      <span className="text-gray-400 text-sm">暂无人员</span>
                    ) : (
                      personnel.map((person) => (
                        <label key={person.id} className="flex items-center text-sm py-1 hover:bg-gray-100 px-1 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.consulted.includes(person.name)}
                            onChange={(e) => {
                              const newList = e.target.checked
                                ? [...formData.consulted, person.name]
                                : formData.consulted.filter(n => n !== person.name);
                              handleChange('consulted', newList);
                            }}
                            className="mr-2"
                          />
                          {person.name}
                          {person.department && <span className="text-gray-400 ml-1">({person.department})</span>}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* I - 知会人 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="inline-block w-5 h-5 bg-green-500 text-white text-xs rounded mr-1 text-center leading-5">I</span>
                    知会人
                  </label>
                  <div className="border rounded-lg p-2 max-h-32 overflow-y-auto bg-gray-50">
                    {personnel.length === 0 ? (
                      <span className="text-gray-400 text-sm">暂无人员</span>
                    ) : (
                      personnel.map((person) => (
                        <label key={person.id} className="flex items-center text-sm py-1 hover:bg-gray-100 px-1 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.informed.includes(person.name)}
                            onChange={(e) => {
                              const newList = e.target.checked
                                ? [...formData.informed, person.name]
                                : formData.informed.filter(n => n !== person.name);
                              handleChange('informed', newList);
                            }}
                            className="mr-2"
                          />
                          {person.name}
                          {person.department && <span className="text-gray-400 ml-1">({person.department})</span>}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 日期设置区域 - 仅编辑模式显示 */}
            {mode === 'edit' && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">日期设置</h3>
                  {(formData.actual_start || formData.actual_end) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleChange('actual_start', null);
                        handleChange('actual_end', null);
                      }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      清空实际日期
                    </button>
                  )}
                </div>
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
                              <th className="px-2 py-1 text-center w-12">操作</th>
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
                                <td className="px-2 py-1 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRecord(record.record_id)}
                                    className="text-red-500 hover:text-red-700"
                                    title="删除此记录"
                                  >
                                    x
                                  </button>
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
