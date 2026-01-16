/**
 * 创建项目对话框组件
 */

import { useState, useEffect } from 'react';
import { useProjectStore } from '../stores/projectStore';
import type { ProjectTemplate } from '../types/project';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectDialog({ isOpen, onClose }: CreateProjectDialogProps) {
  const { templates, createProject, fetchTemplates, isLoading } = useProjectStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('builtin_apqp');

  // 加载模板列表
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, fetchTemplates]);

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setSelectedTemplate('builtin_apqp');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 提交创建
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const result = await createProject(
      name.trim(),
      description.trim(),
      selectedTemplate || undefined
    );

    if (result) {
      onClose();
    }
  };

  // 内置模板列表
  const builtinTemplates: ProjectTemplate[] = [
    {
      id: 'builtin_apqp',
      name: 'APQP 标准模板',
      description: '包含完整的 APQP 五阶段 43 个标准任务',
      task_count: 43,
    },
    {
      id: 'empty',
      name: '空白项目',
      description: '不包含任何任务，从零开始',
      task_count: 0,
    },
  ];

  // 合并模板列表
  const allTemplates = [...builtinTemplates, ...templates];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[500px]">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">新建项目</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* 项目名称 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              项目名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入项目名称"
              autoFocus
              required
            />
          </div>

          {/* 项目描述 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              项目描述
            </label>
            <textarea
              className="input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入项目描述（可选）"
            />
          </div>

          {/* 选择模板 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择模板
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allTemplates.map((template) => (
                <label
                  key={template.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={selectedTemplate === template.id}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="mt-1 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{template.name}</span>
                      {template.id.startsWith('tmpl_') && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                          自定义
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{template.task_count} 个任务</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3">
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
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? '创建中...' : '创建项目'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
