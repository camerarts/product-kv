
import React from 'react';
import { SavedProject } from '../types';

interface ProjectListProps {
  projects: any[]; // Changed to any to accept metadata object
  onLoad: (project: SavedProject) => void;
  onDelete: (id: string) => void;
  isAuthenticated: boolean;
  isSaving: boolean;
  lastSaveTime: number | null;
}

export const ProjectList: React.FC<ProjectListProps> = ({ 
  projects, onLoad, onDelete, isAuthenticated,
  isSaving, lastSaveTime 
}) => {
  return (
    <div className="flex-1 ml-[100px] h-full overflow-hidden flex flex-col">
      {/* Fixed Header Section */}
      <div className="px-10 pt-10 pb-6 shrink-0">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
           <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/30">📂</span> 
              项目列表
           </h1>

           {/* Save Status & Timestamp */}
           <div className="flex items-center gap-4 bg-white/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm">
              <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">系统状态</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                      {isSaving ? (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                            <span className="text-[10px] text-slate-400 font-medium">数据同步中...</span>
                          </>
                      ) : (
                          <>
                             <div className={`w-1.5 h-1.5 rounded-full ${lastSaveTime ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`}></div>
                             <span className="text-[10px] text-slate-400 font-medium font-mono">
                                {lastSaveTime ? `已同步 ${new Date(lastSaveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '就绪'}
                             </span>
                          </>
                      )}
                  </div>
              </div>
          </div>
        </div>
      </div>
      
      {/* Scrollable Table Section */}
      <div className="flex-1 px-10 pb-10 overflow-hidden">
         <div className="max-w-6xl mx-auto w-full h-full">
           <div className="glass-panel rounded-[2.5rem] h-full flex flex-col overflow-hidden p-2">
              <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
                <table className="w-full text-left border-collapse border-spacing-y-2 border-separate">
                  <thead className="sticky top-0 z-10">
                    <tr>
                       <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider bg-white/0">项目名称</th>
                       <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider bg-white/0">品牌</th>
                       <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider bg-white/0">创作者</th>
                       <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider bg-white/0">日期</th>
                       <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right bg-white/0">操作</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-2">
                     {!isAuthenticated ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-32 text-center">
                                <div className="flex flex-col items-center justify-center text-slate-400">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-3xl">🔒</div>
                                    <h3 className="text-sm font-bold text-slate-600 mb-1">访问受限</h3>
                                    <p className="text-xs">请登录以查看项目</p>
                                </div>
                            </td>
                        </tr>
                     ) : projects.length === 0 ? (
                       <tr>
                         <td colSpan={5} className="px-6 py-32 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-3xl">📁</div>
                                <h3 className="text-sm font-bold text-slate-600 mb-1">暂无项目</h3>
                                <p className="text-xs">请先创建并保存项目</p>
                            </div>
                         </td>
                       </tr>
                     ) : (
                       projects.map((project) => (
                         <tr key={project.id} className="group bg-white/40 hover:bg-white/80 transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.005]">
                            <td className="px-6 py-5 rounded-l-2xl">
                               <button 
                                 className="flex items-center gap-3 text-sm font-bold text-slate-800 max-w-[240px] cursor-pointer hover:text-blue-600 transition-colors text-left" 
                                 onClick={() => onLoad(project)}
                               >
                                 <span className="w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                                 <span className="truncate">{project.name}</span>
                               </button>
                            </td>
                            <td className="px-6 py-5">
                               <div className="text-xs font-bold text-slate-600 bg-white/50 border border-white inline-block px-3 py-1 rounded-lg truncate max-w-[150px] shadow-sm">
                                 {project.brandName || project.data?.manualBrand || '未命名'}
                               </div>
                            </td>
                            <td className="px-6 py-5">
                               <div className="text-xs font-bold text-purple-600 bg-purple-50/50 border border-purple-100 inline-block px-3 py-1 rounded-lg truncate max-w-[120px]">
                                 {project.userName || '本地用户'}
                               </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                               <div className="text-xs text-slate-500 font-mono">
                                  {new Date(project.timestamp).toLocaleDateString()}
                               </div>
                            </td>
                            <td className="px-6 py-5 text-right rounded-r-2xl">
                               <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                    onClick={() => onLoad(project)}
                                    className="text-xs font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                                    >
                                    加载
                                    </button>
                                    <button 
                                    onClick={() => {
                                        if(window.confirm(`确定要删除 "${project.name}" 吗？`)) {
                                        onDelete(project.id);
                                        }
                                    }}
                                    className="text-xs font-bold text-red-500 hover:text-white bg-red-50 hover:bg-red-500 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                                    >
                                    删除
                                    </button>
                               </div>
                            </td>
                         </tr>
                       ))
                     )}
                  </tbody>
                </table>
              </div>
           </div>
         </div>
      </div>
    </div>
  );
};
