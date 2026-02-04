
import React, { useEffect, useState, useRef } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ReportData } from '../types';
import { parse } from 'marked';
import DOMPurify from 'dompurify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

  const barData = Object.entries(data.scores.patternScores).map(([name, value]) => ({
    name,
    value: Number((value as number).toFixed(2)),
  }));

  const COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#d97706', '#059669'];

  const Section = ({ title, icon, children, index }: { title: string, icon: React.ReactNode, children?: React.ReactNode, index: number }) => (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-6 transition-all">
      <button
        onClick={() => setOpenSection(openSection === index ? null : index)}
        className="w-full px-8 py-6 flex items-center justify-between group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 duration-300">
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
    if (!assessmentId) {
      alert('报告尚未生成完成');
      return;
    }
    const reportUrl = `${window.location.origin}/report/${assessmentId}`;
    navigator.clipboard.writeText(reportUrl);
    alert('报告链接已复制，快去分享给朋友吧！');
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
        pdf.save(`成长阻碍报告-${assessmentId.slice(0, 8)}.pdf`);

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
      <section className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 backdrop-blur-sm">
                成长观察员深度报告 • 绝密
              </span>
              <h2 className="text-4xl font-black tracking-tight mb-2">成长阻碍深度探测报告</h2>
              <p className="text-white/60 text-sm font-medium">探测编码: {assessmentId || '正在建立'}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest">阻碍指数 (O.I)</span>
              <p className="text-6xl font-black tabular-nums">{data.scores.overallIndex}<span className="text-xl opacity-30 ml-1">/10</span></p>
            </div>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="bg-black/10 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-inner">
              <div className="mb-6">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">状态评估</span>
                <p className="text-2xl font-black text-yellow-300 mt-1">{data.scores.level}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">核心心智卡点</span>
                <p className="text-2xl font-black mt-1">{data.scores.coreBarrier}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 维度分析 */}
      <div className="space-y-4">
        <Section index={0} title="心智图谱：内心声量的量化" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="h-[320px] bg-slate-50/50 rounded-3xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} />
                  <Radar name="得分" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} isAnimationActive={false} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[320px] bg-slate-50/50 rounded-3xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" domain={[0, 5]} hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={16} isAnimationActive={false}>
                    {barData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>

        {/* AI 深度分析区 */}
        <section className="bg-gradient-to-br from-white via-indigo-50/20 to-slate-50 rounded-[3rem] p-10 md:p-16 border border-indigo-100 shadow-2xl shadow-indigo-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16H9.01705C7.91248 16 7.01705 16.8954 7.01705 18V21H4.01705V18C4.01705 15.2386 6.25562 13 9.01705 13H12.017C14.7785 13 17.017 15.2386 17.017 18V21H14.017ZM12.017 11C14.2262 11 16.0171 9.20914 16.0171 7C16.0171 4.79086 14.2262 3 12.0171 3C9.80791 3 8.01705 4.79086 8.01705 7C8.01705 9.20914 9.80791 11 12.017 11Z" /></svg>
          </div>

          <h3 className="text-3xl font-black mb-12 flex items-center gap-4 text-slate-900 tracking-tight">
            成长观察员：生命脚本洞察
            {isStreaming && (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                实时生成中
              </span>
            )}
          </h3>

          {showContent ? (
            <div ref={contentRef} className={`report-markdown ${isStreaming ? 'max-h-[600px] overflow-y-auto' : ''}`}>
              <article
                dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
              />
              {isStreaming && (
                <div className="mt-4 flex items-center gap-2 text-indigo-500">
                  <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse"></span>
                  <span className="text-sm font-medium">正在输入...</span>
                </div>
              )}
            </div>
          ) : showLoading ? (
            <div className="text-center py-32 space-y-12">
              <div className="relative w-48 h-48 mx-auto">
                <div className="absolute inset-0 border-[16px] border-indigo-100/50 rounded-full"></div>
                <div className="absolute inset-0 border-[16px] border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-indigo-600 tabular-nums">{Math.floor(loadingProgress)}%</span>
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-2">Writing Deep Analysis</span>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-2xl font-black text-slate-800 tracking-tight">正在撰写约 6000 字的生命脚本分析...</h4>
                <p className="text-slate-400 font-medium max-w-md mx-auto">成长观察员正在穿透表象，解析潜意识深处那些习以为常的行为惯性。这个过程通常需要 1-2 分钟。</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-400">等待 AI 分析...</p>
            </div>
          )}

          {/* Progress bar for streaming */}
          {isStreaming && (
            <div className="mt-8">
              <div className="flex justify-between text-sm text-slate-500 mb-2">
                <span>生成进度</span>
                <span>{Math.floor(loadingProgress)}% · 约 {streamingContent?.length || 0} 字</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </section>

        {/* 成长路径 */}
        <Section index={1} title="成长路径：重塑与破局" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}>
          <div className="space-y-12">
            <div>
              <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                立即开启：24小时行动建议
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {data.immediateActions.map((action, i) => (
                  <div key={i} className="p-8 bg-indigo-50/40 rounded-[2rem] border border-indigo-100">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black mb-6 shadow-lg shadow-indigo-100">{i + 1}</div>
                    <p className="text-slate-800 font-bold leading-relaxed">{action.replace(/[#*]/g, '')}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-purple-600 rounded-full"></span>
                重塑生命：21天行动图谱
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(data.plan21Days).map(([week, tasks], idx) => (
                  <div key={week} className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                    <div className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-4">
                      {week === 'week1' ? '第 1 阶段：意识觉醒' : week === 'week2' ? '第 2 阶段：行为替换' : '第 3 阶段：巩固内化'}
                    </div>
                    <ul className="space-y-4">
                      {(tasks as string[]).map((task, i) => (
                        <li key={i} className="flex gap-3 text-sm font-medium text-slate-600 leading-relaxed">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">{i + 1}</span>
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
      <div className="pt-16 border-t border-slate-100 flex flex-col items-center gap-12 print:hidden">
        <div className="flex flex-col md:flex-row gap-4 w-full max-w-xl">
          <button onClick={handleDownloadPDF} disabled={downloadingPDF} className="flex-1 bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-lg flex items-center justify-center gap-3 shadow-2xl hover:bg-black transition-all disabled:opacity-50">
            {downloadingPDF ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                生成中...
              </>
            ) : '下载报告'}
          </button>
          <button onClick={handleShare} className="flex-1 bg-white text-indigo-600 py-6 rounded-[2.5rem] font-black text-lg flex items-center justify-center gap-3 border border-slate-100 shadow-xl hover:bg-indigo-50 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
            分享报告
          </button>
        </div>
        <button onClick={onMeToo} className="flex flex-col items-center gap-4 group">
          <span className="text-slate-400 text-xs font-black tracking-widest uppercase">开启下一轮探测</span>
          <div className="w-16 h-16 rounded-full bg-indigo-600 shadow-2xl flex items-center justify-center text-white text-3xl font-black group-hover:scale-110 transition-transform">+</div>
        </button>
      </div>
    </div>
  );
};

export default Report;
