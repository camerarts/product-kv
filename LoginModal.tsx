
import React, { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleLogin = () => {
    if (password === '123') {
      onLoginSuccess();
      setPassword('');
      setError(false);
      onClose();
    } else {
      setError(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6" onClick={onClose}>
       <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 animate-scale-up text-center" onClick={e=>e.stopPropagation()}>
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🔐</div>
          <h3 className="text-xl font-black text-neutral-900 mb-2">管理员登录</h3>
          <p className="text-xs text-neutral-500 mb-6">请输入访问密码以进入后台管理。</p>
          
          <input 
            type="password" 
            value={password} 
            onChange={e => { setPassword(e.target.value); setError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className={`w-full px-4 py-3 bg-neutral-50 border ${error ? 'border-red-500 bg-red-50' : 'border-neutral-200'} rounded-lg text-center text-sm font-bold mb-4 focus:border-black outline-none tracking-widest transition-colors`}
            placeholder="PASSWORD" 
            autoFocus
          />
          
          <button onClick={handleLogin} className="w-full py-3 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors">
            立即登录
          </button>
       </div>
    </div>
  );
};
