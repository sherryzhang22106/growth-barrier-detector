
import React, { useState, useEffect, useCallback } from 'react';
import { AssessmentResponse, Question } from '../types';
import { QUESTIONS } from '../constants';
import { AIGeneratingLoader } from './Skeleton';
import { useBeforeUnload, useIsMobile } from '../hooks/useUtils';

interface Props {
  responses: AssessmentResponse;
  setResponses: React.Dispatch<React.SetStateAction<AssessmentResponse>>;
  onSubmit: () => void;
  loading: boolean;
}

// 退出确认弹窗
const ExitConfirmModal: React.FC<{
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  progress: number;
}> = ({ show, onConfirm, onCancel, progress }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-black text-slate-900 mb-2">确定要离开吗？</h3>
          <p className="text-slate-500 text-sm mb-6">
            您已完成 <span className="font-bold text-orange-600">{progress}%</span> 的测评，
            进度已自动保存，下次可继续。
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              继续答题
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
            >
              暂时离开
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Questionnaire: React.FC<Props> = ({ responses, setResponses, onSubmit, loading }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const isMobile = useIsMobile();

  // 计算进度
  const progress = Math.round((Object.keys(responses).length / QUESTIONS.length) * 100);

  // 页面离开提醒
  useBeforeUnload(
    Object.keys(responses).length > 0 && Object.keys(responses).length < QUESTIONS.length,
    '您有未完成的测评，确定要离开吗？'
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // 如果是滑动题且没有初始值，默认设为 5
    const q = QUESTIONS[currentIndex];
    if (q.type === 'SCALE' && responses[q.id] === undefined) {
      setResponses(prev => ({ ...prev, [q.id]: 5 }));
    }
  }, [currentIndex]);

  // 恢复到上次答题位置 - 找到第一道未答的题目
  useEffect(() => {
    if (Object.keys(responses).length > 0 && currentIndex === 0) {
      // 找到第一道未答的题目
      const firstUnansweredIndex = QUESTIONS.findIndex(q => responses[q.id] === undefined);
      if (firstUnansweredIndex > 0) {
        // 跳转到第一道未答的题目
        setCurrentIndex(firstUnansweredIndex);
      } else if (firstUnansweredIndex === -1) {
        // 所有题目都答完了，跳转到最后一题
        setCurrentIndex(QUESTIONS.length - 1);
      }
    }
  }, []);

  const currentQuestion = QUESTIONS[currentIndex];

  // 检查当前题目是否已完成 - 必须在 handleNext 之前定义
  const isCurrentComplete = useCallback(() => {
    const val = responses[currentQuestion.id];
    // SCALE 题在 useEffect 中已处理初始值，这里只需判断非空
    return val !== undefined && val !== '';
  }, [responses, currentQuestion.id]);

  // 防止快速点击导致的重复跳转
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleResponse = useCallback((qId: number, val: any) => {
    setResponses(prev => ({ ...prev, [qId]: val }));
    // 选择题选中后直接跳转到下一题
    if (currentQuestion.type === 'CHOICE' && currentIndex < QUESTIONS.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setDirection('next');
        setCurrentIndex(prev => prev + 1);
        setIsTransitioning(false);
      }, 350);
    }
  }, [currentQuestion.type, currentIndex, isTransitioning]);

  const handleNext = useCallback(() => {
    // 防止快速点击
    if (isTransitioning) return;
    // 必须完成当前题目才能进入下一题
    if (!isCurrentComplete()) return;

    if (currentIndex < QUESTIONS.length - 1) {
      setIsTransitioning(true);
      setDirection('next');
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => setIsTransitioning(false), 300);
    } else {
      // 最后一题，检查是否所有题目都已完成
      const allCompleted = QUESTIONS.every(q => responses[q.id] !== undefined && responses[q.id] !== '');
      if (allCompleted) {
        onSubmit();
      } else {
        // 找到第一道未完成的题目并跳转
        const firstIncomplete = QUESTIONS.findIndex(q => responses[q.id] === undefined || responses[q.id] === '');
        if (firstIncomplete >= 0) {
          setDirection('prev');
          setCurrentIndex(firstIncomplete);
        }
      }
    }
  }, [currentIndex, onSubmit, responses, isCurrentComplete, isTransitioning]);

  const handlePrev = useCallback(() => {
    if (isTransitioning) return;
    if (currentIndex > 0) {
      setIsTransitioning(true);
      setDirection('prev');
      setCurrentIndex(prev => prev - 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentIndex, isTransitioning]);

  // 跳转到指定题目 - 只能跳转到已答过的题目
  const handleJumpTo = useCallback((index: number) => {
    if (isTransitioning) return;
    if (index >= 0 && index < QUESTIONS.length) {
      // 只能跳转到已答过的题目（不能跳到未答的题目）
      const targetQuestion = QUESTIONS[index];
      const isTargetAnswered = responses[targetQuestion.id] !== undefined;
      const isCurrentQuestion = index === currentIndex;

      // 可以跳转的条件：目标题目已答过，或者是当前题目
      if (isTargetAnswered || isCurrentQuestion) {
        setIsTransitioning(true);
        setDirection(index > currentIndex ? 'next' : 'prev');
        setCurrentIndex(index);
        setTimeout(() => setIsTransitioning(false), 300);
      }
    }
  }, [currentIndex, responses, isTransitioning]);

  // 触摸滑动支持
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    // 滑动距离超过 50px 才触发
    if (Math.abs(diff) > 50) {
      if (diff > 0 && isCurrentComplete()) {
        // 左滑 -> 下一题
        handleNext();
      } else if (diff < 0 && currentIndex > 0) {
        // 右滑 -> 上一题
        handlePrev();
      }
    }

    setTouchStart(null);
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果在输入框中，不处理快捷键
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'ArrowRight':
          if (isCurrentComplete()) handleNext();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          if (currentQuestion.type === 'CHOICE' && currentQuestion.options) {
            const optionIndex = parseInt(e.key) - 1;
            if (optionIndex < currentQuestion.options.length) {
              handleResponse(currentQuestion.id, optionIndex);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, handlePrev, handleNext, handleResponse, currentQuestion]);

  if (loading) {
    return <AIGeneratingLoader estimatedTime={45} />;
  }

  const feedbacks: Record<number, string> = {
    6: "💡 对金钱的态度，往往反映了我们对自我价值的认知",
    15: "💡 亲密关系通常是我们最深层信念的投射",
    30: "💡 拖延往往不是时间管理问题，而是情绪调节问题",
    42: "💡 决策内耗是成长能量最大的漏斗"
  };

  // 获取当前模块信息
  const getModuleInfo = () => {
    if (currentIndex < 10) return { name: '思维内耗', color: 'text-purple-600', bg: 'bg-purple-50' };
    if (currentIndex < 20) return { name: '情绪内耗', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (currentIndex < 28) return { name: '行动内耗', color: 'text-green-600', bg: 'bg-green-50' };
    if (currentIndex < 35) return { name: '关系内耗', color: 'text-pink-600', bg: 'bg-pink-50' };
    return { name: '深度探索', color: 'text-orange-600', bg: 'bg-orange-50' };
  };

  const moduleInfo = getModuleInfo();

  return (
    <div
      className="max-w-2xl mx-auto min-h-[60vh] flex flex-col justify-center py-4 px-2 md:py-6 md:px-0"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 进度指示器 */}
      <div className="mb-6 md:mb-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${moduleInfo.color}`}>
                {moduleInfo.name}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-bold text-slate-400">
                第 {currentIndex + 1} / {QUESTIONS.length} 题
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl md:text-2xl font-black text-slate-200 tabular-nums italic">
              {progress}%
            </span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-rose-500 transition-all duration-500 rounded-full"
            style={{ width: `${((currentIndex + 1) / QUESTIONS.length) * 100}%` }}
          />
          {/* 模块分隔点 */}
          <div className="absolute inset-0 flex">
            {[10, 20, 28, 35].map((point) => (
              <div
                key={point}
                className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"
                style={{ left: `${(point / QUESTIONS.length) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* 快捷跳转（仅桌面端显示）- 只能跳转到已答过的题目 */}
        {!isMobile && (
          <div className="mt-3 flex gap-1 flex-wrap">
            {QUESTIONS.map((q, idx) => {
              const isAnswered = responses[q.id] !== undefined;
              const isCurrent = idx === currentIndex;
              // 只有已答过的题目或当前题目可以点击
              const canClick = isAnswered || idx === currentIndex;
              return (
                <button
                  key={idx}
                  onClick={() => canClick && handleJumpTo(idx)}
                  disabled={!canClick}
                  className={`w-6 h-6 text-[10px] font-bold rounded transition-all ${
                    isCurrent
                      ? 'bg-orange-600 text-white'
                      : isAnswered
                      ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                  title={canClick ? `跳转到第 ${idx + 1} 题` : `请先完成前面的题目`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 问题卡片 */}
      <div
        key={currentQuestion.id}
        className={`bg-white p-5 md:p-12 rounded-2xl md:rounded-[2.5rem] shadow-xl md:shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-${direction === 'next' ? 'right' : 'left'}-8`}
      >
        {/* 模块标签 */}
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold ${moduleInfo.bg} ${moduleInfo.color}`}>
          {moduleInfo.name}
        </div>

        <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-gradient-to-b from-orange-500 to-rose-500 opacity-20"></div>

        <h2 className="text-lg md:text-2xl font-black text-slate-900 leading-tight mb-6 md:mb-10 pr-20">
          {currentQuestion.text}
        </h2>

        <div className="space-y-3 md:space-y-4">
          {currentQuestion.type === 'SCALE' && (
            <div className="py-6 md:py-10 space-y-6 md:space-y-8">
              <input
                type="range" min="1" max="10" step="1"
                className="w-full h-2 md:h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-orange-600"
                value={responses[currentQuestion.id] ?? 5}
                onChange={(e) => handleResponse(currentQuestion.id, parseInt(e.target.value))}
                aria-label="评分滑块"
              />
              <div className="flex justify-between items-end">
                <div className="text-center"><span className="text-[10px] md:text-xs text-slate-400 font-bold">非常不满意</span></div>
                <div className="bg-gradient-to-br from-orange-500 to-rose-500 text-white w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black shadow-lg shadow-orange-200">
                  {responses[currentQuestion.id] ?? 5}
                </div>
                <div className="text-center"><span className="text-[10px] md:text-xs text-slate-400 font-bold">极度满意</span></div>
              </div>
            </div>
          )}

          {currentQuestion.type === 'CHOICE' && (
            <div className="grid grid-cols-1 gap-2 md:gap-3">
              {currentQuestion.options?.map((opt, idx) => {
                const isSelected = responses[currentQuestion.id] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleResponse(currentQuestion.id, idx)}
                    className={`text-left px-4 py-4 md:px-6 md:py-5 rounded-xl md:rounded-2xl border-2 transition-all flex items-center gap-3 md:gap-4 group ${
                      isSelected
                        ? 'border-orange-500 bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-200'
                        : 'border-slate-100 bg-slate-50/50 text-slate-600 hover:border-orange-200 hover:bg-orange-50/50'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`选项 ${String.fromCharCode(65 + idx)}: ${opt.label}`}
                  >
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl border-2 flex items-center justify-center shrink-0 text-sm md:text-base font-bold transition-all ${
                      isSelected ? 'border-white/30 bg-white/20' : 'border-slate-200 group-hover:border-orange-300'
                    }`}>
                      {isSelected ? '✓' : String.fromCharCode(65 + idx)}
                    </div>
                    <span className="font-bold text-sm md:text-base leading-snug">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'OPEN' && (
            <div className="space-y-4 md:space-y-6">
              <textarea
                autoFocus
                className="w-full h-36 md:h-48 px-4 py-4 md:px-6 md:py-5 rounded-2xl md:rounded-3xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-orange-400 transition-all outline-none resize-none text-slate-800 text-base md:text-lg font-medium placeholder:text-slate-300"
                placeholder={currentQuestion.placeholder || "请坦诚地面对内心的声音..."}
                value={responses[currentQuestion.id] || ''}
                maxLength={500}
                onChange={(e) => handleResponse(currentQuestion.id, e.target.value)}
                aria-label="开放题回答"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">建议输入 20-500 字</span>
                <span className={`text-xs font-bold transition-colors ${
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
          <div className="mt-6 md:mt-8 p-4 md:p-5 bg-gradient-to-r from-orange-50 to-rose-50 rounded-xl md:rounded-2xl border border-orange-100 flex gap-3 md:gap-4 animate-in fade-in zoom-in">
            <span className="text-xl md:text-2xl">✨</span>
            <p className="text-xs md:text-sm text-orange-800 font-medium italic leading-relaxed">{feedbacks[currentQuestion.id]}</p>
          </div>
        )}
      </div>

      {/* 导航按钮 */}
      <div className="mt-8 md:mt-10 flex flex-col items-center gap-4 md:gap-6">
        <div className="w-full flex justify-between items-center px-2 md:px-4">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 md:gap-3 px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl font-bold text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all disabled:opacity-0 disabled:pointer-events-none"
            aria-label="上一题"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm md:text-base">上一题</span>
          </button>

          {(currentQuestion.type !== 'CHOICE' || currentIndex === QUESTIONS.length - 1) && (
            <button
              onClick={handleNext}
              disabled={!isCurrentComplete()}
              className={`flex items-center gap-2 md:gap-3 px-8 py-4 md:px-10 md:py-5 rounded-2xl md:rounded-[1.5rem] font-black text-white transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                currentIndex === QUESTIONS.length - 1
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200 hover:shadow-emerald-300'
                  : 'bg-gradient-to-r from-orange-500 to-rose-500 shadow-orange-200 hover:shadow-orange-300'
              }`}
              aria-label={currentIndex === QUESTIONS.length - 1 ? '生成分析报告' : '下一题'}
            >
              <span className="text-sm md:text-base">
                {currentIndex === QUESTIONS.length - 1 ? '生成分析报告' : '继续'}
              </span>
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center gap-4 text-[10px] text-slate-300 font-bold tracking-wider uppercase">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            进度自动保存
          </span>
          {!isMobile && (
            <>
              <span>•</span>
              <span>← → 切换题目</span>
              <span>•</span>
              <span>1-4 快速选择</span>
            </>
          )}
        </div>
      </div>

      {/* 退出确认弹窗 */}
      <ExitConfirmModal
        show={showExitConfirm}
        onConfirm={() => {
          setShowExitConfirm(false);
          window.history.back();
        }}
        onCancel={() => setShowExitConfirm(false)}
        progress={progress}
      />
    </div>
  );
};

export default Questionnaire;
