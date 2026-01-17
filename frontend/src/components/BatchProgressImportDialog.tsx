/**
 * 批量进度导入对话框
 */

import { useState, useRef } from 'react';
import { downloadBatchProgressTemplate, batchImportProgress } from '../api/tasks';
import type { BatchImportResult } from '../types/task';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BatchProgressImportDialog({ isOpen, onClose, onSuccess }: Props) {
  const [recordDate, setRecordDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 下载模板
  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const blob = await downloadBatchProgressTemplate(recordDate);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `进度导入模板_${recordDate.replace(/-/g, '')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载模板失败:', error);
      alert('下载模板失败，请重试');
    } finally {
      setIsDownloading(false);
    }
  };

  // 选择文件
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  // 导入进度
  const handleImport = async () => {
    if (!selectedFile) {
      alert('请先选择文件');
      return;
    }

    setIsUploading(true);
    try {
      const result = await batchImportProgress(selectedFile, recordDate);
      setImportResult(result);

      if (result.imported_count > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error('导入失败:', error);
      setImportResult({
        success: false,
        message: '导入失败，请检查文件格式',
        projects_updated: 0,
        imported_count: 0,
        skipped_count: 0,
        errors: [String(error)],
        details: [],
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 重置状态
  const handleReset = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 关闭对话框
  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 标题 */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">每日进度批量导入</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* 步骤说明 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2">使用步骤</h3>
            <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
              <li>选择记录日期（默认今天）</li>
              <li>下载进度模板（包含所有活跃项目的任务）</li>
              <li>在 Excel 中填写"今日增加"列（例如：10 表示增加 10%）</li>
              <li>上传填写好的 Excel 文件</li>
              <li>系统自动计算新进度并更新各项目</li>
            </ol>
          </div>

          {/* 日期选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              记录日期
            </label>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="input w-48"
            />
          </div>

          {/* 下载模板 */}
          <div className="mb-6">
            <button
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              className="btn btn-secondary"
            >
              {isDownloading ? '下载中...' : '下载进度模板'}
            </button>
            <span className="ml-2 text-sm text-gray-500">
              模板包含所有活跃项目的任务
            </span>
          </div>

          {/* 文件上传 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              上传填写好的 Excel 文件
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="flex-1"
              />
              {selectedFile && (
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  清除
                </button>
              )}
            </div>
            {selectedFile && (
              <p className="mt-1 text-sm text-gray-600">
                已选择: {selectedFile.name}
              </p>
            )}
          </div>

          {/* 导入按钮 */}
          <div className="mb-6">
            <button
              onClick={handleImport}
              disabled={!selectedFile || isUploading}
              className="btn btn-primary"
            >
              {isUploading ? '导入中...' : '导入进度'}
            </button>
          </div>

          {/* 导入结果 */}
          {importResult && (
            <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className={`font-bold mb-2 ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {importResult.success ? '导入成功' : '导入失败'}
              </h3>
              <p className={`text-sm mb-2 ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {importResult.message}
              </p>

              {/* 统计信息 */}
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="text-center p-2 bg-white rounded">
                  <div className="text-2xl font-bold text-blue-600">{importResult.projects_updated}</div>
                  <div className="text-xs text-gray-500">更新项目数</div>
                </div>
                <div className="text-center p-2 bg-white rounded">
                  <div className="text-2xl font-bold text-green-600">{importResult.imported_count}</div>
                  <div className="text-xs text-gray-500">导入记录数</div>
                </div>
                <div className="text-center p-2 bg-white rounded">
                  <div className="text-2xl font-bold text-orange-600">{importResult.skipped_count}</div>
                  <div className="text-xs text-gray-500">跳过记录数</div>
                </div>
              </div>

              {/* 详细信息 */}
              {importResult.details.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-medium text-sm mb-1">项目详情:</h4>
                  <div className="max-h-32 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white/50">
                          <th className="text-left px-2 py-1">项目名称</th>
                          <th className="text-center px-2 py-1 w-20">导入</th>
                          <th className="text-center px-2 py-1 w-20">跳过</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.details.map((detail, idx) => (
                          <tr key={idx} className="border-t border-white/30">
                            <td className="px-2 py-1">{detail.project_name}</td>
                            <td className="text-center px-2 py-1 text-green-600">{detail.imported}</td>
                            <td className="text-center px-2 py-1 text-orange-600">{detail.skipped}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 错误信息 */}
              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-1 text-red-700">错误信息:</h4>
                  <ul className="list-disc list-inside text-xs text-red-600 max-h-24 overflow-y-auto">
                    {importResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleClose}
            className="btn btn-secondary"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
