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
  onSaveProject: () => void;
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
  onSaveProject,
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
    <aside className="w-[500px] h-full bg-white/80 backdrop-blur-2xl border-r border-neutral-200 flex flex-col z-20 shadow-[6px_0_24px_-6px_rgba(0,0,0,0.06)] relative">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50/30 to-transparent pointer-events-none"></div>

        {/* Header */}
        <div className="px-8 pt-8 pb-4 shrink-0 relative z-10 flex flex-col gap-4">
          <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neutral-800 to-neutral-600 tracking-tight">视觉全案系统</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">VISION CONFIGURATION</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isAdminLoggedIn && (
                  <button 
                    onClick={onSaveProject}
                    className="w-8 h-8 rounded-full bg-white border border-blue-100 text-blue-600 flex items-center justify-center hover:scale-110 hover:shadow-lg hover:shadow-blue-200 transition-all shadow-sm"
                    title="保存为项目"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  </button>
                )}
                <button 
                  onClick={onReset}
                  className="w-8 h-8 rounded-full bg-white border border-red-50 text-neutral-400 hover:text-red-500 hover:border-red-100 flex items-center justify-center hover:scale-110 hover:shadow-lg hover:shadow-red-100 transition-all shadow-sm"
                  title="重制"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-2 space-y-8 custom-scrollbar relative z-10 pb-10">
          
          {/* 01 Analysis */}
          <section className="bg-white/50 rounded-3xl p-5 border border-white/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black shadow-inner">01</div>
              <h2 className="text-sm font-black text-neutral-800 tracking-wide">产品智能分析</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3 h-32">
              {/* Image 1 */}
              <div className="relative rounded-2xl border-2 border-dashed border-neutral-200/80 bg-neutral-50/50 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center justify-center group overflow-hidden">
                 {images[0] ? (
                   <>
                     <img src={`data:image/jpeg;base64,${images[0]}`} className="w-full h-full object-contain rounded-2xl p-1" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={(e) => {e.stopPropagation(); removeImage(0);}} className="bg-white/20 backdrop-blur text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 text-neutral-300 group-hover:text-blue-500 group-hover:scale-110 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                     </div>
                     <span className="text-[10px] font-bold text-neutral-400 group-hover:text-blue-600 transition-colors">上传主图</span>
                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 0)} />
                   </>
                 )}
              </div>

              {/* Image 2 */}
              <div className="relative rounded-2xl border-2 border-dashed border-neutral-200/80 bg-neutral-50/50 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center justify-center group overflow-hidden">
                 {images[1] ? (
                    <>
                     <img src={`data:image/jpeg;base64,${images[1]}`} className="w-full h-full object-contain rounded-2xl p-1" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={(e) => {e.stopPropagation(); removeImage(1);}} className="bg-white/20 backdrop-blur text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 text-neutral-300 group-hover:text-blue-500 group-hover:scale-110 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                     </div>
                     <span className="text-[10px] font-bold text-neutral-400 group-hover:text-blue-600 transition-colors">上传参考</span>
                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 1)} />
                   </>
                 )}
              </div>
            </div>

            <div className="flex gap-3 h-24">
                <textarea
                  value={description} 
                  onChange={e=>setDescription(e.target.value)} 
                  className="flex-1 bg-white/60 border border-neutral-100 rounded-2xl p-3 text-[10px] font-medium text-neutral-700 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none placeholder:text-neutral-300 shadow-sm" 
                  placeholder="输入产品卖点或详细说明..."
                />
                 <div className="w-1/3 bg-white/60 border border-neutral-100 rounded-2xl p-3 flex flex-col focus-within:bg-white focus-within:border-blue-200 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all shadow-sm">
                    <span className="text-[9px] font-bold text-neutral-400 mb-1">品牌名称</span>
                    <textarea 
                      className="w-full flex-1 bg-transparent text-[11px] font-bold text-neutral-800 outline-none placeholder:text-neutral-300 resize-none leading-relaxed"
                      placeholder="Brand" 
                      value={manualBrand} 
                      onChange={e=>setManualBrand(e.target.value)} 
                    />
                 </div>
            </div>
          </section>

          {/* 02 Style Definition */}
          <section className="bg-white/50 rounded-3xl p-5 border border-white/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-black shadow-inner">02</div>
              <h2 className="text-sm font-black text-neutral-800 tracking-wide">视觉风格定义</h2>
            </div>

            <div className="space-y-4">
                {/* Style Dropdowns */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-neutral-400 ml-1">基础视觉风格</label>
                       <div className="relative group">
                          <div className="bg-white border border-neutral-100 rounded-2xl px-3 py-2.5 flex items-center justify-between shadow-sm group-hover:border-purple-200 transition-all cursor-pointer h-[40px]">
                              <span className="text-[10px] font-bold text-neutral-700 truncate">{selectedStyle.split(' ')[0]} {selectedStyle.split(' ')[1]}</span>
                              <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
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

                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-neutral-400 ml-1">排版逻辑</label>
                       <div className="relative group">
                          <div className="bg-white border border-neutral-100 rounded-2xl px-3 py-2.5 flex items-center justify-between shadow-sm group-hover:border-purple-200 transition-all cursor-pointer h-[40px]">
                              <span className="text-[10px] font-bold text-neutral-700 truncate">{selectedTypography.split(' ')[0]} {selectedTypography.split(' ')[1]}</span>
                              <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
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

                {/* Style Description Bubble */}
                <div className="bg-gradient-to-br from-purple-50/50 to-blue-50/50 rounded-2xl p-3 border border-purple-50">
                    <p className="text-[9px] text-purple-900/70 font-medium leading-relaxed">
                       {visualStyleDescriptions[selectedStyle]} {typographyDescriptions[selectedTypography]}
                    </p>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent"></div>

                {/* Custom Needs Buttons */}
                <div className="space-y-3">
                   <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setNeedsModel(!needsModel)}
                        className={`py-2.5 rounded-xl text-[10px] font-bold transition-all border ${
                          needsModel 
                            ? 'bg-neutral-800 text-white border-neutral-800 shadow-md shadow-neutral-200 scale-[1.02]' 
                            : 'bg-white border-neutral-100 text-neutral-500 hover:bg-neutral-50'
                        }`}
                      >
                         {needsModel ? '✓' : '+'} 真人模特
                      </button>
                      <button
                        onClick={() => setNeedsScene(!needsScene)}
                        className={`py-2.5 rounded-xl text-[10px] font-bold transition-all border ${
                          needsScene 
                            ? 'bg-neutral-800 text-white border-neutral-800 shadow-md shadow-neutral-200 scale-[1.02]' 
                            : 'bg-white border-neutral-100 text-neutral-500 hover:bg-neutral-50'
                        }`}
                      >
                         {needsScene ? '✓' : '+'} 定制场景
                      </button>
                      <button
                        onClick={() => setNeedsDataVis(!needsDataVis)}
                        className={`py-2.5 rounded-xl text-[10px] font-bold transition-all border ${
                          needsDataVis 
                            ? 'bg-neutral-800 text-white border-neutral-800 shadow-md shadow-neutral-200 scale-[1.02]' 
                            : 'bg-white border-neutral-100 text-neutral-500 hover:bg-neutral-50'
                        }`}
                      >
                         {needsDataVis ? '✓' : '+'} 数据图表
                      </button>
                   </div>
                   
                   <div className="relative">
                      <input 
                        value={otherNeeds} 
                        onChange={e=>setOtherNeeds(e.target.value)} 
                        className="w-full px-4 py-3 bg-white border border-neutral-100 rounded-2xl text-[10px] font-medium text-neutral-700 focus:border-purple-200 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all placeholder:text-neutral-400 shadow-sm" 
                        placeholder="输入其他特殊补充要求..."
                      />
                      <div className="absolute right-2 top-1.5 flex gap-1">
                          {['+ 产品', '+ 对比', '+ 评价'].map(tag => (
                              <button key={tag} onClick={() => setOtherNeeds(prev => prev ? `${prev}，${tag.slice(2)}` : tag.slice(2))} className="px-2 py-1.5 bg-neutral-50 hover:bg-purple-50 text-[9px] font-bold text-neutral-400 hover:text-purple-600 rounded-lg transition-colors">{tag}</button>
                          ))}
                      </div>
                   </div>
                </div>

                {/* Details Expansion */}
                {(needsModel || needsScene) && (
                  <div className="bg-neutral-50/80 rounded-2xl border border-neutral-100 p-3 space-y-3 animate-slide-down">
                    {needsModel && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-neutral-400 ml-1">模特特征</label>
                        <input 
                          value={modelDesc}
                          onChange={e => setModelDesc(e.target.value)}
                          placeholder="描述模特..."
                          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-[10px] outline-none focus:border-purple-300 transition-colors"
                        />
                        <div className="flex flex-wrap gap-1.5">
                           {modelTags.map(tag => (
                             <button key={tag} onClick={() => setModelDesc(tag)} className="px-2 py-1 bg-white border border-neutral-100 rounded-lg text-[9px] text-neutral-400 hover:text-purple-600 hover:border-purple-100 hover:shadow-sm transition-all">{tag}</button>
                           ))}
                        </div>
                      </div>
                    )}
                    {needsModel && needsScene && <div className="h-px bg-neutral-200/50 w-full"></div>}
                    {needsScene && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-neutral-400 ml-1">场景风格</label>
                         <input 
                          value={sceneDesc}
                          onChange={e => setSceneDesc(e.target.value)}
                          placeholder="描述场景..."
                          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-[10px] outline-none focus:border-purple-300 transition-colors"
                        />
                        <div className="flex flex-wrap gap-1.5">
                           {sceneTags.map(tag => (
                             <button key={tag} onClick={() => setSceneDesc(tag)} className="px-2 py-1 bg-white border border-neutral-100 rounded-lg text-[9px] text-neutral-400 hover:text-purple-600 hover:border-purple-100 hover:shadow-sm transition-all">{tag}</button>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </section>

          {/* 03 Ratio */}
          <section className="bg-white/50 rounded-3xl p-5 border border-white/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center text-xs font-black shadow-inner">03</div>
              <h2 className="text-sm font-black text-neutral-800 tracking-wide">方案画面比例</h2>
            </div>
            <div className="flex justify-between gap-2 p-1 bg-neutral-100/50 rounded-xl">
              {Object.keys(ratioIcons).map(r => (
                <button 
                  key={r} 
                  onClick={() => setAspectRatio(r)}
                  className={`
                    flex-1 py-2 rounded-lg text-[10px] font-bold 
                    transition-all duration-300 relative
                    ${aspectRatio === r 
                      ? 'bg-white text-orange-600 shadow-md shadow-orange-100 scale-100 z-10' 
                      : 'text-neutral-400 hover:text-neutral-600 hover:bg-white/50'
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
        <div className="p-6 relative z-20">
          <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>
          <button 
            onClick={startGeneration}
            disabled={generationLoading || images.length === 0}
            className="w-full h-14 relative overflow-hidden group rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
             <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600"></div>
             <div className="absolute inset-0 bg-white/20 group-hover:bg-transparent transition-colors"></div>
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
             
             <div className="relative z-10 flex items-center justify-center gap-2 text-white font-black text-sm tracking-wide h-full">
                {generationLoading ? (
                   <>
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     <span className="animate-pulse">正在全案分析中...</span>
                   </>
                ) : (
                   <>
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     生成视觉方案提示词
                   </>
                )}
             </div>
          </button>
        </div>
      </aside>
  );
}