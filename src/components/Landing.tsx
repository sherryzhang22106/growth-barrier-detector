
import React from 'react';

interface Props {
  onStart: () => void;
}

const CoreDimension = ({ icon, title, desc, colorClass }: { icon: React.ReactNode, title: string, desc: string, colorClass: string }) => (
  <div className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-indigo-100 hover:shadow-[0_20px_50px_rgba(79,70,229,0.1)] transition-all duration-500">
    <div className={`w-16 h-16 ${colorClass} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`}>
      {icon}
    </div>
    <h4 className="text-lg font-black text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">{title}</h4>
    <p className="text-sm text-slate-500 leading-relaxed font-medium">{desc}</p>
  </div>
);

const Landing: React.FC<Props> = ({ onStart }) => {
  return (
    <div className="space-y-24 pb-20 animate-in fade-in duration-700">
      {/* 1. 英雄区 */}
      <section className="relative pt-12 text-center space-y-8 animate-in slide-in-from-top-10 duration-1000">
        <div className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4">
          基于神经科学与深度心理学
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight max-w-4xl mx-auto">
          探测阻碍你 <br />
          <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent italic">成长的“隐形负累”</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-loose">
          每个人身上都有 95% 的潜意识信念在操控着 100% 的决策。
          <br className="hidden md:block" />
          本探测器通过 50 项深度扫描，揭示那些你未曾察觉的自我阻碍模式。
        </p>
        <div className="pt-8">
          <button 
            onClick={onStart}
            className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
          >
            立即开启深度探测
          </button>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[800px] h-[800px] bg-gradient-to-b from-indigo-50/50 to-transparent rounded-full blur-3xl opacity-50"></div>
      </section>

      {/* 2. 冰山模型 */}
      <section className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="relative">
          <div className="w-full aspect-square bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-indigo-100/50 flex items-center justify-center p-12 border border-slate-50">
            <div className="w-full h-full relative border-l-2 border-dashed border-slate-200">
              <div className="absolute top-10 left-4 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-black text-slate-400">意识层 (5%)：目标与意志力</div>
              <div className="absolute top-[40%] left-0 w-full h-0.5 bg-indigo-100"></div>
              <div className="absolute top-[50%] left-4 space-y-4">
                <div className="px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-lg text-[10px] font-black italic">潜意识层 (95%)：核心阻碍信念</div>
                <div className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold">自动化行为模式</div>
                <div className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold">早期经验投射</div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <h2 className="text-3xl font-black text-slate-900 leading-tight">为什么你会感到“卡住了”？</h2>
          <p className="text-slate-500 leading-relaxed font-medium">
            心理学称之为<span className="text-indigo-600 font-bold">“心理平衡调节”</span>。当你试图改变时，内心的限制性信念（如“我不配”、“风险意味着毁灭”）会像强力弹簧一样将你拉回原点。
          </p>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs">01</div>
              <p className="text-sm text-slate-600 font-bold">认知闭环：大脑在过滤信息以验证你的自我偏见。</p>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs">02</div>
              <p className="text-sm text-slate-600 font-bold">行为惯性：过去的“幸存经验”已成为当下的牢笼。</p>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs">03</div>
              <p className="text-sm text-slate-600 font-bold">能量损耗：由于恐惧评价，系统选择了“完全停摆”。</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 六大维度 */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <h3 className="text-4xl font-black text-slate-900">全维度探测体系</h3>
          <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">核心科学维度深度扫描</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <CoreDimension 
            colorClass="bg-amber-50 text-amber-600"
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.651 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.407-2.651-1M12 16V15m10-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title="价值映射" 
            desc="解析财富与自我的深层关联，打破“我不值得”的隐形诅咒。" 
          />
          <CoreDimension 
            colorClass="bg-purple-50 text-purple-600"
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
            title="认知惯性" 
            desc="识别大脑在面对机会时的自动化负面反馈逻辑。" 
          />
          <CoreDimension 
            colorClass="bg-orange-50 text-orange-600"
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title="时间焦虑" 
            desc="探测你在年龄、成就压力下的心理能量流失点。" 
          />
          <CoreDimension 
            colorClass="bg-rose-50 text-rose-600"
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            title="关系防御" 
            desc="挖掘亲密关系与协作中潜伏的防御机制。" 
          />
          <CoreDimension 
            colorClass="bg-emerald-50 text-emerald-600"
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
            title="行动瘫痪" 
            desc="区分“追求卓越”与“恐惧失败”导致的决策瘫痪。" 
          />
          <CoreDimension 
            colorClass="bg-indigo-50 text-indigo-600"
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
            title="行为熵值" 
            desc="测量在压力环境下产生“自我破坏”行为的倾向指数。" 
          />
        </div>
      </section>

      {/* 4. 症状检测 */}
      <section className="bg-slate-900 text-white py-24 rounded-[3rem] mx-4 overflow-hidden relative">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-12 relative z-10">
          <h3 className="text-3xl font-black italic">你是否也正处于这些状态？</h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm font-bold">
            <span className="px-6 py-3 bg-white/10 rounded-full border border-white/20">想得很多，但迟迟无法开始</span>
            <span className="px-6 py-3 bg-white/10 rounded-full border border-white/20">总是在接近成功时突然“搞砸”</span>
            <span className="px-6 py-3 bg-white/10 rounded-full border border-white/20">拼命努力，但结果始终未达预期</span>
            <span className="px-6 py-3 bg-white/10 rounded-full border border-white/20">即使被称赞，内心依然怀疑自己</span>
          </div>
          <p className="text-white/40 text-xs font-black uppercase tracking-[0.4em]">这些并非巧合，而是阻碍闭环的产物</p>
        </div>
      </section>
      
      <div className="text-center">
         <button 
            onClick={onStart}
            className="px-12 py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-slate-200"
          >
            开启 50 项心理维度扫描
          </button>
      </div>
    </div>
  );
};

export default Landing;
