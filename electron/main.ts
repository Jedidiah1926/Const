// Electron 메인 프로세스: 창을 띄우고, 볼트(로컬 폴더)의 .md 파일을 읽고 써요 (명세 8)
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { watch } from 'node:fs';
import type { FSWatcher } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { EventChannel, InvokeChannel, VaultEvents, VaultInvoke } from '../shared/ipc';

const VAULT = path.join(os.homedir(), 'Const', '아르덴 연대기');
const DEV_URL = process.env.VITE_DEV_SERVER_URL;

let win: BrowserWindow | null = null;
let watcher: FSWatcher | null = null;

/** 렌더러가 넘긴 상대 경로가 볼트 밖을 가리키지 않게 막아요 */
function resolveInVault(rel: string): string {
  const p = path.resolve(VAULT, rel);
  if (p !== VAULT && !p.startsWith(VAULT + path.sep)) throw new Error('볼트 밖 경로: ' + rel);
  return p;
}

/** 채널 이름과 인자·반환 타입을 shared/ipc.ts의 계약에 묶어요 */
function handle<C extends InvokeChannel>(
  channel: C,
  fn: (...args: Parameters<VaultInvoke[C]>) => Promise<ReturnType<VaultInvoke[C]>> | ReturnType<VaultInvoke[C]>,
) {
  ipcMain.handle(channel, (_e: IpcMainInvokeEvent, ...args: unknown[]) => fn(...(args as Parameters<VaultInvoke[C]>)));
}

function send<C extends EventChannel>(channel: C, ...args: Parameters<VaultEvents[C]>) {
  win?.webContents.send(channel, ...args);
}

// 앱이 마지막으로 쓴 본문. 파일 내용이 이것과 같으면 바깥 변경으로 치지 않아요
const lastWritten = new Map<string, string>();

async function writeFile(rel: string, text: string) {
  const p = resolveInVault(rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  lastWritten.set(rel, text);
  await fs.writeFile(p, text, 'utf8');
}

handle('vault:load', async (defaults) => {
  const out: Record<string, string> = {};
  for (const [rel, fallback] of Object.entries(defaults)) {
    try {
      out[rel] = await fs.readFile(resolveInVault(rel), 'utf8');
      lastWritten.set(rel, out[rel]);
    } catch {
      await writeFile(rel, fallback);
      out[rel] = fallback;
    }
  }
  return out;
});

handle('vault:write', (rel, text) => writeFile(rel, text));

handle('vault:read', async (rel) => {
  try {
    return await fs.readFile(resolveInVault(rel), 'utf8');
  } catch {
    return null;
  }
});

handle('vault:path', () => VAULT);

/** 바깥에서 파일이 바뀌면 렌더러에 알려요 (recursive: macOS·Windows, Linux는 Node 20+) */
async function startWatching() {
  await fs.mkdir(VAULT, { recursive: true });
  const timers = new Map<string, NodeJS.Timeout>();
  watcher = watch(VAULT, { recursive: true }, (_type, file) => {
    if (!file || !file.endsWith('.md')) return;
    const rel = file.split(path.sep).join('/');
    clearTimeout(timers.get(rel));
    timers.set(
      rel,
      setTimeout(async () => {
        try {
          const text = await fs.readFile(resolveInVault(rel), 'utf8');
          if (text === lastWritten.get(rel)) return;
          lastWritten.set(rel, text);
        } catch {
          return; // 지워진 파일은 지금은 무시
        }
        send('vault:changed', rel);
      }, 150),
    );
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0A0806',
    title: 'Const',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  // 링크는 앱 안이 아니라 기본 브라우저에서 열어요
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  if (DEV_URL) void win.loadURL(DEV_URL);
  else void win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  win.on('closed', () => {
    win = null;
  });
}

void app.whenReady().then(async () => {
  await startWatching();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  watcher?.close();
  if (process.platform !== 'darwin') app.quit();
});
