import React, { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (password: string) => void;
  onGoogleLogin: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess, onGoogleLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password) {
        setError(true);
        return;
    }

    setLoading(true);
    setError(false);

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            onLoginSuccess(password);
            resetForm();
            return;
        } else {
            throw new Error("账号或密码错误");
        }
    } catch (e: any) {
        setError(true);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in" onClick={onClose}>
       <div className="glass-panel rounded-[2rem] shadow-2xl w-full max-w-sm p-10 animate-scale-up text-center border-white/60 relative overflow-hidden" onClick={e=>e.stopPropagation()}>
          {/* Decorative Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-black text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl shadow-lg shadow-slate-900/20">🔐</div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">欢迎回来</h3>
              <p className="text-xs text-slate-500 mb-8 font-medium">登录以同步多端数据</p>
              
              <div className="space-y-4">
                
                <div className="space-y-3">
                      <div className="relative">
                        <input 
                            type="text" 
                            value={username} 
                            onChange={e => { setUsername(e.target.value); setError(false); }}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            className="liquid-input w-full px-5 py-3.5 rounded-xl text-sm font-bold text-center outline-none transition-colors"
                            placeholder="用户名" 
                          />
                      </div>

                      <div className="relative">
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => { setPassword(e.target.value); setError(false); }}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            className={`liquid-input w-full px-5 py-3.5 rounded-xl text-sm font-bold text-center outline-none transition-colors tracking-widest ${error ? 'border-red-400 bg-red-50' : ''}`}
                            placeholder="••••••••" 
                          />
                      </div>
                </div>
                  
                  <button 
                    onClick={handleLogin} 
                    disabled={loading}
                    className="liquid-button w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {loading ? '验证中...' : '登录'}
                  </button>

                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-4 bg-white/60 backdrop-blur rounded-full text-slate-400 font-bold uppercase tracking-wider text-[10px]">或</span>
                    </div>
                </div>

                <button 
                    onClick={onGoogleLogin}
                    className="liquid-button w-full py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 shadow-sm"
                >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    <span>Google 账号登录</span>
                </button>

              </div>
          </div>
       </div>
    </div>
  );
};