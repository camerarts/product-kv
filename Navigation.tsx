import React from 'react';

export type ViewType = 'core' | 'projects' | 'key' | 'models';

interface NavigationProps {
  currentView: ViewType;
  onChange: (view: ViewType) => void;
  isAdminLoggedIn: boolean;
  onUserClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onChange, isAdminLoggedIn, onUserClick }) => {
  const menuItems: { id: ViewType; label: string; line1: string; line2: string; icon: React.ReactNode }[] = [
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
    }
  ];

  return (
    <nav className="w-[96px] h-screen bg-white/80 backdrop-blur-xl border-r border-neutral-200 flex flex-col items-center py-8 shrink-0 z-50 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.08)] relative">
      {/* Background Decor Layer for subtle tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/20 to-purple-50/20 pointer-events-none -z-10"></div>

      {/* Brand Logo - 2025 Tech Gradient Style */}
      <div className="mb-10 relative group cursor-default">
        <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)] relative z-10 border border-white/20">
          <span className="drop-shadow-sm">V</span>
        </div>
      </div>
      
      {/* Menu Items */}
      <div className="flex-1 flex flex-col gap-5 w-full px-3">
        {menuItems.map((item) => {
          const isDisabled = item.id === 'projects' && !isAdminLoggedIn;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                if (!isDisabled) onChange(item.id);
              }}
              disabled={isDisabled}
              className={`
                group flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl transition-all duration-300 w-full relative
                ${isActive 
                  ? 'bg-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(255,255,255,1)] text-blue-600 scale-100 ring-1 ring-black/5' 
                  : isDisabled 
                    ? 'text-neutral-300 cursor-not-allowed opacity-60 grayscale' 
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/40 hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)]'
                }
              `}
              title={isDisabled ? "请登录后使用" : item.label}
            >
              {/* Active Indicator Glow */}
              {isActive && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-50 to-purple-50 opacity-50 -z-10"></div>
              )}

              <div className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-sm' : 'group-hover:scale-105'}`}>
                {item.icon}
              </div>
              <div className={`text-[10px] font-bold text-center leading-none tracking-tight transition-opacity ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                <span className="block">{item.line1}</span>
                <span className="block mt-0.5">{item.line2}</span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* User / Admin Toggle */}
      <div className="mt-auto mb-4">
        <button 
          onClick={onUserClick}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 relative overflow-hidden group
            ${isAdminLoggedIn 
              ? 'bg-green-50 text-green-600 shadow-[0_4px_15px_-3px_rgba(34,197,94,0.3)] ring-2 ring-green-100' 
              : 'bg-white text-neutral-400 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.08)] ring-1 ring-neutral-100 hover:text-neutral-600 hover:ring-neutral-200'
            }
          `}
          title={isAdminLoggedIn ? "管理员已登录 (点击退出)" : "管理员登录"}
        >
           {/* Subtle Shine Effect */}
           <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
           
           <span className="relative z-10 drop-shadow-sm transform group-hover:scale-110 transition-transform">
             {isAdminLoggedIn ? '🛡️' : '🔒'}
           </span>
        </button>
      </div>
    </nav>
  );
};