import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Electron이 file://로 dist/index.html을 열기 때문에 상대 경로로 빌드해요
  base: './',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
