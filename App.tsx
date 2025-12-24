import React, { useState, useEffect, useMemo } from 'react';
import { extractProductInfo, generatePosterSystem, generateImageContent } from './geminiService';
import { VisualStyle, TypographyStyle, RecognitionReport } from './types';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { ApiKeyModal } from './ApiKeyModal';

export const App: React.FC = () => {
  // --- API Key 状态 ---
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
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
      const extractionRes = await extractProductInfo(images, description);
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
        combinedNeeds
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
      const res = await generateImageContent(images, prompt, actualRatio);
      if (res) {
        setGeneratedImages(prev => ({ ...prev, [index]: `data:image/jpeg;base64,${res}` }));
      }
    } catch (err: any) {
      alert(`生成图片失败: ${err.message}`);
    } finally {
      setGeneratingModules(prev => ({ ...prev, [index]: false }));
    }
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
        checkAuth={() => true}
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