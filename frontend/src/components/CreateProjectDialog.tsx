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
  const { templates, categories, createProject, fetchTemplates, fetchCategories, isLoading } = useProjectStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('builtin_apqp');

  // 新字段
  const [machineNo, setMachineNo] = useState('');
  const [customer, setCustomer] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [customRequirements, setCustomRequirements] = useState('');

  // 加载模板列表和机器分类
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      fetchCategories();
    }
  }, [isOpen, fetchTemplates, fetchCategories]);

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setSelectedTemplate('builtin_apqp');
      setMachineNo('');
      setCustomer('');
      setModel('');
      setCategory('');
      setSpecifications('');
      setCustomRequirements('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 提交创建
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const result = await createProject({
      name: name.trim(),
      description: description.trim(),
      template_id: selectedTemplate || undefined,
      machine_no: machineNo.trim(),
      customer: customer.trim(),
      model: model.trim(),
      category: category,
      specifications: specifications.trim(),
      custom_requirements: customRequirements.trim(),
    });

    if (result) {
      onClose();
    }
  };

  // 空白项目选项（后端已返回 APQP 标准模板）
  const emptyTemplate: ProjectTemplate = {
    id: 'empty',
    name: '空白项目',
    description: '不包含任何任务，从零开始',
    task_count: 0,
  };

  // 合并模板列表：后端返回的模板 + 空白项目
  const allTemplates = [...templates, emptyTemplate];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[90vh] flex flex-col">
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

        {/* 表单 - 可滚动区域 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
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
              placeholder="如：W12661-AMAM-HVR320A"
              autoFocus
              required
            />
          </div>

          {/* 项目详细属性 - 两列布局 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* 整机编号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                整机编号
              </label>
              <input
                type="text"
                className="input"
                value={machineNo}
                onChange={(e) => setMachineNo(e.target.value)}
                placeholder="如：W12661-297-T2"
              />
            </div>

            {/* 客户名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                客户名称
              </label>
              <input
                type="text"
                className="input"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="如：AMAM"
              />
            </div>

            {/* 机型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                机型
              </label>
              <input
                type="text"
                className="input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="如：HVR-320A(Q)-4"
              />
            </div>

            {/* 机器分类 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                机器分类
              </label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">选择分类</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 规格 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              规格
            </label>
            <input
              type="text"
              className="input"
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              placeholder="如：外钢304 380V 50Hz 三相"
            />
          </div>

          {/* 定制内容 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              定制内容
            </label>
            <textarea
              className="input"
              rows={2}
              value={customRequirements}
              onChange={(e) => setCustomRequirements(e.target.value)}
              placeholder="如：带水冷机；包装高度10mm每级可调"
            />
          </div>

          {/* 项目描述 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              className="input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="其他补充说明（可选）"
            />
          </div>

          {/* 选择模板 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择模板
            </label>
            <div className="space-y-2 max-h-36 overflow-y-auto">
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
                          自定义模板
                        </span>
                      )}
                      {template.id === 'builtin_apqp' && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                          推荐
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
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
