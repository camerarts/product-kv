import React from 'react';
import { SavedProject } from '../types';

interface ProjectListProps {
  projects: any[]; // Changed to any to accept metadata object
  onLoad: (project: SavedProject) => void;
  onDelete: (id: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onLoad, onDelete }) => {
  if (projects.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-50 text-neutral-400 p-8">
         <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-4 text-4xl">📁</div>
         <h3 className="text-lg font-bold text-neutral-600 mb-1">暂无项目</h3>
         <p className="text-xs">在“核心配置”中点击保存按钮即可创建项目</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-neutral-50 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
         <h1 className="text-2xl font-black text-neutral-900 mb-6 flex items-center gap-2">
            <span className="text-blue-600">📂</span> 项目列表
         </h1>
         
         <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                   <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider">项目名称</th>
                   <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider">品牌</th>
                   <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider">状态</th>
                   <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider">保存时间</th>
                   <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                 {projects.map((project) => (
                   <tr key={project.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                         <div className="text-sm font-bold text-neutral-900">{project.name}</div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="text-xs font-bold text-neutral-600 bg-neutral-100 inline-block px-2 py-1 rounded">
                           {project.brandName || project.data?.manualBrand || '未命名品牌'}
                         </div>
                      </td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                         <div className="text-xs text-neutral-500 font-mono">
                            {new Date(project.timestamp).toLocaleString()}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right flex gap-3 justify-end">
                         <button 
                           onClick={() => onLoad(project)}
                           className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                         >
                           加载
                         </button>
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
                 ))}
              </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};