/**
 * 项目列表弹窗组件
 */

import { useState, useEffect } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { getNextProjectNo } from '../api/projects';
import type { Project, ProjectStatus, ProjectType } from '../types/project';
import { PROJECT_TYPES } from '../types/project';

interface ProjectListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: () => void;
  onCompare: (projectIds: string[]) => void;
}

export function ProjectListModal({ isOpen, onClose, onCreateProject, onCompare }: ProjectListModalProps) {
  const {
    projects,
    currentProject,
    categories,
    categoryFilter,
    setCategoryFilter,
    switchProject,
    deleteProject,
    duplicateProject,
    saveAsTemplate,
    updateProject,
    fetchCategories,
    isLoading,
  } = useProjectStore();

  const [activeTab, setActiveTab] = useState<ProjectStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showDuplicateInput, setShowDuplicateInput] = useState<string | null>(null);
  const [showTemplateInput, setShowTemplateInput] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [inputName, setInputName] = useState('');
  const [inputDescription, setInputDescription] = useState('');
  // 编辑项目的扩展字段
  const [inputProjectNo, setInputProjectNo] = useState('');
  const [inputProjectType, setInputProjectType] = useState('');
  const [generatedProjectNos, setGeneratedProjectNos] = useState<string[]>([]); // 追踪已生成的编号
  const [inputMachineNo, setInputMachineNo] = useState('');
  const [inputCustomer, setInputCustomer] = useState('');
  const [inputModel, setInputModel] = useState('');
  const [inputCategory, setInputCategory] = useState('');
  const [inputSpecifications, setInputSpecifications] = useState('');
  const [inputCustomRequirements, setInputCustomRequirements] = useState('');

  // 对话框打开时加载分类数据
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    } else {
      setGeneratedProjectNos([]);
    }
  }, [isOpen, fetchCategories]);

  if (!isOpen) return null;

  // 过滤项目
  const filteredProjects = projects
    .filter(p => p.status === activeTab)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(p => !categoryFilter || p.category === categoryFilter);

  // 切换项目
  const handleSwitch = async (project: Project) => {
    await switchProject(project.id);
    onClose();
  };

  // 删除项目
  const handleDelete = async (project: Project) => {
    if (confirm(`确定要删除项目"${project.name}"吗？此操作不可恢复。`)) {
      await deleteProject(project.id);
    }
  };

  // 复制项目
  const handleDuplicate = async (projectId: string) => {
    if (!inputName.trim()) return;
    await duplicateProject(projectId, inputName.trim());
    setShowDuplicateInput(null);
    setInputName('');
  };

  // 保存为模板
  const handleSaveAsTemplate = async (projectId: string) => {
    if (!inputName.trim()) return;
    await saveAsTemplate(projectId, inputName.trim());
    setShowTemplateInput(null);
    setInputName('');
  };

  // 开始编辑项目
  const startEditProject = (project: Project) => {
    setEditingProject(project.id);
    setInputName(project.name);
    setInputDescription(project.description || '');
    setInputProjectNo(project.project_no || '');
    setInputProjectType(project.project_type || '');
    setInputMachineNo(project.machine_no || '');
    setInputCustomer(project.customer || '');
    setInputModel(project.model || '');
    setInputCategory(project.category || '');
    setInputSpecifications(project.specifications || '');
    setInputCustomRequirements(project.custom_requirements || '');
  };

  // 保存项目编辑
  const handleSaveEdit = async (projectId: string) => {
    if (!inputName.trim()) return;
    await updateProject(projectId, {
      name: inputName.trim(),
      description: inputDescription.trim(),
      project_no: inputProjectNo.trim(),
      project_type: inputProjectType as ProjectType,
      machine_no: inputMachineNo.trim(),
      customer: inputCustomer.trim(),
      model: inputModel.trim(),
      category: inputCategory,
      specifications: inputSpecifications.trim(),
      custom_requirements: inputCustomRequirements.trim(),
    });
    cancelEdit();
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingProject(null);
    setInputName('');
    setInputDescription('');
    setInputProjectNo('');
    setInputProjectType('');
    setInputMachineNo('');
    setInputCustomer('');
    setInputModel('');
    setInputCategory('');
    setInputSpecifications('');
    setInputCustomRequirements('');
  };

  // 切换对比选择
  const toggleCompareSelection = (projectId: string) => {
    if (selectedForCompare.includes(projectId)) {
      setSelectedForCompare(selectedForCompare.filter(id => id !== projectId));
    } else if (selectedForCompare.length < 4) {
      setSelectedForCompare([...selectedForCompare, projectId]);
    }
  };

  // 开始对比
  const handleCompare = () => {
    if (selectedForCompare.length >= 2) {
      onCompare(selectedForCompare);
      onClose();
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  // 获取状态标签颜色
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'template': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态标签文字
  const getStatusLabel = (status: ProjectStatus) => {
    switch (status) {
      case 'active': return '进行中';
      case 'archived': return '已归档';
      case 'template': return '模板';
      default: return status;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[800px] max-h-[80vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">项目管理</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 工具栏 */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between gap-4">
          {/* 标签切换 */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['active', 'archived', 'template'] as ProjectStatus[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {getStatusLabel(tab)} ({projects.filter(p => p.status === tab).length})
              </button>
            ))}
          </div>

          {/* 搜索和分类筛选 */}
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              placeholder="搜索项目..."
              className="flex-1 max-w-[200px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
          </div>

          {/* 新建按钮 */}
          <button
            onClick={onCreateProject}
            className="btn btn-primary text-sm py-2"
          >
            + 新建项目
          </button>
        </div>

        {/* 对比操作栏 */}
        {activeTab === 'active' && (
          <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              选择 2-4 个项目进行对比
              {selectedForCompare.length > 0 && ` (已选 ${selectedForCompare.length} 个)`}
            </span>
            <button
              onClick={handleCompare}
              disabled={selectedForCompare.length < 2}
              className="btn btn-secondary text-sm py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              对比所选项目
            </button>
          </div>
        )}

        {/* 项目列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p>{searchQuery ? '未找到匹配的项目' : '暂无项目'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    currentProject?.id === project.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${
                    selectedForCompare.includes(project.id) ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {editingProject === project.id ? (
                    /* 编辑模式 */
                    <div className="space-y-3">
                      {/* 第一行：项目名称、项目编号、项目分类 */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">项目名称 *</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={inputName}
                            onChange={(e) => setInputName(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">项目编号</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                              value={inputProjectNo}
                              onChange={(e) => setInputProjectNo(e.target.value)}
                              placeholder="如：2026001"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const nextNo = await getNextProjectNo(generatedProjectNos);
                                  setInputProjectNo(nextNo);
                                  setGeneratedProjectNos(prev => [...prev, nextNo]);
                                } catch (error) {
                                  console.error('获取项目编号失败:', error);
                                }
                              }}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 whitespace-nowrap"
                              title="自动生成下一个项目编号"
                            >
                              自动
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">项目分类</label>
                          <select
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                            value={inputProjectType}
                            onChange={(e) => setInputProjectType(e.target.value)}
                          >
                            <option value="">选择分类</option>
                            {PROJECT_TYPES.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {/* 第二行：整机编号、客户、机型、分类 */}
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">整机编号</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={inputMachineNo}
                            onChange={(e) => setInputMachineNo(e.target.value)}
                            placeholder="如：W12661-297-T2"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">客户名称</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={inputCustomer}
                            onChange={(e) => setInputCustomer(e.target.value)}
                            placeholder="如：AMAM"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">机型</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={inputModel}
                            onChange={(e) => setInputModel(e.target.value)}
                            placeholder="如：HVR-320A"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">机器分类</label>
                          <select
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                            value={inputCategory}
                            onChange={(e) => setInputCategory(e.target.value)}
                          >
                            <option value="">选择分类</option>
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {/* 第三行：规格 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">规格</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                          value={inputSpecifications}
                          onChange={(e) => setInputSpecifications(e.target.value)}
                          placeholder="如：外钢304 380V 50Hz 三相"
                        />
                      </div>
                      {/* 第四行：定制内容 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">定制内容</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                          value={inputCustomRequirements}
                          onChange={(e) => setInputCustomRequirements(e.target.value)}
                          placeholder="如：带水冷机；包装高度10mm每级可调"
                        />
                      </div>
                      {/* 第五行：备注 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">备注</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                          value={inputDescription}
                          onChange={(e) => setInputDescription(e.target.value)}
                          placeholder="其他补充说明"
                        />
                      </div>
                      {/* 操作按钮 */}
                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleSaveEdit(project.id)}
                          className="px-3 py-1.5 text-sm text-white bg-primary hover:bg-primary-dark rounded"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 显示模式 */
                    <div className="flex items-start justify-between">
                      {/* 左侧：项目信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {activeTab === 'active' && (
                            <input
                              type="checkbox"
                              checked={selectedForCompare.includes(project.id)}
                              onChange={() => toggleCompareSelection(project.id)}
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                            />
                          )}
                          <h3 className="font-medium text-gray-900 truncate">
                            {project.name}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(project.status)}`}>
                            {getStatusLabel(project.status)}
                          </span>
                          {currentProject?.id === project.id && (
                            <span className="text-xs text-primary font-medium">(当前)</span>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-500 mb-2 truncate">{project.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{project.task_count} 个任务</span>
                          <span>进度 {Math.round(project.completion_rate)}%</span>
                          <span>更新于 {formatDate(project.updated_at)}</span>
                        </div>
                        {/* 进度条 */}
                        <div className="mt-2 w-full max-w-xs h-1.5 bg-gray-200 rounded-full">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${project.completion_rate}%` }}
                          />
                        </div>
                      </div>

                      {/* 右侧：操作按钮 */}
                      <div className="flex items-center gap-2 ml-4">
                        {project.status === 'active' && currentProject?.id !== project.id && (
                          <button
                            onClick={() => handleSwitch(project)}
                            className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded transition-colors"
                          >
                            切换
                          </button>
                        )}
                        {/* 编辑按钮 */}
                        <button
                          onClick={() => startEditProject(project)}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          编辑
                        </button>
                        {project.status !== 'template' && (
                          <>
                            {showDuplicateInput === project.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="新项目名称"
                                  className="w-32 px-2 py-1 text-sm border border-gray-200 rounded"
                                  value={inputName}
                                  onChange={(e) => setInputName(e.target.value)}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleDuplicate(project.id)}
                                  className="px-2 py-1 text-sm text-white bg-primary rounded"
                                >
                                  确定
                                </button>
                                <button
                                  onClick={() => { setShowDuplicateInput(null); setInputName(''); }}
                                  className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setShowDuplicateInput(project.id); setInputName(`${project.name} (副本)`); }}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              >
                                复制
                              </button>
                            )}
                            {showTemplateInput === project.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="模板名称"
                                  className="w-32 px-2 py-1 text-sm border border-gray-200 rounded"
                                  value={inputName}
                                  onChange={(e) => setInputName(e.target.value)}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveAsTemplate(project.id)}
                                  className="px-2 py-1 text-sm text-white bg-primary rounded"
                                >
                                  确定
                                </button>
                                <button
                                  onClick={() => { setShowTemplateInput(null); setInputName(''); }}
                                  className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setShowTemplateInput(project.id); setInputName(`${project.name} 模板`); }}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              >
                                存为模板
                              </button>
                            )}
                          </>
                        )}
                        {currentProject?.id !== project.id && (
                          <button
                            onClick={() => handleDelete(project)}
                            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
