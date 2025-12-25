import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { extractProductInfo, generatePosterSystem, generateImageContent } from './geminiService';
import { VisualStyle, TypographyStyle, RecognitionReport, SavedProject, ModelConfig } from './types';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { Navigation, ViewType } from './Navigation';
import { ProjectList } from './pages/ProjectList';
import { KeyConfig } from './pages/KeyConfig';
import { ModelSettings } from './pages/ModelSettings';
import { ApiKeyModal } from './ApiKeyModal';
import { LoginModal } from './LoginModal';

const CACHE_KEY = 'VISION_APP_CACHE_V1';
const PROJECTS_KEY = 'VISION_APP_PROJECTS_V1';

export const App: React.FC = () => {
  // --- View State ---
  const [currentView, setCurrentView] = useState<ViewType>('core');

  // --- 全局 UI 状态 (不缓存) ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // --- API Key 状态 (单独存储) ---
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState(true);

  // --- Model Configuration State ---
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    logicModel: 'gemini-3-flash-preview',
    visualModel: 'gemini-3-pro-image-preview'
  });

  // --- Projects State ---
  const [projects, setProjects] = useState<SavedProject[]>([]);

  // --- 辅助函数：从缓存读取初始值 ---
  const getCachedState = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed[key] !== undefined ? parsed[key] : defaultValue;
      }
    } catch (e) {
      console.warn('Failed to load cache', e);
    }
    return defaultValue;
  };

  useEffect(() => {
    // 恢复 API Key
    const storedKey = localStorage.getItem('USER_GEMINI_API_KEY');
    if (storedKey) {
      setUserApiKey(storedKey);
    }
    
    // 恢复 Projects
    const storedProjects = localStorage.getItem(PROJECTS_KEY);
    if (storedProjects) {
        try {
            setProjects(JSON.parse(storedProjects));
        } catch (e) {
            console.error("Failed to parse projects", e);
        }
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
    // Empty key means clear
    if (!key.trim()) {
       handleClearKey();
       return;
    }
    setUserApiKey(key.trim());
    localStorage.setItem('USER_GEMINI_API_KEY', key.trim());
    alert("API Key 已保存。");
  };

  const handleClearKey = () => {
    setUserApiKey('');
    localStorage.removeItem('USER_GEMINI_API_KEY');
    alert("已清除自定义 Key。");
  };

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
    alert("管理员登录成功！");
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    alert("已退出管理员登录。");
  };

  const handleUserIconClick = () => {
    if (isAdminLoggedIn) {
      if(window.confirm("确定要退出管理员权限吗？")) {
        handleAdminLogout();
      }
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    handleAdminLogin();
  };

  // --- 核心业务状态 (使用 lazy init 从缓存读取) ---
  const [generationLoading, setGenerationLoading] = useState(false); // Loading 状态不缓存，防止卡死
  
  const [images, setImages] = useState<string[]>(() => getCachedState('images', []));
  const [imageRatios, setImageRatios] = useState<number[]>(() => getCachedState('imageRatios', []));
  const [description, setDescription] = useState(() => getCachedState('description', ''));
  const [manualBrand, setManualBrand] = useState(() => getCachedState('manualBrand', ''));
  const [report, setReport] = useState<RecognitionReport | null>(() => getCachedState('report', null));
  
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(() => getCachedState('selectedStyle', VisualStyle.NORDIC));
  const [selectedTypography, setSelectedTypography] = useState<TypographyStyle>(() => getCachedState('selectedTypography', TypographyStyle.GLASS_MODERN));
  
  const [finalPrompts, setFinalPrompts] = useState(() => getCachedState('finalPrompts', ''));
  
  // 个性化需求状态
  const [needsModel, setNeedsModel] = useState(() => getCachedState('needsModel', false));
  const [modelDesc, setModelDesc] = useState(() => getCachedState('modelDesc', ''));
  
  const [needsScene, setNeedsScene] = useState(() => getCachedState('needsScene', false));
  const [sceneDesc, setSceneDesc] = useState(() => getCachedState('sceneDesc', ''));

  const [needsDataVis, setNeedsDataVis] = useState(() => getCachedState('needsDataVis', false));
  const [otherNeeds, setOtherNeeds] = useState(() => getCachedState('otherNeeds', ''));
  
  const [aspectRatio, setAspectRatio] = useState(() => getCachedState('aspectRatio', "9:16"));

  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>(() => getCachedState('generatedImages', {}));
  const [generatingModules, setGeneratingModules] = useState<Record<number, boolean>>({}); // Loading 状态不缓存
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  // Ref to track generating state for the batch process to avoid stale closures
  const generatingModulesRef = useRef<Record<number, boolean>>({});

  useEffect(() => {
    generatingModulesRef.current = generatingModules;
  }, [generatingModules]);

  // --- 数据持久化副作用 (Current State) ---
  useEffect(() => {
    const stateToCache = {
      images,
      imageRatios,
      description,
      manualBrand,
      report,
      selectedStyle,
      selectedTypography,
      finalPrompts,
      needsModel,
      modelDesc,
      needsScene,
      sceneDesc,
      needsDataVis,
      otherNeeds,
      aspectRatio,
      generatedImages
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(stateToCache));
  }, [
    images, imageRatios, description, manualBrand, report,
    selectedStyle, selectedTypography, finalPrompts,
    needsModel, modelDesc, needsScene, sceneDesc,
    needsDataVis, otherNeeds, aspectRatio, generatedImages
  ]);

  // --- 项目管理功能 ---
  const saveCurrentProject = () => {
    const name = prompt("请输入项目名称：", manualBrand || report?.brandName || "未命名项目");
    if (!name) return;

    const newProject: SavedProject = {
      id: Date.now().toString(),
      name,
      timestamp: Date.now(),
      data: {
        images, imageRatios, description, manualBrand, report,
        selectedStyle, selectedTypography, finalPrompts,
        needsModel, modelDesc, needsScene, sceneDesc,
        needsDataVis, otherNeeds, aspectRatio, generatedImages
      }
    };

    const updatedProjects = [newProject, ...projects];
    setProjects(updatedProjects);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));
    alert("项目保存成功！您可以到“项目列表”查看。");
  };

  const loadProject = (project: SavedProject) => {
    if (images.length > 0 && !window.confirm("当前有正在编辑的内容，加载项目将覆盖当前内容，是否继续？")) {
        return;
    }

    const d = project.data;
    setImages(d.images);
    setImageRatios(d.imageRatios);
    setDescription(d.description);
    setManualBrand(d.manualBrand);
    setReport(d.report);
    setSelectedStyle(d.selectedStyle);
    setSelectedTypography(d.selectedTypography);
    setFinalPrompts(d.finalPrompts);
    setNeedsModel(d.needsModel);
    setModelDesc(d.modelDesc);
    setNeedsScene(d.needsScene);
    setSceneDesc(d.sceneDesc);
    setNeedsDataVis(d.needsDataVis);
    setOtherNeeds(d.otherNeeds);
    setAspectRatio(d.aspectRatio);
    setGeneratedImages(d.generatedImages);
    
    // Reset transient states
    setGeneratingModules({});
    setGenerationLoading(false);
    
    // Switch view
    setCurrentView('core');
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
  };

  // --- 重制（清空）功能 ---
  const handleReset = useCallback(() => {
    if (!window.confirm("确定要重制吗？\n这将清空所有当前输入的数据和生成结果。")) {
      return;
    }
    
    // 清除 LocalStorage
    localStorage.removeItem(CACHE_KEY);
    
    // 重置所有 State
    setImages([]);
    setImageRatios([]);
    setDescription('');
    setManualBrand('');
    setReport(null);
    setSelectedStyle(VisualStyle.NORDIC);
    setSelectedTypography(TypographyStyle.GLASS_MODERN);
    setFinalPrompts('');
    setNeedsModel(false);
    setModelDesc('');
    setNeedsScene(false);
    setSceneDesc('');
    setNeedsDataVis(false);
    setOtherNeeds('');
    setAspectRatio("9:16");
    setGeneratedImages({});
    setGeneratingModules({});
    setPreviewImageUrl(null);
    setGenerationLoading(false);

  }, []);

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
      // 步骤 1: 执行产品解析
      const extractionRes = await extractProductInfo(
          images, 
          description, 
          userApiKey, 
          isAdminLoggedIn, 
          modelConfig.logicModel
      );
      setReport(extractionRes);
      
      let effectiveBrand = manualBrand;
      if (!effectiveBrand && extractionRes.brandName) {
        setManualBrand(extractionRes.brandName);
        effectiveBrand = extractionRes.brandName;
      }

      // 步骤 2: 执行方案生成
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
      if (needsDataVis) needsArray.push("需要数据可视化图表");
      if (otherNeeds) needsArray.push(otherNeeds);

      const combinedNeeds = needsArray.join('；');

      const promptRes = await generatePosterSystem(
        { ...extractionRes, brandName: effectiveBrand || extractionRes.brandName },
        selectedStyle,
        selectedTypography,
        combinedNeeds,
        userApiKey,
        isAdminLoggedIn,
        modelConfig.logicModel
      );
      setFinalPrompts(promptRes);

    } catch (err: any) {
      alert(`处理失败: ${err.message}`);
    } finally { 
      setGenerationLoading(false); 
    }
  };

  // 根据需求过滤：只保留“海报”相关的模块（过滤掉 LOGO 方案）
  const promptModules = useMemo(() => {
    if (!finalPrompts) return [];
    const sections = finalPrompts.split(/###\s*/).filter(s => s.trim());
    return sections
      .map(section => {
        const firstLineEnd = section.indexOf('\n');
        const title = section.slice(0, firstLineEnd).trim();
        const content = section.slice(firstLineEnd).trim();
        return { title, content };
      })
      .filter(module => module.title.includes('海报')); // 核心过滤逻辑：只保留标题包含“海报”的项
  }, [finalPrompts]);

  const generateSingleImage = async (index: number, prompt: string, isLogo: boolean) => {
    if (!prompt) return;
    setGeneratingModules(prev => ({ ...prev, [index]: true }));
    try {
      const actualRatio = isLogo ? "1:1" : aspectRatio;
      const res = await generateImageContent(
          images, 
          prompt, 
          actualRatio, 
          userApiKey, 
          isAdminLoggedIn,
          modelConfig.visualModel
      );
      if (res) {
        setGeneratedImages(prev => ({ ...prev, [index]: `data:image/jpeg;base64,${res}` }));
      }
    } catch (err: any) {
      console.error(`生成图片失败 (Index ${index}):`, err.message);
    } finally {
      setGeneratingModules(prev => ({ ...prev, [index]: false }));
    }
  };

  // --- 批量生成逻辑 ---
  const handleGenerateAll = async () => {
    if (!promptModules.length) return;

    // 1. 找出所有还没生成且当前没有正在生成的任务
    const pendingTasks = promptModules.map((m, i) => ({ ...m, index: i }))
      .filter(item => !generatedImages[item.index]);

    if (pendingTasks.length === 0) {
      alert("所有图片已生成完毕！");
      return;
    }

    // 2. 定义 Worker 池，最大并发 2
    const CONCURRENCY_LIMIT = 2;
    const taskQueue = [...pendingTasks];

    const runWorker = async () => {
      while (taskQueue.length > 0) {
        const task = taskQueue.shift();
        if (!task) break;

        if (generatingModulesRef.current[task.index]) continue;

        const isLogo = task.title.includes("LOGO");
        await generateSingleImage(task.index, task.content, isLogo);
      }
    };

    const workers = [];
    for (let i = 0; i < Math.min(pendingTasks.length, CONCURRENCY_LIMIT); i++) {
      workers.push(runWorker());
    }

    await Promise.all(workers);
  };

  const checkAuth = () => {
    const hasSystemKey = !!(process.env.API_KEY);
    return !!(userApiKey || (isAdminLoggedIn && hasSystemKey));
  };

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden font-sans text-neutral-900 relative">
      <Navigation 
        currentView={currentView} 
        onChange={setCurrentView} 
        isAdminLoggedIn={isAdminLoggedIn}
        onUserClick={handleUserIconClick}
      />

      {/* Main Area based on View */}
      {currentView === 'core' && (
        <>
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
                onReset={handleReset}
                onSaveProject={saveCurrentProject}
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
                generateAllImages={handleGenerateAll}
                promptModules={promptModules}
                aspectRatio={aspectRatio}
            />
        </>
      )}

      {currentView === 'projects' && (
          <ProjectList 
             projects={projects} 
             onLoad={loadProject} 
             onDelete={deleteProject} 
          />
      )}

      {currentView === 'key' && (
          <KeyConfig 
             userApiKey={userApiKey} 
             onSave={handleSaveKey} 
             onClear={handleClearKey} 
          />
      )}

      {currentView === 'models' && (
          <ModelSettings 
             config={modelConfig} 
             onSave={setModelConfig} 
          />
      )}

      {/* Global Modals */}
      <ApiKeyModal hasApiKey={hasApiKey} onSelectKey={handleSelectKey} />
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onLoginSuccess={handleLoginSuccess} 
      />

      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur flex items-center justify-center p-10 cursor-zoom-out animate-fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
           <img 
            src={previewImageUrl} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};