
import React from 'react';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

const ProgressModal: React.FC<Props> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-500">
        <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2">继续上次的测评？</h3>
        <p className="text-slate-500 leading-relaxed mb-8">
          我们发现您有尚未完成的探测进度，是否要从上次中断的地方继续？
        </p>
        <div className="space-y-3">
          <button 
            onClick={onConfirm}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl font-black shadow-xl shadow-orange-100 hover:shadow-2xl hover:shadow-orange-200 transition-all"
          >
            继续上次进度
          </button>
          <button 
            onClick={onCancel}
            className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-bold hover:bg-slate-100 transition-all"
          >
            重新开始
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressModal;
