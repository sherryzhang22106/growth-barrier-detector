import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminApi } from '../../services/api';

interface Stats {
  totalAssessments: number;
  todayAssessments: number;
  completedAssessments: number;
  totalCodes: number;
  unusedCodes: number;
  usedCodes: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [assessmentsRes, codesRes] = await Promise.all([
        adminApi.listAssessments({ limit: 5 }),
        adminApi.listCodes({ limit: 100 }),
      ]);

      if (assessmentsRes.success) {
        setRecentAssessments(assessmentsRes.data || []);

        const today = new Date().toDateString();
        const todayCount = (assessmentsRes.data || []).filter(
          (a: any) => new Date(a.createdAt).toDateString() === today
        ).length;

        const completedCount = (assessmentsRes.data || []).filter(
          (a: any) => a.aiStatus === 'completed'
        ).length;

        const codes = codesRes.data || [];
        const unusedCount = codes.filter((c: any) => c.status === 'UNUSED').length;
        const usedCount = codes.filter((c: any) => c.status === 'USED').length;

        setStats({
          totalAssessments: assessmentsRes.pagination?.total || 0,
          todayAssessments: todayCount,
          completedAssessments: completedCount,
          totalCodes: codes.length,
          unusedCodes: unusedCount,
          usedCodes: usedCount,
        });
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">管理后台</h1>
              <p className="text-xs text-slate-400">成长阻碍探测器</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex gap-2">
              <Link to="/admin/dashboard" className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-sm">
                仪表盘
              </Link>
              <Link to="/admin/codes" className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-bold text-sm">
                兑换码
              </Link>
              <Link to="/admin/assessments" className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-bold text-sm">
                测评数据
              </Link>
            </nav>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold text-sm"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-black text-slate-900 mb-8">数据概览</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="text-sm font-bold text-slate-400 mb-2">总测评数</div>
            <div className="text-4xl font-black text-slate-900">{stats?.totalAssessments || 0}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="text-sm font-bold text-slate-400 mb-2">今日新增</div>
            <div className="text-4xl font-black text-emerald-600">{stats?.todayAssessments || 0}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="text-sm font-bold text-slate-400 mb-2">可用兑换码</div>
            <div className="text-4xl font-black text-indigo-600">{stats?.unusedCodes || 0}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="text-sm font-bold text-slate-400 mb-2">已使用兑换码</div>
            <div className="text-4xl font-black text-amber-600">{stats?.usedCodes || 0}</div>
          </div>
        </div>

        {/* Recent Assessments */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">最近测评</h3>
            <Link to="/admin/assessments" className="text-sm text-indigo-600 font-bold hover:underline">
              查看全部
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentAssessments.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                暂无测评数据
              </div>
            ) : (
              recentAssessments.map((assessment) => (
                <div key={assessment.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-900">{assessment.code}</div>
                    <div className="text-sm text-slate-400">
                      {new Date(assessment.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      assessment.aiStatus === 'completed'
                        ? 'bg-emerald-50 text-emerald-600'
                        : assessment.aiStatus === 'generating'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-slate-50 text-slate-600'
                    }`}>
                      {assessment.aiStatus === 'completed' ? '已完成' :
                       assessment.aiStatus === 'generating' ? '生成中' : '待处理'}
                    </span>
                    <span className="text-lg font-black text-indigo-600">
                      {(assessment.scores as any)?.overallIndex || '-'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
