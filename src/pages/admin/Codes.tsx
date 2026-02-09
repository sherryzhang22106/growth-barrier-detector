import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminApi } from '../../services/api';
import * as XLSX from 'xlsx';

interface Code {
  code: string;
  packageType: string;
  status: string;
  createdAt: string;
  activatedAt?: string;
  expiresAt?: string;
  assessmentCount: number;
}

interface GeneratedCodesResult {
  codes: string[];
  count: number;
  packageType: string;
  expiresAt: string | null;
}

const AdminCodes: React.FC = () => {
  const navigate = useNavigate();
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedCodesResult | null>(null);
  const [createForm, setCreateForm] = useState({
    count: 10,
    packageType: 'STANDARD',
    prefix: 'LYING',
    expiresInDays: '',
  });
  const [creating, setCreating] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadCodes();
  }, [navigate, statusFilter, pagination.page]);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const result = await adminApi.listCodes({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page: pagination.page,
        limit: 20,
      });

      if (result.success) {
        setCodes(result.data || []);
        setPagination(prev => ({
          ...prev,
          total: result.pagination?.total || 0,
          totalPages: result.pagination?.totalPages || 0,
        }));
      }
    } catch (error) {
      console.error('Load codes error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const count = Math.max(1, Math.min(100, Number(createForm.count) || 1));
      const result = await adminApi.createCodes({
        count,
        packageType: createForm.packageType,
        prefix: createForm.prefix,
        expiresInDays: createForm.expiresInDays ? parseInt(createForm.expiresInDays) : undefined,
      });

      if (result.success) {
        setShowCreateModal(false);
        setGeneratedResult(result.data);
        setShowResultModal(true);
        loadCodes();
      } else {
        alert(`生成失败: ${result.error || result.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('Create codes error:', error);
      alert('生成失败: 网络错误');
    } finally {
      setCreating(false);
    }
  };

  const handleExportExcel = () => {
    if (!generatedResult) return;

    const data = generatedResult.codes.map((code, index) => ({
      '序号': index + 1,
      '兑换码': code,
      '套餐类型': generatedResult.packageType,
      '状态': '未使用',
      '有效期': generatedResult.expiresAt ? new Date(generatedResult.expiresAt).toLocaleDateString('zh-CN') : '永久有效',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '兑换码');

    // 设置列宽
    ws['!cols'] = [
      { wch: 6 },   // 序号
      { wch: 20 },  // 兑换码
      { wch: 12 },  // 套餐类型
      { wch: 10 },  // 状态
      { wch: 15 },  // 有效期
    ];

    const fileName = `兑换码_${generatedResult.packageType}_${generatedResult.count}个_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleRevoke = async (code: string) => {
    if (!confirm(`确定要作废兑换码 ${code} 吗？`)) return;

    try {
      const result = await adminApi.revokeCode(code);
      if (result.success) {
        loadCodes();
      } else {
        alert(result.error || '作废失败');
      }
    } catch (error) {
      alert('作废失败');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const handleDeleteAllUnused = async () => {
    if (!confirm('确定要删除所有未使用的兑换码吗？此操作不可恢复！')) return;

    try {
      const result = await adminApi.deleteAllUnused();
      if (result.success) {
        loadCodes();
        alert(`成功删除 ${result.data?.deletedCount || 0} 个未使用的兑换码`);
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      UNUSED: 'bg-emerald-50 text-emerald-600',
      ACTIVATED: 'bg-amber-50 text-amber-600',
      USED: 'bg-slate-100 text-slate-600',
      REVOKED: 'bg-red-50 text-red-600',
    };
    const labels: Record<string, string> = {
      UNUSED: '未使用',
      ACTIVATED: '已激活',
      USED: '已使用',
      REVOKED: '已作废',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-slate-50 text-slate-600'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-100 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black text-stone-900">管理后台</h1>
              <p className="text-xs text-stone-400">内耗指数测评系统</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex gap-2">
              <Link to="/admin/dashboard" className="px-4 py-2 text-stone-600 hover:bg-stone-50 rounded-lg font-bold text-sm">
                仪表盘
              </Link>
              <Link to="/admin/codes" className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg font-bold text-sm">
                兑换码
              </Link>
              <Link to="/admin/assessments" className="px-4 py-2 text-stone-600 hover:bg-stone-50 rounded-lg font-bold text-sm">
                测评数据
              </Link>
            </nav>
            <button onClick={handleLogout} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold text-sm">
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-stone-900">兑换码管理</h2>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteAllUnused}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-all"
            >
              清除未使用
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:shadow-xl transition-all"
            >
              批量生成
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['ALL', 'UNUSED', 'ACTIVATED', 'USED', 'REVOKED'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                statusFilter === status
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
              }`}
            >
              {status === 'ALL' ? '全部' :
               status === 'UNUSED' ? '未使用' :
               status === 'ACTIVATED' ? '已激活' :
               status === 'USED' ? '已使用' : '已作废'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : codes.length === 0 ? (
            <div className="px-6 py-12 text-center text-stone-400">
              暂无兑换码
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase">兑换码</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase">套餐</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase">状态</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase">创建时间</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase">测评数</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-stone-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {codes.map((code) => (
                  <tr key={code.code} className="hover:bg-stone-50">
                    <td className="px-6 py-4 font-mono font-bold text-stone-900">{code.code}</td>
                    <td className="px-6 py-4 text-sm text-stone-600">{code.packageType}</td>
                    <td className="px-6 py-4">{getStatusBadge(code.status)}</td>
                    <td className="px-6 py-4 text-sm text-stone-500">
                      {new Date(code.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">{code.assessmentCount}</td>
                    <td className="px-6 py-4 text-right">
                      {code.status === 'UNUSED' && (
                        <button
                          onClick={() => handleRevoke(code.code)}
                          className="text-red-600 hover:text-red-700 font-bold text-sm"
                        >
                          作废
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-white border border-stone-200 rounded-lg font-bold text-sm disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-stone-600 text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-white border border-stone-200 rounded-lg font-bold text-sm disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h3 className="text-xl font-black text-stone-900 mb-6">批量生成兑换码</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">数量</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={createForm.count}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, count: Math.max(1, Math.min(100, Number(e.target.value) || 1)) }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-stone-100 focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">套餐类型</label>
                <select
                  value={createForm.packageType}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, packageType: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-stone-100 focus:border-orange-500 outline-none"
                >
                  <option value="STANDARD">标准版</option>
                  <option value="PREMIUM">高级版</option>
                  <option value="ENTERPRISE">企业版</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">前缀</label>
                <input
                  type="text"
                  maxLength={8}
                  value={createForm.prefix}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, prefix: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-stone-100 focus:border-orange-500 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">有效期（天，留空为永久）</label>
                <input
                  type="number"
                  min="1"
                  value={createForm.expiresInDays}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, expiresInDays: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-stone-100 focus:border-orange-500 outline-none"
                  placeholder="留空为永久有效"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {creating ? '生成中...' : '生成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && generatedResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-stone-900">生成成功</h3>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-sm font-bold">
                {generatedResult.count} 个
              </span>
            </div>

            <div className="mb-4 p-4 bg-stone-50 rounded-xl">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-stone-500">套餐类型：</span>
                  <span className="font-bold text-stone-700">{generatedResult.packageType}</span>
                </div>
                <div>
                  <span className="text-stone-500">有效期：</span>
                  <span className="font-bold text-stone-700">
                    {generatedResult.expiresAt ? new Date(generatedResult.expiresAt).toLocaleDateString('zh-CN') : '永久'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 border border-stone-100 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-stone-500">序号</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-stone-500">兑换码</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {generatedResult.codes.map((code, index) => (
                    <tr key={code} className="hover:bg-stone-50">
                      <td className="px-4 py-2 text-stone-500">{index + 1}</td>
                      <td className="px-4 py-2 font-mono font-bold text-stone-900">{code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowResultModal(false)}
                className="flex-1 px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold"
              >
                关闭
              </button>
              <button
                onClick={handleExportExcel}
                className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                导出 Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCodes;
