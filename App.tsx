import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { extractProductInfo, generatePosterSystem } from './geminiService';
import { VisualStyle, TypographyStyle, RecognitionReport } from './types';

const App: React.FC = () => {
  // --- API Key Management ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customKey, setCustomKey] = useState('');

  // 初始化：从 localStorage 加载用户自定义密钥并尝试注入
  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY_OVERRIDE');
    if (savedKey) {
      setCustomKey(savedKey);
      // 动态注入到 process.env 以供 SDK 使用，实现优先级覆盖
      (process.env as any).API_KEY = savedKey;
    }
  }, []);

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    const trimmedKey = customKey.trim();
    if (trimmedKey) {
      localStorage.setItem('GEMINI_API_KEY_OVERRIDE', trimmedKey);
      (process.env as any).API_KEY = trimmedKey;
      alert('设置已保存：系统将优先使用您输入的手工密钥。');
    } else {
      localStorage.removeItem('GEMINI_API_KEY_OVERRIDE');
      alert('已清除自定义密钥，系统将尝试使用默认配置。');
      // 注意：清理后可能需要刷新页面以彻底恢复到系统最初注入的 process.env.API_KEY
    }
    setIsSettingsOpen(false);
  };

  const ensureApiKey = async () => {
    // 检查是否有任何可用的 API Key (无论是自定义的还是系统注入的)
    if (process.env.API_KEY) return true;

    // 如果都没有，尝试使用 AI Studio 官方选择器作为最后兜底
    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
      return true;
    }
    
    // 强制引导用户进行设置
    alert('检测到未配置 API 密钥，请在“设置”中手动输入。');
    setIsSettingsOpen(true);
    return false;
  };
  // --------------------------

  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imageRatios, setImageRatios] = useState<number[]>([]);
  const [description, setDescription] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [report, setReport] = useState<RecognitionReport | null>(null);
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(VisualStyle.MAGAZINE);
  const [selectedTypography, setSelectedTypography] = useState<TypographyStyle>(TypographyStyle.SERIF_GRID);
  
  const [finalPrompts, setFinalPrompts] = useState<string>('');
  
  const [needsModel, setNeedsModel] = useState(false);
  const [modelType, setModelType] = useState('');
  const [needsScene, setNeedsScene] = useState(false);
  const [sceneType, setSceneType] = useState('');
  const [needsDataVis, setNeedsDataVis] = useState(false);
  const [otherNeeds, setOtherNeeds] = useState('');

  const [aspectRatio, setAspectRatio] = useState<string>("9:16");
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [generatingModules, setGeneratingModules] = useState<Record<number, boolean>>({});
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const styleDescriptions: Record<VisualStyle, string> = {
    [VisualStyle.MAGAZINE]: '高级、专业、大片感、粗衬线标题、极简留白',
    [VisualStyle.WATERCOLOR]: '温暖、柔和、晕染效果、手绘质感',
    [VisualStyle.TECH]: '冷色调、几何图形、数据可视化、蓝光效果',
    [VisualStyle.RETRO]: '颗粒质感、暖色调、怀旧氛围、宝丽来边框',
    [VisualStyle.NORDIC]: '性冷淡、大留白、几何线条、黑白灰',
    [VisualStyle.NEON]: '荧光色、描边发光、未来都市、暗色背景',
    [VisualStyle.NATURAL]: '植物元素、大地色系、手工质感、环保理念',
  };

  const typographyDescriptions: Record<TypographyStyle, string> = {
    [TypographyStyle.SERIF_GRID]: '杂志风：粗衬线大标题 + 细线装饰 + 网格对齐',
    [TypographyStyle.GLASS_MODERN]: '现代风：玻璃拟态卡片 + 半透明背景 + 柔和圆角',
    [TypographyStyle.LUXURY_3D]: '奢华风：3D浮雕文字 + 金属质感 + 光影效果',
    [TypographyStyle.WATERCOLOR_ART]: '艺术风：手写体标注 + 水彩笔触 + 不规则布局',
    [TypographyStyle.NEON_CYBER]: '赛博风：无衬线粗体 + 霓虹描边 + 发光效果',
    [TypographyStyle.MINIMAL_LINE]: '极简风：极细线条字 + 大量留白 + 精确对齐',
  };

  const ratioIcons: Record<string, { w: string, h: string }> = {
    "1:1": { w: "w-6", h: "h-6" },
    "16:9": { w: "w-10", h: "h-6" },
    "9:16": { w: "w-5", h: "h-9" },
    "3:4": { w: "w-6", h: "h-8" },
    "4:3": { w: "w-9", h: "h-7" },
  };

  const processFile = (file: File) => {
    if (images.length >= 2) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      
      const img = new Image();
      img.onload = () => {
        setImages(prev => [...prev, base64Data]);
        setImageRatios(prev => [...prev, img.width / img.height]);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => processFile(file));
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageRatios(prev => prev.filter((_, i) => i !== index));
  };

  const handlePasteToDescription = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let imagePasted = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) { processFile(file); imagePasted = true; }
      }
    }
    if (!imagePasted) {
      const text = e.clipboardData.getData('text');
      if (text && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
        setDescription(text);
        e.preventDefault();
      }
    }
  };

  const startExtraction = async () => {
    try {
      const hasKey = await ensureApiKey();
      if (!hasKey) return;
      if (images.length === 0) return alert('请至少上传一张产品图片');
      setLoading(true);
      const res = await extractProductInfo(images, description);
      setReport(res);
      if (!manualBrand && res.brandName) {
        setManualBrand(res.brandName);
      }
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes("Requested entity was not found")) {
        alert("API 密钥无效，请点击右上角‘设置’进行检查。");
        setIsSettingsOpen(true);
      } else {
        alert('分析失败，请检查 API 配置或网络状态');
      }
    } finally { setLoading(false); }
  };

  const startGeneration = async () => {
    try {
      const hasKey = await ensureApiKey();
      if (!hasKey) return;
      if (!report) return alert('请先解析产品报告');
      setLoading(true);
      const combinedNeeds = [
        needsModel ? `需要模特: ${modelType || '默认合适模特'}` : '不需要模特',
        needsScene ? `需要场景: ${sceneType || '默认合适场景'}` : '不需要场景',
        needsDataVis ? '需要数据可视化' : '不需要数据可视化',
        otherNeeds ? `其他要求: ${otherNeeds}` : ''
      ].filter(Boolean).join('；');

      const finalReport = { ...report, brandName: manualBrand || report.brandName };
      const res = await generatePosterSystem(finalReport, selectedStyle, selectedTypography, combinedNeeds);
      setFinalPrompts(res);
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes("Requested entity was not found")) {
        alert("API 密钥无效，请检查设置。");
        setIsSettingsOpen(true);
      } else {
        alert('系统方案生成失败');
      }
    } finally { setLoading(false); }
  };

  const generateSingleImage = async (index: number, prompt: string, isLogo: boolean = false) => {
    try {
      const hasKey = await ensureApiKey();
      if (!hasKey) return;
      if (images.length === 0) return alert("请上传产品参考图");
      
      const targetRatio = isLogo ? "1:1" : aspectRatio;
      setGeneratingModules(prev => ({ ...prev, [index]: true }));
      
      // 实例化前确认使用最新的 process.env.API_KEY
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const imageParts = images.map(img => ({
        inlineData: { data: img, mimeType: 'image/jpeg' }
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            ...imageParts,
            { text: `High-end e-commerce commercial photography. PRODUCT: Accurately reconstruct the product in reference images. STYLE: ${prompt} FORMAT: ${targetRatio} aspect ratio. Professional lighting, 8k resolution, photorealistic.` },
          ],
        },
        config: { 
          imageConfig: { 
            aspectRatio: targetRatio as any,
            imageSize: "1K" 
          } 
        }
      });

      let imageUrl = "";
      const candidates = response.candidates?.[0]?.content?.parts || [];
      for (const part of candidates) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setGeneratedImages(prev => ({ ...prev, [index]: imageUrl }));
      } else {
        throw new Error("模型未返回图像数据");
      }
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes("Requested entity was not found")) {
        setIsSettingsOpen(true);
      } else {
        alert(`渲染失败: ${err?.message || '请检查 API Key 权限'}`);
      }
    } finally { 
      setGeneratingModules(prev => ({ ...prev, [index]: false })); 
    }
  };

  const promptModules = useMemo(() => {
    if (!finalPrompts) return [];
    const sections: { title: string; content: string }[] = [];
    const regex = /###\s+([^\n]+)/g;
    let match;
    const splitPoints: { index: number; title: string }[] = [];
    while ((match = regex.exec(finalPrompts)) !== null) splitPoints.push({ index: match.index, title: match[1].trim() });
    if (splitPoints.length === 0) return [{ title: "系统方案", content: finalPrompts }];
    for (let i = 0; i < splitPoints.length; i++) {
      const current = splitPoints[i], next = splitPoints[i + 1];
      const start = current.index + `### ${current.title}`.length;
      const end = next ? next.index : finalPrompts.length;
      sections.push({ title: current.title, content: finalPrompts.substring(start, end).trim() });
    }
    return sections;
  }, [finalPrompts]);

  const generateAllImages = async () => {
    try {
      const hasKey = await ensureApiKey();
      if (!hasKey) return;
      if (!finalPrompts) return;
      for (let i = 0; i < promptModules.length; i++) {
        const isLogo = promptModules[i].title.toUpperCase().includes("LOGO");
        await generateSingleImage(i, promptModules[i].content, isLogo);
      }
    } catch (err) {}
  };

  const getAspectClass = (r: string) => {
    const map: any = { '1:1': 'aspect-square', '16:9': 'aspect-video', '9:16': 'aspect-[9/16]', '3:4': 'aspect-[3/4]', '4:3': 'aspect-[4/3]' };
    return map[r] || 'aspect-square';
  };

  const renderReportContent = (rep: RecognitionReport, isLarge: boolean = false) => (
    <div className={`space-y-${isLarge ? '8' : '4'}`}>
      <div><p className={`${isLarge ? 'text-lg' : 'text-sm'} font-black text-neutral-400 uppercase mb-1`}>品牌</p><p className={`${isLarge ? 'text-4xl' : 'text-2xl'} font-black text-neutral-900`}>{rep.brandName}</p></div>
      <div><p className={`${isLarge ? 'text-lg' : 'text-sm'} font-black text-neutral-400 uppercase mb-1`}>类型</p><p className={`${isLarge ? 'text-2xl' : 'text-xl'} font-bold text-neutral-800`}>{rep.productType}</p></div>
      <div><p className={`${isLarge ? 'text-lg' : 'text-sm'} font-black text-neutral-400 uppercase mb-2`}>核心卖点</p><div className="flex flex-wrap gap-2">{rep.coreSellingPoints.map((p, i) => <span key={i} className={`px-4 py-2 bg-neutral-50 text-neutral-600 ${isLarge ? 'text-base' : 'text-sm'} font-bold rounded-lg border border-neutral-100`}>{p}</span>)}</div></div>
      <div className={`grid ${isLarge ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
        <div><p className={`${isLarge ? 'text-lg' : 'text-sm'} font-black text-neutral-400 uppercase mb-1`}>配色方案</p><p className={`${isLarge ? 'text-xl' : 'text-lg'} font-bold text-neutral-800`}>{rep.mainColors}</p></div>
        <div><p className={`${isLarge ? 'text-lg' : 'text-sm'} font-black text-neutral-400 uppercase mb-1`}>品牌调性</p><p className={`${isLarge ? 'text-xl' : 'text-lg'} font-bold text-neutral-800`}>{rep.brandTone}</p></div>
      </div>
      {isLarge && (
        <>
          <div><p className="text-lg font-black text-neutral-400 uppercase mb-1">设计风格</p><p className="text-xl font-bold text-neutral-800">{rep.designStyle}</p></div>
          <div><p className="text-lg font-black text-neutral-400 uppercase mb-1">目标受众</p><p className="text-xl font-bold text-neutral-800">{rep.targetAudience}</p></div>
          <div><p className="text-lg font-black text-neutral-400 uppercase mb-1">包装亮点</p><p className="text-xl font-bold text-neutral-800">{rep.packagingHighlights}</p></div>
          <div><p className="text-lg font-black text-neutral-400 uppercase mb-1">产品规格</p><p className="text-xl font-bold text-neutral-800">{rep.productSpecs}</p></div>
        </>
      )}
    </div>
  );

  return (
    <div className="h-screen flex bg-white text-neutral-900 font-sans selection:bg-neutral-200 overflow-hidden leading-relaxed">
      <div className="flex-1 flex overflow-hidden w-full">
        {/* Left Panel */}
        <section className="w-[45%] border-r border-neutral-100 overflow-y-auto bg-[#F7F7F7] custom-scrollbar">
          <div className="p-8 space-y-8 pb-16" onPaste={handlePasteToDescription}>
            <header className="pb-8 border-b border-neutral-200">
              <div className="space-y-4">
                <h1 className="text-[1.6rem] md:text-2xl lg:text-[1.85rem] font-black tracking-tighter text-neutral-900 leading-tight uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                  电商全系统产品详情图片专家
                </h1>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                    <h2 className="text-xl font-black tracking-tight text-neutral-500">核心配置 / SETUP</h2>
                  </div>
                  <div className="text-[10px] font-black text-neutral-300 tracking-[0.2em]">V 3.5.0 PRO</div>
                </div>
              </div>
            </header>

            {/* 01 Analysis */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-8 bg-neutral-900 rounded-full"></div>
                <h3 className="text-xl font-black uppercase">01 智能分析 / ANALYSIS</h3>
              </div>
              
              <div className="flex gap-5 items-stretch h-[220px]">
                <div className="w-[42%] flex flex-col gap-2">
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none">
                    提示：至少上传1张参考图
                  </p>
                  <div className="flex flex-row gap-2 items-end overflow-x-auto pb-1 flex-1">
                    {[0, 1].map((idx) => (
                      <div 
                        key={idx}
                        className="group relative bg-white border-2 border-neutral-200 rounded-xl overflow-hidden flex items-center justify-center transition-all hover:border-neutral-900 shadow-sm shrink-0 h-full"
                        style={{ 
                          aspectRatio: imageRatios[idx] ? `${imageRatios[idx]}/1` : '1/1',
                          minWidth: images[idx] ? 'auto' : '80px'
                        }}
                      >
                        {images[idx] ? (
                          <>
                            <img 
                              src={`data:image/jpeg;base64,${images[idx]}`} 
                              className="w-full h-full object-contain cursor-zoom-in" 
                              alt={`Ref ${idx + 1}`} 
                              onClick={() => setPreviewImageUrl(`data:image/jpeg;base64,${images[idx]}`)}
                            />
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                              className="absolute top-1 right-1 w-5 h-5 bg-neutral-900/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-900 text-[10px] z-10"
                            >✕</button>
                          </>
                        ) : (
                          <div className="relative w-full h-full flex items-center justify-center bg-white border-2 border-dashed border-neutral-100 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                            <span className="text-2xl font-light text-neutral-300">+</span>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <textarea 
                    className="w-full h-10 px-4 py-2 bg-white border border-neutral-200 rounded-xl outline-none focus:border-neutral-900 text-sm font-bold shadow-sm resize-none overflow-hidden shrink-0" 
                    placeholder="粘贴描述..." 
                    rows={1}
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                  />
                  <button 
                    onClick={startExtraction} 
                    disabled={loading || images.length === 0} 
                    className="w-full h-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:from-blue-700 hover:to-indigo-700 disabled:opacity-20 active:scale-95 transition-all shadow-md border border-blue-400/30 shrink-0"
                  >
                    {loading ? '...' : '解析产品报告'}
                  </button>
                </div>

                <div className="w-[18%] flex flex-col bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm group overflow-hidden">
                  <div className="flex items-center justify-between border-b border-neutral-50 pb-2 mb-3 shrink-0">
                    <span className="text-[10px] font-black text-neutral-400 uppercase">品牌 / BRAND</span>
                  </div>
                  <textarea 
                    className="flex-1 w-full bg-transparent outline-none text-xs font-bold resize-none placeholder:text-neutral-300 custom-scrollbar-thin"
                    placeholder="识别品牌..."
                    value={manualBrand}
                    onChange={(e) => setManualBrand(e.target.value)}
                  />
                </div>

                <div className="flex-1 min-w-0 relative bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm group flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b border-neutral-50 pb-2 mb-3 shrink-0">
                    <span className="text-[10px] font-black text-neutral-400 uppercase">报告预览 / REPORT PREVIEW</span>
                    {report && (
                      <button 
                        onClick={() => setIsReportExpanded(true)}
                        className="p-1 hover:bg-neutral-50 rounded-lg transition-colors"
                        title="全屏查看"
                      >
                        <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar-thin pr-1">
                    {report ? (
                      <div className="scale-90 origin-top-left -mr-4">
                        {renderReportContent(report)}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 py-4">
                        <div className="text-3xl font-black">?</div>
                        <p className="text-[9px] font-black uppercase tracking-widest">Awaiting Analysis</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 02 Definition */}
            <div className="space-y-6 pt-6 border-t border-neutral-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-8 bg-neutral-900 rounded-full"></div>
                <h3 className="text-xl font-black uppercase">02 视觉定义 / DEFINITION</h3>
              </div>
              
              <div className="space-y-3">
                <span className="text-base font-black text-neutral-400 uppercase">2.1 视觉风格 / VISUAL STYLE</span>
                <div className="grid grid-cols-4 gap-3">
                  {Object.values(VisualStyle).map(v => (
                    <div key={v} className="group relative">
                      <button onClick={() => setSelectedStyle(v)} className={`w-full px-2 py-4 border-2 rounded-xl text-sm font-black transition-all ${selectedStyle === v ? 'border-neutral-900 bg-neutral-900 text-white shadow-inner' : 'border-white bg-white text-neutral-600 shadow-sm'}`}>{v.replace('风格', '')}</button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-4 bg-neutral-900 text-white text-xs font-bold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-center">{styleDescriptions[v]}<div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-neutral-900"></div></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-base font-black text-neutral-400 uppercase">2.2 排版架构 / TYPOGRAPHY</span>
                <div className="grid grid-cols-3 gap-3">
                  {Object.values(TypographyStyle).map(t => (
                    <div key={t} className="group relative">
                      <button onClick={() => setSelectedTypography(t)} className={`w-full px-3 py-4 border-2 rounded-xl text-sm font-black transition-all ${selectedTypography === t ? 'border-neutral-900 bg-neutral-900 text-white shadow-inner' : 'border-white bg-white text-neutral-600 shadow-sm'}`}>{t.split('+')[0].trim()}</button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-neutral-900 text-white text-xs font-bold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-center">{typographyDescriptions[t]}<div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-neutral-900"></div></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5 bg-white/50 p-6 rounded-[2rem] border border-neutral-200">
                <span className="text-base font-black text-neutral-400 uppercase tracking-widest">2.3 特殊需求 (可选) / SPECIAL REQUIREMENTS</span>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white/40 p-3 rounded-xl border border-neutral-100 shadow-sm">
                      <label className="text-sm font-bold text-neutral-600">模特</label>
                      <button onClick={()=>setNeedsModel(!needsModel)} className={`w-10 h-5 rounded-full transition-all relative ${needsModel ? 'bg-neutral-900' : 'bg-neutral-300'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${needsModel ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {needsModel && (
                      <input className="w-full h-10 px-4 bg-white border border-neutral-200 rounded-lg text-xs font-medium focus:border-neutral-900 outline-none transition-all shadow-sm animate-fade-in" placeholder="模特详情" value={modelType} onChange={e=>setModelType(e.target.value)} />
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white/40 p-3 rounded-xl border border-neutral-100 shadow-sm">
                      <label className="text-sm font-bold text-neutral-600">场景</label>
                      <button onClick={()=>setNeedsScene(!needsScene)} className={`w-10 h-5 rounded-full transition-all relative ${needsScene ? 'bg-neutral-900' : 'bg-neutral-300'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${needsScene ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {needsScene && (
                      <input className="w-full h-10 px-4 bg-white border border-neutral-200 rounded-lg text-xs font-medium focus:border-neutral-900 outline-none transition-all shadow-sm animate-fade-in" placeholder="场景详情" value={sceneType} onChange={e=>setSceneType(e.target.value)} />
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white/40 p-3 rounded-xl border border-neutral-100 shadow-sm">
                      <label className="text-sm font-bold text-neutral-600">数据</label>
                      <button onClick={()=>setNeedsDataVis(!needsDataVis)} className={`w-10 h-5 rounded-full transition-all relative ${needsDataVis ? 'bg-neutral-900' : 'bg-neutral-300'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${needsDataVis ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 border-t border-neutral-50 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-neutral-400 uppercase tracking-tighter">2.4 其他要求 / OTHERS</label>
                  </div>
                  <div className="relative group/textarea">
                    <textarea 
                      className="w-full h-24 bg-white border border-neutral-200 rounded-xl px-5 py-4 outline-none focus:border-neutral-900 text-sm font-bold resize-none shadow-sm transition-all" 
                      placeholder="如：对比图..." 
                      value={otherNeeds} 
                      onChange={(e) => setOtherNeeds(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 03 Ratio Section */}
            <div className="space-y-6 pt-6 border-t border-neutral-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-8 bg-neutral-900 rounded-full"></div>
                <h3 className="text-xl font-black uppercase">03 比例 / RATIO</h3>
              </div>
              <div className="grid grid-cols-5 gap-4">
                {Object.keys(ratioIcons).map(r => (
                  <div key={r} className="flex flex-col items-center gap-3">
                    <div 
                      onClick={() => setAspectRatio(r)}
                      className={`border-2 rounded flex items-center justify-center transition-all h-14 w-14 cursor-pointer hover:bg-neutral-50 ${aspectRatio === r ? 'border-neutral-900 bg-neutral-100 scale-105' : 'border-neutral-200 bg-white opacity-40 hover:opacity-100'}`}
                    >
                      <div className={`bg-neutral-900 rounded-sm shadow-sm transition-all ${ratioIcons[r].w} ${ratioIcons[r].h}`}></div>
                    </div>
                    <button 
                      onClick={() => setAspectRatio(r)} 
                      className={`w-full py-2 border-2 rounded-lg text-center text-[10px] font-black transition-all ${aspectRatio === r ? 'border-neutral-900 bg-neutral-900 text-white shadow-md' : 'border-white bg-white text-neutral-400 shadow-sm'}`}
                    >
                      {r}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8">
              <button 
                onClick={startGeneration} 
                disabled={loading || !report} 
                className="w-full h-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500 text-white rounded-2xl text-2xl font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(79,70,229,0.4)] hover:scale-[1.02] hover:shadow-indigo-500/40 disabled:opacity-20 active:scale-95 transition-all flex items-center justify-center gap-5 border border-white/20"
              >
                {loading ? <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : '生成视觉系统'}
              </button>
            </div>
          </div>
        </section>

        {/* Right Panel */}
        <section className="w-[55%] relative flex flex-col bg-white overflow-hidden">
          <header className="h-24 px-12 border-b border-neutral-50 flex items-center justify-between z-30 bg-white/95 backdrop-blur-md sticky top-0">
            <h2 className="text-2xl font-black tracking-tighter uppercase">产品详情图片</h2>
            <div className="flex gap-4">
              <button 
                onClick={handleOpenSettings}
                className="px-8 h-12 rounded-full text-xs font-black uppercase border-2 border-neutral-900 hover:bg-neutral-900 hover:text-white transition-all shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                设置
              </button>
              {finalPrompts && <button onClick={generateAllImages} className="bg-neutral-900 text-white px-10 h-12 rounded-full text-sm font-black uppercase tracking-widest hover:scale-105 shadow-lg transition-all">批量渲染全案</button>}
            </div>
          </header>
          
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            {!finalPrompts ? (
              <div className="h-full flex flex-col items-center justify-center opacity-5 select-none">
                <div className="text-[12rem] font-black tracking-tighter leading-none">VISION</div>
                <p className="text-xl font-black uppercase tracking-[0.5em]">System Core Offline</p>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto space-y-24 pb-64">
                {promptModules.map((m, idx) => {
                  const isLogo = m.title.toUpperCase().includes("LOGO");
                  const aspect = isLogo ? 'aspect-square' : getAspectClass(aspectRatio);
                  const isGenerating = generatingModules[idx];
                  return (
                    <div key={idx} className="group flex flex-row gap-10 animate-fade-in-up items-start">
                      <div className="w-[42%] flex flex-col gap-6 sticky top-32">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <span className="text-4xl font-black text-neutral-100 tracking-tighter leading-none">{(idx).toString().padStart(2, '0')}</span>
                            <span className="text-xs font-black uppercase text-neutral-900">{m.title}</span>
                          </div>
                          <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-sm">
                            <pre className="text-[11px] text-neutral-600 font-bold whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar">{m.content}</pre>
                          </div>
                          <div className="flex items-center gap-4">
                            <button onClick={() => generateSingleImage(idx, m.content, isLogo)} disabled={isGenerating} className="flex-1 py-4 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-neutral-800 disabled:opacity-20 transition-all">{isGenerating ? '渲染中...' : '生成渲染图'}</button>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className={`relative w-full rounded-[2.5rem] overflow-hidden shadow-xl bg-neutral-50 ${aspect}`}>
                          {generatedImages[idx] ? (
                            <img src={generatedImages[idx]} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setPreviewImageUrl(generatedImages[idx])} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {isGenerating ? <div className="w-8 h-8 border-3 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"></div> : <span className="opacity-10 font-black text-6xl">V</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* --- Settings Modal --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-fade-in" onClick={() => setIsSettingsOpen(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">API 配置 / SETTINGS</h3>
                <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                  请在此配置您的 Google Gemini API 密钥。如果设置了自定义密钥，系统将优先使用。密钥仅保存在本地浏览器中。
                </p>
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Gemini API Key</label>
                <input 
                  type="password"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="在此输入或粘贴您的 API 密钥..."
                  className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:border-neutral-900 outline-none font-mono text-sm shadow-inner transition-all"
                />
                <div className="flex flex-col gap-1">
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    如何获取 API 密钥与计费说明? →
                  </a>
                  <span className="text-[9px] text-neutral-400 italic">注：留空则尝试使用系统默认密钥。</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 px-4 py-4 border-2 border-neutral-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-50 transition-all"
                >
                  取消
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="flex-[1.5] px-4 py-4 bg-neutral-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 shadow-xl transition-all"
                >
                  保存配置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlays */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-[100] bg-white/98 backdrop-blur-2xl flex items-center justify-center p-8 animate-fade-in" onClick={() => setPreviewImageUrl(null)}>
          <img src={previewImageUrl} className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-3xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {isReportExpanded && report && (
        <div className="fixed inset-0 z-[110] bg-white/98 backdrop-blur-2xl flex items-center justify-center p-8 animate-fade-in" onClick={() => setIsReportExpanded(false)}>
          <div className="bg-white rounded-[3rem] shadow-2xl border border-neutral-100 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-16" onClick={(e) => e.stopPropagation()}>
            {renderReportContent({ ...report, brandName: manualBrand || report.brandName }, true)}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E5E5; border-radius: 20px; }
        .custom-scrollbar-thin::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #D1D1D1; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default App;