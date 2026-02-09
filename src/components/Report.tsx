
import React, { useEffect, useState, useRef } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
import { ReportData } from '../types';
import { parse } from 'marked';
import DOMPurify from 'dompurify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ShareModal, FeedbackModal } from './ShareModal';
import { RESULT_LEVELS } from '../constants';

interface Props {
  data: ReportData;
  assessmentId?: string;
  onRefreshAI?: () => void;
  onMeToo?: () => void;
  streamingContent?: string;
  isStreaming?: boolean;
}

const Report: React.FC<Props> = ({ data, assessmentId, onRefreshAI, onMeToo, streamingContent, isStreaming }) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [openSection, setOpenSection] = useState<number | null>(0);
  const [renderedMarkdown, setRenderedMarkdown] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamingContent, isStreaming]);

  useEffect(() => {
    if (isStreaming && streamingContent) {
      // Update progress based on content length (estimate 6000 chars total)
      const estimatedTotal = 6000;
      const progress = Math.min(99, (streamingContent.length / estimatedTotal) * 100);
      setLoadingProgress(progress);

      // Render streaming content
      const rawHtml = parse(streamingContent);
      const sanitizedHtml = DOMPurify.sanitize(rawHtml as string, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'blockquote', 'hr'],
        ALLOWED_ATTR: [],
      });
      setRenderedMarkdown(sanitizedHtml);
    } else if (data.aiStatus === 'generating' && !streamingContent) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => (prev >= 99 ? 99 : prev + 0.2));
      }, 1500);
      return () => clearInterval(interval);
    } else if (data.aiStatus === 'completed' && data.aiAnalysis) {
      setLoadingProgress(100);
      const rawHtml = parse(data.aiAnalysis);
      const sanitizedHtml = DOMPurify.sanitize(rawHtml as string, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'blockquote', 'hr'],
        ALLOWED_ATTR: [],
      });
      setRenderedMarkdown(sanitizedHtml);
    }
  }, [data.aiStatus, data.aiAnalysis, streamingContent, isStreaming]);

  const radarData = Object.entries(data.scores.beliefScores).map(([subject, value]) => ({
    subject,
    A: value,
    fullMark: 5,
  }));

  // 将维度分数转换为分数制（乘以10），用于条形图显示
  const barData = Object.entries(data.scores.beliefScores).map(([name, value]) => ({
    name,
    value: Math.round(Number(value) * 10), // 转换为分数
    percent: Math.round(Number(value) * 20), // 内耗程度百分比 (5分制 -> 100%)
  }));

  // 内耗主题配色
  const COLORS = ['#f97316', '#fb923c', '#ec4899', '#f43f5e', '#a855f7', '#6366f1'];

  const Section = ({ title, icon, children, index }: { title: string, icon: React.ReactNode, children?: React.ReactNode, index: number }) => (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-6 transition-all">
      <button
        onClick={() => setOpenSection(openSection === index ? null : index)}
        className="w-full px-8 py-6 flex items-center justify-between group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-50 to-rose-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 duration-300">
            {icon}
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
        </div>
        <svg className={`w-6 h-6 text-slate-300 transition-transform duration-300 ${openSection === index ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`transition-all duration-500 ${openSection === index ? 'max-h-[15000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="px-8 pb-8 pt-2">
          {children}
        </div>
      </div>
    </div>
  );

  const handleShare = () => {
    setShowShareModal(true);
  };

  // 获取当前等级信息
  const getLevelInfo = () => {
    const score = data.scores.overallIndex * 10; // 转换为百分制
    const levelInfo = RESULT_LEVELS.find(l => score >= l.min && score <= l.max);
    return levelInfo || RESULT_LEVELS[1];
  };

  const levelInfo = getLevelInfo();

  // 获取最高内耗维度
  const getTopDimension = () => {
    const scores = data.scores.beliefScores;
    let maxKey = '';
    let maxVal = 0;
    Object.entries(scores).forEach(([key, val]) => {
      if (val > maxVal) {
        maxVal = val;
        maxKey = key;
      }
    });
    return maxKey || data.scores.coreBarrier;
  };

  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!assessmentId) {
      alert('报告尚未生成完成');
      return;
    }
    setDownloadingPDF(true);
    try {
      const response = await fetch(`/api/assessments/pdf?id=${assessmentId}`);
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
        pdf.save(`内耗指数报告-${assessmentId.slice(0, 8)}.pdf`);

        // Cleanup
        document.body.removeChild(container);
      } else {
        alert('报告下载失败');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('报告下载失败');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const showContent = data.aiStatus === 'completed' || (isStreaming && streamingContent);
  const showLoading = data.aiStatus === 'generating' && !streamingContent && !isStreaming;

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      {/* 顶部指标 */}
      <section className="bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-orange-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
            <div>
              <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4 backdrop-blur-sm">
                🧠 内耗指数深度分析报告
              </span>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2">你的能量都去哪儿了？</h2>
              <p className="text-white/70 text-sm font-medium">报告编号: {assessmentId?.slice(0, 8) || '生成中...'}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest">内耗指数</span>
              <p className="text-6xl font-black tabular-nums">{Math.round(data.scores.overallIndex * 10)}<span className="text-2xl opacity-50 ml-1">分</span></p>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
              <div className="mb-5">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">内耗等级</span>
                <p className="text-2xl font-black mt-1 flex items-center gap-2">
                  <span className="text-3xl">{levelInfo.emoji}</span>
                  {levelInfo.level}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">最大能量黑洞</span>
                <p className="text-xl font-black mt-1">{data.scores.coreBarrier}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {levelInfo.tags.map((tag, i) => (
                <span key={i} className="px-3 py-1.5 bg-white/10 backdrop-blur rounded-full text-xs font-bold">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 维度分析 */}
      <div className="space-y-4">
        <Section index={0} title="内耗雷达图：四维能量分布" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="h-[320px] bg-gradient-to-br from-orange-50/50 to-rose-50/50 rounded-3xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#fed7aa" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 700, fill: '#9a3412' }} axisLine={false} />
                  <Radar name="内耗程度" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.5} isAnimationActive={false} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[320px] bg-gradient-to-br from-orange-50/50 to-rose-50/50 rounded-3xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 80 }}>
                  <XAxis type="number" domain={[0, 50]} hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fontWeight: 700, fill: '#9a3412' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value: number, name: string, props: any) => [`${value}分 (${props.payload.percent}%)`, '内耗程度']} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24} isAnimationActive={false}>
                    {barData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    <LabelList dataKey="value" position="right" content={(props: any) => {
                      const { x, y, width, value, index } = props;
                      const percent = barData[index]?.percent || 0;
                      return (
                        <text x={x + width + 8} y={y + 12} fill="#9a3412" fontSize={11} fontWeight={700}>
                          {value}分 ({percent}%)
                        </text>
                      );
                    }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>

        {/* AI 深度分析区 */}
        <section className="bg-gradient-to-br from-white via-orange-50/30 to-rose-50/30 rounded-[3rem] p-10 md:p-16 border border-orange-100 shadow-2xl shadow-orange-100/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </div>

          <h3 className="text-2xl md:text-3xl font-black mb-10 flex items-center gap-4 text-slate-900 tracking-tight">
            🔍 AI 深度分析：找出你的能量黑洞
            {isStreaming && (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                生成中
              </span>
            )}
          </h3>

          {showContent ? (
            <div ref={contentRef} className={`report-markdown ${isStreaming ? 'max-h-[600px] overflow-y-auto' : ''}`}>
              <article
                dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
              />
              {isStreaming && (
                <div className="mt-4 flex items-center gap-2 text-orange-500">
                  <span className="inline-block w-2 h-4 bg-orange-500 animate-pulse"></span>
                  <span className="text-sm font-medium">正在输入...</span>
                </div>
              )}
            </div>
          ) : showLoading ? (
            <div className="text-center py-24 space-y-10">
              <div className="relative w-40 h-40 mx-auto">
                <div className="absolute inset-0 border-[12px] border-orange-100 rounded-full"></div>
                <div className="absolute inset-0 border-[12px] border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-orange-600 tabular-nums">{Math.floor(loadingProgress)}%</span>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">AI 正在分析你的内耗模式...</h4>
                <p className="text-slate-400 font-medium max-w-md mx-auto">正在生成约 3000 字的个性化深度分析报告，预计需要 30-60 秒</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 space-y-8">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-100 to-rose-100 rounded-3xl flex items-center justify-center">
                <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="space-y-3">
                <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">基础报告已生成</h4>
                <p className="text-slate-400 font-medium max-w-md mx-auto">
                  点击下方按钮，AI 将为你生成约 3000 字的个性化深度分析报告
                </p>
              </div>
              <button
                onClick={onRefreshAI}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-200 hover:shadow-2xl hover:shadow-orange-300 transition-all active:scale-[0.98]"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                开始 AI 深度分析
              </button>
              <p className="text-xs text-slate-300 font-medium">预计需要 30-60 秒</p>
            </div>
          )}

          {/* Progress bar for streaming */}
          {isStreaming && (
            <div className="mt-8">
              <div className="flex justify-between text-sm text-slate-500 mb-2">
                <span>生成进度</span>
                <span>{Math.floor(loadingProgress)}% · 约 {streamingContent?.length || 0} 字</span>
              </div>
              <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </section>

        {/* 能量恢复路径 */}
        <Section index={1} title="能量恢复：21天行动计划" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}>
          <div className="space-y-12">
            <div>
              <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-gradient-to-b from-orange-500 to-rose-500 rounded-full"></span>
                立即行动：今天就能做的 3 件事
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {data.immediateActions.map((action, i) => (
                  <div key={i} className="p-6 bg-gradient-to-br from-orange-50 to-rose-50 rounded-[1.5rem] border border-orange-100">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-500 text-white rounded-xl flex items-center justify-center font-black mb-4 shadow-lg shadow-orange-200">{i + 1}</div>
                    <p className="text-slate-700 font-bold leading-relaxed">{action.replace(/[#*]/g, '')}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-gradient-to-b from-orange-500 to-rose-500 rounded-full"></span>
                21天能量恢复计划
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(data.plan21Days).map(([week, tasks], idx) => (
                  <div key={week} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-4">
                      {week === 'week1' ? '第 1 周：觉察内耗' : week === 'week2' ? '第 2 周：打断循环' : '第 3 周：建立新模式'}
                    </div>
                    <ul className="space-y-3">
                      {(tasks as string[]).map((task, i) => (
                        <li key={i} className="flex gap-3 text-sm font-medium text-slate-600 leading-relaxed">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600">{i + 1}</span>
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* 底部操作区 */}
      <div className="pt-16 border-t border-slate-100 flex flex-col items-center gap-10 print:hidden">
        <div className="flex flex-col md:flex-row gap-4 w-full max-w-xl">
          <button onClick={handleDownloadPDF} disabled={downloadingPDF} className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all disabled:opacity-50">
            {downloadingPDF ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                生成中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                下载报告
              </>
            )}
          </button>
          <button onClick={handleShare} className="flex-1 bg-gradient-to-r from-orange-500 to-rose-500 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-orange-200 hover:shadow-2xl hover:shadow-orange-300 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
            分享给朋友
          </button>
        </div>

        {/* 反馈按钮 */}
        <button
          onClick={() => setShowFeedbackModal(true)}
          className="flex items-center gap-2 text-slate-400 hover:text-orange-600 transition-colors text-sm font-bold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          报告准确吗？给我们反馈
        </button>

        <button onClick={onMeToo} className="flex flex-col items-center gap-4 group">
          <span className="text-slate-400 text-xs font-black tracking-widest uppercase">再测一次</span>
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 shadow-xl shadow-orange-200 flex items-center justify-center text-white text-2xl font-black group-hover:scale-110 transition-transform">+</div>
        </button>
      </div>

      {/* 分享弹窗 */}
      <ShareModal
        show={showShareModal}
        onClose={() => setShowShareModal(false)}
        reportData={{
          totalScore: Math.round(data.scores.overallIndex * 10),
          level: levelInfo.level,
          levelEmoji: levelInfo.emoji,
          topDimension: getTopDimension(),
          assessmentId,
          dimensionScores: data.scores.beliefScores,
        }}
      />

      {/* 反馈弹窗 */}
      <FeedbackModal
        show={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        assessmentId={assessmentId}
      />
    </div>
  );
};

export default Report;
