
import React, { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  onGoogleLogin: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess, onGoogleLogin }) => {
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
        // 尝试服务器端验证 (Cloudflare Environment Variables)
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
        } else {
            // 验证失败
            throw new Error("账号或密码错误");
        }
    } catch (e: any) {
        setError(true);
        setErrorMsg("账号或密码错误");
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
          <h3 className="text-xl font-black text-neutral-900 mb-2">账号登录</h3>
          <p className="text-xs text-neutral-500 mb-6">注册或登录以同步您的项目数据。</p>
          
          {/* Google Login Section */}
          <button 
            onClick={onGoogleLogin}
            className="w-full py-3 bg-white border border-neutral-200 text-neutral-700 rounded-xl text-sm font-bold hover:bg-neutral-50 hover:border-neutral-300 transition-all flex items-center justify-center gap-3 shadow-sm mb-6 group relative overflow-hidden"
          >
             <div className="w-5 h-5 flex items-center justify-center">
                 <svg viewBox="0 0 24 24" className="w-full h-full" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
             </div>
             <span>Google 账号登录 / 注册</span>
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-100"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-neutral-400 font-medium">或者使用管理员账号</span>
            </div>
          </div>

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
