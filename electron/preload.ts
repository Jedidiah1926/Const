// 렌더러에 볼트 API만 열어 줘요. 샌드박스 preload라 electron 말고는 require할 수 없어서
// shared/ipc.ts에서는 타입만 가져와요.
import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { ConstVault, InvokeChannel, VaultInvoke } from '../shared/ipc';

function invoke<C extends InvokeChannel>(channel: C, ...args: Parameters<VaultInvoke[C]>): Promise<ReturnType<VaultInvoke[C]>> {
  return ipcRenderer.invoke(channel, ...args);
}

const api: ConstVault = {
  load: (defaults) => invoke('vault:load', defaults),
  write: (rel, text) => invoke('vault:write', rel, text),
  read: (rel) => invoke('vault:read', rel),
  path: () => invoke('vault:path'),
  onChanged: (cb) => {
    const listener = (_e: IpcRendererEvent, rel: string) => cb(rel);
    ipcRenderer.on('vault:changed', listener);
    return () => ipcRenderer.removeListener('vault:changed', listener);
  },
};

contextBridge.exposeInMainWorld('constVault', api);
