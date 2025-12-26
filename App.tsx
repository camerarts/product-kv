import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { extractProductInfo, generatePosterSystem, generateImageContent } from './geminiService';
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
    // Prevent users from seeing other users' local projects on shared devices
    if (currentUser) {
        // If logged in via Google, only show projects belonging to this user ID
        localList = localList.filter(p => p.userId === currentUser.id);
    } else {
        // If Guest (or Admin login which is separate), only show projects with NO userId (Guest projects)
        // This ensures that logging out hides the user's projects from the guest view
        localList = localList.filter(p => !p.userId);
    }

    // 2. Get Cloud Data
    let cloudList: any[] = [];
    try {
      const headers: Record<string, string> = {};
      // If admin and password present, send it to see all projects
      if (isAdminLoggedIn && adminPassword) {
         headers['X-Admin-Pass'] = adminPassword;
      }

      const res = await fetch('/api/projects', { headers });
      if (res.ok) {
        cloudList = await res.json();
        
        // --- SECURITY FILTER (CLOUD) ---
        // Double security: strictly filter cloud results on frontend as well
        // If I am a regular user (and not currently in Admin mode), strictly show ONLY my projects.
        if (currentUser && !isAdminLoggedIn) {
             cloudList = cloudList.filter(p => p.userId === currentUser.id);
        }
      }
    } catch (e) { console.warn("Cloud fetch failed", e); }

    // 3. Merge & Determine Status
    const map = new Map<string, any>();

    // Initialize with local (default unsynced)
    localList.forEach(p => {
        map.set(p.id, { ...p, isSynced: false });
    });

    // Merge cloud (mark synced)
    cloudList.forEach(p => {
        const existing = map.get(p.id);
        if (existing) {
             // Exists locally, mark as synced
             map.set(p.id, { ...existing, isSynced: true });
        } else {
             // Only in cloud
             map.set(p.id, { ...p, isSynced: true });
        }
    });

    const merged = Array.from(map.values()).sort((a: any, b: any) => b.timestamp - a.timestamp);
    setProjects(merged);
    setIsProjectsLoading(false);
  }, [isAdminLoggedIn, adminPassword, currentUser]);

  // --- Effects ---

  // 1. Init Auth & Key (Run once)
  useEffect(() => {
    // Check for auth errors in URL (e.g. Expired Account)
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get('auth_error');
    if (authError === 'expired') {
      alert("⚠️ 您的账号已过期。\n\n账号有效期默认为首次登录后30天。请联系管理员进行延期处理。");
      // Clear URL params
      updateUrl(null);
    }

    // Check for project ID in URL
    const pid = urlParams.get('project');
    if (pid) {
        setPendingUrlId(pid);
    }

    // 恢复 API Key
    const storedKey = localStorage.getItem('USER_GEMINI_API_KEY');
    if (storedKey) {
      setUserApiKey(storedKey);
    }
    
    // Check Google Auth Status
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

  // 2. Fetch Projects when Auth changes (Auto-Download)
  useEffect(() => {
    // Always fetch projects to ensure the list reflects the current user state (including guest)
    fetchProjects();
  }, [isAdminLoggedIn, currentUser, adminPassword, fetchProjects]);

  
  // 3. Load Project from URL if pending
  useEffect(() => {
      if (pendingUrlId && projects.length > 0) {
          const found = projects.find(p => p.id === pendingUrlId);
          if (found) {
              console.log("Loading project from URL:", pendingUrlId);
              loadProject(found);
          }
          // Clear pending ID so we don't reload or loop
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
    // Logout clears the projects list from memory
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

  // --- 核心业务状态 (使用 lazy init 从缓存读取) ---
  const [generationLoading, setGenerationLoading] = useState(false); // Loading 状态不缓存，防止卡死
  
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => getCachedState('currentProjectId', null));

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
  const [imageSyncStatus, setImageSyncStatus] = useState<Record<number, SyncStatus>>(() => getCachedState('imageSyncStatus', {}));

  const [generatingModules, setGeneratingModules] = useState<Record<number, boolean>>({}); // Loading 状态不缓存
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  // Ref to track generating state for the batch process to avoid stale closures
  const generatingModulesRef = useRef<Record<number, boolean>>({});
  const generatedImagesRef = useRef<Record<number, string>>({});

  useEffect(() => {
    generatingModulesRef.current = generatingModules;
  }, [generatingModules]);

  useEffect(() => {
    generatedImagesRef.current = generatedImages;
  }, [generatedImages]);

  // --- 数据持久化副作用 (Current State Local Cache) ---
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
      console.warn("Local storage update failed (likely quota exceeded). This only affects offline cache, not cloud sync.", e);
    }
  }, [
    currentProjectId,
    images, imageRatios, description, manualBrand, report,
    selectedStyle, selectedTypography, finalPrompts,
    needsModel, modelDesc, needsScene, sceneDesc,
    needsDataVis, otherNeeds, aspectRatio, generatedImages, imageSyncStatus
  ]);

  // --- 自动上传/同步逻辑 (Backend Sync) ---
  const syncProjectToCloud = useCallback(async (targetIndexToMarkSynced?: number) => {
    if (!currentProjectId) return; // Don't sync if no ID (shouldn't happen in auto-save context usually)
    
    // Prepare project data
    const projectDataToSave: SavedProject = {
      id: currentProjectId,
      name: manualBrand || report?.brandName || `自动保存 ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      userId: currentUser?.id, // Bind to current user locally as well
      userName: currentUser?.name, // Bind creator name
      data: {
        images, imageRatios, description, manualBrand, report,
        selectedStyle, selectedTypography, finalPrompts,
        needsModel, modelDesc, needsScene, sceneDesc,
        needsDataVis, otherNeeds, aspectRatio, 
        generatedImages: generatedImagesRef.current, // Use ref for latest
        imageSyncStatus // This might be slightly stale if called immediately, but we update optimistically below
      }
    };

    // First, save to local storage project list (Always happens, even for guests)
    try {
        const stored = localStorage.getItem(PROJECTS_KEY);
        const currentProjects = stored ? JSON.parse(stored) : [];
        const existingIdx = currentProjects.findIndex((p: any) => p.id === currentProjectId);
        let updated;
        if (existingIdx >= 0) {
            currentProjects[existingIdx] = projectDataToSave;
            updated = [...currentProjects];
        } else {
            updated = [projectDataToSave, ...currentProjects];
        }
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
        
        // Update Project List UI
        setProjects(updated.map((p: any) => ({ 
            ...p, 
            // If logged in, assume it will be synced shortly. If guest, force unsynced.
            isSynced: (isAdminLoggedIn || currentUser) ? (p.id === currentProjectId ? false : p.isSynced) : false 
        })).filter(p => {
            // Apply same filtering to the immediate state update
            if (currentUser) return p.userId === currentUser.id;
            return !p.userId;
        })); 
    } catch (e) { console.error("Auto-save local failed (quota likely exceeded)", e); }

    // Then upload to Cloud (ONLY IF LOGGED IN)
    // Non-login users will NOT upload generated data to server
    if (isAdminLoggedIn || currentUser) {
        setIsSaving(true);
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (isAdminLoggedIn && adminPassword) headers['X-Admin-Pass'] = adminPassword;

          const res = await fetch('/api/projects', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(projectDataToSave)
          });

          if (res.ok) {
            setLastSaveTime(Date.now()); // Update timestamp on success
            // Mark specific image as synced if specified (Immediate Green Dot)
            if (targetIndexToMarkSynced !== undefined) {
                setImageSyncStatus(prev => ({ ...prev, [targetIndexToMarkSynced]: 'synced' }));
            }
            // Update project list sync status
            setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, isSynced: true } : p));
          } else {
            console.warn("Auto-upload to cloud failed");
          }
        } catch (e) {
          console.error("Auto-upload error", e);
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

  // --- Trigger Sync on Login ---
  // If user transitions from Guest -> Logged In, and has a current project with data, trigger sync immediately
  useEffect(() => {
    if ((isAdminLoggedIn || currentUser) && currentProjectId && (images.length > 0 || Object.keys(generatedImages).length > 0)) {
        console.log("User logged in with pending data, triggering cloud sync...");
        syncProjectToCloud();
    }
  }, [isAdminLoggedIn, currentUser]); // Depends only on auth state changes

  // --- Auto-Save Effect (Debounced) ---
  useEffect(() => {
    // Check if we are in a valid project state to auto-save
    // We only auto-save if we have a currentProjectId AND we are not currently generating heavy content
    if (!currentProjectId || generationLoading) return;

    // Use a timeout to debounce save operations (wait 2s after last change)
    const timer = setTimeout(() => {
        syncProjectToCloud();
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    // Watch all data fields that constitute a project
    currentProjectId,
    images, imageRatios, description, manualBrand, report,
    selectedStyle, selectedTypography, finalPrompts,
    needsModel, modelDesc, needsScene, sceneDesc,
    needsDataVis, otherNeeds, aspectRatio, 
    generatedImages, // Watch generated images too
    syncProjectToCloud, // Updates when Auth updates
    generationLoading
  ]);

  // --- 手动保存项目 (Forcing a save/name change) ---
  const saveCurrentProject = async () => {
    if (!isAdminLoggedIn && !currentUser) {
        setIsLoginModalOpen(true); 
        return;
    }

    const name = prompt("请输入项目名称：", manualBrand || report?.brandName || "未命名项目");
    if (!name) return;

    // Update brand name which triggers auto-save eventually, but we force it here
    setManualBrand(name);
    
    // Force sync immediately with new name
    // Generate 15-char ID if creating new
    const pid = currentProjectId || generateProjectId();
    if (!currentProjectId) {
      setCurrentProjectId(pid);
      updateUrl(pid);
    }

    const projectDataToSave: SavedProject = {
      id: pid,
      name, // Use new name
      timestamp: Date.now(),
      userId: currentUser?.id, // Bind user ID
      userName: currentUser?.name, // Bind creator name
      data: {
        images, imageRatios, description, manualBrand: name, report,
        selectedStyle, selectedTypography, finalPrompts,
        needsModel, modelDesc, needsScene, sceneDesc,
        needsDataVis, otherNeeds, aspectRatio, generatedImages,
        imageSyncStatus
      }
    };

    // Save Local
    try {
        const stored = localStorage.getItem(PROJECTS_KEY);
        const currentProjects = stored ? JSON.parse(stored) : [];
        const filtered = currentProjects.filter((p: any) => p.id !== pid);
        const updated = [projectDataToSave, ...filtered];
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
        
        // Filter visible projects immediately
        setProjects(updated.map((p: any) => ({ ...p, isSynced: p.id === pid ? false : p.isSynced }))
            .filter((p: any) => {
                if (currentUser) return p.userId === currentUser.id;
                return !p.userId;
            })
        );
    } catch (e) { console.error(e); }

    // Save Cloud
    setIsSaving(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (isAdminLoggedIn && adminPassword) headers['X-Admin-Pass'] = adminPassword;

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(projectDataToSave)
      });

      if (res.ok) {
        setLastSaveTime(Date.now());
        setProjects(prev => prev.map(p => p.id === pid ? { ...p, isSynced: true } : p));
        alert("项目保存成功 (已同步至云端)！");
      } else {
        throw new Error('Cloud save failed');
      }
    } catch (e) {
      alert("项目已保存到本地 (云端同步失败，请检查网络或配置)");
    } finally {
      setIsSaving(false);
    }
  };

  const loadProject = async (projectMeta: any) => {
    // Only ask for confirmation if there's actual data in the current session
    // AND the current session is NOT the one we are trying to load
    // AND we are not just initializing (e.g. from URL)
    if (images.length > 0 && currentProjectId !== projectMeta.id && !pendingUrlId) {
        if (!window.confirm("当前有正在编辑的内容，加载项目将覆盖当前内容，是否继续？")) {
            return;
        }
    }

    let projectData = projectMeta.data;

    // 如果对象中没有 data (说明是来自云端的元数据列表)，需要去获取完整数据
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
            console.warn("Cloud load failed, trying local storage...");
            // 尝试从本地查找
            const stored = localStorage.getItem(PROJECTS_KEY);
            if (stored) {
                const list = JSON.parse(stored);
                const found = list.find((p: any) => p.id === projectMeta.id);
                if (found) projectData = found.data;
            }
        }
    }

    if (!projectData) {
        alert("加载失败：无法获取项目数据 (云端和本地均未找到)");
        return;
    }

    // Set Current ID - This will eventually trigger auto-save debounce which updates "last opened" timestamp
    setCurrentProjectId(projectMeta.id);
    updateUrl(projectMeta.id);

    // 应用数据
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
    
    // Reset transient states
    setGeneratingModules({});
    setIsBatchGenerating(false);
    setGenerationLoading(false);
    setLastSaveTime(projectMeta.timestamp); // Set last save time to project timestamp on load
    
    // Switch view
    setCurrentView('core');
  };

  const deleteProject = async (id: string) => {
    // 1. 删除本地
    try {
        const stored = localStorage.getItem(PROJECTS_KEY);
        if (stored) {
            const list = JSON.parse(stored);
            const updated = list.filter((p: any) => p.id !== id);
            localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
        }
    } catch(e) {}

    // 2. 删除云端 (fire and forget)
    fetch(`/api/project/${id}`, { method: 'DELETE' }).catch(e => console.error(e));

    // Update UI
    setProjects(prev => prev.filter(p => p.id !== id));
    
    // If deleted current project, clear ID
    if (id === currentProjectId) {
        setCurrentProjectId(null);
        updateUrl(null);
    }
  };

  // --- 重制（清空）功能 ---
  const handleReset = useCallback(() => {
    if (!window.confirm("确定要重制吗？\n这将清空所有当前输入的数据和生成结果。")) {
      return;
    }
    
    // 清除 LocalStorage
    localStorage.removeItem(CACHE_KEY);
    updateUrl(null);
    
    // 重置所有 State
    setCurrentProjectId(null); // Setting null prevents auto-save until manual creation/naming
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
    // 1. Check for unsaved work
    if (images.length > 0) {
        if (!window.confirm("当前有正在进行的工作，创建新项目将清空当前内容。是否继续？")) {
            return;
        }
    }

    // 2. Prompt for name
    const name = prompt("请输入新项目/品牌名称：");
    if (!name) return;

    // 3. Reset and Initialize
    localStorage.removeItem(CACHE_KEY);
    
    const newId = generateProjectId();
    setCurrentProjectId(newId); // Setting ID enables auto-save
    updateUrl(newId);

    setImages([]);
    setImageRatios([]);
    setDescription('');
    setManualBrand(name); // Pre-fill brand name
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

    // 4. Switch to core view
    setCurrentView('core');
  }, [images]);

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
        const b64 = `data:image/jpeg;base64,${res}`;
        setGeneratedImages(prev => ({ ...prev, [index]: b64 }));
        // Mark as unsynced initially
        setImageSyncStatus(prev => ({ ...prev, [index]: 'unsynced' }));
        
        // Critical: Update Ref immediately for the sync function to pick it up, bypassing React render cycle lag
        generatedImagesRef.current = { ...generatedImagesRef.current, [index]: b64 };
        
        // Trigger auto-upload (Real-time sync) immediately if logged in
        if (isAdminLoggedIn || currentUser) {
           await syncProjectToCloud(index);
        }
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
    if (isBatchGenerating) return;

    // 1. 找出所有还没生成且当前没有正在生成的任务
    // This filter logic ensures we only generate images for prompts that are currently empty.
    const pendingTasks = promptModules.map((m, i) => ({ ...m, index: i }))
      .filter(item => !generatedImages[item.index]);

    if (pendingTasks.length === 0) {
      alert("所有图片已生成完毕！（一键出图仅对未生成的图片有效）");
      return;
    }

    setIsBatchGenerating(true);

    try {
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
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const checkAuth = () => {
    const hasSystemKey = !!(process.env.API_KEY);
    return !!(userApiKey || (isAdminLoggedIn && hasSystemKey));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans text-slate-800 relative bg-transparent">
      
      {/* Floating Navigation Rail */}
      <Navigation 
        currentView={currentView} 
        onChange={(view) => {
            if (view === 'projects') {
                if (isAdminLoggedIn || currentUser) {
                   fetchProjects();
                } else {
                   setProjects([]);
                }
            }
            if (view === 'users' && !isAdminLoggedIn) {
                // Prevent navigation to users if not admin (though nav item is hidden)
                return;
            }
            setCurrentView(view);
        }} 
        isAdminLoggedIn={isAdminLoggedIn}
        currentUser={currentUser}
        onUserClick={handleUserIconClick}
        onNewProject={handleNewProject}
        onGoogleLogin={() => window.location.href = '/api/auth/google'}
        onGoogleLogout={handleGoogleLogout}
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
                isAdminLoggedIn={isAdminLoggedIn}
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
                imageSyncStatus={imageSyncStatus}
                generatingModules={generatingModules}
                isBatchGenerating={isBatchGenerating}
                previewImageUrl={previewImageUrl}
                setPreviewImageUrl={setPreviewImageUrl}
                generateSingleImage={generateSingleImage}
                generateAllImages={handleGenerateAll}
                promptModules={promptModules}
                aspectRatio={aspectRatio}
                projectName={manualBrand || report?.brandName || "未命名项目"}
                isSaving={isSaving}
                lastSaveTime={lastSaveTime}
            />
        </>
      )}

      {currentView === 'projects' && (
          <ProjectList 
             projects={projects} 
             onLoad={loadProject} 
             onDelete={deleteProject} 
             isAuthenticated={isAdminLoggedIn || !!currentUser}
          />
      )}

      {currentView === 'users' && (
          <UserManagement 
             adminPassword={adminPassword}
             onRelogin={(pass) => setAdminPassword(pass)}
          />
      )}

      {currentView === 'key' && (
          <KeyConfig 
             userApiKey={userApiKey} 
             onSave={handleSaveKey} 
             onClear={handleClearKey}
             isAdminLoggedIn={isAdminLoggedIn}
             onAdminLogin={() => handleAdminLogin()}
             onAdminLogout={handleAdminLogout}
          />
      )}

      {currentView === 'models' && (
          <ModelSettings 
             config={modelConfig} 
             onSave={setModelConfig} 
             isAuthenticated={!!currentUser}
          />
      )}

      {/* Global Modals */}
      <ApiKeyModal hasApiKey={hasApiKey} onSelectKey={handleSelectKey} />
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onLoginSuccess={handleLoginSuccess} 
        onGoogleLogin={() => window.location.href = '/api/auth/google'}
      />

      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-2xl flex items-center justify-center p-10 cursor-zoom-out animate-fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
           <img 
            src={previewImageUrl} 
            className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl cursor-default" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};