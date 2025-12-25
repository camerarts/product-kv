import React from 'react';
import { SavedProject } from '../types';

interface ProjectListProps {
  projects: any[]; // Changed to any to accept metadata object
  onLoad: (project: SavedProject) => void;
  onDelete: (id: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onLoad, onDelete }) => {
  return (
    <div className="flex-1 bg-neutral-50 flex flex-col h-full overflow-hidden">
      {/* Fixed Header Section */}
      <div className="px-8 pt-8 pb-6 shrink-0">
        <div className="max-w-5xl mx-auto w-full">
           <h1 className="text-2xl font-black text-neutral-900 flex items-center gap-2">
              <span className="text-blue-600">📂</span> 项目列表
           </h1>
        </div>
      </div>
      
      {/* Scrollable Table Section */}
      <div className="flex-1 px-8 pb-8 overflow-hidden">
         <div className="max-w-5xl mx-auto w-full h-full">
           <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 h-full flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <tr>
                       <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider bg-neutral-50 whitespace-nowrap">项目名称</th>
                       <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider bg-neutral-50 whitespace-nowrap">品牌</th>
                       <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider bg-neutral-50 whitespace-nowrap">状态</th>
                       <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider bg-neutral-50 whitespace-nowrap">保存时间</th>
                       <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider text-right bg-neutral-50 whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                     {projects.length === 0 ? (
                       <tr>
                         <td colSpan={5} className="px-6 py-32 text-center">
                            <div className="flex flex-col items-center justify-center text-neutral-400">
                                <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-4 text-3xl">📁</div>
                                <h3 className="text-sm font-bold text-neutral-600 mb-1">暂无项目</h3>
                                <p className="text-xs">在“核心配置”中点击保存按钮即可创建项目</p>
                            </div>
                         </td>
                       </tr>
                     ) : (
                       projects.map((project) => (
                         <tr key={project.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-6 py-4">
                               <div 
                                 className="text-sm font-bold text-neutral-900 truncate max-w-[200px] cursor-pointer hover:text-blue-600 hover:underline transition-colors" 
                                 title="点击加载项目"
                                 onClick={() => onLoad(project)}
                               >
                                 {project.name}
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <div className="text-xs font-bold text-neutral-600 bg-neutral-100 inline-block px-2 py-1 rounded truncate max-w-[150px]">
                                 {project.brandName || project.data?.manualBrand || '未命名品牌'}
                               </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {project.isSynced ? (
                                  <span className="inline-flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-md text-[10px] font-bold border border-green-100">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                                      云端已同步
                                  </span>
                              ) : (
                                  <span className="inline-flex items-center gap-1.5 text-neutral-500 bg-neutral-100 px-2 py-1 rounded-md text-[10px] font-bold border border-neutral-200">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                      仅本地存储
                                  </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                               <div className="text-xs text-neutral-500 font-mono">
                                  {new Date(project.timestamp).toLocaleString()}
                               </div>
                            </td>
                            <td className="px-6 py-4 text-right flex gap-3 justify-end whitespace-nowrap">
                               <button 
                                 onClick={() => {
                                   const msg = project.isSynced 
                                      ? `确定要删除云端项目 "${project.name}" 吗? 此操作不可恢复。` 
                                      : `确定要删除本地项目 "${project.name}" 吗?`;
                                   if(window.confirm(msg)) {
                                     onDelete(project.id);
                                   }
                                 }}
                                 className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                               >
                                 删除
                               </button>
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