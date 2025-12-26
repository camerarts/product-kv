import React from 'react';

interface ApiKeyModalProps {
  hasApiKey: boolean;
  onSelectKey: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ hasApiKey, onSelectKey }) => {
  if (hasApiKey || !window.aistudio) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in" onClick={() => {}}>
       <div className="glass-panel rounded-[2rem] shadow-2xl w-full max-w-sm p-10 animate-scale-up text-center border-white/60 relative overflow-hidden" onClick={e=>e.stopPropagation()}>
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -mt-20"></div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner border border-white/60">🔑</div>
            <h3 className="text-2xl font-black text-slate-800 mb-3">需要 API Key</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">使用视觉引擎需要配置有效的 Google GenAI API Key。</p>
            
            <button onClick={onSelectKey} className="liquid-button w-full py-4 bg-gradient-to-r from-slate-800 to-black text-white rounded-xl text-sm font-bold hover:shadow-xl hover:scale-[1.02] transition-all mb-6">
              选择 API Key
            </button>
            
            <div className="text-xs text-slate-400 font-medium">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-indigo-600 transition-colors">
                查看计费说明
              </a>
            </div>
          </div>
       </div>
    </div>
  );
};