/**
 * 人员工作负荷表组件
 */

import { useState, useEffect, useMemo } from 'react';
import { getPersonnelWorkload } from '../api/tasks';
import type { PersonnelWorkload, PersonnelWorkloadResponse } from '../types/task';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function PersonnelWorkloadDialog({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PersonnelWorkloadResponse | null>(null);

  // 筛选状态
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  // 展开状态
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(new Set());
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

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
      const result = await getPersonnelWorkload();
      setData(result);
      // 默认展开所有部门
      const depts = new Set(result.workload_data.map(w => w.department || '未分配'));
      setExpandedDepts(depts);
    } catch (err) {
      setError('加载数据失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 获取所有部门
  const departments = useMemo(() => {
    if (!data) return [];
    const depts = new Set<string>();
    data.workload_data.forEach(w => {
      depts.add(w.department || '未分配');
    });
    return Array.from(depts).sort();
  }, [data]);

  // 按部门分组
  const groupedByDepartment = useMemo(() => {
    if (!data) return {};

    let filtered = data.workload_data;

    // 部门筛选
    if (departmentFilter) {
      filtered = filtered.filter(w =>
        (w.department || '未分配') === departmentFilter
      );
    }

    // 角色筛选
    if (roleFilter) {
      filtered = filtered.filter(w =>
        w.roles[roleFilter as keyof typeof w.roles] > 0
      );
    }

    // 按部门分组
    const grouped: Record<string, PersonnelWorkload[]> = {};
    filtered.forEach(w => {
      const dept = w.department || '未分配';
      if (!grouped[dept]) {
        grouped[dept] = [];
      }
      grouped[dept].push(w);
    });

    return grouped;
  }, [data, departmentFilter, roleFilter]);

  // 切换人员展开
  const togglePerson = (personName: string) => {
    const newSet = new Set(expandedPersons);
    if (newSet.has(personName)) {
      newSet.delete(personName);
    } else {
      newSet.add(personName);
    }
    setExpandedPersons(newSet);
  };

  // 切换部门展开
  const toggleDept = (dept: string) => {
    const newSet = new Set(expandedDepts);
    if (newSet.has(dept)) {
      newSet.delete(dept);
    } else {
      newSet.add(dept);
    }
    setExpandedDepts(newSet);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case '已完成': return 'bg-green-100 text-green-700';
      case '进行中': return 'bg-blue-100 text-blue-700';
      case '暂停': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // 获取角色颜色
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'R': return 'bg-blue-100 text-blue-700';
      case 'A': return 'bg-red-100 text-red-700';
      case 'C': return 'bg-yellow-100 text-yellow-700';
      case 'I': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // 格式化有空日期显示
  const formatAvailableDate = (availableDate: string | null) => {
    if (!availableDate) return '现在有空';
    const date = new Date(availableDate);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日后有空`;
  };

  // 准备图表数据
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.workload_data
      .filter(w => w.ewl > 0)
      .slice(0, 10)  // 最多显示前10人
      .map(w => ({
        name: w.person_name,
        R: w.ewl_by_role.R,
        A: w.ewl_by_role.A,
        C: w.ewl_by_role.C,
        I: w.ewl_by_role.I,
        total: w.ewl
      }));
  }, [data]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[900px] max-h-[85vh] flex flex-col">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">人员工作负荷表</h2>
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
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{data.total_personnel}</div>
                  <div className="text-sm text-gray-600">参与人数</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{data.total_ewl}天</div>
                  <div className="text-sm text-gray-600">总 EWL</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">{data.avg_ewl}天</div>
                  <div className="text-sm text-gray-600">平均 EWL</div>
                </div>
              </div>

              {/* 工作负荷图表 */}
              {chartData.length > 0 && (
                <div className="mb-6 border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">人员工作负荷对比（按角色分解）</h3>
                  <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" unit="天" />
                        <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value) => [`${value}天`]}
                          labelFormatter={(label) => `${label}`}
                        />
                        <Legend
                          formatter={(value: string) => value === 'R' ? '负责人(R)' : value === 'A' ? '批准人(A)' : value === 'C' ? '咨询人(C)' : '知会人(I)'}
                        />
                        <Bar dataKey="R" stackId="a" fill="#3b82f6" name="R" />
                        <Bar dataKey="A" stackId="a" fill="#ef4444" name="A" />
                        <Bar dataKey="C" stackId="a" fill="#f59e0b" name="C" />
                        <Bar dataKey="I" stackId="a" fill="#10b981" name="I" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* 筛选条件 */}
              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">部门:</label>
                  <select
                    className="input py-1 px-2 text-sm"
                    value={departmentFilter}
                    onChange={e => setDepartmentFilter(e.target.value)}
                  >
                    <option value="">全部部门</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">角色:</label>
                  <select
                    className="input py-1 px-2 text-sm"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                  >
                    <option value="">全部角色</option>
                    <option value="R">R - 负责人</option>
                    <option value="A">A - 批准人</option>
                    <option value="C">C - 咨询人</option>
                    <option value="I">I - 知会人</option>
                  </select>
                </div>
              </div>

              {/* 部门列表 */}
              <div className="space-y-4">
                {Object.entries(groupedByDepartment).map(([dept, persons]) => {
                  const deptExpanded = expandedDepts.has(dept);
                  const deptTaskCount = persons.reduce((sum, p) => sum + p.task_count, 0);

                  return (
                    <div key={dept} className="border rounded-lg">
                      {/* 部门标题 */}
                      <div
                        className="px-4 py-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleDept(dept)}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`transform transition-transform ${deptExpanded ? 'rotate-90' : ''}`}>
                            &gt;
                          </span>
                          <span className="font-medium">{dept}</span>
                          <span className="text-sm text-gray-500">
                            ({persons.length}人, {deptTaskCount}个任务)
                          </span>
                        </div>
                      </div>

                      {/* 部门成员 */}
                      {deptExpanded && (
                        <div className="divide-y">
                          {persons.map(person => {
                            const personExpanded = expandedPersons.has(person.person_name);

                            return (
                              <div key={person.person_name} className="px-4 py-3">
                                {/* 人员摘要 */}
                                <div
                                  className="cursor-pointer"
                                  onClick={() => togglePerson(person.person_name)}
                                >
                                  {/* 第一行：姓名和 EWL */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <span className={`transform transition-transform text-xs ${personExpanded ? 'rotate-90' : ''}`}>
                                        &gt;
                                      </span>
                                      <span className="font-medium">{person.person_name}</span>
                                      <span className="text-sm font-semibold text-orange-600">
                                        EWL: {person.ewl}天
                                      </span>
                                      {/* 有空日期 */}
                                      <span className={`text-xs px-2 py-0.5 rounded ${person.available_date ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                        {formatAvailableDate(person.available_date)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                      {/* EWL 进度条 */}
                                      <div className="w-40 flex items-center gap-2">
                                        <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                                            style={{ width: `${Math.min((person.ewl / (data?.avg_ewl ? data.avg_ewl * 2 : 100)) * 100, 100)}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-gray-500 w-12">
                                          {person.ewl}天
                                        </span>
                                      </div>

                                      {/* 状态摘要 */}
                                      <div className="text-xs text-gray-500 flex gap-2">
                                        {person.summary.in_progress > 0 && (
                                          <span className="text-blue-600">进行中{person.summary.in_progress}</span>
                                        )}
                                        {person.summary.not_started > 0 && (
                                          <span className="text-gray-600">未开始{person.summary.not_started}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 第二行：EWL 按角色分解 */}
                                  <div className="flex items-center gap-2 ml-6 mt-1 text-xs text-gray-500">
                                    {person.ewl_by_role.R > 0 && (
                                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                                        R: {person.ewl_by_role.R}天
                                      </span>
                                    )}
                                    {person.ewl_by_role.A > 0 && (
                                      <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded">
                                        A: {person.ewl_by_role.A}天
                                      </span>
                                    )}
                                    {person.ewl_by_role.C > 0 && (
                                      <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-600 rounded">
                                        C: {person.ewl_by_role.C}天
                                      </span>
                                    )}
                                    {person.ewl_by_role.I > 0 && (
                                      <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded">
                                        I: {person.ewl_by_role.I}天
                                      </span>
                                    )}
                                    <span className="text-gray-400 ml-2">
                                      | 任务: {person.task_count}个待完成
                                    </span>
                                  </div>
                                </div>

                                {/* 任务列表 */}
                                {personExpanded && (
                                  <div className="mt-3 ml-6 border rounded overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">编号</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">任务名称</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">里程碑</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">角色</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">工期</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">EWL</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">状态</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y">
                                        {person.tasks.map((task, idx) => (
                                          <tr key={`${task.task_no}-${idx}`} className={`hover:bg-gray-50 ${task.status === '已完成' || task.status === '暂停' ? 'opacity-50' : ''}`}>
                                            <td className="px-3 py-2">{task.task_no}</td>
                                            <td className="px-3 py-2">{task.task_name}</td>
                                            <td className="px-3 py-2">{task.milestone}</td>
                                            <td className="px-3 py-2">
                                              <span className={`px-1.5 py-0.5 text-xs rounded ${getRoleColor(task.role)}`}>
                                                {task.role}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2">{task.duration}天</td>
                                            <td className="px-3 py-2">
                                              {task.contribution > 0 ? (
                                                <span className="text-orange-600 font-medium">{task.contribution}天</span>
                                              ) : (
                                                <span className="text-gray-400">-</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className={`px-1.5 py-0.5 text-xs rounded ${getStatusColor(task.status)}`}>
                                                {task.status}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {Object.keys(groupedByDepartment).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    暂无数据，请先为任务分配 RACI 职责
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
