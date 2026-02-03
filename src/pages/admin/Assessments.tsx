import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminApi } from '../../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Assessment {
  id: string;
  visitorId: string;
  code: string;
  scores: {
    overallIndex: number;
    level: string;
    coreBarrier: string;
    beliefScores?: Record<string, number>;
    patternScores?: Record<string, number>;
  };
  aiStatus: string;
  aiAnalysis?: string;
  createdAt: string;
  completedAt?: string;
}

interface ReportModalProps {
  assessment: Assessment | null;
  onClose: () => void;
  onDownloadPDF: (id: string) => void;
  downloading: boolean;
}

const ReportModal: React.FC<ReportModalProps> = ({ assessment, onClose, onDownloadPDF, downloading }) => {
  if (!assessment) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-black text-slate-900">测评报告详情</h3>
            <p className="text-sm text-slate-500">兑换码: {assessment.code}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onDownloadPDF(assessment.id)}
              disabled={downloading || assessment.aiStatus !== 'completed'}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {downloading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  生成中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  下载 PDF
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Score Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-indigo-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-indigo-600">{assessment.scores?.overallIndex || '-'}</div>
              <div className="text-xs text-indigo-600 font-bold mt-1">阻碍指数</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-lg font-black text-slate-700">{assessment.scores?.level || '-'}</div>
              <div className="text-xs text-slate-500 font-bold mt-1">状态等级</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-lg font-black text-slate-700">{assessment.scores?.coreBarrier || '-'}</div>
              <div className="text-xs text-slate-500 font-bold mt-1">核心卡点</div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="mb-6">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3">AI 深度分析报告</h4>
            {assessment.aiStatus === 'completed' && assessment.aiAnalysis ? (
              <div className="bg-slate-50 rounded-xl p-6 prose prose-slate max-w-none">
                <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                  {assessment.aiAnalysis}
                </div>
              </div>
            ) : assessment.aiStatus === 'generating' ? (
              <div className="bg-amber-50 rounded-xl p-6 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-amber-600 font-bold">AI 报告生成中...</p>
              </div>
            ) : assessment.aiStatus === 'failed' ? (
              <div className="bg-red-50 rounded-xl p-6 text-center">
                <p className="text-red-600 font-bold">AI 报告生成失败</p>
              </div>
            ) : (
              <div className="bg-slate-100 rounded-xl p-6 text-center">
                <p className="text-slate-500 font-bold">暂无 AI 分析报告</p>
              </div>
            )}
          </div>

          {/* Scores Detail */}
          {assessment.scores?.beliefScores && (
            <div className="mb-6">
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3">信念维度得分</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(assessment.scores.beliefScores).map(([key, value]) => (
                  <div key={key} className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">{key}</div>
                    <div className="text-lg font-black text-slate-700">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assessment.scores?.patternScores && (
            <div>
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3">行为模式得分</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(assessment.scores.patternScores).map(([key, value]) => (
                  <div key={key} className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">{key}</div>
                    <div className="text-lg font-black text-slate-700">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta Info */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-sm text-slate-500">
            <p>创建时间: {new Date(assessment.createdAt).toLocaleString('zh-CN')}</p>
            {assessment.completedAt && (
              <p>完成时间: {new Date(assessment.completedAt).toLocaleString('zh-CN')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminAssessments: React.FC = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadAssessments();
  }, [navigate, statusFilter, pagination.page]);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const result = await adminApi.listAssessments({
        status: statusFilter || undefined,
        page: pagination.page,
        limit: 20,
      });

      if (result.success) {
        setAssessments(result.data || []);
        setPagination(prev => ({
          ...prev,
          total: result.pagination?.total || 0,
          totalPages: result.pagination?.totalPages || 0,
        }));
      }
    } catch (error) {
      console.error('Load assessments error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (assessment: Assessment) => {
    // Fetch full assessment details including AI analysis
    try {
      const result = await fetch(`/api/assessments/${assessment.id}`);
      const data = await result.json();
      if (data.success && data.data) {
        setSelectedAssessment(data.data);
      } else {
        setSelectedAssessment(assessment);
      }
    } catch (error) {
      setSelectedAssessment(assessment);
    }
  };

  const handleDownloadPDF = async (id: string) => {
    setDownloadingPDF(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/assessments/pdf?id=${id}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        const html = await response.text();

        // Create a hidden container to render HTML
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '595px';
        container.style.background = 'white';
        container.style.padding = '0';
        container.style.margin = '0';
        container.innerHTML = html;
        document.body.appendChild(container);

        // Wait for content to fully render
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get actual content height
        const contentHeight = container.scrollHeight;

        // Generate PDF using html2canvas and jsPDF
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          width: 595,
          height: contentHeight,
          windowWidth: 595,
          windowHeight: contentHeight,
          scrollY: 0,
          scrollX: 0,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Add additional pages if needed
        while (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        // Download PDF
        pdf.save(`report-${id}.pdf`);

        // Cleanup
        document.body.removeChild(container);
      } else {
        alert('报告生成失败');
      }
    } catch (error) {
      console.error('Download PDF error:', error);
      alert('报告下载失败');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleExport = async (format: 'json' | 'xlsx') => {
    setExporting(true);
    try {
      const result = await adminApi.exportAssessments({
        format,
        ids: selectedIds.length > 0 ? selectedIds : undefined,
      });

      if (!result.success) {
        alert(result.error || '导出失败');
      }
    } catch (error) {
      alert('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === assessments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(assessments.map(a => a.id));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-emerald-50 text-emerald-600',
      generating: 'bg-amber-50 text-amber-600',
      pending: 'bg-slate-100 text-slate-600',
      failed: 'bg-red-50 text-red-600',
    };
    const labels: Record<string, string> = {
      completed: '已完成',
      generating: '生成中',
      pending: '待处理',
      failed: '失败',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-slate-50 text-slate-600'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getLevelColor = (level: string) => {
    if (level.includes('绿灯')) return 'text-emerald-600';
    if (level.includes('黄灯')) return 'text-amber-600';
    if (level.includes('橙灯')) return 'text-orange-600';
    if (level.includes('红灯')) return 'text-red-600';
    if (level.includes('紧急')) return 'text-red-700';
    return 'text-slate-600';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-40">
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
              <Link to="/admin/dashboard" className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-bold text-sm">
                仪表盘
              </Link>
              <Link to="/admin/codes" className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-bold text-sm">
                兑换码
              </Link>
              <Link to="/admin/assessments" className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-sm">
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
          <h2 className="text-2xl font-black text-slate-900">测评数据</h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('xlsx')}
              disabled={exporting}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              {exporting ? '导出中...' : '导出 Excel'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['', 'completed', 'generating', 'pending', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {status === '' ? '全部' :
               status === 'completed' ? '已完成' :
               status === 'generating' ? '生成中' :
               status === 'pending' ? '待处理' : '失败'}
            </button>
          ))}
        </div>

        {/* Selection Info */}
        {selectedIds.length > 0 && (
          <div className="mb-4 p-4 bg-indigo-50 rounded-xl flex items-center justify-between">
            <span className="text-indigo-600 font-bold">
              已选择 {selectedIds.length} 条记录
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-indigo-600 hover:text-indigo-700 font-bold text-sm"
            >
              清除选择
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : assessments.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400">
              暂无测评数据
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === assessments.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase">兑换码</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase">阻碍指数</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase">状态等级</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase">核心卡点</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase">AI状态</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase">创建时间</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessments.map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(assessment.id)}
                        onChange={() => toggleSelect(assessment.id)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-slate-900">{assessment.code}</td>
                    <td className="px-4 py-4">
                      <span className="text-2xl font-black text-indigo-600">
                        {assessment.scores?.overallIndex || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`font-bold text-sm ${getLevelColor(assessment.scores?.level || '')}`}>
                        {assessment.scores?.level || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {assessment.scores?.coreBarrier || '-'}
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(assessment.aiStatus)}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {new Date(assessment.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleViewReport(assessment)}
                          className="text-indigo-600 hover:text-indigo-700 font-bold text-sm"
                        >
                          查看报告
                        </button>
                        {assessment.aiStatus === 'completed' && (
                          <button
                            onClick={() => handleDownloadPDF(assessment.id)}
                            className="text-emerald-600 hover:text-emerald-700 font-bold text-sm"
                          >
                            下载报告
                          </button>
                        )}
                      </div>
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
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-slate-600 text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        )}
      </main>

      {/* Report Modal */}
      <ReportModal
        assessment={selectedAssessment}
        onClose={() => setSelectedAssessment(null)}
        onDownloadPDF={handleDownloadPDF}
        downloading={downloadingPDF}
      />
    </div>
  );
};

export default AdminAssessments;
