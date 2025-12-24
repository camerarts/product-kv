
import React from 'react';

interface ApiKeyModalProps {
  hasApiKey: boolean;
  onSelectKey: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ hasApiKey, onSelectKey }) => {
  if (hasApiKey || !window.aistudio) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6" onClick={() => {}}>
       <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 animate-scale-up text-center" onClick={e=>e.stopPropagation()}>
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🔑</div>
          <h3 className="text-xl font-black text-neutral-900 mb-2">API Key Required</h3>
          <p className="text-xs text-neutral-500 mb-6">Access to the Vision Engine requires a valid Google GenAI API Key.</p>
          
          <button onClick={onSelectKey} className="w-full py-3 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors mb-4">
            Select API Key
          </button>
          
          <div className="text-[10px] text-neutral-400">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-neutral-600">
              Billing Information
            </a>
          </div>
       </div>
    </div>
  );
};
