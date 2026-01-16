/**
 * 项目选择器组件 - 下拉菜单
 */

import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../stores/projectStore';
import type { Project } from '../types/project';

interface ProjectSelectorProps {
  onOpenList: () => void;
  onCreateProject: () => void;
}

export function ProjectSelector({ onOpenList, onCreateProject }: ProjectSelectorProps) {
  const { projects, currentProject, switchProject, isLoading } = useProjectStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 过滤项目列表
  const filteredProjects = projects
    .filter(p => p.status === 'active')
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 5);

  // 切换项目
  const handleSwitchProject = async (project: Project) => {
    await switchProject(project.id);
    setIsOpen(false);
    setSearchQuery('');
  };

  // 格式化进度
  const formatProgress = (rate: number) => {
    return `${Math.round(rate)}%`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors min-w-[200px]"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="flex-1 text-left truncate">
          {currentProject ? currentProject.name : '选择项目'}
        </span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* 搜索框 */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="搜索项目..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* 项目列表 */}
          <div className="max-h-60 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {searchQuery ? '未找到匹配的项目' : '暂无项目'}
              </div>
            ) : (
              filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSwitchProject(project)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
                    currentProject?.id === project.id ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {project.name}
                      </span>
                      {currentProject?.id === project.id && (
                        <span className="text-xs text-primary">(当前)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {project.task_count} 个任务 · 进度 {formatProgress(project.completion_rate)}
                    </div>
                  </div>
                  {/* 进度条 */}
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full ml-3">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${project.completion_rate}%` }}
                    />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* 底部操作 */}
          <div className="border-t border-gray-100 p-2 flex gap-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenList();
              }}
              className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              查看全部 ({projects.filter(p => p.status === 'active').length})
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onCreateProject();
              }}
              className="flex-1 px-3 py-2 text-sm text-white bg-primary hover:bg-primary-dark rounded transition-colors"
            >
              + 新建项目
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
