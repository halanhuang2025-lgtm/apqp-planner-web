/**
 * 项目总览页面
 */

import { useEffect } from 'react';
import { useProjectStore } from '../stores/projectStore';
import type { Project } from '../types/project';

interface ProjectOverviewProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchProject: (projectId: string) => void;
}

export function ProjectOverview({ isOpen, onClose, onSwitchProject }: ProjectOverviewProps) {
  const { projects, currentProject, fetchProjects, isLoading } = useProjectStore();

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen, fetchProjects]);

  if (!isOpen) return null;

  // 筛选活跃项目
  const activeProjects = projects.filter(p => p.status === 'active');
  const archivedProjects = projects.filter(p => p.status === 'archived');

  // 计算统计数据
  const totalProjects = activeProjects.length;
  const completedProjects = activeProjects.filter(p => p.completion_rate >= 100).length;
  const avgProgress = totalProjects > 0
    ? Math.round(activeProjects.reduce((sum, p) => sum + p.completion_rate, 0) / totalProjects)
    : 0;
  const totalTasks = activeProjects.reduce((sum, p) => sum + p.task_count, 0);

  // 获取进度状态颜色
  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-blue-500';
    if (rate >= 20) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  // 获取进度状态文字
  const getProgressStatus = (rate: number) => {
    if (rate >= 100) return { text: '已完成', color: 'text-green-600 bg-green-50' };
    if (rate >= 80) return { text: '即将完成', color: 'text-blue-600 bg-blue-50' };
    if (rate >= 50) return { text: '进行中', color: 'text-yellow-600 bg-yellow-50' };
    if (rate > 0) return { text: '刚启动', color: 'text-orange-600 bg-orange-50' };
    return { text: '未开始', color: 'text-gray-600 bg-gray-50' };
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // 切换到项目
  const handleSwitchProject = async (project: Project) => {
    onSwitchProject(project.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[1000px] max-h-[90vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">项目总览</h2>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : (
            <>
              {/* 统计卡片 */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                  <div className="text-3xl font-bold">{totalProjects}</div>
                  <div className="text-blue-100 text-sm">进行中项目</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
                  <div className="text-3xl font-bold">{completedProjects}</div>
                  <div className="text-green-100 text-sm">已完成项目</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                  <div className="text-3xl font-bold">{avgProgress}%</div>
                  <div className="text-purple-100 text-sm">平均进度</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
                  <div className="text-3xl font-bold">{totalTasks}</div>
                  <div className="text-orange-100 text-sm">总任务数</div>
                </div>
              </div>

              {/* 项目进度条形图 */}
              {activeProjects.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">项目进度对比</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {activeProjects
                      .sort((a, b) => b.completion_rate - a.completion_rate)
                      .map((project) => (
                        <div key={project.id} className="flex items-center gap-3">
                          <span className="w-32 text-sm text-gray-700 truncate" title={project.name}>
                            {project.name}
                          </span>
                          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getProgressColor(project.completion_rate)} transition-all flex items-center justify-end pr-2`}
                              style={{ width: `${Math.max(project.completion_rate, 8)}%` }}
                            >
                              {project.completion_rate >= 15 && (
                                <span className="text-xs text-white font-medium">
                                  {Math.round(project.completion_rate)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {project.completion_rate < 15 && (
                            <span className="text-xs text-gray-500 w-10">
                              {Math.round(project.completion_rate)}%
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 项目卡片列表 */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">
                  进行中项目 ({activeProjects.length})
                </h3>
                {activeProjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无进行中的项目
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {activeProjects.map((project) => {
                      const status = getProgressStatus(project.completion_rate);
                      return (
                        <div
                          key={project.id}
                          className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                            currentProject?.id === project.id ? 'border-primary bg-primary/5' : 'border-gray-200'
                          }`}
                          onClick={() => handleSwitchProject(project)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {project.name}
                                </h4>
                                {currentProject?.id === project.id && (
                                  <span className="text-xs text-primary">(当前)</span>
                                )}
                              </div>
                              {project.description && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {project.description}
                                </p>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                              {status.text}
                            </span>
                          </div>

                          {/* 进度条 */}
                          <div className="mb-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>进度</span>
                              <span>{Math.round(project.completion_rate)}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getProgressColor(project.completion_rate)} transition-all`}
                                style={{ width: `${project.completion_rate}%` }}
                              />
                            </div>
                          </div>

                          {/* 底部信息 */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{project.task_count} 个任务</span>
                            <span>更新于 {formatDate(project.updated_at)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 已归档项目 */}
              {archivedProjects.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">
                    已归档项目 ({archivedProjects.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {archivedProjects.map((project) => (
                      <div
                        key={project.id}
                        className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                      >
                        <h4 className="font-medium text-gray-600 truncate text-sm">
                          {project.name}
                        </h4>
                        <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                          <span>{project.task_count} 个任务</span>
                          <span>{Math.round(project.completion_rate)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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
