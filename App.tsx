
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { extractProductInfo, generatePosterSystem } from './geminiService';
import { VisualStyle, TypographyStyle, RecognitionReport } from './types';

const App: React.FC = () => {
  // --- 登录与鉴权状态 ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');

  // 初始化：检查登录状态
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
      alert('访问密码错误，请检查。');
    }
  };

  const handleLogout = () => {
    if (confirm('确认退出当前登录状态？')) {
      setIsLoggedIn(false);
      sessionStorage.removeItem('APP_IS_LOGGED_IN');
    }
  };

  // --- API 密钥管理 ---
  const handleOpenKeySelection = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    } else {
      // 检查环境变量是否已配置
      if (process.env.API_KEY && process.env.API_KEY !== "undefined") {
        alert("系统检测到后台已配置 API 密钥，您可以直接登录使用。");
      } else {
        alert("当前环境不支持手动输入密钥，且未检测到后台变量，请检查 Cloudflare 配置。");
      }
    }
  };

  const checkAuthAndKey = async () => {
    if (!isLoggedIn) {
      setIsLoginOpen(true);
      return false;
    }

    // 只要有环境变量 key 或者是 aistudio 环境已选 key，就放行
    if (process.env.API_KEY && process.env.API_KEY !== "undefined") {
      return true;
    }

    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        return true; // 触发后假设可用
      }
      return true;
    }

    // 如果都没有，给出具体提示
    alert("未检测到有效的 API 密钥配置，请联系管理员或检查配置。");
    return false;
  };

  // --- 核心业务逻辑 ---
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

  const quickOptions = ["对比图", "爆炸图", "使用步骤", "成分分析", "多口味展示", "礼盒包装"];

  const handleQuickOptionClick = (opt: string) => {
    setOtherNeeds(prev => prev ? `${prev}，${opt}` : opt);
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
      const ok = await checkAuthAndKey();
      if (!ok) return;
      if (images.length === 0) return alert('请至少上传一张产品图片');
      setLoading(true);
      const res = await extractProductInfo(images, description);
      setReport(res);
      if (!manualBrand && res.brandName) {
        setManualBrand(res.brandName);
      }
    } catch (err: any) {
      console.error('Extraction Error:', err);
      alert(`分析失败: ${err.message || '请确认后台 API_KEY 已发布且可用'}`);
    } finally { setLoading(false); }
  };

  const startGeneration = async () => {
    try {
      const ok = await checkAuthAndKey();
      if (!ok) return;
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
      console.error('Generation Error:', err);
      alert(`方案生成失败: ${err.message}`);
    } finally { setLoading(false); }
  };

  const generateSingleImage = async (index: number, prompt: string, isLogo: boolean = false) => {
    try {
      const ok = await checkAuthAndKey();
      if (!ok) return;
      if (images.length === 0) return alert("请上传产品参考图");
      
      const targetRatio = isLogo ? "1:1" : aspectRatio;
      setGeneratingModules(prev => ({ ...prev, [index]: true }));
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const imageParts = images.map(img => ({
        inlineData: { data: img, mimeType: 'image/jpeg' }
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            ...imageParts,
            { text: `高端电商摄影。还原参考图产品。风格：${prompt}。比例：${targetRatio}。8k分辨率。` },
          ],
        },
        config: { 
          imageConfig: { aspectRatio: targetRatio as any } 
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
        throw new Error("渲染响应为空");
      }
    } catch (err: any) {
      console.error('Rendering Error:', err);
      alert(`渲染失败: ${err?.message}`);
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
    if (splitPoints.length === 0) return [{ title: "全案方案", content: finalPrompts }];
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
      const ok = await checkAuthAndKey();
      if (!ok) return;
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
    <div className={`space-y-${isLarge ? '6' : '3'}`}>
      <div><p className={`${isLarge ? 'text-base' : 'text-[10px]'} font-black text-neutral-400 uppercase mb-1`}>品牌名称</p><p className={`${isLarge ? 'text-3xl' : 'text-xl'} font-black text-neutral-900`}>{rep.brandName}</p></div>
      <div><p className={`${isLarge ? 'text-base' : 'text-[10px]'} font-black text-neutral-400 uppercase mb-1`}>产品类型</p><p className={`${isLarge ? 'text-xl' : 'text-lg'} font-bold text-neutral-800`}>{rep.productType}</p></div>
      <div><p className={`${isLarge ? 'text-base' : 'text-[10px]'} font-black text-neutral-400 uppercase mb-1.5`}>核心卖点</p><div className="flex flex-wrap gap-1.5">{rep.coreSellingPoints.map((p, i) => <span key={i} className={`px-3 py-1 bg-neutral-50 text-neutral-600 ${isLarge ? 'text-sm' : 'text-[10px]'} font-bold rounded-lg border border-neutral-100`}>{p}</span>)}</div></div>
      <div className={`grid ${isLarge ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
        <div><p className={`${isLarge ? 'text-base' : 'text-[10px]'} font-black text-neutral-400 uppercase mb-0.5`}>主视觉配色</p><p className={`${isLarge ? 'text-lg' : 'text-base'} font-bold text-neutral-800`}>{rep.mainColors}</p></div>
        <div><p className={`${isLarge ? 'text-base' : 'text-[10px]'} font-black text-neutral-400 uppercase mb-0.5`}>品牌风格调性</p><p className={`${isLarge ? 'text-lg' : 'text-base'} font-bold text-neutral-800`}>{rep.brandTone}</p></div>
      </div>
      {isLarge && (
        <>
          <div><p className="text-base font-black text-neutral-400 uppercase mb-0.5">设计细节说明</p><p className="text-lg font-bold text-neutral-800">{rep.designStyle}</p></div>
          <div><p className="text-base font-black text-neutral-400 uppercase mb-0.5">目标消费群体</p><p className="text-lg font-bold text-neutral-800">{rep.targetAudience}</p></div>
          <div><p className="text-base font-black text-neutral-400 uppercase mb-0.5">包装工艺亮点</p><p className="text-lg font-bold text-neutral-800">{rep.packagingHighlights}</p></div>
          <div><p className="text-base font-black text-neutral-400 uppercase mb-0.5">详细参数规格</p><p className="text-lg font-bold text-neutral-800">{rep.productSpecs}</p></div>
        </>
      )}
    </div>
  );

  return (
    <div className="h-screen flex bg-white text-neutral-900 font-sans selection:bg-neutral-200 overflow-hidden leading-relaxed">
      <div className="flex-1 flex overflow-hidden w-full">
        {/* 左侧面板 */}
        <section className="w-[42%] border-r border-neutral-100 overflow-y-auto bg-[#F7F7F7] custom-scrollbar">
          <div className="p-5 space-y-4 pb-10" onPaste={handlePasteToDescription}>
            <header className="pb-4 border-b border-neutral-200">
              <div className="space-y-2">
                <h1 className="text-lg md:text-xl font-black tracking-tighter text-neutral-900 leading-tight uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                  电商详情图视觉全案系统
                </h1>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                    <h2 className="text-base font-black tracking-tight text-neutral-500">核心配置</h2>
                  </div>
                  <div className="text-[9px] font-black text-neutral-300 tracking-[0.1em]">专业版 3.6.0</div>
                </div>
              </div>
            </header>

            {/* 01 智能分析 */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-6 bg-neutral-900 rounded-full"></div>
                <h3 className="text-lg font-black uppercase">01 产品智能分析</h3>
              </div>
              <div className="flex gap-3 items-stretch h-[160px]">
                <div className="w-[40%] flex flex-col gap-1.5">
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none">上传参考图或粘贴描述</p>
                  <div className="flex flex-row gap-1.5 items-end overflow-x-auto pb-0.5 flex-1">
                    {[0, 1].map((idx) => (
                      <div 
                        key={idx}
                        className="group relative bg-white border border-neutral-200 rounded-lg overflow-hidden flex items-center justify-center transition-all hover:border-neutral-900 shadow-sm shrink-0 h-full"
                        style={{ aspectRatio: imageRatios[idx] ? `${imageRatios[idx]}/1` : '1/1', minWidth: images[idx] ? 'auto' : '60px' }}
                      >
                        {images[idx] ? (
                          <>
                            <img src={`data:image/jpeg;base64,${images[idx]}`} className="w-full h-full object-contain cursor-zoom-in" alt={`产品图 ${idx + 1}`} onClick={() => setPreviewImageUrl(`data:image/jpeg;base64,${images[idx]}`)} />
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-neutral-900/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-900 text-[8px] z-10">✕</button>
                          </>
                        ) : (
                          <div className="relative w-full h-full flex items-center justify-center bg-white border border-dashed border-neutral-100 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                            <span className="text-xl font-light text-neutral-300">+</span>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <textarea className="w-full h-7 px-3 py-1 bg-white border border-neutral-200 rounded-lg outline-none focus:border-neutral-900 text-xs font-bold shadow-sm resize-none overflow-hidden shrink-0" placeholder="粘贴或输入产品说明..." rows={1} value={description} onChange={(e) => setDescription(e.target.value)} />
                  <button onClick={startExtraction} disabled={loading || images.length === 0} className="w-full h-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:from-blue-700 hover:to-indigo-700 disabled:opacity-20 active:scale-95 transition-all shadow-md shrink-0">
                    {loading ? '分析中...' : '解析产品报告'}
                  </button>
                </div>
                <div className="w-[18%] flex flex-col bg-white border border-neutral-200 rounded-xl p-3 shadow-sm group overflow-hidden">
                  <div className="flex items-center justify-between border-b border-neutral-50 pb-1.5 mb-2 shrink-0">
                    <span className="text-[9px] font-black text-neutral-400 uppercase">品牌</span>
                  </div>
                  <textarea className="flex-1 w-full bg-transparent outline-none text-[11px] font-bold resize-none placeholder:text-neutral-300 custom-scrollbar-thin" placeholder="识别中..." value={manualBrand} onChange={(e) => setManualBrand(e.target.value)} />
                </div>
                <div className="flex-1 min-w-0 relative bg-white border border-neutral-200 rounded-xl p-3 shadow-sm group flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b border-neutral-50 pb-1.5 mb-2 shrink-0">
                    <span className="text-[9px] font-black text-neutral-400 uppercase">分析摘要</span>
                    {report && (
                      <button onClick={() => setIsReportExpanded(true)} className="p-0.5 hover:bg-neutral-50 rounded transition-colors">
                        <svg className="w-2.5 h-2.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar-thin pr-0.5">
                    {report ? <div className="scale-[0.85] origin-top-left -mr-6">{renderReportContent(report)}</div> : <div className="h-full flex flex-col items-center justify-center opacity-20 py-2"><div className="text-xl font-black">?</div><p className="text-[8px] font-black uppercase tracking-widest">待分析</p></div>}
                  </div>
                </div>
              </div>
            </div>

            {/* 02 视觉定义 */}
            <div className="space-y-4 pt-3 border-t border-neutral-200">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-6 bg-neutral-900 rounded-full"></div>
                <h3 className="text-lg font-black uppercase">02 视觉风格定义</h3>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-black text-neutral-400 uppercase">2.1 基础视觉风格</span>
                <div className="grid grid-cols-4 gap-2">
                  {Object.values(VisualStyle).map(v => (
                    <button key={v} onClick={() => setSelectedStyle(v)} className={`w-full px-1 py-2.5 border border-neutral-200 rounded-lg text-xs font-black transition-all ${selectedStyle === v ? 'border-neutral-900 bg-neutral-900 text-white shadow-inner' : 'border-white bg-white text-neutral-600 shadow-sm'}`}>
                      <span className="truncate">{v.replace('风格', '')}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-black text-neutral-400 uppercase">2.2 页面排版逻辑</span>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(TypographyStyle).map(t => (
                    <button key={t} onClick={() => setSelectedTypography(t)} className={`w-full px-1.5 py-2.5 border border-neutral-200 rounded-lg text-xs font-black transition-all ${selectedTypography === t ? 'border-neutral-900 bg-neutral-900 text-white shadow-inner' : 'border-white bg-white text-neutral-600 shadow-sm'}`}>
                      <span className="truncate">{t.split(' ')[0]} {t.split(' ')[1]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3 bg-white/50 p-4 rounded-2xl border border-neutral-200">
                <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">2.3 个性化需求</span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between bg-white/40 p-2 rounded-lg border border-neutral-100 shadow-sm">
                      <label className="text-xs font-bold text-neutral-600">真人模特</label>
                      <button onClick={()=>setNeedsModel(!needsModel)} className={`w-8 h-4 rounded-full transition-all relative ${needsModel ? 'bg-neutral-900' : 'bg-neutral-300'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm ${needsModel ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {needsModel && <input className="w-full h-7 px-3 bg-white border border-neutral-200 rounded-lg text-[10px] focus:border-neutral-900 outline-none transition-all shadow-sm" placeholder="如：亚洲女性" value={modelType} onChange={e=>setModelType(e.target.value)} />}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between bg-white/40 p-2 rounded-lg border border-neutral-100 shadow-sm">
                      <label className="text-xs font-bold text-neutral-600">定制场景</label>
                      <button onClick={()=>setNeedsScene(!needsScene)} className={`w-8 h-4 rounded-full transition-all relative ${needsScene ? 'bg-neutral-900' : 'bg-neutral-300'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm ${needsScene ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {needsScene && <input className="w-full h-7 px-3 bg-white border border-neutral-200 rounded-lg text-[10px] focus:border-neutral-900 outline-none transition-all shadow-sm" placeholder="如：厨房桌面" value={sceneType} onChange={e=>setSceneType(e.target.value)} />}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between bg-white/40 p-2 rounded-lg border border-neutral-100 shadow-sm">
                      <label className="text-xs font-bold text-neutral-600">数据图表</label>
                      <button onClick={()=>setNeedsDataVis(!needsDataVis)} className={`w-8 h-4 rounded-full transition-all relative ${needsDataVis ? 'bg-neutral-900' : 'bg-neutral-300'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm ${needsDataVis ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
                <textarea className="w-full h-14 bg-white border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-neutral-900 text-xs font-bold resize-none shadow-sm transition-all mt-2" placeholder="输入其他具体要求..." value={otherNeeds} onChange={(e) => setOtherNeeds(e.target.value)} />
              </div>
            </div>

            {/* 03 比例 */}
            <div className="space-y-4 pt-3 border-t border-neutral-200">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-6 bg-neutral-900 rounded-full"></div>
                <h3 className="text-lg font-black uppercase">03 方案画面比例</h3>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {Object.keys(ratioIcons).map(r => (
                  <div key={r} className="flex flex-col items-center gap-1.5">
                    <div onClick={() => setAspectRatio(r)} className={`border border-neutral-200 rounded-lg flex items-center justify-center transition-all h-10 w-10 cursor-pointer hover:bg-neutral-50 ${aspectRatio === r ? 'border-neutral-900 bg-neutral-100 scale-105 shadow-sm' : 'bg-white opacity-40'}`}>
                      <div className={`bg-neutral-900 rounded-[1px] shadow-sm transition-all ${ratioIcons[r].w.replace('w-10', 'w-8').replace('w-9', 'w-7').replace('w-6', 'w-5').replace('w-5', 'w-4')} ${ratioIcons[r].h.replace('h-9', 'h-7').replace('h-8', 'h-6').replace('h-7', 'h-5').replace('h-6', 'h-4')}`}></div>
                    </div>
                    <button onClick={() => setAspectRatio(r)} className={`w-full py-1 border border-neutral-200 rounded-md text-center text-[9px] font-black transition-all ${aspectRatio === r ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm' : 'bg-white text-neutral-400'}`}>{r}</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button onClick={startGeneration} disabled={loading || !report} className="w-full h-16 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500 text-white rounded-xl text-lg font-black uppercase tracking-widest shadow-xl hover:scale-[1.01] disabled:opacity-20 transition-all flex items-center justify-center gap-3 border border-white/20">
                {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : '生成视觉方案提示词'}
              </button>
            </div>
          </div>
        </section>

        {/* 右侧面板 */}
        <section className="w-[58%] relative flex flex-col bg-white overflow-hidden">
          <header className="h-20 px-10 border-b border-neutral-50 flex items-center justify-between z-30 bg-white/95 backdrop-blur-md sticky top-0">
            <h2 className="text-xl font-black tracking-tighter uppercase">生成效果方案预览</h2>
            <div className="flex gap-3">
              <button onClick={handleOpenKeySelection} className="px-6 h-10 rounded-full text-[10px] font-black uppercase border border-neutral-900 hover:bg-neutral-900 hover:text-white transition-all shadow-sm flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                配置 API 密钥
              </button>
              <button onClick={isLoggedIn ? handleLogout : () => setIsLoginOpen(true)} className={`px-8 h-10 rounded-full text-[10px] font-black uppercase border transition-all shadow-sm flex items-center gap-2 ${isLoggedIn ? 'bg-emerald-50 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white' : 'border-neutral-900 hover:bg-neutral-900 hover:text-white'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                {isLoggedIn ? '已登录' : '登录'}
              </button>
              {finalPrompts && <button onClick={generateAllImages} className="bg-neutral-900 text-white px-8 h-10 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 shadow-md transition-all">全案批量渲染</button>}
            </div>
          </header>
          
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            {!finalPrompts ? (
              <div className="h-full flex flex-col items-center justify-center opacity-5 select-none">
                <div className="text-[10rem] font-black tracking-tighter leading-none">预览区</div>
                <p className="text-lg font-black uppercase tracking-[0.4em]">请在左侧点击生成</p>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto space-y-20 pb-56">
                {promptModules.map((m, idx) => {
                  const isLogo = m.title.toUpperCase().includes("LOGO");
                  const aspect = isLogo ? 'aspect-square' : getAspectClass(aspectRatio);
                  const isGenerating = generatingModules[idx];
                  return (
                    <div key={idx} className="group flex flex-row gap-8 animate-fade-in-up items-start">
                      <div className="w-[42%] flex flex-col gap-5 sticky top-28">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl font-black text-neutral-100 tracking-tighter leading-none">{(idx).toString().padStart(2, '0')}</span>
                            <span className="text-xs font-black uppercase text-neutral-900">{m.title}</span>
                          </div>
                          <div className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-sm">
                            <pre className="text-[10px] text-neutral-600 font-bold whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto custom-scrollbar">{m.content}</pre>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => generateSingleImage(idx, m.content, isLogo)} disabled={isGenerating} className="flex-1 py-3 bg-neutral-900 text-white rounded-lg text-[9px] font-black uppercase hover:bg-neutral-800 disabled:opacity-20 transition-all">{isGenerating ? '生成中...' : '渲染此画面'}</button>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className={`relative w-full rounded-[2rem] overflow-hidden shadow-lg bg-neutral-50 ${aspect}`}>
                          {generatedImages[idx] ? (
                            <img src={generatedImages[idx]} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setPreviewImageUrl(generatedImages[idx])} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {isGenerating ? <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"></div> : <span className="opacity-10 font-black text-5xl">暂无预览</span>}
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

      {/* --- 登录弹窗 --- */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-fade-in" onClick={() => setIsLoginOpen(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <h3 className="text-xl font-black uppercase tracking-tight">系统登录</h3>
                <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">请输入访问密码以解锁功能，资源已由后台自动匹配。</p>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">访问密码</label>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="输入密码..." className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:border-neutral-900 outline-none font-mono text-xs shadow-inner transition-all" autoFocus />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsLoginOpen(false)} className="flex-1 px-3 py-3 border border-neutral-100 rounded-xl text-[10px] font-black uppercase hover:bg-neutral-50 transition-all">取消</button>
                <button onClick={handleLogin} className="flex-[1.5] px-3 py-3 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase hover:scale-[1.02] shadow-lg transition-all">立即登录</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 大图预览与报告 */}
      {previewImageUrl && <div className="fixed inset-0 z-[100] bg-white/98 backdrop-blur-2xl flex items-center justify-center p-8 animate-fade-in" onClick={() => setPreviewImageUrl(null)}><img src={previewImageUrl} className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-2xl" onClick={(e) => e.stopPropagation()} /></div>}
      {isReportExpanded && report && <div className="fixed inset-0 z-[110] bg-white/98 backdrop-blur-2xl flex items-center justify-center p-8 animate-fade-in" onClick={() => setIsReportExpanded(false)}><div className="bg-white rounded-[2.5rem] shadow-2xl border border-neutral-100 w-full max-w-4xl max-h-[85vh] overflow-y-auto p-12" onClick={(e) => e.stopPropagation()}>{renderReportContent({ ...report, brandName: manualBrand || report.brandName }, true)}</div></div>}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in-up { animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; height: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E5E5; border-radius: 10px; }
        .custom-scrollbar-thin::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #D1D1D1; border-radius: 5px; }
      `}} />
    </div>
  );
};

export default App;
