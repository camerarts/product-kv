import React, { useState, useEffect } from 'react';
import { ModelConfig } from '../types';

interface ModelSettingsProps {
  config: ModelConfig;
  onSave: (config: ModelConfig) => void;
}

export const ModelSettings: React.FC<ModelSettingsProps> = ({ config, onSave }) => {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (key: keyof ModelConfig, value: string) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localConfig);
    alert('模型设置已更新');
  };

  return (
    <div className="flex-1 bg-neutral-50 p-8 flex flex-col items-center justify-center">
       <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 w-full max-w-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl">🤖</div>
            <div>
               <h3 className="text-xl font-black text-neutral-900">模型设置</h3>
               <p className="text-xs text-neutral-400 font-bold">配置用于生成内容的 Gemini 模型版本</p>
            </div>
          </div>

          <div className="space-y-6">
             {/* Logic Model */}
             <div>
                <label className="flex items-center gap-2 text-sm font-bold text-neutral-700 mb-2">
                   <div className="w-2 h-2 rounded-full bg-green-500"></div>
                   逻辑/文本模型 (Logic Model)
                </label>
                <div className="relative">
                   <input 
                     type="text" 
                     value={localConfig.logicModel}
                     onChange={(e) => handleChange('logicModel', e.target.value)}
                     className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium focus:border-blue-500 outline-none transition-all font-mono text-neutral-600"
                     placeholder="e.g. gemini-3-flash-preview"
                   />
                </div>
                <p className="text-[10px] text-neutral-400 mt-1 pl-1">用于分析产品图片、提取卖点及生成 Prompt。</p>
             </div>

             {/* Visual Model */}
             <div>
                <label className="flex items-center gap-2 text-sm font-bold text-neutral-700 mb-2">
                   <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                   视觉/图像模型 (Visual Model)
                </label>
                <div className="relative">
                   <input 
                     type="text" 
                     value={localConfig.visualModel}
                     onChange={(e) => handleChange('visualModel', e.target.value)}
                     className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium focus:border-blue-500 outline-none transition-all font-mono text-neutral-600"
                     placeholder="e.g. gemini-3-pro-image-preview"
                   />
                </div>
                <p className="text-[10px] text-neutral-400 mt-1 pl-1">用于最终渲染生成高质量的海报图像。</p>
             </div>

             <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setLocalConfig({ logicModel: 'gemini-3-flash-preview', visualModel: 'gemini-3-pro-image-preview' })}
                  className="px-4 py-2.5 rounded-lg border border-neutral-200 text-neutral-500 text-xs font-bold hover:bg-neutral-50 transition-colors"
                >
                  恢复默认
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 px-6 py-2.5 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors"
                >
                  保存设置
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};