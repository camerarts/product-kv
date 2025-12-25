import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';

interface UserManagementProps {
  adminPassword?: string; // Passed from App state for API authorization
  onRelogin: (password: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ adminPassword, onRelogin }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Re-login State
  const [localPassword, setLocalPassword] = useState('');

  // Editing State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState<string>(''); // YYYY-MM-DD format

  const fetchUsers = async () => {
    if (!adminPassword) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        headers: {
          'X-Admin-Pass': adminPassword
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError('无法加载用户列表，请检查管理员权限');
      }
    } catch (e) {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [adminPassword]);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`警告：确定要删除用户 "${userName}" 吗？\n此操作不可恢复，用户数据和项目可能丢失。`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
            'X-Admin-Pass': adminPassword || ''
        }
      });
      
      if (res.ok) {
        alert('用户已删除');
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        alert('删除失败');
      }
    } catch (e) {
      console.error(e);
      alert('删除操作出错');
    }
  };

  const startEditingExpiry = (user: UserProfile) => {
    setEditingUserId(user.id);
    // Convert timestamp to YYYY-MM-DD
    const date = new Date(user.expiresAt || (Date.now() + 30*24*60*60*1000));
    setNewExpiryDate(date.toISOString().split('T')[0]);
  };

  const saveExpiry = async (userId: string) => {
      if (!newExpiryDate) return;
      
      // Convert YYYY-MM-DD back to timestamp (end of day roughly, or same time)
      // Let's ensure it's set to the end of that day locally
      const timestamp = new Date(newExpiryDate).getTime() + 24*60*60*1000 - 1; 

      try {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Pass': adminPassword || ''
            },
            body: JSON.stringify({ expiresAt: timestamp })
        });

        if (res.ok) {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, expiresAt: timestamp } : u));
            setEditingUserId(null);
        } else {
            alert('更新失败');
        }
      } catch(e) {
          alert('更新出错');
      }
  };

  const handleReloginSubmit = () => {
    if (localPassword) {
      onRelogin(localPassword);
      setLocalPassword('');
    }
  };

  if (!adminPassword) {
    return (
       <div className="flex-1 flex flex-col items-center justify-center bg-neutral-50 text-neutral-400 p-8">
         <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 text-center animate-fade-in-up">
             <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl text-white shadow-lg shadow-neutral-500/30">🔐</div>
             <h3 className="text-lg font-black text-neutral-800 mb-2">安全验证</h3>
             <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
               为了确保安全，页面刷新后需要验证管理员身份。<br/>
               请输入管理员密码以继续管理用户。
             </p>
             
             <div className="space-y-3">
               <input 
                 type="password" 
                 className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold text-center tracking-widest outline-none focus:border-black focus:bg-white transition-colors"
                 placeholder="• • • • • •"
                 value={localPassword}
                 onChange={e => setLocalPassword(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleReloginSubmit()}
               />
               <button 
                 onClick={handleReloginSubmit}
                 disabled={!localPassword}
                 className="w-full py-3 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
               >
                 验证并进入
               </button>
             </div>
         </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-neutral-50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 shrink-0 flex justify-between items-end">
        <div className="max-w-5xl mx-auto w-full">
           <h1 className="text-2xl font-black text-neutral-900 flex items-center gap-2">
              <span className="text-purple-600">👥</span> 用户管理
           </h1>
           <p className="text-xs text-neutral-500 mt-1 ml-9">管理已注册的 Google 账号用户</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 pb-8 overflow-hidden">
         <div className="max-w-5xl mx-auto w-full h-full">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 h-full flex flex-col overflow-hidden">
               {loading ? (
                   <div className="flex-1 flex items-center justify-center text-neutral-400 gap-2">
                       <div className="w-4 h-4 border-2 border-neutral-300 border-t-purple-600 rounded-full animate-spin"></div>
                       <span className="text-xs font-bold">加载用户数据...</span>
                   </div>
               ) : error ? (
                   <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
                       <p className="text-sm font-bold text-red-500">{error}</p>
                       <button onClick={fetchUsers} className="mt-4 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-bold transition-colors">重试</button>
                   </div>
               ) : users.length === 0 ? (
                   <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
                       <div className="text-3xl mb-2">🤷‍♂️</div>
                       <p className="text-sm font-bold">暂无用户</p>
                   </div>
               ) : (
                   <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <tr>
                                <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider bg-neutral-50">用户</th>
                                <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider bg-neutral-50">邮箱</th>
                                <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider bg-neutral-50">有效期至</th>
                                <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider bg-neutral-50">最近登录</th>
                                <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider bg-neutral-50 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {users.map(user => {
                                const isExpired = Date.now() > (user.expiresAt || 0);
                                return (
                                <tr key={user.id} className="hover:bg-purple-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={user.picture} alt="" className="w-8 h-8 rounded-full border border-neutral-200" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-neutral-900">{user.name}</span>
                                                {isExpired && <span className="text-[10px] font-bold text-red-500">已过期</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-mono text-neutral-600 bg-neutral-100 px-2 py-1 rounded">{user.email}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingUserId === user.id ? (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                  type="date" 
                                                  value={newExpiryDate} 
                                                  onChange={(e) => setNewExpiryDate(e.target.value)}
                                                  className="bg-white border border-purple-300 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-purple-200"
                                                />
                                                <button onClick={() => saveExpiry(user.id)} className="text-green-600 hover:text-green-700 font-bold text-xs">保存</button>
                                                <button onClick={() => setEditingUserId(null)} className="text-neutral-400 hover:text-neutral-600 text-xs">取消</button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 group-hover:bg-white/50 py-1 px-2 rounded-lg transition-colors w-fit">
                                                <span className={`text-xs font-mono font-medium ${isExpired ? 'text-red-500' : 'text-neutral-600'}`}>
                                                    {user.expiresAt ? new Date(user.expiresAt).toLocaleDateString() : '永久'}
                                                </span>
                                                <button 
                                                   onClick={() => startEditingExpiry(user)}
                                                   className="opacity-0 group-hover:opacity-100 text-purple-600 hover:text-purple-800 transition-opacity p-1"
                                                   title="修改有效期"
                                                >
                                                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-neutral-500 font-mono">
                                        {new Date(user.lastLoginAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleDeleteUser(user.id, user.name)}
                                            className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            删除账号
                                        </button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                      </table>
                   </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};