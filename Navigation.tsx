
import React from 'react';
import { UserProfile, ViewType } from './types';

interface NavigationProps {
  currentView: ViewType;
  onChange: (view: ViewType) => void;
  isAdminLoggedIn: boolean;
  currentUser: UserProfile | null;
  onUserClick: () => void;
  onNewProject: () => void;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  currentView, onChange, 
  isAdminLoggedIn, currentUser, 
  onUserClick, onNewProject,
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
    },
    {
      id: 'users',
      label: '用户管理',
      line1: '用户',
      line2: '管理',
      adminOnly: true,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    }
  ];

  return (
    <nav className="fixed left-6 top-6 bottom-6 w-[80px] z-50 flex flex-col items-center py-6 glass-panel rounded-[2rem] shadow-2xl transition-all duration-500">
      
      {/* Brand Logo */}
      <div className="mb-8 relative group cursor-default">
        <div className="absolute inset-0 bg-indigo-500/30 rounded-2xl blur-lg group-hover:bg-indigo-500/50 transition-colors duration-500"></div>
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-inner border border-white/20 relative z-10">
          <span className="drop-shadow-sm">V</span>
        </div>
      </div>

      {/* NEW PROJECT BUTTON */}
      <div className="mb-8 px-3 w-full">
         <button 
           onClick={onNewProject}
           className="liquid-button w-full aspect-square rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 group relative overflow-hidden"
           title="新建项目"
         >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
         </button>
      </div>
      
      {/* Menu Items (Now Links) */}
      <div className="flex-1 flex flex-col gap-4 w-full px-3">
        {menuItems.map((item) => {
          if (item.adminOnly && !isAdminLoggedIn) return null;

          const isActive = currentView === item.id;
          
          return (
            <a
              key={item.id}
              href={`#/${item.id}`}
              className={`
                liquid-button group flex flex-col items-center justify-center gap-1 p-2 rounded-2xl w-full relative
                ${isActive 
                  ? 'bg-white/80 text-indigo-600 shadow-sm ring-1 ring-white/60' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }
              `}
              title={item.label}
              // Optional: onClick to perform side effects if needed, 
              // but hash change in App.tsx handles the view switch.
              onClick={() => {
                  if (item.id === 'projects' && (isAdminLoggedIn || currentUser)) {
                      // Trigger refresh logic if needed, although App.tsx listens to hash change
                      // and can trigger effects.
                  }
              }}
            >
              <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                {item.icon}
              </div>
              <div className={`text-[9px] font-bold text-center leading-none tracking-tight transition-opacity ${isActive ? 'opacity-100 font-extrabold' : 'opacity-70'}`}>
                <span className="block">{item.line1}</span>
                <span className="block mt-0.5">{item.line2}</span>
              </div>
            </a>
          );
        })}
      </div>
      
      {/* Bottom Actions */}
      <div className="mt-auto flex flex-col gap-4 items-center w-full px-3">
        
        {/* Account Button */}
        <button 
          onClick={() => {
            if (isAdminLoggedIn) {
               onUserClick();
            } else if (currentUser) {
               if(window.confirm(`确定要退出登录吗? (${currentUser.name})`)) {
                  onGoogleLogout();
               }
            } else {
               onUserClick();
            }
          }}
          className={`
            liquid-button w-full aspect-square rounded-2xl flex items-center justify-center shadow-sm border
            ${isAdminLoggedIn 
              ? 'bg-purple-100/50 text-purple-600 border-purple-200 hover:bg-purple-100' 
              : currentUser
                ? 'bg-white/50 text-blue-600 border-white/60 hover:bg-white'
                : 'bg-slate-100/50 text-slate-400 border-transparent hover:bg-white hover:text-slate-600'
            }
          `}
          title={isAdminLoggedIn ? "超级管理员" : currentUser ? currentUser.name : "登录"}
        >
           {isAdminLoggedIn ? (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           ) : currentUser ? (
             <img src={currentUser.picture} className="w-8 h-8 rounded-xl" alt="User" />
           ) : (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
           )}
        </button>
      </div>
    </nav>
  );
};
