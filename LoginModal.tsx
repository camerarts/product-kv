
import React, { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!password) {
        setError(true);
        return;
    }

    setLoading(true);
    setError(false);
    setErrorMsg('');

    try {
        // 1. 尝试服务器端验证 (Cloudflare Environment Variables)
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            // 验证成功
            onLoginSuccess();
            resetForm();
            return;
        } else if (res.status === 401) {
            // 账号或密码错误 (服务器已配置，但验证失败)
            // 这里我们依然检查一下是否是旧密码 '123' (为了满足"暂时保留目前的登录")
            // 如果你想严格执行服务器验证，可以去掉下面的 fallback 逻辑
            if (password === '123') {
                 // Legacy Pass
                 onLoginSuccess();
                 resetForm();
                 return;
            }
            
            throw new Error("账号或密码错误");
        } else {
            // 503 或其他错误 (服务器未配置环境变量) -> 回退到本地逻辑
            throw new Error("Fallback");
        }
    } catch (e: any) {
        // 2. 本地回退逻辑 (Legacy Fallback)
        if (password === '123') {
            onLoginSuccess();
            resetForm();
        } else {
            setError(true);
            setErrorMsg(e.message === "Fallback" ? "密码错误" : e.message);
        }
    } finally {
        setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setError(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6" onClick={onClose}>
       <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 animate-scale-up text-center" onClick={e=>e.stopPropagation()}>
          <div className="w-12 h-12 bg-neutral-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-lg shadow-neutral-500/30">🔐</div>
          <h3 className="text-xl font-black text-neutral-900 mb-2">管理员登录</h3>
          <p className="text-xs text-neutral-500 mb-6">请输入管理员账号及密码。</p>
          
          <div className="space-y-3 mb-6">
              {/* Username Input */}
              <div className="relative">
                 <div className="absolute left-3 top-3 text-neutral-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                 </div>
                 <input 
                    type="text" 
                    value={username} 
                    onChange={e => { setUsername(e.target.value); setError(false); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:border-black focus:bg-white outline-none transition-colors"
                    placeholder="USERNAME (选填)" 
                    autoFocus
                  />
              </div>

              {/* Password Input */}
              <div className="relative">
                 <div className="absolute left-3 top-3 text-neutral-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                 </div>
                 <input 
                    type="password" 
                    value={password} 
                    onChange={e => { setPassword(e.target.value); setError(false); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    className={`w-full pl-10 pr-4 py-3 bg-neutral-50 border ${error ? 'border-red-500 bg-red-50' : 'border-neutral-200'} rounded-xl text-sm font-bold focus:border-black focus:bg-white outline-none tracking-widest transition-colors`}
                    placeholder="PASSWORD" 
                  />
              </div>
          </div>
          
          <button 
            onClick={handleLogin} 
            disabled={loading}
            className="w-full py-3 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  验证中...
                </>
            ) : '立即登录'}
          </button>
       </div>
    </div>
  );
};
