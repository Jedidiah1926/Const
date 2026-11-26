// 메인 프로세스와 렌더러가 함께 쓰는 IPC 계약. 타입만 있어요(샌드박스 preload에서도 쓸 수 있게).

/** 볼트 안 파일들: { 볼트 기준 상대 경로('/' 구분): 본문 } */
export type VaultFiles = Record<string, string>;

/** 렌더러 → 메인 (ipcRenderer.invoke) */
export interface VaultInvoke {
  /** 지금 열린 볼트 경로(앱을 다시 켜면 마지막 볼트). 없으면 null */
  'vault:current': () => string | null;
  /** 폴더 고르기 대화상자로 볼트 열기 */
  'vault:openDialog': () => string | null;
  /** 새 볼트 폴더 만들기 대화상자. defaultName은 제안할 폴더 이름 */
  'vault:createDialog': (defaultName: string) => string | null;
  /** 열린 볼트의 .md 파일 전부와 .const/*.json */
  'vault:scan': () => VaultFiles;
  'vault:write': (rel: string, text: string) => void;
  'vault:writeMany': (files: VaultFiles) => void;
  /** 볼트 폴더를 파일 탐색기에서 보기 */
  'vault:reveal': () => void;
}

/** 메인 → 렌더러 (webContents.send) */
export interface VaultEvents {
  /** 바깥(다른 편집기 등)에서 볼트 안 파일이 바뀌었어요 */
  'vault:changed': (rel: string) => void;
  /** 메뉴에서 다른 볼트를 열었어요 */
  'vault:opened': (root: string) => void;
}

export type InvokeChannel = keyof VaultInvoke;
export type EventChannel = keyof VaultEvents;

/** preload가 window.constVault로 열어 주는 API */
export interface ConstVault {
  current(): Promise<string | null>;
  openDialog(): Promise<string | null>;
  createDialog(defaultName: string): Promise<string | null>;
  scan(): Promise<VaultFiles>;
  write(rel: string, text: string): Promise<void>;
  writeMany(files: VaultFiles): Promise<void>;
  reveal(): Promise<void>;
  /** 구독. 돌려받은 함수로 끊어요 */
  onChanged(cb: (rel: string) => void): () => void;
  onOpened(cb: (root: string) => void): () => void;
}
