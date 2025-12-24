
import React, { useState, useEffect, useMemo } from 'react';
import { extractProductInfo, generatePosterSystem, generateImageContent } from './geminiService';
import { VisualStyle, TypographyStyle, RecognitionReport } from './types';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { ConfigModal } from './ConfigModal';
import { LoginModal } from './LoginModal';

const App: React.FC = () => {
  // --- 全局 UI 状态 ---
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // --- API Key 状态 ---
  const [userApiKey, setUserApiKey] = useState<string>('');

  useEffect(() => {
    const storedKey = localStorage.getItem('USER_GEMINI_API_KEY');
    if (storedKey) {
      setUserApiKey(storedKey);
    }
  }, []);

  const handleSaveKey = (key: string) => {
    if (!key.trim()) return;
    setUserApiKey(key.trim());
    localStorage.setItem('USER_GEMINI_API_KEY', key.trim());
    alert("API Key 已保存，将优先使用您的 Key。");
  };

  const handleClearKey = () => {
    setUserApiKey('');
    localStorage.removeItem('USER_GEMINI_API_KEY');
    alert("已清除自定义 Key，将使用系统默认配置。");
  };

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
    // 这里可以添加路由跳转到 /admin，或者仅仅是切换视图状态
    alert("管理员登录成功！(此处模拟进入后台)");
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

  // 映射描述（保持不变）
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

  const startExtraction = async () => {
    if (images.length === 0) return alert('请上传产品图片');
    setExtractionLoading(true);
    try {
      // 传入 userApiKey
      const res = await extractProductInfo(images, description, userApiKey);
      setReport(res);
      if (!manualBrand && res.brandName) setManualBrand(res.brandName);
    } catch (err: any) {
      alert(`分析失败: ${err.message}`);
    } finally { setExtractionLoading(false); }
  };

  const startGeneration = async () => {
    if (!report) return alert('请先解析产品报告');
    setGenerationLoading(true);
    try {
      const combinedNeeds = [
        needsModel ? `需要真人模特` : '',
        needsScene ? `需要定制场景` : '',
        needsDataVis ? '需要数据可视化图表' : '',
        otherNeeds
      ].filter(Boolean).join('；');
      // 传入 userApiKey
      const res = await generatePosterSystem(
        { ...report, brandName: manualBrand || report.brandName },
        selectedStyle,
        selectedTypography,
        combinedNeeds,
        userApiKey
      );
      setFinalPrompts(res);
    } catch (err: any) {
      alert(`生成失败: ${err.message}`);
    } finally { setGenerationLoading(false); }
  };

  const generateSingleImage = async (index: number, prompt: string, isLogo: boolean = false) => {
    const targetRatio = isLogo ? "1:1" : aspectRatio;
    setGeneratingModules(prev => ({ ...prev, [index]: true }));
    try {
      // 传入 userApiKey
      const data = await generateImageContent(images, prompt, targetRatio, userApiKey);
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
    <div className="h-screen flex bg-white text-neutral-900 font-sans selection:bg-purple-100 overflow-hidden relative">
      
      {/* Top Navigation Bar (Fixed) */}
      <div className="absolute top-4 right-6 z-50 flex gap-3">
        <button 
          onClick={() => setIsConfigOpen(true)}
          className="px-4 py-2 bg-white/80 backdrop-blur border border-neutral-200 rounded-lg shadow-sm text-xs font-bold hover:bg-white hover:border-purple-300 hover:text-purple-600 transition-all flex items-center gap-2 group"
        >
          <span className="w-2 h-2 rounded-full bg-neutral-300 group-hover:bg-purple-500 transition-colors"></span>
          配置
        </button>
        <button 
          onClick={() => setIsLoginOpen(true)}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg shadow-md text-xs font-bold hover:bg-black transition-all flex items-center gap-2"
        >
          <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
          {isAdminLoggedIn ? '后台' : '登录'}
        </button>
      </div>

      <Sidebar 
        images={images}
        setImages={setImages}
        setImageRatios={setImageRatios}
        description={description}
        setDescription={setDescription}
        manualBrand={manualBrand}
        setManualBrand={setManualBrand}
        extractionLoading={extractionLoading}
        startExtraction={startExtraction}
        selectedStyle={selectedStyle}
        setSelectedStyle={setSelectedStyle}
        selectedTypography={selectedTypography}
        setSelectedTypography={setSelectedTypography}
        needsModel={needsModel}
        setNeedsModel={setNeedsModel}
        needsScene={needsScene}
        setNeedsScene={setNeedsScene}
        needsDataVis={needsDataVis}
        setNeedsDataVis={setNeedsDataVis}
        otherNeeds={otherNeeds}
        setOtherNeeds={setOtherNeeds}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        generationLoading={generationLoading}
        startGeneration={startGeneration}
        report={report}
        ratioIcons={ratioIcons}
        visualStyleDescriptions={visualStyleDescriptions}
        typographyDescriptions={typographyDescriptions}
      />

      <MainContent 
        checkAuth={() => true} // Logic moved to service level
        hasApiKey={!!userApiKey} // Used for visual indication only if needed
        manualBrand={manualBrand}
        report={report}
        selectedStyle={selectedStyle}
        selectedTypography={selectedTypography}
        finalPrompts={finalPrompts}
        generatedImages={generatedImages}
        generatingModules={generatingModules}
        previewImageUrl={previewImageUrl}
        setPreviewImageUrl={setPreviewImageUrl}
        generateSingleImage={generateSingleImage}
        promptModules={promptModules}
      />

      {/* Modals */}
      <ConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        onSave={handleSaveKey}
        onClear={handleClearKey}
        currentKey={userApiKey}
      />

      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleAdminLogin}
      />

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
