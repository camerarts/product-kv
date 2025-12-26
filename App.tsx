
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { extractProductInfo, generatePosterSystem, generateImageContent } from './geminiService';
import { uploadImage } from './services/storageService';
import { VisualStyle, TypographyStyle, RecognitionReport, SavedProject, ModelConfig, SyncStatus, UserProfile, ViewType } from './types';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { Navigation } from './Navigation';
import { ProjectList } from './pages/ProjectList';
import { UserManagement } from './pages/UserManagement';
import { KeyConfig } from './pages/KeyConfig';
import { ModelSettings } from './pages/ModelSettings';
import { ApiKeyModal } from './ApiKeyModal';
import { LoginModal } from './LoginModal';

const CACHE_KEY = 'VISION_APP_CACHE_V1';
const PROJECTS_KEY = 'VISION_APP_PROJECTS_V1';
const ADMIN_SESSION_KEY = 'VISION_ADMIN_SESSION_TIMESTAMP';
const SESSION_DURATION = 4 * 60 * 60 * 1000; // 4 hours

// Helper to generate a 15-character unique ID (Timestamp + Random)
const generateProjectId = () => {
  const timestamp = Date.now().toString(36).toUpperCase(); // ~8 chars
  const random = Math.random().toString(36).substring(2, 9).toUpperCase(); // 7 chars
  return (timestamp + random).slice(0, 15);
};

// Helper to update URL
const updateUrl = (id: string | null) => {
    const url = new URL(window.location.href);
    if (id) {
        url.searchParams.set('project', id);
    } else {
        url.searchParams.delete('project');
    }
    window.history.pushState({}, '', url);
};

export const App: React.FC = () => {
  // --- View State ---
  const [currentView, setCurrentView] = useState<ViewType>('core');

  // --- 全局 UI 状态 (持久化登录) ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    try {
      const stored = localStorage.getItem(ADMIN_SESSION_KEY);
      if (stored) {
        const timestamp = parseInt(stored, 10);
        if (!isNaN(timestamp) && (Date.now() - timestamp < SESSION_DURATION)) {
          return true;
        }
      }
    } catch (e) {
      console.error("Session restore failed", e);
    }
    return false;
  });

  // Store admin password in memory for API calls (User Management)
  const [adminPassword, setAdminPassword] = useState<string | undefined>(undefined);

  // --- Google Auth User State ---
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

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
  const [projects, setProjects] = useState<any[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [pendingUrlId, setPendingUrlId] = useState<string | null>(null);

  // --- Save Status State (New) ---
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);

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

  // 获取项目列表 (Cloudflare API + LocalStorage Merge)
  const fetchProjects = useCallback(async () => {
    setIsProjectsLoading(true);
    
    // 1. Get Local Data
    let localList: any[] = [];
    try {
        const stored = localStorage.getItem(PROJECTS_KEY);
        if (stored) localList = JSON.parse(stored);
    } catch(e) { console.error(e); }

    // --- SECURITY FILTER ---
    if (currentUser) {
        localList = localList.filter(p => p.userId === currentUser.id);
    } else {
        localList = localList.filter(p => !p.userId);
    }

    // 2. Get Cloud Data
    let cloudList: any[] = [];
    try {
      const headers: Record<string, string> = {};
      if (isAdminLoggedIn && adminPassword) {
         headers['X-Admin-Pass'] = adminPassword;
      }

      const res = await fetch('/api/projects', { headers });
      if (res.ok) {
        cloudList = await res.json();
        
        // --- SECURITY FILTER (CLOUD) ---
        if (currentUser && !isAdminLoggedIn) {
             cloudList = cloudList.filter(p => p.userId === currentUser.id);
        }
      }
    } catch (e) { console.warn("Cloud fetch failed", e); }

    // 3. Merge & Determine Status
    const map = new Map<string, any>();

    localList.forEach(p => {
        map.set(p.id, { ...p, isSynced: false });
    });

    cloudList.forEach(p => {
        const existing = map.get(p.id);
        if (existing) {
             map.set(p.id, { ...existing, isSynced: true });
        } else {
             map.set(p.id, { ...p, isSynced: true });
        }
    });

    const merged = Array.from(map.values()).sort((a: any, b: any) => b.timestamp - a.timestamp);
    setProjects(merged);
    setIsProjectsLoading(false);
  }, [isAdminLoggedIn, adminPassword, currentUser]);

  // --- Effects ---

  // 1. Init Auth & Key
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get('auth_error');
    if (authError === 'expired') {
      alert("⚠️ 您的账号已过期。\n\n账号有效期默认为首次登录后30天。请联系管理员进行延期处理。");
      updateUrl(null);
    }

    const pid = urlParams.get('project');
    if (pid) setPendingUrlId(pid);

    const storedKey = localStorage.getItem('USER_GEMINI_API_KEY');
    if (storedKey) setUserApiKey(storedKey);
    
    const checkAuth = async () => {
       try {
         const res = await fetch('/api/auth/me');
         if (res.ok) {
           const data = await res.json();
           if (data.authenticated) {
             setCurrentUser(data.user);
           }
         }
       } catch (e) {
         console.warn("Auth check failed", e);
       }
    };
    checkAuth();

    if (window.aistudio) {
      window.aistudio.hasSelectedApiKey().then((has) => {
        setHasApiKey(has);
      });
    }
  }, []);

  // 2. Fetch Projects when Auth changes
  useEffect(() => {
    fetchProjects();
  }, [isAdminLoggedIn, currentUser, adminPassword, fetchProjects]);

  
  // 3. Load Project from URL
  useEffect(() => {
      if (pendingUrlId && projects.length > 0) {
          const found = projects.find(p => p.id === pendingUrlId);
          if (found) {
              loadProject(found);
          }
          setPendingUrlId(null);
      }
  }, [projects, pendingUrlId]);


  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      const has = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(has);
    }
  };

  const handleSaveKey = (key: string) => {
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

  const handleAdminLogin = (password?: string) => {
    setIsAdminLoggedIn(true);
    localStorage.setItem(ADMIN_SESSION_KEY, Date.now().toString());
    if(password) {
        setAdminPassword(password);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminPassword(undefined);
    setProjects([]);
    if (currentView === 'users') setCurrentView('core');
  };

  const handleGoogleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setProjects([]);
    } catch (e) {
      console.error("Logout failed", e);
    }
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

  const handleLoginSuccess = (pass: string) => {
    handleAdminLogin(pass);
  };

  // --- Core State ---
  const [generationLoading, setGenerationLoading] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => getCachedState('currentProjectId', null));

  const [images, setImages] = useState<string[]>(() => getCachedState('images', []));
  const [imageRatios, setImageRatios] = useState<number[]>(() => getCachedState('imageRatios', []));
  const [description, setDescription] = useState(() => getCachedState('description', ''));
  const [manualBrand, setManualBrand] = useState(() => getCachedState('manualBrand', ''));
  const [report, setReport] = useState<RecognitionReport | null>(() => getCachedState('report', null));
  
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(() => getCachedState('selectedStyle', VisualStyle.NORDIC));
  const [selectedTypography, setSelectedTypography] = useState<TypographyStyle>(() => getCachedState('selectedTypography', TypographyStyle.GLASS_MODERN));
  
  const [finalPrompts, setFinalPrompts] = useState(() => getCachedState('finalPrompts', ''));
  
  const [needsModel, setNeedsModel] = useState(() => getCachedState('needsModel', false));
  const [modelDesc, setModelDesc] = useState(() => getCachedState('modelDesc', ''));
  
  const [needsScene, setNeedsScene] = useState(() => getCachedState('needsScene', false));
  const [sceneDesc, setSceneDesc] = useState(() => getCachedState('sceneDesc', ''));

  const [needsDataVis, setNeedsDataVis] = useState(() => getCachedState('needsDataVis', false));
  const [otherNeeds, setOtherNeeds] = useState(() => getCachedState('otherNeeds', ''));
  
  const [aspectRatio, setAspectRatio] = useState(() => getCachedState('aspectRatio', "9:16"));

  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>(() => getCachedState('generatedImages', {}));
  const [imageSyncStatus, setImageSyncStatus] = useState<Record<number, SyncStatus>>(() => getCachedState('imageSyncStatus', {}));

  const [generatingModules, setGeneratingModules] = useState<Record<number, boolean>>({}); 
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  const generatingModulesRef = useRef<Record<number, boolean>>({});
  const generatedImagesRef = useRef<Record<number, string>>({});

  useEffect(() => {
    generatingModulesRef.current = generatingModules;
  }, [generatingModules]);

  useEffect(() => {
    generatedImagesRef.current = generatedImages;
  }, [generatedImages]);

  // --- Local Cache ---
  useEffect(() => {
    try {
      const stateToCache = {
        currentProjectId,
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
        generatedImages,
        imageSyncStatus
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(stateToCache));
    } catch (e) {
      console.warn("Local storage update failed", e);
    }
  }, [
    currentProjectId,
    images, imageRatios, description, manualBrand, report,
    selectedStyle, selectedTypography, finalPrompts,
    needsModel, modelDesc, needsScene, sceneDesc,
    needsDataVis, otherNeeds, aspectRatio, generatedImages, imageSyncStatus
  ]);

  // --- Sync Logic (UPDATED: DIRECT UPLOAD + STATE UPDATE) ---
  const syncProjectToCloud = useCallback(async (targetIndexToMarkSynced?: number) => {
    if (!currentProjectId) return;
    
    // Create optimistic update for sync status
    let newSyncStatus = { ...imageSyncStatus };
    if (targetIndexToMarkSynced !== undefined) {
        newSyncStatus[targetIndexToMarkSynced] = 'synced';
    }

    // Prepare data (with local base64 for local save)
    const localProjectData: SavedProject = {
      id: currentProjectId,
      name: manualBrand || report?.brandName || `自动保存 ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      userId: currentUser?.id,
      userName: currentUser?.name,
      data: {
        images, imageRatios, description, manualBrand, report,
        selectedStyle, selectedTypography, finalPrompts,
        needsModel, modelDesc, needsScene, sceneDesc,
        needsDataVis, otherNeeds, aspectRatio, 
        generatedImages: generatedImagesRef.current,
        imageSyncStatus: newSyncStatus
      }
    };

    // Save locally
    try {
        const stored = localStorage.getItem(PROJECTS_KEY);
        const currentProjects = stored ? JSON.parse(stored) : [];
        const existingIdx = currentProjects.findIndex((p: any) => p.id === currentProjectId);
        let updated;
        if (existingIdx >= 0) {
            currentProjects[existingIdx] = localProjectData;
            updated = [...currentProjects];
        } else {
            updated = [localProjectData, ...currentProjects];
        }
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
        
        setProjects(updated.map((p: any) => ({ 
            ...p, 
            isSynced: (isAdminLoggedIn || currentUser) ? (p.id === currentProjectId ? false : p.isSynced) : false 
        })).filter(p => {
            if (currentUser) return p.userId === currentUser.id;
            return !p.userId;
        })); 
    } catch (e) { console.error("Auto-save local failed", e); }

    // Upload to Cloud (Separate Images)
    if (isAdminLoggedIn || currentUser) {
        setIsSaving(true);
        try {
          // 1. UPLOAD REFERENCE IMAGES
          const imagesToSave = [...images]; 
          const generatedImagesToSave = { ...generatedImagesRef.current };
          let imagesUpdated = false;
          let generatedImagesUpdated = false;

          // Upload Ref Images
          for (let i = 0; i < imagesToSave.length; i++) {
             const img = imagesToSave[i];
             if (img && img.length > 500 && !img.startsWith('/api/images')) { 
                const fullBase64 = img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
                const url = await uploadImage(fullBase64, currentProjectId);
                imagesToSave[i] = url; 
                imagesUpdated = true;
             }
          }

          if (imagesUpdated) {
              setImages(imagesToSave);
          }

          // Upload Generated Images
          for (const key of Object.keys(generatedImagesToSave)) {
              const k = parseInt(key);
              const img = generatedImagesToSave[k];
              // Check if it's base64 (long string) and NOT already an API URL
              if (img && img.length > 500 && !img.startsWith('/api/images')) {
                 const fullBase64 = img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
                 const url = await uploadImage(fullBase64, currentProjectId);
                 generatedImagesToSave[k] = url;
                 
                 // Mark as synced immediately for this item
                 newSyncStatus[k] = 'synced';
                 generatedImagesUpdated = true;
              } else if (img && img.startsWith('/api/images') && newSyncStatus[k] !== 'synced') {
                 // Ensure status is consistent if it's already a URL
                 newSyncStatus[k] = 'synced';
                 generatedImagesUpdated = true;
              }
          }

          // CRITICAL FIX: Update React State with new URLs so we don't re-upload
          if (generatedImagesUpdated) {
              setGeneratedImages(generatedImagesToSave);
              generatedImagesRef.current = generatedImagesToSave; // Update Ref immediately
              setImageSyncStatus(newSyncStatus);
          }

          // 2. SAVE JSON (With URLs)
          const cloudProjectData = {
             ...localProjectData,
             data: {
                 ...localProjectData.data,
                 images: imagesToSave,
                 generatedImages: generatedImagesToSave,
                 imageSyncStatus: newSyncStatus // Save correct status to cloud
             }
          };

          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (isAdminLoggedIn && adminPassword) headers['X-Admin-Pass'] = adminPassword;

          const res = await fetch('/api/projects', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(cloudProjectData)
          });

          if (res.ok) {
            setLastSaveTime(Date.now());
            // Final consistency check
            setImageSyncStatus(newSyncStatus);
            setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, isSynced: true } : p));
          }
        } catch (e) {
          console.error("Cloud sync error", e);
        } finally {
          setIsSaving(false);
        }
    }
  }, [
    currentProjectId, manualBrand, report, images, imageRatios, description, 
    selectedStyle, selectedTypography, finalPrompts, needsModel, modelDesc, 
    needsScene, sceneDesc, needsDataVis, otherNeeds, aspectRatio, imageSyncStatus,
    isAdminLoggedIn, adminPassword, currentUser
  ]);

  // --- Trigger Sync ---
  useEffect(() => {
    if ((isAdminLoggedIn || currentUser) && currentProjectId && (images.length > 0 || Object.keys(generatedImages).length > 0)) {
        syncProjectToCloud();
    }
  }, [isAdminLoggedIn, currentUser]);

  // --- Auto-Save ---
  useEffect(() => {
    if (!currentProjectId || generationLoading) return;
    const timer = setTimeout(() => syncProjectToCloud(), 2000);
    return () => clearTimeout(timer);
  }, [
    currentProjectId,
    images, imageRatios, description, manualBrand, report,
    selectedStyle, selectedTypography, finalPrompts,
    needsModel, modelDesc, needsScene, sceneDesc,
    needsDataVis, otherNeeds, aspectRatio, 
    generatedImages, syncProjectToCloud, generationLoading
  ]);

  // --- Manual Save ---
  const saveCurrentProject = async () => {
    if (!isAdminLoggedIn && !currentUser) {
        setIsLoginModalOpen(true); 
        return;
    }
    const name = prompt("请输入项目名称：", manualBrand || report?.brandName || "未命名项目");
    if (!name) return;

    setManualBrand(name);
    const pid = currentProjectId || generateProjectId();
    if (!currentProjectId) {
      setCurrentProjectId(pid);
      updateUrl(pid);
    }
    // Logic handles the upload
    setTimeout(() => syncProjectToCloud(), 100);
  };

  const loadProject = async (projectMeta: any) => {
    if (images.length > 0 && currentProjectId !== projectMeta.id && !pendingUrlId) {
        if (!window.confirm("当前有正在编辑的内容，加载项目将覆盖当前内容，是否继续？")) {
            return;
        }
    }

    let projectData = projectMeta.data;

    if (!projectData) {
        try {
            const res = await fetch(`/api/project/${projectMeta.id}`);
            if (res.ok) {
                const fullProject = await res.json();
                projectData = fullProject.data;
            } else {
                throw new Error("Cloud load failed");
            }
        } catch (e) {
            console.warn("Cloud load failed, trying local");
            const stored = localStorage.getItem(PROJECTS_KEY);
            if (stored) {
                const list = JSON.parse(stored);
                const found = list.find((p: any) => p.id === projectMeta.id);
                if (found) projectData = found.data;
            }
        }
    }

    if (!projectData) {
        alert("加载失败");
        return;
    }

    setCurrentProjectId(projectMeta.id);
    updateUrl(projectMeta.id);

    // If images are URLs, keep them. If Base64, keep them.
    // The UI (Sidebar/MainContent) handles both via <img src={...}>
    setImages(projectData.images || []);
    setImageRatios(projectData.imageRatios || []);
    setDescription(projectData.description || '');
    setManualBrand(projectData.manualBrand || '');
    setReport(projectData.report);
    setSelectedStyle(projectData.selectedStyle);
    setSelectedTypography(projectData.selectedTypography);
    setFinalPrompts(projectData.finalPrompts || '');
    setNeedsModel(projectData.needsModel || false);
    setModelDesc(projectData.modelDesc || '');
    setNeedsScene(projectData.needsScene || false);
    setSceneDesc(projectData.sceneDesc || '');
    setNeedsDataVis(projectData.needsDataVis || false);
    setOtherNeeds(projectData.otherNeeds || '');
    setAspectRatio(projectData.aspectRatio || "9:16");
    setGeneratedImages(projectData.generatedImages || {});
    setImageSyncStatus(projectData.imageSyncStatus || {});
    
    setGeneratingModules({});
    setIsBatchGenerating(false);
    setGenerationLoading(false);
    setLastSaveTime(projectMeta.timestamp);
    
    setCurrentView('core');
  };

  const deleteProject = async (id: string) => {
    try {
        const stored = localStorage.getItem(PROJECTS_KEY);
        if (stored) {
            const list = JSON.parse(stored);
            const updated = list.filter((p: any) => p.id !== id);
            localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
        }
    } catch(e) {}

    fetch(`/api/project/${id}`, { method: 'DELETE' }).catch(e => console.error(e));

    setProjects(prev => prev.filter(p => p.id !== id));
    
    if (id === currentProjectId) {
        setCurrentProjectId(null);
        updateUrl(null);
    }
  };

  const handleReset = useCallback(() => {
    if (!window.confirm("确定要重制吗？")) return;
    localStorage.removeItem(CACHE_KEY);
    updateUrl(null);
    setCurrentProjectId(null);
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
    setImageSyncStatus({});
    setGeneratingModules({});
    setIsBatchGenerating(false);
    setPreviewImageUrl(null);
    setGenerationLoading(false);
    setLastSaveTime(null);
  }, []);

  const handleNewProject = useCallback(() => {
    if (images.length > 0) {
        if (!window.confirm("创建新项目将清空当前内容。是否继续？")) return;
    }
    const name = prompt("请输入新项目/品牌名称：");
    if (!name) return;

    localStorage.removeItem(CACHE_KEY);
    const newId = generateProjectId();
    setCurrentProjectId(newId);
    updateUrl(newId);

    setImages([]);
    setImageRatios([]);
    setDescription('');
    setManualBrand(name);
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
    setImageSyncStatus({});
    setGeneratingModules({});
    setIsBatchGenerating(false);
    setPreviewImageUrl(null);
    setGenerationLoading(false);
    setLastSaveTime(null);
    setCurrentView('core');
  }, [images]);

  // Descriptions & Icons...
  const ratioIcons: Record<string, string> = { "1:1": "1:1", "16:9": "16:9", "9:16": "9:16", "3:4": "3:4", "4:3": "4:3", "2:3": "2:3", "3:2": "3:2" };
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
      const extractionRes = await extractProductInfo(images, description, userApiKey, isAdminLoggedIn, modelConfig.logicModel);
      setReport(extractionRes);
      let effectiveBrand = manualBrand;
      if (!effectiveBrand && extractionRes.brandName) {
        setManualBrand(extractionRes.brandName);
        effectiveBrand = extractionRes.brandName;
      }
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
        selectedStyle, selectedTypography, combinedNeeds, userApiKey, isAdminLoggedIn, modelConfig.logicModel
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
    const sections = finalPrompts.split(/###\s*/).filter(s => s.trim());
    return sections.map(section => {
        const firstLineEnd = section.indexOf('\n');
        const title = section.slice(0, firstLineEnd).trim();
        const content = section.slice(firstLineEnd).trim();
        return { title, content };
    }).filter(module => module.title.includes('海报'));
  }, [finalPrompts]);

  const generateSingleImage = async (index: number, prompt: string, isLogo: boolean) => {
    if (!prompt) return;
    setGeneratingModules(prev => ({ ...prev, [index]: true }));
    try {
      const actualRatio = isLogo ? "1:1" : aspectRatio;
      const res = await generateImageContent(images, prompt, actualRatio, userApiKey, isAdminLoggedIn, modelConfig.visualModel);
      if (res) {
        const b64 = `data:image/jpeg;base64,${res}`;
        setGeneratedImages(prev => ({ ...prev, [index]: b64 }));
        setImageSyncStatus(prev => ({ ...prev, [index]: 'unsynced' }));
        generatedImagesRef.current = { ...generatedImagesRef.current, [index]: b64 };
        if (isAdminLoggedIn || currentUser) await syncProjectToCloud(index);
      }
    } catch (err: any) {
      console.error(`生成图片失败 (Index ${index}):`, err.message);
    } finally {
      setGeneratingModules(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleGenerateAll = async () => {
    if (!promptModules.length) return;
    if (isBatchGenerating) return;
    const pendingTasks = promptModules.map((m, i) => ({ ...m, index: i })).filter(item => !generatedImages[item.index]);
    if (pendingTasks.length === 0) return alert("所有图片已生成完毕！");

    setIsBatchGenerating(true);
    try {
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
      for (let i = 0; i < Math.min(pendingTasks.length, CONCURRENCY_LIMIT); i++) workers.push(runWorker());
      await Promise.all(workers);
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const checkAuth = () => !!(userApiKey || (isAdminLoggedIn && process.env.API_KEY));

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans text-slate-800 relative bg-transparent">
      <Navigation 
        currentView={currentView} 
        onChange={(view) => {
            if (view === 'projects') {
                if (isAdminLoggedIn || currentUser) fetchProjects(); else setProjects([]);
            }
            if (view === 'users' && !isAdminLoggedIn) return;
            setCurrentView(view);
        }} 
        isAdminLoggedIn={isAdminLoggedIn} currentUser={currentUser} onUserClick={handleUserIconClick} onNewProject={handleNewProject} onGoogleLogin={() => window.location.href = '/api/auth/google'} onGoogleLogout={handleGoogleLogout}
      />

      {currentView === 'core' && (
        <>
            <Sidebar
                images={images} setImages={setImages} setImageRatios={setImageRatios} description={description} setDescription={setDescription} manualBrand={manualBrand} setManualBrand={setManualBrand} selectedStyle={selectedStyle} setSelectedStyle={setSelectedStyle} selectedTypography={selectedTypography} setSelectedTypography={setSelectedTypography} needsModel={needsModel} setNeedsModel={setNeedsModel} modelDesc={modelDesc} setModelDesc={setModelDesc} needsScene={needsScene} setNeedsScene={setNeedsScene} sceneDesc={sceneDesc} setSceneDesc={setSceneDesc} needsDataVis={needsDataVis} setNeedsDataVis={setNeedsDataVis} otherNeeds={otherNeeds} setOtherNeeds={setOtherNeeds} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} generationLoading={generationLoading} startGeneration={startGeneration} report={report} ratioIcons={ratioIcons} visualStyleDescriptions={visualStyleDescriptions} typographyDescriptions={typographyDescriptions} onReset={handleReset} isAdminLoggedIn={isAdminLoggedIn}
            />
            <MainContent
                checkAuth={checkAuth} hasApiKey={hasApiKey} manualBrand={manualBrand} report={report} selectedStyle={selectedStyle} selectedTypography={selectedTypography} finalPrompts={finalPrompts} generatedImages={generatedImages} imageSyncStatus={imageSyncStatus} generatingModules={generatingModules} isBatchGenerating={isBatchGenerating} previewImageUrl={previewImageUrl} setPreviewImageUrl={setPreviewImageUrl} generateSingleImage={generateSingleImage} generateAllImages={handleGenerateAll} promptModules={promptModules} aspectRatio={aspectRatio} projectName={manualBrand || report?.brandName || "未命名项目"} isSaving={isSaving} lastSaveTime={lastSaveTime} onManualSave={() => syncProjectToCloud()}
            />
        </>
      )}

      {currentView === 'projects' && (
          <ProjectList projects={projects} onLoad={loadProject} onDelete={deleteProject} isAuthenticated={isAdminLoggedIn || !!currentUser} isSaving={isSaving} lastSaveTime={lastSaveTime} />
      )}
      {currentView === 'users' && (
          <UserManagement adminPassword={adminPassword} onRelogin={(pass) => setAdminPassword(pass)} />
      )}
      {currentView === 'key' && (
          <KeyConfig userApiKey={userApiKey} onSave={handleSaveKey} onClear={handleClearKey} isAdminLoggedIn={isAdminLoggedIn} onAdminLogin={() => handleAdminLogin()} onAdminLogout={handleAdminLogout} />
      )}
      {currentView === 'models' && (
          <ModelSettings config={modelConfig} onSave={setModelConfig} isAuthenticated={!!currentUser} />
      )}
      <ApiKeyModal hasApiKey={hasApiKey} onSelectKey={handleSelectKey} />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLoginSuccess={handleLoginSuccess} onGoogleLogin={() => window.location.href = '/api/auth/google'} />

      {previewImageUrl && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-2xl flex items-center justify-center p-10 cursor-zoom-out animate-fade-in" onClick={() => setPreviewImageUrl(null)}>
           <img src={previewImageUrl} className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};
