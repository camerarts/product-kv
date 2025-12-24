import React from 'react';
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
}

export const MainContent: React.FC<MainContentProps> = ({
  manualBrand, report, selectedStyle, selectedTypography,
  finalPrompts, generatedImages, generatingModules,
  previewImageUrl, setPreviewImageUrl, generateSingleImage,
  promptModules
}) => {
  return (
    <main className="flex-1 flex flex-col bg-[#F9FAFB] relative z-10">
        {/* Header */}
        <header className="h-16 px-8 bg-white border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300"></div>
            <h2 className="text-sm font-bold text-neutral-800">生成效果方案预览</h2>
          </div>
          {/* Top right buttons are now managed globally in App.tsx */}
          <div className="flex gap-3">
             {/* Placeholder for future header actions if needed */}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
           {/* Report Card */}
           <div className="mb-10 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <h3 className="text-xs font-bold text-neutral-500">【产品报告】</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Card 1: Brand Core */}
                 <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 flex flex-col justify-between h-48">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                      <div className="w-5 h-5 rounded bg-blue-50 text-blue-500 flex items-center justify-center">🏷️</div>
                      品牌核心
                    </div>
                    {report ? (
                      <div className="animate-fade-in">
                        <h4 className="text-2xl font-black text-neutral-900 mb-1 truncate" title={manualBrand || report.brandName}>{manualBrand || report.brandName}</h4>
                        <p className="text-xs text-neutral-400 font-medium italic truncate" title={report.brandName}>{report.brandName}</p>
                      </div>
                    ) : (
                      <div className="space-y-2 opacity-30">
                        <div className="h-6 w-32 bg-neutral-200 rounded"></div>
                        <div className="h-3 w-20 bg-neutral-100 rounded"></div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 border-t border-neutral-50 pt-4">
                       <div>
                         <p className="text-[9px] text-neutral-400 mb-0.5">品类定位</p>
                         <div className={`w-full rounded ${report ? 'text-xs font-bold text-neutral-700 truncate' : 'h-3 bg-neutral-100'}`} title={report?.productType}>
                            {report?.productType}
                         </div>
                       </div>
                       <div>
                         <p className="text-[9px] text-neutral-400 mb-0.5">驱动人群</p>
                         <div className={`w-full rounded ${report ? 'text-xs font-bold text-neutral-700 truncate' : 'h-3 bg-neutral-100'}`} title={report?.targetAudience}>
                            {report?.targetAudience}
                         </div>
                       </div>
                    </div>
                 </div>

                 {/* Card 2: Color DNA */}
                 <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 flex flex-col h-48">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wide mb-4">
                      <div className="w-5 h-5 rounded bg-purple-50 text-purple-500 flex items-center justify-center">🎨</div>
                      色彩基因
                    </div>
                    
                    {report ? (
                      <div className="flex-1 flex flex-col justify-center gap-3 animate-fade-in">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                             <div className="w-2 h-2 rounded-full bg-neutral-800"></div>
                             <span className="text-[9px] text-neutral-400 font-bold">主视觉色</span>
                           </div>
                           <p className="text-xs font-bold text-neutral-800 leading-snug line-clamp-2" title={report.mainColors}>
                             {report.mainColors}
                           </p>
                        </div>
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                             <div className="w-2 h-2 rounded-full bg-neutral-300"></div>
                             <span className="text-[9px] text-neutral-400 font-bold">辅助配色</span>
                           </div>
                           <p className="text-xs font-medium text-neutral-600 leading-snug line-clamp-2" title={report.auxColors}>
                             {report.auxColors}
                           </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex justify-between items-center px-2 pb-2 opacity-30">
                        <div className="flex flex-col items-center gap-3 w-1/3">
                            <div className="w-12 h-12 rounded-full shadow-sm border border-neutral-100 bg-neutral-100"></div>
                        </div>
                        <div className="flex flex-col items-center gap-3 w-1/3">
                            <div className="w-12 h-12 rounded-full shadow-sm border border-neutral-100 bg-neutral-100"></div>
                        </div>
                        <div className="flex flex-col items-center gap-3 w-1/3">
                            <div className="w-12 h-12 rounded-full shadow-sm border border-neutral-100 bg-neutral-100"></div>
                        </div>
                      </div>
                    )}
                 </div>

                 {/* Card 3: Style Direction */}
                 <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 flex flex-col justify-between h-48">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                      <div className="w-5 h-5 rounded bg-orange-50 text-orange-500 flex items-center justify-center">✨</div>
                      风格导向
                    </div>
                    {report ? (
                      <div className="animate-fade-in flex-1 pt-4">
                         <h4 className="text-sm font-black text-neutral-900 leading-relaxed mb-2 line-clamp-3" title={report.designStyle}>
                            {report.designStyle}
                         </h4>
                      </div>
                    ) : (
                      <div className="space-y-2 opacity-30 mt-6">
                        <div className="h-5 w-3/4 bg-neutral-200 rounded"></div>
                        <div className="h-2 w-full bg-neutral-100 rounded"></div>
                        <div className="h-2 w-2/3 bg-neutral-100 rounded"></div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-50 mt-auto">
                       {report?.brandTone && (
                          <div className="h-6 px-3 rounded-full flex items-center bg-neutral-50 text-[10px] font-bold text-neutral-600 border border-neutral-100">
                            {report.brandTone.slice(0, 8)}
                          </div>
                       )}
                       {report?.packagingHighlights && (
                          <div className="h-6 px-3 rounded-full flex items-center bg-neutral-50 text-[10px] font-bold text-neutral-400 border border-neutral-100 truncate max-w-[120px]">
                            {report.packagingHighlights.slice(0, 10)}...
                          </div>
                       )}
                       {!report && (
                         <>
                           <div className="h-6 w-16 bg-neutral-100 rounded-full opacity-30"></div>
                           <div className="h-6 w-12 bg-neutral-100 rounded-full opacity-30"></div>
                         </>
                       )}
                    </div>
                 </div>
              </div>
           </div>

           {/* Preview Area / Results */}
           {finalPrompts ? (
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-fade-in-up pb-20">
               {promptModules.map((m, idx) => {
                 const isLogo = m.title.includes("LOGO");
                 return (
                   <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-neutral-100 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                         <h3 className="text-xs font-black text-neutral-800 uppercase tracking-wider bg-neutral-100 px-2 py-1 rounded">{m.title}</h3>
                         <span className="text-[10px] font-bold text-neutral-300">{(idx + 1).toString().padStart(2,'0')}</span>
                      </div>
                      <div className={`w-full bg-neutral-50 rounded-2xl overflow-hidden relative group ${isLogo ? 'aspect-square' : 'aspect-[16/10]'}`}>
                         {generatedImages[idx] ? (
                           <>
                             <img src={generatedImages[idx]} className="w-full h-full object-cover" onClick={()=>setPreviewImageUrl(generatedImages[idx])} />
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center cursor-zoom-in"></div>
                           </>
                         ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300">
                             {generatingModules[idx] ? <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin"></div> : <span className="text-4xl font-black opacity-20">IMAGE</span>}
                           </div>
                         )}
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-3 h-24 overflow-y-auto custom-scrollbar-thin">
                         <p className="text-[10px] text-neutral-500 font-medium leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      </div>
                      <button 
                        onClick={() => generateSingleImage(idx, m.content, isLogo)} 
                        disabled={generatingModules[idx]}
                        className="w-full py-3 bg-neutral-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                      >
                        {generatingModules[idx] ? '正在渲染...' : '渲染此画面'}
                      </button>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="border-2 border-dashed border-neutral-200 rounded-[2.5rem] h-[500px] flex flex-col items-center justify-center text-neutral-300 animate-fade-in bg-white/50">
               <span className="text-6xl font-black opacity-10 mb-4 tracking-tighter">PREVIEW</span>
               <span className="text-sm font-bold text-neutral-400">请在左侧上传图片并解析</span>
             </div>
           )}
        </div>
      </main>
  );
};