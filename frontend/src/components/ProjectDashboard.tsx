/**
 * 项目仪表盘组件
 */

import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { getProjectDashboard } from '../api/tasks';
import type { ProjectDashboardData } from '../types/task';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
}

// 状态颜色
const STATUS_COLORS: Record<string, string> = {
  '已完成': '#22c55e',
  '进行中': '#3b82f6',
  '未开始': '#9ca3af',
  '暂停': '#f97316',
};

export function ProjectDashboardDialog({ isOpen, onClose, projectName }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProjectDashboardData | null>(null);

  // 加载数据
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProjectDashboard();
      setData(result);
    } catch (err) {
      setError('加载数据失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[1000px] max-h-[85vh] flex flex-col">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">
            项目仪表盘{projectName ? `: ${projectName}` : ''}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            x
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-12">{error}</div>
          ) : data ? (
            <>
              {/* 统计卡片 */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-gray-700">{data.task_stats.total}</div>
                  <div className="text-sm text-gray-500">总任务数</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{data.task_stats.completed}</div>
                  <div className="text-sm text-gray-500">已完成</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{data.task_stats.in_progress}</div>
                  <div className="text-sm text-gray-500">进行中</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">{data.task_stats.completion_rate}%</div>
                  <div className="text-sm text-gray-500">完成率</div>
                </div>
              </div>

              {/* 图表区域 */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* 饼图 - 任务状态分布 */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">任务状态分布</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.status_distribution.filter(s => s.count > 0).map(s => ({
                            name: s.status,
                            value: s.count,
                            percentage: s.percentage
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                          nameKey="name"
                        >
                          {data.status_distribution.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={STATUS_COLORS[entry.status] || '#999'}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [
                            `${value} 个任务`,
                            '数量'
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* 图例 */}
                  <div className="flex justify-center gap-4 mt-2">
                    {data.status_distribution.filter(s => s.count > 0).map(item => (
                      <div key={item.status} className="flex items-center gap-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[item.status] }}
                        />
                        <span className="text-sm text-gray-600">{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 柱状图 - 里程碑进度 */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">里程碑进度</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={data.milestone_stats}
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} unit="%" />
                        <YAxis
                          dataKey="milestone"
                          type="category"
                          width={90}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value) => [`${value}%`, '平均进度']}
                          labelFormatter={(label) => `里程碑: ${label}`}
                        />
                        <Bar
                          dataKey="avg_progress"
                          fill="#3b82f6"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* 里程碑详情表格 */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">里程碑详情</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">里程碑</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-600">任务总数</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-600">已完成</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-600">完成率</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">进度</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.milestone_stats.map(milestone => {
                      const completionRate = milestone.total_tasks > 0
                        ? Math.round(milestone.completed_tasks / milestone.total_tasks * 100)
                        : 0;

                      return (
                        <tr key={milestone.milestone} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{milestone.milestone}</td>
                          <td className="px-4 py-3 text-center">{milestone.total_tasks}</td>
                          <td className="px-4 py-3 text-center text-green-600">{milestone.completed_tasks}</td>
                          <td className="px-4 py-3 text-center">{completionRate}%</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 transition-all"
                                  style={{ width: `${milestone.avg_progress}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 w-12 text-right">
                                {milestone.avg_progress}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {data.milestone_stats.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    暂无里程碑数据
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
