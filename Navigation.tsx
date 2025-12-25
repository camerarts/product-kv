import React from 'react';
import { UserProfile, ViewType } from './types';

interface NavigationProps {
  currentView: ViewType;
  onChange: (view: ViewType) => void;
  isAdminLoggedIn: boolean;
  currentUser: UserProfile | null;
  onUserClick: () => void;
  onSaveProject: () => void;
  onNewProject: () => void;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  currentView, onChange, 
  isAdminLoggedIn, currentUser, 
  onUserClick, onSaveProject, onNewProject,
  onGoogleLogin, onGoogleLogout
}) => {
  const menuItems: { id: ViewType; label: string; line1: string; line2: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    {
      id: 'core',
      label: '核心配置',
      line1: '核心',
      line2: '配置',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
    },
    {
      id: 'projects',
      label: '项目列表',
      line1: '项目',
      line2: '列表',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    },
    {
      id: 'users',
      label: '用户管理',
      line1: '用户',
      line2: '管理',
      adminOnly: true,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    },
    {
      id: 'key',
      label: '配置 Key',
      line1: '配置',
      line2: 'Key',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
    },
    {
      id: 'models',
      label: '模型设置',
      line1: '模型',
      line2: '设置',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
    }
  ];

  return (
    <nav className="w-[73px] h-screen bg-white/80 backdrop-blur-xl border-r border-neutral-200 flex flex-col items-center py-8 shrink-0 z-50 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.08)] relative">
      {/* Background Decor Layer for subtle tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/20 to-purple-50/20 pointer-events-none -z-10"></div>

      {/* Brand Logo */}
      <div className="mb-6 relative group cursor-default">
        <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)] relative z-10 border border-white/20">
          <span className="drop-shadow-sm">V</span>
        </div>
      </div>

      {/* NEW PROJECT BUTTON */}
      <div className="mb-6 px-2 w-full">
         <button 
           onClick={onNewProject}
           className="w-full aspect-square rounded-2xl bg-neutral-900 text-white flex items-center justify-center hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3)] group relative overflow-hidden"
           title="新建项目"
         >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
         </button>
      </div>
      
      {/* Menu Items */}
      <div className="flex-1 flex flex-col gap-5 w-full px-2">
        {menuItems.map((item) => {
          if (item.adminOnly && !isAdminLoggedIn) return null;

          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`
                group flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all duration-300 w-full relative
                ${isActive 
                  ? 'bg-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(255,255,255,1)] text-blue-600 scale-100 ring-1 ring-black/5' 
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/40 hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)]'
                }
              `}
              title={item.label}
            >
              {/* Active Indicator Glow */}
              {isActive && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-50 to-purple-50 opacity-50 -z-10"></div>
              )}

              <div className={`transition-transform duration-300 ${isActive ? 'scale-105 drop-shadow-sm' : 'group-hover:scale-105'}`}>
                {item.icon}
              </div>
              <div className={`text-[9px] font-bold text-center leading-none tracking-tight transition-opacity ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                <span className="block">{item.line1}</span>
                <span className="block mt-0.5">{item.line2}</span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Bottom Actions - Redesigned */}
      <div className="mt-auto mb-4 flex flex-col gap-3 items-center w-full px-2">
        
        {/* Save Button */}
        <button 
             onClick={onSaveProject}
             className="group flex flex-col items-center justify-center gap-1 p-2 rounded-2xl w-full transition-all duration-300 bg-blue-50/50 hover:bg-blue-100 text-blue-600 hover:shadow-sm border border-transparent hover:border-blue-200"
             title="保存项目"
        >
              <div className="transform group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              </div>
              <span className="text-[9px] font-bold">保存</span>
        </button>

        {/* Divider */}
        <div className="w-full h-px bg-neutral-200/60 my-1"></div>

        {/* Unified Account Button (Admin / User / Login) */}
        <button 
          onClick={() => {
            if (isAdminLoggedIn) {
               // If admin, this triggers the logout confirmation flow in App
               onUserClick();
            } else if (currentUser) {
               // If google user, ask to logout
               if(window.confirm(`确定要退出登录吗? (${currentUser.name})`)) {
                  onGoogleLogout();
               }
            } else {
               // If guest, open login modal
               onUserClick();
            }
          }}
          className={`
            group flex flex-col items-center justify-center gap-1 p-2 rounded-2xl w-full transition-all duration-300 border mt-1
            ${isAdminLoggedIn 
              ? 'bg-purple-50/50 text-purple-600 border-purple-100 hover:bg-purple-100 hover:border-purple-200' 
              : currentUser
                ? 'bg-blue-50/50 text-blue-600 border-blue-100 hover:bg-blue-100 hover:border-blue-200'
                : 'text-neutral-300 border-transparent hover:text-neutral-400 hover:bg-neutral-50'
            }
          `}
          title={isAdminLoggedIn ? "超级管理员已登录" : currentUser ? `已登录: ${currentUser.name}` : "点击登录"}
        >
           <div className="transform group-hover:scale-110 transition-transform duration-300">
             {isAdminLoggedIn ? (
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             ) : currentUser ? (
               <div className="relative">
                 <img src={currentUser.picture} className="w-6 h-6 rounded-full border border-current shadow-sm" alt="User" />
                 <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
               </div>
             ) : (
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
             )}
           </div>
           <span className="text-[9px] font-bold truncate w-full text-center px-0.5">
             {isAdminLoggedIn ? 'ROOT' : currentUser ? currentUser.name.split(' ')[0] : '登录'}
           </span>
        </button>
      </div>
    </nav>
  );
};