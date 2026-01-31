
import React, { useState, useEffect } from 'react';
import { AssessmentResponse, Question } from '../types';
import { QUESTIONS } from '../constants';

interface Props {
  responses: AssessmentResponse;
  setResponses: React.Dispatch<React.SetStateAction<AssessmentResponse>>;
  onSubmit: () => void;
  loading: boolean;
}

const Questionnaire: React.FC<Props> = ({ responses, setResponses, onSubmit, loading }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // 如果是滑动题且没有初始值，默认设为 5
    const q = QUESTIONS[currentIndex];
    if (q.type === 'SCALE' && responses[q.id] === undefined) {
      setResponses(prev => ({ ...prev, [q.id]: 5 }));
    }
  }, [currentIndex]);

  const currentQuestion = QUESTIONS[currentIndex];

  const handleResponse = (qId: number, val: any) => {
    setResponses(prev => ({ ...prev, [qId]: val }));
    if (currentQuestion.type === 'CHOICE') {
      setTimeout(() => handleNext(), 350);
    }
  };

  const handleNext = () => {
    if (currentIndex < QUESTIONS.length - 1) {
      setDirection('next');
      setCurrentIndex(prev => prev + 1);
    } else {
      onSubmit();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection('prev');
      setCurrentIndex(prev => prev - 1);
    }
  };

  const isCurrentComplete = () => {
    const val = responses[currentQuestion.id];
    // SCALE 题在 useEffect 中已处理初始值，这里只需判断非空
    return val !== undefined && val !== '';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-pulse">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-8 border-indigo-100 rounded-full"></div>
          <div className="absolute inset-0 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h3 className="mt-10 text-2xl font-black text-slate-800 tracking-tight">AI 深度分析引擎启动中...</h3>
        <p className="text-slate-500 mt-4 text-center max-w-xs leading-relaxed">
          正在为您扫描潜意识阻碍闭环，构建个性化成长路径图谱。
        </p>
      </div>
    );
  }

  const feedbacks: Record<number, string> = {
    6: "💡 对金钱的态度，往往反映了我们对自我价值的认知",
    15: "💡 亲密关系通常是我们最深层信念的投射",
    30: "💡 拖延往往不是时间管理问题，而是情绪调节问题",
    42: "💡 决策内耗是成长能量最大的漏斗"
  };

  return (
    <div className="max-w-2xl mx-auto min-h-[60vh] flex flex-col justify-center py-4 px-2 md:py-6 md:px-0">
      <div className="mb-6 md:mb-10 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">
            探测题目 {currentIndex + 1} / {QUESTIONS.length}
          </span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
            <span className="text-xs font-bold text-slate-400">
              {currentIndex < 5 ? '基础信息采集' :
               currentIndex < 29 ? '核心信念扫描' :
               currentIndex < 47 ? '行为模式识别' : '关键深度挖掘'}
            </span>
          </div>
        </div>
        <div className="text-right">
           <span className="text-xl md:text-2xl font-black text-slate-200 tabular-nums italic">
             {Math.round(((currentIndex + 1) / QUESTIONS.length) * 100)}%
           </span>
        </div>
      </div>

      <div
        key={currentQuestion.id}
        className={`bg-white p-5 md:p-12 rounded-2xl md:rounded-[2.5rem] shadow-xl md:shadow-2xl shadow-indigo-100 border border-slate-50 relative overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-${direction === 'next' ? 'right' : 'left'}-8`}
      >
        <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-indigo-600/5"></div>
        <h2 className="text-lg md:text-3xl font-black text-slate-900 leading-tight mb-6 md:mb-10">
          {currentQuestion.text}
        </h2>

        <div className="space-y-3 md:space-y-4">
          {currentQuestion.type === 'SCALE' && (
            <div className="py-6 md:py-10 space-y-6 md:space-y-8">
              <input
                type="range" min="1" max="10" step="1"
                className="w-full h-2 md:h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                value={responses[currentQuestion.id] ?? 5}
                onChange={(e) => handleResponse(currentQuestion.id, parseInt(e.target.value))}
              />
              <div className="flex justify-between items-end">
                <div className="text-center"><span className="text-[10px] md:text-xs text-slate-400 font-bold">非常不满意</span></div>
                <div className="bg-indigo-600 text-white w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black shadow-lg shadow-indigo-200">
                  {responses[currentQuestion.id] ?? 5}
                </div>
                <div className="text-center"><span className="text-[10px] md:text-xs text-slate-400 font-bold">极度满意</span></div>
              </div>
            </div>
          )}

          {currentQuestion.type === 'CHOICE' && (
            <div className="grid grid-cols-1 gap-2 md:gap-4">
              {currentQuestion.options?.map((opt, idx) => {
                const isSelected = responses[currentQuestion.id] === idx;
                return (
                  <button key={idx} onClick={() => handleResponse(currentQuestion.id, idx)}
                    className={`text-left px-4 py-4 md:px-8 md:py-6 rounded-xl md:rounded-2xl border-2 transition-all flex items-center gap-3 md:gap-5 group ${
                      isSelected ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl' : 'border-slate-50 bg-slate-50/50 text-slate-600 hover:border-indigo-100'
                    }`}>
                    <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl border-2 flex items-center justify-center shrink-0 text-sm md:text-base ${isSelected ? 'border-white/30 bg-white/20' : 'border-slate-200'}`}>
                      {isSelected ? '✓' : String.fromCharCode(65 + idx)}
                    </div>
                    <span className="font-bold text-sm md:text-lg leading-snug">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'OPEN' && (
            <div className="space-y-4 md:space-y-6">
              <textarea autoFocus className="w-full h-36 md:h-48 px-4 py-4 md:px-8 md:py-6 rounded-2xl md:rounded-3xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-indigo-500 transition-all outline-none resize-none text-slate-800 text-base md:text-lg font-medium"
                placeholder="请坦诚地面对内心的声音..."
                value={responses[currentQuestion.id] || ''}
                maxLength={500}
                onChange={(e) => handleResponse(currentQuestion.id, e.target.value)}
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-300 uppercase">建议输入 20-500 字</span>
                <span className={`text-xs font-black ${
                  (responses[currentQuestion.id]?.length || 0) < 20 ? 'text-slate-300' :
                  (responses[currentQuestion.id]?.length || 0) > 450 ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  {responses[currentQuestion.id]?.length || 0} / 500 字
                </span>
              </div>
            </div>
          )}
        </div>

        {feedbacks[currentQuestion.id] && responses[currentQuestion.id] !== undefined && (
          <div className="mt-6 md:mt-10 p-4 md:p-6 bg-indigo-50/50 rounded-xl md:rounded-[2rem] border border-indigo-100 flex gap-3 md:gap-4 animate-in fade-in zoom-in">
            <span className="text-xl md:text-2xl">✨</span>
            <p className="text-xs md:text-sm text-indigo-800 font-bold italic leading-relaxed">{feedbacks[currentQuestion.id]}</p>
          </div>
        )}
      </div>

      <div className="mt-8 md:mt-12 flex flex-col items-center gap-4 md:gap-6">
        <div className="w-full flex justify-between items-center px-2 md:px-4">
          <button onClick={handlePrev} disabled={currentIndex === 0}
            className="flex items-center gap-2 md:gap-3 px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl font-black text-slate-300 hover:text-indigo-600 transition-all disabled:opacity-0"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            <span className="font-bold text-sm md:text-base">返回</span>
          </button>

          {(currentQuestion.type !== 'CHOICE' || currentIndex === QUESTIONS.length - 1) && (
            <button onClick={handleNext} disabled={!isCurrentComplete()}
              className={`flex items-center gap-2 md:gap-3 px-8 py-4 md:px-12 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-white transition-all shadow-xl md:shadow-2xl ${
                currentIndex === QUESTIONS.length - 1 ? 'bg-emerald-600 shadow-emerald-200' : 'bg-indigo-600 shadow-indigo-200'
              }`}
            >
              <span className="text-sm md:text-lg">{currentIndex === QUESTIONS.length - 1 ? '生成分析报告' : '继续探测'}</span>
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-300 font-black tracking-widest uppercase">进度实时加密保存中</p>
      </div>
    </div>
  );
};

export default Questionnaire;
