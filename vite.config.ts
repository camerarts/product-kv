
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 1. 加载 Vite 默认的环境变量
  const env = loadEnv(mode, process.cwd(), '');
  
  // 2. 优先从 process.env 获取 (Cloudflare 构建环境通常在这里)，其次从 env 获取
  const apiKey = process.env.API_KEY || env.API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // 3. 将捕获到的 Key 硬编码注入到前端代码中
      // JSON.stringify 是必须的，它会将 value 包装成字符串 '"AIza..."'
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});
