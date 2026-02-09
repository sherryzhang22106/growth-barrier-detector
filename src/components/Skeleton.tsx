import React from 'react';

/**
 * 骨架屏组件 - 用于内容加载时的占位显示
 */

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

// 基础骨架元素
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', animate = true }) => (
  <div
    className={`bg-slate-200 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
  />
);

// 文本行骨架
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
      />
    ))}
  </div>
);

// 问卷加载骨架
export const QuestionnaireSkeleton: React.FC = () => (
  <div className="max-w-2xl mx-auto py-4 px-2 md:py-6 md:px-0">
    {/* 进度条区域 */}
    <div className="mb-6 md:mb-10 flex items-center justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>

    {/* 问题卡片 */}
    <div className="bg-white p-5 md:p-12 rounded-2xl md:rounded-[2.5rem] shadow-xl border border-slate-50">
      <Skeleton className="h-8 w-3/4 mb-8" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 md:h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>

    {/* 按钮区域 */}
    <div className="mt-8 flex justify-between">
      <Skeleton className="h-12 w-24 rounded-xl" />
      <Skeleton className="h-12 w-32 rounded-xl" />
    </div>
  </div>
);

// 报告加载骨架
export const ReportSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto py-8 px-4">
    {/* 头部 */}
    <div className="text-center mb-12">
      <Skeleton className="h-10 w-48 mx-auto mb-4" />
      <Skeleton className="h-6 w-64 mx-auto" />
    </div>

    {/* 分数卡片 */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white p-6 rounded-2xl shadow-lg">
          <Skeleton className="h-4 w-16 mb-3" />
          <Skeleton className="h-10 w-20" />
        </div>
      ))}
    </div>

    {/* AI 分析区域 */}
    <div className="bg-white p-8 rounded-3xl shadow-xl">
      <Skeleton className="h-6 w-32 mb-6" />
      <SkeletonText lines={5} className="mb-6" />
      <SkeletonText lines={4} className="mb-6" />
      <SkeletonText lines={3} />
    </div>
  </div>
);

// AI 生成中的加载状态
export const AIGeneratingLoader: React.FC<{
  progress?: number;
  estimatedTime?: number;
}> = ({ progress, estimatedTime = 45 }) => {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingTime = Math.max(0, estimatedTime - elapsed);
  const displayProgress = progress ?? Math.min(95, (elapsed / estimatedTime) * 100);

  return (
    <div className="flex flex-col items-center justify-center py-16 md:py-32">
      {/* 动画圆环 */}
      <div className="relative w-28 h-28 md:w-36 md:h-36 mb-8">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* 背景圆 */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="8"
          />
          {/* 进度圆 */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${displayProgress * 2.83} 283`}
            className="transition-all duration-500"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
        {/* 中心图标 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-3xl md:text-4xl animate-bounce">🧠</div>
        </div>
      </div>

      {/* 标题 */}
      <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mb-3">
        基础报告生成中...
      </h3>

      {/* 进度信息 */}
      <div className="flex items-center gap-2 text-slate-500 mb-6">
        <span className="text-sm font-bold">{Math.round(displayProgress)}%</span>
        <span className="text-xs">|</span>
        <span className="text-sm">
          预计还需 <span className="font-bold text-orange-600">{remainingTime}</span> 秒
        </span>
      </div>

      {/* 状态提示 */}
      <div className="max-w-sm text-center">
        <p className="text-slate-400 text-sm leading-relaxed">
          {elapsed < 10 && '正在解析您的测评数据...'}
          {elapsed >= 10 && elapsed < 25 && '正在计算内耗指数与维度分布...'}
          {elapsed >= 25 && elapsed < 40 && '正在生成基础分析报告...'}
          {elapsed >= 40 && '即将完成，请稍候...'}
        </p>
      </div>
    </div>
  );
};

// 网络错误提示
export const NetworkError: React.FC<{
  onRetry?: () => void;
  message?: string;
}> = ({ onRetry, message = '网络连接失败' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-6xl mb-6">📡</div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">{message}</h3>
    <p className="text-slate-500 text-sm mb-6">请检查网络连接后重试</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
      >
        重新加载
      </button>
    )}
  </div>
);

// 离线提示横幅
export const OfflineBanner: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white py-2 px-4 text-center text-sm font-bold animate-in slide-in-from-top">
      <span className="mr-2">⚠️</span>
      网络连接已断开，部分功能可能不可用
    </div>
  );
};

export default {
  Skeleton,
  SkeletonText,
  QuestionnaireSkeleton,
  ReportSkeleton,
  AIGeneratingLoader,
  NetworkError,
  OfflineBanner,
};
