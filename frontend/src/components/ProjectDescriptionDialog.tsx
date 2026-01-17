/**
 * 项目描述编辑对话框
 */

import { useState, useEffect } from 'react';
import { getNextProjectNo } from '../api/projects';
import type { Project, ProjectType } from '../types/project';
import { PROJECT_TYPES } from '../types/project';

interface ProjectDescriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSave: (updates: Partial<Project>) => Promise<void>;
}

export function ProjectDescriptionDialog({
  isOpen,
  onClose,
  project,
  onSave,
}: ProjectDescriptionDialogProps) {
  const [specifications, setSpecifications] = useState('');
  const [customRequirements, setCustomRequirements] = useState('');
  const [description, setDescription] = useState('');
  const [projectNo, setProjectNo] = useState('');
  const [projectType, setProjectType] = useState('');
  const [customer, setCustomer] = useState('');
  const [machineNo, setMachineNo] = useState('');
  const [model, setModel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project && isOpen) {
      setSpecifications(project.specifications || '');
      setCustomRequirements(project.custom_requirements || '');
      setDescription(project.description || '');
      setProjectNo(project.project_no || '');
      setProjectType(project.project_type || '');
      setCustomer(project.customer || '');
      setMachineNo(project.machine_no || '');
      setModel(project.model || '');
    }
  }, [project, isOpen]);

  const handleSave = async () => {
    if (!project) return;

    setIsSaving(true);
    try {
      await onSave({
        specifications,
        custom_requirements: customRequirements,
        description,
        project_no: projectNo,
        project_type: projectType as ProjectType,
        customer,
        machine_no: machineNo,
        model,
      });
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">编辑项目描述</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* 项目编号和分类 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                项目编号
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={projectNo}
                  onChange={(e) => setProjectNo(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="如：2026001"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const nextNo = await getNextProjectNo();
                      setProjectNo(nextNo);
                    } catch (error) {
                      console.error('获取项目编号失败:', error);
                    }
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 whitespace-nowrap"
                  title="根据已有项目自动生成下一个编号"
                >
                  自动生成
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                项目分类
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">选择分类</option>
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                客户名称
              </label>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="输入客户名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                整机编号
              </label>
              <input
                type="text"
                value={machineNo}
                onChange={(e) => setMachineNo(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="输入整机编号"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              机型
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="输入机型"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              项目简介
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="输入项目简介"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              产品规格
            </label>
            <textarea
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="输入产品规格，如：&#10;- 包装速度: 20-60包/分钟&#10;- 包装尺寸: L200-400 x W150-300 x H50-150mm&#10;- 电源: 380V/50Hz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              定制内容
            </label>
            <textarea
              value={customRequirements}
              onChange={(e) => setCustomRequirements(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="输入定制内容，如：&#10;- 特殊材料要求&#10;- 客户定制功能&#10;- 认证要求等"
            />
          </div>
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
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
