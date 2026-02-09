
import React, { useState } from 'react';

interface Props {
  onActivate: (code: string) => void;
  onBack: () => void;
  loading: boolean;
}

const CodeActivation: React.FC<Props> = ({ onActivate, onBack, loading }) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onActivate(code.trim().toUpperCase());
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in duration-500">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-slate-400 font-bold hover:text-orange-600 transition-colors group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </button>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-orange-100 border border-orange-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-50 to-rose-50 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>

          <div className="text-center mb-10 relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-50 to-rose-50 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">输入兑换码</h2>
            <p className="text-slate-500 mt-3 leading-relaxed font-medium">输入激活码，开启你的内耗指数测评之旅</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="relative">
              <input
                type="text"
                placeholder="请输入激活码"
                className="w-full px-6 py-5 rounded-2xl border-2 border-slate-100 focus:border-orange-400 transition-all uppercase font-mono text-xl tracking-widest text-center outline-none bg-slate-50/50 focus:bg-white"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-orange-200 disabled:opacity-50 hover:shadow-2xl hover:shadow-orange-300 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  正在验证...
                </span>
              ) : '开启 38 题内耗测评'}
            </button>
          </form>
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400 font-medium">
              没有兑换码？请联系客服获取
            </p>
          </div>
        </div>

        <div className="mt-12 text-center text-slate-400 text-xs font-medium space-y-2">
           <p>35道选择题 + 3道开放题，约需 8-12 分钟</p>
           <p className="text-[10px] tracking-widest uppercase text-slate-300">数据加密传输 · 隐私安全保障</p>
        </div>
      </div>
    </div>
  );
};

export default CodeActivation;
