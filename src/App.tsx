import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AssessmentResponse, ReportData, Scores } from './types';
import { api } from './services/api';
import * as scoring from './services/scoring';
import Landing from './components/Landing';
import Questionnaire from './components/Questionnaire';
import Report from './components/Report';
import ProgressModal from './components/ProgressModal';
import PaymentModal from './components/PaymentModal';
import { ToastContainer, useToast } from './components/Toast';
import { OfflineBanner } from './components/Skeleton';
import { formatUserDataForAI } from './services/aiAnalysis';
import { useNetworkStatus } from './hooks/useUtils';

// Admin pages
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCodes from './pages/admin/Codes';
import AdminAssessments from './pages/admin/Assessments';
import ReportView from './pages/ReportView';

type AppState = 'LANDING' | 'ACTIVE' | 'REPORT';

// 生成更安全的用户ID
const generateUserId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  const browserFingerprint = [
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset()
  ].join('_');
  const hash = btoa(browserFingerprint).substring(0, 8);
  return `u_${timestamp}_${randomPart}_${hash}`;
};

const MainApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('LANDING');
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [userId] = useState<string>(() => {
    const id = localStorage.getItem('growth_barrier_uid');
    if (id) return id;
    const newId = generateUserId();
    localStorage.setItem('growth_barrier_uid', newId);
    return newId;
  });

  const [responses, setResponses] = useState<AssessmentResponse>({});
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingProgress, setPendingProgress] = useState<{responses: AssessmentResponse} | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const { toasts, toast, removeToast } = useToast();
  const { isOnline, wasOffline } = useNetworkStatus();

  // 网络恢复提示
  useEffect(() => {
    if (wasOffline) {
      toast.success('网络已恢复连接');
    }
  }, [wasOffline]);

  useEffect(() => {
    const checkProgress = async () => {
      if (!isOnline) return;
      try {
        const saved = await api.getProgress(userId);
        if (saved && Object.keys(saved.responses).length > 0) {
          if (appState === 'LANDING') {
            setPendingProgress(saved);
            setShowRecovery(true);
          }
        }
      } catch (error) {
        console.error('Failed to check progress:', error);
      }
    };
    checkProgress();
  }, [userId, appState, isOnline]);

  const handleResume = () => {
    if (pendingProgress) {
      setResponses(pendingProgress.responses);
      setAppState('ACTIVE');
    }
    setShowRecovery(false);
  };

  const handleStartFresh = () => {
    api.saveProgress(userId, 0, {});
    setShowRecovery(false);
  };

  const calculateFinalScores = (): Scores => {
    return scoring.calculateScores(responses);
  };

  // 实际提交测评
  const submitAssessment = async (paymentCode: string) => {
    setLoading(true);
    try {
      const finalScores = calculateFinalScores();
      const { generateReport } = await import('./services/geminiService');
      const basicReport = await generateReport(finalScores, [
        `限制性声音: ${responses[48] || '无'}`,
        `突破渴望与恐惧: ${responses[49] || '无'}`,
        `理想未来: ${responses[50] || '无'}`
      ]);
      const submitResult = await api.submitAssessment(userId, paymentCode, responses, finalScores);
      if (submitResult.success && submitResult.id) {
        setAssessmentId(submitResult.id);
        const finalReport = { ...basicReport, aiStatus: 'pending' as const };
        setReport(finalReport);
        setAppState('REPORT');
        // 清除已保存的进度
        api.saveProgress(userId, 0, {});
        toast.success('报告生成成功！');
      } else {
        if ((submitResult as any).retryAfter) {
          toast.error(`提交过于频繁，请 ${(submitResult as any).retryAfter} 秒后重试`);
        } else {
          toast.error(submitResult.message || '提交失败');
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('报告生成失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  // 支付成功后的处理
  const handlePaymentSuccess = async (outTradeNo: string) => {
    setShowPayment(false);
    setActiveCode(outTradeNo);
    toast.success('支付成功！正在生成报告...');
    // 延迟一下让用户看到成功提示
    setTimeout(() => {
      submitAssessment(outTradeNo);
    }, 1000);
  };

  // 点击生成报告时，先检查支付状态
  const handleSubmit = async () => {
    if (!isOnline) {
      toast.error('网络连接已断开，请检查网络后重试');
      return;
    }

    // 检查用户是否已支付
    try {
      const response = await fetch(`/api/payment?action=check&visitorId=${userId}`);
      const data = await response.json();

      if (data.paid) {
        // 已支付，直接提交
        submitAssessment(data.outTradeNo);
      } else {
        // 未支付，弹出支付窗口
        setShowPayment(true);
      }
    } catch (error) {
      // 检查失败，弹出支付窗口
      setShowPayment(true);
    }
  };

  const triggerAIAnalysis = async (id: string, scores: Scores, currentResponses: AssessmentResponse) => {
    try {
      setReport(prev => prev ? { ...prev, aiStatus: 'generating' } : null);
      setStreamingContent('');
      setIsStreaming(true);

      const userData = formatUserDataForAI(currentResponses, scores);

      await api.triggerAIAnalysisStream(
        id,
        userData,
        (content: string) => {
          setStreamingContent(prev => prev + content);
        },
        (fullContent: string) => {
          setIsStreaming(false);
          setReport(prev => prev ? {
            ...prev,
            aiStatus: 'completed',
            aiAnalysis: fullContent,
            aiGeneratedAt: new Date().toISOString(),
            aiWordCount: fullContent.length
          } : null);
        },
        (error: string) => {
          setIsStreaming(false);
          setReport(prev => prev ? { ...prev, aiStatus: 'failed' } : null);
          toast.error(error || 'AI分析失败，请稍后重试');
        }
      );
    } catch (error) {
      console.error('AI分析失败:', error);
      setIsStreaming(false);
      setReport(prev => prev ? { ...prev, aiStatus: 'failed' } : null);
      toast.error('AI分析失败，请稍后重试');
    }
  };

  const resetToHome = () => {
    setAppState('LANDING');
    setReport(null);
    setResponses({});
    setActiveCode(null);
    setAssessmentId(null);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans selection:bg-orange-100">
      {/* 离线提示横幅 */}
      <OfflineBanner show={!isOnline} />

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 px-6 py-4 sticky top-0 z-50 shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <button onClick={resetToHome} className="flex items-center gap-3 transition-all">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div className="text-left">
              <h1 className="text-lg font-black text-stone-900 leading-none">内耗指数测评</h1>
              <p className="text-[10px] text-stone-400 font-bold tracking-widest mt-1">找回你的能量</p>
            </div>
          </button>
          {appState === 'ACTIVE' && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">测评进度</span>
              <div className="w-24 md:w-48 h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-50">
                <div className="h-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all duration-500" style={{ width: `${Math.round((Object.keys(responses).length / 38) * 100)}%` }}></div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow w-full py-8">
        <div className="max-w-5xl mx-auto px-4">
          {appState === 'LANDING' && <Landing onStart={() => setAppState('ACTIVE')} />}
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
            <Report
              data={report}
              assessmentId={assessmentId || undefined}
              onRefreshAI={() => assessmentId && triggerAIAnalysis(assessmentId, report.scores, responses)}
              onMeToo={resetToHome}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
            />
          )}
        </div>
      </main>

      <footer className="py-12 border-t border-stone-200 text-center text-stone-400 text-sm bg-white print:hidden">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-left">
            <p className="font-bold text-stone-900">内耗指数测评</p>
            <p className="text-xs mt-1 text-stone-400">找出你的能量黑洞，拿回属于你的精力</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-xs text-stone-400 hover:text-orange-600">隐私政策</a>
            <a href="/terms" className="text-xs text-stone-400 hover:text-orange-600">用户协议</a>
          </div>
          <p className="text-[10px] tracking-widest font-bold">能量管理 &copy; 2025</p>
        </div>
      </footer>

      {/* 进度恢复弹窗 */}
      {showRecovery && <ProgressModal onConfirm={handleResume} onCancel={handleStartFresh} />}

      {/* 支付弹窗 */}
      <PaymentModal
        show={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
        visitorId={userId}
      />
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
        <p className="text-slate-600 mb-4">我们收集您在使用本服务时提供的信息，包括测评答案、支付记录等。这些信息用于生成个性化的分析报告。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">2. 信息使用</h2>
        <p className="text-slate-600 mb-4">您的信息仅用于：生成测评报告、改进服务质量、提供客户支持。我们不会将您的个人信息出售给第三方。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">3. 数据安全</h2>
        <p className="text-slate-600 mb-4">我们采用行业标准的安全措施保护您的数据，包括加密传输、安全存储等。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">4. 免责声明</h2>
        <p className="text-slate-600 mb-4">本测评工具仅供参考，不构成专业心理咨询或医疗建议。如有心理健康问题，请咨询专业人士。</p>
      </div>
      <div className="mt-8">
        <a href="/" className="text-orange-600 font-bold hover:underline">返回首页</a>
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
        <p className="text-slate-600 mb-4">内耗指数测评是一款基于心理学理论的自我探索工具，旨在帮助用户了解自身的内耗模式，找回被消耗的能量。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">2. 使用条款</h2>
        <p className="text-slate-600 mb-4">使用本服务即表示您同意遵守本协议。您需要通过微信支付或兑换码激活服务。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">3. 知识产权</h2>
        <p className="text-slate-600 mb-4">本服务的所有内容、设计、算法均受知识产权保护。未经授权，不得复制、修改或分发。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">4. 免责声明</h2>
        <p className="text-slate-600 mb-4">本测评结果仅供参考，不能替代专业心理咨询或医疗诊断。对于因使用本服务产生的任何直接或间接损失，我们不承担责任。</p>

        <h2 className="text-xl font-bold mt-6 mb-4">5. 联系方式</h2>
        <p className="text-slate-600 mb-4">如有任何问题，请通过官方渠道联系我们。</p>
      </div>
      <div className="mt-8">
        <a href="/" className="text-orange-600 font-bold hover:underline">返回首页</a>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/report/:id" element={<ReportView />} />
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
