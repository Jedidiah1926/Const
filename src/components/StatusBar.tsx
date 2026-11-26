import { ENTITIES, EVENTS, FOLDER_ERAS, FOLDER_ORDER, GLOBAL_ERAS, VAULT_PATH } from '../data/sample';

export function StatusBar() {
  const eraCount = GLOBAL_ERAS.length + Object.values(FOLDER_ERAS).reduce((n, l) => n + l.length, 0);
  return (
    <div className="statusbar num">
      <span>폴더 {FOLDER_ORDER.length} · 문서 {Object.keys(ENTITIES).length}</span>
      <span>사건 {EVENTS.length}</span>
      <span>시대 {eraCount}</span>
      <span className="vault">로컬 · {VAULT_PATH} · 자동 저장</span>
    </div>
  );
}
