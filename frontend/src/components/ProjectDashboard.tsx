/**
 * 项目仪表盘组件
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { getProjectDashboard, getPersonnelWorkload } from '../api/tasks';
import type { ProjectDashboardData, PersonnelWorkloadResponse } from '../types/task';

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
  const [workloadData, setWorkloadData] = useState<PersonnelWorkloadResponse | null>(null);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

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
      const [dashboardResult, workloadResult] = await Promise.all([
        getProjectDashboard(),
        getPersonnelWorkload()
      ]);
      setData(dashboardResult);
      setWorkloadData(workloadResult);
    } catch (err) {
      setError('加载数据失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 准备人员负荷图表数据
  const workloadChartData = useMemo(() => {
    if (!workloadData) return [];
    return workloadData.workload_data
      .filter(w => w.ewl > 0)
      .slice(0, 6)
      .map(w => ({
        name: w.person_name,
        R: w.ewl_by_role.R,
        A: w.ewl_by_role.A,
        C: w.ewl_by_role.C,
        I: w.ewl_by_role.I,
        total: w.ewl
      }));
  }, [workloadData]);

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

              {/* 人员工作负荷 */}
              {workloadData && workloadData.workload_data.length > 0 && (
                <div className="border rounded-lg p-4 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">人员工作负荷</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>参与人数: <span className="font-medium text-blue-600">{workloadData.total_personnel}</span></span>
                      <span>总EWL: <span className="font-medium text-orange-600">{workloadData.total_ewl}天</span></span>
                      <span>平均: <span className="font-medium text-purple-600">{workloadData.avg_ewl}天</span></span>
                    </div>
                  </div>

                  {/* 图表 */}
                  {workloadChartData.length > 0 && (
                    <div className="h-64 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={workloadChartData}
                          layout="vertical"
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" unit="天" />
                          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => [`${value}天`]} />
                          <Legend
                            formatter={(value: string) =>
                              value === 'R' ? '负责人(R)' : value === 'A' ? '批准人(A)' : value === 'C' ? '咨询人(C)' : '知会人(I)'
                            }
                            wrapperStyle={{ fontSize: '12px' }}
                          />
                          <Bar dataKey="R" stackId="a" fill="#3b82f6" name="R" />
                          <Bar dataKey="A" stackId="a" fill="#ef4444" name="A" />
                          <Bar dataKey="C" stackId="a" fill="#f59e0b" name="C" />
                          <Bar dataKey="I" stackId="a" fill="#10b981" name="I" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* 全员负荷表 */}
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">姓名</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">部门</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-600">任务数</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-600">
                          <span className="text-blue-600">R</span>
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-gray-600">
                          <span className="text-red-600">A</span>
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-gray-600">
                          <span className="text-yellow-600">C</span>
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-gray-600">
                          <span className="text-green-600">I</span>
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-gray-600">EWL</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">负荷</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {workloadData.workload_data.map(person => {
                        const isExpanded = expandedPerson === person.person_name;
                        return (
                          <React.Fragment key={person.person_name}>
                            <tr
                              className="hover:bg-blue-50 cursor-pointer"
                              onClick={() => setExpandedPerson(isExpanded ? null : person.person_name)}
                            >
                              <td className="px-3 py-2 font-medium">
                                <span className={`inline-block w-4 text-gray-400 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                  {person.tasks.length > 0 ? '▶' : ''}
                                </span>
                                {person.person_name}
                              </td>
                              <td className="px-3 py-2 text-gray-500">{person.department || '-'}</td>
                              <td className="px-3 py-2 text-center">{person.task_count}</td>
                              <td className="px-3 py-2 text-center text-blue-600">{person.roles.R || '-'}</td>
                              <td className="px-3 py-2 text-center text-red-600">{person.roles.A || '-'}</td>
                              <td className="px-3 py-2 text-center text-yellow-600">{person.roles.C || '-'}</td>
                              <td className="px-3 py-2 text-center text-green-600">{person.roles.I || '-'}</td>
                              <td className="px-3 py-2 text-center font-medium text-orange-600">{person.ewl}天</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-orange-500"
                                      style={{ width: `${Math.min((person.ewl / (workloadData.avg_ewl * 2)) * 100, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {/* 展开的任务列表 */}
                            {isExpanded && person.tasks.length > 0 && (
                              <tr>
                                <td colSpan={9} className="bg-gray-50 px-6 py-3">
                                  <div className="max-h-60 overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-gray-500">
                                          <th className="px-2 py-1 text-left w-12">角色</th>
                                          <th className="px-2 py-1 text-left w-16">编号</th>
                                          <th className="px-2 py-1 text-left">任务名称</th>
                                          <th className="px-2 py-1 text-left w-16">里程碑</th>
                                          <th className="px-2 py-1 text-center w-14">工期</th>
                                          <th className="px-2 py-1 text-center w-14">EWL</th>
                                          <th className="px-2 py-1 text-center w-16">状态</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {person.tasks.map((task, idx) => (
                                          <tr key={idx} className="border-t border-gray-200">
                                            <td className="px-2 py-1">
                                              <span className={`px-1.5 py-0.5 rounded ${
                                                task.role === 'R' ? 'bg-blue-100 text-blue-700' :
                                                task.role === 'A' ? 'bg-red-100 text-red-700' :
                                                task.role === 'C' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-green-100 text-green-700'
                                              }`}>{task.role}</span>
                                            </td>
                                            <td className="px-2 py-1 text-gray-600">{task.task_no}</td>
                                            <td className="px-2 py-1">{task.task_name}</td>
                                            <td className="px-2 py-1 text-gray-500 truncate">{task.milestone}</td>
                                            <td className="px-2 py-1 text-center">{task.duration}天</td>
                                            <td className="px-2 py-1 text-center text-orange-600">{task.contribution}天</td>
                                            <td className="px-2 py-1 text-center">
                                              <span className={`px-1.5 py-0.5 rounded ${
                                                task.status === '已完成' ? 'bg-green-100 text-green-700' :
                                                task.status === '进行中' ? 'bg-blue-100 text-blue-700' :
                                                task.status === '暂停' ? 'bg-orange-100 text-orange-700' :
                                                'bg-gray-100 text-gray-600'
                                              }`}>{task.status}</span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
