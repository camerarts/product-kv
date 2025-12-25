import React from 'react';

export type ViewType = 'core' | 'projects' | 'key' | 'models';

interface NavigationProps {
  currentView: ViewType;
  onChange: (view: ViewType) => void;
  isAdminLoggedIn: boolean;
  onUserClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onChange, isAdminLoggedIn, onUserClick }) => {
  const menuItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'core',
      label: '核心配置',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
    },
    {
      id: 'projects',
      label: '项目列表',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    },
    {
      id: 'key',
      label: '配置 Key',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
    },
    {
      id: 'models',
      label: '模型设置',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
    }
  ];

  return (
    <nav className="w-20 bg-neutral-900 flex flex-col items-center py-6 shrink-0 z-50">
      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl mb-8 flex items-center justify-center text-white font-black text-lg shadow-lg">
        V
      </div>
      
      <div className="flex-1 flex flex-col gap-4 w-full px-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`
              flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all w-full
              ${currentView === item.id 
                ? 'bg-white/10 text-white shadow-inner' 
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
              }
            `}
            title={item.label}
          >
            {item.icon}
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </div>
      
      <div className="mt-auto">
        <button 
          onClick={onUserClick}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all shadow-md ${
            isAdminLoggedIn 
              ? 'bg-green-100 text-green-600 border border-green-200 hover:bg-green-200' 
              : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700 hover:text-white'
          }`}
          title={isAdminLoggedIn ? "管理员已登录 (点击退出)" : "管理员登录"}
        >
           {isAdminLoggedIn ? '🛡️' : '🔒'}
        </button>
      </div>
    </nav>
  );
};