import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true, 
      // 關鍵設定：代理伺服器 (Proxy)
      // 這會把前端發出的 /api 請求自動轉發到後端 3000 port
      proxy: {
        '/api': { // 看到請求開頭是 /api
          target: 'http://localhost:3000', // 目標：後端伺服器
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
    },
    define: {
      'process.env': {
        VITE_API_URL: JSON.stringify('') 
      }
    }
  }
})