import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 使用相对路径，部署到 GitHub Pages 子路径或任意静态托管都不会 404
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  },
  build: {
    target: 'es2018',
    // 该环境 Vite 的 emptyOutDir 会调用被拦截的「回收站」删除导致构建失败；改为手动 rm dist 后再构建
    emptyOutDir: false
  }
})
