
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { extractProductInfo, generatePosterSystem } from './geminiService';
import { VisualStyle, TypographyStyle, RecognitionReport } from './types';

const App: React.FC = () => {
  // --- 鉴权状态 ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');

  // 风格与排版描述映射
  const visualStyleDescriptions: Record<VisualStyle, string> = {
    [VisualStyle.MAGAZINE]: '高端时尚杂志排版，强调大图视觉张力、精致留白与现代感。适合奢侈品、美妆。',
    [VisualStyle.WATERCOLOR]: '艺术感水彩笔触，营造温润、通透且具有手工质感的视觉体验。适合护肤、食品。',
    [VisualStyle.TECH]: '硬核工业设计与数字化线条，展现产品的高科技与领先力。适合3C数码、家电。',
    [VisualStyle.RETRO]: '经典胶片颗粒感与复古影调，赋予产品时间沉淀的厚重感。适合复古穿搭、酒类。',
    [VisualStyle.NORDIC]: '极简主义北欧风，高冷色调配合纯净构图，透出天然的高级感。适合家居、日用品。',
    [VisualStyle.NEON]: '强烈的霓虹发光色调，赛博朋克视觉风格，极具潮流冲击力。适合潮牌、游戏设备。',
    [VisualStyle.NATURAL]: '通透的自然光影，强调产品的真实性、有机感与生活气息。适合生鲜、原生态产品。'
  };

  const typographyDescriptions: Record<TypographyStyle, string> = {
    [TypographyStyle.SERIF_GRID]: '经典报刊网格系统，粗衬线标题极具权威感，排版严谨专业。',
    [TypographyStyle.GLASS_MODERN]: '现代毛玻璃拟态效果，半透明卡片与大圆角，视觉轻盈通透。',
    [TypographyStyle.LUXURY_3D]: '沉稳大气的立体浮雕文字，配合金属质感，彰显卓越品质。',
    [TypographyStyle.WATERCOLOR_ART]: '灵动的手写标注与不规则排版，充满人文气息与艺术温度。',
    [TypographyStyle.NEON_CYBER]: '电子发光字效果，强对比色彩，适合前卫、数码类产品。',
    [TypographyStyle.MINIMAL_LINE]: '极度克制的线条勾勒，大量留白，展现理性的极简工业之美。'
  };

  useEffect(() => {
    const loginStatus = sessionStorage.getItem('APP_IS_LOGGED_IN') === 'true';
    setIsLoggedIn(loginStatus);
  }, []);

  const handleLogin = () => {
    if (loginPassword === '123') {
      setIsLoggedIn(true);
      sessionStorage.setItem('APP_IS_LOGGED_IN', 'true');
      setIsLoginOpen(false);
      setLoginPassword('');
    } else {
      alert('访问密码错误');
    }
  };

  const handleLogout = () => {
    if (confirm('确认退出登录？')) {
      setIsLoggedIn(false);
      sessionStorage.removeItem('APP_IS_LOGGED_IN');
    }
  };

  const checkAuth = () => {
    if (!isLoggedIn) {
      setIsLoginOpen(true);
      return false;
    }
    return true;
  };

  // --- 核心业务状态 ---
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [generationLoading, setGenerationLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imageRatios, setImageRatios] = useState<number[]>([]);
  const [description, setDescription] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [report, setReport] = useState<RecognitionReport | null>(null);
  
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(VisualStyle.NORDIC);
  const [selectedTypography, setSelectedTypography] = useState<TypographyStyle>(TypographyStyle.MINIMAL_LINE);
  
  const [finalPrompts, setFinalPrompts] = useState<string>('');
  const [needsModel, setNeedsModel] = useState(false);
  const [needsScene, setNeedsScene] = useState(false);
  const [needsDataVis, setNeedsDataVis] = useState(false);
  const [otherNeeds, setOtherNeeds] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string>("9:16");

  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [generatingModules, setGeneratingModules] = useState<Record<number, boolean>>({});
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const ratioIcons: Record<string, string> = {
    "1:1": "1:1",
    "16:9": "16:9",
    "9:16": "9:16",
    "3:4": "3:4",
    "4:3": "4:3",
    "2:3": "2:3",
    "3:2": "3:2"
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const img = new Image();
        img.onload = () => {
          setImages(prev => [...prev, base64.split(',')[1]]);
          setImageRatios(prev => [...prev, img.width / img.height]);
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    });
  };

  const startExtraction = async () => {
    if (!checkAuth()) return;
    if (images.length === 0) return alert('请上传产品图片');
    setExtractionLoading(true);
    try {
      // Corrected call: removed manualApiKey
      const res = await extractProductInfo(images, description);
      setReport(res);
      if (!manualBrand && res.brandName) setManualBrand(res.brandName);
    } catch (err: any) {
      alert(`分析失败: ${err.message}`);
    } finally { setExtractionLoading(false); }
  };

  const startGeneration = async () => {
    if (!checkAuth()) return;
    if (!report) return alert('请先解析产品报告');
    setGenerationLoading(true);
    try {
      const combinedNeeds = [
        needsModel ? `需要真人模特` : '',
        needsScene ? `需要定制场景` : '',
        needsDataVis ? '需要数据可视化图表' : '',
        otherNeeds
      ].filter(Boolean).join('；');
      // Corrected call: removed manualApiKey
      const res = await generatePosterSystem({ ...report, brandName: manualBrand || report.brandName }, selectedStyle, selectedTypography, combinedNeeds);
      setFinalPrompts(res);
    } catch (err: any) {
      alert(`生成失败: ${err.message}`);
    } finally { setGenerationLoading(false); }
  };

  const generateSingleImage = async (index: number, prompt: string, isLogo: boolean = false) => {
    if (!checkAuth()) return;
    const targetRatio = isLogo ? "1:1" : aspectRatio;
    setGeneratingModules(prev => ({ ...prev, [index]: true }));
    try {
      // Use process.env.API_KEY exclusively
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { 
          parts: [
            ...images.map(img => ({ inlineData: { data: img, mimeType: 'image/jpeg' } })), 
            { text: `高端电商摄影风格。还原参考图产品。场景描述：${prompt}。比例：${targetRatio}。电影级光影。` }
          ] 
        },
        config: { imageConfig: { aspectRatio: targetRatio as any } }
      });
      const data = response.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
      if (data) setGeneratedImages(prev => ({ ...prev, [index]: `data:image/png;base64,${data}` }));
    } catch (err: any) {
      alert(`渲染失败: ${err?.message}`);
    } finally { setGeneratingModules(prev => ({ ...prev, [index]: false })); }
  };

  const promptModules = useMemo(() => {
    if (!finalPrompts) return [];
    return finalPrompts.split(/###\s+/).filter(Boolean).map(s => {
      const lines = s.split('\n');
      return { title: lines[0].trim(), content: lines.slice(1).join('\n').trim() };
    });
  }, [finalPrompts]);

  return (
    <div className="h-screen flex bg-white text-neutral-900 font-sans selection:bg-purple-100 overflow-hidden">
      {/* --- Left Sidebar --- */}
      <aside className="w-[400px] border-r border-neutral-100 bg-white flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <h1 className="text-xl font-black text-blue-600 tracking-tight mb-1">电商详情图视觉全案系统</h1>
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
            
            <div className="flex gap-3 h-28">
              <div className="w-28 h-28 shrink-0 bg-neutral-50 border border-neutral-200 border-dashed rounded-xl flex flex-col items-center justify-center relative hover:border-blue-500 transition-colors cursor-pointer group">
                 {images.length > 0 ? (
                   <>
                     <img src={`data:image/jpeg;base64,${images[0]}`} className="w-full h-full object-contain rounded-xl p-1" />
                     <button onClick={(e) => {e.stopPropagation(); setImages([]); setImageRatios([]);}} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                   </>
                 ) : (
                   <>
                     <svg className="w-6 h-6 text-neutral-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                     <span className="text-[10px] text-neutral-400 font-medium">上传主图</span>
                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
                   </>
                 )}
              </div>
              <div className="flex-1 w-28 h-28 shrink-0 bg-neutral-50 border border-neutral-200 border-dashed rounded-xl flex flex-col items-center justify-center relative hover:border-blue-500 transition-colors cursor-pointer group">
                 {images.length > 1 ? (
                    <>
                     <img src={`data:image/jpeg;base64,${images[1]}`} className="w-full h-full object-contain rounded-xl p-1" />
                     <button onClick={(e) => {e.stopPropagation(); setImages(prev=>[prev[0]]); setImageRatios(prev=>[prev[0]]);}} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                   </>
                 ) : (
                   <>
                    <span className="text-[10px] text-neutral-300 font-medium">添加第二张</span>
                    {images.length > 0 && <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />}
                   </>
                 )}
              </div>
            </div>

            <input 
              value={description} 
              onChange={e=>setDescription(e.target.value)} 
              className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-lg text-xs focus:border-blue-500 outline-none transition-all placeholder:text-neutral-300" 
              placeholder="粘贴或输入产品说明..."
            />
            
            <div className="flex gap-2">
               <div className="w-1/3 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 flex items-center">
                 <span className="text-[10px] font-bold text-neutral-500 shrink-0 mr-2 bg-neutral-200 px-1.5 py-0.5 rounded">品牌</span>
                 <input className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-neutral-300" placeholder="品牌名" value={manualBrand} onChange={e=>setManualBrand(e.target.value)} />
               </div>
               <button 
                  onClick={startExtraction}
                  disabled={extractionLoading}
                  className="flex-1 bg-gradient-to-r from-[#A78BFA] to-[#C084FC] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
               >
                 {extractionLoading ? (
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 ) : (
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                 )}
                 解析产品报告
               </button>
            </div>
          </section>

          {/* 02 Style Definition */}
          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
              <h2 className="text-sm font-black text-neutral-800 uppercase tracking-wide">02 视觉风格定义</h2>
            </div>

            {/* 2.1 Style */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-600">2.1 基础视觉风格</label>
              <div className="relative group">
                <select 
                  value={selectedStyle} 
                  onChange={e => setSelectedStyle(e.target.value as VisualStyle)}
                  className="w-full appearance-none bg-white border border-neutral-200 rounded-lg px-4 py-3 text-xs font-bold text-neutral-700 outline-none focus:border-blue-500 transition-all cursor-pointer hover:border-blue-300"
                >
                  {Object.values(VisualStyle).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none text-neutral-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-50">
                <p className="text-[10px] text-blue-800 font-medium leading-relaxed">
                  <span className="font-bold text-blue-600 mr-1">风格特征:</span>
                  {visualStyleDescriptions[selectedStyle]}
                </p>
              </div>
            </div>

            {/* 2.2 Typography */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-600">2.2 页面排版逻辑</label>
              <div className="relative group">
                <select 
                  value={selectedTypography} 
                  onChange={e => setSelectedTypography(e.target.value as TypographyStyle)}
                  className="w-full appearance-none bg-white border border-neutral-200 rounded-lg px-4 py-3 text-xs font-bold text-neutral-700 outline-none focus:border-blue-500 transition-all cursor-pointer hover:border-blue-300"
                >
                  {Object.values(TypographyStyle).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none text-neutral-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-50">
                <p className="text-[10px] text-blue-800 font-medium leading-relaxed">
                  <span className="font-bold text-blue-600 mr-1">排版特征:</span>
                  {typographyDescriptions[selectedTypography]}
                </p>
              </div>
            </div>

            {/* 2.3 Custom */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-600">2.3 个性化需求</label>
              <div className="flex gap-2">
                <button onClick={()=>setNeedsModel(!needsModel)} className={`flex-1 py-2 rounded-lg border text-[10px] font-bold transition-all ${needsModel ? 'bg-white border-neutral-900 text-neutral-900 shadow-sm' : 'bg-neutral-50 border-neutral-100 text-neutral-400'}`}>真人模特</button>
                <button onClick={()=>setNeedsScene(!needsScene)} className={`flex-1 py-2 rounded-lg border text-[10px] font-bold transition-all ${needsScene ? 'bg-white border-neutral-900 text-neutral-900 shadow-sm' : 'bg-neutral-50 border-neutral-100 text-neutral-400'}`}>定制场景</button>
                <button onClick={()=>setNeedsDataVis(!needsDataVis)} className={`flex-1 py-2 rounded-lg border text-[10px] font-bold transition-all ${needsDataVis ? 'bg-white border-neutral-900 text-neutral-900 shadow-sm' : 'bg-neutral-50 border-neutral-100 text-neutral-400'}`}>数据可视化</button>
              </div>
              <input 
                value={otherNeeds} 
                onChange={e=>setOtherNeeds(e.target.value)} 
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg text-[10px] focus:border-blue-500 outline-none transition-all placeholder:text-neutral-400" 
                placeholder="其他具体要求..."
              />
              <div className="flex flex-wrap gap-2 pt-1">
                 {['+ 必须包含产品实物', '+ 需要对比图', '+ 需要用户评价'].map(tag => (
                   <button key={tag} onClick={() => setOtherNeeds(prev => prev ? `${prev}，${tag.slice(2)}` : tag.slice(2))} className="px-2 py-1 bg-white border border-neutral-200 rounded text-[9px] font-bold text-neutral-500 hover:border-neutral-400 transition-colors">{tag}</button>
                 ))}
              </div>
            </div>
          </section>

          {/* 03 Ratio */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
              <h2 className="text-sm font-black text-neutral-800 uppercase tracking-wide">03 方案画面比例</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(ratioIcons).map(r => (
                <button 
                  key={r} 
                  onClick={() => setAspectRatio(r)}
                  className={`px-3 py-2 rounded-lg border text-[10px] font-bold transition-all ${aspectRatio === r ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'}`}
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
            disabled={generationLoading || !report}
            className="w-full h-12 bg-gradient-to-r from-[#A78BFA] to-[#C084FC] text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-200 hover:shadow-purple-300 hover:scale-[1.01] active:scale-99 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generationLoading ? (
               <>
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 正在生成...
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

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col bg-[#F9FAFB] relative z-10">
        {/* Header */}
        <header className="h-16 px-8 bg-white border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300"></div>
            <h2 className="text-sm font-bold text-neutral-800">生成效果方案预览</h2>
          </div>
          <div className="flex gap-3">
             <button onClick={isLoggedIn ? handleLogout : () => setIsLoginOpen(true)} className="px-6 py-1.5 bg-black text-white rounded-full text-[10px] font-bold hover:bg-neutral-800 transition-colors flex items-center gap-1.5">
               {isLoggedIn ? (
                 <>
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                   已登录
                 </>
               ) : (
                 <>
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                   登录
                 </>
               )}
             </button>
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
                 {/* Card 1 */}
                 <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 flex flex-col justify-between h-48">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                      <div className="w-5 h-5 rounded bg-blue-50 text-blue-500 flex items-center justify-center">🏷️</div>
                      品牌核心
                    </div>
                    {report ? (
                      <div className="animate-fade-in">
                        <h4 className="text-2xl font-black text-neutral-900 mb-1">{manualBrand || report.brandName}</h4>
                        <p className="text-xs text-neutral-400 font-medium italic">{report.brandName}</p>
                      </div>
                    ) : (
                      <div className="space-y-2 opacity-30">
                        <div className="h-6 w-32 bg-neutral-200 rounded"></div>
                        <div className="h-3 w-20 bg-neutral-100 rounded"></div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 border-t border-neutral-50 pt-4">
                       <div><p className="text-[9px] text-neutral-400 mb-0.5">品类定位</p><div className={`h-3 w-full rounded ${report ? 'text-xs font-bold text-neutral-700' : 'bg-neutral-100'}`}>{report?.productType}</div></div>
                       <div><p className="text-[9px] text-neutral-400 mb-0.5">驱动人群</p><div className={`h-3 w-full rounded ${report ? 'text-xs font-bold text-neutral-700' : 'bg-neutral-100'}`}>{report?.targetAudience}</div></div>
                    </div>
                 </div>

                 {/* Card 2 */}
                 <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 flex flex-col h-48">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wide mb-6">
                      <div className="w-5 h-5 rounded bg-purple-50 text-purple-500 flex items-center justify-center">🎨</div>
                      色彩基因
                    </div>
                    {report ? (
                      <div className="flex justify-between px-2 animate-fade-in">
                        <div className="text-center"><div className="w-12 h-12 rounded-full border border-neutral-100 shadow-sm mb-2 mx-auto" style={{backgroundColor: '#E5E7EB'}}></div><p className="text-[9px] text-neutral-500 font-bold">主本色</p></div>
                        <div className="text-center"><div className="w-12 h-12 rounded-full border border-neutral-100 shadow-sm mb-2 mx-auto" style={{backgroundColor: '#F3F4F6'}}></div><p className="text-[9px] text-neutral-500 font-bold">辅助色</p></div>
                        <div className="text-center"><div className="w-12 h-12 rounded-full border border-neutral-100 shadow-sm mb-2 mx-auto" style={{backgroundColor: '#D1D5DB'}}></div><p className="text-[9px] text-neutral-500 font-bold">点缀色</p></div>
                      </div>
                    ) : (
                      <div className="flex justify-between px-4 opacity-30">
                        <div className="w-12 h-12 rounded-full bg-neutral-100"></div>
                        <div className="w-12 h-12 rounded-full bg-neutral-100"></div>
                        <div className="w-12 h-12 rounded-full bg-neutral-100"></div>
                      </div>
                    )}
                    <div className="mt-auto flex justify-between text-[9px] text-neutral-300">
                       <span>主本色</span><span>辅助色</span><span>点缀色</span>
                    </div>
                 </div>

                 {/* Card 3 */}
                 <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 flex flex-col justify-between h-48">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                      <div className="w-5 h-5 rounded bg-orange-50 text-orange-500 flex items-center justify-center">✨</div>
                      风格导向
                    </div>
                    {report ? (
                      <div className="animate-fade-in">
                         <h4 className="text-lg font-black text-neutral-900 leading-tight mb-2">{selectedStyle.split(' ')[1]}</h4>
                         <p className="text-[10px] text-neutral-500 font-bold">{selectedTypography.split(' ')[1]}</p>
                      </div>
                    ) : (
                      <div className="space-y-2 opacity-30">
                        <div className="h-5 w-3/4 bg-neutral-200 rounded"></div>
                        <div className="h-2 w-full bg-neutral-100 rounded"></div>
                        <div className="h-2 w-2/3 bg-neutral-100 rounded"></div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                       <div className={`h-6 px-3 rounded-full flex items-center text-[10px] font-bold ${report ? 'bg-neutral-50 text-neutral-600' : 'bg-neutral-50 w-20'}`}>{report?.brandTone.slice(0,6)}</div>
                       <div className={`h-6 px-3 rounded-full flex items-center text-[10px] font-bold ${report ? 'bg-neutral-50 text-neutral-600' : 'bg-neutral-50 w-16'}`}>...</div>
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

      {/* --- Login Modal --- */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-6" onClick={() => setIsLoginOpen(false)}>
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 animate-scale-up text-center" onClick={e=>e.stopPropagation()}>
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🔒</div>
              <h3 className="text-xl font-black text-neutral-900 mb-2">系统登录</h3>
              <p className="text-xs text-neutral-500 mb-6">请输入访问密码以解锁完整功能。</p>
              <input 
                type="password" 
                value={loginPassword} 
                onChange={e=>setLoginPassword(e.target.value)} 
                onKeyDown={e=>e.key==='Enter' && handleLogin()}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-center text-sm font-bold mb-4 focus:border-black outline-none tracking-widest" 
                placeholder="PASSWORD" 
                autoFocus
              />
              <button onClick={handleLogin} className="w-full py-3 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors">立即解锁</button>
           </div>
        </div>
      )}

      {/* Image Preview Overlay */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur flex items-center justify-center p-10 animate-fade-in" onClick={() => setPreviewImageUrl(null)}>
           <img src={previewImageUrl} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scale-up { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        .animate-scale-up { animation: scale-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }
        .custom-scrollbar-thin::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }
      `}} />
    </div>
  );
};

export default App;
