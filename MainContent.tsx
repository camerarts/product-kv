import React from 'react';
import JSZip from 'jszip';
import { RecognitionReport, VisualStyle, TypographyStyle } from './types';

interface MainContentProps {
  checkAuth: () => boolean;
  hasApiKey: boolean;
  manualBrand: string;
  report: RecognitionReport | null;
  selectedStyle: VisualStyle;
  selectedTypography: TypographyStyle;
  finalPrompts: string;
  generatedImages: Record<number, string>;
  generatingModules: Record<number, boolean>;
  previewImageUrl: string | null;
  setPreviewImageUrl: (val: string | null) => void;
  generateSingleImage: (index: number, prompt: string, isLogo: boolean) => void;
  promptModules: { title: string; content: string }[];
  aspectRatio: string;
}

export const MainContent: React.FC<MainContentProps> = ({
  manualBrand, report, selectedStyle, selectedTypography,
  finalPrompts, generatedImages, generatingModules,
  previewImageUrl, setPreviewImageUrl, generateSingleImage,
  promptModules, aspectRatio
}) => {

  const handleDownloadAll = async () => {
    const keys = Object.keys(generatedImages);
    if (keys.length === 0) return alert("暂无生成的图片可下载");

    const zip = new JSZip();
    let count = 0;

    keys.forEach((keyStr) => {
      const index = parseInt(keyStr, 10);
      const dataUri = generatedImages[index];
      if (!dataUri) return;

      const base64Data = dataUri.split(',')[1];
      const moduleInfo = promptModules[index];
      const title = moduleInfo ? moduleInfo.title : `Image_${index + 1}`;
      
      // Clean filename
      const safeTitle = title.replace(/[\/\\?%*:|"<>]/g, '-').trim();
      const filename = `${safeTitle}.jpg`;

      zip.file(filename, base64Data, { base64: true });
      count++;
    });

    if (count === 0) return;

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

  return (
    <main className="flex-1 flex flex-col bg-[#F9FAFB] relative z-10">
        {/* Header */}
        <header className="h-14 px-8 bg-white border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300"></div>
            <h2 className="text-xs font-bold text-neutral-800">生成效果方案预览</h2>
          </div>
          <div className="flex gap-3">
             {/* Placeholder for future header actions if needed */}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
           {/* Report Card */}
           <div className="mb-8 animate-fade-in">
              {/* Cards Container */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 
                 {/* Card 1: Brand Core */}
                 <div className="bg-white rounded-[1.25rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-neutral-100 flex flex-col h-auto min-h-[160px]">
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px]">🏷️</div>
                      <span className="text-[10px] font-bold text-neutral-400">品牌核心</span>
                    </div>
                    
                    {report ? (
                      <div className="animate-fade-in flex-1 flex flex-col">
                        <h4 className="text-2xl font-black text-neutral-900 mb-0.5 tracking-tight truncate">
                          {manualBrand || report.brandName}
                        </h4>
                        <p className="text-xs font-serif italic text-neutral-300 mb-3 tracking-wide truncate">
                          {manualBrand || report.brandName}
                        </p>
                        
                        <div className="mt-auto grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3">
                           <div>
                             <p className="text-[9px] font-bold text-neutral-400 mb-0.5">品类定位</p>
                             <div className="text-[11px] font-bold text-neutral-800 leading-tight line-clamp-2" title={report.productType}>
                                {report.productType}
                             </div>
                           </div>
                           <div>
                             <p className="text-[9px] font-bold text-neutral-400 mb-0.5">驱动人群</p>
                             <div className="text-[11px] font-bold text-neutral-800 leading-tight line-clamp-2" title={report.targetAudience}>
                                {report.targetAudience}
                             </div>
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 opacity-30 mt-2">
                        <div className="h-6 w-3/4 bg-neutral-200 rounded-lg"></div>
                        <div className="h-3 w-1/2 bg-neutral-100 rounded-lg"></div>
                        <div className="pt-4 grid grid-cols-2 gap-4">
                           <div className="space-y-1"><div className="h-2 w-8 bg-neutral-100"></div><div className="h-6 w-full bg-neutral-100 rounded"></div></div>
                           <div className="space-y-1"><div className="h-2 w-8 bg-neutral-100"></div><div className="h-6 w-full bg-neutral-100 rounded"></div></div>
                        </div>
                      </div>
                    )}
                 </div>

                 {/* Card 2: Color DNA */}
                 <div className="bg-white rounded-[1.25rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-neutral-100 flex flex-col h-auto min-h-[160px]">
                    <div className="flex items-center gap-1.5 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-[10px]">🎨</div>
                      <span className="text-[10px] font-bold text-neutral-400">色彩基因</span>
                    </div>
                    
                    {report ? (
                      <div className="flex-1 flex items-center justify-between px-1 animate-fade-in">
                        {/* Main Color */}
                        <div className="flex flex-col items-center text-center gap-2">
                           <div className="w-10 h-10 rounded-full bg-[#96C098] shadow-inner mb-0.5"></div>
                           <div>
                             <p className="text-[10px] font-black text-neutral-900 mb-0 leading-none max-w-[60px] truncate" title={report.mainColors}>
                               {report.mainColors.split(/[,，]/)[0]}
                             </p>
                             <p className="text-[8px] font-bold text-neutral-400 scale-90 origin-top">主本色</p>
                           </div>
                        </div>
                        
                        {/* Aux Color */}
                        <div className="flex flex-col items-center text-center gap-2">
                           <div className="w-10 h-10 rounded-full bg-[#FEF5E7] shadow-inner mb-0.5"></div>
                           <div>
                             <p className="text-[10px] font-black text-neutral-900 mb-0 leading-none max-w-[60px] truncate" title={report.auxColors}>
                               {report.auxColors.split(/[,，]/)[0] || '辅助色'}
                             </p>
                             <p className="text-[8px] font-bold text-neutral-400 scale-90 origin-top">辅助色</p>
                           </div>
                        </div>

                        {/* Accent/Highlight (Simulated) */}
                        <div className="flex flex-col items-center text-center gap-2">
                           <div className="w-10 h-10 rounded-full bg-[#C2C2C2] shadow-inner mb-0.5"></div>
                           <div>
                             <p className="text-[10px] font-black text-neutral-900 mb-0 leading-none">高亮</p>
                             <p className="text-[8px] font-bold text-neutral-400 scale-90 origin-top">点缀色</p>
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex justify-between items-center px-1 opacity-30">
                        {[1,2,3].map(i => (
                          <div key={i} className="flex flex-col items-center gap-2">
                             <div className="w-10 h-10 rounded-full bg-neutral-100"></div>
                             <div className="h-2 w-8 bg-neutral-100 rounded"></div>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>

                 {/* Card 3: Style Direction */}
                 <div className="bg-white rounded-[1.25rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-neutral-100 flex flex-col justify-between h-auto min-h-[160px]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center text-[10px]">✨</div>
                      <span className="text-[10px] font-bold text-neutral-400">风格导向</span>
                    </div>

                    {report ? (
                      <div className="animate-fade-in flex-1 flex flex-col justify-center">
                         <h4 className="text-sm font-black text-neutral-900 leading-snug mb-2">
                            {report.designStyle}
                         </h4>
                         <p className="text-[10px] text-neutral-500 font-medium leading-relaxed mb-3">
                            {report.packagingHighlights || '3D浮雕文字 + 金属质感 (奢华风)'}
                         </p>
                         
                         <div className="mt-auto">
                            <div className="inline-flex items-center gap-1.5 bg-neutral-50 rounded-full pl-2 pr-3 py-1">
                               <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                               <span className="text-[10px] font-bold text-neutral-700">{report.brandTone}</span>
                            </div>
                         </div>
                      </div>
                    ) : (
                      <div className="space-y-3 opacity-30 mt-3">
                        <div className="h-4 w-full bg-neutral-200 rounded"></div>
                        <div className="h-4 w-2/3 bg-neutral-200 rounded"></div>
                        <div className="h-3 w-full bg-neutral-100 rounded mt-2"></div>
                        <div className="mt-auto pt-2">
                           <div className="h-6 w-24 bg-neutral-100 rounded-full"></div>
                        </div>
                      </div>
                    )}
                 </div>
              </div>
           </div>

           {/* Preview Area / Results */}
           {finalPrompts ? (
             <div className="animate-fade-in-up mb-20">
               {/* Section Title & Actions */}
               <div className="flex items-center justify-between mb-4 px-2">
                   <h3 className="text-sm font-black text-neutral-800 tracking-wide uppercase">视觉方案详情</h3>
                   {Object.keys(generatedImages).length > 0 && (
                      <button 
                          onClick={handleDownloadAll}
                          className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-sm"
                      >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4v12"></path></svg>
                          一键下载资源包
                      </button>
                   )}
               </div>

               {/* Grid Layout: 2 Columns on XL screens, 1 Column on smaller */}
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                 {promptModules.map((m, idx) => {
                   const isLogo = m.title.includes("LOGO");
                   return (
                     <div key={idx} className="bg-white rounded-2xl border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow overflow-hidden flex h-52">
                        
                        {/* Col 1: Index (Fixed Width) */}
                        <div className="w-12 bg-neutral-50 border-r border-neutral-100 flex flex-col items-center justify-center shrink-0">
                           <span className="text-xl font-black text-neutral-200 rotate-0">{(idx + 1).toString().padStart(2,'0')}</span>
                        </div>

                        {/* Col 2: Prompt Details (Flexible) */}
                        <div className="flex-1 p-4 flex flex-col min-w-0 border-r border-neutral-100">
                           <div className="mb-2">
                              <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-wide">
                                {m.title}
                              </span>
                           </div>
                           <div className="flex-1 overflow-y-auto custom-scrollbar-thin pr-1">
                              <p className="text-[10px] text-neutral-600 font-medium leading-relaxed whitespace-pre-wrap font-mono">
                                {m.content}
                              </p>
                           </div>
                        </div>

                        {/* Col 3: Visual Preview (Fixed Width) */}
                        <div className="w-40 bg-neutral-50/50 p-3 flex flex-col gap-2 shrink-0">
                           <div 
                              className="flex-1 w-full bg-white rounded-lg border border-neutral-200 overflow-hidden relative group"
                              style={{ 
                                // Basic containment for preview, maintains aspect ratio visually inside the box
                              }}
                           >
                              {generatedImages[idx] ? (
                                <>
                                  <img 
                                    src={generatedImages[idx]} 
                                    className="w-full h-full object-cover cursor-zoom-in" 
                                    onClick={()=>setPreviewImageUrl(generatedImages[idx])} 
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none"></div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300">
                                   {generatingModules[idx] ? (
                                      <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin"></div>
                                   ) : (
                                      <div className="flex flex-col items-center gap-1 opacity-40">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        <span className="text-[8px] font-bold">PREVIEW</span>
                                      </div>
                                   )}
                                </div>
                              )}
                           </div>
                           
                           <button 
                             onClick={() => generateSingleImage(idx, m.content, isLogo)} 
                             disabled={generatingModules[idx]}
                             className="w-full py-2 bg-neutral-900 text-white rounded-md text-[9px] font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors disabled:opacity-50 shadow-sm"
                           >
                             {generatingModules[idx] ? '渲染中...' : '生成视觉'}
                           </button>
                        </div>

                     </div>
                   );
                 })}
               </div>
             </div>
           ) : (
             <div className="border-2 border-dashed border-neutral-200 rounded-[2.5rem] h-[400px] flex flex-col items-center justify-center text-neutral-300 animate-fade-in bg-white/50">
               <span className="text-6xl font-black opacity-10 mb-4 tracking-tighter">PREVIEW</span>
               <span className="text-sm font-bold text-neutral-400">请在左侧上传图片并生成方案</span>
             </div>
           )}
        </div>
      </main>
  );
};