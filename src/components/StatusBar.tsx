import { useWorld } from '../world/worldIndex';

export function StatusBar({ root }: { root: string }) {
  const ix = useWorld();
  const { span } = ix.world;
  return (
    <div className="statusbar num">
      <span>폴더 {ix.folderOrder.length} · 문서 {ix.ids.length}</span>
      <span>사건 {ix.events.length}</span>
      <span>시대 {ix.eraCount}</span>
      <span>{span.start}~{span.end}</span>
      <span className="vault">로컬 · {root} · 자동 저장</span>
    </div>
  );
}
