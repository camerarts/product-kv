import React, { useState, useEffect } from 'react';
import { ModelConfig } from '../types';

interface ModelSettingsProps {
  config: ModelConfig;
  onSave: (config: ModelConfig) => void;
  isAuthenticated: boolean;
}

const DEFAULT_LOGIC_MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash-preview',
  'gemini-2.5-pro-preview'
];

const DEFAULT_VISUAL_MODELS = [
  'gemini-3-pro-image-preview',
  'gemini-2.5-flash-image',
  'imagen-3.0-generate-001'
];

const CUSTOM_MODELS_KEY = 'VISION_APP_CUSTOM_MODELS_V1';

export const ModelSettings: React.FC<ModelSettingsProps> = ({ config, onSave, isAuthenticated }) => {
  // Current Selections
  const [selectedLogic, setSelectedLogic] = useState(config.logicModel);
  const [selectedVisual, setSelectedVisual] = useState(config.visualModel);

  // Input States for New Models
  const [newLogicInput, setNewLogicInput] = useState('');
  const [newVisualInput, setNewVisualInput] = useState('');

  // Lists
  const [customLogicList, setCustomLogicList] = useState<string[]>([]);
  const [customVisualList, setCustomVisualList] = useState<string[]>([]);

  useEffect(() => {
    // Load custom models based on auth state
    const loadModels = async () => {
        if (isAuthenticated) {
            // Load from Server
            try {
                const res = await fetch('/api/me/models');
                if (res.ok) {
                    const data = await res.json();
                    setCustomLogicList(data.logic || []);
                    setCustomVisualList(data.visual || []);
                }
            } catch (e) {
                console.error("Failed to load user models", e);
            }
        } else {
            // Load from Local Storage (Guest)
            try {
                const stored = localStorage.getItem(CUSTOM_MODELS_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setCustomLogicList(parsed.logic || []);
                    setCustomVisualList(parsed.visual || []);
                }
            } catch (e) {
                console.error(e);
            }
        }
    };
    loadModels();
  }, [isAuthenticated]);

  useEffect(() => {
    setSelectedLogic(config.logicModel);
    setSelectedVisual(config.visualModel);
  }, [config]);

  const saveCustomLists = async (logic: string[], visual: string[]) => {
    if (isAuthenticated) {
        // Save to Server
        try {
            await fetch('/api/me/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logic, visual })
            });
        } catch (e) {
            console.error("Failed to save models to server", e);
        }
    } else {
        // Save to Local Storage
        localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify({ logic, visual }));
    }
  };

  const handleAddLogicModel = () => {
    if (!newLogicInput.trim()) return;
    if (DEFAULT_LOGIC_MODELS.includes(newLogicInput) || customLogicList.includes(newLogicInput)) {
      alert('模型已存在');
      return;
    }
    const newList = [...customLogicList, newLogicInput.trim()];
    setCustomLogicList(newList);
    setNewLogicInput('');
    saveCustomLists(newList, customVisualList);
    // Auto select the new one
    setSelectedLogic(newLogicInput.trim());
  };

  const handleAddVisualModel = () => {
    if (!newVisualInput.trim()) return;
    if (DEFAULT_VISUAL_MODELS.includes(newVisualInput) || customVisualList.includes(newVisualInput)) {
      alert('模型已存在');
      return;
    }
    const newList = [...customVisualList, newVisualInput.trim()];
    setCustomVisualList(newList);
    setNewVisualInput('');
    saveCustomLists(customLogicList, newList);
    // Auto select the new one
    setSelectedVisual(newVisualInput.trim());
  };

  const handleApplySettings = () => {
    onSave({
      logicModel: selectedLogic,
      visualModel: selectedVisual
    });
    alert('✅ 系统模型设置已更新并应用！');
  };

  // Helper to render section
  const renderSection = (
    title: string, 
    iconColor: string, 
    desc: string,
    currentValue: string, 
    setValue: (val: string) => void,
    defaultList: string[],
    customList: string[],
    newInput: string,
    setNewInput: (val: string) => void,
    onAdd: () => void
  ) => {
    const allModels = [...new Set([...defaultList, ...customList])];

    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500">
         <div className={`absolute top-0 right-0 w-32 h-32 bg-${iconColor}-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none`}></div>
         
         <div className="relative z-10">
            <label className="flex items-center gap-3 text-sm font-black text-neutral-800 mb-4">
               <div className={`w-3 h-3 rounded-full bg-${iconColor}-500 shadow-[0_0_10px_rgba(var(--${iconColor}-500),0.5)]`}></div>
               {title}
            </label>
            
            {/* Selector */}
            <div className="mb-4 relative">
               <select 
                 value={currentValue}
                 onChange={(e) => setValue(e.target.value)}
                 className="w-full px-4 py-3 bg-white/80 border border-neutral-200/60 rounded-xl text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer hover:bg-white"
               >
                 <optgroup label="预设模型">
                   {defaultList.map(m => <option key={m} value={m}>{m}</option>)}
                 </optgroup>
                 {customList.length > 0 && (
                   <optgroup label="自定义模型 (用户)">
                     {customList.map(m => <option key={m} value={m}>{m}</option>)}
                   </optgroup>
                 )}
               </select>
               <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
               </div>
            </div>

            {/* Add New */}
            <div className="flex gap-2">
               <input 
                 type="text" 
                 value={newInput}
                 onChange={(e) => setNewInput(e.target.value)}
                 placeholder="输入新模型名称..."
                 className="flex-1 px-4 py-2 bg-neutral-50/50 border border-neutral-200/50 rounded-xl text-xs font-medium focus:bg-white outline-none transition-all placeholder:text-neutral-400"
               />
               <button 
                 onClick={onAdd}
                 disabled={!newInput.trim()}
                 className="px-4 py-2 bg-white border border-neutral-200 text-neutral-600 rounded-xl text-xs font-bold hover:bg-neutral-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
               >
                 + 添加模型
               </button>
            </div>

            <p className="text-[10px] text-neutral-400 mt-3 font-medium leading-relaxed opacity-80">
              {desc}
            </p>
         </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-[#FAFAFA] flex flex-col h-full overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/30 via-purple-50/30 to-white pointer-events-none"></div>

      {/* Header */}
      <div className="px-10 pt-10 pb-6 shrink-0 relative z-10">
        <div className="max-w-4xl mx-auto w-full">
           <h1 className="text-3xl font-black text-neutral-900 flex items-center gap-3 tracking-tight">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg shadow-lg shadow-blue-500/20">🤖</span>
              模型设置
           </h1>
           <p className="mt-2 text-neutral-500 text-sm font-medium pl-14">
             {isAuthenticated ? '已登录：自定义模型将同步至云端' : '未登录：自定义模型仅保存在本地'}
           </p>
        </div>
      </div>

      <div className="flex-1 px-10 pb-10 overflow-y-auto custom-scrollbar relative z-10">
         <div className="max-w-4xl mx-auto w-full space-y-6">
             
             {/* Logic Model Section */}
             {renderSection(
               "逻辑/文本模型 (Logic Model)",
               "green",
               "负责产品图片分析、卖点提取、文案撰写及提示词架构生成。建议使用 gemini-flash 系列以获得更快的响应速度。",
               selectedLogic,
               setSelectedLogic,
               DEFAULT_LOGIC_MODELS,
               customLogicList,
               newLogicInput,
               setNewLogicInput,
               handleAddLogicModel
             )}

             {/* Visual Model Section */}
             {renderSection(
               "视觉/图像模型 (Visual Model)",
               "purple",
               "负责最终画面的渲染生成。建议使用 gemini-pro-image 或 imagen 系列以获得最佳的图像细节与光影质感。",
               selectedVisual,
               setSelectedVisual,
               DEFAULT_VISUAL_MODELS,
               customVisualList,
               newVisualInput,
               setNewVisualInput,
               handleAddVisualModel
             )}

             {/* Footer Action */}
             <div className="pt-6 flex justify-end animate-fade-in-up">
                <button 
                  onClick={handleApplySettings}
                  className="px-10 py-4 bg-neutral-900 text-white rounded-2xl text-sm font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-neutral-900/20 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  保存并应用设置
                </button>
             </div>
         </div>
      </div>
    </div>
  );
};