import React from 'react';
import { VisualStyle, TypographyStyle, RecognitionReport } from './types';

interface SidebarProps {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  setImageRatios: React.Dispatch<React.SetStateAction<number[]>>;
  description: string;
  setDescription: (val: string) => void;
  manualBrand: string;
  setManualBrand: (val: string) => void;
  selectedStyle: VisualStyle;
  setSelectedStyle: (val: VisualStyle) => void;
  selectedTypography: TypographyStyle;
  setSelectedTypography: (val: TypographyStyle) => void;
  
  needsModel: boolean;
  setNeedsModel: (val: boolean) => void;
  modelDesc: string;
  setModelDesc: React.Dispatch<React.SetStateAction<string>>;

  needsScene: boolean;
  setNeedsScene: (val: boolean) => void;
  sceneDesc: string;
  setSceneDesc: React.Dispatch<React.SetStateAction<string>>;

  needsDataVis: boolean;
  setNeedsDataVis: (val: boolean) => void;
  otherNeeds: string;
  setOtherNeeds: React.Dispatch<React.SetStateAction<string>>;
  aspectRatio: string;
  setAspectRatio: (val: string) => void;
  generationLoading: boolean;
  startGeneration: () => void;
  report: RecognitionReport | null;
  ratioIcons: Record<string, string>;
  visualStyleDescriptions: Record<VisualStyle, string>;
  typographyDescriptions: Record<TypographyStyle, string>;
  onReset: () => void;
  isAdminLoggedIn: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  images, setImages, setImageRatios,
  description, setDescription,
  manualBrand, setManualBrand,
  selectedStyle, setSelectedStyle,
  selectedTypography, setSelectedTypography,
  
  needsModel, setNeedsModel,
  modelDesc, setModelDesc,
  needsScene, setNeedsScene,
  sceneDesc, setSceneDesc,
  needsDataVis, setNeedsDataVis,
  otherNeeds, setOtherNeeds,
  
  aspectRatio, setAspectRatio,
  generationLoading, startGeneration,
  report, ratioIcons,
  visualStyleDescriptions, typographyDescriptions,
  onReset,
  isAdminLoggedIn
}) => {

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      const img = new Image();
      img.onload = () => {
        setImages(prev => {
          const newImages = [...prev];
          newImages[index] = base64;
          return newImages;
        });
        setImageRatios(prev => {
          const newRatios = [...prev];
          newRatios[index] = img.width / img.height;
          return newRatios;
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageRatios(prev => prev.filter((_, i) => i !== index));
  };

  const modelTags = ["亚洲女性", "欧美男性", "手部特写", "外籍模特", "儿童模特"];
  const sceneTags = ["极简纯色", "自然户外", "家居生活", "办公商务", "科技炫光"];

  return (
    <aside className="fixed left-[120px] top-6 bottom-6 w-[480px] glass-panel rounded-[2.5rem] flex flex-col z-40 overflow-hidden transition-all duration-500">
        
        {/* Header Area */}
        <div className="px-8 pt-8 pb-4 shrink-0 relative z-10 flex flex-col gap-4">
          <div className="absolute right-8 top-8 z-20">
            <button 
              onClick={onReset}
              className="liquid-button w-10 h-10 rounded-full bg-white/50 border border-white/60 text-slate-400 hover:text-red-500 hover:bg-white flex items-center justify-center shadow-sm"
              title="重制"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>

          <div className="flex flex-col w-full pt-1">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              视觉系统
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-bold tracking-widest uppercase border border-indigo-500/20">配置器</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6 custom-scrollbar relative z-10 pb-10">
          
          {/* 01 Analysis */}
          <section className="bg-white/40 backdrop-blur-md rounded-[2rem] p-5 border border-white/50 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pl-1">
              <div className="w-8 h-8 rounded-full bg-blue-100/50 text-blue-600 flex items-center justify-center text-xs font-black shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)]">01</div>
              <h2 className="text-sm font-bold text-slate-700">产品智能分析</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3 h-36">
              {[0, 1].map((idx) => (
                <div key={idx} className="liquid-input relative rounded-3xl overflow-hidden group flex flex-col items-center justify-center cursor-pointer hover:border-blue-400/50 transition-colors">
                    {images[idx] ? (
                      <>
                        <img src={`data:image/jpeg;base64,${images[idx]}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <button onClick={(e) => {e.stopPropagation(); removeImage(idx);}} className="bg-white/20 hover:bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-md border border-white/30 transition-all">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-white/60 shadow-sm flex items-center justify-center mb-2 text-slate-300 group-hover:text-blue-500 group-hover:scale-110 transition-all">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 transition-colors">{idx === 0 ? '上传主图' : '上传参考'}</span>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, idx)} />
                      </>
                    )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
                <textarea
                  value={description} 
                  onChange={e=>setDescription(e.target.value)} 
                  className="liquid-input w-full flex-1 rounded-2xl p-3 text-[11px] font-medium text-slate-700 outline-none resize-none placeholder:text-slate-400 h-14" 
                  placeholder="输入产品卖点或详细说明..."
                />
                 <div className="liquid-input w-1/3 rounded-2xl p-3 flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-slate-400 mb-0.5">品牌名称</span>
                    <input 
                      className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none placeholder:text-slate-300"
                      placeholder="Brand" 
                      value={manualBrand} 
                      onChange={e=>setManualBrand(e.target.value)} 
                    />
                 </div>
            </div>
          </section>

          {/* 02 Style Definition */}
          <section className="bg-white/40 backdrop-blur-md rounded-[2rem] p-5 border border-white/50 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pl-1">
              <div className="w-8 h-8 rounded-full bg-purple-100/50 text-purple-600 flex items-center justify-center text-xs font-black shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)]">02</div>
              <h2 className="text-sm font-bold text-slate-700">视觉风格定义</h2>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    {/* Style Select */}
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-400 ml-2">2.1 基础视觉风格</label>
                       <div className="relative group">
                          <div className="liquid-input rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer">
                              <span className="text-[10px] font-bold text-slate-700 truncate">{selectedStyle.split(' ')[0]} {selectedStyle.split(' ')[1]}</span>
                              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                          <select 
                            value={selectedStyle} 
                            onChange={e => setSelectedStyle(e.target.value as VisualStyle)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          >
                            {Object.values(VisualStyle).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                       </div>
                    </div>

                    {/* Typography Select */}
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-400 ml-2">2.2 排版逻辑</label>
                       <div className="relative group">
                          <div className="liquid-input rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer">
                              <span className="text-[10px] font-bold text-slate-700 truncate">{selectedTypography.split(' ')[0]} {selectedTypography.split(' ')[1]}</span>
                              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                          <select 
                            value={selectedTypography} 
                            onChange={e => setSelectedTypography(e.target.value as TypographyStyle)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          >
                            {Object.values(TypographyStyle).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                       </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-2xl p-4 border border-indigo-50/50">
                    <p className="text-[10px] text-indigo-900/70 font-medium leading-relaxed">
                       {visualStyleDescriptions[selectedStyle]} {typographyDescriptions[selectedTypography]}
                    </p>
                </div>

                {/* Custom Needs Buttons */}
                <div className="space-y-3 pt-2">
                   <div>
                       <label className="text-[10px] font-bold text-slate-400 ml-2 block mb-2">2.3 个性化需求</label>
                       <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: '真人模特', state: needsModel, toggle: setNeedsModel },
                            { label: '定制场景', state: needsScene, toggle: setNeedsScene },
                            { label: '数据图表', state: needsDataVis, toggle: setNeedsDataVis }
                          ].map((item, i) => (
                            <button
                                key={i}
                                onClick={() => item.toggle(!item.state)}
                                className={`liquid-button py-3 rounded-2xl text-[10px] font-bold transition-all border ${
                                item.state 
                                    ? 'bg-slate-800 text-white border-slate-700 shadow-md' 
                                    : 'bg-white/40 border-white/50 text-slate-500 hover:bg-white/60'
                                }`}
                            >
                                {item.state ? '✓ ' : '+ '}{item.label}
                            </button>
                          ))}
                       </div>

                       {(needsModel || needsScene) && (
                         <div className="bg-white/30 rounded-2xl border border-white/40 p-3 space-y-3 mt-3 animate-fade-in-down">
                           {needsModel && (
                             <div className="space-y-1.5">
                               <label className="text-[9px] font-bold text-slate-400 ml-1">模特特征</label>
                               <input 
                                 value={modelDesc}
                                 onChange={e => setModelDesc(e.target.value)}
                                 placeholder="描述模特..."
                                 className="liquid-input w-full px-3 py-2 rounded-xl text-[10px] outline-none"
                               />
                               <div className="flex flex-wrap gap-1.5">
                                  {modelTags.map(tag => (
                                    <button key={tag} onClick={() => setModelDesc(tag)} className="px-2 py-1 bg-white/40 border border-white/40 rounded-lg text-[9px] text-slate-500 hover:text-indigo-600 hover:bg-white transition-all">{tag}</button>
                                  ))}
                               </div>
                             </div>
                           )}
                           {needsScene && (
                             <div className="space-y-1.5">
                               <label className="text-[9px] font-bold text-slate-400 ml-1">场景风格</label>
                                <input 
                                 value={sceneDesc}
                                 onChange={e => setSceneDesc(e.target.value)}
                                 placeholder="描述场景..."
                                 className="liquid-input w-full px-3 py-2 rounded-xl text-[10px] outline-none"
                               />
                               <div className="flex flex-wrap gap-1.5">
                                  {sceneTags.map(tag => (
                                    <button key={tag} onClick={() => setSceneDesc(tag)} className="px-2 py-1 bg-white/40 border border-white/40 rounded-lg text-[9px] text-slate-500 hover:text-indigo-600 hover:bg-white transition-all">{tag}</button>
                                  ))}
                               </div>
                             </div>
                           )}
                         </div>
                       )}
                   </div>
                   
                   <div>
                      <label className="text-[10px] font-bold text-slate-400 ml-2 block mb-2">2.4 其他特殊补充要求</label>
                      <div className="relative">
                          <input 
                            value={otherNeeds} 
                            onChange={e=>setOtherNeeds(e.target.value)} 
                            className="liquid-input w-full px-4 py-3 rounded-2xl text-[10px] font-medium text-slate-700 outline-none placeholder:text-slate-400 pr-24" 
                            placeholder="输入其他特殊补充要求..."
                          />
                          <div className="absolute right-2 top-2 flex gap-1">
                              {['+ 产品', '+ 对比'].map(tag => (
                                  <button key={tag} onClick={() => setOtherNeeds(prev => prev ? `${prev}，${tag.slice(2)}` : tag.slice(2))} className="px-2 py-1 bg-white/50 hover:bg-white text-[9px] font-bold text-slate-400 hover:text-indigo-600 rounded-lg transition-colors border border-white/40 shadow-sm">{tag}</button>
                              ))}
                          </div>
                      </div>
                   </div>
                </div>
            </div>
          </section>

          {/* 03 Ratio */}
          <section className="bg-white/40 backdrop-blur-md rounded-[2rem] p-5 border border-white/50 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pl-1">
              <div className="w-8 h-8 rounded-full bg-orange-100/50 text-orange-500 flex items-center justify-center text-xs font-black shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)]">03</div>
              <h2 className="text-sm font-bold text-slate-700">方案画面比例</h2>
            </div>
            <div className="flex justify-between gap-2 p-1 bg-white/30 border border-white/40 rounded-2xl">
              {Object.keys(ratioIcons).map(r => (
                <button 
                  key={r} 
                  onClick={() => setAspectRatio(r)}
                  className={`
                    liquid-button flex-1 py-2 rounded-xl text-[10px] font-bold relative
                    ${aspectRatio === r 
                      ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-500/30 ring-1 ring-white/30' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-white/40'
                    }
                  `}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Floating Action Button Area */}
        <div className="p-6 relative z-20 bg-white/10 backdrop-blur-md border-t border-white/20">
          <button 
            onClick={startGeneration}
            disabled={generationLoading || images.length === 0}
            className="liquid-button w-full h-14 relative overflow-hidden group rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600"
          >
             <div className="absolute inset-0 bg-white/20 group-hover:bg-transparent transition-colors"></div>
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
             
             <div className="relative z-10 flex items-center justify-center gap-2 text-white font-black text-sm tracking-wide h-full">
                {generationLoading ? (
                   <>
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     <span className="animate-pulse">全案分析中...</span>
                   </>
                ) : (
                   <>
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     生成视觉方案
                   </>
                )}
             </div>
          </button>
        </div>
      </aside>
  );
}