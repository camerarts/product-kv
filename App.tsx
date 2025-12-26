
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

// Helper: Parse View and ID from Hash
const parseHash = () => {
  const hash = window.location.hash; // e.g., #/project/123 or #/projects
  
  if (hash.startsWith('#/project/')) {
      const id = hash.replace('#/project/', '');
      return { view: 'core' as ViewType, id };
  }

  const cleanHash = hash.replace('#/', '');
  const validViews: ViewType[] = ['projects', 'users', 'key', 'models'];
  
  if (validViews.includes(cleanHash as ViewType)) {
    return { view: cleanHash as ViewType, id: null };
  }
  
  // Default to projects list if unknown
  return { view: 'projects' as ViewType, id: null };
};

export const App: React.FC = () => {
  // --- View State (Routing) ---
  const [currentView, setCurrentView] = useState<ViewType>('projects');
  
  // --- Core State (Lifted for ID tracking) ---
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

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
  const [isAuthChecking, setIsAuthChecking] = useState(true); // New loading state for auth

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

  // --- Save Status State (New) ---
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  
  // Track syncing projects to prevent duplicates
  const syncingProjectsRef = useRef<Set<string>>(new Set());
  // Track last saved content to prevent redundant saves on load
  const lastSavedDataRef = useRef<string>('');

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

  // --- Core Editor State ---
  const [generationLoading, setGenerationLoading] = useState(false);

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

  // --- Core State Reset Helper ---
  const resetCoreState = (newProjectId: string | null = null, newBrandName: string = '') => {
      localStorage.removeItem(CACHE_KEY);
      setCurrentProjectId(newProjectId);
      setImages([]);
      setImageRatios([]);
      setDescription('');
      setManualBrand(newBrandName);
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
      lastSavedDataRef.current = '';
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
    // Only filter local list if we have a user. If still checking or null, we might be guest or just loading.
    if (currentUser) {
        localList = localList.filter(p => p.userId === currentUser.id);
    } else {
        // If not logged in, we only show local projects that have NO userId (guest projects).
        // On a new device, this list is naturally empty, which is correct.
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
        // If logged in as user (not admin), only show own projects.
        // If currentUser is null (during initial load), we might still receive data from the server
        // if the session cookie is valid. We should trust the server's return in that case.
        if (currentUser && !isAdminLoggedIn) {
             cloudList = cloudList.filter(p => p.userId === currentUser.id);
        }
      }
    } catch (e) { console.warn("Cloud fetch failed", e); }

    // 3. Merge & Determine Status
    const map = new Map<string, any>();

    localList.forEach(p => {
        // FIX: Respect existing local sync status instead of resetting to false.
        map.set(p.id, { ...p, isSynced: p.isSynced || false });
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
    
    setProjects(prev => {
        if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
        return merged;
    });
    
    setIsProjectsLoading(false);
    return merged;
  }, [isAdminLoggedIn, adminPassword, currentUser]);

  // --- Load Project Logic ---
  const loadProjectById = useCallback(async (id: string, projectList: any[]) => {
      // If we are already on this project and have data, don't reload to prevent overwriting unsaved changes if triggered by effect
      if (currentProjectId === id && images.length > 0) return;

      // Find in list
      let projectMeta = projectList.find(p => p.id === id);
      let projectData = projectMeta?.data;

      // If not in list or missing data, try fetch
      if (!projectData) {
          try {
              const res = await fetch(`/api/project/${id}`);
              if (res.ok) {
                  const fullProject = await res.json();
                  projectData = fullProject.data;
                  projectMeta = fullProject;
              }
          } catch (e) { console.warn("Load failed", e); }
      }
      
      // Fallback to local storage specific check
      if (!projectData) {
           const stored = localStorage.getItem(PROJECTS_KEY);
           if (stored) {
               const list = JSON.parse(stored);
               const found = list.find((p: any) => p.id === id);
               if (found) {
                   projectData = found.data;
                   projectMeta = found;
               }
           }
      }

      if (projectData) {
          setCurrentProjectId(id);
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
          
          // Re-calculate sync status based on content type
          // If content is a URL, it is synced.
          const derivedSyncStatus: Record<number, SyncStatus> = projectData.imageSyncStatus || {};
          
          if (projectData.generatedImages) {
              Object.keys(projectData.generatedImages).forEach(key => {
                  const k = Number(key);
                  const val = projectData.generatedImages[k];
                  if (val && typeof val === 'string' && val.startsWith('/api/images')) {
                      derivedSyncStatus[k] = 'synced';
                  }
              });
          }
          setImageSyncStatus(derivedSyncStatus);
          
          setGeneratingModules({});
          setIsBatchGenerating(false);
          setGenerationLoading(false);
          setLastSaveTime(projectMeta?.timestamp || null);

          // Update Reference for comparison to avoid immediate save
          lastSavedDataRef.current = JSON.stringify({
              images: projectData.images || [],
              imageRatios: projectData.imageRatios || [],
              description: projectData.description || '',
              manualBrand: projectData.manualBrand || '',
              report: projectData.report,
              selectedStyle: projectData.selectedStyle,
              selectedTypography: projectData.selectedTypography,
              finalPrompts: projectData.finalPrompts || '',
              needsModel: projectData.needsModel || false,
              modelDesc: projectData.modelDesc || '',
              needsScene: projectData.needsScene || false,
              sceneDesc: projectData.sceneDesc || '',
              needsDataVis: projectData.needsDataVis || false,
              otherNeeds: projectData.otherNeeds || '',
              aspectRatio: projectData.aspectRatio || "9:16",
              generatedImages: projectData.generatedImages || {},
              imageSyncStatus: derivedSyncStatus // Update reference with derived status
          });
      } else {
          setCurrentProjectId(id);
          lastSavedDataRef.current = ''; 
      }
  }, [currentProjectId, images.length]);


  // --- Router Effect (The Core Driver) ---
  useEffect(() => {
    const handleHashChange = async () => {
      const { view, id } = parseHash();
      setCurrentView(view);
      
      if (view === 'core' && id) {
          // We are in project view. Ensure we have the latest list then load.
          // If projects are already loaded, use them.
          let currentList = projects;
          if (currentList.length === 0) {
              currentList = await fetchProjects();
          }
          loadProjectById(id, currentList);
      }
    };
    
    // Initial check on mount
    if (!window.location.hash) {
       window.location.hash = '#/projects';
    } else {
       handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [fetchProjects, loadProjectById, projects]);


  // Background Sync Function
  const syncBackgroundProject = async (project: SavedProject) => {
      if (syncingProjectsRef.current.has(project.id)) return;
      syncingProjectsRef.current.add(project.id);

      try {
          const data = project.data;
          let changed = false;
          
          const images = [...(data.images || [])];
          for(let i=0; i<images.length; i++) {
              if (images[i] && images[i].length > 500 && !images[i].startsWith('/api/images')) {
                  const url = await uploadImage(images[i], project.id);
                  images[i] = url;
                  changed = true;
              }
          }

          const generatedImages = { ...(data.generatedImages || {}) };
          for(const key in generatedImages) {
              const k = parseInt(key);
              const img = generatedImages[k];
              if (img && img.length > 500 && !img.startsWith('/api/images')) {
                   const url = await uploadImage(img, project.id);
                   generatedImages[k] = url;
                   changed = true;
              }
          }

          const projectToUpload = {
              ...project,
              isSynced: true,
              data: {
                  ...data,
                  images,
                  generatedImages,
              }
          };

          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (isAdminLoggedIn && adminPassword) headers['X-Admin-Pass'] = adminPassword;

          const res = await fetch('/api/projects', {
              method: 'POST',
              headers,
              body: JSON.stringify(projectToUpload)
          });

          if (res.ok) {
              const stored = localStorage.getItem(PROJECTS_KEY);
              if (stored) {
                  const list = JSON.parse(stored);
                  const idx = list.findIndex((p: any) => p.id === project.id);
                  if (idx >= 0) {
                      list[idx] = { ...projectToUpload, isSynced: true };
                      localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
                  }
              }
              setProjects(prev => prev.map(p => p.id === project.id ? { ...p, isSynced: true } : p));
          }
      } catch (e) {
          console.error("Background sync failed for", project.id, e);
      } finally {
          syncingProjectsRef.current.delete(project.id);
      }
  };

  // Effect: Watch projects and trigger background sync for unsynced items
  useEffect(() => {
     if (!isAdminLoggedIn && !currentUser) return;
     
     const unsynced = projects.filter(p => !p.isSynced);
     if (unsynced.length === 0) return;

     const runSync = async () => {
         for (const p of unsynced) {
             await syncBackgroundProject(p);
         }
     };
     runSync();
  }, [projects, isAdminLoggedIn, currentUser]);

  // Effect: Polling for project list updates (ONLY IN PROJECT LIST VIEW)
  useEffect(() => {
     // Strictly polling only when in project list view
     if (currentView !== 'projects' || (!isAdminLoggedIn && !currentUser)) return;
     
     const interval = setInterval(() => {
         fetchProjects();
     }, 10000); // Poll every 10 seconds

     return () => clearInterval(interval);
  }, [currentView, isAdminLoggedIn, currentUser, fetchProjects]);


  // --- Effects ---

  // 1. Init Auth & Key
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get('auth_error');
    if (authError === 'expired') {
      alert("⚠️ 您的账号已过期。\n\n账号有效期默认为首次登录后30天。请联系管理员进行延期处理。");
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }

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
       } finally {
         setIsAuthChecking(false);
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
    if (currentView === 'users') {
        window.location.hash = '#/projects';
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setProjects([]);
      window.location.hash = '#/projects';
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

  // --- Local Cache ---
  useEffect(() => {
    if (!currentProjectId) return;
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

    // Prepare data
    const currentData = {
        images, imageRatios, description, manualBrand, report,
        selectedStyle, selectedTypography, finalPrompts,
        needsModel, modelDesc, needsScene, sceneDesc,
        needsDataVis, otherNeeds, aspectRatio, 
        generatedImages: generatedImagesRef.current,
        imageSyncStatus: newSyncStatus
    };
    
    // Check against last saved data to prevent redundant uploads (unless forcing an index update)
    const currentDataStr = JSON.stringify(currentData);
    if (currentDataStr === lastSavedDataRef.current && targetIndexToMarkSynced === undefined) {
        return;
    }

    // Prepare full project object
    const localProjectData: SavedProject = {
      id: currentProjectId,
      name: manualBrand || report?.brandName || `自动保存 ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      userId: currentUser?.id,
      userName: currentUser?.name,
      data: currentData
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
              if (img && img.length > 0 && !img.startsWith('/api/images')) {
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

          if (generatedImagesUpdated) {
              setGeneratedImages(generatedImagesToSave);
              generatedImagesRef.current = generatedImagesToSave; 
              setImageSyncStatus(newSyncStatus);
          }

          // 2. SAVE JSON (With URLs)
          const cloudProjectData = {
             ...localProjectData,
             isSynced: true, 
             data: {
                 ...localProjectData.data,
                 images: imagesToSave,
                 generatedImages: generatedImagesToSave,
                 imageSyncStatus: newSyncStatus 
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
            // Update last saved reference
            lastSavedDataRef.current = JSON.stringify(cloudProjectData.data);
            
            // Final consistency check
            setImageSyncStatus(newSyncStatus);
            
            // Update Local Storage Synced Status
            const stored = localStorage.getItem(PROJECTS_KEY);
            if (stored) {
                const list = JSON.parse(stored);
                const idx = list.findIndex((p: any) => p.id === currentProjectId);
                if (idx >= 0) {
                    list[idx] = { ...cloudProjectData, isSynced: true };
                    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
                }
            }
            
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
        // Initial sync on mount/auth if valid content exists but only if we have pending changes (handled by lastSavedDataRef check inside)
        syncProjectToCloud();
    }
  }, [isAdminLoggedIn, currentUser]);

  // --- Auto-Save ---
  useEffect(() => {
    if (!currentProjectId || generationLoading) return;
    // Debounce save
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
        resetCoreState(null);
        window.location.hash = '#/projects';
    }
  };

  const handleReset = useCallback(() => {
    if (!window.confirm("确定要重置当前项目内容吗？")) return;
    // Don't change ID, just clear content
    resetCoreState(currentProjectId, manualBrand);
  }, [currentProjectId, manualBrand]);

  const handleNewProject = useCallback(() => {
    // 1. Force a final sync if there's an active project with content.
    // This ensures any debounced/pending changes (within the last 2s) are captured.
    // 'syncProjectToCloud' will use the current state values from its closure.
    if (currentProjectId && (images.length > 0 || manualBrand || description)) {
        syncProjectToCloud(); 
    }

    const name = prompt("请输入新项目/品牌名称：");
    if (!name) return;

    const newId = generateProjectId();
    
    // Clear State first
    resetCoreState(newId, name);
    
    // Switch URL (This will trigger effect, but we already set local state, so it should match 'id' and skip loading)
    window.location.hash = `#/project/${newId}`;
  }, [images, currentProjectId, manualBrand, description, syncProjectToCloud]);

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
           window.location.hash = `#/${view}`;
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
          <ProjectList 
             projects={projects} 
             onLoad={(p) => window.location.hash = `#/project/${p.id}`} 
             onDelete={deleteProject} 
             isAuthenticated={isAdminLoggedIn || !!currentUser} 
             isAuthChecking={isAuthChecking} // Pass the checking state
             isSaving={isSaving} 
             lastSaveTime={lastSaveTime} 
          />
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
