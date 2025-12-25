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
          // Trim array if we are filling a gap but array was shorter
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
    <aside className="w-[500px] border-r border-neutral-100 bg-white flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex justify-between items-center mb-1">
              <h1 className="text-xl font-black text-blue-600 tracking-tight">电商详情图视觉全案系统</h1>
              
              <div className="flex items-center gap-2">
                {isAdminLoggedIn && (
                  <button 
                    onClick={onSaveProject}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors flex items-center gap-1"
                    title="保存为项目"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    保存
                  </button>
                )}
                <button 
                  onClick={onReset}
                  className="text-[10px] font-bold text-neutral-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                  title="清空所有数据"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  重制
                </button>
              </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">核心配置</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 custom-scrollbar">
          {/* 01 Analysis */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
              <h2 className="text-sm font-black text-neutral-800 uppercase tracking-wide">01 产品智能分析</h2>
            </div>
            
            {/* 4 Columns (Image 1, Image 2, Description, Brand) - Equal Width & Height */}
            <div className="flex gap-2 h-28">
              {/* Image 1 */}
              <div className="flex-1 w-0 bg-neutral-50 border border-neutral-200 border-dashed rounded-xl flex flex-col items-center justify-center relative hover:border-blue-500 transition-colors cursor-pointer group overflow-hidden">
                 {images[0] ? (
                   <>
                     <img src={`data:image/jpeg;base64,${images[0]}`} className="w-full h-full object-cover rounded-xl" />
                     <button onClick={(e) => {e.stopPropagation(); removeImage(0);}} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                   </>
                 ) : (
                   <>
                     <svg className="w-5 h-5 text-neutral-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                     <span className="text-[9px] text-neutral-400 font-medium">主图</span>
                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 0)} />
                   </>
                 )}
              </div>

              {/* Image 2 */}
              <div className="flex-1 w-0 bg-neutral-50 border border-neutral-200 border-dashed rounded-xl flex flex-col items-center justify-center relative hover:border-blue-500 transition-colors cursor-pointer group overflow-hidden">
                 {images[1] ? (
                    <>
                     <img src={`data:image/jpeg;base64,${images[1]}`} className="w-full h-full object-cover rounded-xl" />
                     <button onClick={(e) => {e.stopPropagation(); removeImage(1);}} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                   </>
                 ) : (
                   <>
                    <svg className="w-5 h-5 text-neutral-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    <span className="text-[9px] text-neutral-300 font-medium">参考图</span>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 1)} />
                   </>
                 )}
              </div>

              {/* Description Input */}
              <div className="flex-1 w-0 h-full">
                <textarea
                  value={description} 
                  onChange={e=>setDescription(e.target.value)} 
                  className="w-full h-full px-2 py-2 bg-white border border-neutral-200 rounded-xl text-[10px] focus:border-blue-500 outline-none transition-all placeholder:text-neutral-300 resize-none leading-relaxed" 
                  placeholder="产品卖点/说明..."
                />
              </div>

              {/* Brand Input */}
              <div className="flex-1 w-0 h-full">
                 <div className="w-full h-full px-2 py-2 bg-white border border-neutral-200 rounded-xl flex flex-col focus-within:border-blue-500 transition-all">
                    <span className="text-[9px] font-bold text-neutral-400 mb-1">品牌</span>
                    <textarea 
                      className="w-full flex-1 bg-transparent text-[10px] font-bold outline-none placeholder:text-neutral-300 resize-none leading-relaxed"
                      placeholder="品牌名" 
                      value={manualBrand} 
                      onChange={e=>setManualBrand(e.target.value)} 
                    />
                 </div>
              </div>
            </div>
          </section>

          {/* 02 Style Definition */}
          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
              <h2 className="text-sm font-black text-neutral-800 uppercase tracking-wide">02 视觉风格定义</h2>
            </div>

            {/* Combined Row for Style & Typography */}
            <div className="flex gap-4">
                {/* 2.1 Style */}
                <div className="space-y-2 flex-1 w-0">
                  <label className="text-xs font-bold text-blue-600">2.1 基础视觉风格</label>
                  <div className="relative group">
                    {/* Visual Layer (Underneath) - Custom styled display */}
                    <div className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-3 flex items-center justify-between transition-colors group-hover:border-blue-300 h-[42px]">
                       <span className="text-xs font-bold text-neutral-700 truncate mr-2 select-none">
                         {selectedStyle}
                       </span>
                       <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    
                    {/* Interaction Layer (On Top) - Invisible Native Select */}
                    <select 
                      value={selectedStyle} 
                      onChange={e => setSelectedStyle(e.target.value as VisualStyle)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    >
                      {Object.values(VisualStyle).map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-blue-50/50 rounded-lg p-2 border border-blue-50 h-16 overflow-y-auto custom-scrollbar-thin">
                    <p className="text-[9px] text-blue-800 font-medium leading-relaxed">
                      {visualStyleDescriptions[selectedStyle]}
                    </p>
                  </div>
                </div>

                {/* 2.2 Typography */}
                <div className="space-y-2 flex-1 w-0">
                  <label className="text-xs font-bold text-blue-600">2.2 页面排版逻辑</label>
                  <div className="relative group">
                     {/* Visual Layer (Underneath) - Custom styled display */}
                     <div className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-3 flex items-center justify-between transition-colors group-hover:border-blue-300 h-[42px]">
                       <span className="text-xs font-bold text-neutral-700 truncate mr-2 select-none">
                         {selectedTypography}
                       </span>
                       <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>

                    {/* Interaction Layer (On Top) - Invisible Native Select */}
                    <select 
                      value={selectedTypography} 
                      onChange={e => setSelectedTypography(e.target.value as TypographyStyle)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    >
                      {Object.values(TypographyStyle).map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-blue-50/50 rounded-lg p-2 border border-blue-50 h-16 overflow-y-auto custom-scrollbar-thin">
                    <p className="text-[9px] text-blue-800 font-medium leading-relaxed">
                      {typographyDescriptions[selectedTypography]}
                    </p>
                  </div>
                </div>
            </div>

            {/* 2.3 Custom */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-600">2.3 个性化需求</label>
              
              {/* Row with 4 items: 3 buttons + 1 input - Equal width */}
              <div className="flex gap-2">
                <button
                  onClick={() => setNeedsModel(!needsModel)}
                  className={`flex-1 w-0 h-9 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                    needsModel ? 'bg-neutral-900 text-white border-neutral-900 shadow-md transform -translate-y-0.5' : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  }`}
                >
                   {needsModel ? '★' : '☆'} 真人模特
                </button>
                <button
                  onClick={() => setNeedsScene(!needsScene)}
                  className={`flex-1 w-0 h-9 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                    needsScene ? 'bg-neutral-900 text-white border-neutral-900 shadow-md transform -translate-y-0.5' : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  }`}
                >
                   {needsScene ? '★' : '☆'} 定制场景
                </button>
                <button
                  onClick={() => setNeedsDataVis(!needsDataVis)}
                  className={`flex-1 w-0 h-9 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                    needsDataVis ? 'bg-neutral-900 text-white border-neutral-900 shadow-md transform -translate-y-0.5' : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  }`}
                >
                   {needsDataVis ? '★' : '☆'} 数据图表
                </button>
                
                <input 
                    value={otherNeeds} 
                    onChange={e=>setOtherNeeds(e.target.value)} 
                    className="flex-1 w-0 h-9 px-2 bg-white border border-neutral-200 rounded-lg text-[10px] focus:border-blue-500 outline-none transition-all placeholder:text-neutral-400" 
                    placeholder="补充要求..."
                  />
              </div>

              {/* Tags for Other Needs - placed below the row */}
              <div className="flex flex-wrap gap-2">
                  {['+ 包含产品', '+ 对比图', '+ 用户评价'].map(tag => (
                      <button key={tag} onClick={() => setOtherNeeds(prev => prev ? `${prev}，${tag.slice(2)}` : tag.slice(2))} className="px-2 py-1 bg-white border border-neutral-200 rounded text-[9px] font-bold text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors">{tag}</button>
                  ))}
              </div>

              {/* Dynamic Detail Inputs */}
              {(needsModel || needsScene) && (
                <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-3 space-y-3 animate-fade-in">
                  {needsModel && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                         <span className="text-[9px] font-bold text-neutral-500">模特特征</span>
                      </div>
                      <input 
                        value={modelDesc}
                        onChange={e => setModelDesc(e.target.value)}
                        placeholder="例: 亚洲年轻女性, 居家服..."
                        className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded text-[10px] outline-none focus:border-blue-500"
                      />
                      <div className="flex flex-wrap gap-1">
                         {modelTags.map(tag => (
                           <button key={tag} onClick={() => setModelDesc(tag)} className="px-1.5 py-0.5 bg-white border border-neutral-100 rounded text-[9px] text-neutral-400 hover:text-blue-600 hover:border-blue-200 transition-colors">{tag}</button>
                         ))}
                      </div>
                    </div>
                  )}
                  
                  {needsModel && needsScene && <div className="border-t border-neutral-200 border-dashed"></div>}

                  {needsScene && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                         <span className="text-[9px] font-bold text-neutral-500">场景风格</span>
                      </div>
                       <input 
                        value={sceneDesc}
                        onChange={e => setSceneDesc(e.target.value)}
                        placeholder="例: 极简纯色, 阳光户外..."
                        className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded text-[10px] outline-none focus:border-blue-500"
                      />
                      <div className="flex flex-wrap gap-1">
                         {sceneTags.map(tag => (
                           <button key={tag} onClick={() => setSceneDesc(tag)} className="px-1.5 py-0.5 bg-white border border-neutral-100 rounded text-[9px] text-neutral-400 hover:text-blue-600 hover:border-blue-200 transition-colors">{tag}</button>
                         ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* 03 Ratio */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
              <h2 className="text-sm font-black text-neutral-800 uppercase tracking-wide">03 方案画面比例</h2>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Object.keys(ratioIcons).map(r => (
                <button 
                  key={r} 
                  onClick={() => setAspectRatio(r)}
                  className={`
                    flex items-center justify-center py-2 rounded-lg border text-[10px] font-bold 
                    transition-all duration-300 ease-out 
                    active:scale-95
                    ${aspectRatio === r 
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-lg scale-105 z-10' 
                      : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300'
                    }
                  `}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Generate Button */}
        <div className="p-6 border-t border-neutral-100">
          <button 
            onClick={startGeneration}
            disabled={generationLoading || images.length === 0}
            className="w-full h-12 bg-gradient-to-r from-[#A78BFA] to-[#C084FC] text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-200 hover:shadow-purple-300 hover:scale-[1.01] active:scale-99 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generationLoading ? (
               <>
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 正在分析与生成...
               </>
            ) : (
               <>
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 生成视觉方案提示词
               </>
            )}
          </button>
        </div>
      </aside>
  );
}