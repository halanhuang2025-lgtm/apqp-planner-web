/**
 * APQP 项目计划生成器 - Web 版
 * 主应用组件
 */

import { useEffect, useState } from 'react';
import { useTaskStore } from './stores/taskStore';
import { useProjectStore } from './stores/projectStore';
import { TaskEditDialog } from './components/TaskEditDialog';
import { ProjectSelector } from './components/ProjectSelector';
import { ProjectListModal } from './components/ProjectListModal';
import { CreateProjectDialog } from './components/CreateProjectDialog';
import { ProjectCompareView } from './components/ProjectCompareView';
import { ProjectOverview } from './components/ProjectOverview';
import { MilestoneManager } from './components/MilestoneManager';
import { CategoryManager } from './components/CategoryManager';
import { PersonnelManager } from './components/PersonnelManager';
import { BatchRaciDialog } from './components/BatchRaciDialog';
import { ProjectDescriptionDialog } from './components/ProjectDescriptionDialog';
import { exportExcel } from './api/tasks';
import api from './api/client';
import type { Task } from './types/task';

function App() {
  const {
    tasks,
    selectedIndices,
    isLoading,
    error,
    scheduleMode,
    scheduleDate,
    excludeWeekends,
    excludeHolidays,
    scheduleSummary,
    setScheduleMode,
    setScheduleDate,
    setExcludeWeekends,
    setExcludeHolidays,
    toggleSelect,
    loadTemplate,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    toggleExclude,
    calculateSchedule,
  } = useTaskStore();

  const {
    currentProject,
    showProjectList,
    showCreateDialog,
    showCompareView,
    setShowProjectList,
    setShowCreateDialog,
    setShowCompareView,
    fetchProjects,
    compareProjects,
    switchProject,
    updateProject,
    saveAsTemplate,
  } = useProjectStore();

  const [ganttStartDate, setGanttStartDate] = useState('');  // 甘特图开始日期
  const [showOverview, setShowOverview] = useState(false);  // 项目总览
  const [showMilestoneManager, setShowMilestoneManager] = useState(false);  // 里程碑管理
  const [showCategoryManager, setShowCategoryManager] = useState(false);  // 机器分类管理
  const [showPersonnelManager, setShowPersonnelManager] = useState(false);  // 人员库管理
  const [showBatchRaci, setShowBatchRaci] = useState(false);  // 批量RACI设置
  const [showProjectDescription, setShowProjectDescription] = useState(false);  // 项目描述编辑
  const [expandDescription, setExpandDescription] = useState(true);  // 项目描述展开状态

  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'edit' | 'add'>('edit');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // 初始加载项目列表和任务
  useEffect(() => {
    fetchProjects();
    loadTemplate();
  }, []);

  // 项目切换时重新加载任务
  useEffect(() => {
    if (currentProject) {
      loadTemplate();
    }
  }, [currentProject?.id]);

  // 页面关闭时退出服务器（仅在桌面应用模式下）
  // 注意：刷新页面也会触发 beforeunload，所以只在非开发模式下启用
  useEffect(() => {
    // 检测是否为桌面应用模式（通过 file:// 协议或特定标识）
    const isDesktopApp = window.location.protocol === 'file:' ||
                         window.location.hostname === '127.0.0.1';

    // 开发模式下不自动关闭服务器（避免刷新时误关闭）
    if (import.meta.env.DEV) return;

    const handleBeforeUnload = () => {
      if (isDesktopApp) {
        navigator.sendBeacon('/api/shutdown', '');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 退出应用
  const handleExit = async () => {
    if (confirm('确定要退出应用吗？')) {
      try {
        await api.post('/api/shutdown');
        window.close();
      } catch {
        window.close();
      }
    }
  };

  // 格式化计划日期范围
  const formatDateRange = (task: Task) => {
    if (!task.start_date || !task.end_date) return '-';
    const start = task.manual_start ? `📌${task.start_date}` : task.start_date;
    const end = task.manual_end ? `${task.end_date}📌` : task.end_date;
    return `${start} ~ ${end}`;
  };

  // 格式化实际日期范围
  const formatActualDateRange = (task: Task) => {
    if (!task.actual_start && !task.actual_end) return '-';
    const start = task.actual_start || '?';
    const end = task.actual_end || '进行中';
    return `${start} ~ ${end}`;
  };

  // 计算进度差异
  const calculateDiff = (task: Task) => {
    if (!task.end_date || !task.actual_end) return '-';
    const planned = new Date(task.end_date);
    const actual = new Date(task.actual_end);
    const diff = Math.round((actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0) return `+${diff}`;
    if (diff < 0) return `${diff}`;
    return '0';
  };

  // 获取状态简写
  const getStatusShort = (status: string) => {
    const map: Record<string, string> = {
      '未开始': '',
      '进行中': '中',
      '已完成': '完',
      '暂停': '停',
    };
    return map[status] || '';
  };

  // 获取选中的任务
  const getSelectedTask = () => {
    if (selectedIndices.length === 1) {
      return tasks[selectedIndices[0]];
    }
    return null;
  };

  // 打开添加对话框
  const handleAddTask = () => {
    setEditingTask(null);
    setDialogMode('add');
    setDialogOpen(true);
  };

  // 打开编辑对话框（双击）
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  // 保存任务
  const handleSaveTask = async (taskData: Omit<Task, 'index'>) => {
    if (dialogMode === 'edit' && editingTask) {
      await updateTask(editingTask.index, taskData);
    } else {
      // 添加到选中位置的后面，或者末尾
      const position = selectedIndices.length === 1 ? selectedIndices[0] + 1 : undefined;
      await addTask(taskData, position);
    }
  };

  // 导出 Excel
  const handleExportExcel = async () => {
    try {
      // 项目名称：优先使用当前项目名称，否则使用默认名称
      const projectName = currentProject?.name || '新产品开发项目';
      // 甘特图开始日期：优先使用用户设置，否则使用排期日期
      const effectiveGanttStart = ganttStartDate || scheduleDate;
      const blob = await exportExcel({
        project_name: projectName,
        start_date: scheduleDate,
        gantt_start_date: effectiveGanttStart,
        gantt_days: 0,  // 0表示自动根据项目结束日期计算
        exclude_weekends: excludeWeekends,
        exclude_holidays: excludeHolidays,
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}计划表.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出 Excel 失败，请重试');
    }
  };

  // 对比项目
  const handleCompare = async (projectIds: string[]) => {
    await compareProjects(projectIds);
  };

  // 保存为模板
  const handleSaveAsTemplate = async () => {
    if (!currentProject) return;

    const templateName = prompt('请输入模板名称:', `${currentProject.name}-模板`);
    if (!templateName) return;

    const result = await saveAsTemplate(currentProject.id, templateName);
    if (result) {
      alert(`模板"${templateName}"保存成功！`);
    } else {
      alert('保存模板失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部标题栏 */}
      <header className="bg-primary text-white py-4 px-6 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold">APQP 项目计划生成器 v2.2</h1>
          <ProjectSelector
            onOpenList={() => setShowProjectList(true)}
            onCreateProject={() => setShowCreateDialog(true)}
          />
          <button
            onClick={() => setShowOverview(true)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            项目总览
          </button>
          <button
            onClick={() => setShowMilestoneManager(true)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            里程碑
          </button>
          <button
            onClick={() => setShowCategoryManager(true)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            机器分类
          </button>
          <button
            onClick={() => setShowPersonnelManager(true)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            人员库
          </button>
        </div>
        <button
          onClick={handleExit}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
        >
          退出
        </button>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* 项目信息卡片 */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              项目：{currentProject?.name || '未选择项目'}
            </h2>
            {currentProject && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>进度: {Math.round(currentProject.completion_rate)}%</span>
                  <span>·</span>
                  <span>{currentProject.task_count} 个任务</span>
                  <span>·</span>
                  {(() => {
                    // 计算项目总天数：优先用排期结果，否则用任务工期之和
                    const totalDays = scheduleSummary?.total_days ||
                      tasks.reduce((sum, t) => sum + (t.duration || 0), 0);
                    return (
                      <span className="font-medium text-primary">总天数: {totalDays} 天</span>
                    );
                  })()}
                </div>
                <button
                  onClick={handleSaveAsTemplate}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  title="将当前项目保存为模板"
                >
                  保存为模板
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* 排期方式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                排期方式
              </label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scheduleMode"
                    checked={scheduleMode === 'forward'}
                    onChange={() => setScheduleMode('forward')}
                    className="mr-2"
                  />
                  正向
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scheduleMode"
                    checked={scheduleMode === 'backward'}
                    onChange={() => setScheduleMode('backward')}
                    className="mr-2"
                  />
                  倒推
                </label>
              </div>
            </div>

            {/* 日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {scheduleMode === 'forward' ? '开始日期' : '完成日期'}
              </label>
              <input
                type="date"
                className="input"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>

            {/* 刷新按钮 */}
            <div className="flex items-end">
              <button
                className="btn btn-primary"
                onClick={calculateSchedule}
                disabled={isLoading}
              >
                🔄 刷新日期
              </button>
            </div>
          </div>

          {/* 选项 */}
          <div className="flex gap-6 mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={excludeWeekends}
                onChange={(e) => setExcludeWeekends(e.target.checked)}
                className="mr-2"
              />
              排除周末（工作日计算）
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={excludeHolidays}
                onChange={(e) => setExcludeHolidays(e.target.checked)}
                className="mr-2"
              />
              排除法定节假日
            </label>
          </div>

          {/* Excel 导出设置 */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                甘特图开始日期
              </label>
              <input
                type="date"
                className="input"
                value={ganttStartDate}
                onChange={(e) => setGanttStartDate(e.target.value)}
                placeholder="默认使用排期日期"
              />
            </div>
            <div className="flex items-end text-xs text-gray-500">
              留空则使用排期日期
            </div>
          </div>
        </div>

        {/* 项目描述卡片 */}
        {currentProject && (
          <div className="card p-4 mb-6">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setExpandDescription(!expandDescription)}
            >
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className={`transform transition-transform ${expandDescription ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                项目描述
              </h2>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProjectDescription(true);
                }}
                className="text-sm text-primary hover:text-primary/80"
              >
                编辑
              </button>
            </div>

            {expandDescription && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 基本信息 */}
                <div className="space-y-2">
                  <div className="flex">
                    <span className="text-gray-500 w-20">客户:</span>
                    <span className="font-medium">{currentProject.customer || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-20">机型:</span>
                    <span className="font-medium">{currentProject.model || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-20">整机编号:</span>
                    <span className="font-medium">{currentProject.machine_no || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-20">分类:</span>
                    <span className="font-medium">{currentProject.category || '-'}</span>
                  </div>
                </div>

                {/* 产品规格 */}
                <div>
                  <div className="text-gray-500 mb-1">产品规格:</div>
                  <div className="bg-gray-50 p-2 rounded text-sm whitespace-pre-wrap min-h-[80px] max-h-[120px] overflow-y-auto">
                    {currentProject.specifications || '未填写'}
                  </div>
                </div>

                {/* 定制内容 */}
                <div>
                  <div className="text-gray-500 mb-1">定制内容:</div>
                  <div className="bg-gray-50 p-2 rounded text-sm whitespace-pre-wrap min-h-[80px] max-h-[120px] overflow-y-auto">
                    {currentProject.custom_requirements || '未填写'}
                  </div>
                </div>

                {/* 项目简介（如果有，占满一行） */}
                {currentProject.description && (
                  <div className="col-span-full">
                    <div className="text-gray-500 mb-1">项目简介:</div>
                    <div className="bg-gray-50 p-2 rounded text-sm">
                      {currentProject.description}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 任务列表卡片 */}
        <div className="card p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">任务列表</h2>

            {/* 工具栏 */}
            <div className="flex gap-2 flex-wrap">
              <button
                className="btn btn-primary text-sm py-1"
                onClick={handleAddTask}
              >
                添加任务
              </button>
              <button
                className="btn btn-secondary text-sm py-1"
                onClick={() => {
                  const task = getSelectedTask();
                  if (task) deleteTask(task.index);
                }}
                disabled={selectedIndices.length !== 1}
              >
                删除任务
              </button>
              <button
                className="btn btn-secondary text-sm py-1"
                onClick={() => {
                  const task = getSelectedTask();
                  if (task) toggleExclude(task.index);
                }}
                disabled={selectedIndices.length !== 1}
              >
                排除任务
              </button>
              <button
                className="btn btn-secondary text-sm py-1"
                onClick={() => setShowBatchRaci(true)}
                disabled={tasks.length === 0}
              >
                批量RACI
              </button>
              <button
                className="btn btn-secondary text-sm py-1"
                onClick={() => {
                  const task = getSelectedTask();
                  if (task) moveTask(task.index, 'up');
                }}
                disabled={selectedIndices.length !== 1}
              >
                上移
              </button>
              <button
                className="btn btn-secondary text-sm py-1"
                onClick={() => {
                  const task = getSelectedTask();
                  if (task) moveTask(task.index, 'down');
                }}
                disabled={selectedIndices.length !== 1}
              >
                下移
              </button>

              <div className="w-px h-8 bg-gray-300 mx-2" />

              <button
                className="btn btn-secondary text-sm py-1"
                onClick={loadTemplate}
                disabled={isLoading}
              >
                导入模板
              </button>
              <button
                className="btn btn-success text-sm py-1"
                onClick={handleExportExcel}
                disabled={isLoading || tasks.length === 0}
              >
                生成 Excel
              </button>
            </div>
          </div>

          {/* 任务表格 */}
          <div className="overflow-auto max-h-[500px] border border-gray-200 rounded">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">加载中...</div>
              </div>
            ) : (
              <table className="task-table">
                <thead>
                  <tr>
                    <th className="w-24">里程碑</th>
                    <th className="w-14">编号</th>
                    <th className="w-44">任务名称</th>
                    <th className="w-14">工期</th>
                    <th className="w-32">RACI</th>
                    <th className="w-14">前置</th>
                    <th className="w-48">计划日期</th>
                    <th className="w-48">实际日期</th>
                    <th className="w-20">进度</th>
                    <th className="w-14">差异</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr
                      key={`${task.task_no}-${task.index}`}
                      className={`
                        cursor-pointer transition-colors
                        ${selectedIndices.includes(task.index) ? 'selected' : ''}
                        ${task.excluded ? 'excluded' : ''}
                      `}
                      onClick={(e) => toggleSelect(task.index, e.metaKey || e.ctrlKey)}
                      onDoubleClick={() => handleEditTask(task)}
                    >
                      <td>{task.milestone}</td>
                      <td>{task.task_no}</td>
                      <td>
                        {task.excluded ? `[排除] ${task.name}` : task.name}
                      </td>
                      <td>{task.duration}天</td>
                      <td className="text-xs">
                        {task.responsible?.length > 0 && (
                          <span className="inline-block px-1 bg-blue-100 text-blue-700 rounded mr-1" title="负责人">
                            R:{task.responsible.join(',')}
                          </span>
                        )}
                        {task.accountable && (
                          <span className="inline-block px-1 bg-red-100 text-red-700 rounded mr-1" title="批准人">
                            A:{task.accountable}
                          </span>
                        )}
                        {task.consulted?.length > 0 && (
                          <span className="inline-block px-1 bg-yellow-100 text-yellow-700 rounded mr-1" title="咨询人">
                            C:{task.consulted.join(',')}
                          </span>
                        )}
                        {task.informed?.length > 0 && (
                          <span className="inline-block px-1 bg-green-100 text-green-700 rounded" title="知会人">
                            I:{task.informed.join(',')}
                          </span>
                        )}
                      </td>
                      <td>{task.predecessor || '-'}</td>
                      <td className="text-xs">{formatDateRange(task)}</td>
                      <td className="text-xs">{formatActualDateRange(task)}</td>
                      <td>
                        {task.progress}%
                        {getStatusShort(task.status) && ` (${getStatusShort(task.status)})`}
                      </td>
                      <td>{calculateDiff(task)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 状态栏 */}
          <div className="mt-4 text-sm text-gray-600 flex justify-between">
            <span>
              共 {tasks.length} 个任务
              {tasks.filter(t => t.excluded).length > 0 &&
                ` (已排除 ${tasks.filter(t => t.excluded).length} 个)`}
            </span>
            {scheduleSummary && (
              <span>
                {scheduleMode === 'forward' ? '正向排期' : '倒推排期'} |{' '}
                {scheduleSummary.start_date} ~ {scheduleSummary.end_date} (共 {scheduleSummary.total_days} 天)
              </span>
            )}
          </div>
        </div>
      </main>

      {/* 任务编辑对话框 */}
      <TaskEditDialog
        task={editingTask}
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveTask}
        mode={dialogMode}
      />

      {/* 项目列表弹窗 */}
      <ProjectListModal
        isOpen={showProjectList}
        onClose={() => setShowProjectList(false)}
        onCreateProject={() => {
          setShowProjectList(false);
          setShowCreateDialog(true);
        }}
        onCompare={handleCompare}
      />

      {/* 创建项目对话框 */}
      <CreateProjectDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      {/* 项目对比视图 */}
      <ProjectCompareView
        isOpen={showCompareView}
        onClose={() => setShowCompareView(false)}
      />

      {/* 项目总览 */}
      <ProjectOverview
        isOpen={showOverview}
        onClose={() => setShowOverview(false)}
        onSwitchProject={async (projectId) => {
          await switchProject(projectId);
          loadTemplate();
        }}
      />

      <MilestoneManager
        isOpen={showMilestoneManager}
        onClose={() => setShowMilestoneManager(false)}
      />

      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
      />

      <PersonnelManager
        isOpen={showPersonnelManager}
        onClose={() => setShowPersonnelManager(false)}
      />

      <BatchRaciDialog
        isOpen={showBatchRaci}
        onClose={() => setShowBatchRaci(false)}
        selectedIndices={selectedIndices}
        taskCount={tasks.length}
        onSuccess={() => {
          // 更新任务列表
          loadTemplate();
        }}
      />

      <ProjectDescriptionDialog
        isOpen={showProjectDescription}
        onClose={() => setShowProjectDescription(false)}
        project={currentProject}
        onSave={async (updates) => {
          if (currentProject) {
            await updateProject(currentProject.id, updates);
          }
        }}
      />
    </div>
  );
}

export default App;
