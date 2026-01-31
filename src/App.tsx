import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AssessmentResponse, ReportData, Scores } from './types';
import { api } from './services/api';
import * as scoring from './services/scoring';
import Landing from './components/Landing';
import CodeActivation from './components/CodeActivation';
import Questionnaire from './components/Questionnaire';
import Report from './components/Report';
import ProgressModal from './components/ProgressModal';
import { ToastContainer, useToast } from './components/Toast';
import { formatUserDataForAI } from './services/aiAnalysis';

// Admin pages
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCodes from './pages/admin/Codes';
import AdminAssessments from './pages/admin/Assessments';

type AppState = 'LANDING' | 'ACTIVATION' | 'ACTIVE' | 'REPORT';

const MainApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('LANDING');
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [userId] = useState<string>(() => {
    const id = localStorage.getItem('growth_barrier_uid');
    if (id) return id;
    const newId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('growth_barrier_uid', newId);
    return newId;
  });

  const [responses, setResponses] = useState<AssessmentResponse>({});
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [pendingProgress, setPendingProgress] = useState<{responses: AssessmentResponse} | null>(null);
  const { toasts, toast, removeToast } = useToast();

  useEffect(() => {
    const checkProgress = async () => {
      const saved = await api.getProgress(userId);
      if (saved && Object.keys(saved.responses).length > 0) {
        if (appState === 'LANDING') {
          setPendingProgress(saved);
          setShowRecovery(true);
        }
      }
    };
    checkProgress();
  }, [userId, appState]);

  const handleResume = () => {
    if (pendingProgress) {
      setResponses(pendingProgress.responses);
      setAppState('ACTIVE');
      setActiveCode(localStorage.getItem('growth_barrier_active_code') || '已恢复');
    }
    setShowRecovery(false);
  };

  const handleStartFresh = () => {
    api.saveProgress(userId, 0, {});
    setShowRecovery(false);
  };

  const handleActivation = async (code: string) => {
    setLoading(true);
    const result = await api.validateCode(code, userId);
    setLoading(false);

    if (result.success) {
      setActiveCode(code);
      localStorage.setItem('growth_barrier_active_code', code);
      setAppState('ACTIVE');
      toast.success('兑换码激活成功');
    } else {
      toast.error(result.message || '激活失败');
    }
  };

  const triggerAIAnalysis = async (id: string, scores: Scores, currentResponses: AssessmentResponse) => {
    try {
      setReport(prev => prev ? { ...prev, aiStatus: 'generating' } : null);

      const userData = formatUserDataForAI(currentResponses, scores);

      // Call secure backend API for AI analysis
      const result = await api.triggerAIAnalysis(id, userData);

      if (result.success) {
        setReport(prev => prev ? {
          ...prev,
          aiStatus: 'completed',
          aiAnalysis: result.aiAnalysis,
          aiGeneratedAt: result.aiGeneratedAt,
          aiWordCount: result.aiWordCount
        } : null);
      } else {
        throw new Error(result.error || 'AI分析失败');
      }
    } catch (error) {
      console.error('AI分析失败:', error);
      setReport(prev => prev ? { ...prev, aiStatus: 'failed' } : null);
      toast.error('AI分析失败，请稍后重试');
    }
  };

  const calculateFinalScores = (): Scores => {
    const dimensionResults = scoring.calculateDimensionScores(responses);
    const behaviorResults = scoring.calculateBehaviorScores(responses);
    const overallIndex = scoring.calculateObstacleIndex(dimensionResults.raw, behaviorResults, responses);
    const level = scoring.getLevelString(overallIndex);
    const core = scoring.identifyCoreObstacle(dimensionResults.raw, behaviorResults);
    return {
      beliefScores: dimensionResults.display,
      patternScores: Object.fromEntries(Object.entries(behaviorResults).map(([k, v]) => [k, (v.score / (["自我破坏", "能量内耗", "完美主义行为"].includes(k) ? 13 : 12)) * 5])),
      overallIndex,
      level,
      coreBarrier: core.primary_belief
    };
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const finalScores = calculateFinalScores();
      const { generateReport } = await import('./services/geminiService');
      const basicReport = await generateReport(finalScores, [
        `限制性声音: ${responses[48] || '无'}`,
        `突破渴望与恐惧: ${responses[49] || '无'}`,
        `理想未来: ${responses[50] || '无'}`
      ]);
      const submitResult = await api.submitAssessment(userId, activeCode!, responses, finalScores);
      if (submitResult.success && submitResult.id) {
        setAssessmentId(submitResult.id);
        const finalReport = { ...basicReport, aiStatus: 'pending' as const };
        setReport(finalReport);
        setAppState('REPORT');
        localStorage.removeItem('growth_barrier_active_code');
        triggerAIAnalysis(submitResult.id, finalScores, responses);
      } else {
        toast.error(submitResult.message || '提交失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('报告生成失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  const resetToHome = () => {
    setAppState('LANDING');
    setReport(null);
    setResponses({});
    setActiveCode(null);
    setAssessmentId(null);
    localStorage.removeItem('growth_barrier_active_code');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 sticky top-0 z-50 shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <button onClick={resetToHome} className="flex items-center gap-3 transition-all">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div className="text-left">
              <h1 className="text-lg font-black text-slate-900 leading-none">成长阻碍探测器</h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">发现真实的自我底层逻辑</p>
            </div>
          </button>
          {appState === 'ACTIVE' && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">探测进度</span>
              <div className="w-24 md:w-48 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.round((Object.keys(responses).length / 50) * 100)}%` }}></div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow w-full py-8">
        <div className="max-w-5xl mx-auto px-4">
          {appState === 'LANDING' && <Landing onStart={() => setAppState('ACTIVATION')} />}
          {appState === 'ACTIVATION' && <CodeActivation onActivate={handleActivation} onBack={() => setAppState('LANDING')} loading={loading} />}
          {appState === 'ACTIVE' && (
            <Questionnaire responses={responses} setResponses={(updater) => {
              setResponses(prev => {
                const next = typeof updater === 'function' ? updater(prev) : updater;
                api.saveProgress(userId, 0, next);
                return next;
              });
            }} onSubmit={handleSubmit} loading={loading} />
          )}
          {appState === 'REPORT' && report && (
            <Report data={report} assessmentId={assessmentId || undefined} onRefreshAI={() => assessmentId && triggerAIAnalysis(assessmentId, report.scores, responses)} onMeToo={resetToHome} />
          )}
        </div>
      </main>

      <footer className="py-12 border-t border-slate-200 text-center text-slate-400 text-sm bg-white print:hidden">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-left">
            <p className="font-bold text-slate-900">成长阻碍探测器 v2.1</p>
            <p className="text-xs mt-1 text-slate-400">基于深层心理学模型与专家 AI 系统开发</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-xs text-slate-400 hover:text-indigo-600">隐私政策</a>
            <a href="/terms" className="text-xs text-slate-400 hover:text-indigo-600">用户协议</a>
          </div>
          <p className="text-[10px] tracking-widest font-bold">专业成长洞察 &copy; 2025</p>
        </div>
      </footer>

      {showRecovery && <ProgressModal onConfirm={handleResume} onCancel={handleStartFresh} />}
    </div>
  );
};

// Privacy Policy Page
const PrivacyPage: React.FC = () => (
  <div className="min-h-screen bg-slate-50 py-16 px-4">
    <div className="max-w-3xl mx-auto bg-white rounded-3xl p-12 shadow-xl">
      <h1 className="text-3xl font-black text-slate-900 mb-8">隐私政策</h1>
      <div className="prose prose-slate max-w-none">
        <h2 className="text-xl font-bold mt-6 mb-4">1. 信息收集</h2>
        <p className="text-slate-600 mb-4">我们收集您在使用本服务时提供的信息，包括测评答案、兑换码使用记录等。这些信息用于生成个性化的成长分析报告。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">2. 信息使用</h2>
        <p className="text-slate-600 mb-4">您的信息仅用于：生成测评报告、改进服务质量、提供客户支持。我们不会将您的个人信息出售给第三方。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">3. 数据安全</h2>
        <p className="text-slate-600 mb-4">我们采用行业标准的安全措施保护您的数据，包括加密传输、安全存储等。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">4. 免责声明</h2>
        <p className="text-slate-600 mb-4">本测评工具仅供参考，不构成专业心理咨询或医疗建议。如有心理健康问题，请咨询专业人士。</p>
      </div>
      <div className="mt-8">
        <a href="/" className="text-indigo-600 font-bold hover:underline">返回首页</a>
      </div>
    </div>
  </div>
);

// Terms of Service Page
const TermsPage: React.FC = () => (
  <div className="min-h-screen bg-slate-50 py-16 px-4">
    <div className="max-w-3xl mx-auto bg-white rounded-3xl p-12 shadow-xl">
      <h1 className="text-3xl font-black text-slate-900 mb-8">用户协议</h1>
      <div className="prose prose-slate max-w-none">
        <h2 className="text-xl font-bold mt-6 mb-4">1. 服务说明</h2>
        <p className="text-slate-600 mb-4">成长阻碍探测器是一款基于心理学理论的自我探索工具，旨在帮助用户了解自身的成长阻碍模式。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">2. 使用条款</h2>
        <p className="text-slate-600 mb-4">使用本服务即表示您同意遵守本协议。您需要通过有效的兑换码激活服务。每个兑换码仅限使用一次。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">3. 知识产权</h2>
        <p className="text-slate-600 mb-4">本服务的所有内容、设计、算法均受知识产权保护。未经授权，不得复制、修改或分发。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">4. 免责声明</h2>
        <p className="text-slate-600 mb-4">本测评结果仅供参考，不能替代专业心理咨询或医疗诊断。对于因使用本服务产生的任何直接或间接损失，我们不承担责任。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">5. 联系方式</h2>
        <p className="text-slate-600 mb-4">如有任何问题，请通过官方渠道联系我们。</p>
      </div>
      <div className="mt-8">
        <a href="/" className="text-indigo-600 font-bold hover:underline">返回首页</a>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/codes" element={<AdminCodes />} />
        <Route path="/admin/assessments" element={<AdminAssessments />} />
        <Route path="/admin" element={<AdminLogin />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
