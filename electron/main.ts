// Electron 메인 프로세스: 창과 메뉴, 볼트(작품 폴더) 열기·읽기·쓰기, 파일 감시 (명세 8)
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import type { IpcMainInvokeEvent, MenuItemConstructorOptions } from 'electron';
import { watch } from 'node:fs';
import type { FSWatcher } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { EventChannel, InvokeChannel, VaultEvents, VaultFiles, VaultInvoke } from '../shared/ipc';

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const CONFIG = () => path.join(app.getPath('userData'), 'config.json');
const MAX_FILES = 10000;

let win: BrowserWindow | null = null;
let root: string | null = null;
let watcher: FSWatcher | null = null;
/** 앱이 마지막으로 쓴(또는 읽은) 본문. 파일 내용이 이것과 같으면 바깥 변경으로 치지 않아요 */
const known = new Map<string, string>();

// ── 설정(마지막 볼트) ──
async function readConfig(): Promise<{ lastVault?: string }> {
  try {
    return JSON.parse(await fs.readFile(CONFIG(), 'utf8'));
  } catch {
    return {};
  }
}
async function writeConfig(c: { lastVault?: string }) {
  await fs.mkdir(path.dirname(CONFIG()), { recursive: true });
  await fs.writeFile(CONFIG(), JSON.stringify(c, null, 2), 'utf8');
}

// ── 경로 ──
function requireRoot(): string {
  if (!root) throw new Error('열린 볼트가 없어요');
  return root;
}
/** 렌더러가 넘긴 상대 경로가 볼트 밖을 가리키지 않게 막아요 */
function resolveInVault(rel: string): string {
  const r = requireRoot();
  const p = path.resolve(r, rel);
  if (p === r || !p.startsWith(r + path.sep)) throw new Error('볼트 밖 경로: ' + rel);
  return p;
}
const toRel = (abs: string) => path.relative(requireRoot(), abs).split(path.sep).join('/');
/** 읽을 파일: .const/*.json, 그리고 숨김 폴더 밖의 .md */
const isVaultFile = (rel: string) =>
  rel.startsWith('.const/') ? rel.endsWith('.json') && rel.split('/').length === 2 : rel.endsWith('.md') && !rel.split('/').some((s) => s.startsWith('.'));

// ── 볼트 열기 ──
async function setRoot(next: string) {
  const st = await fs.stat(next);
  if (!st.isDirectory()) throw new Error('폴더가 아니에요: ' + next);
  root = path.resolve(next);
  known.clear();
  await writeConfig({ ...(await readConfig()), lastVault: root });
  startWatching();
  win?.setTitle('Const — ' + path.basename(root));
}

async function openDialog(): Promise<string | null> {
  const r = await dialog.showOpenDialog(win!, {
    title: '볼트 열기',
    buttonLabel: '열기',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: root ?? path.join(os.homedir(), 'Const'),
  });
  if (r.canceled || !r.filePaths[0]) return null;
  await setRoot(r.filePaths[0]);
  return root;
}

async function createDialog(defaultName: string): Promise<string | null> {
  const base = path.join(os.homedir(), 'Const');
  await fs.mkdir(base, { recursive: true });
  const r = await dialog.showSaveDialog(win!, {
    title: '새 볼트 만들기',
    buttonLabel: '만들기',
    nameFieldLabel: '작품 이름',
    defaultPath: path.join(base, defaultName),
    properties: ['createDirectory', 'showOverwriteConfirmation'],
  });
  if (r.canceled || !r.filePath) return null;
  await fs.mkdir(r.filePath, { recursive: true });
  await setRoot(r.filePath);
  return root;
}

// ── 읽기·쓰기 ──
async function scan(): Promise<VaultFiles> {
  const r = requireRoot();
  const out: VaultFiles = {};
  let count = 0;
  async function walk(dir: string) {
    for (const d of await fs.readdir(dir, { withFileTypes: true })) {
      if (count >= MAX_FILES) return;
      const abs = path.join(dir, d.name);
      const rel = toRel(abs);
      if (d.isDirectory()) {
        if (d.name.startsWith('.') && rel !== '.const') continue;
        if (d.name === 'node_modules') continue;
        await walk(abs);
      } else if (d.isFile() && isVaultFile(rel)) {
        out[rel] = await fs.readFile(abs, 'utf8');
        known.set(rel, out[rel]);
        count++;
      }
    }
  }
  await walk(r);
  return out;
}

async function writeFile(rel: string, text: string) {
  const p = resolveInVault(rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  known.set(rel, text);
  await fs.writeFile(p, text, 'utf8');
}

// ── 파일 감시: 바깥에서 바뀌면 렌더러에 알려요 (recursive: macOS·Windows, Linux는 Node 20+) ──
function startWatching() {
  watcher?.close();
  const r = requireRoot();
  const timers = new Map<string, NodeJS.Timeout>();
  try {
    watcher = watch(r, { recursive: true }, (_type, file) => {
      if (!file || root !== r) return;
      const rel = file.toString().split(path.sep).join('/');
      if (!isVaultFile(rel)) return;
      clearTimeout(timers.get(rel));
      timers.set(
        rel,
        setTimeout(async () => {
          let text: string | null = null;
          try {
            text = await fs.readFile(path.join(r, rel), 'utf8');
          } catch {
            // 지워졌어요
          }
          if (text !== null && text === known.get(rel)) return;
          if (text === null) known.delete(rel);
          else known.set(rel, text);
          send('vault:changed', rel);
        }, 150),
      );
    });
  } catch (e) {
    console.error('파일 감시를 시작하지 못했어요', e);
  }
}

// ── IPC ──
function handle<C extends InvokeChannel>(
  channel: C,
  fn: (...args: Parameters<VaultInvoke[C]>) => Promise<ReturnType<VaultInvoke[C]>> | ReturnType<VaultInvoke[C]>,
) {
  ipcMain.handle(channel, (_e: IpcMainInvokeEvent, ...args: unknown[]) => fn(...(args as Parameters<VaultInvoke[C]>)));
}
function send<C extends EventChannel>(channel: C, ...args: Parameters<VaultEvents[C]>) {
  win?.webContents.send(channel, ...args);
}

handle('vault:current', () => root);
handle('vault:openDialog', () => openDialog());
handle('vault:createDialog', (name) => createDialog(name));
handle('vault:scan', () => scan());
handle('vault:write', (rel, text) => writeFile(rel, text));
handle('vault:writeMany', async (files) => {
  for (const [rel, text] of Object.entries(files)) await writeFile(rel, text);
});
handle('vault:reveal', () => {
  if (root) void shell.openPath(root);
});

// ── 메뉴 ──
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const fromMenu = async (fn: () => Promise<string | null>) => {
    try {
      const r = await fn();
      if (r) send('vault:opened', r);
    } catch (e) {
      dialog.showErrorBox('볼트를 열지 못했어요', String(e));
    }
  };
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: '파일',
      submenu: [
        { label: '볼트 열기…', accelerator: 'CmdOrCtrl+O', click: () => void fromMenu(openDialog) },
        { label: '새 볼트…', accelerator: 'CmdOrCtrl+Shift+N', click: () => void fromMenu(() => createDialog('새 작품')) },
        { type: 'separator' },
        { label: '볼트 폴더 보기', click: () => root && void shell.openPath(root) },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: '끝내기' },
      ],
    },
    { role: 'editMenu', label: '편집' },
    { role: 'viewMenu', label: '보기' },
    { role: 'windowMenu', label: '창' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
  // 마지막으로 열었던 볼트를 다시 열어요 (테스트용으로 CONST_VAULT가 있으면 그걸)
  const last = process.env.CONST_VAULT ?? (await readConfig()).lastVault;
  if (last) await setRoot(last).catch(() => undefined);
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  watcher?.close();
  if (process.platform !== 'darwin') app.quit();
});
