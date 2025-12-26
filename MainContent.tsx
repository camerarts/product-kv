
import React, { useState } from 'react';
import JSZip from 'jszip';
import { RecognitionReport, VisualStyle, TypographyStyle, SyncStatus } from './types';

interface MainContentProps {
  checkAuth: () => boolean;
  hasApiKey: boolean;
  manualBrand: string;
  report: RecognitionReport | null;
  selectedStyle: VisualStyle;
  selectedTypography: TypographyStyle;
  finalPrompts: string;
  generatedImages: Record<number, string>;
  imageSyncStatus?: Record<number, SyncStatus>;
  generatingModules: Record<number, boolean>;
  isBatchGenerating: boolean;
  previewImageUrl: string | null;
  setPreviewImageUrl: (val: string | null) => void;
  generateSingleImage: (index: number, prompt: string, isLogo: boolean) => void;
  generateAllImages: () => void;
  promptModules: { title: string; content: string }[];
  aspectRatio: string;
  projectName: string;
  isSaving: boolean;
  lastSaveTime: number | null;
  onManualSave: () => void; // New Prop
}

// 定义固定的骨架模块结构
const SKELETON_MODULES = [
  { title: "海报01 - 核心主KV", content: "" },
  { title: "海报02 - 使用场景图", content: "" },
  { title: "海报03 - 核心工艺拆解", content: "" },
  { title: "海报04 - 细节质感图01", content: "" },
  { title: "海报05 - 细节质感图02", content: "" },
  { title: "海报06 - 核心功效说明", content: "" },
  { title: "海报07 - 内部结构/成分图", content: "" },
  { title: "海报08 - 品牌情感大片", content: "" },
  { title: "海报09 - 详细参数图", content: "" },
  { title: "海报10 - 使用流程图", content: "" },
];

export const MainContent: React.FC<MainContentProps> = ({
  manualBrand, report, selectedStyle, selectedTypography,
  finalPrompts, generatedImages, imageSyncStatus = {}, generatingModules, isBatchGenerating,
  previewImageUrl, setPreviewImageUrl, generateSingleImage, generateAllImages,
  promptModules, aspectRatio,
  projectName, isSaving, lastSaveTime, onManualSave
}) => {
  
  const [copiedStates, setCopiedStates] = useState<Record<number, boolean>>({});

  const handleCopy = async (text: string, index: number) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [index]: true }));
      setTimeout(() => {
        setCopiedStates(prev => {
           const next = { ...prev };
           delete next[index];
           return next;
        });
      }, 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const handleDownloadSingle = (e: React.MouseEvent, dataUri: string, title: string) => {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = dataUri;
    const safeTitle = title.replace(/[\/\\?%*:|"<>]/g, '-').trim();
    a.download = `${safeTitle}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = async () => {
    const keys = Object.keys(generatedImages);
    if (keys.length === 0) return alert("暂无生成的图片可下载");

    const zip = new JSZip();
    let count = 0;
    
    // Create an array of promises to handle async fetching if needed
    const promises = keys.map(async (keyStr) => {
      const index = parseInt(keyStr, 10);
      const dataUriOrUrl = generatedImages[index];
      if (!dataUriOrUrl) return;

      const moduleInfo = promptModules[index] || SKELETON_MODULES[index];
      const title = moduleInfo ? moduleInfo.title : `Image_${index + 1}`;
      
      const safeTitle = title.replace(/[\/\\?%*:|"<>]/g, '-').trim();
      const filename = `${safeTitle}.jpg`;

      try {
          if (dataUriOrUrl.startsWith('data:')) {
              // Case 1: Base64 Data URI
              const base64Data = dataUriOrUrl.split(',')[1];
              zip.file(filename, base64Data, { base64: true });
              count++;
          } else {
              // Case 2: Remote URL (synced image)
              const response = await fetch(dataUriOrUrl);
              if (response.ok) {
                  const blob = await response.blob();
                  zip.file(filename, blob);
                  count++;
              } else {
                  console.error(`Failed to fetch image for download: ${dataUriOrUrl}`);
              }
          }
      } catch (e) {
          console.error(`Error processing image ${filename}`, e);
      }
    });

    // Wait for all images to be processed/fetched
    await Promise.all(promises);

    if (count === 0) {
        alert("图片下载失败，无法获取图片数据");
        return;
    }

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${manualBrand || 'vision_system'}_images.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error("Zip generation failed", e);
      alert("打包下载失败，请重试");
    }
  };

  const isGeneratingAny = Object.values(generatingModules).some(v => v);
  
  // 如果有生成的 Prompt，使用生成的；否则使用骨架
  const modulesToRender = promptModules.length > 0 ? promptModules : SKELETON_MODULES;
  const hasContent = promptModules.length > 0;

  // Calculate Stats
  const generatedCount = Object.keys(generatedImages).length;
  const uploadedCount = Object.values(imageSyncStatus).filter(s => s === 'synced').length;
  const unsyncedCount = Object.values(imageSyncStatus).filter(s => s === 'unsynced').length;

  return (
    <main className="flex-1 ml-[550px] flex flex-col h-full relative z-10 overflow-hidden">
        
        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between shrink-0">
          <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse"></div>
            <h2 className="text-xs font-bold text-slate-700">生成效果预览</h2>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-700 max-w-[200px] truncate">{projectName}</span>
                  <div className="flex items-center gap-3 mt-1">
                      {/* Manual Upload Button */}
                      <button
                        onClick={onManualSave}
                        disabled={isSaving}
                        className={`
                            flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all shadow-sm
                            ${isSaving 
                                ? 'bg-slate-100 text-slate-400 border-transparent cursor-not-allowed' 
                                : 'bg-white/60 border-white/60 text-indigo-600 hover:bg-white hover:text-indigo-700 hover:shadow-md cursor-pointer active:scale-95'
                            }
                        `}
                        title={isSaving ? "正在同步中..." : "点击强制同步数据到云端"}
                      >
                         {isSaving ? (
                             <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                         ) : (
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                         )}
                         <span>{isSaving ? '同步中' : '手工上传'}</span>
                      </button>

                      <div className="w-px h-3 bg-slate-300/50"></div>

                      {/* Status Indicator */}
                      <div className="flex items-center gap-1.5">
                          {isSaving ? (
                              <>
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                <span className="text-[10px] text-slate-400 font-medium">自动保存...</span>
                              </>
                          ) : (
                              <>
                                <div className={`w-1.5 h-1.5 rounded-full ${lastSaveTime ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`}></div>
                                <span className="text-[10px] text-slate-400 font-medium font-mono">
                                    {lastSaveTime ? `${new Date(lastSaveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '未保存'}
                                </span>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar">
           {/* Report Section */}
           <div className="mb-8 animate-fade-in-up">
              <h3 className="text-xs font-black text-slate-500 tracking-widest uppercase mb-4 pl-2 opacity-80">洞察报告</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                 
                 {/* Card 1: Brand Core */}
                 <div className="glass-card rounded-[2rem] p-6 flex flex-col h-auto min-h-[180px] hover:bg-white/50 transition-colors duration-300 group">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100/50 text-blue-600 flex items-center justify-center text-xs shadow-inner">🏷️</div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">品牌核心</span>
                    </div>
                    
                    {report ? (
                      <div className="animate-fade-in flex-1 flex flex-col">
                        <h4 className="text-3xl font-black text-slate-800 mb-1 tracking-tight truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-indigo-600 transition-all">
                          {manualBrand || report.brandName}
                        </h4>
                        
                        <div className="mt-auto grid grid-cols-2 gap-4 border-t border-slate-200/50 pt-4">
                           <div>
                             <p className="text-[9px] font-bold text-slate-400 mb-1">品类定位</p>
                             <div className="text-xs font-bold text-slate-700 leading-tight" title={report.productType}>
                                {report.productType}
                             </div>
                           </div>
                           <div>
                             <p className="text-[9px] font-bold text-slate-400 mb-1">目标人群</p>
                             <div className="text-xs font-bold text-slate-700 leading-tight" title={report.targetAudience}>
                                {report.targetAudience}
                             </div>
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 opacity-30 mt-2">
                        <div className="h-8 w-3/4 bg-slate-200 rounded-xl"></div>
                        <div className="pt-6 grid grid-cols-2 gap-4">
                           <div className="space-y-2"><div className="h-2 w-8 bg-slate-200"></div><div className="h-4 w-full bg-slate-200 rounded-lg"></div></div>
                           <div className="space-y-2"><div className="h-2 w-8 bg-slate-200"></div><div className="h-4 w-full bg-slate-200 rounded-lg"></div></div>
                        </div>
                      </div>
                    )}
                 </div>

                 {/* Card 2: Color DNA */}
                 <div className="glass-card rounded-[2rem] p-6 flex flex-col h-auto min-h-[180px] hover:bg-white/50 transition-colors duration-300">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-8 h-8 rounded-full bg-purple-100/50 text-purple-600 flex items-center justify-center text-xs shadow-inner">🎨</div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">色彩基因</span>
                    </div>
                    
                    {report ? (
                      <div className="flex-1 flex items-center justify-around px-2 animate-fade-in">
                        {/* Main Color */}
                        <div className="flex flex-col items-center gap-3 group">
                           <div className="w-14 h-14 rounded-full bg-[#96C098] shadow-lg ring-4 ring-white/40 group-hover:scale-110 transition-transform duration-300"></div>
                           <div className="text-center">
                             <p className="text-[10px] font-bold text-slate-800 mb-0.5 truncate max-w-[80px]" title={report.mainColors}>
                               {report.mainColors.split(/[,，]/)[0]}
                             </p>
                             <p className="text-[8px] font-bold text-slate-400">主本色</p>
                           </div>
                        </div>
                        
                        {/* Aux Color */}
                        <div className="flex flex-col items-center gap-3 group">
                           <div className="w-14 h-14 rounded-full bg-[#FEF5E7] shadow-lg ring-4 ring-white/40 group-hover:scale-110 transition-transform duration-300"></div>
                           <div className="text-center">
                             <p className="text-[10px] font-bold text-slate-800 mb-0.5 truncate max-w-[80px]" title={report.auxColors}>
                               {report.auxColors.split(/[,，]/)[0] || '辅助色'}
                             </p>
                             <p className="text-[8px] font-bold text-slate-400">辅助色</p>
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex justify-around items-center px-2 opacity-30">
                        {[1,2].map(i => (
                          <div key={i} className="flex flex-col items-center gap-3">
                             <div className="w-14 h-14 rounded-full bg-slate-200"></div>
                             <div className="h-2 w-10 bg-slate-200 rounded"></div>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>

                 {/* Card 3: Style Direction */}
                 <div className="glass-card rounded-[2rem] p-6 flex flex-col justify-between h-auto min-h-[180px] hover:bg-white/50 transition-colors duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-orange-100/50 text-orange-500 flex items-center justify-center text-xs shadow-inner">✨</div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">风格定调</span>
                    </div>

                    {report ? (
                      <div className="animate-fade-in flex-1 flex flex-col justify-center">
                         <h4 className="text-base font-black text-slate-800 leading-snug mb-2">
                            {report.designStyle || '暂无风格定义'}
                         </h4>
                         <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-4 line-clamp-2">
                            {report.packagingHighlights || '暂无更多细节描述'}
                         </p>
                         
                         <div className="mt-auto space-y-3">
                            <div className="inline-flex items-center gap-2 bg-slate-50/80 rounded-full pl-2 pr-3 py-1 border border-white/50 shadow-sm">
                               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                               <span className="text-[10px] font-bold text-slate-700">{report.brandTone || '通用'}</span>
                            </div>
                         </div>
                      </div>
                    ) : (
                      <div className="space-y-3 opacity-30 mt-4">
                        <div className="h-5 w-full bg-slate-200 rounded-lg"></div>
                        <div className="h-4 w-2/3 bg-slate-200 rounded-lg"></div>
                        <div className="mt-auto pt-4">
                           <div className="h-6 w-24 bg-slate-100 rounded-full"></div>
                        </div>
                      </div>
                    )}
                 </div>
              </div>
           </div>

           {/* Preview Area / Results */}
           <div className="animate-fade-in-up mb-20">
               {/* Section Title & Actions & Stats */}
               <div className="flex items-center justify-between mb-5 pl-2 pr-2">
                   <div className="flex items-center gap-4">
                       <h3 className="text-xs font-black text-slate-500 tracking-widest uppercase opacity-80">商品详情图片</h3>
                       
                       {/* Image Statistics */}
                       {generatedCount > 0 && (
                          <div className="flex items-center gap-3 px-3 py-1.5 bg-white/40 rounded-full border border-white/50 shadow-sm backdrop-blur-sm animate-fade-in">
                              <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                  <span className="text-[10px] font-bold text-slate-500">已生成 <span className="text-slate-800 font-black">{generatedCount}</span> 张</span>
                              </div>
                              <div className="w-px h-3 bg-slate-300/50"></div>
                              <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                  <span className="text-[10px] font-bold text-slate-500">已上传 <span className="text-green-600 font-black">{uploadedCount}</span> 张</span>
                              </div>
                              <div className="w-px h-3 bg-slate-300/50"></div>
                              <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                  <span className="text-[10px] font-bold text-slate-500">未上传 <span className="text-orange-600 font-black">{unsyncedCount}</span> 张</span>
                              </div>
                          </div>
                       )}
                   </div>
                   
                   <div className="flex items-center gap-3">
                      {hasContent && (
                        <button
                           onClick={generateAllImages}
                           disabled={isBatchGenerating}
                           className={`liquid-button px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg ${
                             isBatchGenerating 
                               ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                               : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-indigo-500/30 hover:scale-[1.02]'
                           }`}
                        >
                            {isBatchGenerating ? (
                               <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            )}
                            {isBatchGenerating ? '生成中...' : '一键生成'}
                        </button>
                      )}

                      {Object.keys(generatedImages).length > 0 && (
                          <button 
                              onClick={handleDownloadAll}
                              className="liquid-button px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg"
                          >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4v12"></path></svg>
                              打包下载
                          </button>
                      )}
                   </div>
               </div>

               {/* Grid Layout */}
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                 {modulesToRender.map((m, idx) => {
                   const isLogo = m.title.includes("LOGO");
                   const isSynced = imageSyncStatus[idx] === 'synced';
                   const isUnsynced = imageSyncStatus[idx] === 'unsynced';
                   
                   // 检查是否是骨架屏状态 (即内容为空)
                   const isEmpty = !m.content;

                   return (
                     <div key={idx} className="glass-card rounded-[2rem] border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex h-60 group hover:-translate-y-1">
                        
                        {/* Col 1: Index */}
                        <div className="w-14 bg-white/30 border-r border-white/40 flex flex-col items-center justify-center shrink-0 backdrop-blur-sm">
                           <span className="text-2xl font-black text-slate-300 rotate-0 group-hover:text-indigo-300 transition-colors">{(idx + 1).toString().padStart(2,'0')}</span>
                        </div>

                        {/* Col 2: Prompt Details */}
                        {/* 添加了 bg-slate-50/50 来修复背景色问题，确保文字清晰且与页面流体背景区分 */}
                        <div className="flex-1 p-5 flex flex-col min-w-0 border-r border-white/40 relative bg-slate-50/50">
                           <div className="mb-3 flex items-center justify-between gap-2">
                              <span className="inline-block px-2.5 py-1 bg-blue-50/80 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wide truncate border border-blue-100">
                                {m.title}
                              </span>
                              {hasContent && (
                                <button 
                                  onClick={() => handleCopy(m.content, idx)}
                                  className="text-slate-300 hover:text-blue-600 transition-colors p-1.5 hover:bg-blue-50 rounded-lg"
                                >
                                  {copiedStates[idx] ? (
                                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                  ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                  )}
                                </button>
                              )}
                           </div>
                           <div className="flex-1 overflow-y-auto custom-scrollbar-thin pr-1">
                              {isEmpty ? (
                                  // 骨架屏 Loading 效果
                                  <div className="space-y-2 pt-2 animate-pulse">
                                      <div className="h-2 bg-slate-200 rounded w-full"></div>
                                      <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                                      <div className="h-2 bg-slate-200 rounded w-4/6"></div>
                                  </div>
                              ) : (
                                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed whitespace-pre-wrap font-mono">
                                    {m.content}
                                  </p>
                              )}
                           </div>
                        </div>

                        {/* Col 3: Visual Preview */}
                        <div className="w-48 bg-white/20 p-4 flex flex-col gap-3 shrink-0 backdrop-blur-sm">
                           <div 
                              className="flex-1 w-full bg-slate-100/50 rounded-2xl border border-white/50 overflow-hidden relative group/img shadow-inner flex items-center justify-center"
                           >
                              {generatedImages[idx] ? (
                                <>
                                  <img 
                                    src={generatedImages[idx]} 
                                    className="w-full h-full object-contain cursor-zoom-in transition-transform duration-700 group-hover/img:scale-105" 
                                    onClick={()=>setPreviewImageUrl(generatedImages[idx])} 
                                  />
                                  <button 
                                     onClick={(e) => handleDownloadSingle(e, generatedImages[idx], m.title)}
                                     className="absolute bottom-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-xl backdrop-blur-md opacity-0 group-hover/img:opacity-100 transition-all z-30 transform translate-y-2 group-hover/img:translate-y-0"
                                     title="下载图片"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4v12"></path></svg>
                                  </button>
                                  <div className="absolute top-2 left-2 z-20">
                                     {isSynced && (
                                         <div className="w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white shadow-sm animate-pulse"></div>
                                     )}
                                     {isUnsynced && (
                                         <div className="w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-white shadow-sm"></div>
                                     )}
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                   {generatingModules[idx] ? (
                                      <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
                                   ) : (
                                      <div className="flex flex-col items-center gap-1 opacity-50">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                      </div>
                                   )}
                                </div>
                              )}
                           </div>
                           
                           <button 
                             onClick={() => generateSingleImage(idx, m.content, isLogo)} 
                             disabled={generatingModules[idx] || isEmpty}
                             className={`liquid-button w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors shadow-lg ${
                                 isEmpty 
                                 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                 : 'bg-slate-800 text-white hover:bg-black'
                             }`}
                           >
                             {generatingModules[idx] ? '渲染中...' : '渲染'}
                           </button>
                        </div>

                     </div>
                   );
                 })}
               </div>
           </div>
        </div>
      </main>
  );
};
