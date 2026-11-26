/// <reference types="vite/client" />

/** Electron preload가 열어 주는 볼트 API. 브라우저(npm run dev:web)에서는 없어요 */
interface Window {
  constVault?: import('../shared/ipc').ConstVault;
}
