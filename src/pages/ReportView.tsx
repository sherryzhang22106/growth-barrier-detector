import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import Report from '../components/Report';
import { ReportData } from '../types';

const ReportView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) {
        setError('报告ID无效');
        setLoading(false);
        return;
      }

      try {
        const data = await api.getAssessment(id);
        if (data) {
          setReport({
            scores: data.scores,
            analysis: data.aiAnalysis || '',
            immediateActions: data.immediateActions || [],
            plan21Days: data.plan21Days || { week1: [], week2: [], week3: [] },
            relapseWarnings: data.relapseWarnings || [],
            aiStatus: data.aiStatus || 'completed',
            aiAnalysis: data.aiAnalysis,
          });
        } else {
          setError('报告不存在或已过期');
        }
      } catch (err) {
        console.error('Failed to fetch report:', err);
        setError('加载报告失败');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">加载报告中...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">{error || '报告不存在'}</h2>
          <p className="text-slate-500 mb-8">该报告可能已过期或链接无效</p>
          <Link to="/" className="inline-block bg-gradient-to-r from-orange-500 to-rose-500 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-orange-200 transition-all">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 transition-all">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-left">
              <h1 className="text-lg font-black text-slate-900 leading-none">内耗指数测评</h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">分享报告</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Report data={report} assessmentId={id} />
        </div>
      </main>
    </div>
  );
};

export default ReportView;
