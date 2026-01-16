/**
 * 项目总览页面 - 支持分类统计和分组显示
 */

import { useEffect, useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import type { Project } from '../types/project';

interface ProjectOverviewProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchProject: (projectId: string) => void;
}

// 分类统计数据类型
interface CategoryStats {
  category: string;
  count: number;
  avgProgress: number;
  completed: number;
}

export function ProjectOverview({ isOpen, onClose, onSwitchProject }: ProjectOverviewProps) {
  const {
    projects,
    currentProject,
    categories,
    categoryFilter,
    viewMode,
    setCategoryFilter,
    setViewMode,
    fetchProjects,
    fetchCategories,
    isLoading,
  } = useProjectStore();

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      fetchCategories();
    }
  }, [isOpen, fetchProjects, fetchCategories]);

  if (!isOpen) return null;

  // 筛选活跃项目
  const activeProjects = projects.filter(p => p.status === 'active');
  const archivedProjects = projects.filter(p => p.status === 'archived');

  // 根据分类筛选
  const filteredActiveProjects = categoryFilter
    ? activeProjects.filter(p => p.category === categoryFilter)
    : activeProjects;

  // 计算统计数据
  const totalProjects = activeProjects.length;
  const completedProjects = activeProjects.filter(p => p.completion_rate >= 100).length;
  const avgProgress = totalProjects > 0
    ? Math.round(activeProjects.reduce((sum, p) => sum + p.completion_rate, 0) / totalProjects)
    : 0;
  const totalTasks = activeProjects.reduce((sum, p) => sum + p.task_count, 0);

  // 计算分类统计
  const categoryStats: CategoryStats[] = categories.map(cat => {
    const projectsInCat = activeProjects.filter(p => p.category === cat);
    const avgProgressCat = projectsInCat.length > 0
      ? projectsInCat.reduce((sum, p) => sum + p.completion_rate, 0) / projectsInCat.length
      : 0;
    return {
      category: cat,
      count: projectsInCat.length,
      avgProgress: Math.round(avgProgressCat),
      completed: projectsInCat.filter(p => p.completion_rate >= 100).length,
    };
  }).filter(stat => stat.count > 0);  // 只显示有项目的分类

  // 未分类项目统计
  const uncategorizedProjects = activeProjects.filter(p => !p.category);
  if (uncategorizedProjects.length > 0) {
    const avgProgressUncat = uncategorizedProjects.reduce((sum, p) => sum + p.completion_rate, 0) / uncategorizedProjects.length;
    categoryStats.push({
      category: '未分类',
      count: uncategorizedProjects.length,
      avgProgress: Math.round(avgProgressUncat),
      completed: uncategorizedProjects.filter(p => p.completion_rate >= 100).length,
    });
  }

  // 分组显示项目
  const groupedProjects: Record<string, Project[]> = {};
  if (viewMode === 'grouped') {
    categories.forEach(cat => {
      const projectsInCat = filteredActiveProjects.filter(p => p.category === cat);
      if (projectsInCat.length > 0) {
        groupedProjects[cat] = projectsInCat;
      }
    });
    // 未分类项目
    const uncategorized = filteredActiveProjects.filter(p => !p.category);
    if (uncategorized.length > 0) {
      groupedProjects['未分类'] = uncategorized;
    }
  }

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

  // 切换分类折叠状态
  const toggleCategoryCollapse = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  // 渲染项目卡片
  const renderProjectCard = (project: Project) => {
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
            {/* 项目详细信息 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {project.customer && (
                <span className="text-xs text-gray-600">
                  <span className="text-gray-400">客户:</span> {project.customer}
                </span>
              )}
              {project.model && (
                <span className="text-xs text-gray-600">
                  <span className="text-gray-400">机型:</span> {project.model}
                </span>
              )}
              {project.category && (
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {project.category}
                </span>
              )}
            </div>
            {project.machine_no && (
              <p className="text-xs text-gray-500 mt-0.5">
                整机编号: {project.machine_no}
              </p>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${status.color} whitespace-nowrap`}>
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

              {/* 分类统计面板 */}
              {categoryStats.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">分类统计</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {categoryStats
                      .sort((a, b) => b.count - a.count)
                      .map((stat) => (
                        <div
                          key={stat.category}
                          className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded -m-2"
                          onClick={() => setCategoryFilter(categoryFilter === stat.category ? '' : stat.category)}
                        >
                          <span className={`w-24 text-sm font-medium truncate ${
                            categoryFilter === stat.category ? 'text-primary' : 'text-gray-700'
                          }`} title={stat.category}>
                            {stat.category}
                          </span>
                          <span className="text-xs text-gray-500 w-12">({stat.count}个)</span>
                          <div className="flex-1 h-5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getProgressColor(stat.avgProgress)} transition-all flex items-center justify-end pr-2`}
                              style={{ width: `${Math.max(stat.avgProgress, 8)}%` }}
                            >
                              {stat.avgProgress >= 20 && (
                                <span className="text-xs text-white font-medium">
                                  {stat.avgProgress}%
                                </span>
                              )}
                            </div>
                          </div>
                          {stat.avgProgress < 20 && (
                            <span className="text-xs text-gray-500 w-10">
                              {stat.avgProgress}%
                            </span>
                          )}
                          {stat.completed > 0 && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                              {stat.completed}已完成
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 筛选和视图控制 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <select
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="">全部分类</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {categoryFilter && (
                    <button
                      onClick={() => setCategoryFilter('')}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      清除筛选
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grouped')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      viewMode === 'grouped'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    分组显示
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    列表显示
                  </button>
                </div>
              </div>

              {/* 项目列表 */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">
                  进行中项目 ({filteredActiveProjects.length})
                  {categoryFilter && ` - ${categoryFilter}`}
                </h3>

                {filteredActiveProjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {categoryFilter ? `"${categoryFilter}" 分类下暂无项目` : '暂无进行中的项目'}
                  </div>
                ) : viewMode === 'grouped' ? (
                  /* 分组视图 */
                  <div className="space-y-4">
                    {Object.entries(groupedProjects).map(([category, projectsInGroup]) => (
                      <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* 分组标题 */}
                        <div
                          className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                          onClick={() => toggleCategoryCollapse(category)}
                        >
                          <div className="flex items-center gap-2">
                            <svg
                              className={`w-4 h-4 text-gray-500 transition-transform ${
                                collapsedCategories.has(category) ? '' : 'rotate-90'
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="font-medium text-gray-700">{category}</span>
                            <span className="text-sm text-gray-500">({projectsInGroup.length}个项目)</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>平均进度</span>
                            <span className="font-medium">
                              {Math.round(
                                projectsInGroup.reduce((sum, p) => sum + p.completion_rate, 0) / projectsInGroup.length
                              )}%
                            </span>
                          </div>
                        </div>
                        {/* 分组内容 */}
                        {!collapsedCategories.has(category) && (
                          <div className="p-4 grid grid-cols-2 gap-4">
                            {projectsInGroup.map(renderProjectCard)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 列表视图 */
                  <div className="grid grid-cols-2 gap-4">
                    {filteredActiveProjects.map(renderProjectCard)}
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
