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
    target: 'es2018'
  }
})
