import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// 배포 빌드에만 CSP를 넣어요 (개발 서버는 React Fast Refresh용 인라인 스크립트가 필요해요)
const CSP = "default-src 'self'; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'";
const csp = (): Plugin => ({
  name: 'const-csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

export default defineConfig({
  // Electron이 file://로 dist/index.html을 열기 때문에 상대 경로로 빌드해요
  base: './',
  plugins: [react(), csp()],
  server: { port: 5173, strictPort: true },
});
