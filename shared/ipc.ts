// 메인 프로세스와 렌더러가 함께 쓰는 IPC 계약. 타입만 있어요(샌드박스 preload에서도 쓸 수 있게).

/** 렌더러 → 메인 (ipcRenderer.invoke) */
export interface VaultInvoke {
  /** { 상대경로: 기본 본문 } → { 상대경로: 파일 본문 }. 없는 파일은 기본 본문으로 만들어요 */
  'vault:load': (defaults: Record<string, string>) => Record<string, string>;
  'vault:write': (rel: string, text: string) => void;
  'vault:read': (rel: string) => string | null;
  'vault:path': () => string;
}

/** 메인 → 렌더러 (webContents.send) */
export interface VaultEvents {
  /** 바깥(다른 편집기 등)에서 볼트 안의 .md 파일이 바뀌었어요 */
  'vault:changed': (rel: string) => void;
}

export type InvokeChannel = keyof VaultInvoke;
export type EventChannel = keyof VaultEvents;

/** preload가 window.constVault로 열어 주는 API */
export interface ConstVault {
  load(defaults: Record<string, string>): Promise<Record<string, string>>;
  write(rel: string, text: string): Promise<void>;
  read(rel: string): Promise<string | null>;
  path(): Promise<string>;
  /** 바깥 변경 알림 구독. 돌려받은 함수로 구독을 끊어요 */
  onChanged(cb: (rel: string) => void): () => void;
}
