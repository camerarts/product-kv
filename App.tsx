import React, { useState, useEffect, useMemo } from 'react';
import { extractProductInfo, generatePosterSystem, generateImageContent } from './geminiService';
import { VisualStyle, TypographyStyle, RecognitionReport } from './types';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { ConfigModal } from './ConfigModal';
import { LoginModal } from './LoginModal';
import { ApiKeyModal } from './ApiKeyModal';

export const App: React.FC = () => {
  // --- 全局 UI 状态 ---
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // --- API Key 状态 ---
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    const storedKey = localStorage.getItem('USER_GEMINI_API_KEY');
    if (storedKey) {
      setUserApiKey(storedKey);
    }
    
    if (window.aistudio) {
      window.aistudio.hasSelectedApiKey().then((has) => {
        setHasApiKey(has);
      });
    }
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      const has = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(has);
    }
  };

  const handleSaveKey = (key: string) => {
    if (!key.trim()) return;
    setUserApiKey(key.trim());
    localStorage.setItem('USER_GEMINI_API_KEY', key.trim());
    alert("API Key 已保存，将优先使用您的 Key。");
  };

  const handleClearKey = () => {
    setUserApiKey('');
    localStorage.removeItem('USER_GEMINI_API_KEY');
    alert("已清除自定义 Key，如未登录管理员，需重新配置 Key 才可使用。");
  };

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
    // 这里可以添加路由跳转到 /admin，或者仅仅是切换视图状态
    alert("管理员登录成功！您现在可以使用系统内置 Key。");
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    alert("已退出管理员登录，系统 Key 权限已回收。");
  };

  // --- 核心业务状态 ---
  const [generationLoading, setGenerationLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imageRatios, setImageRatios] = useState<number[]>([]);
  const [description, setDescription] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [report, setReport] = useState<RecognitionReport | null>(null);
  
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(VisualStyle.NORDIC);
  const [selectedTypography, setSelectedTypography] = useState<TypographyStyle>(TypographyStyle.MINIMAL_LINE);
  
  const [finalPrompts, setFinalPrompts] = useState<string>('');
  
  // 个性化需求状态
  const [needsModel, setNeedsModel] = useState(false);
  const [modelDesc, setModelDesc] = useState('');
  
  const [needsScene, setNeedsScene] = useState(false);
  const [sceneDesc, setSceneDesc] = useState('');

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

  const startGeneration = async () => {
    if (images.length === 0) return alert('请上传产品图片');
    
    setGenerationLoading(true);
    try {
      // 步骤 1: 先执行产品解析 (原 startExtraction 逻辑)
      // 传入 userApiKey 和 isAdminLoggedIn
      const extractionRes = await extractProductInfo(images, description, userApiKey, isAdminLoggedIn);
      setReport(extractionRes);
      
      let effectiveBrand = manualBrand;
      // 如果没有手动输入品牌，且解析结果中有品牌，则自动填充
      if (!effectiveBrand && extractionRes.brandName) {
        setManualBrand(extractionRes.brandName);
        effectiveBrand = extractionRes.brandName;
      }

      // 步骤 2: 接着执行方案生成 (原 startGeneration 逻辑)
      const needsArray = [];
      
      if (needsModel) {
        let desc = "需要真人模特";
        if (modelDesc) desc += `（特征：${modelDesc}）`;
        needsArray.push(desc);
      }
      
      if (needsScene) {
        let desc = "需要定制场景";
        if (sceneDesc) desc += `（风格：${sceneDesc}）`;
        needsArray.push(desc);
      }
      
      if (needsDataVis) {
        needsArray.push("需要数据可视化图表");
      }
      
      if (otherNeeds) {
        needsArray.push(otherNeeds);
      }

      const combinedNeeds = needsArray.join('；');

      const promptRes = await generatePosterSystem(
        { ...extractionRes, brandName: effectiveBrand || extractionRes.brandName },
        selectedStyle,
        selectedTypography,
        combinedNeeds,
        userApiKey,
        isAdminLoggedIn
      );
      setFinalPrompts(promptRes);

    } catch (err: any) {
      alert(`处理失败: ${err.message}`);
    } finally { 
      setGenerationLoading(false); 
    }
  };

  const promptModules = useMemo(() => {
    if (!finalPrompts) return [];
    // Parse the markdown response
    const sections = finalPrompts.split(/###\s*/).filter(s => s.trim());
    return sections.map(section => {
      const firstLineEnd = section.indexOf('\n');
      const title = section.slice(0, firstLineEnd).trim();
      const content = section.slice(firstLineEnd).trim();
      return { title, content };
    });
  }, [finalPrompts]);

  const generateSingleImage = async (index: number, prompt: string, isLogo: boolean) => {
    if (!prompt) return;
    setGeneratingModules(prev => ({ ...prev, [index]: true }));
    try {
      const actualRatio = isLogo ? "1:1" : aspectRatio;
      // 传入 userApiKey 和 isAdminLoggedIn
      const res = await generateImageContent(images, prompt, actualRatio, userApiKey, isAdminLoggedIn);
      if (res) {
        setGeneratedImages(prev => ({ ...prev, [index]: `data:image/jpeg;base64,${res}` }));
      }
    } catch (err: any) {
      alert(`生成图片失败: ${err.message}`);
    } finally {
      setGeneratingModules(prev => ({ ...prev, [index]: false }));
    }
  };

  const checkAuth = () => {
    // 只有在用户输入了 Key，或者 (是管理员 且 有系统Key) 时，才算已授权
    const hasSystemKey = !!(process.env.API_KEY || import.meta.env.VITE_API_KEY);
    return !!(userApiKey || (isAdminLoggedIn && hasSystemKey));
  };

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden font-sans text-neutral-900 relative">
      <Sidebar
        images={images} setImages={setImages}
        setImageRatios={setImageRatios}
        description={description} setDescription={setDescription}
        manualBrand={manualBrand} setManualBrand={setManualBrand}
        selectedStyle={selectedStyle} setSelectedStyle={setSelectedStyle}
        selectedTypography={selectedTypography} setSelectedTypography={setSelectedTypography}
        needsModel={needsModel} setNeedsModel={setNeedsModel}
        modelDesc={modelDesc} setModelDesc={setModelDesc}
        needsScene={needsScene} setNeedsScene={setNeedsScene}
        sceneDesc={sceneDesc} setSceneDesc={setSceneDesc}
        needsDataVis={needsDataVis} setNeedsDataVis={setNeedsDataVis}
        otherNeeds={otherNeeds} setOtherNeeds={setOtherNeeds}
        aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
        generationLoading={generationLoading} startGeneration={startGeneration}
        report={report}
        ratioIcons={ratioIcons}
        visualStyleDescriptions={visualStyleDescriptions}
        typographyDescriptions={typographyDescriptions}
      />
      
      <MainContent
        checkAuth={checkAuth}
        hasApiKey={hasApiKey}
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

      <div className="absolute top-4 right-8 z-50 flex gap-3">
        <button 
           onClick={() => setIsConfigOpen(true)}
           className="px-4 py-2 bg-white/80 backdrop-blur border border-neutral-200 rounded-lg text-xs font-bold text-neutral-600 hover:bg-white shadow-sm transition-all"
        >
           {userApiKey ? '🔑 已配置个人 Key' : (isAdminLoggedIn ? '🔑 系统权限已激活' : '⚙️ 配置 Key')}
        </button>
        {!isAdminLoggedIn ? (
          <button
            onClick={() => setIsLoginOpen(true)} 
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 shadow-sm transition-all"
          >
            管理员登录
          </button>
        ) : (
           <div className="flex gap-2">
             <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold shadow-sm flex items-center">
               已管理员登录
             </span>
             <button
               onClick={handleAdminLogout}
               className="px-3 py-2 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-red-600 rounded-lg text-xs font-bold shadow-sm transition-all"
             >
               退出
             </button>
           </div>
        )}
      </div>

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

      <ApiKeyModal hasApiKey={hasApiKey} onSelectKey={handleSelectKey} />

      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur flex items-center justify-center p-10 cursor-zoom-out animate-fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
           <img src={previewImageUrl} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
};