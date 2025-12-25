import React, { useState } from 'react';

interface KeyConfigProps {
  userApiKey: string;
  onSave: (key: string) => void;
  onClear: () => void;
}

export const KeyConfig: React.FC<KeyConfigProps> = ({ 
  userApiKey, onSave, onClear
}) => {
  const [inputValue, setInputValue] = useState(userApiKey);
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="flex-1 bg-neutral-50 p-8 flex flex-col items-center justify-center">
      
      {/* API Key Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 w-full max-w-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl">🔑</div>
          <div>
             <h3 className="text-xl font-black text-neutral-900">Google GenAI API Key</h3>
             <p className="text-xs text-neutral-400 font-bold">配置个人密钥以获得更高限额</p>
          </div>
        </div>
        
        <div className="relative mb-6">
          <input 
            type={showKey ? "text" : "password"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium focus:border-purple-500 focus:bg-white outline-none transition-all pr-12 font-mono"
            placeholder="sk-..."
          />
          <button 
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600"
          >
            {showKey ? (
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            ) : (
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => { onClear(); setInputValue(''); }}
            className="px-4 py-2.5 rounded-lg border border-neutral-200 text-neutral-500 text-xs font-bold hover:bg-neutral-50 hover:text-red-500 transition-colors"
          >
            清除配置
          </button>
          <button 
            onClick={() => onSave(inputValue)}
            className="flex-1 px-6 py-2.5 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors"
          >
            保存 Key
          </button>
        </div>
      </div>
    </div>
  );
};