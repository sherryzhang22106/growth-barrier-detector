
import React from 'react';

interface Props {
  onStart: () => void;
}

const CoreDimension = ({ icon, title, desc, colorClass }: { icon: React.ReactNode, title: string, desc: string, colorClass: string }) => (
  <div className="group bg-white p-6 rounded-2xl border border-stone-100 hover:border-orange-100 hover:shadow-[0_20px_50px_rgba(251,146,60,0.1)] transition-all duration-500">
    <div className={`w-14 h-14 ${colorClass} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`}>
      {icon}
    </div>
    <h4 className="text-base font-bold text-stone-800 mb-2 group-hover:text-orange-600 transition-colors">{title}</h4>
    <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
  </div>
);

const LevelCard = ({ emoji, level, range, percent, color, isLast }: { emoji: string, level: string, range: string, percent: string, color: string, isLast?: boolean }) => (
  <div className="relative">
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${color} border`}>
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1">
        <div className="font-bold text-stone-800 text-sm">{level}</div>
        <div className="text-xs text-stone-500">{range}分</div>
      </div>
      <div className="text-xs font-medium text-stone-600 bg-white/60 px-2 py-1 rounded-full">{percent}</div>
    </div>
    {!isLast && (
      <div className="flex justify-center py-1">
        <svg className="w-5 h-5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    )}
  </div>
);

// 半耗电池 SVG 组件
const BatteryIcon = () => (
  <svg width="120" height="180" viewBox="0 0 120 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 电池头部 */}
    <rect x="35" y="5" width="50" height="12" rx="4" fill="#d4d4d4"/>
    {/* 电池主体外框 */}
    <rect x="15" y="17" width="90" height="155" rx="12" fill="#e7e5e4" stroke="#d6d3d1" strokeWidth="2"/>
    {/* 电池内部背景 */}
    <rect x="22" y="24" width="76" height="141" rx="8" fill="#fafaf9"/>
    {/* 电量 - 只有下半部分有电（约45%） */}
    <rect x="22" y="90" width="76" height="75" rx="8" fill="url(#batteryGradient)"/>
    {/* 闪电图标 */}
    <path d="M65 60 L50 95 L58 95 L55 125 L75 85 L65 85 L70 60 Z" fill="#78716c" opacity="0.3"/>
    <defs>
      <linearGradient id="batteryGradient" x1="60" y1="90" x2="60" y2="165" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fb923c"/>
        <stop offset="1" stopColor="#f97316"/>
      </linearGradient>
    </defs>
  </svg>
);

const Landing: React.FC<Props> = ({ onStart }) => {
  return (
    <div className="space-y-20 pb-20 animate-in fade-in duration-700">
      {/* 1. 英雄区 */}
      <section className="relative pt-12 text-center space-y-8 animate-in slide-in-from-top-10 duration-1000">
        <div className="inline-block px-6 py-2.5 bg-orange-50 text-orange-600 rounded-full text-base font-bold mb-6">
          你的能量去哪儿了？
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-stone-900 leading-[1.2] tracking-tight max-w-4xl mx-auto">
          <span className="text-stone-900">内耗指数</span>
          <span className="bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">测评系统</span>
        </h1>
        <p className="text-lg text-stone-500 max-w-xl mx-auto font-medium leading-relaxed">
          明明什么都没做，却感觉身心俱疲？
          <br />
          35道题，找出你的能量黑洞，拿回属于你的精力。
        </p>
        <div className="pt-6">
          <button
            onClick={onStart}
            className="px-10 py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-full font-bold text-lg shadow-xl shadow-orange-200 hover:shadow-2xl hover:shadow-orange-300 hover:scale-105 active:scale-95 transition-all"
          >
            开始测评
          </button>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[600px] h-[600px] bg-gradient-to-b from-orange-50/50 to-transparent rounded-full blur-3xl opacity-60"></div>
      </section>

      {/* 2. 内耗等级展示 */}
      <section className="max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-black text-stone-900 mb-2">内耗等级分布</h3>
          <p className="text-stone-500 text-sm">测完看看你在哪个区间</p>
        </div>
        <div className="space-y-0">
          <LevelCard emoji="🌟" level="能量自由型" range="0-25" percent="约12%" color="bg-emerald-50 border-emerald-100" />
          <LevelCard emoji="🌤️" level="轻度内耗型" range="26-50" percent="约38%" color="bg-amber-50 border-amber-100" />
          <LevelCard emoji="⛅" level="中度内耗型" range="51-75" percent="约35%" color="bg-orange-50 border-orange-100" />
          <LevelCard emoji="🌧️" level="重度内耗型" range="76-100" percent="约15%" color="bg-rose-50 border-rose-100" isLast />
        </div>
      </section>

      {/* 3. 内耗模型 - 电池图 */}
      <section className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="relative flex justify-center">
          <div className="bg-gradient-to-br from-stone-50 to-orange-50/30 rounded-3xl p-8 border border-stone-100">
            <BatteryIcon />
            <div className="mt-4 space-y-2 text-center">
              <div className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold">
                当前电量：45%
              </div>
              <p className="text-xs text-stone-400">能量正在悄悄流失...</p>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <h2 className="text-3xl font-black text-stone-900 leading-tight">什么是精神内耗？</h2>
          <p className="text-stone-500 leading-relaxed">
            内耗就像手机后台开了<span className="text-orange-600 font-bold">37个app</span>——你看不见它们在运行，但电量就是在悄悄流失。
          </p>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center text-sm">🧠</div>
              <p className="text-sm text-stone-600"><span className="font-bold text-stone-800">思维内耗：</span>反复纠结、睡前复盘、选择困难</p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-sm">💔</div>
              <p className="text-sm text-stone-600"><span className="font-bold text-stone-800">情绪内耗：</span>情绪过山车、快乐阈值降低</p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm">🎯</div>
              <p className="text-sm text-stone-600"><span className="font-bold text-stone-800">行动内耗：</span>拖延、执行力下降、想做做不动</p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-sm">👥</div>
              <p className="text-sm text-stone-600"><span className="font-bold text-stone-800">关系内耗：</span>社交疲惫、讨好、患得患失</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 四大维度 */}
      <section className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12 space-y-3">
          <h3 className="text-3xl font-black text-stone-900">四维内耗诊断</h3>
          <p className="text-stone-400 font-medium text-sm">找出你的能量泄漏点</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CoreDimension
            colorClass="bg-rose-100 text-rose-600"
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
            title="思维内耗"
            desc="想太多、选择困难、脑内剧场"
          />
          <CoreDimension
            colorClass="bg-orange-100 text-orange-600"
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
            title="情绪内耗"
            desc="容易emo、快乐阈值低"
          />
          <CoreDimension
            colorClass="bg-amber-100 text-amber-600"
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            title="行动内耗"
            desc="拖延、收藏夹吃灰"
          />
          <CoreDimension
            colorClass="bg-violet-100 text-violet-600"
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            title="关系内耗"
            desc="社交疲惫、患得患失"
          />
        </div>
      </section>

      {/* 5. 症状检测 */}
      <section className="bg-gradient-to-br from-stone-800 to-stone-900 text-white py-16 rounded-3xl mx-4 overflow-hidden relative">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-8 relative z-10">
          <h3 className="text-2xl font-black">你是不是也这样？</h3>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <span className="px-5 py-2.5 bg-white/10 rounded-full border border-white/20 hover:bg-white/20 transition-colors">发消息后反复确认有没有说错话</span>
            <span className="px-5 py-2.5 bg-white/10 rounded-full border border-white/20 hover:bg-white/20 transition-colors">睡前脑子停不下来</span>
            <span className="px-5 py-2.5 bg-white/10 rounded-full border border-white/20 hover:bg-white/20 transition-colors">社交后需要躺三天恢复</span>
            <span className="px-5 py-2.5 bg-white/10 rounded-full border border-white/20 hover:bg-white/20 transition-colors">收藏夹里800个"以后看"</span>
            <span className="px-5 py-2.5 bg-white/10 rounded-full border border-white/20 hover:bg-white/20 transition-colors">一边摆烂一边自责</span>
            <span className="px-5 py-2.5 bg-white/10 rounded-full border border-white/20 hover:bg-white/20 transition-colors">明明很累但什么都没做</span>
          </div>
          <p className="text-white/40 text-xs font-medium tracking-widest">这些都是内耗的信号</p>
        </div>
      </section>

      {/* 6. 底部 CTA */}
      <div className="text-center space-y-4">
        <button
          onClick={onStart}
          className="px-12 py-5 bg-gradient-to-r from-stone-800 to-stone-900 text-white rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl"
        >
          测测我的内耗指数
        </button>
        <p className="text-stone-400 text-sm">
          内耗指数测评 · 找回你的能量
        </p>
      </div>
    </div>
  );
};

export default Landing;
