/**
 * 项目对比视图组件
 */

import { useProjectStore } from '../stores/projectStore';

interface ProjectCompareViewProps {
  isOpen: boolean;
  onClose: () => void;
}

// 里程碑名称映射
const milestoneNames: Record<string, string> = {
  '阶段1': '阶段1：计划和定义',
  '阶段2': '阶段2：产品设计和开发',
  '阶段3': '阶段3：样机试制验证',
  '阶段4': '阶段4：过程设计与试生产验证',
  '阶段5': '阶段5：反馈与改善',
};

// 进度条颜色
const progressColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
];

export function ProjectCompareView({ isOpen, onClose }: ProjectCompareViewProps) {
  const { comparisonData, isLoading } = useProjectStore();

  if (!isOpen) return null;

  // 获取所有里程碑
  const allMilestones = new Set<string>();
  comparisonData.forEach((data) => {
    Object.keys(data.milestones).forEach((m) => allMilestones.add(m));
  });
  const milestones = Array.from(allMilestones).sort();

  // 格式化进度
  const formatProgress = (value: number) => `${Math.round(value)}%`;

  // 获取项目颜色
  const getProjectColor = (index: number) => progressColors[index % progressColors.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[900px] max-h-[85vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">项目对比</h2>
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
          ) : comparisonData.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              暂无对比数据
            </div>
          ) : (
            <>
              {/* 项目图例 */}
              <div className="mb-6 flex flex-wrap gap-4">
                {comparisonData.map((data, index) => (
                  <div key={data.project.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${getProjectColor(index)}`} />
                    <span className="text-sm font-medium text-gray-700">
                      {data.project.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({formatProgress(data.overall_progress)})
                    </span>
                  </div>
                ))}
              </div>

              {/* 总体进度对比 */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-700 mb-3">总体进度</h3>
                <div className="space-y-3">
                  {comparisonData.map((data, index) => (
                    <div key={data.project.id} className="flex items-center gap-4">
                      <span className="w-32 text-sm text-gray-600 truncate">
                        {data.project.name}
                      </span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProjectColor(index)} transition-all flex items-center justify-end pr-2`}
                          style={{ width: `${Math.max(data.overall_progress, 5)}%` }}
                        >
                          <span className="text-xs text-white font-medium">
                            {formatProgress(data.overall_progress)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 里程碑分组对比 */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-4">里程碑进度对比</h3>
                <div className="space-y-6">
                  {milestones.map((milestone) => (
                    <div key={milestone} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-800 mb-3">
                        {milestoneNames[milestone] || milestone}
                      </h4>
                      <div className="space-y-2">
                        {comparisonData.map((data, index) => {
                          const stats = data.milestones[milestone];
                          if (!stats) return null;

                          return (
                            <div key={data.project.id} className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded ${getProjectColor(index)}`} />
                              <span className="w-28 text-xs text-gray-600 truncate">
                                {data.project.name}
                              </span>
                              <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                                <div
                                  className={`h-full ${getProjectColor(index)} transition-all`}
                                  style={{ width: `${stats.avg_progress}%` }}
                                />
                              </div>
                              <span className="w-12 text-xs text-gray-600 text-right">
                                {formatProgress(stats.avg_progress)}
                              </span>
                              <span className="w-16 text-xs text-gray-400 text-right">
                                {stats.completed_tasks}/{stats.total_tasks} 完成
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 详细数据表格 */}
              <div className="mt-8">
                <h3 className="text-sm font-bold text-gray-700 mb-3">详细数据</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                          里程碑
                        </th>
                        {comparisonData.map((data) => (
                          <th
                            key={data.project.id}
                            className="px-4 py-2 text-center font-medium text-gray-700 border-b"
                          >
                            {data.project.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.map((milestone) => (
                        <tr key={milestone} className="hover:bg-gray-50">
                          <td className="px-4 py-2 border-b text-gray-600">
                            {milestoneNames[milestone] || milestone}
                          </td>
                          {comparisonData.map((data) => {
                            const stats = data.milestones[milestone];
                            return (
                              <td
                                key={data.project.id}
                                className="px-4 py-2 border-b text-center"
                              >
                                {stats ? (
                                  <div>
                                    <span className="font-medium text-gray-800">
                                      {formatProgress(stats.avg_progress)}
                                    </span>
                                    <br />
                                    <span className="text-xs text-gray-400">
                                      {stats.completed_tasks}/{stats.total_tasks} 完成
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {/* 总计行 */}
                      <tr className="bg-gray-50 font-medium">
                        <td className="px-4 py-2 border-b text-gray-700">总体进度</td>
                        {comparisonData.map((data) => (
                          <td
                            key={data.project.id}
                            className="px-4 py-2 border-b text-center text-gray-800"
                          >
                            {formatProgress(data.overall_progress)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
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
