import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// 서체는 앱에 함께 넣어요(오프라인에서도 보이게). 본문·UI = IBM Plex Sans KR, 큰 연도·로고 = Doto
import '@fontsource/ibm-plex-sans-kr/400.css';
import '@fontsource/ibm-plex-sans-kr/500.css';
import '@fontsource/ibm-plex-sans-kr/600.css';
import '@fontsource/ibm-plex-sans-kr/700.css';
import '@fontsource/doto/700.css';
import '@fontsource/doto/900.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
