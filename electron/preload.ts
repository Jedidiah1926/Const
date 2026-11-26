// 렌더러에 볼트 API만 열어 줘요. 샌드박스 preload라 electron 말고는 require할 수 없어서
// shared/ipc.ts에서는 타입만 가져와요.
import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { ConstVault, EventChannel, InvokeChannel, VaultEvents, VaultInvoke } from '../shared/ipc';

function invoke<C extends InvokeChannel>(channel: C, ...args: Parameters<VaultInvoke[C]>): Promise<ReturnType<VaultInvoke[C]>> {
  return ipcRenderer.invoke(channel, ...args);
}

function on<C extends EventChannel>(channel: C, cb: VaultEvents[C]): () => void {
  const listener = (_e: IpcRendererEvent, ...args: unknown[]) => (cb as (...a: unknown[]) => void)(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: ConstVault = {
  current: () => invoke('vault:current'),
  openDialog: () => invoke('vault:openDialog'),
  createDialog: (name) => invoke('vault:createDialog', name),
  scan: () => invoke('vault:scan'),
  write: (rel, text) => invoke('vault:write', rel, text),
  writeMany: (files) => invoke('vault:writeMany', files),
  reveal: () => invoke('vault:reveal'),
  onChanged: (cb) => on('vault:changed', cb),
  onOpened: (cb) => on('vault:opened', cb),
};

contextBridge.exposeInMainWorld('constVault', api);
